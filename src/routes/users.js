import express from 'express';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// In-memory user storage (same as auth.js - should be shared in production)
const users = new Map();

// GET /api/users/profile
router.get('/profile', authenticateToken, (req, res) => {
  try {
    const user = users.get(req.user.id);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User profile not found'
      });
    }

    // Return user data (without password)
    const { password: _, ...userWithoutPassword } = user;
    
    res.json({
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get user profile'
    });
  }
});

// PUT /api/users/profile
router.put('/profile', authenticateToken, (req, res) => {
  try {
    const { name, avatar } = req.body;
    const user = users.get(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User profile not found'
      });
    }

    // Update user data
    if (name && name.trim()) {
      user.name = name.trim();
    }
    
    if (avatar) {
      user.avatar = avatar;
    }

    user.updatedAt = new Date().toISOString();

    // Return updated user data (without password)
    const { password: _, ...userWithoutPassword } = user;
    
    res.json({
      message: 'Profile updated successfully',
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update user profile'
    });
  }
});

// GET /api/users/stats
router.get('/stats', authenticateToken, (req, res) => {
  try {
    // Mock stats - in production, calculate from actual data
    const stats = {
      totalInterviews: Math.floor(Math.random() * 20) + 5,
      averageScore: Math.floor(Math.random() * 30) + 70,
      improvementRate: Math.floor(Math.random() * 20) + 5,
      timeSpent: Math.floor(Math.random() * 10) + 2,
      lastInterviewDate: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
    };

    res.json({
      stats
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get user statistics'
    });
  }
});

export default router;