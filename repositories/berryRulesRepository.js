const pool = require('../config/db');

class BerryRulesRepository {
    async findAll() {
        const query = `
      SELECT * FROM berry_rules 
      WHERE is_active = true 
      ORDER BY category, name
    `;
        const { rows } = await pool.query(query);
        return rows;
    }

    async findById(id) {
        const query = `
      SELECT * FROM berry_rules 
      WHERE id = $1
    `;
        const { rows } = await pool.query(query, [id]);
        return rows[0];
    }

    async create(ruleData) {
        const { name, category, points, max_per_semester, auto_grant, created_by } = ruleData;
        const query = `
      INSERT INTO berry_rules (name, category, points, max_per_semester, auto_grant, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
        const { rows } = await pool.query(query, [
            name,
            category,
            points,
            max_per_semester || null,
            auto_grant || false,
            created_by
        ]);
        return rows[0];
    }

    async update(id, ruleData) {
        const { name, category, points, max_per_semester, auto_grant, is_active, modified_by } = ruleData;
        const query = `
      UPDATE berry_rules 
      SET name = COALESCE($1, name),
          category = COALESCE($2, category),
          points = COALESCE($3, points),
          max_per_semester = COALESCE($4, max_per_semester),
          auto_grant = COALESCE($5, auto_grant),
          is_active = COALESCE($6, is_active),
          modified_by = $7,
          modified_on = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *
    `;
        const { rows } = await pool.query(query, [
            name,
            category,
            points,
            max_per_semester,
            auto_grant,
            is_active,
            modified_by,
            id
        ]);
        return rows[0];
    }

    async delete(id) {
        const query = `
      UPDATE berry_rules 
      SET is_active = false, modified_on = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
        const { rows } = await pool.query(query, [id]);
        return rows[0];
    }

    async findByCategory(category) {
        const query = `
      SELECT * FROM berry_rules 
      WHERE category = $1 AND is_active = true
      ORDER BY points DESC
    `;
        const { rows } = await pool.query(query, [category]);
        return rows;
    }
}

module.exports = new BerryRulesRepository();
