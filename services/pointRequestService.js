const pointRequestRepository = require('../repositories/pointRequestRepository');
const TransactionUtils = require('../utils/transactionUtils');
const bountyParticipationService = require('./bountyParticipationService');

class PointRequestService {
  
  // Validation service methods
  validateRequest(requestData) {
    const errors = [];
    
    if (!requestData.activity_title || requestData.activity_title.trim().length === 0 || requestData.activity_title.length > 255) {
      errors.push('Activity title is required and must be 255 characters or less');
    }
    
    const validCategories = ['coding', 'sports', 'academic', 'arts', 'leadership', 'community_service', 'innovation', 'other'];
    const category = requestData.category ? requestData.category.trim().toLowerCase() : '';
    if (!validCategories.includes(category)) {
      errors.push(`Invalid category. Valid categories are: ${validCategories.join(', ')}`);
    }
    
    // Custom category validation removed - using predefined categories only
    
    if (!requestData.description || requestData.description.trim().length === 0 || requestData.description.length > 1000) {
      errors.push('Description is required and must be 1000 characters or less');
    }
    
    if (!requestData.activity_date) {
      errors.push('Activity date is required');
    } else {
      const activityDate = new Date(requestData.activity_date);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (activityDate > today) {
        errors.push('Activity date must be in the past');
      }
    }
    
    // Convert and validate points_requested
    const pointsRequested = parseInt(requestData.points_requested);
    if (isNaN(pointsRequested) || pointsRequested < 0 || pointsRequested > 1000) {
      errors.push('Points requested must be between 0 and 1000');
    }
    
    // Convert and validate berries_requested
    const berriesRequested = parseInt(requestData.berries_requested);
    if (isNaN(berriesRequested) || berriesRequested < 0 || berriesRequested > 100) {
      errors.push('Berries requested must be between 0 and 100');
    }
    
    if (!requestData.proof_description || requestData.proof_description.trim().length === 0 || requestData.proof_description.length > 500) {
      errors.push('Proof description is required and must be 500 characters or less');
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  async validateBusinessRules(studentId, requestData) {
    // Check if student has too many pending requests
    const pendingCount = await pointRequestRepository.countPendingByStudent(studentId);
    if (pendingCount >= 5) {
      throw new Error('MAXIMUM_PENDING_REQUESTS_EXCEEDED');
    }
    
    // Check for duplicate activity
    const duplicateExists = await pointRequestRepository.checkDuplicateActivity(
      studentId, 
      requestData.activity_title
    );
    if (duplicateExists) {
      throw new Error('Similar activity already submitted');
    }
  }

  async validateSelectedFaculty(facultyId) {
    try {
      const pool = require('../config/db');
      const query = `
        SELECT id, name, can_review_point_requests, is_active
        FROM "user" 
        WHERE id = $1
      `;
      
      const result = await pool.query(query, [facultyId]);
      
      if (result.rows.length === 0) {
        throw new Error('SELECTED_FACULTY_NOT_FOUND');
      }
      
      const faculty = result.rows[0];
      
      if (!faculty.can_review_point_requests) {
        throw new Error('SELECTED_FACULTY_CANNOT_REVIEW');
      }
      
      if (!faculty.is_active) {
        throw new Error('SELECTED_FACULTY_NOT_ACTIVE');
      }
      
      return true;
    } catch (error) {
      throw new Error(`Faculty validation error: ${error.message}`);
    }
  }

  // Main CRUD operations
  async createRequest(studentId, requestData) {
    try {
      // Validate input data
      const validation = this.validateRequest(requestData);
      if (!validation.isValid) {
        throw new Error(`VALIDATION_FAILED: ${validation.errors.join(', ')}`);
      }
      
      // Additional business logic validation
      await this.validateBusinessRules(studentId, requestData);
      
      // Validate selected faculty if provided
      if (requestData.selected_faculty_id) {
        await this.validateSelectedFaculty(requestData.selected_faculty_id);
      }
      
      // Set defaults and create
      const requestToCreate = {
        ...requestData,
        student_id: studentId,
        faculty_id: requestData.selected_faculty_id || null, // Use selected faculty
        status: 'draft',
        created_by: studentId.toString(),
        modified_by: studentId.toString()
      };
      
      // Remove selected_faculty_id from the data as it's not a database field
      delete requestToCreate.selected_faculty_id;
      
      return await pointRequestRepository.create(requestToCreate);
    } catch (error) {
      throw new Error(`Service error in createRequest: ${error.message}`);
    }
  }

  async updateRequest(id, studentId, updateData) {
    try {
      console.log('Service updateRequest - Input:', { id, studentId, updateData });
      
      const existingRequest = await pointRequestRepository.findById(id);
      console.log('Service updateRequest - Existing request:', existingRequest);
      
      if (!existingRequest) {
        throw new Error('REQUEST_NOT_FOUND');
      }
      
      // Authorization check
      if (existingRequest.student_id !== studentId) {
        throw new Error('UNAUTHORIZED_ACCESS');
      }
      
      // Status check
      if (!['draft', 'pending'].includes(existingRequest.status)) {
        throw new Error('REQUEST_CANNOT_BE_MODIFIED');
      }
      
      // Validate updated data
      const mergedData = { ...existingRequest, ...updateData };
      const validation = this.validateRequest(mergedData);
      if (!validation.isValid) {
        throw new Error(`VALIDATION_FAILED: ${validation.errors.join(', ')}`);
      }
      
      console.log('Service updateRequest - About to update with:', {
        ...updateData,
        modified_by: studentId.toString()
      });
      
      // Update the request
      const updatedRequest = await pointRequestRepository.update(id, {
        ...updateData,
        modified_by: studentId.toString()
      });
      
      console.log('Service updateRequest - Repository response:', updatedRequest);
      
      // Return the updated request to ensure we get the latest data
      return updatedRequest;
    } catch (error) {
      console.error('Service updateRequest - Error:', error.message);
      throw new Error(`Service error in updateRequest: ${error.message}`);
    }
  }

  async submitRequest(id, studentId) {
    try {
      const request = await pointRequestRepository.findById(id);
      
      if (!request) {
        throw new Error('REQUEST_NOT_FOUND');
      }
      
      // Authorization and status checks
      if (request.student_id !== studentId) {
        throw new Error('UNAUTHORIZED_ACCESS');
      }
      
      if (request.status !== 'draft') {
        throw new Error('ONLY_DRAFT_REQUESTS_CAN_BE_SUBMITTED');
      }
      
      // Final validation before submission
      const validation = this.validateRequest(request);
      if (!validation.isValid) {
        throw new Error(`CANNOT_SUBMIT_INVALID_REQUEST: ${validation.errors.join(', ')}`);
      }
      
      // Update status to pending
      const updatedRequest = await pointRequestRepository.update(id, {
        status: 'pending',
        submission_date: new Date(),
        modified_by: studentId.toString()
      });
      
      // Only auto-assign faculty if no faculty is already selected
      const studentData = await pointRequestRepository.findById(id);
      if (!studentData.faculty_id) {
        const facultyId = await this.autoAssignFaculty(request.category, studentData.college_id);
        if (facultyId) {
          await pointRequestRepository.update(id, {
            faculty_id: facultyId,
            modified_by: 'system'
          });
        }
      }
      
      return await pointRequestRepository.findById(id);
    } catch (error) {
      throw new Error(`Service error in submitRequest: ${error.message}`);
    }
  }

  async cancelRequest(id, userId) {
    try {
      const request = await pointRequestRepository.findById(id);
      
      if (!request) {
        throw new Error('REQUEST_NOT_FOUND');
      }
      
      // Authorization check
      if (request.student_id !== userId) {
        throw new Error('UNAUTHORIZED_ACCESS');
      }
      
      // Status check
      if (!['draft', 'pending'].includes(request.status)) {
        throw new Error('CANNOT_CANCEL_PROCESSED_REQUEST');
      }
      
      return await pointRequestRepository.update(id, {
        status: 'cancelled',
        modified_by: userId.toString()
      });
    } catch (error) {
      throw new Error(`Service error in cancelRequest: ${error.message}`);
    }
  }

  async deleteRequest(id, adminId) {
    try {
      const request = await pointRequestRepository.findById(id);
      
      if (!request) {
        throw new Error('REQUEST_NOT_FOUND');
      }
      
      // Only allow deletion of draft or cancelled requests
      if (!['draft', 'cancelled'].includes(request.status)) {
        throw new Error('CANNOT_DELETE_ACTIVE_REQUEST');
      }
      
      // Delete the request
      return await pointRequestRepository.delete(id);
    } catch (error) {
      throw new Error(`Service error in deleteRequest: ${error.message}`);
    }
  }

  async deleteOwnRequest(id, studentId) {
    try {
      const request = await pointRequestRepository.findById(id);

      if (!request) {
        throw new Error('REQUEST_NOT_FOUND');
      }

      // Authorization check - only allow students to delete their own requests
      if (request.student_id !== studentId) {
        throw new Error('UNAUTHORIZED_ACCESS');
      }

      // Allow deletion of draft, cancelled, and pending requests
      // Students should be able to cancel their requests even when under review
      if (!['draft', 'cancelled', 'pending'].includes(request.status)) {
        throw new Error('CANNOT_DELETE_PROCESSED_REQUEST');
      }

      // Delete the request
      return await pointRequestRepository.delete(id);
    } catch (error) {
      throw new Error(`Service error in deleteOwnRequest: ${error.message}`);
    }
  }

  async getRequestById(id) {
    try {
      const request = await pointRequestRepository.findById(id);
      if (!request) {
        throw new Error('REQUEST_NOT_FOUND');
      }
      return request;
    } catch (error) {
      throw new Error(`Service error in getRequestById: ${error.message}`);
    }
  }

  // Faculty operations
  async approveRequest(id, facultyId, approvalData) {
    try {
      return await TransactionUtils.withTransaction(async (client) => {
        const request = await pointRequestRepository.findById(id);
        
        if (!request) {
          throw new Error('REQUEST_NOT_FOUND');
        }
        
        if (request.faculty_id !== facultyId) {
          throw new Error('UNAUTHORIZED_FACULTY_ACCESS');
        }
        
        if (request.status !== 'pending') {
          throw new Error('ONLY_PENDING_REQUESTS_CAN_BE_APPROVED');
        }
        
        // Validate approval data
        const pointsAwarded = approvalData.points_awarded || request.points_requested;
        const berriesAwarded = approvalData.berries_awarded || request.berries_requested;
        
        if (pointsAwarded < 0 || pointsAwarded > 1000) {
          throw new Error('INVALID_POINTS_AWARDED');
        }
        
        if (berriesAwarded < 0 || berriesAwarded > 100) {
          throw new Error('INVALID_BERRIES_AWARDED');
        }
        
        // Update request status
        const updatedRequest = await pointRequestRepository.update(id, {
          status: 'approved',
          points_awarded: pointsAwarded,
          berries_awarded: berriesAwarded,
          faculty_comment: approvalData.faculty_comment || null,
          approval_date: new Date(),
          modified_by: facultyId.toString()
        });
        
        // Award points through bounty participation system
        if (pointsAwarded > 0 || berriesAwarded > 0) {
          const participation = await bountyParticipationService.createParticipation({
            user_id: request.student_id,
            bounty_id: null, // Special case for point requests
            points_earned: pointsAwarded,
            berries_earned: berriesAwarded,
            status: 'completed',
            created_by: facultyId.toString(),
            modified_by: facultyId.toString()
          });
          
          // Link back to point request
          await pointRequestRepository.update(id, {
            bounty_participation_id: participation.id,
            modified_by: 'system'
          });
        }
        
        return await pointRequestRepository.findById(id);
      });
    } catch (error) {
      throw new Error(`Service error in approveRequest: ${error.message}`);
    }
  }

  async denyRequest(id, facultyId, denialData) {
    try {
      const request = await pointRequestRepository.findById(id);
      
      if (!request) {
        throw new Error('REQUEST_NOT_FOUND');
      }
      
      if (request.faculty_id !== facultyId) {
        throw new Error('UNAUTHORIZED_FACULTY_ACCESS');
      }
      
      if (request.status !== 'pending') {
        throw new Error('ONLY_PENDING_REQUESTS_CAN_BE_DENIED');
      }
      
      if (!denialData.faculty_comment || denialData.faculty_comment.trim().length === 0) {
        throw new Error('DENIAL_REASON_REQUIRED');
      }
      
      return await pointRequestRepository.update(id, {
        status: 'denied',
        faculty_comment: denialData.faculty_comment,
        modified_by: facultyId.toString()
      });
    } catch (error) {
      throw new Error(`Service error in denyRequest: ${error.message}`);
    }
  }

  // Payload-based search and filter methods (following existing patterns)
  async searchAndFilterRequests(filters = {}, userId = null, userRole = null) {
    try {
      const processedFilters = { ...filters };
      
      // Role-based filtering
      if (userRole === 'student' && userId) {
        processedFilters.student_id = userId;
      } else if (userRole === 'faculty' && userId) {
        // Faculty can see requests assigned to them or unassigned pending requests
        if (!processedFilters.status || processedFilters.status === 'pending') {
          processedFilters.faculty_id = userId;
        }
      }
      
      return await pointRequestRepository.findAll(processedFilters);
    } catch (error) {
      throw new Error(`Service error in searchAndFilterRequests: ${error.message}`);
    }
  }

  async getMyRequests(studentId, filters = {}) {
    try {
      return await pointRequestRepository.findByStudentId(studentId, filters);
    } catch (error) {
      throw new Error(`Service error in getMyRequests: ${error.message}`);
    }
  }

  async getPendingForFaculty(facultyId, filters = {}) {
    try {
      const requests = await pointRequestRepository.findPendingForFaculty(facultyId, filters);
      
      // Add calculated fields for each request
      return requests.map(request => ({
        ...request,
        review_status: this.getReviewStatus(request),
        hours_since_submission: this.getHoursSinceSubmission(request),
        priority: this.calculatePriority(request)
      }));
    } catch (error) {
      throw new Error(`Service error in getPendingForFaculty: ${error.message}`);
    }
  }

  async getAssignedRequests(facultyId) {
    try {
      // Get all requests assigned to this faculty (all statuses)
      const requests = await pointRequestRepository.findAssignedToFaculty(facultyId);
      
      // Return only essential fields for faculty review
      return requests.map(request => ({
        id: request.id,
        student_id: request.student_id,
        faculty_id: request.faculty_id,
        activity_title: request.activity_title,
        category: request.category,
        description: request.description,
        activity_date: request.activity_date,
        proof_url: request.proof_url,
        proof_description: request.proof_description,
        proof_file_hash: request.proof_file_hash,
        points_requested: request.points_requested,
        berries_requested: request.berries_requested,
        points_awarded: request.points_awarded,
        berries_awarded: request.berries_awarded,
        status: request.status,
        faculty_comment: request.faculty_comment,
        submission_date: request.submission_date,
        student_name: request.student_name
      }));
    } catch (error) {
      throw new Error(`Service error in getAssignedRequests: ${error.message}`);
    }
  }

  async getRequestById(id, userId = null, userRole = null) {
    try {
      const request = await pointRequestRepository.findById(id);
      
      if (!request) {
        throw new Error('REQUEST_NOT_FOUND');
      }
      
      // Authorization check
      if (userRole === 'student' && request.student_id !== userId) {
        throw new Error('UNAUTHORIZED_ACCESS');
      }
      
      if (userRole === 'faculty' && request.faculty_id !== userId && request.faculty_id !== null) {
        throw new Error('UNAUTHORIZED_FACULTY_ACCESS');
      }
      
      // Add calculated fields
      return {
        ...request,
        review_status: this.getReviewStatus(request),
        hours_since_submission: this.getHoursSinceSubmission(request),
        priority: this.calculatePriority(request)
      };
    } catch (error) {
      throw new Error(`Service error in getRequestById: ${error.message}`);
    }
  }

  // Statistics and reporting
  async getStatistics(filters = {}) {
    try {
      const basicStats = await pointRequestRepository.getStatistics(filters);
      const categoryStats = await pointRequestRepository.getCategoryStatistics(filters);
      
      return {
        summary: basicStats,
        categories: categoryStats
      };
    } catch (error) {
      throw new Error(`Service error in getStatistics: ${error.message}`);
    }
  }

  // Helper methods for status calculation
  getReviewStatus(request) {
    const now = new Date();
    const submissionDate = new Date(request.submission_date);
    const hoursSinceSubmission = (now - submissionDate) / (1000 * 60 * 60);
    
    if (request.status === 'draft') return 'draft';
    if (request.status === 'cancelled') return 'cancelled';
    if (request.status === 'approved') return 'approved';
    if (request.status === 'denied') return 'denied';
    
    // For pending requests, determine if under review
    if (request.status === 'pending') {
      if (request.faculty_id && hoursSinceSubmission > 1) {
        return 'under_review';
      }
      return 'pending';
    }
    
    return 'unknown';
  }

  calculatePriority(request) {
    if (request.status !== 'pending') return null;
    
    const hoursSinceSubmission = this.getHoursSinceSubmission(request);
    
    if (hoursSinceSubmission > 72) return 'urgent';    // 3+ days
    if (hoursSinceSubmission > 48) return 'high';      // 2+ days  
    if (hoursSinceSubmission > 24) return 'medium';    // 1+ day
    return 'low';                                       // < 1 day
  }

  getHoursSinceSubmission(request) {
    if (!request.submission_date) return 0;
    const now = new Date();
    const submissionDate = new Date(request.submission_date);
    return (now - submissionDate) / (1000 * 60 * 60);
  }

  // Faculty assignment logic - Updated to use reviewer capability
  async autoAssignFaculty(category, studentCollegeId = null) {
    try {
      const availableReviewers = await this.getAvailableReviewers(studentCollegeId);
      if (availableReviewers.length === 0) {
        return null; // No reviewers available
      }
      
      // Get workloads and assign to least busy reviewer
      const reviewerWorkloads = await pointRequestRepository.getFacultyWorkloads(
        availableReviewers.map(r => r.id)
      );
      
      if (reviewerWorkloads.length === 0) {
        // If no one has pending requests, assign randomly
        const randomReviewer = availableReviewers[Math.floor(Math.random() * availableReviewers.length)];
        return randomReviewer.id;
      }
      
      // Assign to reviewer with least pending requests
      return reviewerWorkloads[0].faculty_id;
    } catch (error) {
      throw new Error(`Service error in autoAssignFaculty: ${error.message}`);
    }
  }

  async getAvailableReviewers(studentCollegeId = null) {
    try {
      let query = `
        SELECT u.id, u.name, u.college_id, c.name as college_name
        FROM "user" u
        LEFT JOIN college c ON u.college_id = c.id
        WHERE u.can_review_point_requests = TRUE 
          AND u.is_active = TRUE
      `;
      
      const params = [];
      
      // Prefer reviewers from same college, but allow cross-college if needed
      if (studentCollegeId) {
        query += ` ORDER BY (CASE WHEN u.college_id = $1 THEN 0 ELSE 1 END), u.name`;
        params.push(studentCollegeId);
      } else {
        query += ` ORDER BY u.name`;
      }
      
      const pool = require('../config/db');
      const result = await pool.query(query, params);
      
      return result.rows;
    } catch (error) {
      throw new Error(`Service error in getAvailableReviewers: ${error.message}`);
    }
  }

  // Legacy method - kept for backward compatibility but now uses reviewer flag
  async getFacultyByCategory(category) {
    // This method is now deprecated in favor of getAvailableReviewers
    // but kept for backward compatibility
    const availableReviewers = await this.getAvailableReviewers();
    return availableReviewers.map(r => r.id);
  }

  // File upload helper
  async updateProofFile(id, userId, fileData) {
    try {
      const request = await pointRequestRepository.findById(id);
      
      if (!request) {
        throw new Error('REQUEST_NOT_FOUND');
      }
      
      if (request.student_id !== userId) {
        throw new Error('UNAUTHORIZED_ACCESS');
      }
      
      if (!['draft', 'pending'].includes(request.status)) {
        throw new Error('CANNOT_UPDATE_PROOF_FOR_PROCESSED_REQUEST');
      }
      
      return await pointRequestRepository.update(id, {
        proof_url: fileData.file_path,
        proof_file_hash: fileData.file_hash,
        modified_by: userId.toString()
      });
    } catch (error) {
      throw new Error(`Service error in updateProofFile: ${error.message}`);
    }
  }
}

module.exports = new PointRequestService();
