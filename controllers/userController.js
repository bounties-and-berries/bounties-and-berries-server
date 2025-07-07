const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { ApiError } = require('../middleware/errorHandler');
const parse = require('csv-parse/sync').parse || require('csv-parse').parse;
const XLSX = require('xlsx');

// In-memory user store
const users = [];

// Add a default admin user
(async () => {
  const defaultAdmin = {
    username: 'admin',
    mobilenumber: '9999999999',
    role: 'admin',
    password: await bcrypt.hash('admin@123', 10)
  };
  users.push(defaultAdmin);
})();

function generatePassword(length = 10) {
  return crypto.randomBytes(length).toString('base64').slice(0, length);
}

// Create a single user
const createUser = async (req, res, next) => {
  try {
    const { username, mobilenumber, role } = req.body;
    if (!username || !mobilenumber || !role) {
      throw new ApiError('username, mobilenumber, and role are required', 400);
    }
    if (users.find(u => u.username === username || u.mobilenumber === mobilenumber)) {
      throw new ApiError('User with this username or mobilenumber already exists', 409);
    }
    const password = generatePassword();
    const hashedPassword = await bcrypt.hash(password, 10);
    users.push({ username, mobilenumber, role, password: hashedPassword });
    res.status(201).json({ username, mobilenumber, role, password });
  } catch (err) {
    next(err);
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
    const created = [];
    for (const rec of records) {
      const { username, mobilenumber, role } = rec;
      if (!username || !mobilenumber || !role) continue;
      if (users.find(u => u.username === username || u.mobilenumber === mobilenumber)) continue;
      const password = generatePassword();
      const hashedPassword = await bcrypt.hash(password, 10);
      users.push({ username, mobilenumber, role, password: hashedPassword });
      created.push({ username, mobilenumber, role, password });
    }
    res.status(201).json({ created });
  } catch (err) {
    next(err);
  }
};

// Utility to find user by username or mobilenumber
function findUserByUsernameOrMobile(identifier, role) {
  return users.find(u => (u.username === identifier || u.mobilenumber === identifier) && u.role === role);
}

const changePassword = async (req, res, next) => {
  try {
    const { identifier, oldPassword, newPassword, role } = req.body;
    if (!identifier || !oldPassword || !newPassword || !role) {
      throw new ApiError('identifier, oldPassword, newPassword, and role are required', 400);
    }
    const user = findUserByUsernameOrMobile(identifier, role);
    if (!user) {
      throw new ApiError('User not found', 404);
    }
    // Only allow if the user is changing their own password or is admin
    if (
      req.user.role !== 'admin' &&
      (req.user.username !== user.username || req.user.mobilenumber !== user.mobilenumber)
    ) {
      throw new ApiError('Forbidden: cannot change another user\'s password', 403);
    }
    const passwordMatch = await bcrypt.compare(oldPassword, user.password);
    if (!passwordMatch && req.user.role !== 'admin') {
      throw new ApiError('Old password is incorrect', 401);
    }
    user.password = await bcrypt.hash(newPassword, 10);
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = { createUser, bulkCreateUsers, findUserByUsernameOrMobile, changePassword, users }; 