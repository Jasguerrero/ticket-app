import pika
import json
import logging
import uuid
from datetime import datetime
import os

logger = logging.getLogger(__name__)

class RabbitMQ:
    def __init__(self, app=None):
        self.connection = None
        self.channel = None
        self.connected = False
        
        if app is not None:
            self.init_app(app)
            
    def init_app(self, app):
        """Initialize the extension with the Flask app"""
        # Get connection parameters from app config
        app.config.setdefault('RABBITMQ_HOST', os.environ.get('RABBITMQ_HOST'))
        app.config.setdefault('RABBITMQ_USER', os.environ.get('RABBITMQ_USER'))
        app.config.setdefault('RABBITMQ_PASSWORD', os.environ.get('RABBITMQ_PASSWORD'))
        
        # Connect to RabbitMQ when the app starts
        with app.app_context():
            self.connect(app)
        
        # Register teardown function to close connection when app context ends
        app.teardown_appcontext(self.teardown)
        
    def connect(self, app):
        """Connect to RabbitMQ server"""
        if self.connected:
            return
            
        try:
            # Get connection parameters from app config
            rabbitmq_host = app.config['RABBITMQ_HOST']
            rabbitmq_user = app.config['RABBITMQ_USER']
            rabbitmq_password = app.config['RABBITMQ_PASSWORD']
            
            # Create connection parameters
            credentials = pika.PlainCredentials(rabbitmq_user, rabbitmq_password)
            parameters = pika.ConnectionParameters(
                host=rabbitmq_host,
                credentials=credentials,
                heartbeat=600,
                blocked_connection_timeout=300
            )
            
            # Connect to RabbitMQ
            self.connection = pika.BlockingConnection(parameters)
            self.channel = self.connection.channel()
            
            # Enable publisher confirms
            self.channel.confirm_delivery()
            
            # Declare the exchange (even though defined in rabbit-definitions.json, it's good practice)
            self.channel.exchange_declare(
                exchange='notifications',
                exchange_type='direct',
                durable=True
            )
            
            self.connected = True
            logger.info("Successfully connected to RabbitMQ")
            
        except Exception as e:
            logger.error(f"Error connecting to RabbitMQ: {str(e)}")
            self.connected = False
            
    def teardown(self, exception):
        """Close connection when the app context ends"""
        self.close()
            
    def close(self):
        """Close the connection to RabbitMQ"""
        if self.connection and self.connection.is_open:
            self.connection.close()
            self.connected = False
            
    def publish_notification(self, user_id, message, notification_type, extra_info):
        """Publish a notification message to RabbitMQ"""
        from flask import current_app
        
        if not self.connected:
            self.connect(current_app)
            
        if not self.connected:
            logger.error("Failed to connect to RabbitMQ, cannot publish notification")
            return False
            
        try:
            # Generate a unique message ID for idempotency
            message_id = str(uuid.uuid4())
            
            # Create the notification payload
            notification_payload = {
                'id': message_id,
                'message': message,
                'user_id': user_id,
                'type': notification_type,
                'extra_info': extra_info,
                'created_at': datetime.now().isoformat()
            }
            
            # Convert dict to JSON string
            message_body = json.dumps(notification_payload)
            
            # Publish the message
            self.channel.basic_publish(
                exchange='notifications',
                routing_key='user.notification',
                body=message_body,
                properties=pika.BasicProperties(
                    delivery_mode=2,  # make message persistent
                    content_type='application/json',
                    message_id=message_id
                ),
                mandatory=True
            )
            
            logger.info(f"Published notification for user {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error publishing notification: {str(e)}")
            # Try to reconnect for next message
            self.connected = False
            return False

# Create the extension instance
rabbitmq = RabbitMQ()
