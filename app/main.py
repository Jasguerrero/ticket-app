import streamlit as st
import psycopg2
import os

st.title("Sistema de tickets")

def get_db_connection():
    DB_NAME = "tickets_db"
    DB_USER = "postgres"
    DB_PASSWORD = "postgres"
    DB_HOST = "localhost"  # Use "db" if connecting from another Docker container
    DB_PORT = "5432"
    return psycopg2.connect(
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
        host=DB_HOST,
        port=DB_PORT
    )

if "authenticated" not in st.session_state:
    st.session_state.authenticated = False

if not st.session_state.authenticated:
    username = st.text_input("Usuario")
    password = st.text_input("Password", type="password")
    if st.button("Login"):
        if username == "admin" and password == "admin":
            st.session_state.authenticated = True
            st.experimental_rerun()
        else:
            st.error("Invalid credentials")
else:
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT version();")
    print("PostgreSQL version:", cur.fetchone())
    st.success("Logged in successfully!")
    st.write("Ticket Creation Section")
