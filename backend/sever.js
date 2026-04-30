// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// Initialize the Express app
const app = express();

// Middleware
app.use(cors()); // Allows your React app to connect
app.use(express.json()); // Allows your backend to understand JSON data from the frontend

// Database Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Successfully Connected!'))
  .catch((err) => console.error('❌ MongoDB Connection Error:', err));

// A simple test route
app.get('/', (req, res) => {
  res.send('Welcome to the Medilink API!');
});

// Define the port (defaults to 5000 if not found in .env)
const PORT = process.env.PORT || 5000;

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});