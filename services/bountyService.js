const bountyRepository = require('../repositories/bountyRepository');
const TransactionUtils = require('../utils/transactionUtils');

class BountyService {
  async getAllBounties(queryParams) {
    try {
      const { name, venue, type, date_from, date_to, status, limit, offset, sort_by, order } = queryParams;

      // Handle special status filters
      if (status === 'upcoming') {
        return await bountyRepository.findUpcoming();
      } else if (status === 'ongoing') {
        return await bountyRepository.findOngoing();
      } else if (status === 'completed') {
        // This requires user context, handled in controller
        throw new Error('COMPLETED_STATUS_REQUIRES_USER');
      } else if (status === 'trending') {
        return await bountyRepository.findTrending();
      }

      // Prepare filters
      const filters = {};
      if (name) filters.name = name;
      if (venue) filters.venue = venue;
      if (type) filters.type = type;
      if (date_from) filters.date_from = date_from;
      if (date_to) filters.date_to = date_to;

      // Prepare pagination
      const pagination = {};
      if (limit) pagination.limit = parseInt(limit, 10);
      if (offset) pagination.offset = parseInt(offset, 10);

      // Prepare sorting
      const sorting = {};
      if (sort_by) sorting.sortBy = sort_by;
      if (order) sorting.order = order;

      return await bountyRepository.findAll(filters, pagination, sorting);
    } catch (error) {
      throw new Error(`Service error in getAllBounties: ${error.message}`);
    }
  }

  async getBountyById(id) {
    try {
      const bounty = await bountyRepository.findById(id);
      if (!bounty) {
        throw new Error('BOUNTY_NOT_FOUND');
      }
      return bounty;
    } catch (error) {
      throw new Error(`Service error in getBountyById: ${error.message}`);
    }
  }

  async createBounty(bountyData) {
    try {
      return await TransactionUtils.withTransaction(async (client) => {
        // 1. Business logic validation
        if (!bountyData.name || bountyData.name.trim() === '') {
          throw new Error('NAME_REQUIRED');
        }

        if (bountyData.alloted_points !== undefined && bountyData.alloted_points < 0) {
          throw new Error('INVALID_POINTS');
        }

        if (bountyData.alloted_berries !== undefined && bountyData.alloted_berries < 0) {
          throw new Error('INVALID_BERRIES');
        }

        if (bountyData.capacity !== undefined && bountyData.capacity < 0) {
          throw new Error('INVALID_CAPACITY');
        }

        if (bountyData.scheduled_date && new Date(bountyData.scheduled_date) < new Date()) {
          throw new Error('INVALID_SCHEDULED_DATE');
        }

        // 2. Check for duplicate bounty name (with lock)
        if (bountyData.name) {
          const existingBounty = await client.query(
            'SELECT id FROM bounty WHERE name = $1 FOR UPDATE',
            [bountyData.name.trim()]
          );
          
          if (existingBounty.rows.length > 0) {
            throw new Error('DUPLICATE_BOUNTY_NAME');
          }
        }

        // 3. Create bounty record
        const bountyResult = await client.query(`
          INSERT INTO bounty (
            name, description, type, img_url, image_hash, 
            alloted_points, alloted_berries, scheduled_date, 
            venue, capacity, is_active, created_by, modified_by, created_on
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
          RETURNING *
        `, [
          bountyData.name.trim(),
          bountyData.description?.trim() || null,
          bountyData.type?.trim() || null,
          bountyData.img_url || null,
          bountyData.image_hash || null,
          bountyData.alloted_points || 0,
          bountyData.alloted_berries || 0,
          bountyData.scheduled_date || null,
          bountyData.venue?.trim() || null,
          bountyData.capacity || null,
          bountyData.is_active !== undefined ? bountyData.is_active : true,
          bountyData.created_by || null,
          bountyData.modified_by || null
        ]);

        return bountyResult.rows[0];
      });
    } catch (error) {
      throw new Error(`Service error in createBounty: ${error.message}`);
    }
  }

  async updateBounty(id, updateData) {
    try {
      return await TransactionUtils.withTransaction(async (client) => {
        // 1. Lock and validate bounty exists
        const existingBounty = await TransactionUtils.findAndLockRow(client, 'bounty', 'id', id);
        
        // 2. Business logic validation
        if (updateData.name !== undefined && (updateData.name.trim() === '')) {
          throw new Error('NAME_REQUIRED');
        }

        if (updateData.alloted_points !== undefined && updateData.alloted_points < 0) {
          throw new Error('INVALID_POINTS');
        }

        if (updateData.alloted_berries !== undefined && updateData.alloted_berries < 0) {
          throw new Error('INVALID_BERRIES');
        }

        if (updateData.capacity !== undefined && updateData.capacity < 0) {
          throw new Error('INVALID_CAPACITY');
        }

        if (updateData.scheduled_date && new Date(updateData.scheduled_date) < new Date()) {
          throw new Error('INVALID_SCHEDULED_DATE');
        }

        // 3. Check for duplicate name if name is being updated
        if (updateData.name && updateData.name !== existingBounty.name) {
          const duplicateBounty = await client.query(
            'SELECT id FROM bounty WHERE name = $1 AND id != $2 FOR UPDATE',
            [updateData.name.trim(), id]
          );
          
          if (duplicateBounty.rows.length > 0) {
            throw new Error('DUPLICATE_BOUNTY_NAME');
          }
        }

        // 4. Prepare update data
        const updateFields = {};
        if (updateData.name !== undefined) updateFields.name = updateData.name.trim();
        if (updateData.description !== undefined) updateFields.description = updateData.description?.trim() || null;
        if (updateData.type !== undefined) updateFields.type = updateData.type?.trim() || null;
        if (updateData.img_url !== undefined) updateFields.img_url = updateData.img_url;
        if (updateData.image_hash !== undefined) updateFields.image_hash = updateData.image_hash;
        if (updateData.alloted_points !== undefined) updateFields.alloted_points = updateData.alloted_points;
        if (updateData.alloted_berries !== undefined) updateFields.alloted_berries = updateData.alloted_berries;
        if (updateData.scheduled_date !== undefined) updateFields.scheduled_date = updateData.scheduled_date;
        if (updateData.venue !== undefined) updateFields.venue = updateData.venue?.trim() || null;
        if (updateData.capacity !== undefined) updateFields.capacity = updateData.capacity;
        if (updateData.is_active !== undefined) updateFields.is_active = updateData.is_active;
        if (updateData.modified_by !== undefined) updateFields.modified_by = updateData.modified_by;
        
        updateFields.modified_on = new Date();

        // 5. Update with optimistic locking
        const updatedBounty = await TransactionUtils.updateWithVersion(
          client, 
          'bounty', 
          updateFields, 
          'id', 
          id, 
          existingBounty.version || 0
        );

        return updatedBounty;
      });
    } catch (error) {
      if (error.message === 'CONCURRENT_MODIFICATION') {
        throw new Error('BOUNTY_WAS_MODIFIED_BY_ANOTHER_USER');
      }
      throw new Error(`Service error in updateBounty: ${error.message}`);
    }
  }

  async deleteBounty(id) {
    try {
      // Check if bounty exists
      const existing = await bountyRepository.findById(id);
      if (!existing) {
        throw new Error('BOUNTY_NOT_FOUND');
      }

      return await bountyRepository.delete(id);
    } catch (error) {
      throw new Error(`Service error in deleteBounty: ${error.message}`);
    }
  }

  async getCompletedBountiesByUser(userId) {
    try {
      return await bountyRepository.findCompletedByUser(userId);
    } catch (error) {
      throw new Error(`Service error in getCompletedBountiesByUser: ${error.message}`);
    }
  }

  async getRegisteredBounties(userId) {
    try {
      return await bountyRepository.getRegisteredBounties(userId);
    } catch (error) {
      throw new Error(`Service error in getRegisteredBounties: ${error.message}`);
    }
  }

  async searchBountiesByName(name) {
    try {
      if (!name || name.trim() === '') {
        return await bountyRepository.findAll();
      }
      return await bountyRepository.searchByName(name.trim());
    } catch (error) {
      throw new Error(`Service error in searchBountiesByName: ${error.message}`);
    }
  }

  async searchBountiesByType(type) {
    try {
      if (!type || type.trim() === '') {
        return await bountyRepository.findAll();
      }
      return await bountyRepository.findByType(type.trim());
    } catch (error) {
      throw new Error(`Service error in searchBountiesByType: ${error.message}`);
    }
  }

  async searchBountiesByVenue(venue) {
    try {
      if (!venue || venue.trim() === '') {
        return await bountyRepository.findAll();
      }
      return await bountyRepository.findByVenue(venue.trim());
    } catch (error) {
      throw new Error(`Service error in searchBountiesByVenue: ${error.message}`);
    }
  }

  async getBountiesWithRegistrationStatus(userId) {
    try {
      return await bountyRepository.findWithRegistrationStatus(userId);
    } catch (error) {
      throw new Error(`Service error in getBountiesWithRegistrationStatus: ${error.message}`);
    }
  }

  async searchAndFilterBounties(filters, userId = null) {
    try {
      const { name, venue, type, date_from, date_to, status } = filters;

      // Handle special status filters
      if (status === 'upcoming') {
        if (userId) {
          return await bountyRepository.findWithRegistrationStatus(userId);
        } else {
          return await bountyRepository.findUpcoming();
        }
      } else if (status === 'ongoing') {
        return await bountyRepository.findOngoing();
      } else if (status === 'completed') {
        if (!userId) {
          throw new Error('USER_ID_REQUIRED_FOR_COMPLETED');
        }
        return await bountyRepository.findCompletedByUser(userId);
      } else if (status === 'trending') {
        return await bountyRepository.findTrending();
      }

      // Prepare filters for general search
      const filterParams = {};
      if (name) filterParams.name = name;
      if (venue) filterParams.venue = venue;
      if (type) filterParams.type = type;
      if (date_from) filterParams.date_from = date_from;
      if (date_to) filterParams.date_to = date_to;

      return await bountyRepository.findAll(filterParams);
    } catch (error) {
      throw new Error(`Service error in searchAndFilterBounties: ${error.message}`);
    }
  }
}

module.exports = new BountyService(); 