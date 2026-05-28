import { Router, Request, Response } from 'express';
import { MetadataService } from '../services/metadataService';

const router = Router();

/** Safely extract a route param as string (Express 5 types params as string | string[]). */
const param = (req: Request, name: string): string => String(req.params[name] || '');

// ═══════════════════════════════════════════════
// ENGINE 1: Entity Metadata
// ═══════════════════════════════════════════════

/**
 * GET /api/metadata/entities
 * List all registered entities.
 */
router.get('/entities', async (_req: Request, res: Response) => {
  try {
    const entities = await MetadataService.listEntities();
    res.json({ success: true, data: entities });
  } catch (error: any) {
    console.error('Error listing entities:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/**
 * GET /api/metadata/entities/:entityName
 * Get entity definition with all fields.
 */
router.get('/entities/:entityName', async (req: Request, res: Response) => {
  try {
    const entity = await MetadataService.getEntityWithFields(param(req, 'entityName'));
    if (!entity) {
      return res.status(404).json({ success: false, error: { message: 'Entity not found' } });
    }
    res.json({ success: true, data: entity });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/**
 * GET /api/metadata/entities/:entityName/fields
 * Get field metadata for an entity (form/grid rendering).
 * Merges system fields with custom fields.
 */
router.get('/entities/:entityName/fields', async (req: Request, res: Response) => {
  try {
    const companyId = req.query.companyId ? Number(req.query.companyId) : undefined;
    const result = await MetadataService.getEntityFields(param(req, 'entityName'), companyId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/**
 * POST /api/metadata/entities
 * Register a new entity in the metadata system.
 */
router.post('/entities', async (req: Request, res: Response) => {
  try {
    const { entityName, tableName } = req.body;
    if (!entityName || !tableName) {
      return res.status(400).json({
        success: false,
        error: { message: 'entityName and tableName are required' },
      });
    }
    const entity = await MetadataService.createEntity(entityName, tableName);
    res.status(201).json({ success: true, data: entity });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/**
 * POST /api/metadata/entities/:entityName/fields
 * Add a field to an entity.
 */
router.post('/entities/:entityName/fields', async (req: Request, res: Response) => {
  try {
    const entity = await MetadataService.getEntityWithFields(param(req, 'entityName'));
    if (!entity) {
      return res.status(404).json({ success: false, error: { message: 'Entity not found' } });
    }

    const { fieldName, dataType, source, uiControl, required } = req.body;
    if (!fieldName || !dataType || !source || !uiControl) {
      return res.status(400).json({
        success: false,
        error: { message: 'fieldName, dataType, source, and uiControl are required' },
      });
    }

    const field = await MetadataService.addField(entity.id, {
      fieldName,
      dataType,
      source,
      uiControl,
      required,
    });
    res.status(201).json({ success: true, data: field });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/**
 * PUT /api/metadata/fields/:fieldId
 * Update a field definition.
 */
router.put('/fields/:fieldId', async (req: Request, res: Response) => {
  try {
    const fieldId = Number(param(req, 'fieldId'));
    const field = await MetadataService.updateField(fieldId, req.body);
    res.json({ success: true, data: field });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/**
 * DELETE /api/metadata/fields/:fieldId
 * Delete a field definition.
 */
router.delete('/fields/:fieldId', async (req: Request, res: Response) => {
  try {
    const fieldId = Number(param(req, 'fieldId'));
    await MetadataService.deleteField(fieldId);
    res.json({ success: true, message: 'Field deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// ═══════════════════════════════════════════════
// ENGINE 2: Dynamic Fields (Custom Field Values)
// ═══════════════════════════════════════════════

/**
 * GET /api/metadata/custom/:entityName/:entityId
 * Get custom field values for a specific entity record.
 */
router.get('/custom/:entityName/:entityId', async (req: Request, res: Response) => {
  try {
    const values = await MetadataService.getCustomFieldValues(
      param(req, 'entityName'),
      Number(param(req, 'entityId'))
    );
    res.json({ success: true, data: values });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/**
 * POST /api/metadata/custom/:entityName/:entityId
 * Save custom field values for an entity record.
 * Body: { fieldValues: [{ fieldId: number, value: string }] }
 */
router.post('/custom/:entityName/:entityId', async (req: Request, res: Response) => {
  try {
    const { fieldValues } = req.body;
    if (!Array.isArray(fieldValues)) {
      return res.status(400).json({
        success: false,
        error: { message: 'fieldValues must be an array' },
      });
    }

    const result = await MetadataService.saveCustomFieldValues(
      param(req, 'entityName'),
      Number(param(req, 'entityId')),
      fieldValues
    );
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// ═══════════════════════════════════════════════
// ENGINE 3: Tag Mapping
// ═══════════════════════════════════════════════

/**
 * GET /api/metadata/tags
 * Get all tag mappings.
 */
router.get('/tags', async (req: Request, res: Response) => {
  try {
    const companyId = req.query.companyId ? Number(req.query.companyId) : undefined;
    const tags = await MetadataService.getTagMappings(companyId);
    res.json({ success: true, data: tags });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/**
 * GET /api/metadata/tags/:entityName/resolve
 * Resolve a single tag to its display name.
 */
router.get('/tags/:entityName/resolve', async (req: Request, res: Response) => {
  try {
    const companyId = req.query.companyId ? Number(req.query.companyId) : undefined;
    const displayName = await MetadataService.resolveTag(param(req, 'entityName'), companyId);
    res.json({ success: true, data: { displayName } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/**
 * PUT /api/metadata/tags/:entityName
 * Set a tag mapping.
 */
router.put('/tags/:entityName', async (req: Request, res: Response) => {
  try {
    const { displayName, pluralName, companyId } = req.body;
    if (!displayName) {
      return res.status(400).json({
        success: false,
        error: { message: 'displayName is required' },
      });
    }

    const tag = await MetadataService.setTagMapping(
      companyId || null,
      param(req, 'entityName'),
      displayName,
      pluralName
    );
    res.json({ success: true, data: tag, message: 'Tag mapping updated' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// ═══════════════════════════════════════════════
// ENGINE 4: Voucher Configuration
// ═══════════════════════════════════════════════

/**
 * GET /api/metadata/vouchers
 * List all voucher type definitions.
 */
router.get('/vouchers', async (_req: Request, res: Response) => {
  try {
    const types = await MetadataService.listVoucherTypes();
    res.json({ success: true, data: types });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/**
 * GET /api/metadata/vouchers/:voucherType
 * Get full voucher configuration.
 */
router.get('/vouchers/:voucherType', async (req: Request, res: Response) => {
  try {
    const vType = param(req, 'voucherType').toUpperCase();
    const config = await MetadataService.getVoucherConfig(vType);
    if (!config) {
      return res.status(404).json({
        success: false,
        error: { message: `Voucher type "${vType}" not found` },
      });
    }
    res.json({ success: true, data: config });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/**
 * POST /api/metadata/vouchers
 * Create a new voucher type definition.
 */
router.post('/vouchers', async (req: Request, res: Response) => {
  try {
    const { voucherType, module } = req.body;
    if (!voucherType || !module) {
      return res.status(400).json({
        success: false,
        error: { message: 'voucherType and module are required' },
      });
    }
    const def = await MetadataService.createVoucherType(voucherType.toUpperCase(), module);
    res.status(201).json({ success: true, data: def });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/**
 * POST /api/metadata/vouchers/:voucherId/fields
 * Link a field to a voucher type.
 */
router.post('/vouchers/:voucherId/fields', async (req: Request, res: Response) => {
  try {
    const { fieldId } = req.body;
    if (!fieldId) {
      return res.status(400).json({
        success: false,
        error: { message: 'fieldId is required' },
      });
    }
    const link = await MetadataService.addVoucherField(
      Number(param(req, 'voucherId')),
      Number(fieldId)
    );
    res.status(201).json({ success: true, data: link });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// ═══════════════════════════════════════════════
// ENGINE 8: Number Sequences
// ═══════════════════════════════════════════════

/**
 * POST /api/metadata/sequences/generate
 * Generate the next number in a sequence.
 * Body: { companyId, voucherType, branchId?, financialYear? }
 */
router.post('/sequences/generate', async (req: Request, res: Response) => {
  try {
    const { companyId, voucherType, branchId, financialYear } = req.body;
    if (!companyId || !voucherType) {
      return res.status(400).json({
        success: false,
        error: { message: 'companyId and voucherType are required' },
      });
    }

    const number = await MetadataService.generateNumber(
      Number(companyId),
      voucherType,
      branchId ? Number(branchId) : undefined,
      financialYear
    );
    res.json({ success: true, data: { generatedNumber: number } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/**
 * GET /api/metadata/sequences?companyId=xxx
 * List all sequences for a company.
 */
router.get('/sequences', async (req: Request, res: Response) => {
  try {
    const companyId = Number(req.query.companyId);
    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: { message: 'companyId query parameter is required' },
      });
    }
    const sequences = await MetadataService.getSequences(companyId);
    res.json({ success: true, data: sequences });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/**
 * PUT /api/metadata/sequences
 * Create or update a number sequence.
 */
router.put('/sequences', async (req: Request, res: Response) => {
  try {
    const { companyId, branchId, voucherType, prefix, pattern, financialYear, padLength } = req.body;
    if (!companyId || !voucherType || !prefix || !pattern || !financialYear) {
      return res.status(400).json({
        success: false,
        error: { message: 'companyId, voucherType, prefix, pattern, and financialYear are required' },
      });
    }

    const sequence = await MetadataService.upsertSequence({
      companyId: Number(companyId),
      branchId: branchId ? Number(branchId) : undefined,
      voucherType,
      prefix,
      pattern,
      financialYear,
      padLength,
    });
    res.json({ success: true, data: sequence, message: 'Sequence saved' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// ═══════════════════════════════════════════════
// Cache Management
// ═══════════════════════════════════════════════

/**
 * GET /api/metadata/cache/reload
 * Admin endpoint to signal cache reload.
 */
router.get('/cache/reload', async (_req: Request, res: Response) => {
  try {
    // In production, this would invalidate Redis cache
    // For now, just return success — client-side stores handle their own cache
    res.json({ success: true, message: 'Cache reload signal sent' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

export default router;
