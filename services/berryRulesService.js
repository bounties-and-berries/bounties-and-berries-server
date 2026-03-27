const berryRulesRepository = require('../repositories/berryRulesRepository');

class BerryRulesService {
    async getAllRules() {
        try {
            return await berryRulesRepository.findAll();
        } catch (error) {
            throw new Error(`Service error in getAllRules: ${error.message}`);
        }
    }

    async getRuleById(id) {
        try {
            const rule = await berryRulesRepository.findById(id);
            if (!rule) {
                throw new Error('RULE_NOT_FOUND');
            }
            return rule;
        } catch (error) {
            throw new Error(`Service error in getRuleById: ${error.message}`);
        }
    }

    async createRule(ruleData) {
        try {
            // Validate required fields
            if (!ruleData.name || !ruleData.category || !ruleData.points) {
                throw new Error('MISSING_REQUIRED_FIELDS');
            }

            return await berryRulesRepository.create(ruleData);
        } catch (error) {
            throw new Error(`Service error in createRule: ${error.message}`);
        }
    }

    async updateRule(id, ruleData) {
        try {
            const existingRule = await berryRulesRepository.findById(id);
            if (!existingRule) {
                throw new Error('RULE_NOT_FOUND');
            }

            return await berryRulesRepository.update(id, ruleData);
        } catch (error) {
            throw new Error(`Service error in updateRule: ${error.message}`);
        }
    }

    async deleteRule(id) {
        try {
            const existingRule = await berryRulesRepository.findById(id);
            if (!existingRule) {
                throw new Error('RULE_NOT_FOUND');
            }

            return await berryRulesRepository.delete(id);
        } catch (error) {
            throw new Error(`Service error in deleteRule: ${error.message}`);
        }
    }

    async getRulesByCategory(category) {
        try {
            return await berryRulesRepository.findByCategory(category);
        } catch (error) {
            throw new Error(`Service error in getRulesByCategory: ${error.message}`);
        }
    }
}

module.exports = new BerryRulesService();
