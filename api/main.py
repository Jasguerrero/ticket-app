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
    DB_PASSWORD = os.getenv("POSTGRES_USER")
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

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
