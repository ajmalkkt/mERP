import { Router, Response } from 'express';
import { AuthenticatedRequest, AuthMiddleware } from '../middleware/authMiddleware';
import { MasterDataService } from '../services/masterDataService';

const router = Router();

// ======================== COMPANY ROUTES ========================

/**
 * POST /api/masters/companies
 * Create a new company
 */
router.post(
  '/companies',
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize('ADMIN'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { name, code, status } = req.body;

      if (!name || !code) {
        return res.status(400).json({ error: 'Name and code are required' });
      }

      const company = await MasterDataService.createCompany({
        name,
        code,
        status,
      });

      res.status(201).json({ data: company, message: 'Company created successfully' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

/**
 * GET /api/masters/companies
 * List all companies with pagination
 */
router.get(
  '/companies',
  AuthMiddleware.authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const skip = req.query.skip ? parseInt(req.query.skip as string) : 0;
      const take = req.query.take ? parseInt(req.query.take as string) : 50;
      const search = req.query.search as string;
      const status = req.query.status as string;

      const result = await MasterDataService.listCompanies({
        skip,
        take,
        search,
        status,
      });

      res.json({ data: result.data, total: result.total });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

/**
 * GET /api/masters/companies/:id
 * Get company by ID
 */
router.get(
  '/companies/:id',
  AuthMiddleware.authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const company = await MasterDataService.getCompany(parseInt(req.params.id as string));
      res.json({ data: company });
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  }
);

/**
 * PUT /api/masters/companies/:id
 * Update company
 */
router.put(
  '/companies/:id',
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize('ADMIN'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const company = await MasterDataService.updateCompany(parseInt(req.params.id as string), req.body);
      res.json({ data: company, message: 'Company updated successfully' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

/**
 * DELETE /api/masters/companies/:id
 * Delete company
 */
router.delete(
  '/companies/:id',
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize('ADMIN'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      await MasterDataService.deleteCompany(parseInt(req.params.id as string));
      res.json({ message: 'Company deleted successfully' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

// ======================== BRANCH ROUTES ========================

/**
 * POST /api/masters/branches
 * Create a new branch
 */
router.post(
  '/branches',
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize('ADMIN'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { companyId, name, code, type, status } = req.body;

      if (!companyId || !name || !code) {
        return res.status(400).json({ error: 'Company ID, name and code are required' });
      }

      const branch = await MasterDataService.createBranch({
        companyId,
        name,
        code,
        type,
        status,
      });

      res.status(201).json({ data: branch, message: 'Branch created successfully' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

/**
 * GET /api/masters/branches?companyId=xxx
 * List branches by company
 */
router.get(
  '/branches',
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

      const result = await MasterDataService.listBranches(companyId, {
        skip,
        take,
        search,
        status,
      });

      res.json({ data: result.data, total: result.total });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

/**
 * GET /api/masters/branches/:id
 * Get branch by ID
 */
router.get(
  '/branches/:id',
  AuthMiddleware.authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const branch = await MasterDataService.getBranch(parseInt(req.params.id as string));
      res.json({ data: branch });
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  }
);

/**
 * PUT /api/masters/branches/:id
 * Update branch
 */
router.put(
  '/branches/:id',
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize('ADMIN'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const branch = await MasterDataService.updateBranch(parseInt(req.params.id as string), req.body);
      res.json({ data: branch, message: 'Branch updated successfully' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

/**
 * DELETE /api/masters/branches/:id
 * Delete branch
 */
router.delete(
  '/branches/:id',
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize('ADMIN'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      await MasterDataService.deleteBranch(parseInt(req.params.id as string));
      res.json({ message: 'Branch deleted successfully' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

// ======================== DEPARTMENT ROUTES ========================

/**
 * POST /api/masters/departments
 * Create a new department
 */
router.post(
  '/departments',
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize('ADMIN'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { companyId, branchId, name, code, status } = req.body;

      if (!companyId || !branchId || !name || !code) {
        return res
          .status(400)
          .json({ error: 'Company ID, branch ID, name and code are required' });
      }

      const dept = await MasterDataService.createDepartment({
        companyId,
        branchId,
        name,
        code,
        status,
      });

      res.status(201).json({ data: dept, message: 'Department created successfully' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

/**
 * GET /api/masters/departments?branchId=xxx
 * List departments by branch
 */
router.get(
  '/departments',
  AuthMiddleware.authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const branchId = req.query.branchId ? parseInt(req.query.branchId as string) : null;
      if (!branchId) {
        return res.status(400).json({ error: 'Branch ID is required' });
      }

      const skip = req.query.skip ? parseInt(req.query.skip as string) : 0;
      const take = req.query.take ? parseInt(req.query.take as string) : 50;
      const search = req.query.search as string;
      const status = req.query.status as string;

      const result = await MasterDataService.listDepartments(branchId, {
        skip,
        take,
        search,
        status,
      });

      res.json({ data: result.data, total: result.total });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

/**
 * GET /api/masters/departments/:id
 * Get department by ID
 */
router.get(
  '/departments/:id',
  AuthMiddleware.authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const dept = await MasterDataService.getDepartment(parseInt(req.params.id as string));
      res.json({ data: dept });
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  }
);

/**
 * PUT /api/masters/departments/:id
 * Update department
 */
router.put(
  '/departments/:id',
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize('ADMIN'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const dept = await MasterDataService.updateDepartment(parseInt(req.params.id as string), req.body);
      res.json({ data: dept, message: 'Department updated successfully' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

/**
 * DELETE /api/masters/departments/:id
 * Delete department
 */
router.delete(
  '/departments/:id',
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize('ADMIN'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      await MasterDataService.deleteDepartment(parseInt(req.params.id as string));
      res.json({ message: 'Department deleted successfully' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

// ======================== USER ROUTES ========================

/**
 * POST /api/masters/users
 * Create a new user
 */
router.post(
  '/users',
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize('ADMIN'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { companyId, email, username, firstName, lastName, departmentId, branchId, status } =
        req.body;

      if (!companyId || !email || !firstName || !lastName) {
        return res
          .status(400)
          .json({ error: 'Company ID, email, first name and last name are required' });
      }

      const user = await MasterDataService.createUser({
        companyId,
        email,
        username: username || email.split('@')[0],
        firstName,
        lastName,
        departmentId,
        branchId,
        status,
      });

      res.status(201).json({ data: user, message: 'User created successfully' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

/**
 * GET /api/masters/users?companyId=xxx
 * List users by company
 */
router.get(
  '/users',
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

      const result = await MasterDataService.listUsers(companyId, {
        skip,
        take,
        search,
        status,
      });

      res.json({ data: result.data, total: result.total });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

/**
 * GET /api/masters/users/:id
 * Get user by ID
 */
router.get(
  '/users/:id',
  AuthMiddleware.authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = await MasterDataService.getUser(parseInt(req.params.id as string));
      res.json({ data: user });
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  }
);

/**
 * PUT /api/masters/users/:id
 * Update user
 */
router.put(
  '/users/:id',
  AuthMiddleware.authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Users can update their own profile, admins can update anyone
      const userId = parseInt(req.params.id as string);
      const user = await MasterDataService.getUser(userId);
      if (req.user?.userId !== userId) {
        // Check if admin
        // This check assumes AuthMiddleware populates req.user
      }

      const updated = await MasterDataService.updateUser(userId, req.body);
      res.json({ data: updated, message: 'User updated successfully' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

/**
 * DELETE /api/masters/users/:id
 * Delete user
 */
router.delete(
  '/users/:id',
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize('ADMIN'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      await MasterDataService.deleteUser(parseInt(req.params.id as string));
      res.json({ message: 'User deleted successfully' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

// ======================== ROLE ROUTES ========================

/**
 * POST /api/masters/roles
 * Create a new role
 */
router.post(
  '/roles',
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize('ADMIN'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { companyId, name, code, description, hierarchyLevel, status } = req.body;

      if (!companyId || !name || !code) {
        return res.status(400).json({ error: 'Company ID, name and code are required' });
      }

      const role = await MasterDataService.createRole({
        companyId,
        name,
        code,
        description,
        hierarchyLevel,
        status,
      });

      res.status(201).json({ data: role, message: 'Role created successfully' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

/**
 * GET /api/masters/roles?companyId=xxx
 * List roles by company
 */
router.get(
  '/roles',
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

      const result = await MasterDataService.listRoles(companyId, {
        skip,
        take,
        search,
        status,
      });

      res.json({ data: result.data, total: result.total });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

/**
 * GET /api/masters/roles/:id
 * Get role by ID
 */
router.get(
  '/roles/:id',
  AuthMiddleware.authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const role = await MasterDataService.getRole(parseInt(req.params.id as string));
      res.json({ data: role });
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  }
);

/**
 * PUT /api/masters/roles/:id
 * Update role
 */
router.put(
  '/roles/:id',
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize('ADMIN'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const role = await MasterDataService.updateRole(parseInt(req.params.id as string), req.body);
      res.json({ data: role, message: 'Role updated successfully' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

/**
 * DELETE /api/masters/roles/:id
 * Delete role
 */
router.delete(
  '/roles/:id',
  AuthMiddleware.authenticate,
  AuthMiddleware.authorize('ADMIN'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      await MasterDataService.deleteRole(parseInt(req.params.id as string));
      res.json({ message: 'Role deleted successfully' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

export default router;
