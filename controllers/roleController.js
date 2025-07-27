const roleService = require('../services/roleService');

// Get all roles
exports.getAllRoles = async (req, res) => {
  try {
    const roles = await roleService.getAllRoles();
    res.json(roles);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch roles', details: err.message });
  }
};

// Get role by ID
exports.getRoleById = async (req, res) => {
  try {
    const { id } = req.params;
    const role = await roleService.getRoleById(id);
    res.json(role);
  } catch (err) {
    if (err.message.includes('ROLE_NOT_FOUND')) {
      res.status(404).json({ error: 'Role not found' });
    } else {
      res.status(500).json({ error: 'Failed to fetch role', details: err.message });
    }
  }
};

// Create a new role
exports.createRole = async (req, res) => {
  try {
    const { name } = req.body;
    const role = await roleService.createRole({ name });
    res.status(201).json(role);
  } catch (err) {
    if (err.message.includes('NAME_REQUIRED')) {
      res.status(400).json({ error: 'Role name is required' });
    } else if (err.message.includes('DUPLICATE_NAME')) {
      res.status(409).json({ error: 'A role with this name already exists.' });
    } else {
      res.status(500).json({ error: 'Failed to create role', details: err.message });
    }
  }
};

// Update a role (full update)
exports.updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const role = await roleService.updateRole(id, { name });
    res.json(role);
  } catch (err) {
    if (err.message.includes('ROLE_NOT_FOUND')) {
      res.status(404).json({ error: 'Role not found' });
    } else if (err.message.includes('NAME_REQUIRED')) {
      res.status(400).json({ error: 'Role name is required' });
    } else if (err.message.includes('DUPLICATE_NAME')) {
      res.status(409).json({ error: 'A role with this name already exists.' });
    } else {
      res.status(500).json({ error: 'Failed to update role', details: err.message });
    }
  }
};

// Patch update a role (partial update)
exports.patchRole = async (req, res) => {
  try {
    const { id } = req.params;
    const updateFields = req.body;
    const role = await roleService.patchRole(id, updateFields);
    res.json(role);
  } catch (err) {
    if (err.message.includes('ROLE_NOT_FOUND')) {
      res.status(404).json({ error: 'Role not found' });
    } else if (err.message.includes('NAME_REQUIRED')) {
      res.status(400).json({ error: 'Role name is required' });
    } else if (err.message.includes('DUPLICATE_NAME')) {
      res.status(409).json({ error: 'A role with this name already exists.' });
    } else {
      res.status(500).json({ error: 'Failed to update role', details: err.message });
    }
  }
};

// Delete a role
exports.deleteRole = async (req, res) => {
  try {
    const { id } = req.params;
    const role = await roleService.deleteRole(id);
    res.json({ message: 'Role deleted successfully', role });
  } catch (err) {
    if (err.message.includes('ROLE_NOT_FOUND')) {
      res.status(404).json({ error: 'Role not found' });
    } else {
      res.status(500).json({ error: 'Failed to delete role', details: err.message });
    }
  }
};

// Search roles by name
exports.searchRoles = async (req, res) => {
  try {
    const { name } = req.query;
    const roles = await roleService.searchRoles(name);
    res.json(roles);
  } catch (err) {
    res.status(500).json({ error: 'Failed to search roles', details: err.message });
  }
}; 