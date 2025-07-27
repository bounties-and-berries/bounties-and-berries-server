const collegeRepository = require('../repositories/collegeRepository');

class CollegeService {
  async getAllColleges() {
    try {
      return await collegeRepository.findAll();
    } catch (error) {
      throw new Error(`Service error in getAllColleges: ${error.message}`);
    }
  }

  async getCollegeById(id) {
    try {
      const college = await collegeRepository.findById(id);
      if (!college) {
        throw new Error('COLLEGE_NOT_FOUND');
      }
      return college;
    } catch (error) {
      throw new Error(`Service error in getCollegeById: ${error.message}`);
    }
  }

  async createCollege(collegeData) {
    try {
      // Business logic validation
      if (!collegeData.name || collegeData.name.trim() === '') {
        throw new Error('NAME_REQUIRED');
      }

      if (collegeData.berries_purchased !== undefined && collegeData.berries_purchased < 0) {
        throw new Error('INVALID_BERRIES_AMOUNT');
      }

      // Check for duplicate name
      const existing = await collegeRepository.findByName(collegeData.name.trim());
      if (existing) {
        throw new Error('DUPLICATE_NAME');
      }

      // Normalize data
      const normalizedData = {
        name: collegeData.name.trim(),
        location: collegeData.location?.trim() || null,
        berries_purchased: collegeData.berries_purchased || 0
      };

      return await collegeRepository.create(normalizedData);
    } catch (error) {
      throw new Error(`Service error in createCollege: ${error.message}`);
    }
  }

  async updateCollege(id, updateData) {
    try {
      // Business logic validation
      if (updateData.name !== undefined && (!updateData.name || updateData.name.trim() === '')) {
        throw new Error('NAME_REQUIRED');
      }

      if (updateData.berries_purchased !== undefined && updateData.berries_purchased < 0) {
        throw new Error('INVALID_BERRIES_AMOUNT');
      }

      // Check if college exists
      const existing = await collegeRepository.findById(id);
      if (!existing) {
        throw new Error('COLLEGE_NOT_FOUND');
      }

      // Check for duplicate name if name is being updated
      if (updateData.name && updateData.name.trim() !== existing.name) {
        const duplicate = await collegeRepository.findByName(updateData.name.trim());
        if (duplicate) {
          throw new Error('DUPLICATE_NAME');
        }
      }

      // Normalize update data
      const normalizedData = {};
      if (updateData.name !== undefined) {
        normalizedData.name = updateData.name.trim();
      }
      if (updateData.location !== undefined) {
        normalizedData.location = updateData.location?.trim() || null;
      }
      if (updateData.berries_purchased !== undefined) {
        normalizedData.berries_purchased = updateData.berries_purchased;
      }
      if (updateData.is_active !== undefined) {
        normalizedData.is_active = updateData.is_active;
      }

      return await collegeRepository.update(id, normalizedData);
    } catch (error) {
      throw new Error(`Service error in updateCollege: ${error.message}`);
    }
  }

  async patchCollege(id, patchData) {
    try {
      // Business logic validation
      if (patchData.name !== undefined && (!patchData.name || patchData.name.trim() === '')) {
        throw new Error('NAME_REQUIRED');
      }

      if (patchData.berries_purchased !== undefined && patchData.berries_purchased < 0) {
        throw new Error('INVALID_BERRIES_AMOUNT');
      }

      // Check if college exists
      const existing = await collegeRepository.findById(id);
      if (!existing) {
        throw new Error('COLLEGE_NOT_FOUND');
      }

      // Check for duplicate name if name is being updated
      if (patchData.name && patchData.name.trim() !== existing.name) {
        const duplicate = await collegeRepository.findByName(patchData.name.trim());
        if (duplicate) {
          throw new Error('DUPLICATE_NAME');
        }
      }

      // Normalize patch data
      const normalizedData = {};
      if (patchData.name !== undefined) {
        normalizedData.name = patchData.name.trim();
      }
      if (patchData.location !== undefined) {
        normalizedData.location = patchData.location?.trim() || null;
      }
      if (patchData.berries_purchased !== undefined) {
        normalizedData.berries_purchased = patchData.berries_purchased;
      }
      if (patchData.is_active !== undefined) {
        normalizedData.is_active = patchData.is_active;
      }

      return await collegeRepository.update(id, normalizedData);
    } catch (error) {
      throw new Error(`Service error in patchCollege: ${error.message}`);
    }
  }

  async deleteCollege(id) {
    try {
      // Check if college exists
      const existing = await collegeRepository.findById(id);
      if (!existing) {
        throw new Error('COLLEGE_NOT_FOUND');
      }

      return await collegeRepository.delete(id);
    } catch (error) {
      throw new Error(`Service error in deleteCollege: ${error.message}`);
    }
  }

  async searchColleges(name) {
    try {
      if (!name || name.trim() === '') {
        return await collegeRepository.findAll();
      }
      return await collegeRepository.searchByName(name.trim());
    } catch (error) {
      throw new Error(`Service error in searchColleges: ${error.message}`);
    }
  }

  async getAllCollegesIncludingInactive() {
    try {
      return await collegeRepository.findAllIncludingInactive();
    } catch (error) {
      throw new Error(`Service error in getAllCollegesIncludingInactive: ${error.message}`);
    }
  }
}

module.exports = new CollegeService(); 