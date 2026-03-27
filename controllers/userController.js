const { ApiError } = require('../middleware/errorHandler');
const parse = require('csv-parse/sync').parse || require('csv-parse').parse;
const XLSX = require('xlsx');
const userService = require('../services/userService');

// Create a single user (admin only, DB-backed)
const createUser = async (req, res, next) => {
  try {
    // Only admin can create users
    if (!req.user || req.user.role !== 'admin') {
      throw new ApiError('Forbidden: Only admin can create users', 403);
    }

    const { mobile, name, role, college_id, can_review_point_requests } = req.body;
    const result = await userService.createUser({ mobile, name, role, college_id, can_review_point_requests });
    res.status(201).json(result);
  } catch (err) {
    if (err.message.includes('MISSING_REQUIRED_FIELDS')) {
      next(new ApiError('mobile, name, college_id, and role are required', 400));
    } else if (err.message.includes('DUPLICATE_MOBILE')) {
      next(new ApiError('User with this mobile already exists', 409));
    } else if (err.message.includes('INVALID_ROLE')) {
      next(new ApiError('Invalid role', 400));
    } else {
      next(err);
    }
  }
};

// Bulk create users from CSV or Excel
const bulkCreateUsers = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new ApiError('File is required', 400);
    }

    let records = [];
    if (req.file.mimetype === 'text/csv' || req.file.originalname.endsWith('.csv')) {
      // Parse CSV
      records = parse(req.file.buffer.toString(), { columns: true, skip_empty_lines: true });
    } else if (req.file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || req.file.originalname.endsWith('.xlsx')) {
      // Parse Excel
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      records = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    } else {
      throw new ApiError('Unsupported file type', 400);
    }

    const result = await userService.bulkCreateUsers(records);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const result = await userService.changePassword(oldPassword, newPassword, req.user);
    res.json(result);
  } catch (err) {
    if (err.message.includes('MISSING_REQUIRED_FIELDS')) {
      next(new ApiError('oldPassword and newPassword are required', 400));
    } else if (err.message.includes('USER_NOT_FOUND')) {
      next(new ApiError('User not found', 404));
    } else if (err.message.includes('UNAUTHORIZED_PASSWORD_CHANGE')) {
      next(new ApiError('Forbidden: cannot change another user\'s password', 403));
    } else if (err.message.includes('INVALID_OLD_PASSWORD')) {
      next(new ApiError('Old password is incorrect', 401));
    } else if (err.message.includes('PASSWORD_UPDATE_FAILED')) {
      next(new ApiError('Failed to update password', 500));
    } else {
      next(err);
    }
  }
};

// Get all users
const getAllUsers = async (req, res, next) => {
  try {
    const users = await userService.getAllUsers();
    res.json(users);
  } catch (err) {
    next(new ApiError('Failed to fetch users', 500));
  }
};

// Get user by ID
const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await userService.getUserById(id);
    res.json(user);
  } catch (err) {
    if (err.message.includes('USER_NOT_FOUND')) {
      next(new ApiError('User not found', 404));
    } else {
      next(new ApiError('Failed to fetch user', 500));
    }
  }
};

// Get users by college
const getUsersByCollege = async (req, res, next) => {
  try {
    const { collegeId } = req.params;
    const users = await userService.getUsersByCollege(collegeId);
    res.json(users);
  } catch (err) {
    next(new ApiError('Failed to fetch users by college', 500));
  }
};

// Get users by role
const getUsersByRole = async (req, res, next) => {
  try {
    const { roleId } = req.params;
    const users = await userService.getUsersByRole(roleId);
    res.json(users);
  } catch (err) {
    next(new ApiError('Failed to fetch users by role', 500));
  }
};

// Update user
const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const user = await userService.updateUser(id, updateData);
    res.json(user);
  } catch (err) {
    if (err.message.includes('USER_NOT_FOUND')) {
      next(new ApiError('User not found', 404));
    } else if (err.message.includes('MOBILE_REQUIRED')) {
      next(new ApiError('Mobile number is required', 400));
    } else if (err.message.includes('NAME_REQUIRED')) {
      next(new ApiError('Name is required', 400));
    } else if (err.message.includes('DUPLICATE_MOBILE')) {
      next(new ApiError('User with this mobile already exists', 409));
    } else {
      next(new ApiError('Failed to update user', 500));
    }
  }
};

// Delete user (soft delete)
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await userService.deleteUser(id);
    res.json({ message: 'User deleted successfully', user });
  } catch (err) {
    if (err.message.includes('USER_NOT_FOUND')) {
      next(new ApiError('User not found', 404));
    } else {
      next(new ApiError('Failed to delete user', 500));
    }
  }
};

// Search users by name
const searchUsersByName = async (req, res, next) => {
  try {
    const { name } = req.query;
    const users = await userService.searchUsersByName(name);
    res.json(users);
  } catch (err) {
    next(new ApiError('Failed to search users', 500));
  }
};

// Search users by mobile
const searchUsersByMobile = async (req, res, next) => {
  try {
    const { mobile } = req.query;
    const users = await userService.searchUsersByMobile(mobile);
    res.json(users);
  } catch (err) {
    next(new ApiError('Failed to search users', 500));
  }
};

// Get current user profile
const getCurrentUser = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const user = await userService.getUserById(userId);
    res.json({ success: true, data: user });
  } catch (err) {
    if (err.message.includes('USER_NOT_FOUND')) {
      next(new ApiError('User not found', 404));
    } else {
      next(new ApiError('Failed to fetch current user', 500));
    }
  }
};

// Update current user profile
const updateCurrentUser = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const updateData = req.body;
    delete updateData.password;
    delete updateData.role_id;
    delete updateData.is_active;
    const user = await userService.updateUser(userId, updateData);
    res.json({ success: true, data: user, message: 'Profile updated successfully' });
  } catch (err) {
    if (err.message.includes('USER_NOT_FOUND')) {
      next(new ApiError('User not found', 404));
    } else {
      next(new ApiError('Failed to update profile', 500));
    }
  }
};

// Get user statistics
const getUserStats = async (req, res, next) => {
  try {
    const { id } = req.params;
    const pool = require('../config/db');
    
    const earningsQuery = `
      SELECT 
        COALESCE(SUM(points_earned), 0) as total_points_earned,
        COALESCE(SUM(berries_earned), 0) as total_berries_earned
      FROM user_bounty_participation
      WHERE user_id = $1 AND status = 'completed'
    `;
    const { rows: earnings } = await pool.query(earningsQuery, [id]);
    
    const spentQuery = `
      SELECT COALESCE(SUM(berries_spent), 0) as total_berries_spent
      FROM user_reward_claim
      WHERE user_id = $1
    `;
    const { rows: spent } = await pool.query(spentQuery, [id]);
    
    const achievementsQuery = `
      SELECT 
        COUNT(*) as total_bounties_completed,
        COUNT(DISTINCT bounty_id) as unique_bounties
      FROM user_bounty_participation
      WHERE user_id = $1 AND status = 'completed'
    `;
    const { rows: achievements } = await pool.query(achievementsQuery, [id]);
    
    const rewardsQuery = `
      SELECT COUNT(*) as total_rewards_claimed
      FROM user_reward_claim
      WHERE user_id = $1
    `;
    const { rows: rewards } = await pool.query(rewardsQuery, [id]);
    
    // PHASE C: Feature Flag Ledger SSOT Cutover with Canary Rollout
    const ledgerReadsEnabled = process.env.LEDGER_READS_ENABLED === 'true';
    const ledgerPercent = Number(process.env.LEDGER_READS_PERCENT || 100);
    const useLedger = ledgerReadsEnabled && (Math.random() * 100 < ledgerPercent);

    let currentBerries = 0;
    const legacyBalance = parseInt(earnings[0].total_berries_earned) - parseInt(spent[0].total_berries_spent);

    if (useLedger) {
      const ledgerResult = await pool.query('SELECT balance FROM user_balance WHERE user_id = $1', [id]);
      currentBerries = ledgerResult.rows.length > 0 ? parseInt(ledgerResult.rows[0].balance, 10) : 0;

      // Silent Comparator Guardrail (2% sampling)
      if (Math.random() < 0.02) {
        if (currentBerries !== legacyBalance) {
          console.error('[LEDGER_AUDIT] BALANCE_MISMATCH detected during cutover', { 
            userId: id, 
            cached: currentBerries, 
            derived: legacyBalance 
          });
        }
      }
    } else {
      currentBerries = legacyBalance;
    }

    res.json({
      success: true,
      data: {
        points: {
          total_earned: parseInt(earnings[0].total_points_earned),
          current: parseInt(earnings[0].total_points_earned)
        },
        berries: {
          total_earned: parseInt(earnings[0].total_berries_earned),
          total_spent: parseInt(spent[0].total_berries_spent),
          current: currentBerries
        },
        achievements: {
          bounties_completed: parseInt(achievements[0].total_bounties_completed),
          unique_bounties: parseInt(achievements[0].unique_bounties),
          rewards_claimed: parseInt(rewards[0].total_rewards_claimed)
        }
      }
    });
  } catch (err) {
    next(new ApiError('Failed to fetch user stats', 500));
  }
};

// Manual berry grant
const addBerriesToUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amount } = req.body;
    const adminId = req.user.id;
    
    if (req.user.role !== 'admin') {
      throw new ApiError('Forbidden: Only admin can grant berries', 403);
    }
    
    const result = await userService.addBerriesToUser(id, amount, adminId);
    res.json(result);
  } catch (err) {
    if (err.message.includes('USER_NOT_FOUND')) {
      next(new ApiError('User not found', 404));
    } else if (err.message.includes('INVALID_AMOUNT')) {
      next(new ApiError('Invalid amount', 400));
    } else {
      next(err);
    }
  }
};

module.exports = { 
  createUser, 
  bulkCreateUsers, 
  changePassword,
  getAllUsers,
  getUserById,
  getUsersByCollege,
  getUsersByRole,
  updateUser,
  deleteUser,
  searchUsersByName,
  searchUsersByMobile,
  getCurrentUser,
  updateCurrentUser,
  getUserStats,
  addBerriesToUser
};
