# 🚀 Complete Modern ERP Implementation Roadmap

## 📊 Current Status Analysis

### ✅ Already Implemented
| Component | Status | Details |
|-----------|--------|---------|
| **Workflow Engine** | ✅ Phase 1 Complete | Actor Resolution, Condition Evaluator, Parallel Approvals, Field Security |
| **Database Schema** | ✅ Partial | Metadata, Masters, Workflow, Security tables defined |
| **Auth Middleware** | ✅ JWT + Company Isolation | AuthMiddleware, API token validation |
| **UI Framework** | ✅ Base Components | DynamicForm, ErpMasterScreen, VoucherScreen, Dashboard, WorkflowApprovalPanel |
| **Metadata Service** | ⏳ Stub | Route handlers exist, core logic needs implementation |
| **Security Service** | ⏳ Stub | Schema ready, authorization logic needs implementation |
| **Configuration Service** | ⏳ Stub | tag_mapping, config_master routes ready |
| **Number Sequence** | ⏳ Stub | Service created, sequence generation logic pending |
| **Transaction Service** | ⏳ Stub | TransactionOrchestrator class created, core logic pending |

---

## 🎯 SKILL File Gap Analysis

### SKILL vs Implementation

| SKILL | Purpose | Current State | Priority |
|-------|---------|---------------|----------|
| **erp-backend-guidelines** | Architecture, conventions | Design complete, implementation 40% | HIGH |
| **erp-domain-model** | Core entities | Schema defined 80%, business logic 30% | HIGH |
| **erp-data-architecture** | Data storage + partitioning | Schema 70%, partitioning 0% | MEDIUM |
| **erp-configuration-framework** | Dynamic config + customization | Schema 80%, runtime logic 20% | HIGH |
| **erp-master-screen** | React grid+form pattern | Component exists 60%,  validation 50% | HIGH |
| **erp-metadata-engine** | Dynamic fields + 10 engines | 3 engines done (Workflow, Entity basics), 7 pending | CRITICAL |
| **erp-transaction-engine** | Voucher posting + ledger | Schema only 30%, business logic 5% | CRITICAL |
| **erp-security-permission-model** | RBAC + ABAC | Schema 70%, enforcement 20% | HIGH |
| **erp-ui-guidelines** | Layout + screen patterns | Component library 50%, layout system 20% | MEDIUM |

---

## 📋 Implementation Phases & Roadmap

### **PHASE 1: FOUNDATION (Weeks 1-2)**
**Goal:** Build core master data management and metadata engine foundation

#### 1.1 **Master Data Module** ⭐ CRITICAL
```
Priority: BLOCKING (Everything depends on this)
Service: masterDataService.ts
Models: Company, Branch, Department, User, Role
```

**Implement:**
- [ ] MstCompanyService - Create, read, update, list companies
- [ ] MstBranchService - Create, read, update, list branches
- [ ] MstDepartmentService - Department management with branch scope
- [ ] MstUserService - User management with role assignment
- [ ] MstRoleService - Role CRUD + permission assignment
- [ ] Routes: `/api/masters/*`
- [ ] UI: Master screens for each entity

**Files to Create:**
```
merp-service/src/services/masterDataService.ts
merp-service/src/routes/masterDataRoutes.ts
merp-service/src/repositories/companyRepository.ts
merp-service/src/repositories/branchRepository.ts
merp-service/src/repositories/departmentRepository.ts
merp-service/src/repositories/userRepository.ts
merp-service/src/repositories/roleRepository.ts

merp-ui/src/modules/masters/Company/CompanyMaster.tsx
merp-ui/src/modules/masters/Branch/BranchMaster.tsx
merp-ui/src/modules/masters/Department/DepartmentMaster.tsx
merp-ui/src/modules/masters/User/UserMaster.tsx
merp-ui/src/modules/masters/Role/RoleMaster.tsx
```

**Endpoints:**
```
GET    /api/masters/companies                    → List all companies
POST   /api/masters/companies                    → Create company
GET    /api/masters/companies/:id                → Get company detail
PUT    /api/masters/companies/:id                → Update company
DELETE /api/masters/companies/:id                → Deactivate company

GET    /api/masters/branches                     → List branches (company scoped)
POST   /api/masters/branches                     → Create branch
GET    /api/masters/branches/:id                 → Get branch detail
PUT    /api/masters/branches/:id                 → Update branch

GET    /api/masters/departments                  → List departments
POST   /api/masters/departments                  → Create department

GET    /api/masters/users                        → List users
POST   /api/masters/users                        → Create user
PUT    /api/masters/users/:id                    → Update user
PUT    /api/masters/users/:id/roles              → Assign roles

GET    /api/masters/roles                        → List roles
POST   /api/masters/roles                        → Create role
GET    /api/masters/roles/:id/permissions        → List role permissions
PUT    /api/masters/roles/:id/permissions        → Update permissions
```

---

#### 1.2 **Complete Metadata Engine (10 Engines)** ⭐ CRITICAL
```
Priority: BLOCKING (Enables dynamic configuration)
Service: metadataService.ts - EXPAND EXISTING
```

**Current State:** Service stub exists with basic getEntityFields

**Implement All 10 Engines:**

| # | Engine | Tables | Service Method | Status |
|---|--------|--------|-----------------|--------|
| 1 | **Entity Metadata** | `meta_entity`, `meta_field` | `getEntityMetadata()` | 20% |
| 2 | **Dynamic Fields (u00x)** | `meta_custom_field`, `ext_entity_values` | `getCustomFields()`, `saveCustomFields()` | 0% |
| 3 | **Tag Mapping** | `meta_tag_mapping` | `getTagMapping()`, `resolveTag()` | 0% |
| 4 | **Voucher Config** | `meta_voucher_definition`, `meta_voucher_fields` | `getVoucherConfig()` | 20% |
| 5 | **Derived Fields** | Custom expressions in `meta_field` | `evaluateDerivedField()` | 0% |
| 6 | **Workflow Config** | `wf_definition`, `wf_stage` | `getWorkflowForEntity()` | 50% |
| 7 | **UI Layout** | `form_layout` (future table) | `getFormLayout()` | 0% |
| 8 | **Number Sequences** | `meta_number_sequence` | `generateNumber()` | 50% |
| 9 | **Report Config** | `report_definition` (future) | `getReportDefinition()` | 0% |
| 10 | **Runtime Renderer** | Cache layer | `cacheCompanyConfig()` | 0% |

**Files to Create/Expand:**
```
merp-service/src/services/metadataService.ts (EXPAND)
merp-service/src/repositories/metadataRepository.ts
merp-service/src/routes/metadataRoutes.ts (EXPAND)
merp-service/src/services/cache/configCache.ts
merp-service/src/utils/metadataResolver.ts

merp-ui/src/hooks/useFieldConfig.ts
merp-ui/src/hooks/useTag.ts
merp-ui/src/hooks/useVoucherConfig.ts
merp-ui/src/stores/metadataStore.ts
```

**Key Endpoints:**
```
GET    /api/metadata/entities                     → List all entities
GET    /api/metadata/entities/:entity/fields      → Get fields with config
GET    /api/metadata/entities/:entity/custom      → Get custom fields
POST   /api/metadata/entities/:entity/custom      → Add custom field
GET    /api/metadata/vouchers/:voucherType        → Voucher configuration
GET    /api/metadata/tags/:entity                 → Tag mappings
GET    /api/metadata/cache/reload                 → Reload cache (admin)
```

---

#### 1.3 **Item & Account Masters** ⭐ CRITICAL
```
Priority: HIGH (Required for transactions)
Services: itemMasterService.ts, accountMasterService.ts
```

**Item Master:**
- [ ] MstProductService / ItemMasterService
- [ ] Fields: code, name, category, unit, reorder_level, tax_code, custom fields
- [ ] UI: Item Master grid + form
- [ ] Endpoints: CRUD + search + autocomplete

**Account Master (Chart of Accounts):**
- [ ] MstAccountService
- [ ] Fields: code, name, account_type (Asset/Liability/Income/Expense), subledger_type
- [ ] UI: Account Master grid + form
- [ ] Endpoints: CRUD + hierarchy view

---

### **PHASE 2: TRANSACTION ENGINE (Weeks 3-4)**
**Goal:** Implement core transaction posting and ledger generation

#### 2.1 **Complete Transaction Engine** ⭐ CRITICAL
```
Priority: CRITICAL (Core business logic)
Service: transactionService.ts - EXPAND EXISTING
Skill Reference: erp-transaction-engine/SKILL.md
```

**Implement Transaction Orchestrator:**

```
1. Validate header (schema + business rules)
2. Validate lines (quantities + rates)
3. Evaluate expressions (computed fields)
4. Generate voucher number
5. Convert currency (if needed)
6. Save voucher header → voucher_headers
7. Save line items → voucher_lines
8. Save dynamic field values → extra_data JSONB
9. Generate ledger entries → ledger_entries
10. Generate stock movements → stock_movements
11. Create audit snapshot → audit_trail
12. Initialize workflow → workflow_instances
13. Update number sequence → meta_number_sequence
```

**Files to Create:**
```
merp-service/src/services/transactionOrchestrator.ts (EXPAND)
merp-service/src/services/ledgerEngine.ts
merp-service/src/services/stockMovementEngine.ts
merp-service/src/repositories/voucherRepository.ts
merp-service/src/repositories/ledgerRepository.ts
merp-service/src/routes/voucherRoutes.ts

Database Migrations:
merp-service/prisma/migrations/txn_*.sql
```

**Endpoints:**
```
POST   /api/voucher/save                         → Save & draft voucher
POST   /api/voucher/:id/post                     → Post to ledger
POST   /api/voucher/:id/reverse                  → Reverse voucher
GET    /api/voucher/:id/ledger-preview          → Real-time ledger preview
GET    /api/ledger/entries                       → Query ledger
GET    /api/voucher/history/:id                  → Audit trail
```

---

#### 2.2 **Ledger System** ⭐ CRITICAL
```
Priority: CRITICAL (Financial integrity)
Service: ledgerEngine.ts
```

**Implement:**
- [ ] AccLedgerEntry model + repository
- [ ] Real-time balance calculation (SUM queries)
- [ ] Trial balance report
- [ ] GL account aging
- [ ] Multi-currency support
- [ ] Period closing logic

---

#### 2.3 **Inventory System** ⭐ CRITICAL
```
Priority: HIGH (Stock accuracy)
Service: stockMovementEngine.ts
```

**Implement:**
- [ ] InvStockLedger model + repository
- [ ] Real-time stock balance (SUM queries)
- [ ] Bin-level tracking
- [ ] Batch & serial tracking
- [ ] Stock movement audit trail
- [ ] Warehouse transfers

---

### **PHASE 3: SECURITY & PERMISSIONS (Week 5)**
**Goal:** Implement field-level + data scope security

#### 3.1 **Security Permission Model** ⭐ HIGH
```
Priority: HIGH (Enterprise requirement)
Services: securityService.ts, permissionService.ts
Skill Reference: erp-security-permission-model/SKILL.md
```

**Implement:**
- [ ] RBAC - User → Role → Permissions
- [ ] ABAC - Attribute-based conditions (amount > 10000)
- [ ] Data Scope - Company/Branch/Department filters
- [ ] Field-Level Security - Per-field editability + visibility
- [ ] Approval Authority Matrix - Amount-based approvers
- [ ] Audit Trail - All changes logged

**Files to Create:**
```
merp-service/src/services/permissionService.ts
merp-service/src/services/dataScopeService.ts
merp-service/src/repositories/permissionRepository.ts
merp-service/src/middleware/permissionMiddleware.ts
merp-service/src/routes/permissionRoutes.ts
```

**Endpoints:**
```
GET    /api/permissions/user/:userId             → User permissions
GET    /api/permissions/role/:roleId             → Role permissions
PUT    /api/permissions/role/:roleId             → Update role permissions
GET    /api/security/data-scope                  → User data scope
GET    /api/security/field-access/:entity       → Field-level access
POST   /api/security/audit                       → Query audit trail
```

---

#### 3.2 **Configuration Framework** ⭐ HIGH
```
Priority: HIGH (Runtime customization)
Service: configurationService.ts
Skill Reference: erp-configuration-framework/SKILL.md
```

**Implement:**
- [ ] ConfigMaster - System settings per company
- [ ] TagMapping - Rename labels (Warehouse → Stock)
- [ ] BusinessRuleEngine - Dynamic rule evaluation
- [ ] FeatureToggle - Module enable/disable
- [ ] RuntimeCache - Redis caching for performance

---

### **PHASE 4: MASTER SCREENS & MODULES (Week 6)**
**Goal:** Complete all master screens following UI guidelines

#### 4.1 **Enhanced Master Screen Framework**
```
Priority: MEDIUM
Skill Reference: erp-master-screen/SKILL.md
```

**Implement for each master:**
1. **Item Master** → ItemMaster.tsx
2. **Account Master** → AccountMaster.tsx
3. **Warehouse Master** → WarehouseMaster.tsx
4. **Customer Master** → CustomerMaster.tsx
5. **Vendor Master** → VendorMaster.tsx
6. **Unit Master** → UnitMaster.tsx
7. **Category Master** → CategoryMaster.tsx

**Each screen includes:**
- [ ] TanStack Table grid with sorting, filtering, column resize
- [ ] React Hook Form + Zod validation
- [ ] Dynamic field rendering from metadata
- [ ] Bulk operations (delete, export, status change)
- [ ] Advanced search with debounce
- [ ] Keyboard navigation
- [ ] Tag-mapped labels

---

### **PHASE 5: CORE BUSINESS MODULES (Weeks 7-8)**
**Goal:** Implement Sales & Purchase transactional modules

#### 5.1 **Sales Module**
- [ ] Quotation (MstQuotation)
- [ ] Sales Invoice (TxnSalesInvoice)
- [ ] Delivery Note (TxnDeliveryNote)
- [ ] Credit Note (TxnCreditNote)

#### 5.2 **Purchase Module**
- [ ] Purchase Inquiry (MstPurchaseInquiry)
- [ ] Purchase Order (TxnPurchaseOrder)
- [ ] Goods Receipt (TxnGoodsReceipt)
- [ ] Purchase Invoice (TxnPurchaseInvoice)
- [ ] Debit Note (TxnDebitNote)

#### 5.3 **Inventory Module**
- [ ] Stock Transfer (TxnStockTransfer)
- [ ] Stock Adjustment (TxnStockAdjustment)
- [ ] Stock Count (TxnStockCount)
- [ ] Stock Allocation (TxnStockAllocation)

---

### **PHASE 6: ADVANCED FEATURES (Weeks 9-10)**
**Goal:** Reporting, Dashboard, and Period Closing

#### 6.1 **Reporting Engine** ⭐ CRITICAL
```
Priority: CRITICAL (BI foundation)
Skill Reference: erp-reporting-engine/SKILL.md (To be reviewed)
```

**Implement:**
- [ ] Star Schema modeling
- [ ] Dynamic query builder
- [ ] Report definitions (JSON metadata)
- [ ] Dashboard framework
- [ ] KPI engine
- [ ] Export capabilities (PDF, Excel)

#### 6.2 **Dashboard & Analytics**
- [ ] Key metrics (Revenue, Expense, Stock, AR/AP)
- [ ] Real-time charting (Charts.js, Recharts)
- [ ] Drill-down capabilities
- [ ] Scheduled reports

#### 6.3 **Period Closing**
- [ ] Period opening/closing
- [ ] Inventory closing
- [ ] GL closing
- [ ] Reconciliation tools

---

## 🗂️ Detailed File Structure After Completion

```
merp-service/
├── src/
│   ├── modules/
│   │   ├── masters/
│   │   │   ├── company/
│   │   │   ├── branch/
│   │   │   ├── department/
│   │   │   ├── user/
│   │   │   ├── role/
│   │   │   ├── item/
│   │   │   ├── account/
│   │   │   ├── warehouse/
│   │   │   ├── unit/
│   │   │   └── category/
│   │   ├── sales/
│   │   │   ├── salesInvoice/
│   │   │   ├── quotation/
│   │   │   ├── deliveryNote/
│   │   │   └── creditNote/
│   │   ├── purchase/
│   │   │   ├── purchaseOrder/
│   │   │   ├── purchaseInvoice/
│   │   │   ├── goodsReceipt/
│   │   │   └── debitNote/
│   │   ├── inventory/
│   │   │   ├── stockTransfer/
│   │   │   ├── stockAdjustment/
│   │   │   └── stockCount/
│   │   ├── accounting/
│   │   │   ├── journalEntry/
│   │   │   ├── payment/
│   │   │   └── receipt/
│   │   └── reporting/
│   │       ├── sales/
│   │       ├── purchase/
│   │       ├── inventory/
│   │       └── accounting/
│   ├── services/
│   │   ├── masterDataService.ts
│   │   ├── metadataService.ts (EXPAND)
│   │   ├── transactionOrchestrator.ts (EXPAND)
│   │   ├── ledgerEngine.ts
│   │   ├── stockMovementEngine.ts
│   │   ├── permissionService.ts
│   │   ├── dataScopeService.ts
│   │   ├── configurationService.ts (EXPAND)
│   │   ├── numberSequenceService.ts (EXPAND)
│   │   ├── workflowService.ts (DONE)
│   │   ├── reportingService.ts
│   │   └── cache/
│   │       └── configCache.ts
│   ├── repositories/
│   │   ├── companyRepository.ts
│   │   ├── branchRepository.ts
│   │   ├── userRepository.ts
│   │   ├── productRepository.ts
│   │   ├── accountRepository.ts
│   │   ├── voucherRepository.ts
│   │   ├── ledgerRepository.ts
│   │   ├── metadataRepository.ts
│   │   ├── permissionRepository.ts
│   │   └── ...
│   ├── routes/
│   │   ├── index.ts (main router)
│   │   ├── masterDataRoutes.ts
│   │   ├── metadataRoutes.ts (EXPAND)
│   │   ├── transactionRoutes.ts (EXPAND)
│   │   ├── workflowRoutes.ts (DONE)
│   │   ├── permissionRoutes.ts
│   │   ├── configRoutes.ts (EXPAND)
│   │   └── reportingRoutes.ts
│   ├── middleware/
│   │   ├── authMiddleware.ts (DONE)
│   │   ├── permissionMiddleware.ts
│   │   ├── dataScopeMiddleware.ts
│   │   └── errorHandler.ts
│   ├── validators/
│   │   ├── voucherValidator.ts
│   │   ├── masterValidator.ts
│   │   └── transactionValidator.ts
│   ├── utils/
│   │   ├── errorHandler.ts
│   │   ├── responseFormatter.ts
│   │   └── metadataResolver.ts
│   └── index.ts
├── prisma/
│   ├── schema.prisma (EXPAND)
│   └── migrations/
│       ├── init.sql
│       ├── masters.sql
│       ├── transactions.sql
│       ├── ledger.sql
│       └── ...

merp-ui/
├── src/
│   ├── app/
│   │   ├── layout/
│   │   │   ├── AppShell.tsx
│   │   │   ├── SideNav.tsx
│   │   │   ├── TopToolbar.tsx
│   │   │   └── WorkspaceTabs.tsx
│   │   └── routing/
│   │       ├── routes.tsx
│   │       └── ProtectedRoute.tsx
│   ├── erp-core/
│   │   ├── layout/ (EXPAND with AppShell)
│   │   ├── grid/
│   │   │   ├── ERPGrid.tsx
│   │   │   ├── useGridLayout.ts
│   │   │   ├── gridColumns.ts
│   │   │   └── gridKeyboardNav.ts
│   │   ├── forms/
│   │   │   ├── DynamicForm.tsx (EXPAND)
│   │   │   ├── DynamicField.tsx (EXPAND)
│   │   │   ├── useFormSchema.ts
│   │   │   └── fieldRegistry.ts
│   │   ├── voucher/
│   │   │   ├── VoucherEditor.tsx
│   │   │   ├── HeaderForm.tsx
│   │   │   ├── LineGrid.tsx
│   │   │   ├── TotalsEngine.tsx
│   │   │   ├── LedgerPreview.tsx
│   │   │   └── DynamicFieldsPanel.tsx
│   │   ├── metadata/
│   │   │   ├── useFieldConfig.ts
│   │   │   ├── useTag.ts
│   │   │   ├── useVoucherConfig.ts
│   │   │   └── metadataStore.ts
│   │   └── services/
│   │       ├── apiClient.ts
│   │       ├── crudService.ts
│   │       └── types.ts
│   ├── modules/
│   │   ├── masters/
│   │   │   ├── Company/CompanyMaster.tsx
│   │   │   ├── Branch/BranchMaster.tsx
│   │   │   ├── Department/DepartmentMaster.tsx
│   │   │   ├── User/UserMaster.tsx
│   │   │   ├── Item/ItemMaster.tsx
│   │   │   ├── Account/AccountMaster.tsx
│   │   │   ├── Warehouse/WarehouseMaster.tsx
│   │   │   ├── Unit/UnitMaster.tsx
│   │   │   ├── Category/CategoryMaster.tsx
│   │   │   └── (other masters)
│   │   ├── sales/
│   │   │   ├── Quotation/QuotationScreen.tsx
│   │   │   ├── SalesInvoice/SalesInvoiceScreen.tsx
│   │   │   ├── DeliveryNote/DeliveryNoteScreen.tsx
│   │   │   └── CreditNote/CreditNoteScreen.tsx
│   │   ├── purchase/
│   │   │   ├── PurchaseOrder/POScreen.tsx
│   │   │   ├── PurchaseInvoice/PurchaseInvoiceScreen.tsx
│   │   │   ├── GoodsReceipt/GRScreen.tsx
│   │   │   └── DebitNote/DebitNoteScreen.tsx
│   │   ├── inventory/
│   │   │   ├── StockTransfer/StockTransferScreen.tsx
│   │   │   ├── StockAdjustment/AdjustmentScreen.tsx
│   │   │   └── StockCount/CountScreen.tsx
│   │   ├── accounting/
│   │   │   ├── JournalEntry/JEScreen.tsx
│   │   │   ├── Payment/PaymentScreen.tsx
│   │   │   └── Receipt/ReceiptScreen.tsx
│   │   ├── reporting/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── SalesReport.tsx
│   │   │   ├── PurchaseReport.tsx
│   │   │   ├── InventoryReport.tsx
│   │   │   ├── TrialBalance.tsx
│   │   │   └── GLReport.tsx
│   │   └── admin/
│   │       ├── MetadataConfig.tsx
│   │       ├── WorkflowConfig.tsx
│   │       ├── RoleConfig.tsx
│   │       └── PermissionConfig.tsx
│   ├── shared/
│   │   ├── components/ui/ (ShadCN library)
│   │   ├── hooks/
│   │   │   ├── useDebounce.ts
│   │   │   ├── useKeyboard.ts
│   │   │   ├── useLocalStorage.ts
│   │   │   └── ...
│   │   ├── utils/
│   │   │   ├── formatters.ts
│   │   │   ├── validators.ts
│   │   │   └── dateUtils.ts
│   │   └── types/
│   │       ├── erp.types.ts
│   │       ├── api.types.ts
│   │       └── domain.types.ts
│   └── main.tsx
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## 🔄 Dependency Graph (Implementation Order)

```
PHASE 1:
  ├─ Master Data (Company → Branch → Department → User)
  ├─ Metadata Engine (enables all dynamic features)
  └─ Item & Account Masters
         ↓
PHASE 2:
  ├─ Transaction Engine (depends on Masters + Metadata)
  ├─ Ledger System (depends on Transaction Engine)
  └─ Inventory System (depends on Item Master + Ledger)
         ↓
PHASE 3:
  ├─ Security (depends on Masters + Metadata)
  └─ Configuration Framework (depends on Metadata)
         ↓
PHASE 4:
  └─ Master Screens (depends on all Phase 1-3)
         ↓
PHASE 5:
  ├─ Sales Module (depends on all previous)
  ├─ Purchase Module (depends on all previous)
  └─ Inventory Module (depends on all previous)
         ↓
PHASE 6:
  ├─ Reporting Engine (depends on all transaction modules)
  └─ Dashboard (depends on Reporting Engine)
```

---

## 📈 Estimated Effort

| Phase | Focus | Duration | Complexity |
|-------|-------|----------|------------|
| **Phase 1** | Foundation | 2 weeks | HIGH |
| **Phase 2** | Transaction Engine | 2 weeks | CRITICAL |
| **Phase 3** | Security | 1 week | HIGH |
| **Phase 4** | Master Screens | 1 week | MEDIUM |
| **Phase 5** | Business Modules | 2 weeks | HIGH |
| **Phase 6** | Advanced Features | 2 weeks | MEDIUM |
| **TOTAL** | Complete Modern ERP | **10 weeks** | — |

---

## 🎯 Starting Point: Phase 1.1 - Master Data Module

**Let's begin with Master Data implementation since it:**
1. ✅ Doesn't depend on anything
2. ✅ Is foundational for all other modules
3. ✅ Follows clear, predictable patterns
4. ✅ Can be completed in 2-3 days
5. ✅ Unblocks metadata + transaction engines

**Next: Proceed with Phase 1.1 (Master Data Service + UI)?**

---

## 📚 Reference Materials

- Design Documents: `Design/orderTocash`, `Design/procureTopay`
- SKILL Files: `.github/skills/erp-*/` (All 9 modules)
- Current Progress: `WORKFLOW_ENGINE_PHASE1_COMPLETE.md`
- Database: `merp-service/prisma/schema.prisma`
- Existing Services: `merp-service/src/services/`
- Existing Components: `merp-ui/src/components/`

---

**Status: READY FOR PHASE 1.1 IMPLEMENTATION**
Ready to proceed? Confirm and I'll start implementing Master Data Module with full service + routes + UI!
