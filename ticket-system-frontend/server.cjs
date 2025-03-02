require('dotenv').config();
const express = require('express');
const path = require('path');
const app = express();

// Log all environment variables for debugging
console.log('Environment Variables:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('API_URL:', process.env.API_URL);

// Serve static files from the React build directory
app.use(express.static(path.join(__dirname, 'dist')));

// Add an endpoint to expose necessary environment variables to the frontend
app.get('/api/config', (req, res) => {
  console.log('Config endpoint called, sending API_URL:', process.env.API_URL);
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
  console.log(`API URL set to: ${process.env.API_URL || 'http://localhost:5001'}`);
});
