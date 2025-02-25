import os
import psycopg2


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
