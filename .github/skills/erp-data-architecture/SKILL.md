---
name: erp-data-architecture
description: Defines the ERP Data Storage & Transaction Architecture, specializing in Hybrid SQL + Document modeling (PostgreSQL + JSONB), schema partitioning, and ledger immutability for enterprise scalability.
---

# Goal
Ensure the core capabilities for horizontal scale over the next 10-15 years. The architecture embraces strict separation of concerns, metadata-driven schema configuration (replacing legacy hardcoded tables), append-only immutable ledgers, and a hybrid structured-relational + JSONB model.

# Core Design Principles
- **Separation of Master & Transaction Data**: Crucial for performance and scaling queries.
- **Metadata-driven schema**: Add custom fields without executing database `ALTER` statements.
- **Event-based ledger**: Auditability and traceability without update risks.
- **Append-only transactions**: Protect accounting integrity. No updating records—only voiding and compensating.
- **Horizontal scalability**: Ready the schemas for SaaS architecture globally.
- **Configurable UI via metadata**: Forms are built via data, completely replacing legacy `u00x` table logic.

# High-Level Architecture
`CONFIG/METADATA LAYER -> MASTER DATA LAYER -> TRANSACTION ENGINE -> LEDGER & ACCOUNTING -> ANALYTICS / REPORTING`

# Data Layers & Schemas
We enforce strict schema isolation using enterprise patterns: `erp_meta`, `erp_master`, `erp_txn`, `erp_accounting`, `erp_inventory`.

## 1. Metadata Layer (`erp_meta`)
The "Brain" of the ERP representing how data should look and behave. Replaces hardcoded U00x configurations.
- **`meta_entity`**: `id`, `entity_name`, `table_name` (e.g., table 'mst_product' maps to entity 'Product')
- **`meta_field`**: `field_name`, `data_type`, `source`, `ui_control`, `required`
- **`meta_tag_mapping`**: Maps standard system strings (e.g., Warehouse) to dynamic labels globally.
- **`meta_voucher_definition`**: `voucherType`, `module`
- **`meta_voucher_fields`**: Associates custom `meta_field` definitions with specific combinations of `voucherType` dynamically.

## 2. Master Data Layer (`erp_master`)
Prefix convention: `mst_` | Base required columns: `id`, `code`, `name`, `alias`, `status`, `created_at`, `updated_at`.
- **Organization**: `mst_company`, `mst_branch`, `mst_department`, `mst_user`
- **Products & Inventory**: `mst_product`, `mst_category`, `mst_unit`, `mst_warehouse`, `mst_bin`
- **Finance**: `mst_account`, `mst_currency`, `mst_exchange_rate`

## 3. Dynamic Extension Storage (U00x Replacement)
Replaces spawning `u001_product`, `u002_product` custom tables upon enterprise extensions.
- **`ext_entity_values`**: `entity`, `entityId`, `fieldId`, `value`. Infinite extensibility via metadata relationships rather than schema DDL changes.

## 4. Transaction Data Layer (`erp_txn`)
Highly scalable, structured headers combined with flexible JSONB payloads.
- **Storage Strategy**: Relational fields for joining (Branch, Date) + `JSONB` for robust, schema-less payload extensions. 
- **Partition Strategy**: Use PostgreSQL partitioned tables (e.g., partitioning by `YEAR(voucher_date)` -> `txn_voucher_2026`).
- **`txn_voucher_header`**: `voucher_id`, `voucher_type`, `company_id`, `branch_id`, `date`, `status`, `total_amount`, `json_payload` (JSONB)
- **`txn_voucher_items`**: `voucher_item_id`, `voucher_id`, `product_id`, `qty`, `rate`, `amount`, `batch_id`, `serial_id`

## 5. Accounting & Inventory Ledgers (`erp_accounting`, `erp_inventory`)
Event-driven and strictly Append-Only mapping to ensure compliance.
- **Accounting (`acc_ledger_entry`)**: `entry_id`, `voucher_id`, `account_id`, `debit`, `credit`, `posting_date` (NO UPDATE ALLOWED - ONLY REVERSALS)
- **Inventory (`inv_stock_ledger`)**: Calculates live stock balances. `entry_id`, `product_id`, `warehouse_id`, `qty_in`, `qty_out`, `batch_id`, `serial_id`, `voucher_ref` (Stock = `SUM(qty_in - qty_out)` - Never from the product table).

# Indexing Strategy
- **txn_voucher_header**: `(company_id, voucher_date)`, `(voucher_type)`, `(branch_id)`
- **acc_ledger_entry**: `(account_id, posting_date)`
- **inv_stock_ledger**: `(product_id, warehouse_id)`, `(batch_id)`

# End-to-End Data Flow Execution (e.g., Sales Invoice)
1. User creates invoice.
2. Metadata Layer (`meta_field`) loads the dynamic layout structure.
3. `txn_voucher_header` inserted (JSON dynamic payload captured).
4. `txn_voucher_items` inserted.
5. Transaction Engine triggers immutable `acc_ledger_entry` logic.
6. Stock Engine evaluates inventory and writes the `inv_stock_ledger` entries.
