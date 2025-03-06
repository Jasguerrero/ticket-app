from flask import Blueprint, request, jsonify
from api.database import get_db_connection, dict_cursor

# Create blueprint
users_bp = Blueprint('users', __name__)

@users_bp.route("/users", methods=["POST"])
def create_user():
    data = request.get_json()
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=dict_cursor())
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

@users_bp.route("/auth", methods=["POST"])
def authenticate_user():
    data = request.get_json()
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=dict_cursor())
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

@users_bp.route("/users/<user_id>/groups", methods=["GET"])
def get_user_groups(user_id):
    """Get all groups that a user belongs to"""
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=dict_cursor())
    
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
