const berryPurchasesService = require('../services/berryPurchasesService');

class BerryPurchasesController {
    async getAllPurchases(req, res) {
        try {
            const purchases = await berryPurchasesService.getAllPurchases();
            res.json({
                success: true,
                data: purchases
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Failed to fetch berry purchases',
                message: error.message
            });
        }
    }

    async getPurchaseById(req, res) {
        try {
            const { id } = req.params;
            const purchase = await berryPurchasesService.getPurchaseById(id);
            res.json({
                success: true,
                data: purchase
            });
        } catch (error) {
            if (error.message.includes('PURCHASE_NOT_FOUND')) {
                res.status(404).json({
                    success: false,
                    error: 'Purchase not found'
                });
            } else {
                res.status(500).json({
                    success: false,
                    error: 'Failed to fetch purchase',
                    message: error.message
                });
            }
        }
    }

    async getPurchasesByAdmin(req, res) {
        try {
            const { adminId } = req.params;
            const purchases = await berryPurchasesService.getPurchasesByAdmin(adminId);
            res.json({
                success: true,
                data: purchases
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Failed to fetch purchases by admin',
                message: error.message
            });
        }
    }

    async createPurchase(req, res) {
        try {
            const purchaseData = {
                ...req.body,
                created_by: req.user?.name || 'system'
            };
            const purchase = await berryPurchasesService.createPurchase(purchaseData);
            res.status(201).json({
                success: true,
                data: purchase,
                message: 'Berry purchase recorded successfully'
            });
        } catch (error) {
            if (error.message.includes('MISSING_REQUIRED_FIELDS')) {
                res.status(400).json({
                    success: false,
                    error: 'Missing required fields',
                    required: ['admin_id', 'quantity', 'payment_ref']
                });
            } else {
                res.status(500).json({
                    success: false,
                    error: 'Failed to create purchase',
                    message: error.message
                });
            }
        }
    }

    async updatePurchaseStatus(req, res) {
        try {
            const { id } = req.params;
            const { status } = req.body;
            const modifiedBy = req.user?.name || 'system';

            const purchase = await berryPurchasesService.updatePurchaseStatus(id, status, modifiedBy);
            res.json({
                success: true,
                data: purchase,
                message: 'Purchase status updated successfully'
            });
        } catch (error) {
            if (error.message.includes('PURCHASE_NOT_FOUND')) {
                res.status(404).json({
                    success: false,
                    error: 'Purchase not found'
                });
            } else {
                res.status(500).json({
                    success: false,
                    error: 'Failed to update purchase status',
                    message: error.message
                });
            }
        }
    }

    async getPurchaseStats(req, res) {
        try {
            const stats = await berryPurchasesService.getPurchaseStats();
            res.json({
                success: true,
                data: stats
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Failed to fetch purchase stats',
                message: error.message
            });
        }
    }

    async getPurchasesByStatus(req, res) {
        try {
            const { status } = req.params;
            const purchases = await berryPurchasesService.getPurchasesByStatus(status);
            res.json({
                success: true,
                data: purchases
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: 'Failed to fetch purchases by status',
                message: error.message
            });
        }
    }
}

module.exports = new BerryPurchasesController();
