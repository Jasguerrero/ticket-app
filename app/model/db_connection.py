import os
import psycopg2


def get_db_connection():
    DB_NAME = os.getenv("POSTGRES_DB")
    DB_USER = os.getenv("POSTGRES_USER")
    DB_PASSWORD = os.getenv("POSTGRES_USER")
    DB_HOST = "localhost"  # Use "db" if connecting from another Docker container
    DB_PORT = "5432"
    return psycopg2.connect(
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
        host=DB_HOST,
        port=DB_PORT
    )
