const pool = require('../config/db');

class LedgerService {
  /**
   * Ensure user has a ledger account.
   */
  async _ensureUserAccount(client, userId) {
    let res = await client.query(`SELECT id FROM ledger_account WHERE user_id = $1 AND type = 'USER'`, [userId]);
    if (res.rows.length === 0) {
      res = await client.query(
        `INSERT INTO ledger_account(type, user_id) VALUES ('USER', $1) RETURNING id`,
        [userId]
      );
    }
    return res.rows[0].id;
  }

  /**
   * Get system account ID by code.
   */
  async _getSystemAccount(client, code) {
    const res = await client.query(`SELECT id FROM ledger_account WHERE code = $1 AND type = 'SYSTEM'`, [code]);
    if (res.rows.length === 0) {
      throw new Error(`System account ${code} is missing from the database`);
    }
    return res.rows[0].id;
  }

  /**
   * Credit a user (e.g. they earned berries)
   * Double-entry: User (+ amount), REWARDS_EXPENSE (- amount)
   */
  async credit({ idempotencyKey, userId, amount, referenceType, referenceId, collegeId, actorId }) {
    if (!amount || amount <= 0) return null; // No zero transactions

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const userAccountId = await this._ensureUserAccount(client, userId);
      const expenseAccountId = await this._getSystemAccount(client, 'REWARDS_EXPENSE');

      // 1) Create transaction (idempotent)
      let txnRes = await client.query(
        `INSERT INTO ledger_txn (idempotency_key, reference_type, reference_id, college_id, created_by)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (idempotency_key) DO NOTHING
         RETURNING id`,
        [idempotencyKey, referenceType, referenceId, collegeId || null, actorId]
      );

      let txnId;
      if (txnRes.rows.length > 0) {
        txnId = txnRes.rows[0].id;

        // 2) Create paired entries (only if new txn)
        await client.query(
          `INSERT INTO ledger_entry (txn_id, account_id, direction, amount) VALUES 
           ($1, $2, 1, $4),
           ($1, $3, -1, $4)`,
          [txnId, userAccountId, expenseAccountId, amount]
        );

        // 3) Update fast-path balance cache (Upsert)
        await client.query(
          `INSERT INTO user_balance (user_id, balance) VALUES ($1, $2)
           ON CONFLICT (user_id) DO UPDATE SET balance = user_balance.balance + EXCLUDED.balance, updated_on = NOW()`,
          [userId, amount]
        );
      } else {
        // Return existing txn if retry
        const existingTxn = await client.query(`SELECT id FROM ledger_txn WHERE idempotency_key = $1`, [idempotencyKey]);
        txnId = existingTxn.rows[0]?.id;
      }

      await client.query('COMMIT');
      return txnId;
    } catch (err) {
      await client.query('ROLLBACK');
      throw new Error(`Ledger Credit Error: ${err.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Debit a user (e.g. they spent berries)
   * Double-entry: User (- amount), SYSTEM_POOL (+ amount)
   */
  async debit({ idempotencyKey, userId, amount, referenceType, referenceId, collegeId, actorId }) {
    if (!amount || amount <= 0) return null;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1) Lock user balance to prevent double-spend concurrency
      const balRes = await client.query(`SELECT balance FROM user_balance WHERE user_id = $1 FOR UPDATE`, [userId]);
      const currentBalance = balRes.rows.length > 0 ? parseInt(balRes.rows[0].balance, 10) : 0;

      // 2) Check if funds exist
      if (currentBalance < amount) {
        throw new Error(`INSUFFICIENT_FUNDS: Available ${currentBalance}, Required ${amount}`);
      }

      const userAccountId = await this._ensureUserAccount(client, userId);
      const systemPoolAccountId = await this._getSystemAccount(client, 'SYSTEM_POOL');

      // 3) Create transaction (idempotent)
      let txnRes = await client.query(
        `INSERT INTO ledger_txn (idempotency_key, reference_type, reference_id, college_id, created_by)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (idempotency_key) DO NOTHING
         RETURNING id`,
        [idempotencyKey, referenceType, referenceId, collegeId || null, actorId]
      );

      let txnId;
      if (txnRes.rows.length > 0) {
        txnId = txnRes.rows[0].id;

        // 4) Create tracking entries
        await client.query(
          `INSERT INTO ledger_entry (txn_id, account_id, direction, amount) VALUES 
           ($1, $2, -1, $4),
           ($1, $3, 1, $4)`,
          [txnId, userAccountId, systemPoolAccountId, amount]
        );

        // 5) Update balance cache explicitly
        await client.query(
          `UPDATE user_balance SET balance = balance - $2, updated_on = NOW() WHERE user_id = $1`,
          [userId, amount]
        );
      } else {
        const existingTxn = await client.query(`SELECT id FROM ledger_txn WHERE idempotency_key = $1`, [idempotencyKey]);
        txnId = existingTxn.rows[0]?.id;
      }

      await client.query('COMMIT');
      return txnId;
    } catch (err) {
      await client.query('ROLLBACK');
      if (err.message.includes('INSUFFICIENT_FUNDS')) throw err;
      throw new Error(`Ledger Debit Error: ${err.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Fast Read for UI / API mapping
   */
  async getBalance(userId) {
    const res = await pool.query('SELECT balance FROM user_balance WHERE user_id = $1', [userId]);
    return res.rows.length > 0 ? parseInt(res.rows[0].balance, 10) : 0;
  }
}

module.exports = new LedgerService();
