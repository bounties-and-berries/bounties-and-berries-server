const { getFileHash } = require('../fileHash');
const fs = require('fs');
const path = require('path');
const pointRequestService = require('../services/pointRequestService');

// Student endpoints



// Get student's own requests
exports.getMyRequests = async (req, res) => {
  try {
    const studentId = req.user.id;
    
    // Get all requests for the student
    const results = await pointRequestService.getMyRequests(studentId);
    
    res.json({
      total_requests: results.length,
      requests: results
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch requests', details: err.message });
  }
};

// Get specific request by ID
exports.getRequestById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    const request = await pointRequestService.getRequestById(id, userId, userRole);
    res.json(request);
  } catch (err) {
    if (err.message.includes('REQUEST_NOT_FOUND')) {
      res.status(404).json({ error: 'Request not found' });
    } else if (err.message.includes('UNAUTHORIZED')) {
      res.status(403).json({ error: 'Unauthorized access' });
    } else {
      res.status(500).json({ error: 'Failed to fetch request', details: err.message });
    }
  }
};

// Get all requests assigned to faculty for review
exports.getAssignedRequests = async (req, res) => {
  try {
    const facultyId = req.user.id;
    
    // Get all requests assigned to this faculty
    const results = await pointRequestService.getAssignedRequests(facultyId);
    
    res.json({
      total_assigned: results.length,
      requests: results
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch assigned requests', details: err.message });
  }
};

// Full update request (only if draft or pending) - Now handles both text and file updates
exports.updateRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const studentId = req.user.id;
    
    console.log('PUT Update - Raw request body:', req.body);
    console.log('PUT Update - File data:', req.file);
    console.log('PUT Update - Content-Type:', req.get('Content-Type'));
    
    // Handle form data parsing
    let updateData = {};
    
    // If it's multipart/form-data, parse the form fields
    if (req.get('Content-Type') && req.get('Content-Type').includes('multipart/form-data')) {
      // For multipart form data, req.body should contain the text fields
      updateData = { ...req.body };
      
      // Clean up the data - remove undefined/empty values
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined || updateData[key] === '') {
          delete updateData[key];
        }
      });
    } else {
      // For JSON requests
      updateData = req.body;
    }
    
    console.log('PUT Update - Parsed update data:', updateData);
    
    // Normalize category if it's being updated
    if (updateData.category) {
      updateData.category = updateData.category.trim().toLowerCase();
    }
    
    // Convert numeric fields if they exist
    if (updateData.points_requested) {
      updateData.points_requested = parseInt(updateData.points_requested);
    }
    if (updateData.berries_requested) {
      updateData.berries_requested = parseInt(updateData.berries_requested);
    }
    
    console.log('PUT Update - Processed data:', updateData);
    
    // Update the request with text data first
    let request = await pointRequestService.updateRequest(id, studentId, updateData);
    
    // If file is provided, update the proof file
    if (req.file) {
      console.log('PUT Update - Updating proof file:', req.file);
      
      const fileBuffer = fs.readFileSync(req.file.path);
      const fileHash = getFileHash(fileBuffer);
      
      const fileData = {
        file_path: `/uploads/point_request_evidence/${req.file.filename}`,
        file_hash: fileHash
      };
      
      request = await pointRequestService.updateProofFile(request.id, studentId, fileData);
    }
    
    console.log('PUT Update - Final response data:', request);
    
    res.json(request);
  } catch (err) {
    console.error('PUT Update Error:', err.message);
    if (err.message.includes('REQUEST_NOT_FOUND')) {
      res.status(404).json({ error: 'Request not found' });
    } else if (err.message.includes('UNAUTHORIZED_ACCESS')) {
      res.status(403).json({ error: 'Unauthorized access' });
    } else if (err.message.includes('REQUEST_CANNOT_BE_MODIFIED')) {
      res.status(400).json({ error: 'Request cannot be modified in current status' });
    } else if (err.message.includes('VALIDATION_FAILED')) {
      res.status(400).json({ error: 'Validation failed', details: err.message });
    } else {
      res.status(500).json({ error: 'Failed to update request', details: err.message });
    }
  }
};

// Submit request (draft -> pending)
exports.submitRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const studentId = req.user.id;
    
    const request = await pointRequestService.submitRequest(id, studentId);
    res.json(request);
  } catch (err) {
    if (err.message.includes('REQUEST_NOT_FOUND')) {
      res.status(404).json({ error: 'Request not found' });
    } else if (err.message.includes('UNAUTHORIZED_ACCESS')) {
      res.status(403).json({ error: 'Unauthorized access' });
    } else if (err.message.includes('ONLY_DRAFT_REQUESTS_CAN_BE_SUBMITTED')) {
      res.status(400).json({ error: 'Only draft requests can be submitted' });
    } else if (err.message.includes('CANNOT_SUBMIT_INVALID_REQUEST')) {
      res.status(400).json({ error: 'Cannot submit invalid request', details: err.message });
    } else {
      res.status(500).json({ error: 'Failed to submit request', details: err.message });
    }
  }
};

// Cancel request
exports.cancelRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const request = await pointRequestService.cancelRequest(id, userId);
    res.json(request);
  } catch (err) {
    if (err.message.includes('REQUEST_NOT_FOUND')) {
      res.status(404).json({ error: 'Request not found' });
    } else if (err.message.includes('UNAUTHORIZED_ACCESS')) {
      res.status(403).json({ error: 'Unauthorized access' });
    } else if (err.message.includes('CANNOT_CANCEL_PROCESSED_REQUEST')) {
      res.status(400).json({ error: 'Cannot cancel processed request' });
    } else {
      res.status(500).json({ error: 'Failed to cancel request', details: err.message });
    }
  }
};

// Create request with file upload in single call
exports.createRequestWithEvidence = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { submit_immediately = true, ...requestData } = req.body;
    
    // Convert string values to appropriate types for form-data
    if (requestData.points_requested) {
      requestData.points_requested = parseInt(requestData.points_requested);
    }
    if (requestData.berries_requested) {
      requestData.berries_requested = parseInt(requestData.berries_requested);
    }
    if (requestData.selected_faculty_id) {
      requestData.selected_faculty_id = parseInt(requestData.selected_faculty_id);
    }
    if (requestData.bounty_participation_id) {
      requestData.bounty_participation_id = parseInt(requestData.bounty_participation_id);
    }
    
    // Normalize category value
    if (requestData.category) {
      requestData.category = requestData.category.trim().toLowerCase();
    }
    
    // Create the request first
    let request = await pointRequestService.createRequest(studentId, requestData);
    
    // If file is provided, upload it
    if (req.file) {
      const fileBuffer = fs.readFileSync(req.file.path);
      const fileHash = getFileHash(fileBuffer);
      
      const fileData = {
        file_path: `/uploads/point_request_evidence/${req.file.filename}`,
        file_hash: fileHash
      };
      
      request = await pointRequestService.updateProofFile(request.id, studentId, fileData);
    }
    
    // Auto-submit if requested
    if (submit_immediately) {
      request = await pointRequestService.submitRequest(request.id, studentId);
    }
    
    res.status(201).json(request);
  } catch (err) {
    if (err.message.includes('VALIDATION_FAILED')) {
      res.status(400).json({ error: 'Validation failed', details: err.message });
    } else if (err.message.includes('MAXIMUM_PENDING_REQUESTS_EXCEEDED')) {
      res.status(400).json({ error: 'Maximum pending requests limit exceeded (5)' });
    } else if (err.message.includes('DUPLICATE_ACTIVITY_EXISTS')) {
      res.status(400).json({ error: 'Similar activity already submitted for this date' });
    } else if (err.message.includes('CANNOT_SUBMIT_INVALID_REQUEST')) {
      res.status(400).json({ error: 'Cannot submit invalid request', details: err.message });
    } else {
      res.status(500).json({ error: 'Failed to create request with evidence', details: err.message });
    }
  }
};

// Upload evidence file (for existing requests)
exports.uploadEvidence = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    // Generate file hash
    const fileBuffer = fs.readFileSync(req.file.path);
    const fileHash = getFileHash(fileBuffer);
    
    const fileData = {
      file_path: `/uploads/point_request_evidence/${req.file.filename}`,
      file_hash: fileHash
    };
    
    const request = await pointRequestService.updateProofFile(id, userId, fileData);
    res.json(request);
  } catch (err) {
    if (err.message.includes('REQUEST_NOT_FOUND')) {
      res.status(404).json({ error: 'Request not found' });
    } else if (err.message.includes('UNAUTHORIZED_ACCESS')) {
      res.status(403).json({ error: 'Unauthorized access' });
    } else if (err.message.includes('CANNOT_UPDATE_PROOF_FOR_PROCESSED_REQUEST')) {
      res.status(400).json({ error: 'Cannot update proof for processed request' });
    } else {
      res.status(500).json({ error: 'Failed to upload evidence', details: err.message });
    }
  }
};

// Faculty endpoints





// Unified review endpoint (approve or deny)
exports.reviewRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const facultyId = req.user.id;
    const { action, faculty_comment, points_awarded, berries_awarded, reason } = req.body;
    
    // Validate required action
    if (!action || !['approve', 'deny'].includes(action)) {
      return res.status(400).json({ 
        error: 'Invalid action. Must be either "approve" or "deny"' 
      });
    }
    
    let request;
    
    if (action === 'approve') {
      // Handle approval
      const approvalData = {
        faculty_comment,
        points_awarded,
        berries_awarded
      };
      
      request = await pointRequestService.approveRequest(id, facultyId, approvalData);
    } else {
      // Handle denial
      const denialData = {
        faculty_comment,
        reason
      };
      
      request = await pointRequestService.denyRequest(id, facultyId, denialData);
    }
    
    res.json({
      ...request,
      message: action === 'approve' ? 'Request approved successfully' : 'Request denied successfully'
    });
    
  } catch (err) {
    if (err.message.includes('REQUEST_NOT_FOUND')) {
      res.status(404).json({ error: 'Request not found' });
    } else if (err.message.includes('UNAUTHORIZED_FACULTY_ACCESS')) {
      res.status(403).json({ error: 'Unauthorized faculty access' });
    } else if (err.message.includes('ONLY_PENDING_REQUESTS_CAN_BE_APPROVED')) {
      res.status(400).json({ error: 'Only pending requests can be approved' });
    } else if (err.message.includes('ONLY_PENDING_REQUESTS_CAN_BE_DENIED')) {
      res.status(400).json({ error: 'Only pending requests can be denied' });
    } else if (err.message.includes('INVALID_POINTS_AWARDED') || err.message.includes('INVALID_BERRIES_AWARDED')) {
      res.status(400).json({ error: 'Invalid points or berries awarded amount' });
    } else if (err.message.includes('DENIAL_REASON_REQUIRED')) {
      res.status(400).json({ error: 'Faculty comment is required for denial' });
    } else {
      res.status(500).json({ error: 'Failed to review request', details: err.message });
    }
  }
};

// Legacy approve endpoint (kept for backward compatibility)
exports.approveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const facultyId = req.user.id;
    const approvalData = req.body;
    
    const request = await pointRequestService.approveRequest(id, facultyId, approvalData);
    res.json(request);
  } catch (err) {
    if (err.message.includes('REQUEST_NOT_FOUND')) {
      res.status(404).json({ error: 'Request not found' });
    } else if (err.message.includes('UNAUTHORIZED_FACULTY_ACCESS')) {
      res.status(403).json({ error: 'Unauthorized faculty access' });
    } else if (err.message.includes('ONLY_PENDING_REQUESTS_CAN_BE_APPROVED')) {
      res.status(400).json({ error: 'Only pending requests can be approved' });
    } else if (err.message.includes('INVALID_POINTS_AWARDED') || err.message.includes('INVALID_BERRIES_AWARDED')) {
      res.status(400).json({ error: 'Invalid points or berries awarded amount' });
    } else {
      res.status(500).json({ error: 'Failed to approve request', details: err.message });
    }
  }
};

// Legacy deny endpoint (kept for backward compatibility)
exports.denyRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const facultyId = req.user.id;
    const denialData = req.body;
    
    const request = await pointRequestService.denyRequest(id, facultyId, denialData);
    res.json(request);
  } catch (err) {
    if (err.message.includes('REQUEST_NOT_FOUND')) {
      res.status(404).json({ error: 'Request not found' });
    } else if (err.message.includes('UNAUTHORIZED_FACULTY_ACCESS')) {
      res.status(403).json({ error: 'Unauthorized faculty access' });
    } else if (err.message.includes('ONLY_PENDING_REQUESTS_CAN_BE_DENIED')) {
      res.status(400).json({ error: 'Only pending requests can be denied' });
    } else if (err.message.includes('DENIAL_REASON_REQUIRED')) {
      res.status(400).json({ error: 'Denial reason is required' });
    } else {
      res.status(500).json({ error: 'Failed to deny request', details: err.message });
    }
  }
};

// Download evidence file
exports.downloadEvidence = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    const request = await pointRequestService.getRequestById(id, userId, userRole);
    
    if (!request.proof_url) {
      return res.status(404).json({ error: 'No evidence file found' });
    }
    
    const filePath = path.join(__dirname, '..', request.proof_url);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Evidence file not found on server' });
    }
    
    // Set appropriate headers for file download
    const fileName = path.basename(request.proof_url);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    
    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (err) {
    if (err.message.includes('REQUEST_NOT_FOUND')) {
      res.status(404).json({ error: 'Request not found' });
    } else if (err.message.includes('UNAUTHORIZED')) {
      res.status(403).json({ error: 'Unauthorized access' });
    } else {
      res.status(500).json({ error: 'Failed to download evidence', details: err.message });
    }
  }
};

// Admin endpoints





// Get available reviewers for dropdown
exports.getAvailableReviewers = async (req, res) => {
  try {
    const studentId = req.user.id;
    const pool = require('../config/db');
    
    // Get student's college for priority sorting
    const studentQuery = `
      SELECT college_id, c.name as college_name
      FROM "user" u
      LEFT JOIN college c ON u.college_id = c.id
      WHERE u.id = $1
    `;
    const studentResult = await pool.query(studentQuery, [studentId]);
    const studentCollege = studentResult.rows[0];
    
    // Get all available reviewers
    const reviewersQuery = `
      SELECT 
        u.id,
        u.name
      FROM "user" u
      WHERE u.can_review_point_requests = TRUE 
        AND u.is_active = TRUE
      ORDER BY u.name ASC
    `;
    
    const result = await pool.query(reviewersQuery);
    
    // Format for dropdown with workload indicators
    const reviewers = result.rows.map(reviewer => ({
      id: reviewer.id,
      name: reviewer.name
    }));
    
    res.json({
      total_reviewers: reviewers.length,
      student_college: studentCollege,
      reviewers: reviewers
    });
    
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch available reviewers', details: err.message });
  }
};

// PATCH endpoint for partial updates (only if draft or pending)
exports.patchRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const studentId = req.user.id;
    const updateData = req.body;
    
    console.log('PATCH Update - Original data:', updateData);
    
    // Only allow specific fields to be updated via PATCH
    const allowedFields = [
      'activity_title', 'category', 'description', 'activity_date', 
      'proof_description', 'points_requested', 'berries_requested'
    ];
    
    const filteredUpdateData = {};
    for (const field of allowedFields) {
      if (updateData.hasOwnProperty(field)) {
        filteredUpdateData[field] = updateData[field];
      }
    }
    
    // Normalize category if it's being updated
    if (filteredUpdateData.category) {
      filteredUpdateData.category = filteredUpdateData.category.trim().toLowerCase();
    }
    
    // Convert numeric fields if they exist
    if (filteredUpdateData.points_requested) {
      filteredUpdateData.points_requested = parseInt(filteredUpdateData.points_requested);
    }
    if (filteredUpdateData.berries_requested) {
      filteredUpdateData.berries_requested = parseInt(filteredUpdateData.berries_requested);
    }
    
    console.log('PATCH Update - Processed data:', filteredUpdateData);
    
    const request = await pointRequestService.updateRequest(id, studentId, filteredUpdateData);
    
    console.log('PATCH Update - Response data:', request);
    
    res.json(request);
  } catch (err) {
    console.error('PATCH Update Error:', err.message);
    if (err.message.includes('REQUEST_NOT_FOUND')) {
      res.status(404).json({ error: 'Request not found' });
    } else if (err.message.includes('UNAUTHORIZED_ACCESS')) {
      res.status(403).json({ error: 'Unauthorized access' });
    } else if (err.message.includes('REQUEST_CANNOT_BE_MODIFIED')) {
      res.status(400).json({ error: 'Request cannot be modified in current status' });
    } else if (err.message.includes('VALIDATION_FAILED')) {
      res.status(400).json({ error: 'Validation failed', details: err.message });
    } else {
      res.status(500).json({ error: 'Failed to update request', details: err.message });
    }
  }
};

// Student DELETE endpoint for removing their own point requests
exports.deleteOwnRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const studentId = req.user.id;

    // First, let's check the current status to provide better feedback
    const currentRequest = await pointRequestService.getRequestById(id);
    
    if (!currentRequest) {
      return res.status(404).json({ error: 'Request not found' });
    }

    // Check if student owns the request
    if (currentRequest.student_id !== studentId) {
      return res.status(403).json({ error: 'Unauthorized access' });
    }

    // Check if request can be deleted
    if (!['draft', 'cancelled', 'pending'].includes(currentRequest.status)) {
      return res.status(400).json({ 
        error: 'Cannot delete processed request', 
        details: `Request status is '${currentRequest.status}'. Only draft, cancelled, and pending requests can be deleted.`,
        current_status: currentRequest.status
      });
    }

    const deletedRequest = await pointRequestService.deleteOwnRequest(id, studentId);
    res.json({
      message: `Point request "${deletedRequest.activity_title}" deleted successfully`
    });
  } catch (err) {
    if (err.message.includes('REQUEST_NOT_FOUND')) {
      res.status(404).json({ error: 'Request not found' });
    } else if (err.message.includes('UNAUTHORIZED_ACCESS')) {
      res.status(403).json({ error: 'Unauthorized access' });
    } else if (err.message.includes('CANNOT_DELETE_PROCESSED_REQUEST')) {
      res.status(400).json({ 
        error: 'Cannot delete processed request', 
        details: 'Only draft, cancelled, and pending requests can be deleted. Approved or denied requests cannot be deleted.'
      });
    } else {
      res.status(500).json({ error: 'Failed to delete request', details: err.message });
    }
  }
};




