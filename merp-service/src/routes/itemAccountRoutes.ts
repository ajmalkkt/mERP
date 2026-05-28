import { Router, Response } from 'express';
import { AuthenticatedRequest, AuthMiddleware } from '../middleware/authMiddleware';
import { ItemAccountMasterService } from '../services/itemAccountMasterService';

const router = Router();

// ======================== PRODUCT (ITEM) ROUTES ========================

/**
 * POST /api/masters/products
 */
router.post(
  '/products',
  AuthMiddleware.authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { companyId, code, name, alias, description, categoryId, unitId,
        hsnCode, taxRate, purchasePrice, sellingPrice, reorderLevel, reorderQty,
        trackBatch, trackSerial, extraData, status } = req.body;

      if (!companyId || !code || !name) {
        return res.status(400).json({ error: 'Company ID, code and name are required' });
      }

      const product = await ItemAccountMasterService.createProduct({
        companyId, code, name, alias, description, categoryId, unitId,
        hsnCode, taxRate, purchasePrice, sellingPrice, reorderLevel, reorderQty,
        trackBatch, trackSerial, extraData, status,
        createdBy: req.user?.userId,
      });

      res.status(201).json({ data: product, message: 'Product created successfully' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

/**
 * GET /api/masters/products?companyId=xxx
 */
router.get(
  '/products',
  AuthMiddleware.authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const companyId = req.query.companyId ? parseInt(req.query.companyId as string) : null;
      if (!companyId) {
        return res.status(400).json({ error: 'Company ID is required' });
      }

      const skip = req.query.skip ? parseInt(req.query.skip as string) : 0;
      const take = req.query.take ? parseInt(req.query.take as string) : 50;
      const search = req.query.search as string;
      const status = req.query.status as string;
      const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined;

      const result = await ItemAccountMasterService.listProducts(companyId, {
        skip, take, search, status, categoryId,
      });

      res.json({ data: result.data, total: result.total });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

/**
 * GET /api/masters/products/search?companyId=xxx&q=xxx
 * Lightweight autocomplete endpoint
 */
router.get(
  '/products/search',
  AuthMiddleware.authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const companyId = req.query.companyId ? parseInt(req.query.companyId as string) : null;
      const q = req.query.q as string;
      if (!companyId || !q) {
        return res.status(400).json({ error: 'Company ID and search query are required' });
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const results = await ItemAccountMasterService.searchProducts(companyId, q, limit);
      res.json({ data: results });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

/**
 * GET /api/masters/products/:id
 */
router.get(
  '/products/:id',
  AuthMiddleware.authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const product = await ItemAccountMasterService.getProduct(parseInt(req.params.id as string));
      res.json({ data: product });
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  }
);

/**
 * PUT /api/masters/products/:id
 */
router.put(
  '/products/:id',
  AuthMiddleware.authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const product = await ItemAccountMasterService.updateProduct(parseInt(req.params.id as string), req.body);
      res.json({ data: product, message: 'Product updated successfully' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

/**
 * DELETE /api/masters/products/:id
 */
router.delete(
  '/products/:id',
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize('ADMIN'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      await ItemAccountMasterService.deactivateProduct(parseInt(req.params.id as string));
      res.json({ message: 'Product deactivated successfully' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

// ======================== ACCOUNT (COA) ROUTES ========================

/**
 * POST /api/masters/accounts
 */
router.post(
  '/accounts',
  AuthMiddleware.authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { companyId, code, name, alias, accountType, parentId, isGroup,
        subledgerType, openingBalance, currencyCode, extraData, status } = req.body;

      if (!companyId || !code || !name || !accountType) {
        return res.status(400).json({ error: 'Company ID, code, name and account type are required' });
      }

      const account = await ItemAccountMasterService.createAccount({
        companyId, code, name, alias, accountType, parentId, isGroup,
        subledgerType, openingBalance, currencyCode, extraData, status,
        createdBy: req.user?.userId,
      });

      res.status(201).json({ data: account, message: 'Account created successfully' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

/**
 * GET /api/masters/accounts?companyId=xxx
 */
router.get(
  '/accounts',
  AuthMiddleware.authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const companyId = req.query.companyId ? parseInt(req.query.companyId as string) : null;
      if (!companyId) {
        return res.status(400).json({ error: 'Company ID is required' });
      }

      const skip = req.query.skip ? parseInt(req.query.skip as string) : 0;
      const take = req.query.take ? parseInt(req.query.take as string) : 50;
      const search = req.query.search as string;
      const status = req.query.status as string;
      const accountType = req.query.accountType as string;
      const isGroup = req.query.isGroup !== undefined ? req.query.isGroup === 'true' : undefined;
      const parentId = req.query.parentId !== undefined
        ? (req.query.parentId === 'null' ? null : parseInt(req.query.parentId as string))
        : undefined;
      const subledgerType = req.query.subledgerType as string;

      const result = await ItemAccountMasterService.listAccounts(companyId, {
        skip, take, search, status, accountType, isGroup, parentId, subledgerType,
      });

      res.json({ data: result.data, total: result.total });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

/**
 * GET /api/masters/accounts/tree?companyId=xxx
 * Get hierarchical account tree (Chart of Accounts)
 */
router.get(
  '/accounts/tree',
  AuthMiddleware.authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const companyId = req.query.companyId ? parseInt(req.query.companyId as string) : null;
      if (!companyId) {
        return res.status(400).json({ error: 'Company ID is required' });
      }

      const tree = await ItemAccountMasterService.getAccountTree(companyId);
      res.json({ data: tree });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

/**
 * GET /api/masters/accounts/search?companyId=xxx&q=xxx
 * Lightweight autocomplete for voucher entry
 */
router.get(
  '/accounts/search',
  AuthMiddleware.authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const companyId = req.query.companyId ? parseInt(req.query.companyId as string) : null;
      const q = req.query.q as string;
      if (!companyId || !q) {
        return res.status(400).json({ error: 'Company ID and search query are required' });
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const results = await ItemAccountMasterService.searchAccounts(companyId, q, limit);
      res.json({ data: results });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

/**
 * GET /api/masters/accounts/:id
 */
router.get(
  '/accounts/:id',
  AuthMiddleware.authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const account = await ItemAccountMasterService.getAccount(parseInt(req.params.id as string));
      res.json({ data: account });
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  }
);

/**
 * PUT /api/masters/accounts/:id
 */
router.put(
  '/accounts/:id',
  AuthMiddleware.authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const account = await ItemAccountMasterService.updateAccount(parseInt(req.params.id as string), req.body);
      res.json({ data: account, message: 'Account updated successfully' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

/**
 * DELETE /api/masters/accounts/:id
 */
router.delete(
  '/accounts/:id',
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize('ADMIN'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      await ItemAccountMasterService.deactivateAccount(parseInt(req.params.id as string));
      res.json({ message: 'Account deactivated successfully' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

// ======================== CATEGORY ROUTES ========================

/**
 * POST /api/masters/categories
 */
router.post(
  '/categories',
  AuthMiddleware.authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { companyId, code, name, module, parentId, status } = req.body;
      if (!companyId || !code || !name) {
        return res.status(400).json({ error: 'Company ID, code and name are required' });
      }

      const category = await ItemAccountMasterService.createCategory({
        companyId, code, name, module, parentId, status,
        createdBy: req.user?.userId,
      });

      res.status(201).json({ data: category, message: 'Category created successfully' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

/**
 * GET /api/masters/categories?companyId=xxx
 */
router.get(
  '/categories',
  AuthMiddleware.authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const companyId = req.query.companyId ? parseInt(req.query.companyId as string) : null;
      if (!companyId) {
        return res.status(400).json({ error: 'Company ID is required' });
      }

      const skip = req.query.skip ? parseInt(req.query.skip as string) : 0;
      const take = req.query.take ? parseInt(req.query.take as string) : 50;
      const search = req.query.search as string;
      const status = req.query.status as string;
      const module = req.query.module as string;

      const result = await ItemAccountMasterService.listCategories(companyId, {
        skip, take, search, status, module,
      });

      res.json({ data: result.data, total: result.total });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

/**
 * GET /api/masters/categories/:id
 */
router.get(
  '/categories/:id',
  AuthMiddleware.authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const category = await ItemAccountMasterService.getCategory(parseInt(req.params.id as string));
      res.json({ data: category });
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  }
);

/**
 * PUT /api/masters/categories/:id
 */
router.put(
  '/categories/:id',
  AuthMiddleware.authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const category = await ItemAccountMasterService.updateCategory(parseInt(req.params.id as string), req.body);
      res.json({ data: category, message: 'Category updated successfully' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

/**
 * DELETE /api/masters/categories/:id
 */
router.delete(
  '/categories/:id',
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize('ADMIN'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      await ItemAccountMasterService.deactivateCategory(parseInt(req.params.id as string));
      res.json({ message: 'Category deactivated successfully' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

// ======================== UNIT ROUTES ========================

/**
 * POST /api/masters/units
 */
router.post(
  '/units',
  AuthMiddleware.authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { companyId, code, name, symbol, decimalPlaces, status } = req.body;
      if (!companyId || !code || !name || !symbol) {
        return res.status(400).json({ error: 'Company ID, code, name and symbol are required' });
      }

      const unit = await ItemAccountMasterService.createUnit({
        companyId, code, name, symbol, decimalPlaces, status,
        createdBy: req.user?.userId,
      });

      res.status(201).json({ data: unit, message: 'Unit created successfully' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

/**
 * GET /api/masters/units?companyId=xxx
 */
router.get(
  '/units',
  AuthMiddleware.authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const companyId = req.query.companyId ? parseInt(req.query.companyId as string) : null;
      if (!companyId) {
        return res.status(400).json({ error: 'Company ID is required' });
      }

      const skip = req.query.skip ? parseInt(req.query.skip as string) : 0;
      const take = req.query.take ? parseInt(req.query.take as string) : 50;
      const search = req.query.search as string;
      const status = req.query.status as string;

      const result = await ItemAccountMasterService.listUnits(companyId, {
        skip, take, search, status,
      });

      res.json({ data: result.data, total: result.total });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

/**
 * GET /api/masters/units/:id
 */
router.get(
  '/units/:id',
  AuthMiddleware.authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const unit = await ItemAccountMasterService.getUnit(parseInt(req.params.id as string));
      res.json({ data: unit });
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  }
);

/**
 * PUT /api/masters/units/:id
 */
router.put(
  '/units/:id',
  AuthMiddleware.authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const unit = await ItemAccountMasterService.updateUnit(parseInt(req.params.id as string), req.body);
      res.json({ data: unit, message: 'Unit updated successfully' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

/**
 * DELETE /api/masters/units/:id
 */
router.delete(
  '/units/:id',
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize('ADMIN'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      await ItemAccountMasterService.deactivateUnit(parseInt(req.params.id as string));
      res.json({ message: 'Unit deactivated successfully' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

// ======================== WAREHOUSE ROUTES ========================

/**
 * POST /api/masters/warehouses
 */
router.post(
  '/warehouses',
  AuthMiddleware.authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { companyId, branchId, code, name, alias, type, address, extraData, status } = req.body;
      if (!companyId || !branchId || !code || !name) {
        return res.status(400).json({ error: 'Company ID, branch ID, code and name are required' });
      }

      const warehouse = await ItemAccountMasterService.createWarehouse({
        companyId, branchId, code, name, alias, type, address, extraData, status,
        createdBy: req.user?.userId,
      });

      res.status(201).json({ data: warehouse, message: 'Warehouse created successfully' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

/**
 * GET /api/masters/warehouses?companyId=xxx
 */
router.get(
  '/warehouses',
  AuthMiddleware.authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const companyId = req.query.companyId ? parseInt(req.query.companyId as string) : null;
      if (!companyId) {
        return res.status(400).json({ error: 'Company ID is required' });
      }

      const skip = req.query.skip ? parseInt(req.query.skip as string) : 0;
      const take = req.query.take ? parseInt(req.query.take as string) : 50;
      const search = req.query.search as string;
      const status = req.query.status as string;
      const branchId = req.query.branchId ? parseInt(req.query.branchId as string) : undefined;
      const type = req.query.type as string;

      const result = await ItemAccountMasterService.listWarehouses(companyId, {
        skip, take, search, status, branchId, type,
      });

      res.json({ data: result.data, total: result.total });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

/**
 * GET /api/masters/warehouses/:id
 */
router.get(
  '/warehouses/:id',
  AuthMiddleware.authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const warehouse = await ItemAccountMasterService.getWarehouse(parseInt(req.params.id as string));
      res.json({ data: warehouse });
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  }
);

/**
 * PUT /api/masters/warehouses/:id
 */
router.put(
  '/warehouses/:id',
  AuthMiddleware.authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const warehouse = await ItemAccountMasterService.updateWarehouse(parseInt(req.params.id as string), req.body);
      res.json({ data: warehouse, message: 'Warehouse updated successfully' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

/**
 * DELETE /api/masters/warehouses/:id
 */
router.delete(
  '/warehouses/:id',
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize('ADMIN'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      await ItemAccountMasterService.deactivateWarehouse(parseInt(req.params.id as string));
      res.json({ message: 'Warehouse deactivated successfully' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

export default router;
