const adminRepository = require('../repositories/adminRepository');
const userRepository = require('../repositories/userRepository');
const bountyRepository = require('../repositories/bountyRepository');
const rewardRepository = require('../repositories/rewardRepository');
const pointRequestRepository = require('../repositories/pointRequestRepository');
const { parse } = require('csv-parse');
const fs = require('fs');
const bcrypt = require('bcryptjs');

class AdminService {

  /**
   * Get dashboard data for admin
   */
  async getDashboardData(searchQuery) {
    try {
      // Get berries available (total from all completed bounties minus claimed rewards)
      const berriesData = await adminRepository.getBerriesAvailable();

      // Get category breakdown
      const categoryBreakdown = await adminRepository.getCategoryBreakdown();

      // Get approved points (from completed bounties and approved point requests)
      const approvedPoints = await adminRepository.getApprovedPoints();

      // Get pending point requests count
      const pendingRequests = await adminRepository.getPendingRequestsCount();

      // Get top students (filter by search if provided)
      const topStudents = await adminRepository.getTopStudents(searchQuery);

      // Get real dashboard stats
      const stats = await adminRepository.getDashboardStats();

      return {
        berriesAvailable: berriesData.total || 0,
        categoryBreakdown: categoryBreakdown || [],
        approvedPoints: approvedPoints.total || 0,
        pendingRequests: pendingRequests.count || 0,
        topStudents: topStudents || [],
        ...stats
      };
    } catch (error) {
      throw new Error(`Service error in getDashboardData: ${error.message}`);
    }
  }

  /**
   * Create a berry rule
   */
  async createBerryRule(ruleData) {
    try {
      // Check if rule with same name exists
      const existingRule = await adminRepository.getBerryRuleByName(ruleData.name);
      if (existingRule) {
        throw new Error('DUPLICATE_RULE');
      }

      const result = await adminRepository.createBerryRule(ruleData);
      return {
        message: 'Berry rule created successfully',
        rule: result
      };
    } catch (error) {
      throw new Error(`Service error in createBerryRule: ${error.message}`);
    }
  }

  /**
   * Bulk upload users from CSV
   */
  async bulkUploadUsers(file, createdBy) {
    try {
      const results = [];
      const errors = [];
      let successCount = 0;
      let rowNumber = 0;

      return new Promise((resolve, reject) => {
        const csvData = [];

        fs.createReadStream(file.path)
          .pipe(parse({ headers: true, skip_empty_lines: true }))
          .on('data', (data) => {
            csvData.push(data);
          })
          .on('end', async () => {
            try {
              for (const row of csvData) {
                rowNumber++;

                try {
                  // Validate required fields
                  const { name, email, role, department, year, roll_no } = row;

                  if (!name || !email || !role) {
                    errors.push({ row: rowNumber, error: 'Missing required fields (name, email, role)' });
                    continue;
                  }

                  // Validate email format
                  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                  if (!emailRegex.test(email)) {
                    errors.push({ row: rowNumber, error: 'Invalid email format' });
                    continue;
                  }

                  // Check if user already exists
                  const existingUser = await userRepository.findByEmail(email);
                  if (existingUser) {
                    errors.push({ row: rowNumber, error: 'User with this email already exists' });
                    continue;
                  }

                  // Get role ID
                  const roleData = await adminRepository.getRoleByName(role);
                  if (!roleData) {
                    errors.push({ row: rowNumber, error: `Invalid role: ${role}` });
                    continue;
                  }

                  // Generate username from email
                  const username = email.split('@')[0];

                  // Generate random password
                  const password = Math.random().toString(36).slice(-8);
                  const hashedPassword = await bcrypt.hash(password, 10);

                  // Create user
                  const userData = {
                    name: name.trim(),
                    username,
                    email: email.trim(),
                    mobile: roll_no || `mobile_${Date.now()}_${rowNumber}`, // Use roll_no as mobile or generate
                    password: hashedPassword,
                    role_id: roleData.id,
                    college_id: 1, // Default college, can be modified as needed
                    department: department?.trim(),
                    year: year?.trim(),
                    created_by: createdBy
                  };

                  const newUser = await adminRepository.createUser(userData);
                  results.push({
                    ...newUser,
                    password: password, // Include generated password in response
                    row: rowNumber
                  });
                  successCount++;

                } catch (rowError) {
                  errors.push({ row: rowNumber, error: rowError.message });
                }
              }

              // Clean up uploaded file
              fs.unlinkSync(file.path);

              resolve({
                successCount,
                errors,
                users: results
              });

            } catch (processingError) {
              reject(processingError);
            }
          })
          .on('error', (error) => {
            reject(error);
          });
      });
    } catch (error) {
      throw new Error(`Service error in bulkUploadUsers: ${error.message}`);
    }
  }

  /**
   * Purchase berries
   */
  async purchaseBerries(purchaseData) {
    try {
      // Check if payment reference already exists
      const existingPurchase = await adminRepository.getPurchaseByPaymentRef(purchaseData.paymentRef);
      if (existingPurchase) {
        throw new Error('DUPLICATE_PAYMENT_REF');
      }

      // Verify admin exists
      const admin = await userRepository.findById(purchaseData.adminId);
      if (!admin) {
        throw new Error('Admin not found');
      }

      const result = await adminRepository.createPurchase(purchaseData);
      return {
        message: 'Berry purchase recorded successfully',
        purchase: result
      };
    } catch (error) {
      throw new Error(`Service error in purchaseBerries: ${error.message}`);
    }
  }

  /**
   * Get admin profile
   */
  async getAdminProfile(adminId) {
    try {
      const admin = await userRepository.findById(adminId);
      if (!admin) {
        throw new Error('Admin not found');
      }

      return {
        name: admin.name,
        email: admin.email || '',
        logoUrl: admin.img_url || '',
        theme: admin.theme || 'light' // Default theme
      };
    } catch (error) {
      throw new Error(`Service error in getAdminProfile: ${error.message}`);
    }
  }

  /**
   * Update admin profile
   */
  async updateAdminProfile(adminId, updateData) {
    try {
      const result = await adminRepository.updateAdminProfile(adminId, updateData);
      return {
        message: 'Profile updated successfully',
        profile: result
      };
    } catch (error) {
      throw new Error(`Service error in updateAdminProfile: ${error.message}`);
    }
  }

  /**
   * Get transactions
   */
  async getTransactions(params = {}) {
    try {
      const limit = params.limit || 10;
      const offset = params.offset || 0;

      const result = await adminRepository.getTransactions(limit, offset);
      return result;
    } catch (error) {
      throw new Error(`Service error in getTransactions: ${error.message}`);
    }
  }

  /**
   * Get progress for all students
   */
  async getStudentsProgress() {
    try {
      return await adminRepository.getStudentsProgress();
    } catch (error) {
      throw new Error(`Service error in getStudentsProgress: ${error.message}`);
    }
  }
}

module.exports = new AdminService();