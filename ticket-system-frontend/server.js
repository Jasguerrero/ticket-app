const express = require('express');
const path = require('path');
const app = express();

// Serve static files from the React build directory
// Change 'dist' to 'build' if you're using Create React App
app.use(express.static(path.join(__dirname, 'dist')));

// Handle requests that don't match static files
// by serving index.html (for client-side routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Set port and start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Frontend server running on port ${PORT}`);
});
