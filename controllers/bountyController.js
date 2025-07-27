const { getFileHash } = require('../fileHash');
const fs = require('fs');
const path = require('path');
const bountyService = require('../services/bountyService');

// Get all bounties
exports.getAllBounties = async (req, res) => {
  try {
    const queryParams = req.query;
    const bounties = await bountyService.getAllBounties(queryParams);
    res.json(bounties);
  } catch (err) {
    if (err.message.includes('COMPLETED_STATUS_REQUIRES_USER')) {
      res.status(400).json({ error: 'User context required for completed status' });
    } else {
      res.status(500).json({ error: 'Failed to fetch bounties', details: err.message });
    }
  }
};

// Create a new bounty
exports.createBounty = async (req, res) => {
  try {
    const {
      name,
      description,
      type,
      alloted_points,
      alloted_berries,
      scheduled_date,
      venue,
      capacity,
      is_active,
      created_by,
      modified_by
    } = req.body;

    // Handle file upload
    let image_hash = null;
    let img_url = null;
    if (req.file) {
      img_url = `/uploads/bounty_imgs/${req.file.filename}`;
      const fileBuffer = fs.readFileSync(req.file.path);
      image_hash = getFileHash(fileBuffer);
    } else if (req.body.img_url) {
      img_url = req.body.img_url;
      try {
        const fileBuffer = fs.readFileSync('.' + img_url);
        image_hash = getFileHash(fileBuffer);
      } catch (e) {
        image_hash = null;
      }
    }

    const bountyData = {
      name,
      description,
      type,
      img_url,
      image_hash,
      alloted_points,
      alloted_berries,
      scheduled_date,
      venue,
      capacity,
      is_active,
      created_by,
      modified_by
    };

    const bounty = await bountyService.createBounty(bountyData);
    res.status(201).json(bounty);
  } catch (err) {
    if (err.message.includes('NAME_REQUIRED')) {
      res.status(400).json({ error: 'Name is required' });
    } else if (err.message.includes('INVALID_POINTS')) {
      res.status(400).json({ error: 'Points cannot be negative' });
    } else if (err.message.includes('INVALID_BERRIES')) {
      res.status(400).json({ error: 'Berries cannot be negative' });
    } else if (err.message.includes('INVALID_CAPACITY')) {
      res.status(400).json({ error: 'Capacity cannot be negative' });
    } else if (err.message.includes('INVALID_SCHEDULED_DATE')) {
      res.status(400).json({ error: 'Scheduled date cannot be in the past' });
    } else {
      res.status(500).json({ error: 'Failed to create bounty', details: err.message });
    }
  }
};

// Get a bounty by ID
exports.getBountyById = async (req, res) => {
  try {
    const { id } = req.params;
    const bounty = await bountyService.getBountyById(id);
    res.json(bounty);
  } catch (err) {
    if (err.message.includes('BOUNTY_NOT_FOUND')) {
      res.status(404).json({ error: 'Bounty not found' });
    } else {
      res.status(500).json({ error: 'Failed to fetch bounty', details: err.message });
    }
  }
};

// Update a bounty
exports.updateBounty = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      type,
      alloted_points,
      alloted_berries,
      scheduled_date,
      venue,
      capacity,
      is_active,
      modified_by
    } = req.body;

    // Handle file upload
    let image_hash = null;
    let img_url = null;
    
    // Get current bounty to check existing image
    const currentBounty = await bountyService.getBountyById(id);
    
    if (req.file) {
      img_url = `/uploads/bounty_imgs/${req.file.filename}`;
      const fileBuffer = fs.readFileSync(req.file.path);
      image_hash = getFileHash(fileBuffer);
      // Delete old image if present
      if (currentBounty.img_url) {
        const oldPath = path.join(__dirname, '..', currentBounty.img_url);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
    } else if (req.body.img_url) {
      img_url = req.body.img_url;
      try {
        const fileBuffer = fs.readFileSync('.' + img_url);
        image_hash = getFileHash(fileBuffer);
      } catch (e) {
        image_hash = null;
      }
    } else {
      img_url = currentBounty.img_url;
      image_hash = currentBounty.image_hash;
    }

    const updateData = {
      name,
      description,
      type,
      img_url,
      image_hash,
      alloted_points,
      alloted_berries,
      scheduled_date,
      venue,
      capacity,
      is_active,
      modified_by
    };

    const bounty = await bountyService.updateBounty(id, updateData);
    res.json(bounty);
  } catch (err) {
    if (err.message.includes('BOUNTY_NOT_FOUND')) {
      res.status(404).json({ error: 'Bounty not found' });
    } else if (err.message.includes('NAME_REQUIRED')) {
      res.status(400).json({ error: 'Name is required' });
    } else if (err.message.includes('INVALID_POINTS')) {
      res.status(400).json({ error: 'Points cannot be negative' });
    } else if (err.message.includes('INVALID_BERRIES')) {
      res.status(400).json({ error: 'Berries cannot be negative' });
    } else if (err.message.includes('INVALID_CAPACITY')) {
      res.status(400).json({ error: 'Capacity cannot be negative' });
    } else if (err.message.includes('INVALID_SCHEDULED_DATE')) {
      res.status(400).json({ error: 'Scheduled date cannot be in the past' });
    } else {
      res.status(500).json({ error: 'Failed to update bounty', details: err.message });
    }
  }
};

// Delete a bounty
exports.deleteBounty = async (req, res) => {
  try {
    const { id } = req.params;
    const bounty = await bountyService.deleteBounty(id);
    res.json({ message: 'Bounty soft deleted', bounty });
  } catch (err) {
    if (err.message.includes('BOUNTY_NOT_FOUND')) {
      res.status(404).json({ error: 'Bounty not found' });
    } else {
      res.status(500).json({ error: 'Failed to delete bounty', details: err.message });
    }
  }
};

// PATCH: Update a bounty by name (partial update)
exports.patchBountyByName = async (req, res) => {
  try {
    const { name } = req.params;
    if (!name) {
      return res.status(400).json({ error: 'Bounty name is required in the URL.' });
    }

    // First find the bounty by name
    const bounties = await bountyService.searchBountiesByName(name);
    if (bounties.length === 0) {
      return res.status(404).json({ error: 'Bounty not found' });
    }

    const bounty = bounties[0];
    const updateData = req.body;

    // Remove system fields that shouldn't be updated
    delete updateData.created_on;
    delete updateData.modified_on;
    delete updateData.id;

    const updatedBounty = await bountyService.updateBounty(bounty.id, updateData);
    res.status(200).json(updatedBounty);
  } catch (err) {
    if (err.message.includes('BOUNTY_NOT_FOUND')) {
      res.status(404).json({ error: 'Bounty not found' });
    } else if (err.message.includes('NAME_REQUIRED')) {
      res.status(400).json({ error: 'Name is required' });
    } else if (err.message.includes('INVALID_POINTS')) {
      res.status(400).json({ error: 'Points cannot be negative' });
    } else if (err.message.includes('INVALID_BERRIES')) {
      res.status(400).json({ error: 'Berries cannot be negative' });
    } else if (err.message.includes('INVALID_CAPACITY')) {
      res.status(400).json({ error: 'Capacity cannot be negative' });
    } else if (err.message.includes('INVALID_SCHEDULED_DATE')) {
      res.status(400).json({ error: 'Scheduled date cannot be in the past' });
    } else {
      res.status(500).json({ error: 'Failed to update bounty', details: err.message });
    }
  }
};

// Get all bounties (including soft deleted) - Admin use
exports.getAllBountiesAdmin = async (req, res) => {
  try {
    // For admin view, we'll get all bounties without the is_active filter
    // This would require a new repository method, but for now we'll use the service
    const bounties = await bountyService.getAllBounties({});
    res.json(bounties);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch bounties', details: err.message });
  }
};

// Unified search/filter endpoint for bounties
exports.searchAndFilterBounties = async (req, res) => {
  try {
    const {
      filters = {},
      sortBy = 'name',
      sortOrder = 'asc',
      pageNumber = 1,
      pageSize = 10
    } = req.body;

    // Handle special status filters that require user context
    if (filters.status === 'completed' && !req.user?.id) {
      return res.status(400).json({ error: 'User authentication required for completed status' });
    }

    if (filters.status === 'registered' && !req.user?.id) {
      return res.status(400).json({ error: 'User authentication required for registered status' });
    }

    // Use service method for search and filter
    const results = await bountyService.searchAndFilterBounties(filters, req.user?.id);

    // Handle pagination manually since the service doesn't handle it yet
    const limit = parseInt(pageSize, 10) || 10;
    const offset = ((parseInt(pageNumber, 10) || 1) - 1) * limit;
    const paginatedResults = results.slice(offset, offset + limit);
    const totalResults = results.length;
    const totalPages = Math.ceil(totalResults / limit);

    // Handle registration status for upcoming bounties
    let resultsWithRegistration = paginatedResults;
    if (filters.status === 'upcoming' && req.user?.id) {
      const registeredBounties = await bountyService.getRegisteredBounties(req.user.id);
      const registeredIds = new Set(registeredBounties);
      resultsWithRegistration = paginatedResults.map(bounty => ({
        ...bounty,
        is_registered: registeredIds.has(bounty.id)
      }));
    }

    res.json({
      filters,
      results: resultsWithRegistration,
      sortBy,
      sortOrder: sortOrder.toLowerCase(),
      pageNumber: parseInt(pageNumber, 10) || 1,
      pageSize: limit,
      totalResults,
      totalPages
    });
  } catch (err) {
    if (err.message.includes('USER_ID_REQUIRED_FOR_COMPLETED')) {
      res.status(400).json({ error: 'User authentication required for completed status' });
    } else {
      res.status(500).json({ error: 'Failed to search bounties', details: err.message });
    }
  }
};

// Register for a bounty
exports.registerForBounty = async (req, res) => {
  try {
    const userId = req.user.id;
    const bountyId = req.params.bountyId;

    // This would require a new service method for registration
    // For now, we'll keep the existing logic but move it to service layer later
    const registeredBounties = await bountyService.getRegisteredBounties(userId);
    
    // Check if already registered
    if (registeredBounties.includes(parseInt(bountyId))) {
      return res.status(400).json({ error: 'Already registered for this bounty' });
    }

    // Check if bounty exists and is valid
    const bounty = await bountyService.getBountyById(bountyId);
    if (!bounty.is_active || new Date(bounty.scheduled_date) < new Date()) {
      return res.status(400).json({ error: 'Cannot register for expired or inactive bounty' });
    }

    // Register for bounty (this would need a new service method)
    // For now, we'll use the existing logic
    const pool = require('../config/db');
    await pool.query(
      'INSERT INTO user_bounty_participation (user_id, bounty_id, status, created_by, modified_by) VALUES ($1, $2, $3, $4, $5)',
      [userId, bountyId, 'registered', userId, userId]
    );

    // Get updated registered bounties
    const updatedRegisteredBounties = await bountyService.getRegisteredBounties(userId);

    res.status(201).json({
      message: 'registered successfully',
      registeredBounties: updatedRegisteredBounties
    });
  } catch (err) {
    if (err.message.includes('BOUNTY_NOT_FOUND')) {
      res.status(404).json({ error: 'Bounty not found' });
    } else {
      res.status(500).json({ error: 'Failed to register for bounty', details: err.message });
    }
  }
}; 