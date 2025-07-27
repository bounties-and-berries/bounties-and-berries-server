const bountyParticipationService = require('../services/bountyParticipationService');
const bountyService = require('../services/bountyService');
const userService = require('../services/userService');

// CREATE
exports.createParticipation = async (req, res) => {
  try {
    const { user_id, bounty_id, points_earned, berries_earned, status } = req.body;
    
    const participationData = {
      user_id,
      bounty_id,
      points_earned,
      berries_earned,
      status,
      created_by: req.user.id,
      modified_by: req.user.id
    };

    const participation = await bountyParticipationService.createParticipation(participationData);
    res.status(201).json({ message: 'Participation created', participation });
  } catch (err) {
    if (err.message.includes('USER_ID_AND_BOUNTY_ID_REQUIRED')) {
      res.status(400).json({ error: 'User ID and Bounty ID are required' });
    } else if (err.message.includes('USER_NOT_FOUND')) {
      res.status(404).json({ error: 'User not found' });
    } else if (err.message.includes('BOUNTY_NOT_FOUND')) {
      res.status(404).json({ error: 'Bounty not found' });
    } else if (err.message.includes('BOUNTY_NOT_ACTIVE')) {
      res.status(400).json({ error: 'Bounty is not active' });
    } else if (err.message.includes('BOUNTY_EXPIRED')) {
      res.status(400).json({ error: 'Bounty has expired' });
    } else if (err.message.includes('DUPLICATE_PARTICIPATION')) {
      res.status(409).json({ error: 'User is already participating in this bounty' });
    } else if (err.message.includes('INVALID_POINTS_EARNED')) {
      res.status(400).json({ error: 'Points earned cannot be negative' });
    } else if (err.message.includes('INVALID_BERRIES_EARNED')) {
      res.status(400).json({ error: 'Berries earned cannot be negative' });
    } else {
      res.status(500).json({ error: 'Failed to create participation', details: err.message });
    }
  }
};

// READ (list all)
exports.listParticipations = async (req, res) => {
  try {
    const participations = await bountyParticipationService.getAllParticipations();
    res.json(participations);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch participations', details: err.message });
  }
};

// UPDATE
exports.updateParticipation = async (req, res) => {
  try {
    const { id } = req.params;
    const { points_earned, berries_earned, status } = req.body;
    
    const updateData = {
      points_earned,
      berries_earned,
      status,
      modified_by: req.user.id
    };

    const participation = await bountyParticipationService.updateParticipation(id, updateData, req.user.id);
    res.json({ message: 'Participation updated', participation });
  } catch (err) {
    if (err.message.includes('PARTICIPATION_NOT_FOUND')) {
      res.status(404).json({ error: 'Participation not found' });
    } else if (err.message.includes('INVALID_POINTS_EARNED')) {
      res.status(400).json({ error: 'Points earned cannot be negative' });
    } else if (err.message.includes('INVALID_BERRIES_EARNED')) {
      res.status(400).json({ error: 'Berries earned cannot be negative' });
    } else if (err.message.includes('INVALID_STATUS')) {
      res.status(400).json({ error: 'Invalid status provided' });
    } else {
      res.status(500).json({ error: 'Failed to update participation', details: err.message });
    }
  }
};

// DELETE (hard delete)
exports.deleteParticipation = async (req, res) => {
  try {
    const { id } = req.params;
    const participation = await bountyParticipationService.deleteParticipation(id);
    res.json({ message: 'Participation deleted', participation });
  } catch (err) {
    if (err.message.includes('PARTICIPATION_NOT_FOUND')) {
      res.status(404).json({ error: 'Participation not found' });
    } else {
      res.status(500).json({ error: 'Failed to delete participation', details: err.message });
    }
  }
};

// 1. Admin/Faculty: View all students in a specific bounty
exports.getBountyParticipants = async (req, res) => {
  try {
    const bountyId = req.params.bountyId;
    
    // Get bounty info
    const bounty = await bountyService.getBountyById(bountyId);
    
    // Get participants
    const participants = await bountyParticipationService.getBountyParticipants(bountyId);
    
    res.json({
      bounty_id: bounty.id,
      bounty_name: bounty.name,
      participants
    });
  } catch (err) {
    if (err.message.includes('BOUNTY_NOT_FOUND')) {
      res.status(404).json({ error: 'Bounty not found' });
    } else {
      res.status(500).json({ error: 'Failed to fetch bounty participants', details: err.message });
    }
  }
};

// 2. Student: View their own bounty participation
exports.getMyParticipations = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user info
    const user = await userService.getUserById(userId);
    
    // Get participations with bounty info
    const participations = await bountyParticipationService.getUserParticipations(userId);
    
    res.json({
      user_id: user.id,
      student_name: user.name,
      participations
    });
  } catch (err) {
    if (err.message.includes('USER_NOT_FOUND')) {
      res.status(404).json({ error: 'User not found' });
    } else {
      res.status(500).json({ error: 'Failed to fetch user participations', details: err.message });
    }
  }
};

// Get participations by user
exports.getParticipationsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const participations = await bountyParticipationService.getParticipationsByUser(userId);
    res.json(participations);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch participations by user', details: err.message });
  }
};

// Get participations by bounty
exports.getParticipationsByBounty = async (req, res) => {
  try {
    const { bountyId } = req.params;
    const participations = await bountyParticipationService.getParticipationsByBounty(bountyId);
    res.json(participations);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch participations by bounty', details: err.message });
  }
};

// Get participations by status
exports.getParticipationsByStatus = async (req, res) => {
  try {
    const { status } = req.params;
    const participations = await bountyParticipationService.getParticipationsByStatus(status);
    res.json(participations);
  } catch (err) {
    if (err.message.includes('INVALID_STATUS')) {
      res.status(400).json({ error: 'Invalid status provided' });
    } else {
      res.status(500).json({ error: 'Failed to fetch participations by status', details: err.message });
    }
  }
};

// Get participations by user and status
exports.getParticipationsByUserAndStatus = async (req, res) => {
  try {
    const { userId, status } = req.params;
    const participations = await bountyParticipationService.getParticipationsByUserAndStatus(userId, status);
    res.json(participations);
  } catch (err) {
    if (err.message.includes('INVALID_STATUS')) {
      res.status(400).json({ error: 'Invalid status provided' });
    } else {
      res.status(500).json({ error: 'Failed to fetch participations', details: err.message });
    }
  }
};

// Get completed participations by user
exports.getCompletedParticipationsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const participations = await bountyParticipationService.getCompletedParticipationsByUser(userId);
    res.json(participations);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch completed participations', details: err.message });
  }
};

// Get registered participations by user
exports.getRegisteredParticipationsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const participations = await bountyParticipationService.getRegisteredParticipationsByUser(userId);
    res.json(participations);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch registered participations', details: err.message });
  }
};

// Get total earnings by user
exports.getTotalEarningsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const earnings = await bountyParticipationService.getTotalEarningsByUser(userId);
    res.json({
      user_id: earnings.user_id,
      total_points: earnings.total_points,
      total_berries_earned: earnings.total_berries_earned,
      total_berries_spent: earnings.total_berries_spent,
      net_berries: earnings.net_berries,
      summary: {
        points: `${earnings.total_points} points earned`,
        berries: `${earnings.net_berries} berries available (${earnings.total_berries_earned} earned - ${earnings.total_berries_spent} spent)`
      }
    });
  } catch (err) {
    if (err.message.includes('USER_NOT_FOUND')) {
      res.status(404).json({ error: 'User not found' });
    } else {
      res.status(500).json({ error: 'Failed to fetch total earnings', details: err.message });
    }
  }
};

// Get bounty stats
exports.getBountyStats = async (req, res) => {
  try {
    const { bountyId } = req.params;
    const stats = await bountyParticipationService.getBountyStats(bountyId);
    res.json(stats);
  } catch (err) {
    if (err.message.includes('BOUNTY_NOT_FOUND')) {
      res.status(404).json({ error: 'Bounty not found' });
    } else {
      res.status(500).json({ error: 'Failed to fetch bounty stats', details: err.message });
    }
  }
};

// Search participations
exports.searchParticipations = async (req, res) => {
  try {
    const filters = req.query;
    const participations = await bountyParticipationService.searchParticipations(filters);
    res.json(participations);
  } catch (err) {
    res.status(500).json({ error: 'Failed to search participations', details: err.message });
  }
};

// Check user participation
exports.checkUserParticipation = async (req, res) => {
  try {
    const { userId, bountyId } = req.params;
    const isParticipating = await bountyParticipationService.checkUserParticipation(userId, bountyId);
    res.json({ isParticipating });
  } catch (err) {
    res.status(500).json({ error: 'Failed to check user participation', details: err.message });
  }
};

// Register for bounty
exports.registerForBounty = async (req, res) => {
  try {
    const { bountyId } = req.params;
    const userId = req.user.id;
    
    const result = await bountyParticipationService.registerForBounty(userId, bountyId, userId);
    
    res.status(201).json({
      message: 'Successfully registered for bounty',
      participation: result.participation,
      registeredBounties: result.registeredBounties
    });
  } catch (err) {
    if (err.message.includes('USER_NOT_FOUND')) {
      res.status(404).json({ error: 'User not found' });
    } else if (err.message.includes('BOUNTY_NOT_FOUND')) {
      res.status(404).json({ error: 'Bounty not found' });
    } else if (err.message.includes('BOUNTY_NOT_ACTIVE')) {
      res.status(400).json({ error: 'Bounty is not active' });
    } else if (err.message.includes('BOUNTY_EXPIRED')) {
      res.status(400).json({ error: 'Bounty has expired' });
    } else if (err.message.includes('DUPLICATE_PARTICIPATION')) {
      res.status(409).json({ error: 'Already registered for this bounty' });
    } else {
      res.status(500).json({ error: 'Failed to register for bounty', details: err.message });
    }
  }
};

// Complete bounty
exports.completeBounty = async (req, res) => {
  try {
    const { bountyId } = req.params;
    const userId = req.user.id;
    const { points_earned, berries_earned } = req.body;
    
    const participation = await bountyParticipationService.completeBounty(
      userId, 
      bountyId, 
      points_earned || 0, 
      berries_earned || 0, 
      userId
    );
    
    res.json({
      message: 'Bounty completed successfully',
      participation
    });
  } catch (err) {
    if (err.message.includes('PARTICIPATION_NOT_FOUND')) {
      res.status(404).json({ error: 'Participation not found' });
    } else if (err.message.includes('BOUNTY_ALREADY_COMPLETED')) {
      res.status(400).json({ error: 'Bounty is already completed' });
    } else if (err.message.includes('INVALID_POINTS_EARNED')) {
      res.status(400).json({ error: 'Points earned cannot be negative' });
    } else if (err.message.includes('INVALID_BERRIES_EARNED')) {
      res.status(400).json({ error: 'Berries earned cannot be negative' });
    } else {
      res.status(500).json({ error: 'Failed to complete bounty', details: err.message });
    }
  }
};

// Cancel participation
exports.cancelParticipation = async (req, res) => {
  try {
    const { bountyId } = req.params;
    const userId = req.user.id;
    
    const participation = await bountyParticipationService.cancelParticipation(userId, bountyId, userId);
    
    res.json({
      message: 'Participation cancelled successfully',
      participation
    });
  } catch (err) {
    if (err.message.includes('PARTICIPATION_NOT_FOUND')) {
      res.status(404).json({ error: 'Participation not found' });
    } else if (err.message.includes('CANNOT_CANCEL_COMPLETED_BOUNTY')) {
      res.status(400).json({ error: 'Cannot cancel a completed bounty' });
    } else {
      res.status(500).json({ error: 'Failed to cancel participation', details: err.message });
    }
  }
}; 

// Get net berries by user
exports.getNetBerriesByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const netBerries = await bountyParticipationService.getNetBerriesByUser(userId);
    res.json({
      user_id: userId,
      total_earned: netBerries.total_earned,
      total_spent: netBerries.total_spent,
      net_berries: netBerries.net_berries,
      summary: `${netBerries.net_berries} berries available (${netBerries.total_earned} earned - ${netBerries.total_spent} spent)`
    });
  } catch (err) {
    if (err.message.includes('USER_NOT_FOUND')) {
      res.status(404).json({ error: 'User not found' });
    } else {
      res.status(500).json({ error: 'Failed to fetch net berries', details: err.message });
    }
  }
}; 