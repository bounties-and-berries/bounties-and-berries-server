const jwt = require('jsonwebtoken');
const { ApiError } = require('./errorHandler');
const tokenBlacklist = require('../utils/tokenBlacklist');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

// Fail fast in production if JWT_SECRET is still the default
if (process.env.NODE_ENV === 'production' && JWT_SECRET === 'supersecretkey') {
  console.error('❌ FATAL: JWT_SECRET must be changed from the default value in production');
  console.error('   Generate one with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
  process.exit(1);
}

// Middleware to authenticate JWT token
async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return next(new ApiError('No token provided', 401));
  }
  
  // Check if token has been blacklisted (user logged out)
  const isBlacklisted = await tokenBlacklist.isBlacklisted(token);
  if (isBlacklisted) {
    return next(new ApiError('Token has been revoked', 401));
  }
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return next(new ApiError('Invalid or expired token', 401));
    }
    req.user = user;
    req.token = token; // Store token for logout use
    next();
  });
}

// Middleware to authorize based on user role(s)
function authorizeRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ApiError('Forbidden: insufficient role', 403));
    }
    next();
  };
}

// Role-based permissions config
const permissions = {
  admin: [
    'viewAllUsers', 'createUser', 'updateUser', 'deleteUser',
    'viewAllColleges', 'createCollege', 'updateCollege', 'deleteCollege',
    'viewAllRoles', 'createRole', 'updateRole', 'deleteRole',
    'viewBounties', 'viewAllBounties', 'createBounty', 'updateBounty', 'editBounty', 'deleteBounty',
    'viewRewards', 'viewAllRewards', 'createReward', 'updateReward', 'deleteReward',
    'viewAllPointRequests', 'viewAllAchievements', 'manageAchievements'
  ],
  faculty: [
    'viewOwnProfile', 'updateOwnProfile',
    'viewBounties', 'viewAllBounties', 'createBounty', 'updateBounty', 'editBounty', 'deleteBounty',
    'viewRewards', 'viewAllRewards', 'createReward', 'updateReward', 'deleteReward',
    'reviewPointRequests', 'approvePointRequest', 'denyPointRequest',
    'viewOwnAchievements'
  ],
  student: [
    'viewOwnProfile', 'updateOwnProfile',
    'viewBounties', 'participateInBounty', 'viewOwnParticipation',
    'viewRewards', 'claimReward', 'viewOwnClaims',
    'submitPointRequest', 'viewOwnPointRequests', 'editOwnPointRequest',
    'uploadEvidence', 'viewEvidence', 'deleteOwnPointRequest',
    'viewOwnAchievements'
  ],
  creator: [
    'viewAllColleges', 'createCollege', 'updateCollege', 'deleteCollege',
    'viewAllRoles', 'createRole', 'updateRole', 'deleteRole',
    'viewAllRewards', 'createReward', 'updateReward', 'deleteReward',
    'viewAllBounties', 'createBounty', 'updateBounty', 'deleteBounty'
  ]
};

// Middleware to authorize based on permission
function authorize(permission) {
  return (req, res, next) => {
    const userRole = req.user && req.user.role;
    if (!userRole || !permissions[userRole] || !permissions[userRole].includes(permission)) {
      return next(new ApiError('Forbidden: insufficient permission', 403));
    }
    next();
  };
}

module.exports = {
  authenticateToken,
  authorizeRoles,
  authorize,
};