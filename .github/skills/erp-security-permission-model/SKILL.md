---
name: erp-security-permission-model
description: Defines the standard ERP security and permission model including RBAC, ABAC, data scope isolation, field-level security, and audit trails.
---

# Goal
Provide an enterprise-grade Security and Permission Model that combines Role-Based Access Control (RBAC) and Attribute-Based Access Control (ABAC) to enforce deep access isolation without hardcoding business rules into application logic.

# Architecture Placements
`User -> Role -> Permissions -> Data Scope -> Field Rules -> Approval Rules -> Audit Trail`

# Core Approaches
We use a hybrid of RBAC + ABAC:
- **RBAC (Traditional ERP)**: User -> Role -> Permissions. E.g., `SALES_ROLE`, `ADMIN_ROLE`.
- **ABAC (Modern ERP)**: Permissions conditionally depend on Company, Branch, Department, Voucher Type, Amount, Ownership. E.g., "Salesman can edit ONLY his invoices."

# Schema Requirements & Guidelines

## 1. Core Security Entities
- **User Master (`user_master`)**: `user_id` (PK), `username`, `password_hash`, `default_company_id`, `default_branch_id`, `status` (active/locked), `last_login`
- **Role Master (`role_master`)**: `role_id` (PK), `role_name` (e.g., SALES_EXEC), `hierarchy_level` (e.g., Admin: 100, Manager: 80 - allows escalation), `description`
- **User-Role Mapping (`user_role_map`)**: `user_id`, `role_id` (Supports a user having multiple roles)

## 2. Permission Engine
Defines the standard actions required by roles.
- **Permission Master (`permission_master`)**: `permission_code` (e.g., CREATE_VOUCHER, VIEW_REPORT), `description`
- **Role Permissions (`role_permission`)**: `role_id`, `permission_code`, `allowed` (boolean)

## 3. Module & Entity Level Security
Control creation, reading, updating, and deleting per module table.
- **Entity Permission (`entity_permission`)**: `role_id`, `entity` (e.g., SALES_VOUCHER), `create`, `read`, `update`, `delete` (booleans)

## 4. Company & Branch Access (Data Scope)
Every read query MUST enforce this layer.
- **Data Scope Mapping (`user_data_scope`)**: `user_id`, `company_id`, `branch_id`, `dept_id`
- *Implementation*: Runtime filter applied automatically (e.g., `WHERE branch_id IN (allowed branches)`). Users never see unauthorized data.

## 5. Voucher Level Security
Enforce actions dynamically based on the current stage of a voucher.
- **Voucher Status Permission (`voucher_status_permission`)**: `role_id`, `voucher_type`, `status` (Draft, Approved, Posted), `action`

## 6. Field Level Security & Dynamic Fields Feature
Allows securing specific fields (e.g., Sales user cannot change price or discount). Deep integration with the Metadata Engine.
- **Field Permission (`field_permission`)**: `role_id`, `entity`, `field_name`, `editable` (bool), `visible` (bool)
- **Metadata Field Permission (`metadata_field_permission`)**: `role_id`, `field_id`, `editable` (bool)

## 7. Approval Authority Matrix
Critical specifically for financial and procurement processing - read dynamically by the Workflow Engine.
- **Approval Matrix (`approval_matrix`)**: `role_id`, `voucher_type`, `min_amount`, `max_amount`, `approval_level` (e.g., Manager: > 0, Director: > 10001)

## 8. Record Ownership
Allows a common ERP rule where users can only view/edit records they themselves created.
- **Requirements**: Enforce `created_by` and `updated_by` fields on entities.
- **Implementation**: Append `WHERE created_by = currentUser` unless their role explicitly bypasses this.

## 9. Audit Trail (Mandatory)
Every significant change MUST be automatically logged for financial compliance.
- **Audit Log (`audit_log`)**: `entity`, `entity_id`, `action`, `old_value`, `new_value`, `user_id`, `timestamp`

# API Security Flow
1. Middleware validates JWT.
2. User roles are loaded.
3. Relevant Data Scope branches/companies are mapped.
4. Entity Permission verified (e.g., `authorize("CREATE_VOUCHER")`).
5. Field-level security mappings applied dynamically.
6. Action executes.
