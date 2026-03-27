const pool = require('../config/db');

class BerryPurchasesRepository {
    async findAll() {
        const query = `
      SELECT bp.*, u.name as admin_name, u.email as admin_email
      FROM berry_purchases bp
      LEFT JOIN "user" u ON bp.admin_id = u.id
      ORDER BY bp.created_on DESC
    `;
        const { rows } = await pool.query(query);
        return rows;
    }

    async findById(id) {
        const query = `
      SELECT bp.*, u.name as admin_name, u.email as admin_email
      FROM berry_purchases bp
      LEFT JOIN "user" u ON bp.admin_id = u.id
      WHERE bp.id = $1
    `;
        const { rows } = await pool.query(query, [id]);
        return rows[0];
    }

    async findByAdminId(adminId) {
        const query = `
      SELECT bp.*, u.name as admin_name, u.email as admin_email
      FROM berry_purchases bp
      LEFT JOIN "user" u ON bp.admin_id = u.id
      WHERE bp.admin_id = $1
      ORDER BY bp.created_on DESC
    `;
        const { rows } = await pool.query(query, [adminId]);
        return rows;
    }

    async create(purchaseData) {
        const { admin_id, quantity, payment_ref, status, created_by } = purchaseData;
        const query = `
      INSERT INTO berry_purchases (admin_id, quantity, payment_ref, status, created_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
        const { rows } = await pool.query(query, [
            admin_id,
            quantity,
            payment_ref,
            status || 'pending',
            created_by
        ]);
        return rows[0];
    }

    async update(id, purchaseData) {
        const { status, modified_by } = purchaseData;
        const query = `
      UPDATE berry_purchases 
      SET status = COALESCE($1, status),
          modified_by = $2,
          modified_on = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;
        const { rows } = await pool.query(query, [status, modified_by, id]);
        return rows[0];
    }

    async getTotalPurchased() {
        const query = `
      SELECT 
        SUM(quantity) as total_purchased,
        COUNT(*) as total_transactions,
        SUM(CASE WHEN status = 'completed' THEN quantity ELSE 0 END) as completed_purchases
      FROM berry_purchases
    `;
        const { rows } = await pool.query(query);
        return rows[0];
    }

    async findByStatus(status) {
        const query = `
      SELECT bp.*, u.name as admin_name, u.email as admin_email
      FROM berry_purchases bp
      LEFT JOIN "user" u ON bp.admin_id = u.id
      WHERE bp.status = $1
      ORDER BY bp.created_on DESC
    `;
        const { rows } = await pool.query(query, [status]);
        return rows;
    }
}

module.exports = new BerryPurchasesRepository();
