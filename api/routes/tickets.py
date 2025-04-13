from flask import Blueprint, request, jsonify
import logging
from api.database import get_db_connection, dict_cursor
from api.services.rabbitmq import rabbitmq

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
    cur.execute("""
        SELECT t.*, u.user_name 
        FROM tickets t
        LEFT JOIN users u ON t.user_id = u.id;
    """)
    tickets = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify(tickets)

@tickets_bp.route("/all_open_tickets", methods=["GET"])
def get_all_open_tickets():
    """Get all open tickets in the system for superuser dashboard"""
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=dict_cursor())
    cur.execute("""
        SELECT t.*, u.user_name 
        FROM tickets t
        LEFT JOIN users u ON t.user_id = u.id
        WHERE t.status = 'open' 
        ORDER BY t.created_at DESC;
    """)
    tickets = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify(tickets)

@tickets_bp.route("/all_closed_tickets", methods=["GET"])
def get_all_closed_tickets():
    """Get all closed tickets in the system for superuser dashboard"""
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=dict_cursor())
    cur.execute("""
        SELECT t.*, u.user_name 
        FROM tickets t
        LEFT JOIN users u ON t.user_id = u.id
        WHERE t.status = 'closed' 
        ORDER BY t.closed_at DESC;
    """)
    tickets = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify(tickets)

@tickets_bp.route("/tickets/<id>", methods=["GET"])
def get_ticket(id):
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=dict_cursor())
    cur.execute("""
        SELECT t.*, u.user_name 
        FROM tickets t
        LEFT JOIN users u ON t.user_id = u.id
        WHERE t.id = %s;
    """, (id,))
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

@tickets_bp.route("/tickets-priority/<id>", methods=["PUT"])
def update_ticket_priority(id):
    data = request.get_json()
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        """
        UPDATE tickets SET priority = %s, updated_at = CURRENT_TIMESTAMP
        WHERE id = %s RETURNING *;
        """,
        (data['priority'], id)
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
    cur.execute("""
        SELECT t.*, u.user_name 
        FROM tickets t
        LEFT JOIN users u ON t.user_id = u.id
        WHERE t.assign_id = %s AND t.status = 'open';
    """, (user_id,))
    tickets = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify(tickets)

@tickets_bp.route("/tickets_assign_closed/<user_id>", methods=["GET"])
def tickets_assign_closed(user_id):
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=dict_cursor())
    cur.execute("""
        SELECT t.*, u.user_name 
        FROM tickets t
        LEFT JOIN users u ON t.user_id = u.id
        WHERE t.assign_id = %s AND t.status = 'closed';
    """, (user_id,))
    tickets = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify(tickets)

@tickets_bp.route("/assign_ticket/<id>", methods=["PUT"])
def assign_ticket(id):
    data = request.get_json()
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=dict_cursor())
    
    try:
        # Begin transaction
        cur.execute("BEGIN;")
        
        # Get ticket data before update
        cur.execute("SELECT * FROM tickets WHERE id = %s;", (id,))
        original_ticket = cur.fetchone()
        
        if not original_ticket:
            # Rollback if ticket not found
            cur.execute("ROLLBACK;")
            cur.close()
            conn.close()
            return jsonify({"error": "Ticket not found"}), 404
        
        # Update the ticket with the new assignment
        cur.execute(
            """
            UPDATE tickets SET assign_id = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s RETURNING *;
            """,
            (data['assign_id'], id)
        )
        ticket = cur.fetchone()
        
        # Get agent name
        cur.execute("SELECT user_name FROM users WHERE id = %s;", (data['assign_id'],))
        agent = cur.fetchone()
        agent_name = agent['user_name'] if agent else "Support Agent"
        
        # Add automatic comment when ticket is assigned
        automatic_comment = "Recibimos tu caso, y el mismo lo escalamos a Tier 1 para su debido análisis y solución.\nPronto se contactarán contigo para brindarte una solución."
        
        cur.execute(
            """
            INSERT INTO comments (ticket_id, user_id, content)
            VALUES (%s, %s, %s)
            RETURNING *;
            """,
            (id, data['assign_id'], automatic_comment)
        )
        comment = cur.fetchone()
        
        # Get user details for notification
        cur.execute("SELECT id, phone, user_name FROM users WHERE id = %s;", (ticket['user_id'],))
        user = cur.fetchone()
        
        # Create notification for the ticket creator
        notification_message = f"Tu ticket #{id} ha sido asignado a {agent_name}\n {automatic_comment}"
        
        # Send notification via RabbitMQ
        notification_success = rabbitmq.publish_notification(
            user_id=ticket['user_id'],
            message=notification_message,
            notification_type='assignment',
            phone=user['phone']
        )
        
        # Add notification status to the response
        if notification_success:
            ticket['notification_status'] = 'queued'
        else:
            ticket['notification_status'] = 'failed'
        
        # Commit transaction if everything was successful
        cur.execute("COMMIT;")
        
        return jsonify(ticket)
        
    except Exception as e:
        # Rollback in case of any error
        cur.execute("ROLLBACK;")
        logger.error(f"Error assigning ticket: {str(e)}", exc_info=True)
        return jsonify({"error": f"Failed to assign ticket: {str(e)}"}), 500
        
    finally:
        cur.close()
        conn.close()

@tickets_bp.route("/close_ticket/<id>", methods=["PUT"])
def close_ticket(id):
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=dict_cursor())
    
    try:
        # Begin transaction
        cur.execute("BEGIN;")
        
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
            cur.execute("ROLLBACK;")
            cur.close()
            conn.close()
            return jsonify({"error": "Ticket not found"}), 404
        
        # Get the ticket creator's details
        cur.execute("SELECT id, phone, user_name FROM users WHERE id = %s;", (ticket['user_id'],))
        user = cur.fetchone()
        
        # Get the category and subcategory for the notification message
        category = ticket['category']
        sub_category = ticket['sub_category'] if ticket['sub_category'] else ""
        
        # Create the notification message
        notification_message = f"Ticket #{id} ({category}/{sub_category}) se cerro."
        
        # Send notification via RabbitMQ
        notification_success = rabbitmq.publish_notification(
            user_id=ticket['user_id'],
            message=notification_message,
            notification_type='ticket',
            phone=user['phone']
        )
        
        # Add notification status to the response
        if notification_success:
            ticket['notification_status'] = 'queued'
        else:
            ticket['notification_status'] = 'failed'
        
        cur.execute("COMMIT;")
        
        return jsonify(ticket)
        
    except Exception as e:
        cur.execute("ROLLBACK;")
        logger.error(f"Error closing ticket: {str(e)}", exc_info=True)
        return jsonify({"error": f"Failed to close ticket: {str(e)}"}), 500
        
    finally:
        cur.close()
        conn.close()

@tickets_bp.route("/tickets_user_open/<user_id>", methods=["GET"])
def tickets_user_open(user_id):
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=dict_cursor())
    cur.execute("""
        SELECT t.*, u.user_name 
        FROM tickets t
        LEFT JOIN users u ON t.user_id = u.id
        WHERE t.user_id = %s AND t.status = 'open';
    """, (user_id,))
    tickets = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify(tickets)

@tickets_bp.route("/tickets_user_closed/<user_id>", methods=["GET"])
def tickets_user_closed(user_id):
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=dict_cursor())
    cur.execute("""
        SELECT t.*, u.user_name 
        FROM tickets t
        LEFT JOIN users u ON t.user_id = u.id
        WHERE t.user_id = %s AND t.status = 'closed';
    """, (user_id,))
    tickets = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify(tickets)

@tickets_bp.route("/tickets_not_assigned_open", methods=["GET"])
def tickets_not_assign_open():
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=dict_cursor())
    cur.execute("""
        SELECT t.*, u.user_name 
        FROM tickets t
        LEFT JOIN users u ON t.user_id = u.id
        WHERE t.assign_id IS NULL AND t.status = 'open';
    """)
    tickets = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify(tickets)
