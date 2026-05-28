---
name: erp-metadata-engine
description: >
  ERP Metadata Engine — the brain that powers dynamic fields, voucher configuration,
  workflow orchestration, tag mapping, UI rendering, numbering, and reporting.
  This is what separates a CRUD app from a real ERP platform.
---

# ERP Metadata Engine — Design & Instructions

## 🎯 Purpose

The Metadata Engine allows the ERP to be:

- ✅ **Configurable without code changes**
- ✅ **UI-driven instead of hardcoded**
- ✅ **Extensible per company**
- ✅ **Dynamic vouchers & masters**
- ✅ **Supports legacy-style dynamic columns** (u00x concept modernized)
- ✅ **Enables Copilot auto-generation**

## 🧠 What Is Metadata in ERP?

**Metadata = Data that describes system behavior.**

| Traditional App       | Metadata ERP               |
| --------------------- | -------------------------- |
| Tables fixed          | Tables + extensions (JSONB) |
| UI coded              | UI generated from metadata |
| Fields static         | Fields dynamic             |
| Hard deployment       | Runtime configuration      |
| Developers needed     | Admin configurable         |

## 🧱 Engine Layers

```
            ERP APPLICATION
─────────────────────────────────────────────
            UI Metadata Renderer
            (DynamicForm, ERPGrid, VoucherEditor)
─────────────────────────────────────────────
            Metadata Engine API
            (/api/meta/*)
─────────────────────────────────────────────
        Metadata Storage (Core Tables)
        (meta_entity, meta_field, meta_voucher_type, ...)
─────────────────────────────────────────────
   Business Data (Masters + Transactions)
   (products, voucher_headers, ledger_entries, ...)
```

---

## 🧩 Metadata Domains — 10 Engines

| #  | Engine                  | Purpose                                       |
| -- | ----------------------- | --------------------------------------------- |
| 1  | Entity Metadata         | Define master entities and their fields        |
| 2  | Dynamic Fields (u00x)   | Admin-created fields via JSONB                 |
| 3  | Tag Mapping             | Rename system labels per company               |
| 4  | Voucher Metadata        | Define voucher types, header/line fields       |
| 5  | Derived Fields          | Calculated/expression fields                   |
| 6  | Workflow Engine         | Approval chains, state transitions             |
| 7  | UI Metadata             | Layout definitions, form sections, grid config |
| 8  | Number Sequences        | Auto-numbering per type/branch/FY              |
| 9  | Report Metadata         | Configurable report definitions (future)       |
| 10 | Runtime Renderer        | Reads metadata → renders React components      |

---

## 1️⃣ Entity Metadata (Master Definitions)

### Table: `meta_entity`

```sql
CREATE TABLE meta_entity (
  entity_id       VARCHAR(100) PRIMARY KEY,
  name            VARCHAR(200) NOT NULL,
  table_name      VARCHAR(100) NOT NULL,
  module          VARCHAR(50) NOT NULL,
  is_transaction  BOOLEAN DEFAULT FALSE,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMP DEFAULT NOW()
);
```

| entity_id   | name       | table_name   | module     | is_transaction |
| ----------- | ---------- | ------------ | ---------- | -------------- |
| `product`   | Product    | `products`   | inventory  | false          |
| `warehouse` | Warehouse  | `warehouses` | inventory  | false          |
| `account`   | Account    | `accounts`   | accounting | false          |
| `customer`  | Customer   | `customers`  | sales      | false          |

### Table: `meta_field`

```sql
CREATE TABLE meta_field (
  field_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id       VARCHAR(100) NOT NULL REFERENCES meta_entity(entity_id),
  field_name      VARCHAR(100) NOT NULL,
  label           VARCHAR(200) NOT NULL,
  data_type       VARCHAR(50) NOT NULL,
  required        BOOLEAN DEFAULT FALSE,
  searchable      BOOLEAN DEFAULT FALSE,
  sortable        BOOLEAN DEFAULT TRUE,
  editable        BOOLEAN DEFAULT TRUE,
  ui_component    VARCHAR(50),
  default_value   TEXT,
  options         JSONB,
  validation      JSONB,
  lookup_config   JSONB,
  visibility_rule JSONB,
  display_order   INT DEFAULT 0,
  grid_visible    BOOLEAN DEFAULT TRUE,
  grid_order      INT DEFAULT 99,
  grid_width      INT DEFAULT 150,
  form_visible    BOOLEAN DEFAULT TRUE,
  form_order      INT DEFAULT 99,
  form_section    VARCHAR(100) DEFAULT 'General',
  is_system       BOOLEAN DEFAULT FALSE,
  is_active       BOOLEAN DEFAULT TRUE,
  UNIQUE(entity_id, field_name)
);
CREATE INDEX idx_meta_field_entity ON meta_field(entity_id, is_active);
```

**Example:** `entity: product, field: sellingPrice, type: decimal, component: currency` → ✅ UI auto-builds form.

---

## 2️⃣ Dynamic Fields Engine (u00x Replacement)

Legacy systems: `u001_Product`, `u002_Product`... We modernize this.

### Table: `meta_custom_field`

```sql
CREATE TABLE meta_custom_field (
  custom_field_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id       VARCHAR(100) NOT NULL REFERENCES meta_entity(entity_id),
  company_id      UUID NOT NULL REFERENCES companies(id),
  field_name      VARCHAR(100) NOT NULL,
  label           VARCHAR(200) NOT NULL,
  data_type       VARCHAR(50) NOT NULL,
  options         JSONB,
  source_column   VARCHAR(50),
  expression      TEXT,
  required        BOOLEAN DEFAULT FALSE,
  ui_order        INT DEFAULT 99,
  ui_section      VARCHAR(100) DEFAULT 'Custom Fields',
  grid_visible    BOOLEAN DEFAULT FALSE,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMP DEFAULT NOW(),
  created_by      UUID REFERENCES users(id),
  UNIQUE(company_id, entity_id, field_name)
);
CREATE INDEX idx_custom_field ON meta_custom_field(company_id, entity_id, is_active);
```

### Data Storage — JSONB Column

```sql
CREATE TABLE products (
  id         UUID PRIMARY KEY,
  code       VARCHAR(50) NOT NULL,
  name       VARCHAR(200) NOT NULL,
  extra_data JSONB DEFAULT '{}',     -- ⭐ Dynamic fields here
  company_id UUID NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_products_extra ON products USING GIN (extra_data);
```

**Example JSONB:** `{ "color": "Red", "warrantyMonths": 12 }`

**Why JSONB?** ✅ Infinite fields, ✅ No schema migration, ✅ Fast queries (GIN), ✅ Per-company

**Querying:**
```sql
SELECT * FROM products WHERE company_id = $1 AND extra_data->>'color' = 'Red';
SELECT * FROM products WHERE company_id = $1 AND (extra_data->>'warrantyMonths')::int > 6;
```

---

## 3️⃣ Tag Mapping Engine

### Table: `meta_tag_mapping`

```sql
CREATE TABLE meta_tag_mapping (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL REFERENCES companies(id),
  tag_key       VARCHAR(100) NOT NULL,
  default_label VARCHAR(200) NOT NULL,
  custom_label  VARCHAR(200) NOT NULL,
  UNIQUE(company_id, tag_key)
);
```

**API:** `GET /api/meta/tags` → `{ "warehouse": "Stock", "department": "Division" }`

**Hook:** `const label = useTag('warehouse'); // → "Stock"`

---

## 4️⃣ Voucher Metadata Engine (MOST IMPORTANT)

### Table: `meta_voucher_type`

```sql
CREATE TABLE meta_voucher_type (
  voucher_type      VARCHAR(50) PRIMARY KEY,
  company_id        UUID NOT NULL,
  name              VARCHAR(200) NOT NULL,
  module            VARCHAR(50) NOT NULL,
  numbering_scheme  VARCHAR(100),
  number_prefix     VARCHAR(10),
  approval_required BOOLEAN DEFAULT FALSE,
  posting_rule      VARCHAR(50),
  affects_ledger    BOOLEAN DEFAULT TRUE,
  affects_stock     BOOLEAN DEFAULT FALSE,
  requires_party    BOOLEAN DEFAULT TRUE,
  ledger_template   JSONB,
  stock_template    JSONB,
  tax_config        JSONB,
  discount_config   JSONB,
  is_active         BOOLEAN DEFAULT TRUE,
  UNIQUE(company_id, voucher_type)
);
```

### Table: `meta_voucher_fields` (Header Fields)

```sql
CREATE TABLE meta_voucher_fields (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_type  VARCHAR(50) NOT NULL,
  company_id    UUID NOT NULL,
  field_name    VARCHAR(100) NOT NULL,
  label         VARCHAR(200) NOT NULL,
  data_type     VARCHAR(50) NOT NULL,
  source_entity VARCHAR(100),
  required      BOOLEAN DEFAULT FALSE,
  visible       BOOLEAN DEFAULT TRUE,
  position      INT DEFAULT 0,
  ui_component  VARCHAR(50),
  options       JSONB,
  default_value TEXT,
  UNIQUE(company_id, voucher_type, field_name)
);
```

### Table: `meta_voucher_columns` (Line Grid)

```sql
CREATE TABLE meta_voucher_columns (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_type  VARCHAR(50) NOT NULL,
  company_id    UUID NOT NULL,
  field_name    VARCHAR(100) NOT NULL,
  label         VARCHAR(200) NOT NULL,
  data_type     VARCHAR(50) NOT NULL,
  source_entity VARCHAR(100),
  required      BOOLEAN DEFAULT FALSE,
  editable      BOOLEAN DEFAULT TRUE,
  position      INT DEFAULT 0,
  width         INT DEFAULT 150,
  expression    TEXT,
  ui_component  VARCHAR(50),
  UNIQUE(company_id, voucher_type, field_name)
);
```

**Example columns:** Product, Qty, Rate, Batch, Serial, Amount (`qty * rate`)

✅ **UI builds voucher editor automatically.**

---

## 5️⃣ Derived Field Engine

### Table: `meta_expression`

```sql
CREATE TABLE meta_expression (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id        VARCHAR(100) NOT NULL,
  company_id       UUID NOT NULL,
  field_name       VARCHAR(100) NOT NULL,
  expression       TEXT NOT NULL,
  evaluation_stage VARCHAR(50) DEFAULT 'render',
  result_type      VARCHAR(50) DEFAULT 'number',
  UNIQUE(company_id, entity_id, field_name)
);
```

**Examples:** `margin = sellingPrice - purchasePrice`, `lineTotal = qty * rate - discount`

Engine evaluates dynamically at render or save time.

---

## 6️⃣ Workflow & Approval Engine

> **Full design:** See [`resources/workflow-engine.md`](resources/workflow-engine.md)
> for complete database schemas, service logic, condition engine, notification
> routing, escalation, delegation, production workflows, and frontend integration.

The Workflow Engine transforms the ERP into an **enterprise control platform**.

### Core Capabilities

| Feature                | Description                                              |
| ---------------------- | -------------------------------------------------------- |
| Multi-level approvals  | Configurable N-step chains per voucher type              |
| Conditional steps      | Steps included based on amount, branch, category, etc.   |
| Auto-approve           | Skip step if condition met (e.g., `amount < 10000`)      |
| Delegation             | Users delegate approvals temporarily to another user     |
| Escalation             | Timeout-based auto-escalation with configurable actions  |
| Recall                 | Submitter can recall before final approval               |
| Return to step         | Approver can return to any previous step (not just reject)|
| Production workflows   | Stage-based process: Issue → WIP → QC → Receipt         |
| Notification routing   | In-app bell, email, webhooks per step                    |
| Full audit trail       | Every action logged with timestamp, user, comments       |

### Database Tables (6 tables)

| Table                      | Purpose                                     |
| -------------------------- | ------------------------------------------- |
| `meta_workflow`            | Workflow definitions (per entity, per company) |
| `meta_workflow_steps`      | Step definitions with conditions + approvers |
| `workflow_instances`       | Runtime state of each document in workflow   |
| `workflow_actions`         | Permanent action log (approve/reject/return) |
| `workflow_delegations`     | Temporary delegation rules                   |
| `workflow_notifications`   | Notification queue (in-app, email, webhook)  |

### State Machine

```
Draft → Submitted → Step 1 → Step 2 → ... → Step N → Approved → Posted
                       ↓        ↓                        ↑
                    Rejected ─── Return ──── Recall ──────┘
```

### Approver Resolution Types

| Type              | Resolves To                                       |
| ----------------- | ------------------------------------------------- |
| `role`            | All users with the specified role                 |
| `user`            | Specific user ID                                  |
| `department_head` | Head of the document's department                 |
| `dynamic`         | Field expression: `header.salesPersonId`           |

### Key APIs

```
POST /api/workflow/:entityType/:entityId/submit     → Start workflow
POST /api/workflow/:entityType/:entityId/approve    → Approve step
POST /api/workflow/:entityType/:entityId/reject     → Reject step
POST /api/workflow/:entityType/:entityId/return     → Return to prev step
POST /api/workflow/:entityType/:entityId/recall     → Recall submission
GET  /api/workflow/pending                          → My pending approvals
GET  /api/workflow/notifications                    → My notifications
```

---

## 7️⃣ UI Metadata Engine

### Table: `meta_ui_layout`

```sql
CREATE TABLE meta_ui_layout (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id   VARCHAR(100) NOT NULL,
  company_id  UUID NOT NULL,
  layout_type VARCHAR(50) NOT NULL,
  config      JSONB NOT NULL,
  is_default  BOOLEAN DEFAULT FALSE,
  created_by  UUID REFERENCES users(id),
  UNIQUE(company_id, entity_id, layout_type, created_by)
);
```

**Form config:** `{ "sections": [{ "name": "General", "columns": 2 }, { "name": "Pricing", "columns": 2 }] }`

**Grid config:** `{ "columns": [{ "field": "code", "width": 120, "visible": true }], "defaultSort": [...] }`

---

## 8️⃣ Number Sequence Engine

### Table: `meta_number_sequence`

```sql
CREATE TABLE meta_number_sequence (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id     UUID NOT NULL,
  branch_id      UUID,
  voucher_type   VARCHAR(50) NOT NULL,
  prefix         VARCHAR(10) NOT NULL,
  pattern        VARCHAR(100) NOT NULL,
  financial_year VARCHAR(10) NOT NULL,
  last_number    INT DEFAULT 0,
  pad_length     INT DEFAULT 4,
  UNIQUE(company_id, branch_id, voucher_type, financial_year)
);
```

**Pattern:** `{PREFIX}-{BRANCH}-{YYYY}-{####}` → `INV-HQ-2025-0042`

Row-locked (`forUpdate`) inside DB transaction to prevent duplicates.

---

## ⚙️ Metadata Engine API Endpoints

```
GET  /api/meta/entities                       → all entities
GET  /api/meta/entities/:entityId             → entity definition
GET  /api/meta/forms/:entityId                → form field schema
GET  /api/meta/grid/:entityId                 → grid column schema
PUT  /api/meta/fields/:entityId               → save field config (admin)
POST /api/meta/fields/:entityId               → create custom field
DEL  /api/meta/fields/:entityId/:fieldId      → soft-delete field

GET  /api/meta/voucher-types                  → list voucher configs
GET  /api/meta/voucher/:type                  → header + line schema
PUT  /api/meta/voucher/:type                  → update voucher config

GET  /api/meta/tags?companyId=xxx             → tag mappings
PUT  /api/meta/tags                           → save tags

GET  /api/meta/workflows/:entity              → workflow definition
PUT  /api/meta/workflows/:entity              → update workflow

GET  /api/meta/expressions/:entityId          → list expressions
PUT  /api/meta/expressions/:entityId          → save expressions

GET  /api/meta/layouts/:entityId/:type        → layout config
PUT  /api/meta/layouts/:entityId/:type        → save layout
```

---

## 🔄 Runtime Flow

```
User opens "Product" screen
    ↓
GET /api/meta/forms/product     → field definitions
GET /api/meta/grid/product      → grid column config
GET /api/meta/tags              → label overrides
    ↓
Metadata Engine queries: meta_entity + meta_field +
  meta_custom_field + meta_tag_mapping + meta_expression + meta_ui_layout
    ↓
Returns unified schema → DynamicForm / ERPGrid renders automatically
✅ No hardcoded components  ✅ No redeployment
```

---

## 📦 Database Strategy

### Master DB (PostgreSQL)

| Group            | Tables                                                    |
| ---------------- | --------------------------------------------------------- |
| **Metadata**     | `meta_*` tables (all 10+ listed above)                    |
| **Organization** | `companies`, `branches`, `departments`, `users`           |
| **Masters**      | `products`, `accounts`, `warehouses` (each with `extra_data JSONB`) |

### Transaction DB (PostgreSQL — Partitioned)

| Table              | Partition Key             |
| ------------------ | ------------------------- |
| `voucher_headers`  | `company_id` + `year`     |
| `voucher_lines`    | `company_id` + `year`     |
| `ledger_entries`   | `company_id` + `year`     |
| `stock_movements`  | `company_id` + `year`     |

### Optional Document Store (MongoDB / JSONB)

Dynamic voucher payloads, audit snapshots, workflow history, file metadata.

---

## ✅ CRUD App vs Real ERP

| Feature            | CRUD App          | ERP with Metadata Engine             |
| ------------------ | ----------------- | ------------------------------------ |
| Fields             | Hardcoded         | Admin-configurable + JSONB           |
| Labels             | Static strings    | Tag-mapped, per-company              |
| Voucher types      | One per code path | Configurable via `meta_voucher_*`    |
| Expressions        | Hardcoded calcs   | `meta_expression` — admin managed    |
| Workflow           | None / hardcoded  | Multi-stage, per voucher type        |
| Numbering          | Auto-increment    | Pattern-based per branch/FY          |
| Grid/Form          | Static JSX        | Generated from metadata              |
| New entity         | Dev + deploy      | Admin UI + metadata, instant         |
