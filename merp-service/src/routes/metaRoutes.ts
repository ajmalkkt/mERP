import { Router } from 'express';
import { MetaService } from '../services/metaService';

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

export default router;
