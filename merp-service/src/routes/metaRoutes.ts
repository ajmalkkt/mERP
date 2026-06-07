import { Router } from 'express';
import { MetaService } from '../services/metaService';
import { prisma } from '../index';

const router = Router();

// /api/meta/tags
router.get('/tags', async (req, res) => {
  try {
    const companyId = req.query.companyId ? Number(req.query.companyId) : undefined;
    const mappings = await MetaService.getTagMappings(companyId);
    res.json(mappings);
  } catch (error) {
    console.error("Error fetching tags:", error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// /api/meta/entity/:entityName/fields
router.get('/entity/:entityName/fields', async (req, res) => {
  try {
    const fields = await MetaService.getEntityFields(req.params.entityName);
    res.json(fields);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// /api/meta/voucher/:type
router.get('/voucher/:type', async (req, res) => {
  try {
    const schema = await MetaService.getVoucherSchema(req.params.type.toUpperCase());
    res.json(schema);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * GET /api/meta/master/:entityName
 * Get master data for a specific entity (e.g., PRODUCT, ACCOUNT, etc.)
 */
router.get('/master/:entityName', async (req, res) => {
  try {
    const entityName = req.params.entityName.toUpperCase();
    const companyId = req.query.companyId ? parseInt(req.query.companyId as string) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

    let masterData = [];

    // Map entity names to their repository tables
    switch (entityName) {
      case 'PRODUCT':
        masterData = await prisma.mstProduct.findMany({
          where: companyId ? { companyId } : {},
          take: limit,
          skip: offset,
          orderBy: { createdAt: 'desc' }
        });
        break;

      case 'ACCOUNT':
        masterData = await prisma.mstAccount.findMany({
          where: companyId ? { companyId } : {},
          take: limit,
          skip: offset,
          orderBy: { createdAt: 'desc' }
        });
        break;

      case 'WAREHOUSE':
        masterData = await prisma.mstWarehouse.findMany({
          where: companyId ? { companyId } : {},
          take: limit,
          skip: offset,
          orderBy: { createdAt: 'desc' }
        });
        break;

      case 'BRANCH':
        masterData = await prisma.mstBranch.findMany({
          where: companyId ? { companyId } : {},
          take: limit,
          skip: offset,
          orderBy: { createdAt: 'desc' }
        });
        break;

      case 'COMPANY':
        masterData = await prisma.mstCompany.findMany({
          take: limit,
          skip: offset,
          orderBy: { createdAt: 'desc' }
        });
        break;

      case 'UNIT':
        masterData = await prisma.mstUnit.findMany({
          where: companyId ? { companyId } : {},
          take: limit,
          skip: offset,
          orderBy: { createdAt: 'desc' }
        });
        break;

      case 'CATEGORY':
        masterData = await prisma.mstCategory.findMany({
          where: companyId ? { companyId } : {},
          take: limit,
          skip: offset,
          orderBy: { createdAt: 'desc' }
        });
        break;

      default:
        return res.status(404).json({
          success: false,
          error: `Entity '${entityName}' not supported`
        });
    }

    res.json({
      success: true,
      data: masterData,
      length: masterData.length,
      limit,
      offset
    });
  } catch (error: any) {
    console.error("Error fetching master data:", error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal Server Error'
    });
  }
});

export default router;
