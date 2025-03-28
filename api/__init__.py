from flask import Flask
from flask_cors import CORS
import logging

# Configure logger
logger = logging.getLogger(__name__)

def create_app():
    """Initialize the Flask application."""
    app = Flask(__name__)
    CORS(app)
    
    # Register blueprints
    from api.routes.tickets import tickets_bp
    from api.routes.users import users_bp
    from api.routes.comments import comments_bp
    from api.routes.groups import groups_bp
    from api.routes.announcements import announcements_bp
    from api.routes.notifications import notifications_bp
    
    app.register_blueprint(tickets_bp)
    app.register_blueprint(users_bp)
    app.register_blueprint(comments_bp)
    app.register_blueprint(groups_bp)
    app.register_blueprint(announcements_bp)
    app.register_blueprint(notifications_bp)
    
    return app
