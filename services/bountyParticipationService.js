const bountyParticipationRepository = require('../repositories/bountyParticipationRepository');
const bountyRepository = require('../repositories/bountyRepository');
const userRepository = require('../repositories/userRepository');
const TransactionUtils = require('../utils/transactionUtils');

class BountyParticipationService {
  async getAllParticipations() {
    try {
      return await bountyParticipationRepository.findAll();
    } catch (error) {
      throw new Error(`Service error in getAllParticipations: ${error.message}`);
    }
  }

  async getParticipationById(id) {
    try {
      const participation = await bountyParticipationRepository.findById(id);
      if (!participation) {
        throw new Error('PARTICIPATION_NOT_FOUND');
      }
      return participation;
    } catch (error) {
      throw new Error(`Service error in getParticipationById: ${error.message}`);
    }
  }

  async createParticipation(participationData) {
    try {
      // Business logic validation
      if (!participationData.user_id || !participationData.bounty_id) {
        throw new Error('USER_ID_AND_BOUNTY_ID_REQUIRED');
      }

      // Check if user exists
      const user = await userRepository.findById(participationData.user_id);
      if (!user) {
        throw new Error('USER_NOT_FOUND');
      }

      // Check if bounty exists
      const bounty = await bountyRepository.findById(participationData.bounty_id);
      if (!bounty) {
        throw new Error('BOUNTY_NOT_FOUND');
      }

      // Check if bounty is active
      if (!bounty.is_active) {
        throw new Error('BOUNTY_NOT_ACTIVE');
      }

      // Check if bounty is not expired
      if (bounty.scheduled_date && new Date(bounty.scheduled_date) < new Date()) {
        throw new Error('BOUNTY_EXPIRED');
      }

      // Check for duplicate participation
      const existing = await bountyParticipationRepository.findByUserAndBounty(
        participationData.user_id, 
        participationData.bounty_id
      );
      if (existing) {
        throw new Error('DUPLICATE_PARTICIPATION');
      }

      // Validate points and berries
      if (participationData.points_earned !== undefined && participationData.points_earned < 0) {
        throw new Error('INVALID_POINTS_EARNED');
      }

      if (participationData.berries_earned !== undefined && participationData.berries_earned < 0) {
        throw new Error('INVALID_BERRIES_EARNED');
      }

      // Normalize data
      const normalizedData = {
        user_id: participationData.user_id,
        bounty_id: participationData.bounty_id,
        points_earned: participationData.points_earned || 0,
        berries_earned: participationData.berries_earned || 0,
        status: participationData.status || 'registered',
        created_by: participationData.created_by,
        modified_by: participationData.modified_by || participationData.created_by
      };

      return await bountyParticipationRepository.create(normalizedData);
    } catch (error) {
      throw new Error(`Service error in createParticipation: ${error.message}`);
    }
  }

  async updateParticipation(id, updateData, userId) {
    try {
      // Check if participation exists
      const existing = await bountyParticipationRepository.findById(id);
      if (!existing) {
        throw new Error('PARTICIPATION_NOT_FOUND');
      }

      // Validate points and berries
      if (updateData.points_earned !== undefined && updateData.points_earned < 0) {
        throw new Error('INVALID_POINTS_EARNED');
      }

      if (updateData.berries_earned !== undefined && updateData.berries_earned < 0) {
        throw new Error('INVALID_BERRIES_EARNED');
      }

      // Validate status
      const validStatuses = ['registered', 'completed', 'cancelled', 'failed'];
      if (updateData.status && !validStatuses.includes(updateData.status)) {
        throw new Error('INVALID_STATUS');
      }

      // Normalize update data
      const normalizedData = {};
      if (updateData.points_earned !== undefined) {
        normalizedData.points_earned = updateData.points_earned;
      }
      if (updateData.berries_earned !== undefined) {
        normalizedData.berries_earned = updateData.berries_earned;
      }
      if (updateData.status !== undefined) {
        normalizedData.status = updateData.status;
      }
      if (updateData.modified_by !== undefined) {
        normalizedData.modified_by = updateData.modified_by;
      }

      // Update the participation
      const updatedParticipation = await bountyParticipationRepository.update(id, normalizedData);

      // Trigger achievement check if status changed to 'completed'
      if (updateData.status === 'completed' && existing.status !== 'completed') {
        try {
          const achievementService = require('./achievementService');
          const newAchievements = await achievementService.checkForNewAchievements(existing.user_id);
          
          // Log new achievements for debugging
          if (newAchievements.length > 0) {
            console.log(`User ${existing.user_id} earned ${newAchievements.length} new achievements:`, 
              newAchievements.map(a => a.name));
          }
        } catch (achievementError) {
          // Log achievement error but don't fail the main operation
          console.error('Error checking achievements:', achievementError);
        }
      }

      return updatedParticipation;
    } catch (error) {
      throw new Error(`Service error in updateParticipation: ${error.message}`);
    }
  }

  async deleteParticipation(id) {
    try {
      return await bountyParticipationRepository.delete(id);
    } catch (error) {
      throw new Error(`Service error in deleteParticipation: ${error.message}`);
    }
  }

  async getParticipationsByUser(userId) {
    try {
      return await bountyParticipationRepository.findByUserId(userId);
    } catch (error) {
      throw new Error(`Service error in getParticipationsByUser: ${error.message}`);
    }
  }

  async getParticipationsByBounty(bountyId) {
    try {
      return await bountyParticipationRepository.findByBountyId(bountyId);
    } catch (error) {
      throw new Error(`Service error in getParticipationsByBounty: ${error.message}`);
    }
  }

  async getParticipationsByStatus(status) {
    try {
      const validStatuses = ['registered', 'completed', 'cancelled', 'failed'];
      if (!validStatuses.includes(status)) {
        throw new Error('INVALID_STATUS');
      }
      return await bountyParticipationRepository.findByStatus(status);
    } catch (error) {
      throw new Error(`Service error in getParticipationsByStatus: ${error.message}`);
    }
  }

  async getParticipationsByUserAndStatus(userId, status) {
    try {
      const validStatuses = ['registered', 'completed', 'cancelled', 'failed'];
      if (!validStatuses.includes(status)) {
        throw new Error('INVALID_STATUS');
      }
      return await bountyParticipationRepository.findByUserAndStatus(userId, status);
    } catch (error) {
      throw new Error(`Service error in getParticipationsByUserAndStatus: ${error.message}`);
    }
  }

  async getCompletedParticipationsByUser(userId) {
    try {
      return await bountyParticipationRepository.findCompletedByUser(userId);
    } catch (error) {
      throw new Error(`Service error in getCompletedParticipationsByUser: ${error.message}`);
    }
  }

  async getRegisteredParticipationsByUser(userId) {
    try {
      return await bountyParticipationRepository.findRegisteredByUser(userId);
    } catch (error) {
      throw new Error(`Service error in getRegisteredParticipationsByUser: ${error.message}`);
    }
  }

  async getRegisteredBountyIds(userId) {
    try {
      return await bountyParticipationRepository.getRegisteredBountyIds(userId);
    } catch (error) {
      throw new Error(`Service error in getRegisteredBountyIds: ${error.message}`);
    }
  }

  async getBountyParticipants(bountyId) {
    try {
      // Check if bounty exists
      const bounty = await bountyRepository.findById(bountyId);
      if (!bounty) {
        throw new Error('BOUNTY_NOT_FOUND');
      }

      return await bountyParticipationRepository.getBountyParticipants(bountyId);
    } catch (error) {
      throw new Error(`Service error in getBountyParticipants: ${error.message}`);
    }
  }

  async getUserParticipations(userId) {
    try {
      // Check if user exists
      const user = await userRepository.findById(userId);
      if (!user) {
        throw new Error('USER_NOT_FOUND');
      }

      return await bountyParticipationRepository.getUserParticipations(userId);
    } catch (error) {
      throw new Error(`Service error in getUserParticipations: ${error.message}`);
    }
  }

  async getTotalEarningsByUser(userId) {
    try {
      // Check if user exists
      const user = await userRepository.findById(userId);
      if (!user) {
        throw new Error('USER_NOT_FOUND');
      }

      const earnings = await bountyParticipationRepository.getTotalEarningsByUser(userId);
      
      // Return the earnings with clear labels
      return {
        total_points: earnings.total_points,
        total_berries_earned: earnings.total_berries_earned,
        total_berries_spent: earnings.total_berries_spent,
        net_berries: earnings.net_berries,
        user_id: userId
      };
    } catch (error) {
      throw new Error(`Service error in getTotalEarningsByUser: ${error.message}`);
    }
  }

  async getBountyStats(bountyId) {
    try {
      // Check if bounty exists
      const bounty = await bountyRepository.findById(bountyId);
      if (!bounty) {
        throw new Error('BOUNTY_NOT_FOUND');
      }

      return await bountyParticipationRepository.getBountyStats(bountyId);
    } catch (error) {
      throw new Error(`Service error in getBountyStats: ${error.message}`);
    }
  }

  async searchParticipations(filters) {
    try {
      return await bountyParticipationRepository.searchParticipations(filters);
    } catch (error) {
      throw new Error(`Service error in searchParticipations: ${error.message}`);
    }
  }

  async checkUserParticipation(userId, bountyId) {
    try {
      return await bountyParticipationRepository.checkUserParticipation(userId, bountyId);
    } catch (error) {
      throw new Error(`Service error in checkUserParticipation: ${error.message}`);
    }
  }

  async registerForBounty(userId, bountyId, createdBy) {
    try {
      return await TransactionUtils.withTransaction(async (client) => {
        // 1. Lock and validate user exists
        const user = await TransactionUtils.findAndLockRow(client, 'user', 'id', userId);
        
        // 2. Lock and validate bounty exists and is active
        const bounty = await TransactionUtils.findAndLockRow(client, 'bounty', 'id', bountyId);
        
        // 3. Check if bounty is active
        if (!bounty.is_active) {
          throw new Error('BOUNTY_NOT_ACTIVE');
        }
        
        // 4. Check if bounty is not expired
        if (bounty.scheduled_date && new Date(bounty.scheduled_date) < new Date()) {
          throw new Error('BOUNTY_EXPIRED');
        }
        
        // 5. Check for duplicate participation (with lock)
        const existingParticipation = await client.query(
          'SELECT id FROM user_bounty_participation WHERE user_id = $1 AND bounty_id = $2 FOR UPDATE',
          [userId, bountyId]
        );
        
        if (existingParticipation.rows.length > 0) {
          throw new Error('DUPLICATE_PARTICIPATION');
        }
        
        // 6. Create participation record
        const participationResult = await client.query(`
          INSERT INTO user_bounty_participation 
          (user_id, bounty_id, points_earned, berries_earned, status, created_by, modified_by, created_on)
          VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
          RETURNING *
        `, [
          userId,
          bountyId,
          0, // points_earned
          0, // berries_earned
          'registered',
          createdBy,
          createdBy
        ]);
        
        const participation = participationResult.rows[0];
        
        // 7. Get updated registered bounties for the user (within transaction)
        const registeredBountiesResult = await client.query(
          'SELECT bounty_id FROM user_bounty_participation WHERE user_id = $1 AND status = $2',
          [userId, 'registered']
        );
        
        const registeredBounties = registeredBountiesResult.rows.map(row => row.bounty_id);
        
        return {
          participation,
          registeredBounties
        };
      });
    } catch (error) {
      throw new Error(`Service error in registerForBounty: ${error.message}`);
    }
  }

  async completeBounty(userId, bountyId, pointsEarned, berriesEarned, modifiedBy) {
    try {
      return await TransactionUtils.withTransaction(async (client) => {
        // 1. Lock and validate participation exists
        const participation = await client.query(
          'SELECT * FROM user_bounty_participation WHERE user_id = $1 AND bounty_id = $2 FOR UPDATE',
          [userId, bountyId]
        );
        
        if (participation.rows.length === 0) {
          throw new Error('PARTICIPATION_NOT_FOUND');
        }
        
        const participationRecord = participation.rows[0];
        
        // 2. Check if already completed
        if (participationRecord.status === 'completed') {
          throw new Error('BOUNTY_ALREADY_COMPLETED');
        }
        
        // 3. Validate earnings
        if (pointsEarned < 0) {
          throw new Error('INVALID_POINTS_EARNED');
        }
        
        if (berriesEarned < 0) {
          throw new Error('INVALID_BERRIES_EARNED');
        }
        
        // 4. Update participation with completion status
        const updateResult = await client.query(`
          UPDATE user_bounty_participation 
          SET points_earned = $1, berries_earned = $2, status = $3, modified_by = $4, modified_on = NOW()
          WHERE user_id = $5 AND bounty_id = $6
          RETURNING *
        `, [
          pointsEarned,
          berriesEarned,
          'completed',
          modifiedBy,
          userId,
          bountyId
        ]);
        
        return updateResult.rows[0];
      });
    } catch (error) {
      throw new Error(`Service error in completeBounty: ${error.message}`);
    }
  }

  async cancelParticipation(userId, bountyId, modifiedBy) {
    try {
      // Check if participation exists
      const participation = await bountyParticipationRepository.findByUserAndBounty(userId, bountyId);
      if (!participation) {
        throw new Error('PARTICIPATION_NOT_FOUND');
      }

      // Check if already completed
      if (participation.status === 'completed') {
        throw new Error('CANNOT_CANCEL_COMPLETED_BOUNTY');
      }

      // Update participation
      const updateData = {
        status: 'cancelled',
        modified_by: modifiedBy
      };

      return await bountyParticipationRepository.update(participation.id, updateData);
    } catch (error) {
      throw new Error(`Service error in cancelParticipation: ${error.message}`);
    }
  }

  async getNetBerriesByUser(userId) {
    try {
      // Check if user exists
      const user = await userRepository.findById(userId);
      if (!user) {
        throw new Error('USER_NOT_FOUND');
      }

      return await bountyParticipationRepository.getNetBerriesByUser(userId);
    } catch (error) {
      throw new Error(`Service error in getNetBerriesByUser: ${error.message}`);
    }
  }
}

module.exports = new BountyParticipationService(); 