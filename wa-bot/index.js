require('dotenv').config({ path: './wa-bot/.env' });
const { MongoClient } = require('mongodb');
const { default: makeWASocket, useMultiFileAuthState, makeInMemoryStore } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const { handleTibiaResponse } = require('./tibia/responses');
const { sendPeriodicMessage } = require('./utils/util');
const { startNotificationConsumer } = require('./utils/consumer');
const redis = require('redis');

// Kike bot responses
const kike_responses = [
  "Yo me voy a dormir tranquilo, pq yo se que jugué mejor aunque perdí",
  "No es de ahuevo ganar, lo importante es divertirse",
  "Ni pedo, a levantar la cabeza, fue un partido difícil, y a pensar en el juego del fin de semana",
  "La bronca de ten hag es que sus títulos menores enmascararon los resultados malos",
  "Ya me llego el anillo de Pinedo",
  "No importa lo que yo opine, porque la hubieran usado o no, yo no me bajo del barco de amorin",
  "Valen verga esos cabrones",
  "Seguimos adelante"
];

const MAX_RETRIES = 5; // Maximum number of retries
let retryCount = 0;
const environment = process.env.ENVIRONMENT;
const tibiaGroupIDs = process.env.TIBIA_GROUPS;
const tibiaGroupSet = new Set(tibiaGroupIDs.split(','));

// Redis configuration
const redisClient = redis.createClient({
  url: `redis://:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`
});

// Connect to Redis
(async () => {
  redisClient.on('error', (err) => console.log('Redis Client Error', err));
  await redisClient.connect();
  console.log('Connected to Redis successfully');
})();

const mongoUri = `mongodb://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@${process.env.MONGO_HOST}:${process.env.MONGO_PORT}`;
let mongoClient = null;

const connectToMongo = async () => {
  try {
    mongoClient = new MongoClient(mongoUri);
    await mongoClient.connect();
    console.log('Connected to MongoDB successfully');
    return mongoClient;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    // Try to continue even if MongoDB fails - critical path should work
    return null;
  }
};

// Store references to intervals so we can clear them on reconnection
let periodicMessageInterval = null;
let rabbitMQConsumer = null;

// Function to clear existing intervals
const clearIntervals = async () => {
  if (periodicMessageInterval) {
    clearInterval(periodicMessageInterval);
    periodicMessageInterval = null;
  }

  if (rabbitMQConsumer) {
    try {
      if (rabbitMQConsumer.channel) {
        await rabbitMQConsumer.channel.close();
      }
      if (rabbitMQConsumer.connection) {
        await rabbitMQConsumer.connection.close();
      }
    } catch (err) {
      console.error('Error closing RabbitMQ connections:', err);
    }
    rabbitMQConsumer = null;
  }
};

// Function to set up the scheduled tasks
const setupScheduledTasks = async (sock) => {
  // Clear any existing intervals first
  await clearIntervals();
  
  // Set up new intervals
  periodicMessageInterval = setInterval(
    () => sendPeriodicMessage(sock, tibiaGroupSet, redisClient), 
    5 * 30 * 1000
  ); // Every 5 minutes

  // Start the RabbitMQ consumer
  console.log('Initializing RabbitMQ notification consumer...');
  rabbitMQConsumer = await startNotificationConsumer(sock, mongoClient);
  
  console.log('Scheduled tasks initialized');
};

// Function to initialize the bot
const startBot = async () => {
  console.log('Initializing WhatsApp bot...');

  try {
    await connectToMongo();
    const { state, saveCreds } = await useMultiFileAuthState('./wa-bot/auth_info');
    const store = makeInMemoryStore({});
    const sock = makeWASocket({ auth: state, printQRInTerminal: true });

    store.bind(sock.ev);

    // Listen for QR code
    sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        console.log('Scan the QR code to authenticate');
        qrcode.generate(qr, { small: true });
      }

      if (connection === 'close') {
        // Clear intervals when connection closes
        clearIntervals();
        
        const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== 401;
        console.log('Connection closed. Reconnecting...', shouldReconnect);

        if (shouldReconnect) {
          if (retryCount < MAX_RETRIES) {
            retryCount++;
            console.log(`Retry attempt ${retryCount} of ${MAX_RETRIES}`);
            startBot();
          } else {
            console.error('Max retries reached. Exiting...');
            process.exit(1);
          }
        } else {
          console.error('Authentication error. Please re-scan the QR code.');
          process.exit(1);
        }
      }

      if (connection === 'open') {
        console.log('Connected successfully!');
        require('log-timestamp');
        retryCount = 0; // Reset retry count on successful connection
        
        // Set up the scheduled tasks after successful connection
        setupScheduledTasks(sock).catch(err => {
          console.error('Error setting up scheduled tasks:', err);
        });
      }
    });

    sock.ev.on('creds.update', saveCreds);

    // Listen to messages
    sock.ev.on('messages.upsert', async (m) => {
      const message = m.messages[0];
      if (!message.message || (message.key.fromMe && environment === "prod")) return;

      const from = message.key.remoteJid; // Sender ID or group ID
      const textMessage = message.message.conversation || message.message.extendedTextMessage?.text;
      if (textMessage == null) {
        return;
      }
      const msg = textMessage.toLowerCase();
      console.log(`[${from}] ${textMessage}`);

      if (from.includes("1625327984@g.us")) {
        if (msg.includes('kike bot') || msg.includes('kikebot') || msg.includes("5663596435")) {
          const randomResponse = kike_responses[Math.floor(Math.random() * kike_responses.length)];
          await sock.sendMessage(from, { text: randomResponse });
        } else if (msg === '!commands') {
          await sock.sendMessage(from, { text: `Estos son los comandos que puedes usar:\n- kikebot\n- kike bot` });
        } else if (msg.includes('napo')) {
          await sock.sendMessage(from, { text: `Napo es un pendejo` });
        }
      }
      else if(tibiaGroupSet.has(from)) {
        const [r, imagePath] = await handleTibiaResponse(msg, from, sock, message);
        if (r == '') {
            return;
        }
        let payload = null
        if (imagePath != ''){
          payload = {
            image: {url: imagePath},
            caption: r
          }
        } else {
          payload = {
            text: r
          }
        }
        await sock.sendMessage(from, payload);
      }
    });

  } catch (error) {
    console.error('Failed to start the bot:', error);
    
    // Clear intervals on error
    clearIntervals();

    if (retryCount < MAX_RETRIES) {
      retryCount++;
      console.log(`Retry attempt ${retryCount} of ${MAX_RETRIES}`);
      startBot();
    } else {
      console.error('Max retries reached. Exiting...');
      process.exit(1);
    }
  }
};

// Handle process termination
process.on('SIGINT', async () => {
  await clearIntervals();
  console.log('Bot shutting down...');
  if (redisClient.isOpen) {
    await redisClient.quit();
    console.log('Redis connection closed');
  }
  if (mongoClient) {
    await mongoClient.close();
    console.log('MongoDB connection closed');
  }
  process.exit(0);
});

// Start the bot
startBot();
