const roleRepository = require('../repositories/roleRepository');

class RoleService {
  async getAllRoles() {
    try {
      return await roleRepository.findAll();
    } catch (error) {
      throw new Error(`Service error in getAllRoles: ${error.message}`);
    }
  }

  async getRoleById(id) {
    try {
      const role = await roleRepository.findById(id);
      if (!role) {
        throw new Error('ROLE_NOT_FOUND');
      }
      return role;
    } catch (error) {
      throw new Error(`Service error in getRoleById: ${error.message}`);
    }
  }

  async createRole(roleData) {
    try {
      // Business logic validation
      if (!roleData.name || roleData.name.trim() === '') {
        throw new Error('NAME_REQUIRED');
      }

      // Check for duplicate name
      const existing = await roleRepository.findByName(roleData.name.trim());
      if (existing) {
        throw new Error('DUPLICATE_NAME');
      }

      // Normalize data
      const normalizedData = {
        name: roleData.name.trim()
      };

      return await roleRepository.create(normalizedData);
    } catch (error) {
      throw new Error(`Service error in createRole: ${error.message}`);
    }
  }

  async updateRole(id, updateData) {
    try {
      // Business logic validation
      if (!updateData.name || updateData.name.trim() === '') {
        throw new Error('NAME_REQUIRED');
      }

      // Check if role exists
      const existing = await roleRepository.findById(id);
      if (!existing) {
        throw new Error('ROLE_NOT_FOUND');
      }

      // Check for duplicate name if name is being updated
      if (updateData.name.trim() !== existing.name) {
        const duplicate = await roleRepository.findByName(updateData.name.trim());
        if (duplicate) {
          throw new Error('DUPLICATE_NAME');
        }
      }

      // Normalize update data
      const normalizedData = {
        name: updateData.name.trim()
      };

      return await roleRepository.update(id, normalizedData);
    } catch (error) {
      throw new Error(`Service error in updateRole: ${error.message}`);
    }
  }

  async patchRole(id, patchData) {
    try {
      // Business logic validation
      if (patchData.name !== undefined && (!patchData.name || patchData.name.trim() === '')) {
        throw new Error('NAME_REQUIRED');
      }

      // Check if role exists
      const existing = await roleRepository.findById(id);
      if (!existing) {
        throw new Error('ROLE_NOT_FOUND');
      }

      // Check for duplicate name if name is being updated
      if (patchData.name && patchData.name.trim() !== existing.name) {
        const duplicate = await roleRepository.findByName(patchData.name.trim());
        if (duplicate) {
          throw new Error('DUPLICATE_NAME');
        }
      }

      // Normalize patch data
      const normalizedData = {};
      if (patchData.name !== undefined) {
        normalizedData.name = patchData.name.trim();
      }

      return await roleRepository.patch(id, normalizedData);
    } catch (error) {
      throw new Error(`Service error in patchRole: ${error.message}`);
    }
  }

  async deleteRole(id) {
    try {
      // Check if role exists
      const existing = await roleRepository.findById(id);
      if (!existing) {
        throw new Error('ROLE_NOT_FOUND');
      }

      // Check if role is being used by any users
      // This would require a check against the user table
      // For now, we'll allow deletion but this could be enhanced

      return await roleRepository.delete(id);
    } catch (error) {
      throw new Error(`Service error in deleteRole: ${error.message}`);
    }
  }

  async searchRoles(name) {
    try {
      if (!name || name.trim() === '') {
        return await roleRepository.findAll();
      }
      return await roleRepository.searchByName(name.trim());
    } catch (error) {
      throw new Error(`Service error in searchRoles: ${error.message}`);
    }
  }
}

module.exports = new RoleService(); 