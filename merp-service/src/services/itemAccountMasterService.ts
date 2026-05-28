import { ProductRepository } from '../repositories/productRepository';
import { AccountRepository } from '../repositories/accountRepository';
import { CategoryRepository } from '../repositories/categoryRepository';
import { UnitRepository } from '../repositories/unitRepository';
import { WarehouseRepository } from '../repositories/warehouseRepository';

// ────────────────────────────────────────────────────────────────
// DTOs
// ────────────────────────────────────────────────────────────────

interface CreateProductDTO {
  companyId: number;
  code: string;
  name: string;
  alias?: string;
  description?: string;
  categoryId?: number;
  unitId?: number;
  hsnCode?: string;
  taxRate?: number;
  purchasePrice?: number;
  sellingPrice?: number;
  reorderLevel?: number;
  reorderQty?: number;
  trackBatch?: boolean;
  trackSerial?: boolean;
  extraData?: any;
  status?: string;
  createdBy?: number;
}

interface CreateAccountDTO {
  companyId: number;
  code: string;
  name: string;
  alias?: string;
  accountType: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';
  parentId?: number;
  isGroup?: boolean;
  subledgerType?: string;
  openingBalance?: number;
  currencyCode?: string;
  extraData?: any;
  status?: string;
  createdBy?: number;
}

interface CreateCategoryDTO {
  companyId: number;
  code: string;
  name: string;
  module?: string;
  parentId?: number;
  status?: string;
  createdBy?: number;
}

interface CreateUnitDTO {
  companyId: number;
  code: string;
  name: string;
  symbol: string;
  decimalPlaces?: number;
  status?: string;
  createdBy?: number;
}

interface CreateWarehouseDTO {
  companyId: number;
  branchId: number;
  code: string;
  name: string;
  alias?: string;
  type?: string;
  address?: string;
  extraData?: any;
  status?: string;
  createdBy?: number;
}

interface PaginationParams {
  skip?: number;
  take?: number;
  search?: string;
  status?: string;
}

// ────────────────────────────────────────────────────────────────
// Item & Account Master Service
// ────────────────────────────────────────────────────────────────

/**
 * ItemAccountMasterService
 * Business logic for Item (Product), Account (Chart of Accounts),
 * Category, Unit, and Warehouse masters.
 */
export class ItemAccountMasterService {
  // ======================== PRODUCT (ITEM) SERVICE ========================

  static async createProduct(data: CreateProductDTO) {
    // Check unique code within company
    if (await ProductRepository.codeExistsInCompany(data.companyId, data.code)) {
      throw new Error(`Item code '${data.code}' already exists in this company`);
    }

    // Validate category if provided
    if (data.categoryId) {
      const category = await CategoryRepository.findById(data.categoryId);
      if (!category) {
        throw new Error(`Category ${data.categoryId} not found`);
      }
    }

    // Validate unit if provided
    if (data.unitId) {
      const unit = await UnitRepository.findById(data.unitId);
      if (!unit) {
        throw new Error(`Unit ${data.unitId} not found`);
      }
    }

    return ProductRepository.create({
      companyId: data.companyId,
      code: data.code,
      name: data.name,
      alias: data.alias,
      description: data.description,
      categoryId: data.categoryId,
      unitId: data.unitId,
      hsnCode: data.hsnCode,
      taxRate: data.taxRate,
      purchasePrice: data.purchasePrice,
      sellingPrice: data.sellingPrice,
      reorderLevel: data.reorderLevel,
      reorderQty: data.reorderQty,
      trackBatch: data.trackBatch || false,
      trackSerial: data.trackSerial || false,
      extraData: data.extraData,
      status: data.status || 'ACTIVE',
      createdBy: data.createdBy,
    });
  }

  static async getProduct(id: number) {
    const product = await ProductRepository.findById(id);
    if (!product) {
      throw new Error(`Product ${id} not found`);
    }
    return product;
  }

  static async listProducts(companyId: number, params: PaginationParams & { categoryId?: number }) {
    const skip = params.skip || 0;
    const take = params.take || 50;

    return ProductRepository.findByCompany(companyId, skip, take, {
      status: params.status,
      search: params.search,
      categoryId: params.categoryId,
    });
  }

  static async updateProduct(id: number, data: Partial<CreateProductDTO>) {
    const product = await ProductRepository.findById(id);
    if (!product) {
      throw new Error(`Product ${id} not found`);
    }

    // Check code uniqueness if changing
    if (data.code && data.code !== product.code) {
      if (await ProductRepository.codeExistsInCompany(product.companyId, data.code, id)) {
        throw new Error(`Item code '${data.code}' already exists`);
      }
    }

    return ProductRepository.update(id, data);
  }

  static async deactivateProduct(id: number) {
    const product = await ProductRepository.findById(id);
    if (!product) {
      throw new Error(`Product ${id} not found`);
    }
    return ProductRepository.deactivate(id);
  }

  static async deleteProduct(id: number) {
    // TODO: Check if product has transactions before allowing hard delete
    return ProductRepository.delete(id);
  }

  static async searchProducts(companyId: number, search: string, limit?: number) {
    return ProductRepository.searchForAutocomplete(companyId, search, limit);
  }

  // ======================== ACCOUNT (COA) SERVICE ========================

  static async createAccount(data: CreateAccountDTO) {
    // Check unique code within company
    if (await AccountRepository.codeExistsInCompany(data.companyId, data.code)) {
      throw new Error(`Account code '${data.code}' already exists in this company`);
    }

    // Validate parent if provided
    let level = 0;
    if (data.parentId) {
      const parent = await AccountRepository.findById(data.parentId);
      if (!parent) {
        throw new Error(`Parent account ${data.parentId} not found`);
      }
      if (!parent.isGroup) {
        throw new Error(`Parent account '${parent.name}' is not a group account`);
      }
      level = parent.level + 1;

      // Inherit accountType from parent
      if (data.accountType && data.accountType !== parent.accountType) {
        throw new Error(`Account type must match parent account type '${parent.accountType}'`);
      }
      data.accountType = parent.accountType as any;
    }

    // Validate accountType
    const validTypes = ['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE'];
    if (!validTypes.includes(data.accountType)) {
      throw new Error(`Invalid account type '${data.accountType}'. Must be one of: ${validTypes.join(', ')}`);
    }

    // Group accounts should not have opening balance
    if (data.isGroup && data.openingBalance && data.openingBalance !== 0) {
      throw new Error('Group accounts cannot have opening balance');
    }

    return AccountRepository.create({
      companyId: data.companyId,
      code: data.code,
      name: data.name,
      alias: data.alias,
      accountType: data.accountType,
      parentId: data.parentId,
      level,
      isGroup: data.isGroup || false,
      subledgerType: data.subledgerType,
      openingBalance: data.openingBalance || 0,
      currencyCode: data.currencyCode || 'INR',
      extraData: data.extraData,
      status: data.status || 'ACTIVE',
      createdBy: data.createdBy,
    });
  }

  static async getAccount(id: number) {
    const account = await AccountRepository.findById(id);
    if (!account) {
      throw new Error(`Account ${id} not found`);
    }
    return account;
  }

  static async listAccounts(
    companyId: number,
    params: PaginationParams & {
      accountType?: string;
      isGroup?: boolean;
      parentId?: number | null;
      subledgerType?: string;
    }
  ) {
    const skip = params.skip || 0;
    const take = params.take || 50;

    return AccountRepository.findByCompany(companyId, skip, take, {
      status: params.status,
      search: params.search,
      accountType: params.accountType,
      isGroup: params.isGroup,
      parentId: params.parentId,
      subledgerType: params.subledgerType,
    });
  }

  static async getAccountTree(companyId: number) {
    return AccountRepository.getAccountTree(companyId);
  }

  static async updateAccount(id: number, data: Partial<CreateAccountDTO>) {
    const account = await AccountRepository.findById(id);
    if (!account) {
      throw new Error(`Account ${id} not found`);
    }

    // Check code uniqueness if changing
    if (data.code && data.code !== account.code) {
      if (await AccountRepository.codeExistsInCompany(account.companyId, data.code, id)) {
        throw new Error(`Account code '${data.code}' already exists`);
      }
    }

    // Prevent changing accountType if account has children
    if (data.accountType && data.accountType !== account.accountType) {
      if (await AccountRepository.hasChildren(id)) {
        throw new Error('Cannot change account type of a group account with children');
      }
    }

    // Prevent changing isGroup if it has children
    if (data.isGroup === false && account.isGroup) {
      if (await AccountRepository.hasChildren(id)) {
        throw new Error('Cannot change to non-group: account has children');
      }
    }

    return AccountRepository.update(id, data);
  }

  static async deactivateAccount(id: number) {
    const account = await AccountRepository.findById(id);
    if (!account) {
      throw new Error(`Account ${id} not found`);
    }

    // Do not allow deactivation of accounts with active children
    if (await AccountRepository.hasChildren(id)) {
      throw new Error('Cannot deactivate account with active child accounts');
    }

    return AccountRepository.deactivate(id);
  }

  static async deleteAccount(id: number) {
    // Check for children
    if (await AccountRepository.hasChildren(id)) {
      throw new Error('Cannot delete account with child accounts');
    }
    // TODO: Check for ledger entries before allowing hard delete
    return AccountRepository.delete(id);
  }

  static async searchAccounts(companyId: number, search: string, limit?: number) {
    return AccountRepository.searchForAutocomplete(companyId, search, limit);
  }

  // ======================== CATEGORY SERVICE ========================

  static async createCategory(data: CreateCategoryDTO) {
    const module = data.module || 'item';
    if (await CategoryRepository.codeExistsInCompany(data.companyId, module, data.code)) {
      throw new Error(`Category code '${data.code}' already exists for module '${module}'`);
    }

    let level = 0;
    if (data.parentId) {
      const parent = await CategoryRepository.findById(data.parentId);
      if (!parent) throw new Error(`Parent category ${data.parentId} not found`);
      level = parent.level + 1;
    }

    return CategoryRepository.create({
      companyId: data.companyId,
      code: data.code,
      name: data.name,
      module,
      parentId: data.parentId,
      level,
      status: data.status || 'ACTIVE',
      createdBy: data.createdBy,
    });
  }

  static async getCategory(id: number) {
    const category = await CategoryRepository.findById(id);
    if (!category) throw new Error(`Category ${id} not found`);
    return category;
  }

  static async listCategories(companyId: number, params: PaginationParams & { module?: string; parentId?: number | null }) {
    const skip = params.skip || 0;
    const take = params.take || 50;

    return CategoryRepository.findByCompany(companyId, skip, take, {
      status: params.status,
      search: params.search,
      module: params.module,
      parentId: params.parentId,
    });
  }

  static async updateCategory(id: number, data: Partial<CreateCategoryDTO>) {
    const category = await CategoryRepository.findById(id);
    if (!category) throw new Error(`Category ${id} not found`);

    if (data.code && data.code !== category.code) {
      if (await CategoryRepository.codeExistsInCompany(category.companyId, category.module, data.code, id)) {
        throw new Error(`Category code '${data.code}' already exists`);
      }
    }

    return CategoryRepository.update(id, data);
  }

  static async deactivateCategory(id: number) {
    const category = await CategoryRepository.findById(id);
    if (!category) throw new Error(`Category ${id} not found`);
    return CategoryRepository.deactivate(id);
  }

  static async deleteCategory(id: number) {
    if (await CategoryRepository.hasChildren(id)) {
      throw new Error('Cannot delete category with sub-categories');
    }
    if (await CategoryRepository.hasProducts(id)) {
      throw new Error('Cannot delete category with assigned products');
    }
    return CategoryRepository.delete(id);
  }

  // ======================== UNIT SERVICE ========================

  static async createUnit(data: CreateUnitDTO) {
    if (await UnitRepository.codeExistsInCompany(data.companyId, data.code)) {
      throw new Error(`Unit code '${data.code}' already exists`);
    }

    return UnitRepository.create({
      companyId: data.companyId,
      code: data.code,
      name: data.name,
      symbol: data.symbol,
      decimalPlaces: data.decimalPlaces ?? 2,
      status: data.status || 'ACTIVE',
      createdBy: data.createdBy,
    });
  }

  static async getUnit(id: number) {
    const unit = await UnitRepository.findById(id);
    if (!unit) throw new Error(`Unit ${id} not found`);
    return unit;
  }

  static async listUnits(companyId: number, params: PaginationParams) {
    const skip = params.skip || 0;
    const take = params.take || 50;

    return UnitRepository.findByCompany(companyId, skip, take, {
      status: params.status,
      search: params.search,
    });
  }

  static async updateUnit(id: number, data: Partial<CreateUnitDTO>) {
    const unit = await UnitRepository.findById(id);
    if (!unit) throw new Error(`Unit ${id} not found`);

    if (data.code && data.code !== unit.code) {
      if (await UnitRepository.codeExistsInCompany(unit.companyId, data.code, id)) {
        throw new Error(`Unit code '${data.code}' already exists`);
      }
    }

    return UnitRepository.update(id, data);
  }

  static async deactivateUnit(id: number) {
    const unit = await UnitRepository.findById(id);
    if (!unit) throw new Error(`Unit ${id} not found`);
    return UnitRepository.deactivate(id);
  }

  static async deleteUnit(id: number) {
    if (await UnitRepository.hasProducts(id)) {
      throw new Error('Cannot delete unit with assigned products');
    }
    return UnitRepository.delete(id);
  }

  // ======================== WAREHOUSE SERVICE ========================

  static async createWarehouse(data: CreateWarehouseDTO) {
    if (await WarehouseRepository.codeExistsInCompany(data.companyId, data.code)) {
      throw new Error(`Warehouse code '${data.code}' already exists`);
    }

    return WarehouseRepository.create({
      companyId: data.companyId,
      branchId: data.branchId,
      code: data.code,
      name: data.name,
      alias: data.alias,
      type: data.type || 'main',
      address: data.address,
      extraData: data.extraData,
      status: data.status || 'ACTIVE',
      createdBy: data.createdBy,
    });
  }

  static async getWarehouse(id: number) {
    const warehouse = await WarehouseRepository.findById(id);
    if (!warehouse) throw new Error(`Warehouse ${id} not found`);
    return warehouse;
  }

  static async listWarehouses(companyId: number, params: PaginationParams & { branchId?: number; type?: string }) {
    const skip = params.skip || 0;
    const take = params.take || 50;

    return WarehouseRepository.findByCompany(companyId, skip, take, {
      status: params.status,
      search: params.search,
      branchId: params.branchId,
      type: params.type,
    });
  }

  static async updateWarehouse(id: number, data: Partial<CreateWarehouseDTO>) {
    const warehouse = await WarehouseRepository.findById(id);
    if (!warehouse) throw new Error(`Warehouse ${id} not found`);

    if (data.code && data.code !== warehouse.code) {
      if (await WarehouseRepository.codeExistsInCompany(warehouse.companyId, data.code, id)) {
        throw new Error(`Warehouse code '${data.code}' already exists`);
      }
    }

    return WarehouseRepository.update(id, data);
  }

  static async deactivateWarehouse(id: number) {
    const warehouse = await WarehouseRepository.findById(id);
    if (!warehouse) throw new Error(`Warehouse ${id} not found`);
    return WarehouseRepository.deactivate(id);
  }

  static async deleteWarehouse(id: number) {
    // TODO: Check for stock movements before allowing hard delete
    return WarehouseRepository.delete(id);
  }
}
