import time
import logging
import streamlit as st
import uuid

logger = logging.getLogger(__name__)

CATEGORY_EMOJIS = {
    "CRUD": "📝",
    "Soporte Tecnico": "🛠️",
    "Seguridad": "🔒",
    "Quejas & Sugerencias": "📢"
}

def generate_ticket_id():
    """Generates a unique 5-character ticket ID from a UUID."""
    return str(uuid.uuid4()).replace("-", "")[:5]

def save_ticket_to_db(ticket_id, category, description, user_id, conn):
    """Inserts a new ticket into the database."""
    try:
        cur = conn.cursor()
        insert_query = """
        INSERT INTO tickets (id, category, description, user_id, created_at)
        VALUES (%s, %s, %s, %s, NOW())
        """
        cur.execute(insert_query, (ticket_id, category, description, user_id))
        conn.commit()
        cur.close()
        logger.info(f"Ticket {ticket_id} created successfully for user {user_id}")
        return True
    except Exception as e:
        logger.error(f"Error inserting ticket: {e}")
        return False

def get_user_tickets(user_id, conn, offset=0, limit=5):
    """Fetches user tickets ordered by creation timestamp (DESC) with pagination."""
    try:
        cur = conn.cursor()
        query = """
        SELECT id, category, description, created_at 
        FROM tickets 
        WHERE user_id = %s 
        ORDER BY created_at DESC 
        LIMIT %s OFFSET %s
        """
        cur.execute(query, (user_id, limit, offset))
        tickets = cur.fetchall()
        cur.close()
        return tickets
    except Exception as e:
        logger.error(f"Error fetching tickets: {e}")
        return []

def count_user_tickets(user_id, conn):
    """Counts the total number of tickets for a user."""
    try:
        cur = conn.cursor()
        query = "SELECT COUNT(*) FROM tickets WHERE user_id = %s"
        cur.execute(query, (user_id,))
        count = cur.fetchone()[0]
        cur.close()
        return count
    except Exception as e:
        logger.error(f"Error counting tickets: {e}")
        return 0

def user_dashboard(user_id, user_email, conn):
    logger.info(f"User webpage display")
    
    st.title(f"Bienvenido, {user_email}")

    # Pagination setup
    total_tickets = count_user_tickets(user_id, conn)
    tickets_per_page = 5
    total_pages = (total_tickets // tickets_per_page) + (1 if total_tickets % tickets_per_page > 0 else 0)

    if "current_page" not in st.session_state:
        st.session_state.current_page = 1

    current_offset = (st.session_state.current_page - 1) * tickets_per_page
    user_tickets = get_user_tickets(user_id, conn, offset=current_offset, limit=tickets_per_page)

    # **Display Tickets Timeline**
    st.subheader("Tus Tickets")
    if user_tickets:
        for ticket in user_tickets:
            ticket_id, category, description, created_at = ticket
            emoji = CATEGORY_EMOJIS.get(category, "❓")
            with st.expander(f"{emoji} {category} - {created_at.strftime('%Y-%m-%d %H:%M:%S')} (ID: {ticket_id})"):
                st.write(description)
    else:
        st.write("No tienes tickets aún.")

    # Pagination controls
    col1, _, col3 = st.columns([3, 1, 1])
    with col1:
        if st.session_state.current_page > 1:
            if st.button("⬅ Anterior"):
                st.session_state.current_page -= 1
                st.rerun()
    with col3:
        if st.session_state.current_page < total_pages:
            if st.button("Siguiente ➡"):
                st.session_state.current_page += 1
                st.rerun()

    # **Ticket Creation Form**
    st.subheader("Crear nuevo ticket")
    ticket_description = st.text_area("Descripción", "", placeholder="Escribe los detalles de tu problema o solicitud aquí...")
    ticket_category = st.selectbox("Categoría", list(CATEGORY_EMOJIS.keys()))

    submit_button = st.button("Crear ticket", disabled=not ticket_description.strip())

    if submit_button:
        ticket_id = generate_ticket_id()
        with st.spinner('Creando ticket...'):
            time.sleep(2)
        if save_ticket_to_db(ticket_id, ticket_category, ticket_description, user_id, conn):
            st.success(f"✅ Tu ticket ({ticket_id}) se creó con éxito.")
            time.sleep(1)
            st.session_state.current_page = 1  # Reset pagination to show the new ticket
            st.rerun()  # Refresh page to show the new ticket
        else:
            st.error("❌ Hubo un error al crear el ticket.")
