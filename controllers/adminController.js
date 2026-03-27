const adminService = require('../services/adminService');
const { ApiError, asyncHandler } = require('../middleware/errorHandler');

class AdminController {

  /**
   * GET /admin/dashboard
   */
  getDashboard = asyncHandler(async (req, res) => {
    const { search } = req.query;
    const result = await adminService.getDashboardData(search);
    res.json({ success: true, data: result });
  });

  /**
   * POST /admin/rules
   */
  createBerryRule = asyncHandler(async (req, res) => {
    // Validation is now handled by middleware
    const ruleData = {
      ...req.body,
      createdBy: req.user.id
    };

    const result = await adminService.createBerryRule(ruleData);
    res.status(201).json({ success: true, data: result });
  });

  /**
   * POST /admin/users/bulk
   */
  bulkUploadUsers = asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new ApiError('CSV file is required', 400);
    }

    const result = await adminService.bulkUploadUsers(req.file, req.user.id);
    res.json({ success: true, data: result });
  });

  /**
   * GET /admin/users/template
   */
  downloadTemplate = asyncHandler(async (req, res) => {
    const csvContent = 'name,email,role,department,year,roll_no\n' +
      'John Doe,john@example.com,student,Computer Science,2024,CS001\n' +
      'Jane Smith,jane@example.com,faculty,Mathematics,2024,MATH001';

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="user_upload_template.csv"');
    res.send(csvContent);
  });

  /**
   * POST /admin/purchase-berries
   */
  purchaseBerries = asyncHandler(async (req, res) => {
    const { adminId, quantity, paymentRef } = req.body;

    // Verify admin ID matches logged in user or user has super admin rights
    if (req.user.id !== adminId && req.user.role !== 'admin') {
      throw new ApiError('Unauthorized to purchase berries for this admin', 403);
    }

    const purchaseData = {
      adminId,
      quantity,
      paymentRef,
      createdBy: req.user.id
    };

    const result = await adminService.purchaseBerries(purchaseData);
    res.status(201).json({ success: true, data: result });
  });

  /**
   * GET /admin/profile
   */
  getProfile = asyncHandler(async (req, res) => {
    const result = await adminService.getAdminProfile(req.user.id);
    res.json({ success: true, data: result });
  });

  /**
   * PUT /admin/profile
   */
  updateProfile = asyncHandler(async (req, res) => {
    const result = await adminService.updateAdminProfile(req.user.id, req.body);
    res.json({ success: true, data: result });
  });

  /**
   * GET /admin/transactions
   */
  getTransactions = asyncHandler(async (req, res) => {
    const { limit = 10, offset = 0 } = req.query;
    const result = await adminService.getTransactions({ 
      limit: parseInt(limit), 
      offset: parseInt(offset) 
    });
    res.json({ success: true, data: result });
  });

  /**
   * GET /admin/students-progress
   */
  getStudentsProgress = asyncHandler(async (req, res) => {
    const result = await adminService.getStudentsProgress();
    res.json({ success: true, data: result });
  });
}

module.exports = new AdminController();