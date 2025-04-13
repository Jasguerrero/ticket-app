from flask import Blueprint, request, jsonify
import logging
from api.database import get_db_connection, dict_cursor
from api.services.rabbitmq import rabbitmq  # Import the rabbitmq service

# Configure logger
logger = logging.getLogger(__name__)

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
        notification_status = None
        
        # Determine notification recipient
        notification_recipient_id = None
        
        if is_admin_or_support:
            # If comment is from admin/support, notify the ticket creator
            notification_recipient_id = ticket['user_id']
            notification_message = f"Nuevo comentario en tu ticket #{id}: {user['user_name']} \n{data['content']}"
        
            # Only send notification if we have a recipient
            if notification_recipient_id:
                # Get recipient user details
                cur.execute("SELECT phone, user_name FROM users WHERE id = %s;", (notification_recipient_id,))
                recipient = cur.fetchone()
                
                if recipient:
                    # Send notification via RabbitMQ
                    notification_success = rabbitmq.publish_notification(
                        user_id=notification_recipient_id,
                        message=notification_message,
                        notification_type='comment',
                        phone=recipient['phone']
                    )
                    
                    # Track notification status
                    if notification_success:
                        notification_status = 'queued'
                    else:
                        notification_status = 'failed'
        
        # Add the username to the response
        new_comment['user_name'] = user['user_name']
        
        # Add notification status to the response if applicable
        if notification_status:
            new_comment['notification_status'] = notification_status
        
        # Commit the transaction
        cur.execute("COMMIT;")
        
        return jsonify(new_comment), 201
        
    except Exception as e:
        # Rollback in case of error
        cur.execute("ROLLBACK;")
        logger.error(f"Error creating comment: {str(e)}", exc_info=True)
        return jsonify({"error": f"Failed to create comment: {str(e)}"}), 500
        
    finally:
        cur.close()
        conn.close()
