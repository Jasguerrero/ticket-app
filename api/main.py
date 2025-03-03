from flask import Flask, request, jsonify
import os
import psycopg2
import logging
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv
from flask_cors import CORS

logger = logging.getLogger(__name__)
load_dotenv('.env', override=True)

def get_db_connection():
    DB_USER = os.getenv("POSTGRES_USER")
    DB_PASSWORD = os.getenv("POSTGRES_PASSWORD")
    DB_HOST = os.getenv("POSTGRES_HOST")
    DB_PORT = "5432"
    return psycopg2.connect(
        dbname='postgres',
        user=DB_USER,
        password=DB_PASSWORD,
        host=DB_HOST,
        port=DB_PORT
    )

app = Flask(__name__)
CORS(app)

@app.route("/tickets", methods=["POST"])
def create_ticket():
    logger.info("Creating ticket")
    data = request.get_json()
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO tickets (id, category, sub_category, description, user_id, assign_id, status)
        VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING *;
        """,
        (data['id'], data['category'], data.get('sub_category'), data['description'], data['user_id'], data.get('assign_id'), data.get('status', 'open'))
    )
    ticket = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()
    return jsonify(ticket), 201

@app.route("/tickets", methods=["GET"])
def get_tickets():
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute("SELECT * FROM tickets;")
    tickets = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify(tickets)

@app.route("/tickets/<id>", methods=["GET"])
def get_ticket(id):
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute("SELECT * FROM tickets WHERE id = %s;", (id,))
    ticket = cur.fetchone()
    cur.close()
    conn.close()
    if ticket:
        return jsonify(ticket)
    return jsonify({"error": "Ticket not found"}), 404

@app.route("/tickets/<id>", methods=["PUT"])
def update_ticket(id):
    data = request.get_json()
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        """
        UPDATE tickets SET category = %s, sub_category = %s, description = %s, assign_id = %s, status = %s, updated_at = CURRENT_TIMESTAMP
        WHERE id = %s RETURNING *;
        """,
        (data['category'], data.get('sub_category'), data['description'], data.get('assign_id'), data['status'], id)
    )
    ticket = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()
    if ticket:
        return jsonify(ticket)
    return jsonify({"error": "Ticket not found"}), 404

@app.route("/tickets/<id>", methods=["DELETE"])
def delete_ticket(id):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM tickets WHERE id = %s RETURNING *;", (id,))
    ticket = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()
    if ticket:
        return jsonify({"message": "Ticket deleted successfully"})
    return jsonify({"error": "Ticket not found"}), 404


@app.route("/tickets_assign_open/<user_id>", methods=["GET"])
def tickets_assign_open(user_id):
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute("SELECT * FROM tickets WHERE assign_id = %s AND status = 'open';", (user_id,))
    tickets = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify(tickets)

@app.route("/tickets_assign_closed/<user_id>", methods=["GET"])
def tickets_assign_closed(user_id):
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute("SELECT * FROM tickets WHERE assign_id = %s AND status = 'closed';", (user_id,))
    tickets = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify(tickets)

@app.route("/assign_ticket/<id>", methods=["PUT"])
def assign_ticket(id):
    data = request.get_json()
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        """
        UPDATE tickets SET assign_id = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s RETURNING *;
        """,
        (data['assign_id'], id)
    )
    ticket = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()
    if ticket:
        return jsonify(ticket)
    return jsonify({"error": "Ticket not found"}), 404

@app.route("/close_ticket/<id>", methods=["PUT"])
def close_ticket(id):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        """
        UPDATE tickets SET status = 'closed', closed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = %s RETURNING *;
        """,
        (id,)
    )
    ticket = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()
    if ticket:
        return jsonify(ticket)
    return jsonify({"error": "Ticket not found"}), 404

@app.route("/tickets_user_open/<user_id>", methods=["GET"])
def tickets_user_open(user_id):
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute("SELECT * FROM tickets WHERE user_id = %s AND status = 'open';", (user_id,))
    tickets = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify(tickets)

@app.route("/tickets_user_closed/<user_id>", methods=["GET"])
def tickets_user_closed(user_id):
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute("SELECT * FROM tickets WHERE user_id = %s AND status = 'closed';", (user_id,))
    tickets = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify(tickets)

@app.route("/tickets_not_assigned_open", methods=["GET"])
def tickets_not_assign_open():
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute("SELECT * FROM tickets WHERE assign_id IS NULL AND status = 'open';")
    tickets = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify(tickets)

@app.route("/users", methods=["POST"])
def create_user():
    data = request.get_json()
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute(
        """
        INSERT INTO users (email, password, user_name, user_role)
        VALUES (%s, %s, %s, %s) RETURNING *;
        """,
        (data['email'], data['password'], data.get('user_name'), data['user_role'])
    )
    user = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()
    return jsonify(user), 201

@app.route("/auth", methods=["POST"])
def authenticate_user():
    data = request.get_json()
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute(
        "SELECT * FROM users WHERE email = %s AND password = %s;",
        (data['email'], data['password'])
    )
    user = cur.fetchone()
    cur.close()
    conn.close()
    
    if user:
        return jsonify({"message": "Authentication successful", "user": user})
    return jsonify({"error": "Invalid credentials"}), 401

@app.route("/tickets/<id>/comments", methods=["GET"])
def get_ticket_comments(id):
    """Get all comments for a specific ticket"""
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    # Join with users table to get the username for each comment
    cur.execute("""
        SELECT c.*, u.user_name 
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.ticket_id = %s
        ORDER BY c.created_at ASC;
    """, (id,))
    
    comments = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify(comments)

@app.route("/tickets/<id>/comments", methods=["POST"])
def create_comment(id):
    """Create a new comment for a ticket"""
    data = request.get_json()
    
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    # First check if the ticket exists
    cur.execute("SELECT * FROM tickets WHERE id = %s;", (id,))
    ticket = cur.fetchone()
    
    if not ticket:
        cur.close()
        conn.close()
        return jsonify({"error": "Ticket not found"}), 404
    
    # Check user role to enforce permission rules
    cur.execute("SELECT * FROM users WHERE id = %s;", (data['user_id'],))
    user = cur.fetchone()
    
    # Regular users can only comment on open tickets
    is_admin_or_support = user['user_role'] in ['admin', 'support']
    if not is_admin_or_support and ticket['status'] != 'open':
        cur.close()
        conn.close()
        return jsonify({"error": "Regular users can only comment on open tickets"}), 403
    
    # Admin users can only comment on tickets assigned to them
    if is_admin_or_support and ticket['assign_id'] != user['id']:
        cur.close()
        conn.close()
        return jsonify({"error": "Support staff can only comment on tickets assigned to them"}), 403
    
    # Add the comment
    cur.execute(
        """
        INSERT INTO comments (ticket_id, user_id, content)
        VALUES (%s, %s, %s) RETURNING *;
        """,
        (id, data['user_id'], data['content'])
    )
    
    new_comment = cur.fetchone()
    conn.commit()
    
    # Add the username to the response
    new_comment['user_name'] = user['user_name']
    
    cur.close()
    conn.close()
    
    return jsonify(new_comment), 201

@app.route("/teachers/<teacher_id>/groups", methods=["GET"])
def get_teacher_groups(teacher_id):
    """Get all groups created by a teacher"""
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    # Check if the teacher exists
    cur.execute("SELECT * FROM users WHERE id = %s;", (teacher_id,))
    teacher = cur.fetchone()
    
    if not teacher:
        cur.close()
        conn.close()
        return jsonify({"error": "User not found"}), 404
    
    if teacher['user_role'] != 'teacher' and teacher['user_role'] != 'admin':
        cur.close()
        conn.close()
        return jsonify({"error": "User is not a teacher or admin"}), 403
    
    # Get all groups created by this teacher
    cur.execute(
        """
        SELECT * FROM groups 
        WHERE teacher_id = %s
        ORDER BY created_at DESC;
        """,
        (teacher_id,)
    )
    
    groups = cur.fetchall()
    cur.close()
    conn.close()
    
    return jsonify(groups)

@app.route("/groups/<id>/members", methods=["GET"])
def get_group_members(id):
    """Get all members of a group (for teacher who owns the group)"""
    requester_id = request.args.get('requester_id')
    
    if not requester_id:
        return jsonify({"error": "Requester ID is required"}), 400
    
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    # Check if the group exists
    cur.execute("SELECT * FROM groups WHERE id = %s;", (id,))
    group = cur.fetchone()
    
    if not group:
        cur.close()
        conn.close()
        return jsonify({"error": "Group not found"}), 404
    
    # Check if requester is authorized (teacher who owns the group or admin)
    cur.execute("SELECT * FROM users WHERE id = %s;", (requester_id,))
    requester = cur.fetchone()
    
    if not requester:
        cur.close()
        conn.close()
        return jsonify({"error": "Requester not found"}), 404
    
    if requester['user_role'] != 'admin' and (requester['user_role'] != 'teacher' or requester['id'] != group['teacher_id']):
        cur.close()
        conn.close()
        return jsonify({"error": "Only the teacher who created the group or an admin can view members"}), 403
    
    # Get all members of the group
    cur.execute(
        """
        SELECT u.id, u.email, u.user_name, u.user_role, ug.joined_at
        FROM users u
        JOIN user_groups ug ON u.id = ug.user_id
        WHERE ug.group_id = %s
        ORDER BY u.user_name;
        """,
        (id,)
    )
    
    members = cur.fetchall()
    cur.close()
    conn.close()
    
    return jsonify(members)

@app.route("/groups/<id>/member_count", methods=["GET"])
def get_group_member_count(id):
    """Get count of members in a group (available to group teacher)"""
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    # Check if the group exists
    cur.execute("SELECT * FROM groups WHERE id = %s;", (id,))
    group = cur.fetchone()
    
    if not group:
        cur.close()
        conn.close()
        return jsonify({"error": "Group not found"}), 404
    
    # Get count of members
    cur.execute(
        "SELECT COUNT(*) as member_count FROM user_groups WHERE group_id = %s;",
        (id,)
    )
    
    result = cur.fetchone()
    cur.close()
    conn.close()
    
    return jsonify({
        "group_id": id,
        "group_name": group['name'],
        "member_count": result['member_count']
    })

@app.route("/groups/<group_id>/announcements", methods=["POST"])
def create_announcement(group_id):
    """Create a new announcement for a group (teacher who owns the group only)"""
    data = request.get_json()
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
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
    conn.commit()
    
    # Add teacher name to the response
    announcement['teacher_name'] = teacher['user_name']
    
    cur.close()
    conn.close()
    
    return jsonify(announcement), 201

@app.route("/groups/<group_id>/announcements", methods=["GET"])
def get_group_announcements(group_id):
    """Get all announcements for a group (visible to group members and teacher)"""
    user_id = request.args.get('user_id')
    
    if not user_id:
        return jsonify({"error": "User ID is required"}), 400
    
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
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

@app.route("/groups/<group_id>/announcements/<announcement_id>", methods=["GET"])
def get_announcement(group_id, announcement_id):
    """Get a specific announcement (visible to group members and teacher)"""
    user_id = request.args.get('user_id')
    
    if not user_id:
        return jsonify({"error": "User ID is required"}), 400
    
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
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

@app.route("/groups/<group_id>/announcements/<announcement_id>", methods=["PUT"])
def update_announcement(group_id, announcement_id):
    """Update an announcement (teacher who created it or admin only)"""
    data = request.get_json()
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
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

@app.route("/groups/<group_id>/announcements/<announcement_id>", methods=["DELETE"])
def delete_announcement(group_id, announcement_id):
    """Delete an announcement (teacher who created it or admin only)"""
    user_id = request.args.get('user_id')
    
    if not user_id:
        return jsonify({"error": "User ID is required"}), 400
    
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
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

@app.route("/users/<user_id>/announcements", methods=["GET"])
def get_user_announcements(user_id):
    """Get all announcements for groups that a user belongs to"""
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
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

@app.route("/teachers/<teacher_id>/announcements", methods=["GET"])
def get_teacher_announcements(teacher_id):
    """Get all announcements created by a teacher"""
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
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

@app.route("/announcements/<announcement_id>/mark-read", methods=["POST"])
def mark_announcement_read(announcement_id):
    """Mark an announcement as read by a user"""
    data = request.get_json()
    user_id = data.get('user_id')
    
    if not user_id:
        return jsonify({"error": "User ID is required"}), 400
    
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
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

@app.route("/groups/<group_id>/unread-count", methods=["GET"])
def get_unread_announcements_count(group_id):
    """Get count of unread announcements for a user in a specific group"""
    user_id = request.args.get('user_id')
    
    if not user_id:
        return jsonify({"error": "User ID is required"}), 400
    
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    # Check if user is a member of the group
    cur.execute(
        "SELECT * FROM user_groups WHERE user_id = %s AND group_id = %s;",
        (user_id, group_id)
    )
    
    membership = cur.fetchone()
    
    if not membership:
        # Check if user is admin or teacher of the group
        cur.execute("SELECT * FROM users WHERE id = %s;", (user_id,))
        user = cur.fetchone()
        
        if not user or (user['user_role'] != 'admin' and user['user_role'] != 'teacher'):
            cur.close()
            conn.close()
            return jsonify({"error": "User is not a member of this group"}), 403
        
        if user['user_role'] == 'teacher':
            # Check if user is the teacher of this group
            cur.execute(
                "SELECT * FROM groups WHERE id = %s AND teacher_id = %s;",
                (group_id, user_id)
            )
            is_teacher = cur.fetchone() is not None
            
            if not is_teacher:
                cur.close()
                conn.close()
                return jsonify({"error": "User is not a member or teacher of this group"}), 403
    
    # Count unread announcements
    cur.execute(
        """
        SELECT COUNT(*) as unread_count
        FROM announcements a
        WHERE a.group_id = %s
        AND NOT EXISTS (
            SELECT 1 FROM announcement_reads ar
            WHERE ar.announcement_id = a.id AND ar.user_id = %s
        );
        """,
        (group_id, user_id)
    )
    
    result = cur.fetchone()
    cur.close()
    conn.close()
    
    return jsonify({
        "group_id": group_id,
        "user_id": user_id,
        "unread_count": result['unread_count']
    })

@app.route("/groups", methods=["POST"])
def create_group():
    """Create a new group (teacher only)"""
    data = request.get_json()
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    # Check if the teacher exists
    cur.execute("SELECT * FROM users WHERE id = %s;", (data['teacher_id'],))
    teacher = cur.fetchone()
    
    if not teacher:
        cur.close()
        conn.close()
        return jsonify({"error": "Teacher not found"}), 404
    
    if teacher['user_role'] != 'teacher' and teacher['user_role'] != 'admin':
        cur.close()
        conn.close()
        return jsonify({"error": "User is not a teacher or admin"}), 403
    
    # Create the group
    cur.execute(
        """
        INSERT INTO groups (name, description, teacher_id)
        VALUES (%s, %s, %s) RETURNING *;
        """,
        (data['name'], data.get('description'), data['teacher_id'])
    )
    
    group = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()
    
    return jsonify(group), 201

@app.route("/groups/<id>", methods=["GET"])
def get_group(id):
    """Get a specific group"""
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    cur.execute("SELECT * FROM groups WHERE id = %s;", (id,))
    group = cur.fetchone()
    
    cur.close()
    conn.close()
    
    if not group:
        return jsonify({"error": "Group not found"}), 404
    
    return jsonify(group)

@app.route("/groups/<id>/members/add", methods=["POST"])
def add_members_to_group(id):
    """Add multiple members to a group from a list of usernames"""
    data = request.get_json()
    user_names = data.get('user_names', [])
    teacher_id = data.get('teacher_id')
    
    if not user_names:
        return jsonify({"error": "No user names provided"}), 400
    
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    # Check if the group exists
    cur.execute("SELECT * FROM groups WHERE id = %s;", (id,))
    group = cur.fetchone()
    
    if not group:
        cur.close()
        conn.close()
        return jsonify({"error": "Group not found"}), 404
    
    # Check if user is authorized (must be the teacher who owns the group or an admin)
    cur.execute("SELECT * FROM users WHERE id = %s;", (teacher_id,))
    requester = cur.fetchone()
    
    if not requester:
        cur.close()
        conn.close() 
        return jsonify({"error": "Requester not found"}), 404
    
    if requester['user_role'] != 'admin' and (requester['user_role'] != 'teacher' or requester['id'] != group['teacher_id']):
        cur.close()
        conn.close()
        return jsonify({"error": "Only the teacher who created the group or an admin can add members"}), 403
    
    # Add members
    added_count = 0
    not_found = []
    already_members = []
    
    for user_name in user_names:
        # Find user by username
        # Find user by username
        cur.execute("SELECT * FROM users WHERE user_name = %s;", (str(user_name),))
        user = cur.fetchone()
        
        if not user:
            not_found.append(user_name)
            continue
        
        # Check if already a member
        cur.execute(
            "SELECT * FROM user_groups WHERE user_id = %s AND group_id = %s;",
            (user['id'], id)
        )
        
        if cur.fetchone():
            already_members.append(user_name)
            continue
        
        # Add to group
        try:
            cur.execute(
                """
                INSERT INTO user_groups (user_id, group_id)
                VALUES (%s, %s);
                """,
                (user['id'], id)
            )
            added_count += 1
        except Exception as e:
            # Handle error
            print(f"Error adding user {user_name}: {e}")
    
    conn.commit()
    cur.close()
    conn.close()
    
    return jsonify({
        "success": True,
        "added_count": added_count,
        "not_found": not_found,
        "already_members": already_members
    })

# Add these endpoints to your Flask app

@app.route("/users/<user_id>/groups", methods=["GET"])
def get_user_groups(user_id):
    """Get all groups that a user belongs to"""
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    # Check if the user exists
    cur.execute("SELECT * FROM users WHERE id = %s;", (user_id,))
    user = cur.fetchone()
    
    if not user:
        cur.close()
        conn.close()
        return jsonify({"error": "User not found"}), 404
    
    # Get all groups that the user belongs to
    cur.execute(
        """
        SELECT g.*, 
               (SELECT COUNT(*) FROM announcements a 
                WHERE a.group_id = g.id 
                AND NOT EXISTS (
                    SELECT 1 FROM announcement_reads ar 
                    WHERE ar.announcement_id = a.id AND ar.user_id = %s
                )) as unread_count
        FROM groups g
        JOIN user_groups ug ON g.id = ug.group_id
        WHERE ug.user_id = %s
        ORDER BY g.name;
        """,
        (user_id, user_id)
    )
    
    groups = cur.fetchall()
    cur.close()
    conn.close()
    
    return jsonify(groups)


@app.route("/groups/<group_id>/users/<user_id>/check", methods=["GET"])
def check_user_in_group(group_id, user_id):
    """Check if a user is a member of a specific group"""
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    cur.execute(
        "SELECT * FROM user_groups WHERE user_id = %s AND group_id = %s;",
        (user_id, group_id)
    )
    
    is_member = cur.fetchone() is not None
    
    # If not a member, also check if they're the teacher of the group
    if not is_member:
        cur.execute(
            "SELECT * FROM groups WHERE id = %s AND teacher_id = %s;",
            (group_id, user_id)
        )
        is_teacher = cur.fetchone() is not None
        
        # Consider the user part of the group if they're the teacher
        is_member = is_teacher
    
    cur.close()
    conn.close()
    
    return jsonify({"is_member": is_member})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
