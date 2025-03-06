from flask import Blueprint, request, jsonify
from api.database import get_db_connection, dict_cursor

# Create blueprint
groups_bp = Blueprint('groups', __name__)

@groups_bp.route("/groups", methods=["POST"])
def create_group():
    """Create a new group (teacher only)"""
    data = request.get_json()
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=dict_cursor())
    
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

@groups_bp.route("/groups/<id>", methods=["GET"])
def get_group(id):
    """Get a specific group"""
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=dict_cursor())
    
    cur.execute("SELECT * FROM groups WHERE id = %s;", (id,))
    group = cur.fetchone()
    
    cur.close()
    conn.close()
    
    if not group:
        return jsonify({"error": "Group not found"}), 404
    
    return jsonify(group)

@groups_bp.route("/groups/<id>/members/add", methods=["POST"])
def add_members_to_group(id):
    """Add multiple members to a group from a list of usernames"""
    data = request.get_json()
    user_names = data.get('user_names', [])
    teacher_id = data.get('teacher_id')
    
    if not user_names:
        return jsonify({"error": "No user names provided"}), 400
    
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=dict_cursor())
    
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

@groups_bp.route("/groups/<id>/members", methods=["GET"])
def get_group_members(id):
    """Get all members of a group (for teacher who owns the group)"""
    requester_id = request.args.get('requester_id')
    
    if not requester_id:
        return jsonify({"error": "Requester ID is required"}), 400
    
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=dict_cursor())
    
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

@groups_bp.route("/groups/<id>/member_count", methods=["GET"])
def get_group_member_count(id):
    """Get count of members in a group (available to group teacher)"""
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=dict_cursor())
    
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

@groups_bp.route("/groups/<group_id>/users/<user_id>/check", methods=["GET"])
def check_user_in_group(group_id, user_id):
    """Check if a user is a member of a specific group"""
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=dict_cursor())
    
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

@groups_bp.route("/teachers/<teacher_id>/groups", methods=["GET"])
def get_teacher_groups(teacher_id):
    """Get all groups created by a teacher"""
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=dict_cursor())
    
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

@groups_bp.route("/groups/<group_id>/unread-count", methods=["GET"])
def get_unread_announcements_count(group_id):
    """Get count of unread announcements for a user in a specific group"""
    user_id = request.args.get('user_id')
    
    if not user_id:
        return jsonify({"error": "User ID is required"}), 400
    
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=dict_cursor())
    
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
