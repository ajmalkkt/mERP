# Workflow & Approval Engine — Complete Design

## 🎯 Purpose

The Workflow & Approval Engine transforms the ERP from a data entry system into
an **enterprise control platform**. It provides:

- ✅ Multi-level approvals with configurable chains
- ✅ Department-scoped workflows
- ✅ Production stage management
- ✅ Configurable business processes (no code changes)
- ✅ Notification routing (email, in-app, webhooks)
- ✅ Conditional logic (auto-approve, threshold rules, branch rules)
- ✅ Delegation & escalation
- ✅ Full audit trail of every transition

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                 WORKFLOW & APPROVAL ENGINE                        │
│                                                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ Workflow     │  │ Approval    │  │ Notification│              │
│  │ Definition   │  │ Runtime     │  │ Router      │              │
│  │ (Config)     │  │ (Execution) │  │             │              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
│         │                │                 │                      │
│  ┌──────▼────────────────▼─────────────────▼──────────────┐      │
│  │              Workflow State Machine                      │      │
│  │   Draft → Submitted → L1 Approval → L2 Approval →      │      │
│  │   ... → Final Approval → Posted / Completed             │      │
│  └──────┬──────────────────────────────────────────────────┘      │
│         │                                                         │
│  ┌──────▼──────────────────────────────────────────────────┐      │
│  │              Condition Engine                             │      │
│  │   amount > 100K → add Director approval                   │      │
│  │   branch = "factory" → add QC step                        │      │
│  │   item.category = "hazmat" → add Safety approval          │      │
│  └──────┬──────────────────────────────────────────────────┘      │
│         │                                                         │
│  ┌──────▼────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │ Delegation    │  │ Escalation  │  │ Audit       │            │
│  │ Manager       │  │ Timer       │  │ Logger      │            │
│  └───────────────┘  └─────────────┘  └─────────────┘            │
└──────────────────────────────────────────────────────────────────┘
```

---

## 1. Database Schema

### Table: `meta_workflow` — Workflow Definitions

Defines **which entities/vouchers** have a workflow and the overall config.

```sql
CREATE TABLE meta_workflow (
  workflow_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        UUID NOT NULL REFERENCES companies(id),
  workflow_name     VARCHAR(200) NOT NULL,        -- 'Sales Invoice Approval'
  entity_type       VARCHAR(100) NOT NULL,        -- 'SALES_INVOICE', 'PURCHASE_ORDER', 'item'
  category          VARCHAR(50) NOT NULL,         -- 'approval', 'production', 'process'
  trigger_event     VARCHAR(50) NOT NULL,         -- 'on_submit', 'on_create', 'on_status_change'

  -- Scope
  applies_to_branch UUID REFERENCES branches(id), -- NULL = all branches
  applies_to_dept   UUID REFERENCES departments(id), -- NULL = all departments

  -- Behavior
  allow_parallel    BOOLEAN DEFAULT FALSE,        -- parallel approval at same level
  allow_skip        BOOLEAN DEFAULT FALSE,        -- admin can skip steps
  allow_recall      BOOLEAN DEFAULT FALSE,        -- submitter can recall
  require_comments  BOOLEAN DEFAULT FALSE,        -- approver must add comments

  -- Escalation
  escalation_enabled BOOLEAN DEFAULT FALSE,
  escalation_hours   INT DEFAULT 48,              -- hours before escalation
  escalation_to      VARCHAR(50),                 -- 'next_level', 'admin', 'specific_user'

  is_active         BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMP DEFAULT NOW(),
  created_by        UUID,

  UNIQUE(company_id, entity_type, applies_to_branch, applies_to_dept)
);

CREATE INDEX idx_workflow_entity ON meta_workflow(company_id, entity_type, is_active);
```

### Table: `meta_workflow_steps` — Step Definitions

Defines the **stages** within each workflow and who approves at each stage.

```sql
CREATE TABLE meta_workflow_steps (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id       UUID NOT NULL REFERENCES meta_workflow(workflow_id) ON DELETE CASCADE,
  step_order        INT NOT NULL,                 -- 1, 2, 3...
  step_name         VARCHAR(100) NOT NULL,        -- 'Store Manager Review'
  step_type         VARCHAR(50) NOT NULL,         -- 'approval', 'review', 'notification', 'action'

  -- Who approves
  approver_type     VARCHAR(50) NOT NULL,         -- 'role', 'user', 'department_head', 'dynamic'
  approver_role     VARCHAR(50),                  -- 'manager', 'finance_head', 'director'
  approver_user_id  UUID REFERENCES users(id),    -- specific user override
  approver_dynamic  VARCHAR(100),                 -- expression: 'header.salesPersonId'

  -- Conditional step (only if condition matches)
  condition_field   VARCHAR(100),                 -- 'grand_total', 'item_count', 'branch_id'
  condition_operator VARCHAR(10),                 -- 'gt', 'lt', 'eq', 'in', 'between'
  condition_value   TEXT,                         -- '100000' or '["branch_a","branch_b"]'

  -- Auto-actions
  auto_approve      BOOLEAN DEFAULT FALSE,
  auto_approve_condition TEXT,                    -- 'amount < 10000'
  auto_reject_condition  TEXT,                    -- 'quantity > maxLimit'
  timeout_hours     INT,                          -- NULL = no timeout
  timeout_action    VARCHAR(20),                  -- 'escalate', 'auto_approve', 'auto_reject'

  -- Notifications
  notify_on_enter   BOOLEAN DEFAULT TRUE,
  notify_on_complete BOOLEAN DEFAULT FALSE,
  notify_channels   JSONB DEFAULT '["in_app"]',  -- ["in_app", "email", "webhook"]

  -- Actions on completion
  on_approve_action VARCHAR(100),                 -- 'post_voucher', 'update_status', 'trigger_next'
  on_reject_action  VARCHAR(100),                 -- 'return_to_draft', 'cancel', 'notify_submitter'

  UNIQUE(workflow_id, step_order)
);

CREATE INDEX idx_wf_steps_workflow ON meta_workflow_steps(workflow_id, step_order);
```

### Table: `workflow_instances` — Runtime Instances

Tracks the **current state** of each document/entity going through a workflow.

```sql
CREATE TABLE workflow_instances (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id       UUID NOT NULL REFERENCES meta_workflow(workflow_id),
  entity_type       VARCHAR(100) NOT NULL,
  entity_id         UUID NOT NULL,                -- the voucher/record being approved
  current_step      INT NOT NULL DEFAULT 1,
  current_step_name VARCHAR(100),
  status            VARCHAR(20) DEFAULT 'in_progress', -- 'in_progress','approved','rejected','cancelled','recalled'
  submitted_by      UUID NOT NULL REFERENCES users(id),
  submitted_at      TIMESTAMP DEFAULT NOW(),
  completed_at      TIMESTAMP,
  company_id        UUID NOT NULL,

  UNIQUE(entity_type, entity_id)
);

CREATE INDEX idx_wfi_entity ON workflow_instances(entity_type, entity_id);
CREATE INDEX idx_wfi_status ON workflow_instances(company_id, status);
CREATE INDEX idx_wfi_pending ON workflow_instances(company_id, status, current_step)
  WHERE status = 'in_progress';
```

### Table: `workflow_actions` — Action Log (History)

Every approval, rejection, or action is recorded permanently.

```sql
CREATE TABLE workflow_actions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id       UUID NOT NULL REFERENCES workflow_instances(id),
  step_order        INT NOT NULL,
  step_name         VARCHAR(100) NOT NULL,
  action            VARCHAR(20) NOT NULL,         -- 'approve','reject','return','escalate','skip','recall','auto_approve'
  acted_by          UUID REFERENCES users(id),    -- NULL for auto-actions
  acted_at          TIMESTAMP DEFAULT NOW(),
  comments          TEXT,
  attachments       JSONB,                        -- file references
  was_delegated     BOOLEAN DEFAULT FALSE,
  delegated_from    UUID REFERENCES users(id),
  time_taken_hours  DECIMAL(10,2),                -- how long this step took
  company_id        UUID NOT NULL
);

CREATE INDEX idx_wfa_instance ON workflow_actions(instance_id, step_order);
CREATE INDEX idx_wfa_user ON workflow_actions(acted_by, acted_at DESC);
```

### Table: `workflow_delegations` — Delegation Rules

Allows users to delegate their approvals to someone else temporarily.

```sql
CREATE TABLE workflow_delegations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        UUID NOT NULL,
  delegator_id      UUID NOT NULL REFERENCES users(id),
  delegate_id       UUID NOT NULL REFERENCES users(id),
  entity_type       VARCHAR(100),                 -- NULL = all types
  start_date        DATE NOT NULL,
  end_date          DATE NOT NULL,
  reason            TEXT,
  is_active         BOOLEAN DEFAULT TRUE,

  UNIQUE(company_id, delegator_id, entity_type, start_date)
);
```

### Table: `workflow_notifications` — Notification Queue

```sql
CREATE TABLE workflow_notifications (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id       UUID NOT NULL REFERENCES workflow_instances(id),
  recipient_id      UUID NOT NULL REFERENCES users(id),
  channel           VARCHAR(20) NOT NULL,         -- 'in_app', 'email', 'webhook'
  notification_type VARCHAR(50) NOT NULL,         -- 'pending_approval','approved','rejected','escalation','reminder'
  title             VARCHAR(200) NOT NULL,
  body              TEXT,
  entity_type       VARCHAR(100),
  entity_id         UUID,
  action_url        VARCHAR(500),                 -- deep link to the document
  is_read           BOOLEAN DEFAULT FALSE,
  is_sent           BOOLEAN DEFAULT FALSE,
  sent_at           TIMESTAMP,
  created_at        TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_wfn_recipient ON workflow_notifications(recipient_id, is_read, created_at DESC);
CREATE INDEX idx_wfn_pending ON workflow_notifications(is_sent, channel)
  WHERE is_sent = FALSE;
```

---

## 2. Workflow State Machine

Every document follows this state lifecycle:

```
                    ┌──── Recall ◄────────────────────────────┐
                    │                                          │
                    ▼                                          │
┌───────┐    ┌───────────┐    ┌──────────┐    ┌──────────┐   │
│ Draft │───►│ Submitted │───►│ Step 1   │───►│ Step 2   │───┤
└───────┘    └───────────┘    │ Approval │    │ Approval │   │
                              └────┬─────┘    └────┬─────┘   │
                                   │               │          │
                    ┌──────────────┤               │          │
                    ▼              ▼               ▼          │
              ┌──────────┐  ┌──────────┐   ┌──────────┐      │
              │ Rejected │  │ Approved │   │ Step N   │──────┘
              │ (→ Draft)│  │          │   │ Final    │
              └──────────┘  └────┬─────┘   └────┬─────┘
                                 │               │
                                 ▼               ▼
                           ┌──────────┐    ┌──────────┐
                           │  Posted  │    │ Completed│
                           └──────────┘    └──────────┘
```

### Status Transitions

| From           | Action         | To                | Who Can Do It            |
| -------------- | -------------- | ----------------- | ------------------------ |
| `draft`        | `submit`       | `in_progress`     | Creator / editor         |
| `in_progress`  | `approve`      | next step / done  | Approver at current step |
| `in_progress`  | `reject`       | `rejected`        | Approver at current step |
| `in_progress`  | `return`       | previous step     | Approver at current step |
| `in_progress`  | `recall`       | `draft`           | Original submitter       |
| `in_progress`  | `skip`         | next step         | Admin only               |
| `in_progress`  | `escalate`     | same step, new approver | System / admin     |
| `rejected`     | `resubmit`     | `in_progress` (step 1) | Original submitter  |
| `approved`     | `post`         | `posted`          | System / user            |
| `in_progress`  | `cancel`       | `cancelled`       | Admin / creator          |

---

## 3. Workflow Engine — Service Logic

### 3.1 Workflow Initialization

Called by the Transaction Orchestrator when a voucher is submitted.

```js
// src/engine/workflowEngine.js

async function initialize(trx, entityId, entityType, companyId, userId) {
  // 1. Find matching workflow definition
  const workflow = await findWorkflow(entityType, companyId, entityId, trx);
  if (!workflow) return null; // no workflow configured → auto-post

  // 2. Load steps and evaluate conditions
  const allSteps = await trx('meta_workflow_steps')
    .where({ workflow_id: workflow.workflow_id })
    .orderBy('step_order');

  const entity = await getEntity(entityType, entityId, trx);
  const applicableSteps = filterStepsByCondition(allSteps, entity);

  if (applicableSteps.length === 0) return null; // all steps skipped → auto-post

  // 3. Create workflow instance
  const [instance] = await trx('workflow_instances').insert({
    workflow_id: workflow.workflow_id,
    entity_type: entityType,
    entity_id: entityId,
    current_step: applicableSteps[0].step_order,
    current_step_name: applicableSteps[0].step_name,
    status: 'in_progress',
    submitted_by: userId,
    submitted_at: new Date(),
    company_id: companyId,
  }).returning('*');

  // 4. Check auto-approve for first step
  const firstStep = applicableSteps[0];
  if (firstStep.auto_approve && evaluateCondition(firstStep.auto_approve_condition, entity)) {
    await autoAdvance(trx, instance, firstStep, applicableSteps, entity, companyId);
    return;
  }

  // 5. Send notification to first approver
  const approvers = await resolveApprovers(firstStep, entity, companyId, trx);
  await sendNotifications(trx, instance, firstStep, approvers, 'pending_approval');

  // 6. Record in action log
  await trx('workflow_actions').insert({
    instance_id: instance.id,
    step_order: firstStep.step_order,
    step_name: firstStep.step_name,
    action: 'submit',
    acted_by: userId,
    comments: 'Submitted for approval',
    company_id: companyId,
  });

  return instance;
}
```

### 3.2 Workflow Advancement (Approve / Reject / Return)

```js
async function performAction(entityType, entityId, action, userId, comments, companyId) {
  const trx = await db.transaction();

  try {
    // 1. Load instance
    const instance = await trx('workflow_instances')
      .where({ entity_type: entityType, entity_id: entityId, status: 'in_progress' })
      .first();

    if (!instance) throw new Error('No active workflow for this document');

    // 2. Load current step definition
    const currentStep = await trx('meta_workflow_steps')
      .where({ workflow_id: instance.workflow_id, step_order: instance.current_step })
      .first();

    // 3. Check permission
    const canAct = await canUserActOnStep(currentStep, userId, companyId, trx);
    if (!canAct) throw new Error('You are not authorized to act on this workflow step');

    // 4. Record the action
    const previousAction = await trx('workflow_actions')
      .where({ instance_id: instance.id, step_order: currentStep.step_order, action: 'submit' })
      .orWhere({ instance_id: instance.id, step_order: currentStep.step_order, action: 'approve' })
      .orderBy('acted_at')
      .first();

    const timeTaken = previousAction
      ? (Date.now() - new Date(previousAction.acted_at).getTime()) / 3600000
      : null;

    await trx('workflow_actions').insert({
      instance_id: instance.id,
      step_order: currentStep.step_order,
      step_name: currentStep.step_name,
      action: action,
      acted_by: userId,
      comments: comments,
      time_taken_hours: timeTaken,
      company_id: companyId,
    });

    // 5. Process based on action type
    switch (action) {
      case 'approve':
        await handleApproval(trx, instance, currentStep, companyId, userId);
        break;
      case 'reject':
        await handleRejection(trx, instance, currentStep, companyId, userId, comments);
        break;
      case 'return':
        await handleReturn(trx, instance, currentStep, companyId, userId, comments);
        break;
      case 'recall':
        await handleRecall(trx, instance, companyId, userId);
        break;
      default:
        throw new Error(`Unknown workflow action: ${action}`);
    }

    await trx.commit();
  } catch (error) {
    await trx.rollback();
    throw error;
  }
}
```

### 3.3 Approval Handler

```js
async function handleApproval(trx, instance, currentStep, companyId, userId) {
  const entity = await getEntity(instance.entity_type, instance.entity_id, trx);

  // Load all applicable steps
  const allSteps = await trx('meta_workflow_steps')
    .where({ workflow_id: instance.workflow_id })
    .orderBy('step_order');
  const applicableSteps = filterStepsByCondition(allSteps, entity);

  // Find next applicable step
  const nextStep = applicableSteps.find(s => s.step_order > currentStep.step_order);

  if (nextStep) {
    // ── Move to next step ──────────────────────────────────────────
    // Check auto-approve on next step
    if (nextStep.auto_approve && evaluateCondition(nextStep.auto_approve_condition, entity)) {
      await trx('workflow_instances')
        .where({ id: instance.id })
        .update({ current_step: nextStep.step_order, current_step_name: nextStep.step_name });

      // Recursively auto-advance
      return handleApproval(trx, { ...instance, current_step: nextStep.step_order },
        nextStep, companyId, null);
    }

    // Move instance to next step
    await trx('workflow_instances')
      .where({ id: instance.id })
      .update({ current_step: nextStep.step_order, current_step_name: nextStep.step_name });

    // Notify next approver
    const approvers = await resolveApprovers(nextStep, entity, companyId, trx);
    await sendNotifications(trx, instance, nextStep, approvers, 'pending_approval');

  } else {
    // ── Final approval — workflow complete ─────────────────────────
    await trx('workflow_instances')
      .where({ id: instance.id })
      .update({ status: 'approved', completed_at: new Date() });

    // Execute final action (e.g., post voucher)
    await executeFinalAction(trx, instance, currentStep, companyId, userId);

    // Notify submitter
    await sendNotifications(trx, instance, currentStep,
      [{ userId: instance.submitted_by }], 'approved');
  }
}
```

### 3.4 Rejection Handler

```js
async function handleRejection(trx, instance, currentStep, companyId, userId, comments) {
  // Determine reject behavior from step config
  const rejectAction = currentStep.on_reject_action || 'return_to_draft';

  switch (rejectAction) {
    case 'return_to_draft':
      await trx('workflow_instances')
        .where({ id: instance.id })
        .update({ status: 'rejected' });
      // Update entity status back to draft
      await updateEntityStatus(trx, instance.entity_type, instance.entity_id, 'draft');
      break;

    case 'cancel':
      await trx('workflow_instances')
        .where({ id: instance.id })
        .update({ status: 'cancelled', completed_at: new Date() });
      await updateEntityStatus(trx, instance.entity_type, instance.entity_id, 'cancelled');
      break;
  }

  // Notify submitter of rejection
  await sendNotifications(trx, instance, currentStep,
    [{ userId: instance.submitted_by }], 'rejected', comments);
}
```

### 3.5 Return to Previous Step

```js
async function handleReturn(trx, instance, currentStep, companyId, userId, comments) {
  const allSteps = await trx('meta_workflow_steps')
    .where({ workflow_id: instance.workflow_id })
    .orderBy('step_order');

  const prevStep = allSteps
    .filter(s => s.step_order < currentStep.step_order)
    .pop(); // last step before current

  if (!prevStep) {
    // No previous step → return to draft
    return handleRejection(trx, instance, currentStep, companyId, userId, comments);
  }

  await trx('workflow_instances')
    .where({ id: instance.id })
    .update({ current_step: prevStep.step_order, current_step_name: prevStep.step_name });

  // Notify the previous level approver
  const entity = await getEntity(instance.entity_type, instance.entity_id, trx);
  const approvers = await resolveApprovers(prevStep, entity, companyId, trx);
  await sendNotifications(trx, instance, prevStep, approvers, 'returned', comments);
}
```

---

## 4. Approver Resolution

The engine supports multiple ways to determine who approves at each step.

```js
async function resolveApprovers(step, entity, companyId, trx) {
  const approvers = [];

  switch (step.approver_type) {
    case 'role':
      // All users with this role in the company
      const roleUsers = await trx('users')
        .where({ company_id: companyId, role: step.approver_role, status: 'active' });
      approvers.push(...roleUsers.map(u => ({ userId: u.id, email: u.email })));
      break;

    case 'user':
      // Specific user
      approvers.push({ userId: step.approver_user_id });
      break;

    case 'department_head':
      // Head of the entity's department
      const deptId = entity.department_id;
      const head = await trx('departments')
        .where({ id: deptId })
        .select('head_user_id')
        .first();
      if (head?.head_user_id) approvers.push({ userId: head.head_user_id });
      break;

    case 'dynamic':
      // Resolve from entity field (e.g., 'header.salesPersonId')
      const dynamicUserId = resolveFieldPath(step.approver_dynamic, entity);
      if (dynamicUserId) approvers.push({ userId: dynamicUserId });
      break;
  }

  // Check delegations
  const finalApprovers = [];
  for (const approver of approvers) {
    const delegation = await trx('workflow_delegations')
      .where({ delegator_id: approver.userId, is_active: true })
      .where('start_date', '<=', new Date())
      .where('end_date', '>=', new Date())
      .where(builder => {
        builder.whereNull('entity_type')
          .orWhere('entity_type', entity.entityType);
      })
      .first();

    if (delegation) {
      finalApprovers.push({
        userId: delegation.delegate_id,
        delegatedFrom: approver.userId,
      });
    } else {
      finalApprovers.push(approver);
    }
  }

  return finalApprovers;
}
```

---

## 5. Condition Engine

Steps can be **conditionally included or auto-approved** based on document data.

### Step Conditions (include/exclude step)

```js
function filterStepsByCondition(steps, entity) {
  return steps.filter(step => {
    if (!step.condition_field) return true; // no condition = always include

    const actual = resolveFieldPath(step.condition_field, entity);
    const expected = parseConditionValue(step.condition_value);

    switch (step.condition_operator) {
      case 'gt':      return actual > expected;
      case 'lt':      return actual < expected;
      case 'gte':     return actual >= expected;
      case 'lte':     return actual <= expected;
      case 'eq':      return actual === expected;
      case 'neq':     return actual !== expected;
      case 'in':      return Array.isArray(expected) && expected.includes(actual);
      case 'between': return actual >= expected[0] && actual <= expected[1];
      default:        return true;
    }
  });
}
```

### Example: Conditional Approval Steps

```json
[
  {
    "step_order": 1,
    "step_name": "Department Head",
    "approver_type": "department_head",
    "condition_field": null,
    "comment": "Always required"
  },
  {
    "step_order": 2,
    "step_name": "Finance Head",
    "approver_type": "role",
    "approver_role": "finance_head",
    "condition_field": "grand_total",
    "condition_operator": "gt",
    "condition_value": "50000",
    "comment": "Only if amount > 50,000"
  },
  {
    "step_order": 3,
    "step_name": "Director",
    "approver_type": "role",
    "approver_role": "director",
    "condition_field": "grand_total",
    "condition_operator": "gt",
    "condition_value": "500000",
    "comment": "Only if amount > 5,00,000"
  }
]
```

**Result:** A ₹30,000 invoice → only Step 1 (Dept Head). A ₹2,00,000 invoice → Step 1 + Step 2. A ₹10,00,000 invoice → Step 1 + Step 2 + Step 3.

---

## 6. Notification Router

### Notification Channels

| Channel    | Implementation                                    |
| ---------- | ------------------------------------------------- |
| `in_app`   | Insert into `workflow_notifications`, show in bell icon |
| `email`    | Queue email via email service (nodemailer)        |
| `webhook`  | POST to configured webhook URL                    |

### Notification Logic

```js
async function sendNotifications(trx, instance, step, approvers, type, comments) {
  const channels = step.notify_channels || ['in_app'];
  const entity = await getEntity(instance.entity_type, instance.entity_id, trx);

  const title = buildNotificationTitle(type, instance, step);
  const body = buildNotificationBody(type, instance, step, entity, comments);
  const actionUrl = buildActionUrl(instance.entity_type, instance.entity_id);

  for (const approver of approvers) {
    for (const channel of channels) {
      // Insert notification record
      await trx('workflow_notifications').insert({
        instance_id: instance.id,
        recipient_id: approver.userId,
        channel: channel,
        notification_type: type,
        title, body,
        entity_type: instance.entity_type,
        entity_id: instance.entity_id,
        action_url: actionUrl,
      });
    }
  }
}

function buildNotificationTitle(type, instance, step) {
  switch (type) {
    case 'pending_approval':
      return `🔔 Pending: ${instance.entity_type} requires your approval (${step.step_name})`;
    case 'approved':
      return `✅ Approved: Your ${instance.entity_type} has been approved`;
    case 'rejected':
      return `❌ Rejected: Your ${instance.entity_type} was rejected`;
    case 'returned':
      return `↩️ Returned: ${instance.entity_type} returned with comments`;
    case 'escalation':
      return `⚠️ Escalation: ${instance.entity_type} requires immediate attention`;
    case 'reminder':
      return `⏰ Reminder: ${instance.entity_type} is awaiting your action`;
  }
}
```

---

## 7. Escalation Timer

A background job checks for stale workflow instances and escalates.

```js
// src/engine/escalationJob.js  (cron: every hour)

async function processEscalations() {
  const staleInstances = await db('workflow_instances as wi')
    .join('meta_workflow as mw', 'wi.workflow_id', 'mw.workflow_id')
    .join('meta_workflow_steps as ws', function() {
      this.on('ws.workflow_id', 'wi.workflow_id')
        .andOn('ws.step_order', 'wi.current_step');
    })
    .where('wi.status', 'in_progress')
    .where('mw.escalation_enabled', true)
    .whereNotNull('ws.timeout_hours')
    .whereRaw(`
      wi.submitted_at + (ws.timeout_hours || ' hours')::interval < NOW()
    `)
    .select('wi.*', 'ws.*', 'mw.escalation_to');

  for (const item of staleInstances) {
    const lastAction = await db('workflow_actions')
      .where({ instance_id: item.id, step_order: item.current_step })
      .orderBy('acted_at', 'desc')
      .first();

    const hoursSinceLastAction = lastAction
      ? (Date.now() - new Date(lastAction.acted_at).getTime()) / 3600000
      : Infinity;

    if (hoursSinceLastAction > item.timeout_hours) {
      switch (item.timeout_action) {
        case 'escalate':
          await escalateToNextLevel(item);
          break;
        case 'auto_approve':
          await autoApproveStep(item);
          break;
        case 'auto_reject':
          await autoRejectStep(item);
          break;
      }
    }
  }
}
```

---

## 8. Production Workflow (Special Case)

Production orders have a **process workflow** with stage transitions:

```
Raw Material Issue → Work In Progress → Quality Check → Finished Goods Receipt
```

### Production Workflow Configuration

```json
{
  "workflow_name": "Production Order Workflow",
  "entity_type": "PRODUCTION_ORDER",
  "category": "production",
  "steps": [
    {
      "step_order": 1,
      "step_name": "Material Issue",
      "step_type": "action",
      "on_approve_action": "create_stock_issue_voucher",
      "approver_type": "role",
      "approver_role": "store_keeper"
    },
    {
      "step_order": 2,
      "step_name": "Production In Progress",
      "step_type": "action",
      "on_approve_action": "update_status_wip",
      "approver_type": "role",
      "approver_role": "production_supervisor"
    },
    {
      "step_order": 3,
      "step_name": "Quality Check",
      "step_type": "approval",
      "approver_type": "role",
      "approver_role": "quality_inspector",
      "on_reject_action": "return_to_production"
    },
    {
      "step_order": 4,
      "step_name": "Finished Goods Receipt",
      "step_type": "action",
      "on_approve_action": "create_stock_receipt_voucher",
      "approver_type": "role",
      "approver_role": "store_keeper"
    }
  ]
}
```

---

## 9. Workflow APIs

| Endpoint                                        | Method | Purpose                                    |
| ----------------------------------------------- | ------ | ------------------------------------------ |
| `/api/workflow/definitions`                     | GET    | List all workflow definitions              |
| `/api/workflow/definitions/:id`                 | GET    | Get workflow definition with steps         |
| `/api/workflow/definitions`                     | POST   | Create workflow (admin)                    |
| `/api/workflow/definitions/:id`                 | PUT    | Update workflow (admin)                    |
| `/api/workflow/:entityType/:entityId/submit`    | POST   | Submit entity for approval                 |
| `/api/workflow/:entityType/:entityId/approve`   | POST   | Approve current step                       |
| `/api/workflow/:entityType/:entityId/reject`    | POST   | Reject current step                        |
| `/api/workflow/:entityType/:entityId/return`    | POST   | Return to previous step                    |
| `/api/workflow/:entityType/:entityId/recall`    | POST   | Recall submission                          |
| `/api/workflow/:entityType/:entityId/skip`      | POST   | Skip step (admin only)                     |
| `/api/workflow/:entityType/:entityId/status`    | GET    | Current workflow status + history          |
| `/api/workflow/pending`                         | GET    | My pending approvals (current user)        |
| `/api/workflow/history`                         | GET    | My approval history                        |
| `/api/workflow/delegations`                     | GET    | My delegations                             |
| `/api/workflow/delegations`                     | POST   | Create delegation                          |
| `/api/workflow/notifications`                   | GET    | My notifications (bell icon)               |
| `/api/workflow/notifications/:id/read`          | PUT    | Mark notification as read                  |

---

## 10. Frontend Integration

### Workflow Status Bar (in VoucherEditor)

```tsx
// erp-core/voucher/WorkflowStatusBar.tsx
interface WorkflowStatusBarProps {
  entityType: string;
  entityId: string;
}

function WorkflowStatusBar({ entityType, entityId }: WorkflowStatusBarProps) {
  const { data: status } = useQuery({
    queryKey: ['workflow-status', entityType, entityId],
    queryFn: () => apiClient.get(`/api/workflow/${entityType}/${entityId}/status`),
  });

  if (!status) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-muted border-b">
      {status.steps.map((step, i) => (
        <React.Fragment key={step.step_order}>
          <div className={cn(
            'flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium',
            step.status === 'completed' && 'bg-green-100 text-green-700',
            step.status === 'current'   && 'bg-blue-100 text-blue-700 ring-2 ring-blue-300',
            step.status === 'pending'   && 'bg-gray-100 text-gray-500',
            step.status === 'rejected'  && 'bg-red-100 text-red-700',
          )}>
            {step.status === 'completed' && '✓ '}
            {step.step_name}
          </div>
          {i < status.steps.length - 1 && <span className="text-gray-300">→</span>}
        </React.Fragment>
      ))}
    </div>
  );
}
```

### Approval Actions Panel

```tsx
// erp-core/voucher/ApprovalActions.tsx
function ApprovalActions({ entityType, entityId, canApprove }: Props) {
  const [comments, setComments] = useState('');
  const queryClient = useQueryClient();

  const actionMutation = useMutation({
    mutationFn: ({ action }: { action: string }) =>
      apiClient.post(`/api/workflow/${entityType}/${entityId}/${action}`, { comments }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-status'] });
      toast.success('Action completed');
    },
  });

  if (!canApprove) return null;

  return (
    <div className="flex flex-col gap-3 p-4 border-t">
      <Textarea placeholder="Comments (optional)" value={comments} onChange={e => setComments(e.target.value)} />
      <div className="flex gap-2">
        <Button onClick={() => actionMutation.mutate({ action: 'approve' })} className="bg-green-600">
          ✓ Approve
        </Button>
        <Button variant="destructive" onClick={() => actionMutation.mutate({ action: 'reject' })}>
          ✕ Reject
        </Button>
        <Button variant="outline" onClick={() => actionMutation.mutate({ action: 'return' })}>
          ↩ Return
        </Button>
      </div>
    </div>
  );
}
```

### Pending Approvals (Bell Icon / Dashboard Widget)

```tsx
function PendingApprovals() {
  const { data: pending } = useQuery({
    queryKey: ['pending-approvals'],
    queryFn: () => apiClient.get('/api/workflow/pending'),
    refetchInterval: 30000, // poll every 30s
  });

  return (
    <div>
      <h3>Pending Approvals ({pending?.length ?? 0})</h3>
      {pending?.map(item => (
        <div key={item.id} className="flex items-center justify-between p-3 border-b">
          <div>
            <p className="font-medium">{item.entity_type}: {item.voucher_no}</p>
            <p className="text-xs text-muted-foreground">
              From: {item.submitted_by_name} | {item.current_step_name}
            </p>
          </div>
          <Button size="sm" asChild>
            <a href={item.action_url}>Review</a>
          </Button>
        </div>
      ))}
    </div>
  );
}
```

---

## 11. Example Workflow Scenarios

### Sales Invoice Approval

```
Step 1: Sales Manager         (always)
Step 2: Finance Head          (if amount > ₹50,000)
Step 3: Director              (if amount > ₹5,00,000)
→ On final approve: auto-post voucher
```

### Purchase Order Approval

```
Step 1: Department Head       (always, auto-approve if < ₹10,000)
Step 2: Purchase Manager      (always)
Step 3: CFO                   (if amount > ₹1,00,000)
→ On final approve: generate PO number, notify vendor
```

### Production Order Stages

```
Step 1: Material Issue        (store keeper action)
Step 2: Work In Progress      (production supervisor)
Step 3: Quality Check         (QC inspector — can reject → return to step 2)
Step 4: Finished Goods Receipt (store keeper action)
→ On final approve: create stock receipt voucher
```

### Leave Request (HR)

```
Step 1: Reporting Manager     (auto-approve if < 2 days)
Step 2: HR Head               (if > 5 days)
→ Escalation: if no action in 24 hours, escalate to next level
```

---

## Key Rules Summary

1. **Workflows are configurable per company** — no code changes for new workflows
2. **Steps are conditional** — based on amount, branch, category, or any field
3. **Auto-approve** supported with threshold conditions
4. **Delegation** allows temporary transfer of approval authority
5. **Escalation** with configurable timeout and auto-actions
6. **Full audit trail** of every approval, rejection, comment, and timestamp
7. **Notifications** via in-app, email, and webhooks
8. **Recall** allows submitter to pull back before final approval
9. **Return** sends back to specific previous step (not just reject)
10. **Production workflows** support stage-based process flows
11. **All actions run inside DB transactions** for consistency
