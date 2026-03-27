/**
 * Global error handling middleware
 * Sanitizes error messages in production to avoid leaking internal details.
 */

// Known business error codes that are safe to return to clients
const SAFE_ERROR_CODES = new Set([
  'USER_NOT_FOUND', 'COLLEGE_NOT_FOUND', 'BOUNTY_NOT_FOUND', 'REWARD_NOT_FOUND',
  'CLAIM_NOT_FOUND', 'REQUEST_NOT_FOUND', 'PARTICIPATION_NOT_FOUND',
  'INVALID_CREDENTIALS', 'INVALID_ROLE', 'INACTIVE_USER',
  'DUPLICATE_PARTICIPATION', 'DUPLICATE_NAME', 'DUPLICATE_USERNAME',
  'INSUFFICIENT_BERRIES', 'REWARD_EXPIRED', 'REWARD_ALREADY_CLAIMED',
  'NAME_REQUIRED', 'INVALID_BERRIES_AMOUNT', 'INVALID_AMOUNT',
  'INVALID_POINTS_AWARDED', 'INVALID_BERRIES_AWARDED',
  'ONLY_PENDING_REQUESTS_CAN_BE_APPROVED', 'ONLY_PENDING_REQUESTS_CAN_BE_DENIED',
  'UNAUTHORIZED_FACULTY_ACCESS', 'DENIAL_REASON_REQUIRED',
  'USER_ID_REWARD_ID_AND_BERRIES_SPENT_REQUIRED',
  'INVALID_BERRIES_SPENT', 'CONCURRENT_MODIFICATION',
  'BOUNTY_FULL', 'ALREADY_REGISTERED', 'INVALID_STATUS',
  'PASSWORD_TOO_SHORT', 'PASSWORDS_DO_NOT_MATCH',
]);

function extractBusinessError(message) {
  if (!message) return null;
  // Check if the raw message itself is a known error code
  if (SAFE_ERROR_CODES.has(message)) return message;
  // Check if a known error code appears within a wrapped message
  for (const code of SAFE_ERROR_CODES) {
    if (message.includes(code)) return code;
  }
  return null;
}

const errorHandler = (err, req, res, next) => {
  // Always log the full error for debugging
  console.error('Error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  const statusCode = err.statusCode || 500;
  
  // In production, sanitize the error message
  let clientMessage;
  if (process.env.NODE_ENV === 'production') {
    const businessError = extractBusinessError(err.message);
    clientMessage = businessError || 'An internal server error occurred';
  } else {
    clientMessage = err.message || 'Internal Server Error';
  }

  const errorResponse = {
    error: {
      message: clientMessage,
      status: statusCode,
      timestamp: new Date().toISOString(),
      path: req.url,
      method: req.method
    }
  };

  // Add stack trace in development only
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error.stack = err.stack;
  }

  res.status(statusCode).json(errorResponse);
};

/**
 * Custom error class for API errors
 */
class ApiError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'ApiError';
  }
}

/**
 * Async error wrapper to catch async errors
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  errorHandler,
  ApiError,
  asyncHandler
};