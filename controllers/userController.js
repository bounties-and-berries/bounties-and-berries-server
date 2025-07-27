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

    const { mobile, name, role, college_id } = req.body;
    const result = await userService.createUser({ mobile, name, role, college_id });
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
    const { mobile, name, oldPassword, newPassword, role } = req.body;
    const result = await userService.changePassword(mobile, name, role, oldPassword, newPassword, req.user);
    res.json(result);
  } catch (err) {
    if (err.message.includes('MISSING_REQUIRED_FIELDS')) {
      next(new ApiError('mobile, name, oldPassword, newPassword, and role are required', 400));
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
  searchUsersByMobile
}; 