from flask import Blueprint, request, jsonify
import logging
from api.database import get_db_connection, dict_cursor
from api.services.rabbitmq import rabbitmq

logger = logging.getLogger(__name__)
# Create blueprint
announcements_bp = Blueprint('announcements', __name__)

@announcements_bp.route("/groups/<group_id>/announcements", methods=["POST"])
def create_announcement(group_id):
    """Create a new announcement for a group (teacher who owns the group only)"""
    data = request.get_json()
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=dict_cursor())
    
    try:
        # Check if the group exists
        cur.execute("SELECT * FROM groups WHERE id = %s;", (group_id,))
        group = cur.fetchone()
        
        if not group:
            cur.close()
            conn.close()
            return jsonify({"error": "Group not found"}), 404
        
        # Check if the user is authorized (must be the teacher who owns the group or an admin)
        cur.execute("SELECT * FROM users WHERE id = %s;", (data['teacher_id'],))
        teacher = cur.fetchone()
        
        if not teacher:
            cur.close()
            conn.close()
            return jsonify({"error": "Teacher not found"}), 404
        
        if teacher['user_role'] != 'admin' and (teacher['user_role'] != 'teacher' or teacher['id'] != group['teacher_id']):
            cur.close()
            conn.close()
            return jsonify({"error": "Only the teacher who owns the group or an admin can create announcements"}), 403
        
        # Create the announcement
        cur.execute(
            """
            INSERT INTO announcements (group_id, teacher_id, title, content, is_pinned)
            VALUES (%s, %s, %s, %s, %s) RETURNING *;
            """,
            (group_id, data['teacher_id'], data['title'], data['content'], data.get('is_pinned', False))
        )
        
        announcement = cur.fetchone()
        
        # Get all users in the group with their phone numbers
        cur.execute(
            """
            SELECT ug.user_id, u.phone, u.user_name 
            FROM user_groups ug
            LEFT JOIN users u ON ug.user_id = u.id
            WHERE ug.group_id = %s;
            """,
            (group_id,)
        )
        
        group_members = cur.fetchall()
        
        # Create a notification message
        notification_message = f"Nuevo anuncio en {group['name']}:\n\n{data['title']}\n {data['content'][:100]}..."
        
        # Send notifications through RabbitMQ
        notification_failures = []
        for member in group_members:
            success = rabbitmq.publish_notification(
                user_id=member['user_id'],
                message=notification_message,
                notification_type='group',
                phone=member['phone']
            )
            if not success:
                notification_failures.append(member['user_id'])
        
        conn.commit()
        
        # Add teacher name to the response
        announcement['teacher_name'] = teacher['user_name']
        
        # Add notification status to the response
        if not notification_failures:
            announcement['notification_status'] = 'queued'
        else:
            announcement['notification_status'] = 'partial'
            announcement['failed_notifications'] = notification_failures
        
        cur.close()
        conn.close()
        
        return jsonify(announcement), 201
        
    except Exception as e:
        conn.rollback()
        cur.close()
        conn.close()
        logger.error(f"Error creating announcement: {str(e)}", exc_info=True)
        return jsonify({"error": "An error occurred while creating the announcement"}), 500

@announcements_bp.route("/groups/<group_id>/announcements", methods=["GET"])
def get_group_announcements(group_id):
    """Get all announcements for a group (visible to group members and teacher)"""
    user_id = request.args.get('user_id')
    
    if not user_id:
        return jsonify({"error": "User ID is required"}), 400
    
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=dict_cursor())
    
    # Check if the group exists
    cur.execute("SELECT * FROM groups WHERE id = %s;", (group_id,))
    group = cur.fetchone()
    
    if not group:
        cur.close()
        conn.close()
        return jsonify({"error": "Group not found"}), 404
    
    # Check if the user is authorized (must be a member of the group, the teacher, or an admin)
    cur.execute("SELECT * FROM users WHERE id = %s;", (user_id,))
    user = cur.fetchone()
    
    if not user:
        cur.close()
        conn.close()
        return jsonify({"error": "User not found"}), 404
    
    is_authorized = False
    
    # Check if admin or the group's teacher
    if user['user_role'] == 'admin' or (user['user_role'] == 'teacher' and user['id'] == group['teacher_id']):
        is_authorized = True
    else:
        # Check if user is a member of the group
        cur.execute(
            "SELECT * FROM user_groups WHERE user_id = %s AND group_id = %s;",
            (user_id, group_id)
        )
        membership = cur.fetchone()
        is_authorized = membership is not None
    
    if not is_authorized:
        cur.close()
        conn.close()
        return jsonify({"error": "User is not authorized to view announcements for this group"}), 403
    
    # Get all announcements for the group, with read status
    cur.execute(
        """
        SELECT 
            a.*, 
            u.user_name as teacher_name,
            CASE WHEN ar.user_id IS NOT NULL THEN true ELSE false END as is_read
        FROM announcements a
        JOIN users u ON a.teacher_id = u.id
        LEFT JOIN announcement_reads ar ON a.id = ar.announcement_id AND ar.user_id = %s
        WHERE a.group_id = %s
        ORDER BY a.is_pinned DESC, a.created_at DESC;
        """,
        (user_id, group_id)
    )
    
    announcements = cur.fetchall()
    cur.close()
    conn.close()
    
    return jsonify(announcements)

@announcements_bp.route("/groups/<group_id>/announcements/<announcement_id>", methods=["GET"])
def get_announcement(group_id, announcement_id):
    """Get a specific announcement (visible to group members and teacher)"""
    user_id = request.args.get('user_id')
    
    if not user_id:
        return jsonify({"error": "User ID is required"}), 400
    
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=dict_cursor())
    
    # Check if the announcement exists and belongs to the specified group
    cur.execute(
        "SELECT * FROM announcements WHERE id = %s AND group_id = %s;",
        (announcement_id, group_id)
    )
    announcement = cur.fetchone()
    
    if not announcement:
        cur.close()
        conn.close()
        return jsonify({"error": "Announcement not found"}), 404
    
    # Get the group
    cur.execute("SELECT * FROM groups WHERE id = %s;", (group_id,))
    group = cur.fetchone()
    
    # Check if the user is authorized (must be a member of the group, the teacher, or an admin)
    cur.execute("SELECT * FROM users WHERE id = %s;", (user_id,))
    user = cur.fetchone()
    
    if not user:
        cur.close()
        conn.close()
        return jsonify({"error": "User not found"}), 404
    
    is_authorized = False
    
    # Check if admin or the group's teacher
    if user['user_role'] == 'admin' or (user['user_role'] == 'teacher' and user['id'] == group['teacher_id']):
        is_authorized = True
    else:
        # Check if user is a member of the group
        cur.execute(
            "SELECT * FROM user_groups WHERE user_id = %s AND group_id = %s;",
            (user_id, group_id)
        )
        membership = cur.fetchone()
        is_authorized = membership is not None
    
    if not is_authorized:
        cur.close()
        conn.close()
        return jsonify({"error": "User is not authorized to view this announcement"}), 403
    
    # Get the announcement with teacher name
    cur.execute(
        """
        SELECT a.*, u.user_name as teacher_name
        FROM announcements a
        JOIN users u ON a.teacher_id = u.id
        WHERE a.id = %s;
        """,
        (announcement_id,)
    )
    
    detailed_announcement = cur.fetchone()
    
    # Mark the announcement as read if it's not already
    cur.execute(
        """
        INSERT INTO announcement_reads (announcement_id, user_id)
        VALUES (%s, %s)
        ON CONFLICT (announcement_id, user_id) DO NOTHING;
        """,
        (announcement_id, user_id)
    )
    
    conn.commit()
    cur.close()
    conn.close()
    
    return jsonify(detailed_announcement)

@announcements_bp.route("/groups/<group_id>/announcements/<announcement_id>", methods=["PUT"])
def update_announcement(group_id, announcement_id):
    """Update an announcement (teacher who created it or admin only)"""
    data = request.get_json()
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=dict_cursor())
    
    # Check if the announcement exists and belongs to the specified group
    cur.execute(
        "SELECT * FROM announcements WHERE id = %s AND group_id = %s;",
        (announcement_id, group_id)
    )
    announcement = cur.fetchone()
    
    if not announcement:
        cur.close()
        conn.close()
        return jsonify({"error": "Announcement not found"}), 404
    
    # Check if the user is authorized (must be the teacher who created the announcement or an admin)
    cur.execute("SELECT * FROM users WHERE id = %s;", (data['user_id'],))
    user = cur.fetchone()
    
    if not user:
        cur.close()
        conn.close()
        return jsonify({"error": "User not found"}), 404
    
    if user['user_role'] != 'admin' and (user['user_role'] != 'teacher' or user['id'] != announcement['teacher_id']):
        cur.close()
        conn.close()
        return jsonify({"error": "Only the teacher who created the announcement or an admin can update it"}), 403
    
    # Update the announcement
    cur.execute(
        """
        UPDATE announcements
        SET title = %s, content = %s, is_pinned = %s, updated_at = CURRENT_TIMESTAMP
        WHERE id = %s RETURNING *;
        """,
        (data['title'], data['content'], data.get('is_pinned', announcement['is_pinned']), announcement_id)
    )
    
    updated_announcement = cur.fetchone()
    conn.commit()
    
    # Add teacher name to the response
    updated_announcement['teacher_name'] = user['user_name']
    
    cur.close()
    conn.close()
    
    return jsonify(updated_announcement)

@announcements_bp.route("/groups/<group_id>/announcements/<announcement_id>", methods=["DELETE"])
def delete_announcement(group_id, announcement_id):
    """Delete an announcement (teacher who created it or admin only)"""
    user_id = request.args.get('user_id')
    
    if not user_id:
        return jsonify({"error": "User ID is required"}), 400
    
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=dict_cursor())
    
    # Check if the announcement exists and belongs to the specified group
    cur.execute(
        "SELECT * FROM announcements WHERE id = %s AND group_id = %s;",
        (announcement_id, group_id)
    )
    announcement = cur.fetchone()
    
    if not announcement:
        cur.close()
        conn.close()
        return jsonify({"error": "Announcement not found"}), 404
    
    # Check if the user is authorized (must be the teacher who created the announcement or an admin)
    cur.execute("SELECT * FROM users WHERE id = %s;", (user_id,))
    user = cur.fetchone()
    
    if not user:
        cur.close()
        conn.close()
        return jsonify({"error": "User not found"}), 404
    
    if user['user_role'] != 'admin' and (user['user_role'] != 'teacher' or user['id'] != announcement['teacher_id']):
        cur.close()
        conn.close()
        return jsonify({"error": "Only the teacher who created the announcement or an admin can delete it"}), 403
    
    # Delete the announcement
    cur.execute(
        "DELETE FROM announcements WHERE id = %s RETURNING id;",
        (announcement_id,)
    )
    
    result = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()
    
    if result:
        return jsonify({"message": "Announcement deleted successfully"})
    return jsonify({"error": "Failed to delete announcement"}), 500

@announcements_bp.route("/users/<user_id>/announcements", methods=["GET"])
def get_user_announcements(user_id):
    """Get all announcements for groups that a user belongs to"""
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=dict_cursor())
    
    # Check if the user exists
    cur.execute("SELECT * FROM users WHERE id = %s;", (user_id,))
    user = cur.fetchone()
    
    if not user:
        cur.close()
        conn.close()
        return jsonify({"error": "User not found"}), 404
    
    # Get all announcements for groups that the user belongs to
    cur.execute(
        """
        SELECT 
            a.*, 
            g.name as group_name,
            u.user_name as teacher_name,
            CASE WHEN ar.user_id IS NOT NULL THEN true ELSE false END as is_read
        FROM announcements a
        JOIN groups g ON a.group_id = g.id
        JOIN users u ON a.teacher_id = u.id
        JOIN user_groups ug ON g.id = ug.group_id AND ug.user_id = %s
        LEFT JOIN announcement_reads ar ON a.id = ar.announcement_id AND ar.user_id = %s
        ORDER BY a.is_pinned DESC, a.created_at DESC;
        """,
        (user_id, user_id)
    )
    
    announcements = cur.fetchall()
    cur.close()
    conn.close()
    
    return jsonify(announcements)

@announcements_bp.route("/teachers/<teacher_id>/announcements", methods=["GET"])
def get_teacher_announcements(teacher_id):
    """Get all announcements created by a teacher"""
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=dict_cursor())
    
    # Check if the teacher exists
    cur.execute("SELECT * FROM users WHERE id = %s;", (teacher_id,))
    teacher = cur.fetchone()
    
    if not teacher:
        cur.close()
        conn.close()
        return jsonify({"error": "Teacher not found"}), 404
    
    if teacher['user_role'] != 'teacher' and teacher['user_role'] != 'admin':
        cur.close()
        conn.close()
        return jsonify({"error": "User is not a teacher or admin"}), 403
    
    # Get all announcements created by this teacher
    cur.execute(
        """
        SELECT a.*, g.name as group_name
        FROM announcements a
        JOIN groups g ON a.group_id = g.id
        WHERE a.teacher_id = %s
        ORDER BY a.created_at DESC;
        """,
        (teacher_id,)
    )
    
    announcements = cur.fetchall()
    cur.close()
    conn.close()
    
    return jsonify(announcements)

@announcements_bp.route("/announcements/<announcement_id>/mark-read", methods=["POST"])
def mark_announcement_read(announcement_id):
    """Mark an announcement as read by a user"""
    data = request.get_json()
    user_id = data.get('user_id')
    
    if not user_id:
        return jsonify({"error": "User ID is required"}), 400
    
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=dict_cursor())
    
    # Check if the announcement exists
    cur.execute("SELECT * FROM announcements WHERE id = %s;", (announcement_id,))
    announcement = cur.fetchone()
    
    if not announcement:
        cur.close()
        conn.close()
        return jsonify({"error": "Announcement not found"}), 404
    
    # Check if the user exists
    cur.execute("SELECT * FROM users WHERE id = %s;", (user_id,))
    user = cur.fetchone()
    
    if not user:
        cur.close()
        conn.close()
        return jsonify({"error": "User not found"}), 404
    
    # Check if the user is authorized to read this announcement
    cur.execute(
        """
        SELECT * FROM user_groups
        WHERE user_id = %s AND group_id = %s;
        """,
        (user_id, announcement['group_id'])
    )
    
    membership = cur.fetchone()
    
    # Allow if user is a member, admin, or the group's teacher
    is_authorized = membership is not None or user['user_role'] == 'admin'
    
    if not is_authorized:
        # Check if user is the teacher of this group
        cur.execute(
            "SELECT * FROM groups WHERE id = %s AND teacher_id = %s;",
            (announcement['group_id'], user_id)
        )
        is_teacher = cur.fetchone() is not None
        is_authorized = is_teacher
    
    if not is_authorized:
        cur.close()
        conn.close()
        return jsonify({"error": "User is not authorized to read this announcement"}), 403
    
    # Mark the announcement as read
    cur.execute(
        """
        INSERT INTO announcement_reads (announcement_id, user_id)
        VALUES (%s, %s)
        ON CONFLICT (announcement_id, user_id) DO NOTHING
        RETURNING *;
        """,
        (announcement_id, user_id)
    )
    
    result = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()
    
    return jsonify({"message": "Announcement marked as read", "success": True})
