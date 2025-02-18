import logging
import streamlit as st

logger = logging.getLogger(__name__)

def admin_dashboard(user_id, user_email, conn):
    # Left Sidebar with Clickable Menu Items (No dropdowns, just buttons)
    with st.sidebar:
        st.header("Admin Menu")
        open_tickets = st.button("📂 Open Tickets", key="open_tickets")
        assigned_not_closed = st.button("📌 Assigned to You (Not Closed)", key="assigned_not_closed")
        graphs = st.button("📊 Graphs (TBD)", key="graphs")
        assigned_closed = st.button("✅ Assigned to You (Closed)", key="assigned_closed")

    # Handle button clicks and display the corresponding tickets
    if open_tickets:
        display_tickets(conn, status="open")
    elif assigned_not_closed:
        display_tickets(conn, assigned_to=user_id, status="not_closed")
    elif assigned_closed:
        display_tickets(conn, assigned_to=user_id, status="closed")
    elif graphs:
        display_graphs()
    else:
        # Default: Show open tickets when no button is clicked initially
        display_tickets(conn, status="open")


def display_tickets(conn, assigned_to=None, status=None):
    logger.info(f"Displaying tickets for status: {status}, assigned_to: {assigned_to}")
    """Fetch and display tickets based on the selected menu option"""
    cur = conn.cursor()

    query = "SELECT id, category, description, created_at, status FROM tickets WHERE 1=1"
    params = []

    if status == "open":
        query += " AND status = %s"
        params.append("open")
    elif status == "not_closed":
        query += " AND assign_id = %s AND status != %s"
        params.extend([assigned_to, "closed"])
    elif status == "closed":
        query += " AND assign_id = %s AND status = %s"
        params.extend([assigned_to, "closed"])

    query += " ORDER BY created_at DESC"

    cur.execute(query, tuple(params))
    tickets = cur.fetchall()

    st.subheader(f"Showing {status.replace('_', ' ').title()} Tickets")

    if not tickets:
        st.info("No tickets found.")
    else:
        for ticket in tickets:
            ticket_id, category, description, created_at, ticket_status = ticket
            with st.expander(f"🔖 Ticket {ticket_id} - {category} ({ticket_status})"):
                st.write(f"**Description:** {description}")
                st.write(f"🕒 Created at: {created_at}")

    cur.close()

def display_graphs():
    logger.info("Displaying graphs")
    """Placeholder for displaying graphs"""
    st.subheader("📊 Graphs & Analytics")
    st.write("Graphs and analytics will be displayed here in the future.")
