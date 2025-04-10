const amqp = require('amqplib');

/**
 * Starts a RabbitMQ consumer that processes WhatsApp notification messages
 * @param {Object} sock - The WhatsApp socket connection
 * @returns {Promise<Object>} - Returns the RabbitMQ connection and channel
 */
const startNotificationConsumer = async (sock) => {
  try {
    console.log('Starting RabbitMQ notification consumer...');
    
    // RabbitMQ connection parameters
    const rabbitMQUrl = `amqp://${process.env.RABBITMQ_USER}:${process.env.RABBITMQ_PASSWORD}@${process.env.RABBITMQ_HOST}:5672`;
    
    // Connect to RabbitMQ
    const connection = await amqp.connect(rabbitMQUrl);
    const channel = await connection.createChannel();
    
    // Make sure the queue exists
    await channel.assertQueue('notification_queue', { durable: true });
    
    console.log('Connected to RabbitMQ, waiting for notification messages...');
    
    // Set prefetch to 1 to ensure we process one message at a time
    channel.prefetch(1);
    
    // Consume messages
    channel.consume('notification_queue', async (msg) => {
      if (msg !== null) {
        try {
          const notification = JSON.parse(msg.content.toString());
          console.log('Received notification message:', notification);
          
          // Process the notification
          const phoneNumber = notification.extra_info && notification.extra_info.phone 
                           ? notification.extra_info.phone 
                           : null;
          if (phoneNumber && notification.message) {
            // Similar to your notificationsTask implementation
            const jid = `${phoneNumber}@s.whatsapp.net`;
            
            try {
              // Check if the number exists on WhatsApp
              const [result] = await sock.onWhatsApp(jid);
              
              if (result && result.exists) {
                // Send message using the exact JID returned by onWhatsApp
                const message = await sock.sendMessage(result.jid, { 
                  text: notification.message
                });
                
                console.log('Message sent with ID:', message.key.id);
                console.log('To JID:', message.key.remoteJid);
                console.log(`Successfully delivered notification ${notification.id} to ${phoneNumber}`);
                
                // Acknowledge the message as successfully processed
                channel.ack(msg);
              } else {
                console.log(`Phone number not in WhatsApp: ${jid}`);
                // Acknowledge but log undeliverable
                channel.ack(msg);
                // Could implement a dead letter queue for undeliverable messages
              }
            } catch (whatsappError) {
              console.error(`Error sending WhatsApp message to ${jid}:`, whatsappError);
              // Requeue if it's a temporary error
              channel.reject(msg, true);
            }
          } else {
            console.error('Invalid message format, missing phone or message:', notification);
            // Don't requeue invalid messages
            channel.ack(msg);
          }
        } catch (processingError) {
            console.error('Error processing notification message:', processingError);
            // Requeue the message on processing error
            channel.reject(msg, true);
        }
      }
    }, { noAck: false }); // Explicit acknowledgment mode
    
    // Handle connection close events
    connection.on('close', async () => {
      console.log('RabbitMQ connection closed, attempting to reconnect...');
      // Wait before attempting to reconnect
      await new Promise(resolve => setTimeout(resolve, 5000));
      return startNotificationConsumer(sock);
    });
    
    // Handle errors
    connection.on('error', (err) => {
      console.error('RabbitMQ connection error:', err);
    });
    
    return { connection, channel };
  } catch (error) {
    console.error('Failed to start notification consumer:', error);
    // Wait before retry
    await new Promise(resolve => setTimeout(resolve, 5000));
    return startNotificationConsumer(sock);
  }
};

module.exports = { startNotificationConsumer };
