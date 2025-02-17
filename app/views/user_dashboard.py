import streamlit as st

def display_dashboard(username):
    st.title(f"Welcome, {username}")
    st.write(f"Hello {username}, this is your personal page!")
