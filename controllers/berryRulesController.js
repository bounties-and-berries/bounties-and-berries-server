const berryRulesService = require('../services/berryRulesService');

class BerryRulesController {
    async getAllRules(req, res) {
        try {
            const rules = await berryRulesService.getAllRules();
            res.json({
                success: true,
                data: rules
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Failed to fetch berry rules',
                message: error.message
            });
        }
    }

    async getRuleById(req, res) {
        try {
            const { id } = req.params;
            const rule = await berryRulesService.getRuleById(id);
            res.json({
                success: true,
                data: rule
            });
        } catch (error) {
            if (error.message.includes('RULE_NOT_FOUND')) {
                res.status(404).json({
                    success: false,
                    error: 'Rule not found'
                });
            } else {
                res.status(500).json({
                    success: false,
                    error: 'Failed to fetch rule',
                    message: error.message
                });
            }
        }
    }

    async createRule(req, res) {
        try {
            const ruleData = {
                ...req.body,
                created_by: req.user?.name || 'system'
            };
            const rule = await berryRulesService.createRule(ruleData);
            res.status(201).json({
                success: true,
                data: rule,
                message: 'Berry rule created successfully'
            });
        } catch (error) {
            if (error.message.includes('MISSING_REQUIRED_FIELDS')) {
                res.status(400).json({
                    success: false,
                    error: 'Missing required fields',
                    required: ['name', 'category', 'points']
                });
            } else {
                res.status(500).json({
                    success: false,
                    error: 'Failed to create rule',
                    message: error.message
                });
            }
        }
    }

    async updateRule(req, res) {
        try {
            const { id } = req.params;
            const ruleData = {
                ...req.body,
                modified_by: req.user?.name || 'system'
            };
            const rule = await berryRulesService.updateRule(id, ruleData);
            res.json({
                success: true,
                data: rule,
                message: 'Berry rule updated successfully'
            });
        } catch (error) {
            if (error.message.includes('RULE_NOT_FOUND')) {
                res.status(404).json({
                    success: false,
                    error: 'Rule not found'
                });
            } else {
                res.status(500).json({
                    success: false,
                    error: 'Failed to update rule',
                    message: error.message
                });
            }
        }
    }

    async deleteRule(req, res) {
        try {
            const { id } = req.params;
            await berryRulesService.deleteRule(id);
            res.json({
                success: true,
                message: 'Berry rule deleted successfully'
            });
        } catch (error) {
            if (error.message.includes('RULE_NOT_FOUND')) {
                res.status(404).json({
                    success: false,
                    error: 'Rule not found'
                });
            } else {
                res.status(500).json({
                    success: false,
                    error: 'Failed to delete rule',
                    message: error.message
                });
            }
        }
    }

    async getRulesByCategory(req, res) {
        try {
            const { category } = req.params;
            const rules = await berryRulesService.getRulesByCategory(category);
            res.json({
                success: true,
                data: rules
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Failed to fetch rules by category',
                message: error.message
            });
        }
    }
}

module.exports = new BerryRulesController();
