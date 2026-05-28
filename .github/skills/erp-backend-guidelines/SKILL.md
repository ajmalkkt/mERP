---
name: erp-backend-guidelines
description: >
  Backend development guidelines — domain-driven architecture, CRUD conventions,
  transaction handling, master data rules, performance, and security.
  Use this skill when generating any ERP API, service, or database logic.
---

# ERP Backend Development Guidelines

This skill defines the **architecture, conventions, and rules** for the ERP
backend. Every API endpoint, service function, and database operation must
conform to these guidelines.

---

## 1. Technology Stack

| Layer         | Technology                                          |
| ------------- | --------------------------------------------------- |
| Runtime       | Node.js (LTS)                                      |
| Framework     | Express.js                                          |
| Primary DB    | PostgreSQL — transactional data, accounting, config |
| Document DB   | MongoDB — dynamic fields, audit logs, file metadata |
| ORM / Query   | Knex.js (PostgreSQL) + Mongoose (MongoDB)           |
| Auth          | JWT + API token validation                          |
| Validation    | Zod or Joi                                          |

### Hybrid Database Strategy

| Data Type               | Store In     | Reason                              |
| ----------------------- | ------------ | ----------------------------------- |
| Masters                 | PostgreSQL   | Relational integrity, JOINs         |
| Voucher headers + lines | PostgreSQL   | ACID transactions, ledger joins     |
| Ledger entries          | PostgreSQL   | Aggregate queries, reporting        |
| Stock movements         | PostgreSQL   | Aggregate queries, reporting        |
| Dynamic field defs      | PostgreSQL   | Metadata engine core                |
| Dynamic field values    | MongoDB      | Schema-free, per-company flex       |
| Audit logs              | MongoDB      | High-volume append-only writes      |
| File metadata           | MongoDB      | Flexible document structure         |
| User sessions / cache   | Redis        | Fast reads, TTL management          |

---

## 2. Architecture — Layered Design

```
HTTP Request
    │
    ▼
┌──────────────┐
│  Controller  │  → Parse request, validate input, call service
│              │  → Return response (status code + JSON body)
│              │  → NO business logic here
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Service    │  → Business logic, orchestration
│              │  → Transaction management
│              │  → Calls one or more repositories
│              │  → Generates ledger entries & stock movements
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Repository  │  → Database queries (Knex / Mongoose)
│              │  → Single-table or single-collection scope
│              │  → No business logic
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Database   │  → PostgreSQL / MongoDB
└──────────────┘
```

### Rules

1. **Never** put business logic in controllers.
2. **Never** call the database directly from controllers.
3. Services can call multiple repositories but a repository touches **one table/collection**.
4. Cross-module calls go through services, not repositories.

### File Organization

```
src/
├── modules/
│   ├── masters/
│   │   ├── item/
│   │   │   ├── itemController.js
│   │   │   ├── itemService.js
│   │   │   ├── itemRepository.js
│   │   │   ├── itemValidation.js
│   │   │   └── itemRoutes.js
│   │   ├── account/
│   │   └── warehouse/
│   ├── sales/
│   │   ├── invoice/
│   │   └── delivery/
│   ├── purchase/
│   ├── inventory/
│   ├── accounting/
│   └── production/
├── metadata-engine/                # ⭐ ERP METADATA ENGINE
│   ├── fieldDefinitionController.js
│   ├── fieldDefinitionService.js
│   ├── fieldValueService.js
│   ├── tagService.js
│   ├── voucherConfigService.js
│   ├── workflowService.js
│   └── numberSequenceService.js
├── shared/
│   ├── middleware/
│   │   ├── authMiddleware.js
│   │   ├── companyMiddleware.js
│   │   └── errorHandler.js
│   ├── services/
│   │   ├── ledgerService.js
│   │   └── stockMovementService.js
│   └── utils/
│       ├── pagination.js
│       └── numberGenerator.js
├── config/
├── database/
│   ├── migrations/
│   └── seeds/
└── app.js
```

---

## 3. CRUD API Conventions

Every master module must expose these endpoints:

| Operation | Method | Route                      | Notes                                |
| --------- | ------ | -------------------------- | ------------------------------------ |
| List      | GET    | `/:module/:entity`         | Paginated, filterable, sortable      |
| Get by ID | GET    | `/:module/:entity/:id`     | Full record with dynamic fields      |
| Create    | POST   | `/:module/:entity`         | Validate → Service → Repository      |
| Update    | PUT    | `/:module/:entity/:id`     | Partial update supported             |
| Delete    | DELETE | `/:module/:entity/:id`     | Soft delete only                     |
| Bulk      | POST   | `/:module/:entity/bulk`    | Import / batch operations            |
| Export    | GET    | `/:module/:entity/export`  | CSV / Excel download                 |

### Metadata Engine API Endpoints

| Endpoint                              | Method | Purpose                             |
| ------------------------------------- | ------ | ----------------------------------- |
| `/api/config/fields/:entity`          | GET    | Fetch field metadata for entity     |
| `/api/config/fields/:entity`          | PUT    | Save admin field config changes     |
| `/api/system/tags`                    | GET    | Fetch tag mappings for company      |
| `/api/system/tags`                    | PUT    | Save tag mapping changes            |
| `/api/config/voucher-types`           | GET    | List voucher type configurations    |
| `/api/config/voucher-types/:type`     | GET    | Get single voucher type config      |
| `/api/config/voucher-types/:type`     | PUT    | Update voucher type config          |
| `/api/config/workflows/:voucherType`  | GET    | Get workflow stages                 |
| `/api/config/workflows/:voucherType`  | PUT    | Update workflow stages              |
| `/api/config/number-sequences/:type`  | GET    | Get numbering pattern               |
| `/api/config/number-sequences/:type`  | PUT    | Update numbering pattern            |

### Request Query Parameters (List)

| Param      | Type     | Default | Description                         |
| ---------- | -------- | ------- | ----------------------------------- |
| `page`     | number   | 1       | Page number                         |
| `pageSize` | number   | 25      | Rows per page (max 100)             |
| `sort`     | string   | —       | `fieldName:asc` or `fieldName:desc` |
| `filter`   | string   | —       | `fieldName:operator:value`          |
| `search`   | string   | —       | Global text search                  |
| `companyId`| string   | —       | **Required** (from middleware/auth)  |
| `branchId` | string   | —       | Optional additional scoping         |

### Standard Response Shape

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "pageSize": 25,
    "totalRows": 1423,
    "totalPages": 57
  },
  "message": "Items retrieved successfully"
}
```

### Error Response Shape

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      { "field": "itemCode", "message": "Item code is required" }
    ]
  }
}
```

---

## 4. Master Data Rules

### Soft Delete

```js
// ❌ NEVER do this
await db('items').where({ id }).del();

// ✅ Always do this
await db('items').where({ id }).update({
  status: 'deleted',
  modifiedAt: new Date(),
  modifiedBy: userId,
});
```

### Company Isolation

```js
// ❌ NEVER query without companyId
const items = await db('items').select('*');

// ✅ Always filter by companyId
const items = await db('items')
  .where({ companyId, status: 'active' })
  .select('id', 'name', 'code', 'status');
```

### Audit Fields

Every create/update must set audit fields:

```js
// On CREATE
const record = {
  ...data,
  createdAt: new Date(),
  createdBy: userId,
  modifiedAt: new Date(),
  modifiedBy: userId,
};

// On UPDATE
const updates = {
  ...data,
  modifiedAt: new Date(),
  modifiedBy: userId,
};
```

---

## 5. Transaction Rules

Business transactions (vouchers) must follow this exact processing order:

```
┌─────────────────────────────────────────────────────┐
│                 BEGIN TRANSACTION                     │
│                                                      │
│  1. Validate header fields                           │
│  2. Validate line items                              │
│  3. Save voucher header         → voucher_headers    │
│  4. Save line items             → voucher_lines      │
│  5. Generate ledger entries     → ledger_entries      │
│  6. Generate stock movements    → stock_movements     │
│  7. Update running counters     → number_sequences    │
│                                                      │
│                 COMMIT TRANSACTION                    │
│                                                      │
│  (on failure → ROLLBACK entire transaction)          │
└─────────────────────────────────────────────────────┘
```

### Implementation Pattern

```js
async function createVoucher(voucherData) {
  const trx = await db.transaction();

  try {
    // 1. Validate
    const validated = validateVoucher(voucherData);

    // 2. Save header
    const [header] = await trx('voucher_headers')
      .insert(validated.header)
      .returning('*');

    // 3. Save lines
    const lines = validated.lines.map(line => ({
      ...line,
      voucherId: header.id,
    }));
    await trx('voucher_lines').insert(lines);

    // 4. Generate ledger entries
    const ledgerEntries = generateLedgerEntries(header, lines);
    await trx('ledger_entries').insert(ledgerEntries);

    // 5. Generate stock movements (if applicable)
    if (header.affectsStock) {
      const movements = generateStockMovements(header, lines);
      await trx('stock_movements').insert(movements);
    }

    // 6. Update number sequence
    await trx('number_sequences')
      .where({ voucherType: header.voucherType, companyId: header.companyId })
      .increment('lastNumber', 1);

    await trx.commit();
    return header;
  } catch (error) {
    await trx.rollback();
    throw error;
  }
}
```

---

## 6. Performance Rules

### List API Optimization

```js
// ❌ NEVER return blob/image fields in list queries
const items = await db('items').select('*');

// ✅ Use explicit column selection (projections)
const items = await db('items')
  .where({ companyId, status: 'active' })
  .select('id', 'code', 'name', 'itemGroup', 'unitPrice', 'isActive')
  .orderBy('code', 'asc')
  .limit(pageSize)
  .offset((page - 1) * pageSize);
```

### Pagination

- **Always** paginate. Max `pageSize` = 100.
- Offset-based for masters, cursor-based for high-volume tables.

### Indexing Strategy

| Table             | Recommended Indexes                                    |
| ----------------- | ------------------------------------------------------ |
| Masters           | `(companyId, status)`, `(companyId, code)` UNIQUE      |
| Voucher headers   | `(companyId, voucherType, date)`, `(companyId, partyId)` |
| Ledger entries    | `(companyId, accountId, date)`, `(voucherId)`          |
| Stock movements   | `(companyId, productId, warehouseId)`, `(voucherId)`   |
| Dynamic field values | `(entityType, entityId, fieldDefinitionId)`          |

### Caching

| Data               | Cache Strategy    | TTL      |
| ------------------- | ---------------- | -------- |
| Company settings    | Redis            | 5 min    |
| Master lookups      | Redis            | 2 min    |
| Field configs       | Redis            | 5 min    |
| Tag mappings        | Redis            | 5 min    |
| User permissions    | Redis            | 1 min    |
| Dashboard widgets   | Redis            | 30 sec   |

---

## 7. Security

### Role-Based Access Control (RBAC)

| Role      | Permissions                                            |
| --------- | ------------------------------------------------------ |
| `admin`   | Full CRUD + config + user management                   |
| `manager` | CRUD on assigned modules + approve workflow            |
| `user`    | Create + view own records + limited edit               |
| `viewer`  | Read-only access to assigned modules                   |

### Middleware Chain

```
Request → authMiddleware → companyMiddleware → roleMiddleware → Controller
```

| Middleware           | Responsibility                                     |
| -------------------- | -------------------------------------------------- |
| `authMiddleware`     | Validate JWT / API token, extract user context     |
| `companyMiddleware`  | Extract `companyId` from token, inject into request |
| `roleMiddleware`     | Check user role against required permission        |
| `errorHandler`       | Global error handler (catch-all)                    |

### API Token Validation

```js
// Token payload must include:
{
  "userId": "usr_001",
  "companyId": "comp_001",
  "branchId": "br_001",
  "role": "admin"
}
```

### Rate Limiting

| Endpoint Type   | Limit                  |
| --------------- | ---------------------- |
| Auth endpoints  | 5 req / min per IP     |
| List APIs       | 60 req / min per user  |
| Create/Update   | 30 req / min per user  |
| Export / Bulk    | 5 req / min per user   |

### Input Sanitization

- All string inputs sanitized against XSS
- SQL injection prevented by parameterized queries (Knex handles this)
- File uploads validated for type and size
- Request body size limited to 10 MB (50 MB for bulk imports)
