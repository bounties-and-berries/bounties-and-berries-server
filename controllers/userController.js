const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { ApiError } = require('../middleware/errorHandler');
const parse = require('csv-parse/sync').parse || require('csv-parse').parse;
const XLSX = require('xlsx');
const pool = require('../config/db');

function generatePassword(length = 10) {
  return crypto.randomBytes(length).toString('base64').slice(0, length);
}

// Create a single user (admin only, DB-backed)
const createUser = async (req, res, next) => {
  try {
    // Only admin can create users
    if (!req.user || req.user.role !== 'admin') {
      throw new ApiError('Forbidden: Only admin can create users', 403);
    }
    const { mobile, name, role, college_id } = req.body;
    if (!mobile || !name || !role || !college_id) {
      throw new ApiError('mobile, name, college_id, and role are required', 400);
    }
    // Check for existing mobile
    const checkQuery = 'SELECT 1 FROM "user" WHERE mobile = $1';
    const checkResult = await pool.query(checkQuery, [mobile]);
    if (checkResult.rows.length > 0) {
      throw new ApiError('User with this mobile already exists', 409);
    }
    // Get role_id
    const roleQuery = 'SELECT id FROM role WHERE name = $1';
    const roleResult = await pool.query(roleQuery, [role]);
    if (roleResult.rows.length === 0) {
      throw new ApiError('Invalid role', 400);
    }
    const role_id = roleResult.rows[0].id;
    // Generate and hash password
    const password = generatePassword();
    const hashedPassword = await bcrypt.hash(password, 10);
    // Insert user
    const insertQuery = `INSERT INTO "user" (mobile, name, role_id, password, college_id, is_active) VALUES ($1, $2, $3, $4, $5, TRUE) RETURNING id, mobile, name, role_id, college_id`;
    const insertResult = await pool.query(insertQuery, [mobile, name, role_id, hashedPassword, college_id]);
    const createdUser = insertResult.rows[0];
    res.status(201).json({ ...createdUser, role, password });
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
      const password = generatePassword();
      const hashedPassword = await bcrypt.hash(password, 10);
      await pool.query(`INSERT INTO "user" (mobile, name, role_id, password, college_id, is_active) VALUES ($1, $2, $3, $4, $5, TRUE)`, [mobilenumber, username, roleResult.rows[0].id, hashedPassword, college_id]);
      created.push({ username, mobilenumber, role, password });
    }
    res.status(201).json({ created });
  } catch (err) {
    next(err);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { mobile, name, oldPassword, newPassword, role } = req.body;
    if (!mobile || !name || !oldPassword || !newPassword || !role) {
      throw new ApiError('mobile, name, oldPassword, newPassword, and role are required', 400);
    }
    // Find user in DB by mobile, name, and role
    const userQuery = `SELECT u.*, r.name as role_name FROM "user" u JOIN role r ON u.role_id = r.id WHERE u.mobile = $1 AND u.name = $2 AND r.name = $3 LIMIT 1`;
    const { rows } = await pool.query(userQuery, [mobile, name, role]);
    if (rows.length === 0) {
      throw new ApiError('User not found', 404);
    }
    const user = rows[0];
    // Only allow if the user is changing their own password or is admin
    if (
      req.user.role !== 'admin' &&
      (req.user.mobile !== user.mobile || req.user.name !== user.name)
    ) {
      throw new ApiError('Forbidden: cannot change another user\'s password', 403);
    }
    // If not admin, check old password
    if (req.user.role !== 'admin') {
      const passwordMatch = await bcrypt.compare(oldPassword, user.password);
      if (!passwordMatch) {
        throw new ApiError('Old password is incorrect', 401);
      }
    }
    // Update password in DB
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE "user" SET password = $1 WHERE id = $2', [hashedPassword, user.id]);
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = { createUser, bulkCreateUsers, changePassword }; 