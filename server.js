const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

// Import routes
const statusRoutes = require('./routes/status');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');

// Import middleware
const { errorHandler } = require('./middleware/errorHandler');
const { authenticateToken, authorizeRoles } = require('./middleware/authMiddleware');

// Import config
const config = require('./config/config');

const app = express();
const PORT = config.port || 443;

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS
app.use(morgan('combined')); // Logging
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Routes
app.use('/api/status', statusRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Bounties and Berries Server',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      status: '/api/status'
    }
  });
});

// Example protected route (only accessible by admin)
app.get('/api/protected/admin', authenticateToken, authorizeRoles('admin'), (req, res) => {
  res.json({ message: `Hello ${req.user.username}, you have admin access!` });
});

// Example protected route (accessible by user or admin)
app.get('/api/protected/user', authenticateToken, authorizeRoles('user', 'admin'), (req, res) => {
  res.json({ message: `Hello ${req.user.username}, you have user or admin access!` });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📈 Status API: http://localhost:${PORT}/api/status`);
  console.log(`🌐 Root endpoint: http://localhost:${PORT}/`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

module.exports = app; 