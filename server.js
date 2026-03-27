const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');

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
const pointRequestRoutes = require('./routes/pointRequest');
const achievementRoutes = require('./routes/achievement');
const adminRoutes = require('./routes/admin');
const berryRulesRoutes = require('./routes/berryRules');
const berryPurchasesRoutes = require('./routes/berryPurchases');
const frontendAliasRoutes = require('./routes/frontendAliases');
const queryRoutes = require('./routes/query');
const notificationRoutes = require('./routes/notifications');
const searchRoutes = require('./routes/search');

// Import middleware
const { errorHandler } = require('./middleware/errorHandler');
const { authenticateToken, authorizeRoles } = require('./middleware/authMiddleware');

// Import config
const config = require('./config/config');
const pool = require('./config/db');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false, // Required for images to load on Web from different origin
})); // Security headers with cross-origin policy allowed for images

// Enhanced CORS configuration for frontend compatibility
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [process.env.FRONTEND_URL || 'https://your-production-url.com']
  : [
    'http://localhost:8081',
    'http://127.0.0.1:8081',
    'http://localhost:3000',
    'http://localhost:3001'
  ];

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1 && process.env.NODE_ENV === 'production') {
      var msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Accept',
    'Origin',
    'X-Requested-With'
  ],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 200
}));

// Apply Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX || '100'), // Configurable, default 100 req per 15 min
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: 'Too many requests from this IP, please try again after 15 minutes'
});

// Apply rate limiter to all requests
app.use(limiter);

// Handle preflight requests explicitly
app.options('*', cors());

// Request correlation ID for tracing
const crypto = require('crypto');
app.use((req, res, next) => {
  const requestId = req.headers['x-request-id'] || crypto.randomUUID();
  req.requestId = requestId;
  res.set('X-Request-Id', requestId);
  next();
});

app.use(morgan('combined')); // Logging
app.use(express.json({ limit: '10mb' })); // Parse JSON bodies with size limit
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Parse URL-encoded bodies

// Ensure uploads directories exist using absolute paths
const uploadsRoot = path.join(__dirname, 'uploads');
const userImgsDir = path.join(uploadsRoot, 'user_imgs');
const imagesDir = path.join(uploadsRoot, 'images');
const pointRequestUploadDir = path.join(uploadsRoot, 'point_request_evidence');

[uploadsRoot, userImgsDir, imagesDir, pointRequestUploadDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Serve uploads directory statically — use the configured CORS origin, not wildcard
const allowedOrigin = process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:8081';
app.use('/uploads', express.static(uploadsRoot, {
  setHeaders: (res) => {
    res.set('Access-Control-Allow-Origin', allowedOrigin);
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
  }
}));

// Routes
// Frontend compatibility aliases (must be first to intercept)
app.use('/api', frontendAliasRoutes);
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
app.use('/api/point-requests', pointRequestRoutes);
app.use('/api/achievements', achievementRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/berry-rules', berryRulesRoutes);
app.use('/api/berry-purchases', berryPurchasesRoutes);
app.use('/api/queries', queryRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/search', searchRoutes);

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

// Graceful shutdown — close DB pool before exiting
const gracefulShutdown = async (signal) => {
  console.log(`${signal} received, shutting down gracefully...`);
  try {
    await pool.end();
    // Also close Knex pool if it exists
    try { const knex = require('./config/knex'); await knex.destroy(); } catch(e) { /* Knex may not be loaded */ }
    console.log('✅ Database pools closed');
  } catch (err) {
    console.error('❌ Error closing database pool:', err);
  }
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Catch unhandled errors to prevent silent crashes
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  gracefulShutdown('uncaughtException');
});

module.exports = app;
