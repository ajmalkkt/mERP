---
name: metadata-workflow-engine
description: A non-hardcoded, rule-based engine that manages entity transitions based on JSON conditions and Actor roles.
---

# Goal
Provide a robust state machine that controls document status, UI field-level security, routing, and ledger posting triggers, driven purely by metadata. Hardcoding rules (e.g., `if amount > 10000 -> manager approval`) is strictly avoided.

# Conceptual View
User Action -> Voucher Created -> Workflow Engine -> Approval Chain -> State Transition -> Next Department/User

# Core Design Philosophy
- **Modern ERP Approach**: Workflow Definition (metadata) + Rules Engine = No code change required.
- **Workflow Concepts**:
  - *Workflow*: Business process definition
  - *Stage*: Step in process
  - *Action*: Approve/Reject/Submit
  - *Actor*: User/Role/Department
  - *Transition*: Movement between stages
  - *Condition*: Rule evaluation

# Execution Flow
Voucher Created -> Workflow Instance Created -> Assigned to Role/User -> User Approves -> Rule Evaluated -> Next Stage Activated

# Instructions

## 1. Actor Resolution Engine
Workflows may assign tasks to different Actor Types:
- `USER` (e.g., John)
- `ROLE` (e.g., Finance Manager)
- `DEPARTMENT` (e.g., Accounts)
- `DYNAMIC` (e.g., Document creator manager, expression: `voucher.createdBy.manager`)

## 2. Condition Engine (Rule Evaluator)
Conditions are stored as JSON:
- `{"totalAmount": "> 10000"}`
- `{"country": "QATAR"}`
- `{"category": ["CAPEX", "IMPORT"]}`
**Evaluation process**: Load document -> Apply condition -> Return true/false.

## 3. UI Behaviour & Field-Level Security
The workflow dynamically controls the UI (GET `/workflow/state/{entity}`).
- **Draft Stage**: Editable fields, Add items allowed.
- **Approval Stage**: Cannot edit price/core fields, show Approve/Reject buttons.
- **Posted Stage**: Read only.

## 4. Notification Engine Integration
Trigger notifications automatically on events:
- Await approval -> Email/App
- Rejected -> Creator
- Completed -> Finance
- *Channels*: In-app, Email, WhatsApp (future), Push notifications.

## 5. Escalation (Enterprise Feature)
Table: `workflow_escalation` (`stage`, `timeout`, `escalate_to`)
- e.g., If no action after 24 hours -> escalate to manager.

## 6. Parallel Approval
Example: Finance AND Operations must approve.
- Add `approval_mode = ALL | ANY`. Engine waits for required signatures.

## 7. Integration With Ledger Engine
- Posting allowed **only when** `workflow.status == APPROVED`.
- Then, Ledger Posting is triggered.

# Database Schema Guidance

## Metadata Definitions
- **`workflow_definition`**: `workflow_id` (PK), `name`, `entity_type` (VOUCHER), `voucher_type` (PURCHASE), `company_id`, `is_active`
- **`workflow_stage`**: `stage_id` (PK), `workflow_id` (FK), `name`, `sequence`, `actor_type`, `actor_value`, `allow_edit`, `auto_post`
- **`workflow_transition`**: `transition_id` (PK), `from_stage` (FK), `to_stage` (FK), `action` (APPROVE/REJECT), `condition_json` (rule)

## Runtime Execution
- **`workflow_instance`**: `instance_id` (PK), `entity_id` (voucher id), `entity_type`, `current_stage_id`, `status` (IN_PROGRESS)
- **`workflow_history`**: `history_id` (PK), `instance_id`, `action`, `user_id`, `comments`, `timestamp` (Full auditability, Append-Only)

# Performance Strategy
Workflow tables are relatively small but highly queried. Required indexes:
- `(entity_type, entity_id)`
- `(current_stage_id)`
- `(actor_value)`

# Architecture Placement
UI Layer -> Metadata Engine -> Workflow Engine ⭐ -> Transaction Engine -> Ledger Engine -> Database