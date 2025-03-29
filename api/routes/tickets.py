from flask import Blueprint, request, jsonify
import logging
import json
from api.database import get_db_connection, dict_cursor

# Configure logger
logger = logging.getLogger(__name__)

# Create blueprint
tickets_bp = Blueprint('tickets', __name__)

@tickets_bp.route("/tickets", methods=["POST"])
def create_ticket():
    logger.info("Creating ticket")
    data = request.get_json()
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO tickets (id, category, sub_category, description, user_id, assign_id, status, priority)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING *;
        """,
        (data['id'], data['category'], data.get('sub_category'), data['description'], data['user_id'], data.get('assign_id'), data.get('status', 'open'), data.get('priority', 'medium'))
    )
    ticket = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()
    return jsonify(ticket), 201

@tickets_bp.route("/tickets", methods=["GET"])
def get_tickets():
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=dict_cursor())
    cur.execute("SELECT * FROM tickets;")
    tickets = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify(tickets)

@tickets_bp.route("/all_open_tickets", methods=["GET"])
def get_all_open_tickets():
    """Get all open tickets in the system for superuser dashboard"""
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=dict_cursor())
    cur.execute("SELECT * FROM tickets WHERE status = 'open' ORDER BY created_at DESC;")
    tickets = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify(tickets)

@tickets_bp.route("/all_closed_tickets", methods=["GET"])
def get_all_closed_tickets():
    """Get all closed tickets in the system for superuser dashboard"""
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=dict_cursor())
    cur.execute("SELECT * FROM tickets WHERE status = 'closed' ORDER BY closed_at DESC;")
    tickets = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify(tickets)

@tickets_bp.route("/tickets/<id>", methods=["GET"])
def get_ticket(id):
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=dict_cursor())
    cur.execute("SELECT * FROM tickets WHERE id = %s;", (id,))
    ticket = cur.fetchone()
    cur.close()
    conn.close()
    if ticket:
        return jsonify(ticket)
    return jsonify({"error": "Ticket not found"}), 404

@tickets_bp.route("/tickets/<id>", methods=["PUT"])
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

@tickets_bp.route("/tickets/<id>", methods=["DELETE"])
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

@tickets_bp.route("/tickets_assign_open/<user_id>", methods=["GET"])
def tickets_assign_open(user_id):
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=dict_cursor())
    cur.execute("SELECT * FROM tickets WHERE assign_id = %s AND status = 'open';", (user_id,))
    tickets = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify(tickets)

@tickets_bp.route("/tickets_assign_closed/<user_id>", methods=["GET"])
def tickets_assign_closed(user_id):
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=dict_cursor())
    cur.execute("SELECT * FROM tickets WHERE assign_id = %s AND status = 'closed';", (user_id,))
    tickets = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify(tickets)

@tickets_bp.route("/assign_ticket/<id>", methods=["PUT"])
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

@tickets_bp.route("/close_ticket/<id>", methods=["PUT"])
def close_ticket(id):
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=dict_cursor())
    
    # Update ticket status to closed
    cur.execute(
        """
        UPDATE tickets 
        SET status = 'closed', closed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
        WHERE id = %s 
        RETURNING *;
        """,
        (id,)
    )
    ticket = cur.fetchone()
    
    if not ticket:
        cur.close()
        conn.close()
        return jsonify({"error": "Ticket not found"}), 404
    
    # Get the ticket creator's ID (this will be the notification recipient)
    ticket_creator_id = ticket['user_id']
    
    # Get the category and subcategory for the notification message
    category = ticket['category']
    sub_category = ticket['sub_category'] if ticket['sub_category'] else ""
    
    # Get the last comment on the ticket (if any)
    cur.execute(
        """
        SELECT c.*, u.user_name
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.ticket_id = %s
        ORDER BY c.created_at DESC
        LIMIT 1;
        """,
        (id,)
    )
    last_comment = cur.fetchone()
    
    # Create the notification message
    if last_comment:
        notification_message = f"Ticket #{id} ({category}/{sub_category}) se cerro.\n\n Ultimo comentario: \"{last_comment['content'][:100]}...\""
        comment_author = last_comment['user_name']
    else:
        notification_message = f"Ticket #{id} ({category}/{sub_category}) se cerro."
        comment_author = None
    
    # Create extra_info JSON
    extra_info = json.dumps({
        "ticket_id": id,
        "category": category,
        "sub_category": sub_category,
        "last_comment": last_comment['content'] if last_comment else None,
        "comment_author": comment_author
    })
    
    # Create notification for the ticket creator
    cur.execute(
        """
        INSERT INTO notifications (message, user_id, status, type, extra_info)
        VALUES (%s, %s, 'pending', 'ticket', %s);
        """,
        (notification_message, ticket_creator_id, extra_info)
    )
    
    conn.commit()
    cur.close()
    conn.close()
    
    return jsonify(ticket)

@tickets_bp.route("/tickets_user_open/<user_id>", methods=["GET"])
def tickets_user_open(user_id):
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=dict_cursor())
    cur.execute("SELECT * FROM tickets WHERE user_id = %s AND status = 'open';", (user_id,))
    tickets = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify(tickets)

@tickets_bp.route("/tickets_user_closed/<user_id>", methods=["GET"])
def tickets_user_closed(user_id):
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=dict_cursor())
    cur.execute("SELECT * FROM tickets WHERE user_id = %s AND status = 'closed';", (user_id,))
    tickets = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify(tickets)

@tickets_bp.route("/tickets_not_assigned_open", methods=["GET"])
def tickets_not_assign_open():
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=dict_cursor())
    cur.execute("SELECT * FROM tickets WHERE assign_id IS NULL AND status = 'open';")
    tickets = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify(tickets)
