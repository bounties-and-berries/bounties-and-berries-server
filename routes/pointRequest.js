const express = require('express');
const router = express.Router();
const { authenticateToken, authorize } = require('../middleware/authMiddleware');
const pointRequestController = require('../controllers/pointRequestController');

const getUpload = require('../middleware/uploadCategory');

// Available reviewers endpoint (for dropdown in create form)
router.get('/reviewers', authenticateToken, authorize('submitPointRequest'), pointRequestController.getAvailableReviewers);

// Student endpoints

// Get student's own requests
router.get('/my-requests', authenticateToken, authorize('viewOwnPointRequests'), pointRequestController.getMyRequests);

// Get all requests assigned to faculty for review
router.get('/assigned', authenticateToken, authorize('reviewPointRequests'), pointRequestController.getAssignedRequests);

// Create new point request with evidence file (multipart form data)
router.post('/with-evidence', 
  authenticateToken, 
  authorize('submitPointRequest'), 
  getUpload('point_request_evidence').single('evidence'), 
  pointRequestController.createRequestWithEvidence
);

// Upload evidence file
router.post('/:id/upload-evidence', 
  authenticateToken, 
  authorize('uploadEvidence'), 
  getUpload('point_request_evidence').single('evidence'), 
  pointRequestController.uploadEvidence
);

// Download evidence file
router.get('/:id/evidence', authenticateToken, authorize('viewEvidence'), pointRequestController.downloadEvidence);

// Faculty endpoints

// Unified review endpoint (approve or deny)
router.post('/:id/review', authenticateToken, authorize('reviewPointRequests'), pointRequestController.reviewRequest);

// Legacy approve request (kept for backward compatibility)
router.post('/:id/approve', authenticateToken, authorize('approvePointRequest'), pointRequestController.approveRequest);

// Legacy deny request (kept for backward compatibility)
router.post('/:id/deny', authenticateToken, authorize('denyPointRequest'), pointRequestController.denyRequest);

// CRUD operations for specific request (must be last to avoid conflicts)

// Get specific request details
router.get('/:id', authenticateToken, authorize('viewOwnPointRequests'), pointRequestController.getRequestById);

// Full update request (only if draft or pending) - Now handles both text and file updates
router.put('/:id', 
  authenticateToken, 
  authorize('editOwnPointRequest'), 
  getUpload('point_request_evidence').single('evidence'),
  pointRequestController.updateRequest
);

// Partial update request (only if draft or pending)
router.patch('/:id', authenticateToken, authorize('editOwnPointRequest'), pointRequestController.patchRequest);

// Student DELETE endpoint for removing their own point requests
router.delete('/:id', authenticateToken, authorize('deleteOwnPointRequest'), pointRequestController.deleteOwnRequest);

module.exports = router;
