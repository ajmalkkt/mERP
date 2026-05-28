import express from 'express';
import { ConfigurationService } from '../services/configurationService';
import { AuthMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

/**
 * GET /api/config/:module/:key
 * Get configuration value
 */
router.get('/:module/:key', AuthMiddleware.authenticate, async (req, res) => {
  try {
    const { module, key } = req.params as { module: string; key: string };
    const companyId = (req as any).companyId;

    const value = await ConfigurationService.getConfig(companyId || null, module, key);

    res.json({
      success: true,
      data: value
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message }
    });
  }
});

/**
 * PUT /api/config/:module/:key
 * Set configuration value
 */
router.put('/:module/:key', AuthMiddleware.authenticate, AuthMiddleware.requireRole('admin'), async (req, res) => {
  try {
    const { module, key } = req.params as { module: string; key: string };
    const { value, dataType } = req.body;
    const companyId = (req as any).companyId;

    const config = await ConfigurationService.setConfig(companyId || null, module, key, value, dataType);

    res.json({
      success: true,
      data: config,
      message: 'Configuration updated'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message }
    });
  }
});

/**
 * GET /api/config/tags
 * Get tag mappings
 */
router.get('/tags', AuthMiddleware.authenticate, async (req, res) => {
  try {
    const companyId = (req as any).companyId;
    const tags = await ConfigurationService.getAllTagMappings(companyId);

    res.json({
      success: true,
      data: tags
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message }
    });
  }
});

/**
 * PUT /api/config/tags/:entity
 * Set tag mapping
 */
router.put('/tags/:entity', AuthMiddleware.authenticate, AuthMiddleware.requireRole('admin'), async (req, res) => {
  try {
    const { entity } = req.params as { entity: string };
    const { displayName, pluralName } = req.body;
    const companyId = (req as any).companyId;

    const tag = await ConfigurationService.setTagMapping(companyId || null, entity, displayName, pluralName);

    res.json({
      success: true,
      data: tag,
      message: 'Tag mapping updated'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message }
    });
  }
});

export default router;