const db = require('../config/knex');

class AdminRepository {
  /**
   * Get total berries available in the system
   */
  async getBerriesAvailable() {
    try {
      const purchased = await db('berry_purchases')
        .where('status', 'completed')
        .sum('quantity as total')
        .first();

      const spent = await db('user_reward_claim')
        .sum('berries_spent as total')
        .first();

      const earned = await db('user_bounty_participation')
        .where('status', 'completed')
        .sum('berries_earned as total')
        .first();

      const total = (Number(purchased.total) || 0) + 
                    (Number(spent.total) || 0) - 
                    (Number(earned.total) || 0);

      return { total };
    } catch (error) {
      throw new Error(`Repository error in getBerriesAvailable: ${error.message}`);
    }
  }

  /**
   * Get category breakdown for dashboard
   */
  async getCategoryBreakdown() {
    try {
      return await db('bounty as b')
        .select('b.type as name')
        .sum('ub.berries_earned as value')
        .leftJoin('user_bounty_participation as ub', function() {
          this.on('b.id', '=', 'ub.bounty_id').andOn('ub.status', '=', db.raw("'completed'"));
        })
        .where('b.is_active', true)
        .groupBy('b.type')
        .orderBy('value', 'desc');
    } catch (error) {
      throw new Error(`Repository error in getCategoryBreakdown: ${error.message}`);
    }
  }

  /**
   * Get total approved points
   */
  async getApprovedPoints() {
    try {
      const participationPoints = await db('user_bounty_participation')
        .where('status', 'completed')
        .sum('points_earned as total')
        .first();

      const requestPoints = await db('point_request')
        .where('status', 'approved')
        .sum('points_awarded as total')
        .first();

      const total = (Number(participationPoints.total) || 0) + 
                    (Number(requestPoints.total) || 0);

      return { total };
    } catch (error) {
      throw new Error(`Repository error in getApprovedPoints: ${error.message}`);
    }
  }

  /**
   * Get pending point requests count
   */
  async getPendingRequestsCount() {
    try {
      const result = await db('point_request')
        .whereIn('status', ['submitted', 'under_review'])
        .count('id as count')
        .first();
      return result;
    } catch (error) {
      throw new Error(`Repository error in getPendingRequestsCount: ${error.message}`);
    }
  }

  /**
   * Get additional dashboard stats
   */
  async getDashboardStats() {
    try {
      const activeUsers = await db('user').where('is_active', true).count('id as count').first();
      const berriesRedeemed = await db('user_reward_claim').sum('berries_spent as total').first();
      const completedEvents = await db('user_bounty_participation').where('status', 'completed').countDistinct('bounty_id as count').first();
      const activeEvents = await db('bounty').where('is_active', true).count('id as count').first();
      
      const deptBreakdown = await db('user')
        .select('department')
        .sum(db.raw(`
          (SELECT COALESCE(SUM(points_earned), 0) FROM user_bounty_participation WHERE user_id = "user".id AND status = 'completed') +
          (SELECT COALESCE(SUM(points_awarded), 0) FROM point_request WHERE student_id = "user".id AND status = 'approved')
        as total_points`))
        .whereNotNull('department')
        .groupBy('department')
        .orderBy('total_points', 'desc');

      return {
        activeUsers: parseInt(activeUsers.count),
        berriesRedeemed: parseInt(berriesRedeemed.total) || 0,
        completedEvents: parseInt(completedEvents.count),
        activeEvents: parseInt(activeEvents.count),
        deptBreakdown
      };
    } catch (error) {
      throw new Error(`Repository error in getDashboardStats: ${error.message}`);
    }
  }

  /**
   * Get top students by points
   */
  async getTopStudents(searchQuery = null) {
    try {
      let query = db('user as u')
        .select('u.id', 'u.name')
        .join('role as r', 'u.role_id', 'r.id')
        .where('r.name', 'student')
        .andWhere('u.is_active', true);

      if (searchQuery) {
        query = query.andWhere('u.name', 'ilike', `%${searchQuery}%`);
      }

      // Note: For complex point sums across multiple tables, 
      // sometimes a raw subquery or a helper view is better, 
      // but here we can use subqueries within select.
      query = query.select(
        db.raw(`
          (SELECT COALESCE(SUM(points_earned), 0) FROM user_bounty_participation WHERE user_id = u.id AND status = 'completed') +
          (SELECT COALESCE(SUM(points_awarded), 0) FROM point_request WHERE student_id = u.id AND status = 'approved')
        as points`)
      );

      return await query.orderBy('points', 'desc').limit(10);
    } catch (error) {
      throw new Error(`Repository error in getTopStudents: ${error.message}`);
    }
  }

  /**
   * Get berry rule by name
   */
  async getBerryRuleByName(name) {
    try {
      return await db('berry_rules')
        .where({ name, is_active: true })
        .first();
    } catch (error) {
      throw new Error(`Repository error in getBerryRuleByName: ${error.message}`);
    }
  }

  /**
   * Create berry rule
   */
  async createBerryRule(ruleData) {
    try {
      const [result] = await db('berry_rules')
        .insert({
          name: ruleData.name,
          category: ruleData.category,
          points: ruleData.points,
          max_per_semester: ruleData.maxPerSemester,
          auto_grant: ruleData.autoGrant,
          created_by: ruleData.createdBy
        })
        .returning('*');
      return result;
    } catch (error) {
      throw new Error(`Repository error in createBerryRule: ${error.message}`);
    }
  }

  /**
   * Get role by name
   */
  async getRoleByName(roleName) {
    try {
      return await db('role')
        .where('name', roleName)
        .first();
    } catch (error) {
      throw new Error(`Repository error in getRoleByName: ${error.message}`);
    }
  }

  /**
   * Create user
   */
  async createUser(userData) {
    try {
      const [result] = await db('user')
        .insert({
          name: userData.name,
          username: userData.username,
          email: userData.email,
          mobile: userData.mobile,
          mobilenumber: userData.mobile,
          password: userData.password,
          role_id: userData.role_id,
          college_id: userData.college_id,
          created_by: userData.created_by
        })
        .returning(['id', 'name', 'username', 'email', 'mobile', 'role_id', 'college_id', 'is_active', 'created_on']);
      return result;
    } catch (error) {
      throw new Error(`Repository error in createUser: ${error.message}`);
    }
  }

  /**
   * Get purchase by payment reference
   */
  async getPurchaseByPaymentRef(paymentRef) {
    try {
      return await db('berry_purchases')
        .where('payment_ref', paymentRef)
        .first();
    } catch (error) {
      throw new Error(`Repository error in getPurchaseByPaymentRef: ${error.message}`);
    }
  }

  /**
   * Create berry purchase
   */
  async createPurchase(purchaseData) {
    try {
      const [result] = await db('berry_purchases')
        .insert({
          admin_id: purchaseData.adminId,
          quantity: purchaseData.quantity,
          payment_ref: purchaseData.paymentRef,
          status: 'completed',
          created_by: purchaseData.createdBy
        })
        .returning('*');
      return result;
    } catch (error) {
      throw new Error(`Repository error in createPurchase: ${error.message}`);
    }
  }

  /**
   * Update admin profile
   */
  async updateAdminProfile(adminId, updateData) {
    try {
      const dataToUpdate = {
        modified_on: db.fn.now()
      };

      if (updateData.name !== undefined) dataToUpdate.name = updateData.name;
      if (updateData.email !== undefined) dataToUpdate.email = updateData.email;
      if (updateData.logoUrl !== undefined) dataToUpdate.img_url = updateData.logoUrl;

      const [result] = await db('user')
        .where('id', adminId)
        .update(dataToUpdate)
        .returning(['id', 'name', 'email', 'img_url as logoUrl']);
      
      return result;
    } catch (error) {
      throw new Error(`Repository error in updateAdminProfile: ${error.message}`);
    }
  }

  /**
   * Get transactions (berry purchases)
   */
  async getTransactions(limit = 10, offset = 0) {
    try {
      const transactions = await db('berry_purchases as bp')
        .select('bp.*', 'u.name as admin_name')
        .join('user as u', 'bp.admin_id', 'u.id')
        .orderBy('bp.created_on', 'desc')
        .limit(limit)
        .offset(offset);

      const countResult = await db('berry_purchases').count('id as count').first();

      return {
        transactions,
        total: parseInt(countResult.count)
      };
    } catch (error) {
      throw new Error(`Repository error in getTransactions: ${error.message}`);
    }
  }

  /**
   * Get progress for all students
   */
  async getStudentsProgress() {
    try {
      return await db('user as u')
        .select(
          'u.id',
          'u.name',
          'u.email',
          'u.img_url as profileImage',
          'u.department',
          'u.year',
        )
        .select(db.raw(`
          ((SELECT COALESCE(SUM(points_earned), 0) FROM user_bounty_participation WHERE user_id = u.id AND status = 'completed') +
          (SELECT COALESCE(SUM(points_awarded), 0) FROM point_request WHERE student_id = u.id AND status = 'approved'))
        as "totalPoints"`))
        .select(db.raw(`
          ((SELECT COALESCE(SUM(points_earned), 0) FROM user_bounty_participation 
           WHERE user_id = u.id AND status = 'completed' 
           AND date_trunc('month', created_on) = date_trunc('month', current_timestamp)) +
          (SELECT COALESCE(SUM(points_awarded), 0) FROM point_request 
           WHERE student_id = u.id AND status = 'approved' 
           AND date_trunc('month', created_on) = date_trunc('month', current_timestamp)))
        as "thisMonth"`))
        .select(db.raw(`
          (SELECT COUNT(*) FROM user_bounty_participation WHERE user_id = u.id AND status = 'completed')
        as "activitiesCount"`))
        .join('role as r', 'u.role_id', 'r.id')
        .where('r.name', 'student')
        .andWhere('u.is_active', true)
        .orderBy('totalPoints', 'desc');
    } catch (error) {
      throw new Error(`Repository error in getStudentsProgress: ${error.message}`);
    }
  }
}

module.exports = new AdminRepository();