import express from 'express';
import { SecurityService } from '../services/securityService';
import { AuthMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

/**
 * POST /api/auth/login
 * User authentication endpoint
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Username and password required' }
      });
    }

    const result = await SecurityService.authenticateUser(username, password);

    res.json({
      success: true,
      data: result,
      message: 'Login successful'
    });
  } catch (error: any) {
    res.status(401).json({
      success: false,
      error: { code: 'AUTH_ERROR', message: error.message }
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout endpoint (client-side token removal)
 */
router.post('/logout', AuthMiddleware.authenticate, (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get('/me', AuthMiddleware.authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const dataScope = await SecurityService.getUserDataScope(user.userId);

    res.json({
      success: true,
      data: {
        ...user,
        dataScope
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message }
    });
  }
});

/**
 * GET /api/auth/permissions
 * Get current user's permissions
 */
router.get('/permissions', AuthMiddleware.authenticate, (req, res) => {
  const user = (req as any).user;
  res.json({
    success: true,
    data: {
      roles: user.roles,
      permissions: user.permissions
    }
  });
});

export default router;