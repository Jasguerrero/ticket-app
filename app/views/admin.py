import logging
import streamlit as st

logger = logging.getLogger(__name__)

def admin_dashboard(user_id, user_email, conn):
    with st.sidebar:
        st.header("Admin Menu")
        open_tickets = st.button("📂 Tickets Abiertos", key="open_tickets")
        assigned_not_closed = st.button("📌 Asignados (Pendientes)", key="assigned_not_closed")
        graphs = st.button("📊 Gráficos", key="graphs")
        assigned_closed = st.button("✅ Historial", key="assigned_closed")

    # Handle button clicks and display the corresponding tickets
    if open_tickets:
        display_tickets(conn, user_id, status="open", header_message="Tickets Abiertos sin asignar")
    elif assigned_not_closed:
        display_tickets(conn, user_id, assigned_to=user_id, status="open", header_message=f"Tickets Asignados a {user_email}")
    elif assigned_closed:
        display_tickets(conn, user_id, assigned_to=user_id, status="closed", header_message=f"Historial de tickets cerrados por {user_email}")
    elif graphs:
        display_graphs()
    else:
        # Default: Show open tickets when no button is clicked initially
        display_tickets(conn, user_id, status="open", header_message="Tickets Abiertos sin asignar")


def display_tickets(conn, user_id, header_message="", assigned_to=None, status=None):
    logger.info(f"Showin tickets with status: {status}, assigned_to {assigned_to}")
    """Fetch and display tickets based on the selected menu option"""
    cur = conn.cursor()

    query = """
        SELECT id, category, description, created_at, status, assign_id
        FROM tickets WHERE 1=1
    """
    params = []

    if status:
        query += " AND status = %s"
        params.append(status)
    if assigned_to:
        query += " AND assign_id = %s"
        params.append(assigned_to)
    else:
        query += " AND assign_id IS NULL"

    query += " ORDER BY created_at DESC"

    cur.execute(query, tuple(params))
    tickets = cur.fetchall()

    st.subheader(f"{header_message}")

    if not tickets:
        st.info("Aún no hay tickets para mostrar")
    else:
        for ticket in tickets:
            ticket_id, category, description, created_at, ticket_status, assign_id = ticket
            with st.expander(f"🔖 Ticket {ticket_id} - {category} ({ticket_status})"):
                st.write(f"**Descripción:** {description}")
                st.write(f"🕒 Fecha de creación: {created_at}")
                if not assign_id:
                    assign_button = st.button("➕ Asignar", key=f"assign_{ticket_id}")
                    if assign_button:
                        logger.info(f"Assigning ticket {ticket_id} to user {user_id}")
                        #assign_ticket(conn, ticket_id, user_id)
                else:
                    closed_button = st.button("✔️ Cerrar", key=f"close_{ticket_id}")
                    if closed_button:
                        logger.info(f"Closing ticket {ticket_id}")
                        #close_ticket(conn, ticket_id)

    cur.close()

def close_ticket(conn, ticket_id):
    logger.info(f"Closing ticket {ticket_id}")
    query = "UPDATE tickets SET status = 'closed' WHERE id = %s"
    params = (ticket_id,)
    cur = conn.cursor()
    cur.execute(query, params)
    conn.commit()
    cur.close()
    st.rerun()

def assign_ticket(conn, ticket_id, user_id):
    logger.info(f"Assigning ticket {ticket_id} to user {user_id}")
    query = "UPDATE tickets SET assign_id = %s WHERE id = %s"
    params = (user_id, ticket_id)
    cur = conn.cursor()
    cur.execute(query, params)
    conn.commit()
    cur.close()
    st.rerun()

def display_graphs():
    logger.info("Displaying graphs")
    """Placeholder for displaying graphs"""
    st.subheader("📊 Gráficas y Análisis")
    st.write("Gráficas y análisis seran desplegadas aqui en un futuro")
