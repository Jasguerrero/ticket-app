from flask import Blueprint, request, jsonify
import json
from api.database import get_db_connection, dict_cursor

# Create blueprint
comments_bp = Blueprint('comments', __name__)

@comments_bp.route("/tickets/<id>/comments", methods=["GET"])
def get_ticket_comments(id):
    """Get all comments for a specific ticket"""
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=dict_cursor())
    
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

@comments_bp.route("/tickets/<id>/comments", methods=["POST"])
def create_comment(id):
    """Create a new comment for a ticket"""
    data = request.get_json()
    
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=dict_cursor())
    
    try:
        # Begin transaction
        cur.execute("BEGIN;")
        
        # First check if the ticket exists
        cur.execute("SELECT * FROM tickets WHERE id = %s;", (id,))
        ticket = cur.fetchone()
        
        if not ticket:
            cur.execute("ROLLBACK;")
            cur.close()
            conn.close()
            return jsonify({"error": "Ticket not found"}), 404
        
        # Check user role to enforce permission rules
        cur.execute("SELECT * FROM users WHERE id = %s;", (data['user_id'],))
        user = cur.fetchone()
        
        # Regular users can only comment on open tickets
        is_admin_or_support = user['user_role'] in ['admin', 'super-user']
        if not is_admin_or_support and ticket['status'] != 'open':
            cur.execute("ROLLBACK;")
            cur.close()
            conn.close()
            return jsonify({"error": "Regular users can only comment on open tickets"}), 403
        
        # Admin users can only comment on tickets assigned to them
        if is_admin_or_support and ticket['assign_id'] != user['id']:
            cur.execute("ROLLBACK;")
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
        
        # Determine notification recipient
        notification_recipient_id = None
        
        if is_admin_or_support:
            # If comment is from admin/support, notify the ticket creator
            notification_recipient_id = ticket['user_id']
            notification_message = f"Nuevo comentario en tu ticket #{id}: {user['user_name']} \n{data['content']}"
        
        # Only create notification if we have a recipient
        if notification_recipient_id:
            # Create extra_info JSON with relevant data
            extra_info = json.dumps({
                "ticket_id": id,
                "category": ticket['category'],
                "sub_category": ticket['sub_category'],
                "comment_id": new_comment['id'],
                "comment_content": data['content'][:100] + ("..." if len(data['content']) > 100 else ""),
                "comment_author": user['user_name']
            })
            
            # Insert notification
            cur.execute(
                """
                INSERT INTO notifications (message, user_id, status, type, extra_info)
                VALUES (%s, %s, 'pending', 'comment', %s);
                """, 
                (notification_message, notification_recipient_id, extra_info)
            )
        
        # Add the username to the response
        new_comment['user_name'] = user['user_name']
        
        # Commit the transaction
        cur.execute("COMMIT;")
        
        return jsonify(new_comment), 201
        
    except Exception as e:
        # Rollback in case of error
        cur.execute("ROLLBACK;")
        return jsonify({"error": f"Failed to create comment: {str(e)}"}), 500
        
    finally:
        cur.close()
        conn.close()
