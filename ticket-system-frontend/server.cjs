require('dotenv').config();
const express = require('express');
const path = require('path');
const app = express();

// Serve static files from the React build directory
app.use(express.static(path.join(__dirname, 'dist')));

// Add an endpoint to expose necessary environment variables to the frontend
app.get('/api/config', (req, res) => {
  // Only expose what the frontend needs
  res.json({
    apiUrl: process.env.API_URL || 'http://localhost:5001'
  });
});

// Handle requests that don't match static files
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Frontend server running on port ${PORT}`);
});
