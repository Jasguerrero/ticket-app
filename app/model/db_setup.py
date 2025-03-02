from app.model.db_connection import get_db_connection

def create_tables():
    conn = get_db_connection()
    cur = conn.cursor()
    
    create_users_table = """
    CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        user_name TEXT,
        user_role TEXT NOT NULL,
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

    create_comments_table = """
    CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        ticket_id CHAR(5) NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id),
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """

    """
    -- Create groups table
    CREATE TABLE IF NOT EXISTS groups (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        teacher_id INTEGER NOT NULL REFERENCES users(id)
    );

    -- Create user_groups junction table (for many-to-many relationship)
    CREATE TABLE IF NOT EXISTS user_groups (
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, group_id)
    );

    -- Create announcements table
    CREATE TABLE IF NOT EXISTS announcements (
        id SERIAL PRIMARY KEY,
        group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
        teacher_id INTEGER NOT NULL REFERENCES users(id),
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        is_pinned BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Create announcement_reads table to track which users have read which announcements
    CREATE TABLE IF NOT EXISTS announcement_reads (
        announcement_id INTEGER REFERENCES announcements(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (announcement_id, user_id)
    );
    """
    
    conn.commit()
    cur.close()
    conn.close()
