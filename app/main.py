import logging
import streamlit as st
from dotenv import load_dotenv
from app.model.db_connection import get_db_connection
from app.model.db_setup import create_tables
from app.views.dashboard import display_dashboard  # Import the new page

logging.basicConfig(
    format='%(asctime)s - %(filename)s - %(message)s',  # Adds timestamp and file name
    level=logging.INFO  # You can change this to DEBUG, ERROR, etc.
)

logger = logging.getLogger(__name__)
create_tables()
conn = get_db_connection()
load_dotenv('.env', override=True)

@st.cache_resource
def get_persistent_state():
    return {"authenticated": False, "user_role": None, "email": None}

state = get_persistent_state()

if "authenticated" not in st.session_state:
    st.session_state.authenticated = state["authenticated"]
    st.session_state.user_role = state["user_role"]
    st.session_state.email = state["email"]

def authenticate_user(username, password) -> bool:
    cur = conn.cursor()
    
    cur.execute("SELECT id, email, user_role FROM users WHERE email = %s AND password = %s", (username.lower(), password.lower()))
    user = cur.fetchone()
    if user:
        logger.info(f"User: '{username}' authenticated")
        user_id, user_email, user_role = user
        st.session_state.authenticated = True
        st.session_state.user_role = user_role
        st.session_state.email = user_email
        st.session_state.user_id = user_id
        return True
    return False

if not st.session_state.authenticated:
    st.title("Sistema de tickets")
    username = st.text_input("Email")
    password = st.text_input("Password", type="password")
    if st.button("Login"):
        if username is None:
            username = ""
        if password is None:
            password = ""
        is_authenticated = authenticate_user(username, password)
        if is_authenticated:
            st.rerun()
        else:
            logger.warning(f"User: '{username}' failed to authenticate")
            st.error("User not found")
else:
    # Redirect to the authenticated page
    display_dashboard(
        st.session_state.user_id,
        st.session_state.email,
        st.session_state.user_role,
        conn
    )
