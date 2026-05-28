// ───────────────────────────────────────────────
// Shared ERP TypeScript interfaces
// ───────────────────────────────────────────────

/** Base interface for all master entities */
export interface BaseMaster {
  id: number;
  code: string;
  name: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
  createdBy?: number;
}

/** Company entity */
export interface Company extends BaseMaster {
  alias?: string;
}

/** Branch entity */
export interface Branch extends BaseMaster {
  companyId: number;
  type: 'office' | 'warehouse' | 'factory';
  alias?: string;
}

/** Department entity */
export interface Department extends BaseMaster {
  companyId: number;
  branchId: number;
  alias?: string;
}

/** User entity */
export interface User {
  id: number;
  companyId: number;
  branchId?: number;
  departmentId?: number;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

/** Role entity */
export interface Role {
  id: number;
  companyId: number;
  code: string;
  name: string;
  description?: string;
  hierarchyLevel: number;
  status: 'active' | 'inactive';
  createdAt: string;
}

/** Product / Item entity */
export interface Product extends BaseMaster {
  alias?: string;
  category?: string;
  unitId?: number;
  reorderLevel?: number;
  taxCode?: string;
}

/** Account (Chart of Accounts) entity */
export interface Account extends BaseMaster {
  companyId: number;
  accountType: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';
  parentId?: number;
  subledgerType?: string;
  level: number;
  isGroup: boolean;
}

/** Warehouse entity */
export interface Warehouse extends BaseMaster {
  companyId: number;
  branchId: number;
  type: 'main' | 'transit' | 'scrap';
  address?: string;
}

/** Unit of Measurement */
export interface UnitOfMeasure extends BaseMaster {
  symbol: string;
  decimalPlaces: number;
}

/** Category / Classification */
export interface Category extends BaseMaster {
  parentId?: number;
  module: string; // 'item', 'account', etc.
  level: number;
}

// ───────────────────────────────────────────────
// Transaction types
// ───────────────────────────────────────────────

/** Voucher header */
export interface VoucherHeader {
  id: number;
  voucherNo?: string;
  voucherType: string;
  companyId: number;
  branchId: number;
  voucherDate: string;
  status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'POSTED' | 'REJECTED' | 'CANCELLED';
  totalAmount: number;
  jsonPayload?: Record<string, any>;
  items?: VoucherItem[];
  createdAt: string;
  updatedAt: string;
}

/** Voucher line item */
export interface VoucherItem {
  id: number;
  voucherId: number;
  productId: number;
  qty: number;
  rate: number;
  amount: number;
  batchId?: string;
  serialId?: string;
}

/** Ledger entry */
export interface LedgerEntry {
  id: number;
  voucherId: number;
  accountId: number;
  debit: number;
  credit: number;
  postingDate: string;
}

/** Stock movement */
export interface StockLedgerEntry {
  id: number;
  productId: number;
  warehouseId: number;
  qtyIn: number;
  qtyOut: number;
  batchId?: string;
  serialId?: string;
  voucherRef: number;
}
