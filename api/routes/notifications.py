from flask import Blueprint, request, jsonify
import json
from api.database import get_db_connection, dict_cursor

# Create notifications blueprint
notifications_bp = Blueprint('notifications', __name__)

@notifications_bp.route("/notifications/pending", methods=["GET"])
def get_pending_notifications():
    """Get all pending notifications with user details"""
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=dict_cursor())
    
    # Get all pending notifications with user details
    cur.execute(
        """
        SELECT 
            n.*,
            u.id as user_id,
            u.user_name,
            u.email,
            u.phone,
            u.user_role
        FROM notifications n
        JOIN users u ON n.user_id = u.id
        WHERE n.status = 'pending'
        ORDER BY n.created_at DESC;
        """
    )
    
    notifications = cur.fetchall()
    
    # Parse the extra_info JSON for each notification
    for notification in notifications:
        if notification['extra_info']:
            try:
                notification['extra_info'] = json.loads(notification['extra_info'])
            except:
                # If parsing fails, keep as string
                pass
    
    cur.close()
    conn.close()
    
    return jsonify(notifications)

@notifications_bp.route("/notifications/<notification_id>/update-status", methods=["POST"])
def update_status_notification(notification_id):
    """Mark a notification as read"""
    data = request.get_json()
    user_id = data.get('user_id')
    status = data.get('status')
    
    if not user_id or not status:
        return jsonify({"error": "User ID and status is required"}), 400
    
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=dict_cursor())
    
    # Check if the notification exists and belongs to the user
    cur.execute(
        """
        SELECT * FROM notifications
        WHERE id = %s AND user_id = %s;
        """,
        (notification_id, user_id)
    )
    notification = cur.fetchone()
    
    if not notification:
        cur.close()
        conn.close()
        return jsonify({"error": "Notification not found or does not belong to this user"}), 404
    
    # Update the notification status
    cur.execute(
        """
        UPDATE notifications
        SET status = %s, updated_at = CURRENT_TIMESTAMP
        WHERE id = %s
        RETURNING *;
        """,
        (status, notification_id)
    )
    
    updated_notification = cur.fetchone()
    
    # Parse the extra_info JSON if it exists
    if updated_notification['extra_info']:
        try:
            updated_notification['extra_info'] = json.loads(updated_notification['extra_info'])
        except:
            # If parsing fails, keep as string
            pass
    
    conn.commit()
    cur.close()
    conn.close()
    
    return jsonify(updated_notification)
