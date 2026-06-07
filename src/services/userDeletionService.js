const { pool } = require('../config/database');

/**
 * Service for safely deleting users and handling all related data
 */
class UserDeletionService {
  /**
   * Get the impact of deleting a user (what records will be affected)
   * @param {number} userId - The ID of the user to check
   * @returns {Promise<Array>} Array of objects showing affected tables and counts
   */
  async getUserDeletionImpact(userId) {
    try {
      const query = 'SELECT * FROM get_user_deletion_impact($1) WHERE record_count > 0';
      const result = await pool.query(query, [userId]);
      return result.rows;
    } catch (error) {
      console.error('Error getting user deletion impact:', error);
      throw new Error('Failed to analyze user deletion impact');
    }
  }

  /**
   * Check if a user exists
   * @param {number} userId - The ID of the user to check
   * @returns {Promise<boolean>} True if user exists, false otherwise
   */
  async userExists(userId) {
    try {
      const query = 'SELECT EXISTS(SELECT 1 FROM users WHERE id = $1)';
      const result = await pool.query(query, [userId]);
      return result.rows[0].exists;
    } catch (error) {
      console.error('Error checking user existence:', error);
      throw new Error('Failed to check user existence');
    }
  }

  /**
   * Get user basic information
   * @param {number} userId - The ID of the user
   * @returns {Promise<Object|null>} User object or null if not found
   */
  async getUserInfo(userId) {
    try {
      const query = 'SELECT id, name, email, role, created_at FROM users WHERE id = $1';
      const result = await pool.query(query, [userId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting user info:', error);
      throw new Error('Failed to get user information');
    }
  }

  /**
   * Safely delete a user and all related data
   * @param {number} userId - The ID of the user to delete
   * @param {Object} options - Deletion options
   * @param {boolean} options.dryRun - If true, only return what would be deleted without actually deleting
   * @param {boolean} options.force - If true, skip confirmation checks
   * @returns {Promise<Object>} Deletion result
   */
  async deleteUser(userId, options = {}) {
    const { dryRun = false, force = false } = options;

    try {
      // Check if user exists
      const userExists = await this.userExists(userId);
      if (!userExists) {
        throw new Error(`User with ID ${userId} does not exist`);
      }

      // Get user info for logging
      const userInfo = await this.getUserInfo(userId);
      
      // Get deletion impact
      const impact = await this.getUserDeletionImpact(userId);

      if (dryRun) {
        return {
          success: true,
          dryRun: true,
          user: userInfo,
          impact: impact,
          message: 'Dry run completed - no data was actually deleted'
        };
      }

      // If not forced and there are significant impacts, require explicit confirmation
      if (!force) {
        const totalRecords = impact.reduce((sum, item) => sum + parseInt(item.record_count), 0);
        if (totalRecords > 10) {
          return {
            success: false,
            requiresConfirmation: true,
            user: userInfo,
            impact: impact,
            totalAffectedRecords: totalRecords,
            message: `Deleting this user will affect ${totalRecords} records across ${impact.length} tables. Use force=true to proceed.`
          };
        }
      }

      // Perform the actual deletion using the database function
      const deleteQuery = 'SELECT delete_user_safely($1) as success';
      const deleteResult = await pool.query(deleteQuery, [userId]);
      
      if (!deleteResult.rows[0].success) {
        throw new Error('Database function reported deletion failure');
      }

      return {
        success: true,
        user: userInfo,
        impact: impact,
        message: `User ${userInfo.name} (${userInfo.email}) has been successfully deleted`
      };

    } catch (error) {
      console.error('Error deleting user:', error);
      throw new Error(`Failed to delete user: ${error.message}`);
    }
  }

  /**
   * Delete multiple users in batch
   * @param {Array<number>} userIds - Array of user IDs to delete
   * @param {Object} options - Deletion options
   * @returns {Promise<Object>} Batch deletion result
   */
  async deleteMultipleUsers(userIds, options = {}) {
    const results = {
      successful: [],
      failed: [],
      totalRequested: userIds.length
    };

    for (const userId of userIds) {
      try {
        const result = await this.deleteUser(userId, options);
        if (result.success) {
          results.successful.push({ userId, result });
        } else {
          results.failed.push({ userId, error: result.message });
        }
      } catch (error) {
        results.failed.push({ userId, error: error.message });
      }
    }

    return {
      ...results,
      successCount: results.successful.length,
      failureCount: results.failed.length
    };
  }

  /**
   * Get users that can be safely deleted (have minimal impact)
   * @param {Object} criteria - Search criteria
   * @returns {Promise<Array>} Array of users with their deletion impact
   */
  async getUsersForDeletion(criteria = {}) {
    try {
      let query = `
        SELECT u.id, u.name, u.email, u.role, u.created_at,
               COALESCE(e.enrollment_count, 0) as enrollment_count,
               COALESCE(p.payment_count, 0) as payment_count,
               COALESCE(n.notification_count, 0) as notification_count
        FROM users u
        LEFT JOIN (
          SELECT user_id, COUNT(*) as enrollment_count 
          FROM enrollments 
          GROUP BY user_id
        ) e ON u.id = e.user_id
        LEFT JOIN (
          SELECT user_id, COUNT(*) as payment_count 
          FROM payments 
          GROUP BY user_id
        ) p ON u.id = p.user_id
        LEFT JOIN (
          SELECT user_id, COUNT(*) as notification_count 
          FROM notifications 
          GROUP BY user_id
        ) n ON u.id = n.user_id
        WHERE 1=1
      `;

      const params = [];
      let paramIndex = 1;

      if (criteria.role) {
        query += ` AND u.role = $${paramIndex}`;
        params.push(criteria.role);
        paramIndex++;
      }

      if (criteria.createdBefore) {
        query += ` AND u.created_at < $${paramIndex}`;
        params.push(criteria.createdBefore);
        paramIndex++;
      }

      if (criteria.maxEnrollments !== undefined) {
        query += ` AND COALESCE(e.enrollment_count, 0) <= $${paramIndex}`;
        params.push(criteria.maxEnrollments);
        paramIndex++;
      }

      query += ' ORDER BY u.created_at DESC';

      if (criteria.limit) {
        query += ` LIMIT $${paramIndex}`;
        params.push(criteria.limit);
      }

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Error getting users for deletion:', error);
      throw new Error('Failed to get users for deletion');
    }
  }

  /**
   * Archive user instead of deleting (soft delete)
   * @param {number} userId - The ID of the user to archive
   * @returns {Promise<Object>} Archive result
   */
  async archiveUser(userId) {
    try {
      // First check if user exists
      const userExists = await this.userExists(userId);
      if (!userExists) {
        throw new Error(`User with ID ${userId} does not exist`);
      }

      // Add archived_at column if it doesn't exist
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE
      `);

      // Archive the user
      const query = `
        UPDATE users 
        SET archived_at = NOW(), 
            email = email || '_archived_' || id,
            updated_at = NOW()
        WHERE id = $1 AND archived_at IS NULL
        RETURNING id, name, email, archived_at
      `;
      
      const result = await pool.query(query, [userId]);
      
      if (result.rows.length === 0) {
        throw new Error('User may already be archived or does not exist');
      }

      return {
        success: true,
        user: result.rows[0],
        message: 'User has been successfully archived'
      };
    } catch (error) {
      console.error('Error archiving user:', error);
      throw new Error(`Failed to archive user: ${error.message}`);
    }
  }
}

module.exports = new UserDeletionService();