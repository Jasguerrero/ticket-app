import streamlit as st
from dotenv import load_dotenv
from app.model.db_connection import get_db_connection
from app.model.db_setup import create_tables
from app.views.user_dashboard import display_dashboard  # Import the new page

create_tables()
load_dotenv('.env', override=True)

@st.cache_resource
def get_persistent_state():
    return {"authenticated": False, "user_role": None, "email": None}

state = get_persistent_state()

if "authenticated" not in st.session_state:
    st.session_state.authenticated = state["authenticated"]
    st.session_state.user_role = state["user_role"]
    st.session_state.email = state["email"]

def authenticate_user(username, password):
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute("SELECT email FROM users WHERE email = %s AND password = %s", (username, password))
    user = cur.fetchone()
    
    if user:
        st.session_state.authenticated = True
        st.session_state.user_role = "User"
        st.session_state.email = username
        return "User authenticated"
    
    cur.execute("SELECT email FROM admin WHERE email = %s AND password = %s", (username, password))
    admin = cur.fetchone()
    
    if admin:
        st.session_state.authenticated = True
        st.session_state.user_role = "Admin"
        st.session_state.email = username
        return "Admin authenticated"
    
    return "User not found"

st.title("Sistema de tickets")

if not st.session_state.authenticated:
    username = st.text_input("Email")
    password = st.text_input("Password", type="password")
    if st.button("Login"):
        message = authenticate_user(username, password)
        if "authenticated" in message:
            st.experimental_rerun()
        else:
            st.error(message)
else:
    # Redirect to the authenticated page
    display_dashboard(st.session_state.email)  # Pass the username to the new page function
