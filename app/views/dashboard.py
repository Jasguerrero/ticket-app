import logging
import streamlit as st
import uuid
from app.views.admin import admin_dashboard
from app.views.user import user_dashboard

logger = logging.getLogger(__name__)

def display_dashboard(user_id, user_email, user_name, user_role, conn):
    logger.info(f"Displaying dashboard for {user_email} with role {user_role}")
    if user_role == "user":
        user_dashboard(user_id, user_name, conn)
    elif user_role == "admin":
        admin_dashboard(user_id, user_email, conn)
    else:
        st.error("Invalid user role")
