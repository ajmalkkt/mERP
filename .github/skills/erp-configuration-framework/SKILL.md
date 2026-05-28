---
name: erp-configuration-framework
description: Defines the ERP Configuration and Customization framework enabling terminology changes, dynamic forms, rule engines, and tenant-level configuration.
---

# Goal
Provide an ERP configuration and customization layer that allows the same codebase to behave differently per company (e.g., Manufacturing, Trading, Retail) without modifying backend code. **ERP Core = Engine, Configuration = Personality.**

# Architecture & Configuration Layers
Configuration is overridden hierarchically:
`SYSTEM LEVEL -> TENANT / COMPANY LEVEL -> MODULE LEVEL -> ENTITY LEVEL -> FIELD LEVEL -> WORKFLOW LEVEL`

# Customization Engines

## 1. Configuration Master (Core Registry)
Central configuration table for settings.
- **`config_master`**: `config_id` (PK), `company_id` (nullable for global), `module` (e.g., SALES), `config_key` (e.g., allow_negative_stock), `config_value` (JSON/string/bool), `data_type`, `is_active`

## 2. Tag / Terminology Engine
Allows renaming system terms per company (e.g., Warehouse -> Stock, Customer -> Client).
- **`tag_mapping`**: `tag_id`, `company_id`, `entity_name` (e.g., warehouse), `display_name` (e.g., Stock), `plural_name` (e.g., Stocks), `module`
- **UI Usage**: Use `<label>{tag("warehouse")}</label>` instead of hardcoded strings.

## 3. Dynamic Field Engine
Metadata-driven custom fields replacing legacy schemas. Allows adding fields to vouchers without altering SQL schemas.
- **`metadata_field`**: `field_id` (PK), `entity_name` (e.g., voucher), `field_name` (e.g., delivery_note), `label`, `data_type`, `required`, `company_id`
- **`metadata_field_value`**: `record_id`, `field_id`, `value`

## 4. Dynamic Form Layout Engine
Frontend renders screens dynamically based on backend JSON configuration. Admin controls UI layout.
- **`form_layout`**: `layout_id`, `entity`, `company_id`, `layout_json` (Defines sections, field order, visibility)

## 5. Voucher Configuration Engine
Supports numerous voucher types with configurable numbering rules and data entry rules.
- **`voucher_type_master`**: `voucher_type_id`, `code`, `name`, `module`, `numbering_logic`, `posting_rule`
- **`voucher_dynamic_field_map`**: Maps custom fields to specific vouchers (`voucher_type_id`, `field_id`).

## 6. Business Rule Engine ⭐
Rules evaluated dynamically without coding.
- **`rule_master`**: `rule_id`, `entity`, `condition_json` (e.g., `{"customer.creditUsed": "> customer.creditLimit"}`), `action_json` (e.g., `{"blockTransaction": true, "message": "Credit limit exceeded"}`), `priority`

## 7. Workflow & Report Configuration
- **Workflow**: `workflow_master`, `workflow_step` define approval chains (e.g., Draft -> Manager -> Account Posting).
- **Reports**: `report_definition` holds `query_json` and `layout_json` to construct tailored reports dynamically.

## 8. Feature Toggle System
Enable/disable modules per company to show/hide features dynamically on the UI.
- **`feature_toggle`**: `company_id`, `feature` (e.g., production, payroll), `enabled` (boolean)

# Performance & Runtime Integration

## Configuration Cache Layer
**Configurations MUST NOT hit the DB on every request.** 
- Load the Company Config Snapshot into a Redis / Memory Cache upon login or cache initialization.

## Runtime Flow
`User Login -> Load Company Config -> Load Tag Mapping -> Load Metadata Fields -> Load Permissions -> UI & API act dynamically`

# Final Paradigm
**ERP CORE (Static) + CONFIGURATION ENGINE (Dynamic) = CUSTOMIZABLE ERP**
