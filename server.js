const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

// Import routes
const statusRoutes = require('./routes/status');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const bountyRoutes = require('./routes/bounty');
const rewardRoutes = require('./routes/reward');
const bountyParticipationRoutes = require('./routes/bountyParticipation');
const userRewardClaimRoutes = require('./routes/userRewardClaim');
const imageRouter = require('./routes/image');
const collegeRoutes = require('./routes/college');
const roleRoutes = require('./routes/role');

// Import middleware
const { errorHandler } = require('./middleware/errorHandler');
const { authenticateToken, authorizeRoles } = require('./middleware/authMiddleware');

// Import config
const config = require('./config/config');
const pool = require('./config/db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet()); // Security headers
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
})); // Enable permissive CORS for dev
app.use(morgan('combined')); // Logging
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Ensure uploads/images directory exists
const uploadDir = path.join(__dirname, 'uploads', 'images');
fs.mkdirSync(uploadDir, { recursive: true });
// Serve uploads directory statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/status', statusRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/bounties', bountyRoutes);
app.use('/api/reward', rewardRoutes);
app.use('/api/bounty-participation', bountyParticipationRoutes);
app.use('/api/user-reward-claim', userRewardClaimRoutes);
app.use('/api/image', imageRouter);
app.use('/api/college', collegeRoutes);
app.use('/api/role', roleRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Database health check endpoint
app.get('/db-health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({ status: 'Database connected' });
  } catch (err) {
    res.status(500).json({ status: 'Database not connected', error: err.message });
  }
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
if (require.main === module) {
  // Only start the server if this file is run directly
    app.listen(PORT, '0.0.0.0', () => {
    const ip = require('ip');
    console.log(`🚀 Server is running on http://${ip.address()}:${PORT}`);
    console.log(`📊 Health check: http://${ip.address()}:${PORT}/health`);
    console.log(`📈 Status API: http://${ip.address()}:${PORT}/api/status`);
    console.log(`🌐 Root endpoint: http://${ip.address()}:${PORT}/`);
  });

}

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
