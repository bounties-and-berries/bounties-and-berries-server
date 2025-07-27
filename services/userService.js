const bcrypt = require('bcrypt');
const crypto = require('crypto');
const userRepository = require('../repositories/userRepository');
const TransactionUtils = require('../utils/transactionUtils');

class UserService {
  generatePassword(length = 10) {
    return crypto.randomBytes(length).toString('base64').slice(0, length);
  }

  async createUser(userData) {
    try {
      return await TransactionUtils.withTransaction(async (client) => {
        // 1. Business logic validation
        if (!userData.mobile || !userData.name || !userData.role || !userData.college_id) {
          throw new Error('MISSING_REQUIRED_FIELDS');
        }

        // 2. Check for existing mobile (with lock)
        const existingUser = await client.query(
          'SELECT id FROM "user" WHERE mobile = $1 FOR UPDATE',
          [userData.mobile.trim()]
        );
        
        if (existingUser.rows.length > 0) {
          throw new Error('DUPLICATE_MOBILE');
        }

        // 3. Get role_id (with lock)
        const roleResult = await client.query(
          'SELECT id FROM role WHERE name = $1 FOR UPDATE',
          [userData.role]
        );
        
        if (roleResult.rows.length === 0) {
          throw new Error('INVALID_ROLE');
        }

        // 4. Validate college exists
        const collegeResult = await client.query(
          'SELECT id FROM college WHERE id = $1 FOR UPDATE',
          [userData.college_id]
        );
        
        if (collegeResult.rows.length === 0) {
          throw new Error('INVALID_COLLEGE');
        }

        // 5. Generate and hash password
        const password = this.generatePassword();
        const hashedPassword = await bcrypt.hash(password, 10);

        // 6. Create user record
        const userResult = await client.query(`
          INSERT INTO "user" (mobile, name, role_id, password, college_id, created_on)
          VALUES ($1, $2, $3, $4, $5, NOW())
          RETURNING *
        `, [
          userData.mobile.trim(),
          userData.name.trim(),
          roleResult.rows[0].id,
          hashedPassword,
          userData.college_id
        ]);

        const createdUser = userResult.rows[0];
        return { ...createdUser, role: userData.role, password };
      });
    } catch (error) {
      throw new Error(`Service error in createUser: ${error.message}`);
    }
  }

  async bulkCreateUsers(records) {
    try {
      const created = [];
      const roleCache = new Map();

      for (const rec of records) {
        const { username, mobilenumber, role } = rec;
        if (!username || !mobilenumber || !role) continue;

        // Check for existing mobile
        const existing = await userRepository.findByMobile(mobilenumber);
        if (existing) continue; // Skip if user already exists

        // Get or cache role_id
        let roleId;
        if (roleCache.has(role)) {
          roleId = roleCache.get(role);
        } else {
          const roleData = await userRepository.findRoleByName(role);
          if (roleData) {
            roleId = roleData.id;
            roleCache.set(role, roleId);
          } else {
            continue; // Skip if role doesn't exist
          }
        }

        // Generate and hash password
        const password = this.generatePassword();
        const hashedPassword = await bcrypt.hash(password, 10);

        // Prepare data for repository
        const userData = {
          mobile: mobilenumber.trim(),
          name: username.trim(),
          role_id: roleId,
          password: hashedPassword,
          college_id: 1 // Default college_id, could be made configurable
        };

        const createdUser = await userRepository.create(userData);
        created.push({ username, mobilenumber, role, password });
      }

      return { created };
    } catch (error) {
      throw new Error(`Service error in bulkCreateUsers: ${error.message}`);
    }
  }

  async changePassword(mobile, name, role, oldPassword, newPassword, currentUser) {
    try {
      // Business logic validation
      if (!mobile || !name || !oldPassword || !newPassword || !role) {
        throw new Error('MISSING_REQUIRED_FIELDS');
      }

      // Find user in DB
      const user = await userRepository.findByMobileAndNameAndRole(mobile, name, role);
      if (!user) {
        throw new Error('USER_NOT_FOUND');
      }

      // Authorization check
      if (
        currentUser.role !== 'admin' &&
        (currentUser.mobile !== user.mobile || currentUser.name !== user.name)
      ) {
        throw new Error('UNAUTHORIZED_PASSWORD_CHANGE');
      }

      // If not admin, check old password
      if (currentUser.role !== 'admin') {
        const passwordMatch = await bcrypt.compare(oldPassword, user.password);
        if (!passwordMatch) {
          throw new Error('INVALID_OLD_PASSWORD');
        }
      }

      // Update password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      const success = await userRepository.updatePassword(user.id, hashedPassword);
      
      if (!success) {
        throw new Error('PASSWORD_UPDATE_FAILED');
      }

      return { message: 'Password changed successfully' };
    } catch (error) {
      throw new Error(`Service error in changePassword: ${error.message}`);
    }
  }

  async getAllUsers() {
    try {
      return await userRepository.findAll();
    } catch (error) {
      throw new Error(`Service error in getAllUsers: ${error.message}`);
    }
  }

  async getUserById(id) {
    try {
      const user = await userRepository.findById(id);
      if (!user) {
        throw new Error('USER_NOT_FOUND');
      }
      return user;
    } catch (error) {
      throw new Error(`Service error in getUserById: ${error.message}`);
    }
  }

  async getUsersByCollege(collegeId) {
    try {
      return await userRepository.findByCollegeId(collegeId);
    } catch (error) {
      throw new Error(`Service error in getUsersByCollege: ${error.message}`);
    }
  }

  async getUsersByRole(roleId) {
    try {
      return await userRepository.findByRoleId(roleId);
    } catch (error) {
      throw new Error(`Service error in getUsersByRole: ${error.message}`);
    }
  }

  async updateUser(userId, updateData) {
    try {
      // Business logic validation
      if (updateData.mobile !== undefined && (!updateData.mobile || updateData.mobile.trim() === '')) {
        throw new Error('MOBILE_REQUIRED');
      }

      if (updateData.name !== undefined && (!updateData.name || updateData.name.trim() === '')) {
        throw new Error('NAME_REQUIRED');
      }

      // Check if user exists
      const existing = await userRepository.findById(userId);
      if (!existing) {
        throw new Error('USER_NOT_FOUND');
      }

      // Check for duplicate mobile if mobile is being updated
      if (updateData.mobile && updateData.mobile.trim() !== existing.mobile) {
        const duplicate = await userRepository.findByMobile(updateData.mobile.trim());
        if (duplicate) {
          throw new Error('DUPLICATE_MOBILE');
        }
      }

      // Normalize update data
      const normalizedData = {};
      if (updateData.mobile !== undefined) {
        normalizedData.mobile = updateData.mobile.trim();
      }
      if (updateData.name !== undefined) {
        normalizedData.name = updateData.name.trim();
      }
      if (updateData.college_id !== undefined) {
        normalizedData.college_id = updateData.college_id;
      }
      if (updateData.role_id !== undefined) {
        normalizedData.role_id = updateData.role_id;
      }
      if (updateData.is_active !== undefined) {
        normalizedData.is_active = updateData.is_active;
      }
      if (updateData.img_url !== undefined) {
        normalizedData.img_url = updateData.img_url;
      }

      return await userRepository.update(userId, normalizedData);
    } catch (error) {
      throw new Error(`Service error in updateUser: ${error.message}`);
    }
  }

  async deleteUser(userId) {
    try {
      // Check if user exists
      const existing = await userRepository.findById(userId);
      if (!existing) {
        throw new Error('USER_NOT_FOUND');
      }

      return await userRepository.delete(userId);
    } catch (error) {
      throw new Error(`Service error in deleteUser: ${error.message}`);
    }
  }

  async searchUsersByName(name) {
    try {
      if (!name || name.trim() === '') {
        return await userRepository.findAll();
      }
      return await userRepository.searchByName(name.trim());
    } catch (error) {
      throw new Error(`Service error in searchUsersByName: ${error.message}`);
    }
  }

  async searchUsersByMobile(mobile) {
    try {
      if (!mobile || mobile.trim() === '') {
        return await userRepository.findAll();
      }
      return await userRepository.searchByMobile(mobile.trim());
    } catch (error) {
      throw new Error(`Service error in searchUsersByMobile: ${error.message}`);
    }
  }
}

module.exports = new UserService(); 