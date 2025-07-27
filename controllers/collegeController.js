const collegeService = require('../services/collegeService');

// Get all colleges
exports.getAllColleges = async (req, res) => {
  try {
    const colleges = await collegeService.getAllColleges();
    res.json(colleges);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch colleges', details: err.message });
  }
};

// Get college by ID
exports.getCollegeById = async (req, res) => {
  try {
    const { id } = req.params;
    const college = await collegeService.getCollegeById(id);
    res.json(college);
  } catch (err) {
    if (err.message.includes('COLLEGE_NOT_FOUND')) {
      res.status(404).json({ error: 'College not found' });
    } else {
      res.status(500).json({ error: 'Failed to fetch college', details: err.message });
    }
  }
};

// Create a new college
exports.createCollege = async (req, res) => {
  try {
    const { name, location, berries_purchased } = req.body;
    const college = await collegeService.createCollege({ name, location, berries_purchased });
    res.status(201).json(college);
  } catch (err) {
    if (err.message.includes('NAME_REQUIRED')) {
      res.status(400).json({ error: 'College name is required' });
    } else if (err.message.includes('DUPLICATE_NAME')) {
      res.status(409).json({ error: 'A college with this name already exists.' });
    } else if (err.message.includes('INVALID_BERRIES_AMOUNT')) {
      res.status(400).json({ error: 'Berries purchased cannot be negative' });
    } else {
      res.status(500).json({ error: 'Failed to create college', details: err.message });
    }
  }
};

// Update a college
exports.updateCollege = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, location, berries_purchased, is_active } = req.body;
    const college = await collegeService.updateCollege(id, { name, location, berries_purchased, is_active });
    res.json(college);
  } catch (err) {
    if (err.message.includes('COLLEGE_NOT_FOUND')) {
      res.status(404).json({ error: 'College not found' });
    } else if (err.message.includes('NAME_REQUIRED')) {
      res.status(400).json({ error: 'College name is required' });
    } else if (err.message.includes('DUPLICATE_NAME')) {
      res.status(409).json({ error: 'A college with this name already exists.' });
    } else if (err.message.includes('INVALID_BERRIES_AMOUNT')) {
      res.status(400).json({ error: 'Berries purchased cannot be negative' });
    } else {
      res.status(500).json({ error: 'Failed to update college', details: err.message });
    }
  }
};

// Patch update a college (partial update)
exports.patchCollege = async (req, res) => {
  try {
    const { id } = req.params;
    const updateFields = req.body;
    const college = await collegeService.patchCollege(id, updateFields);
    res.json(college);
  } catch (err) {
    if (err.message.includes('COLLEGE_NOT_FOUND')) {
      res.status(404).json({ error: 'College not found' });
    } else if (err.message.includes('NAME_REQUIRED')) {
      res.status(400).json({ error: 'College name is required' });
    } else if (err.message.includes('DUPLICATE_NAME')) {
      res.status(409).json({ error: 'A college with this name already exists.' });
    } else if (err.message.includes('INVALID_BERRIES_AMOUNT')) {
      res.status(400).json({ error: 'Berries purchased cannot be negative' });
    } else {
      res.status(500).json({ error: 'Failed to update college', details: err.message });
    }
  }
};

// Delete a college (soft delete)
exports.deleteCollege = async (req, res) => {
  try {
    const { id } = req.params;
    const college = await collegeService.deleteCollege(id);
    res.json({ message: 'College deleted successfully', college });
  } catch (err) {
    if (err.message.includes('COLLEGE_NOT_FOUND')) {
      res.status(404).json({ error: 'College not found' });
    } else {
      res.status(500).json({ error: 'Failed to delete college', details: err.message });
    }
  }
};

// Get all colleges (including inactive) - Admin use
exports.getAllCollegesAdmin = async (req, res) => {
  try {
    const colleges = await collegeService.getAllCollegesIncludingInactive();
    res.json(colleges);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch colleges', details: err.message });
  }
};

// Search colleges by name
exports.searchColleges = async (req, res) => {
  try {
    const { name } = req.query;
    const colleges = await collegeService.searchColleges(name);
    res.json(colleges);
  } catch (err) {
    res.status(500).json({ error: 'Failed to search colleges', details: err.message });
  }
}; 