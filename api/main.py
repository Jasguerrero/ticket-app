from flask import Flask, request, jsonify
import os
import psycopg2
import logging
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

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

@app.route("/tickets", methods=["POST"])
def create_ticket():
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

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
