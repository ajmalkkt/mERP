---
name: erp-domain-model
description: >
  ERP domain model knowledge — core entities, accounting concepts, inventory logic,
  voucher structure, and dynamic field system. Use this skill whenever generating or
  modifying any ERP module to ensure domain-correct data modeling.
---

# ERP Domain Model Knowledge

This skill provides the **canonical domain knowledge** that every ERP module,
screen, API, and database schema must conform to. Read this before generating
any entity, voucher, or transaction logic.

---

## 1. Core Entities — Organization Hierarchy

Every record in the ERP is scoped to this hierarchy:

```
Company
└── Branch
    └── Department
        └── User
```

### Company

The top-level tenant. All data is isolated by company.

| Property    | Type     | Notes                      |
| ----------- | -------- | -------------------------- |
| `id`        | string   | Unique identifier          |
| `name`      | string   | Legal entity name          |
| `code`      | string   | Short code (e.g. `ACME`)   |
| `status`    | enum     | `active`, `inactive`       |
| `settings`  | object   | Company-level config       |

### Branch

Physical or logical location within a company.

| Property    | Type     | Notes                              |
| ----------- | -------- | ---------------------------------- |
| `id`        | string   | Unique identifier                  |
| `companyId` | string   | FK → Company                       |
| `name`      | string   | Branch name                        |
| `code`      | string   | Short code (e.g. `HQ`, `WH-01`)   |
| `type`      | enum     | `office`, `warehouse`, `factory`   |
| `status`    | enum     | `active`, `inactive`               |

### Department

Functional grouping within a branch.

| Property    | Type     | Notes                           |
| ----------- | -------- | ------------------------------- |
| `id`        | string   | Unique identifier               |
| `companyId` | string   | FK → Company                    |
| `branchId`  | string   | FK → Branch                     |
| `name`      | string   | e.g. `Sales`, `Purchase`, `HR`  |
| `code`      | string   | Short code                      |

### User

An actor in the system, always associated with a company.

| Property       | Type     | Notes                         |
| -------------- | -------- | ----------------------------- |
| `id`           | string   | Unique identifier             |
| `companyId`    | string   | FK → Company                  |
| `branchId`     | string   | Default branch                |
| `departmentId` | string   | Default department            |
| `email`        | string   | Login identifier              |
| `role`         | enum     | `admin`, `manager`, `user`    |
| `status`       | enum     | `active`, `inactive`          |

---

## 2. Master Entities

Masters are reference data shared across transactions. **Every master** must
contain these standard fields:

| Field       | Type     | Required | Description                     |
| ----------- | -------- | -------- | ------------------------------- |
| `id`        | string   | ✅       | Unique identifier               |
| `name`      | string   | ✅       | Display name                    |
| `code`      | string   | ✅       | Unique short code               |
| `alias`     | string   | ❌       | Alternate name / search alias   |
| `status`    | enum     | ✅       | `active`, `inactive`, `deleted` |
| `companyId` | string   | ✅       | FK → Company                    |
| `createdAt` | datetime | ✅       | Audit: creation timestamp       |
| `createdBy` | string   | ✅       | Audit: creator user ID          |
| `modifiedAt`| datetime | ✅       | Audit: last modification        |
| `modifiedBy`| string   | ✅       | Audit: last modifier user ID    |

### Key Masters

| Master        | Module              | Additional Key Fields                              |
| ------------- | ------------------- | -------------------------------------------------- |
| **Account**   | Accounting          | `accountType` (Customer / Vendor / Ledger / Bank)  |
| **Product**   | Masters / Inventory | `productGroup`, `uom`, `unitPrice`, `taxRate`      |
| **Warehouse** | Inventory           | `branchId`, `type` (raw / finished / transit)      |
| **Machine**   | Production          | `branchId`, `capacity`, `status`                   |

### Rules for Masters

1. Support **soft delete** — set `status = 'deleted'`, never physically remove.
2. Always **company-isolated** — queries must filter by `companyId`.
3. Have **audit fields** — `createdAt`, `createdBy`, `modifiedAt`, `modifiedBy`.
4. Can have **dynamic fields** — managed by the Metadata Engine (see `erp-metadata-engine` skill).
5. **Tag-mapped labels** — display names resolved via `useTag()` hook, never hardcoded.

---

## 3. Accounting Concepts

The ERP uses **ledger-based double-entry accounting**.

### Ledger Entries

Every financial voucher generates paired debit and credit entries:

```
┌─────────────────────────────────────────┐
│  Voucher: Sales Invoice #INV-001        │
├───────────────┬──────────┬──────────────┤
│ Account       │  Debit   │  Credit      │
├───────────────┼──────────┼──────────────┤
│ Accounts Recv │  10,000  │              │
│ Sales Revenue │          │   8,475      │
│ GST Payable   │          │   1,525      │
└───────────────┴──────────┴──────────────┘
```

### Rules

1. **Immutability** — ledger entries are **never** updated or deleted. To correct
   an error, create a reversal entry.
2. **Balance derivation** — account balances are always **computed** by summing
   debits and credits. They are never stored as a static value.
3. **Double-entry guarantee** — every voucher must satisfy `∑ Debits = ∑ Credits`.
4. **Company + Branch scoping** — entries carry `companyId` and `branchId`.

### Ledger Entry Shape

```json
{
  "id": "le_001",
  "voucherId": "v_001",
  "voucherType": "sales_invoice",
  "accountId": "acc_recv",
  "debit": 10000,
  "credit": 0,
  "narration": "Sales to Customer X",
  "date": "2025-03-11",
  "companyId": "comp_001",
  "branchId": "br_001"
}
```

---

## 4. Inventory Concepts

### Event-Driven Stock

Inventory is **NOT** stored as a balance. Stock quantities are **derived**
from movement events.

```
Current Stock = ∑ Inward Movements − ∑ Outward Movements
```

### Movement Types

| Type                 | Direction | Source Voucher            |
| -------------------- | --------- | ------------------------ |
| **Purchase**         | Inward    | Purchase Invoice / GRN   |
| **Sale**             | Outward   | Sales Invoice / Delivery |
| **Transfer**         | Both      | Stock Transfer           |
| **Production Issue** | Outward   | Production Order         |
| **Production Receipt** | Inward  | Production Order         |

### Stock Movement Shape

```json
{
  "id": "sm_001",
  "voucherId": "v_001",
  "voucherType": "purchase_invoice",
  "productId": "prod_001",
  "warehouseId": "wh_main",
  "movementType": "purchase",
  "quantity": 500,
  "rate": 12.50,
  "date": "2025-03-11",
  "companyId": "comp_001",
  "branchId": "br_001"
}
```

### Rules

1. Stock balances are **never** stored directly — always derived.
2. Every movement references a **voucher** (traceability).
3. Movements are **immutable** — corrections via reversal movements.
4. Warehouse is **mandatory** for physical goods.

---

## 5. Voucher Concept

A **voucher** is a configurable business document. It is the primary unit of
business transactions in the ERP. **Voucher ≠ Form. Voucher = Transaction Engine.**

### Examples of Vouchers

| Voucher Type      | Module     | Generates Ledger? | Generates Stock? |
| ----------------- | ---------- | ----------------- | ---------------- |
| Sales Invoice     | Sales      | ✅                | ✅               |
| Purchase Invoice  | Purchase   | ✅                | ✅               |
| Journal Entry     | Accounting | ✅                | ❌               |
| Stock Transfer    | Inventory  | ❌                | ✅               |
| Payment Received  | Accounting | ✅                | ❌               |
| Production Order  | Production | ✅                | ✅               |

### Voucher Structure

Every voucher has three layers:

```
┌ Header ────────────────────────────────────────────┐
│  voucherNo, date, partyId, voucherType, status     │
│  companyId, branchId, departmentId, userId          │
│  narration, reference, dynamicFields {}             │
├ Lines ─────────────────────────────────────────────┤
│  Line 1: productId, qty, rate, amount, tax, ...    │
│  Line 2: productId, qty, rate, amount, tax, ...    │
│  ...                                                │
├ Dynamic Fields ────────────────────────────────────┤
│  Custom admin-defined fields stored as metadata     │
│  (e.g. VehicleNo, DeliverySlot — injected by       │
│   Metadata Engine, no redeploy needed)              │
└────────────────────────────────────────────────────┘
```

### Voucher Configuration via Metadata Engine

Each voucher type is **configured, not coded**. The Metadata Engine stores:

- **Header fields** — what fields appear in the header section
- **Line fields** — what columns appear in the line item grid
- **Tax/discount config** — calculation rules
- **Ledger template** — how to generate Dr/Cr entries
- **Stock template** — how to generate movements
- **Number pattern** — auto-numbering per branch, per FY
- **Workflow stages** — approval chain

See the **`erp-metadata-engine`** skill for full details.

### Voucher Processing Pipeline

When a voucher is saved:

```
1. Validate header + lines
2. Generate voucher number (via Number Sequence Generator)
3. Save header record
4. Save line records
5. Generate ledger entries (if applicable, via Ledger Template)
6. Generate inventory movements (if applicable, via Stock Template)
7. Initialize workflow instance (if requires_approval)
8. All within a single database transaction
```

---

## 6. Dynamic Fields System

The ERP allows admin users to create fields dynamically **without** modifying
the database schema or redeploying the application.

### Principles

1. Dynamic fields are **stored separately** from core entity columns.
2. They **never** alter the database schema (no ALTER TABLE).
3. They support **multiple data types** (text, number, date, dropdown, etc.).
4. They are driven by the **Metadata Engine** (see `erp-metadata-engine` skill).

### How It Works

Admin creates a field via the admin UI → field definition saved to
`field_definitions` table → frontend's `useFieldConfig` hook refetches →
grid and form automatically render the new field.

**Backend response format for custom fields:**

```json
{
  "customFields": [
    { "name": "VehicleNo", "type": "text" },
    { "name": "DeliverySlot", "type": "select", "options": ["Morning", "Afternoon", "Evening"] }
  ]
}
```

**UI automatically injects these fields. No redeployment.**

### Architecture

```
┌─ Field Definitions (PostgreSQL) ────────────────────┐
│  id, entityType, fieldName, fieldType, label,        │
│  required, options, defaultValue, displayOrder,      │
│  gridVisible, formVisible, visibilityRule,           │
│  companyId                                            │
└──────────────────────────────────────────────────────┘

┌─ Field Values (MongoDB) ───────────────────────────┐
│  entityType, entityId, fieldDefinitionId,            │
│  textValue, numberValue, dateValue, booleanValue,    │
│  companyId                                            │
└──────────────────────────────────────────────────────┘
```

### Rules

1. Query by dynamic field = join to field value table + filter.
2. Indexing: compound indexes on `(entityType, entityId, fieldDefinitionId)`.
3. Default values applied at form render time, not at DB level.
4. Field definitions are **per company** — each company customizes independently.

---

## Cross-Cutting Concerns

### Audit Trail

Every significant entity must carry:

| Field        | Auto-set      |
| ------------ | ------------- |
| `createdAt`  | On create     |
| `createdBy`  | On create     |
| `modifiedAt` | On every save |
| `modifiedBy` | On every save |

### Soft Delete

Records are never physically removed. Set `status = 'deleted'` and
filter them out in standard queries. Admin can view deleted records.

### Company Isolation

**Every query** must include a `companyId` filter. Cross-company data
access is forbidden unless explicitly authorized for reporting.

### Tag Mapping

All entity labels are resolved via the Tag Mapping System (see
`erp-metadata-engine` skill). UI never displays hardcoded labels.
