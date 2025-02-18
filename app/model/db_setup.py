from app.model.db_connection import get_db_connection

def create_tables():
    conn = get_db_connection()
    cur = conn.cursor()
    
    create_users_table = """
    CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        user_role TEXT NOT NULL,  -- New 'user_role' column
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """
    cur.execute(create_users_table)

    # Create tickets table
    create_tickets_table = """
    CREATE TABLE IF NOT EXISTS tickets (
        id CHAR(5) PRIMARY KEY,  -- Manually generated 5-character ID
        category TEXT NOT NULL,
        sub_category TEXT,
        description TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        closed_at TIMESTAMP,
        user_id INTEGER NOT NULL REFERENCES users(id),  -- No CASCADE
        assign_id INTEGER REFERENCES users(id),  -- This is nullable
        status TEXT DEFAULT 'open'  -- Default status is 'open'
    );
    """
    cur.execute(create_tickets_table)
    
    conn.commit()
    cur.close()
    conn.close()
