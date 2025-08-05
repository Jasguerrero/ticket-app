const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');

// Simple bot startup just for QR code generation
const startBot = async () => {
  console.log('Starting simple WhatsApp bot for QR code...');

  try {
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
    const sock = makeWASocket({ 
      auth: state, 
      printQRInTerminal: true 
    });

    // Listen for connection updates
    sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        console.log('\n=== SCAN THIS QR CODE WITH YOUR WHATSAPP ===');
        qrcode.generate(qr, { small: true });
        console.log('============================================\n');
      }

      if (connection === 'close') {
        const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== 401;
        console.log('Connection closed. Reconnecting...', shouldReconnect);

        if (shouldReconnect) {
          setTimeout(startBot, 3000); // Retry after 3 seconds
        } else {
          console.error('Authentication error. Please delete auth_info folder and try again.');
          process.exit(1);
        }
      }

      if (connection === 'open') {
        console.log('✅ Connected successfully!');
        console.log('🎉 WhatsApp bot is now authenticated and ready!');
        console.log('You can now stop this (Ctrl+C) and run your Docker container.');
      }
    });

    // Save credentials
    sock.ev.on('creds.update', saveCreds);

    // Simple message handler (optional)
    sock.ev.on('messages.upsert', async (m) => {
      const message = m.messages[0];
      if (!message.message || message.key.fromMe) return;
      
      const textMessage = message.message.conversation || message.message.extendedTextMessage?.text;
      if (textMessage) {
        console.log(`Received message: ${textMessage}`);
      }
    });

  } catch (error) {
    console.error('Failed to start bot:', error);
    setTimeout(startBot, 5000); // Retry after 5 seconds
  }
};

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n👋 Bot stopped. Authentication should be saved in auth_info folder.');
  process.exit(0);
});

// Start the bot
startBot();