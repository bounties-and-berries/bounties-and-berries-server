const jwt = require('jsonwebtoken');
const { ApiError } = require('./errorHandler');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

// Middleware to authenticate JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return next(new ApiError('No token provided', 401));
  }
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return next(new ApiError('Invalid or expired token', 403));
    }
    req.user = user;
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
    'viewAllBounties', 'createBounty', 'updateBounty', 'deleteBounty',
    'viewAllRewards', 'createReward', 'updateReward', 'deleteReward',
    'viewAllPointRequests', 'viewAllAchievements', 'manageAchievements'
  ],
  faculty: [
    'viewOwnProfile', 'updateOwnProfile',
    'viewAllBounties', 'createBounty', 'updateBounty',
    'viewAllRewards', 'createReward', 'updateReward',
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