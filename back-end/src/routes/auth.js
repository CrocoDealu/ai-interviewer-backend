import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { validateAuth, validateSignup } from '../middleware/validation.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// In-memory user storage (replace with database in production)
const users = new Map();

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      name: user.name 
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// POST /api/auth/signup
router.post('/signup', validateSignup, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = Array.from(users.values()).find(user => user.email === email);
    if (existingUser) {
      return res.status(400).json({
        error: 'User already exists',
        message: 'An account with this email already exists'
      });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = {
      id: uuidv4(),
      name: name.trim(),
      email: email.toLowerCase(),
      password: hashedPassword,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    users.set(user.id, user);

    // Generate token
    const token = generateToken(user);

    // Return user data (without password)
    const { password: _, ...userWithoutPassword } = user;
    
    res.status(201).json({
      message: 'User created successfully',
      user: userWithoutPassword,
      token
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create user account'
    });
  }
});

// POST /api/auth/login
router.post('/login', validateAuth, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = Array.from(users.values()).find(user => user.email === email.toLowerCase());
    if (!user) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      });
    }

    // Update last login
    user.lastLogin = new Date().toISOString();
    user.updatedAt = new Date().toISOString();

    // Generate token
    const token = generateToken(user);

    // Return user data (without password)
    const { password: _, ...userWithoutPassword } = user;
    
    res.json({
      message: 'Login successful',
      user: userWithoutPassword,
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to authenticate user'
    });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, (req, res) => {
  try {
    const user = users.get(req.user.id);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User account no longer exists'
      });
    }

    // Return user data (without password)
    const { password: _, ...userWithoutPassword } = user;
    
    res.json({
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get user information'
    });
  }
});

// POST /api/auth/refresh
router.post('/refresh', authenticateToken, (req, res) => {
  try {
    const user = users.get(req.user.id);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User account no longer exists'
      });
    }

    // Generate new token
    const token = generateToken(user);
    
    res.json({
      message: 'Token refreshed successfully',
      token
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to refresh token'
    });
  }
});

export default router;