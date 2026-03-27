const berryPurchasesRepository = require('../repositories/berryPurchasesRepository');

class BerryPurchasesService {
    async getAllPurchases() {
        try {
            return await berryPurchasesRepository.findAll();
        } catch (error) {
            throw new Error(`Service error in getAllPurchases: ${error.message}`);
        }
    }

    async getPurchaseById(id) {
        try {
            const purchase = await berryPurchasesRepository.findById(id);
            if (!purchase) {
                throw new Error('PURCHASE_NOT_FOUND');
            }
            return purchase;
        } catch (error) {
            throw new Error(`Service error in getPurchaseById: ${error.message}`);
        }
    }

    async getPurchasesByAdmin(adminId) {
        try {
            return await berryPurchasesRepository.findByAdminId(adminId);
        } catch (error) {
            throw new Error(`Service error in getPurchasesByAdmin: ${error.message}`);
        }
    }

    async createPurchase(purchaseData) {
        try {
            // Validate required fields
            if (!purchaseData.admin_id || !purchaseData.quantity || !purchaseData.payment_ref) {
                throw new Error('MISSING_REQUIRED_FIELDS');
            }

            return await berryPurchasesRepository.create(purchaseData);
        } catch (error) {
            throw new Error(`Service error in createPurchase: ${error.message}`);
        }
    }

    async updatePurchaseStatus(id, status, modifiedBy) {
        try {
            const existingPurchase = await berryPurchasesRepository.findById(id);
            if (!existingPurchase) {
                throw new Error('PURCHASE_NOT_FOUND');
            }

            return await berryPurchasesRepository.update(id, {
                status,
                modified_by: modifiedBy
            });
        } catch (error) {
            throw new Error(`Service error in updatePurchaseStatus: ${error.message}`);
        }
    }

    async getPurchaseStats() {
        try {
            return await berryPurchasesRepository.getTotalPurchased();
        } catch (error) {
            throw new Error(`Service error in getPurchaseStats: ${error.message}`);
        }
    }

    async getPurchasesByStatus(status) {
        try {
            return await berryPurchasesRepository.findByStatus(status);
        } catch (error) {
            throw new Error(`Service error in getPurchasesByStatus: ${error.message}`);
        }
    }
}

module.exports = new BerryPurchasesService();
