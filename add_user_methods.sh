#!/bin/bash

# This script adds the missing user methods to userController.js

FILE="/Users/amoghk/Downloads/bounties-and-berries-server/controllers/userController.js"

# Create a temporary file with the new methods
cat >> "$FILE" << 'EOF'

// Get current user profile
const getCurrentUser = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const user = await userService.getUserById(userId);
    res.json({ success: true, data: user });
  } catch (err) {
    if (err.message.includes('USER_NOT_FOUND')) {
      next(new ApiError('User not found', 404));
    } else {
      next(new ApiError('Failed to fetch current user', 500));
    }
  }
};

// Update current user profile
const updateCurrentUser = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const updateData = req.body;
    delete updateData.password;
    delete updateData.role_id;
    delete updateData.is_active;
    const user = await userService.updateUser(userId, updateData);
    res.json({ success: true, data: user, message: 'Profile updated successfully' });
  } catch (err) {
    if (err.message.includes('USER_NOT_FOUND')) {
      next(new ApiError('User not found', 404));
    } else {
      next(new ApiError('Failed to update profile', 500));
    }
  }
};

// Get user statistics
const getUserStats = async (req, res, next) => {
  try {
    const { id } = req.params;
    const pool = require('../config/db');
    
    const earningsQuery = `
      SELECT 
        COALESCE(SUM(points_earned), 0) as total_points_earned,
        COALESCE(SUM(berries_earned), 0) as total_berries_earned
      FROM user_bounty_participation
      WHERE user_id = $1 AND status = 'completed'
    `;
    const { rows: earnings } = await pool.query(earningsQuery, [id]);
    
    const spentQuery = `
      SELECT COALESCE(SUM(berries_spent), 0) as total_berries_spent
      FROM user_reward_claim
      WHERE user_id = $1
    `;
    const { rows: spent } = await pool.query(spentQuery, [id]);
    
    const achievementsQuery = `
      SELECT 
        COUNT(*) as total_bounties_completed,
        COUNT(DISTINCT bounty_id) as unique_bounties
      FROM user_bounty_participation
      WHERE user_id = $1 AND status = 'completed'
    `;
    const { rows: achievements } = await pool.query(achievementsQuery, [id]);
    
    const rewardsQuery = `
      SELECT COUNT(*) as total_rewards_claimed
      FROM user_reward_claim
      WHERE user_id = $1
    `;
    const { rows: rewards } = await pool.query(rewardsQuery, [id]);
    
    res.json({
      success: true,
      data: {
        points: {
          total_earned: parseInt(earnings[0].total_points_earned),
          current: parseInt(earnings[0].total_points_earned)
        },
        berries: {
          total_earned: parseInt(earnings[0].total_berries_earned),
          total_spent: parseInt(spent[0].total_berries_spent),
          current: parseInt(earnings[0].total_berries_earned) - parseInt(spent[0].total_berries_spent)
        },
        achievements: {
          bounties_completed: parseInt(achievements[0].total_bounties_completed),
          unique_bounties: parseInt(achievements[0].unique_bounties),
          rewards_claimed: parseInt(rewards[0].total_rewards_claimed)
        }
      }
    });
  } catch (err) {
    next(new ApiError('Failed to fetch user stats', 500));
  }
};
EOF

# Now update the module.exports line
sed -i '' 's/searchUsersByMobile$/searchUsersByMobile,\n  getCurrentUser,\n  updateCurrentUser,\n  getUserStats/' "$FILE"

echo "✅ User methods added successfully!"
