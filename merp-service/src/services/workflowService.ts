import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient(); // Keep local instance for now unless passed in transaction

/**
 * Actor Resolution Engine
 * Resolves Actor types (USER, ROLE, DEPARTMENT, DYNAMIC) to actual user IDs for task assignment
 */
export class ActorResolver {
  static async resolveActors(
    actorType: string,
    actorValue: string | null,
    trx: any,
    context?: any // e.g., { voucherData, createdByUserId }
  ): Promise<number[]> {
    switch (actorType) {
      case 'USER':
        // Direct user ID
        return [parseInt(actorValue || '0')];

      case 'ROLE':
        // All users with this role
        const usersByRole = await trx.secUserRole.findMany({
          where: { role: { name: actorValue } },
          select: { userId: true }
        });
        return usersByRole.map((ur: any) => ur.userId);

      case 'DEPARTMENT':
        // All users in this department
        const usersByDept = await trx.mstUser.findMany({
          where: { departmentId: parseInt(actorValue || '0') },
          select: { id: true }
        });
        return usersByDept.map((u: any) => u.id);

      case 'DYNAMIC':
        // Evaluate expression (e.g., "voucher.createdBy.manager")
        if (context && actorValue) {
          return [ActorResolver.evaluateDynamicExpression(actorValue, context)];
        }
        return [];

      default:
        return [];
    }
  }

  private static evaluateDynamicExpression(expr: string, context: any): number {
    // Simple expression evaluator - can be enhanced with safer evaluation
    // E.g., "voucher.createdBy.manager" -> fetch manager of creator
    try {
      const keys = expr.split('.');
      let value = context;
      for (const key of keys) {
        value = value?.[key];
      }
      return value || 0;
    } catch {
      return 0;
    }
  }
}

/**
 * Condition Engine (Rule Evaluator)
 * Evaluates JSON conditions against document data
 */
export class ConditionEvaluator {
  static evaluateCondition(conditionJson: any, documentData: any): boolean {
    if (!conditionJson) return true; // No condition = always pass

    try {
      for (const [field, rule] of Object.entries(conditionJson)) {
        if (!this.evaluateFieldRule(documentData[field], rule)) {
          return false;
        }
      }
      return true;
    } catch (error) {
      console.error('Condition evaluation error:', error);
      return false;
    }
  }

  private static evaluateFieldRule(value: any, rule: any): boolean {
    if (typeof rule === 'string') {
      // Operator format: "> 10000", "== QATAR", etc.
      return this.evaluateExpression(value, rule);
    } else if (Array.isArray(rule)) {
      // Array = IN operator
      return rule.includes(value);
    } else if (typeof rule === 'object') {
      // Nested object conditions
      return Object.entries(rule).every(([op, val]: [string, any]) =>
        this.compareValues(value, op, val)
      );
    }
    return value === rule;
  }

  private static evaluateExpression(value: any, expr: string): boolean {
    const match = expr.match(/^(>|<|>=|<=|==|!=|LIKE)\s*(.+)$/);
    if (!match) return value === expr;

    const [, operator, operand] = match;
    return this.compareValues(value, operator, operand);
  }

  private static compareValues(actual: any, operator: string, expected: any): boolean {
    const numActual = parseFloat(actual);
    const numExpected = parseFloat(expected);

    switch (operator) {
      case '>': return numActual > numExpected;
      case '<': return numActual < numExpected;
      case '>=': return numActual >= numExpected;
      case '<=': return numActual <= numExpected;
      case '==': return actual == expected;
      case '!=': return actual != expected;
      case 'LIKE': return String(actual).toLowerCase().includes(String(expected).toLowerCase());
      default: return false;
    }
  }
}

export class WorkflowEngine {
  /**
   * Initializes a workflow for a newly created entity (e.g., voucher).
   */
  static async initializeWorkflow(trx: any, entityId: number, entityType: string, voucherType: string, userId: number) {
    // 1. Find an active workflow for this voucher type
    const workflow = await trx.wfDefinition.findFirst({
      where: { 
        entityType,
        voucherType,
        isActive: true
      },
      include: {
        stages: {
          orderBy: { sequence: 'asc' }
        }
      }
    });

    if (!workflow || workflow.stages.length === 0) {
      // No workflow required -> Auto approve/post
      return null;
    }

    const firstStage = workflow.stages[0];

    // 2. Create Workflow Instance
    const instance = await trx.wfInstance.create({
      data: {
        workflowId: workflow.id,
        entityId,
        entityType,
        currentStageId: firstStage.id,
        status: 'PENDING_APPROVAL'
      }
    });

    // 3. Log History
    await trx.wfHistory.create({
      data: {
        instanceId: instance.id,
        action: 'SUBMIT',
        userId,
        comments: 'Workflow initialized'
      }
    });

    return instance;
  }

  /**
   * Processes a task (APPROVE or REJECT)
   * This is called individually from the UI when a user acts on a document.
   */
  static async processAction(
    instanceId: number,
    action: string,
    userId: number,
    comments?: string,
    documentData?: any
  ) {
    return await prisma.$transaction(async (trx) => {
      const instance = await trx.wfInstance.findUnique({
        where: { id: instanceId },
        include: { 
          currentStage: true, 
          workflow: true,
          history: { orderBy: { timestamp: 'desc' }, take: 1 }
        }
      });

      if (!instance || instance.status !== 'IN_PROGRESS') {
        throw new Error('Workflow instance is not in progress');
      }

      // 1. Find valid transition for the current stage based on the action
      const transition = await trx.wfTransition.findFirst({
        where: {
          fromStageId: instance.currentStageId,
          action: action
        },
        include: { toStage: true }
      });

      if (!transition) {
        throw new Error(`Invalid action '${action}' for the current stage.`);
      }

      // 2. Evaluate Condition (Rule Engine)
      if (transition.conditionJson && documentData) {
        const conditionPassed = ConditionEvaluator.evaluateCondition(
          transition.conditionJson,
          documentData
        );
        if (!conditionPassed) {
          throw new Error('Document does not meet approval conditions');
        }
      }

      // 3. Check parallel approval requirement (if applicable)
      // If current stage has approval_mode = ALL, check if all required approvers have approved
      const stageApprovals = await trx.wfApproval.findMany({
        where: { currentStageId: instance.currentStageId, instanceId },
        select: { userId: true, status: true }
      });

      if (stageApprovals.length > 0) {
        const approvalMode = (instance.currentStage as any).approvalMode || 'ANY';
        if (approvalMode === 'ALL') {
          const allApproved = stageApprovals.every((a: any) => a.status === 'APPROVED');
          if (!allApproved) {
            throw new Error('All required approvals must be completed');
          }
        }
      }

      // 4. Execute Transition
      const nextStage = transition.toStage;
      let newStatus = 'IN_PROGRESS';

      // If it's rejection, mark as REJECTED
      if (action === 'REJECT') {
        newStatus = 'REJECTED';
      } else if (action === 'APPROVE') {
        // Check if this was the last stage
        const hasMoreStages = await trx.wfTransition.count({
          where: { fromStageId: nextStage.id }
        });
        if (hasMoreStages === 0 || nextStage.autoPost) {
          newStatus = 'COMPLETED';
        }
      }

      // 5. Update instance
      const updatedInstance = await trx.wfInstance.update({
        where: { id: instanceId },
        data: {
          currentStageId: nextStage.id,
          status: newStatus
        }
      });

      // 6. Log History
      await trx.wfHistory.create({
        data: {
          instanceId,
          action,
          userId,
          comments
        }
      });

      // 7. Trigger notifications if applicable
      await this.triggerNotifications(trx, instanceId, action, userId, nextStage);

      // 8. Integrate with Ledger Engine ONLY if completely approved
      if (newStatus === 'COMPLETED') {
        // Fire event/signal to Transaction Engine to post to ledger
        console.log(`[Workflow] Workflow completed for entity ${instance.entityId}, ready for ledger posting`);
      }

      return updatedInstance;
    });
  }

  /**
   * Assign task to next stage actors (after transition)
   */
  static async assignTaskToNextActors(trx: any, instanceId: number, nextStageId: number, documentContext?: any) {
    const stage = await trx.wfStage.findUnique({ where: { id: nextStageId } });
    if (!stage) return;

    // Resolve actors
    const actorUserIds = await ActorResolver.resolveActors(
      stage.actorType,
      stage.actorValue,
      trx,
      documentContext
    );

    // Create approval records for each actor (only if not auto-post)
    if (!stage.autoPost && actorUserIds.length > 0) {
      await trx.wfApproval.createMany({
        data: actorUserIds.map(userId => ({
          instanceId,
          currentStageId: nextStageId,
          userId,
          status: 'PENDING'
        }))
      });
    }
  }

  /**
   * Trigger notifications for workflow events
   */
  static async triggerNotifications(
    trx: any,
    instanceId: number,
    action: string,
    userId: number,
    nextStage?: any
  ) {
    const instance = await trx.wfInstance.findUnique({
      where: { id: instanceId },
      include: { workflow: true }
    });

    let notificationType = 'WORKFLOW_ACTION';
    let recipientUserIds: number[] = [];

    if (action === 'APPROVE' && nextStage) {
      notificationType = 'WORKFLOW_AWAITING_APPROVAL';
      recipientUserIds = await ActorResolver.resolveActors(
        nextStage.actorType,
        nextStage.actorValue,
        trx
      );
    } else if (action === 'REJECT') {
      notificationType = 'WORKFLOW_REJECTED';
      const creator = instance?.history?.[instance.history.length - 1]?.userId;
      if (creator) recipientUserIds = [creator];
    }

    if (recipientUserIds.length > 0) {
      const notifications = recipientUserIds.map(recipientId => ({
        type: notificationType,
        recipientId,
        entityType: instance.entityType,
        entityId: instance.entityId,
        messageTemplate: `Workflow notification: ${action}`,
        isRead: false,
        createdAt: new Date()
      }));

      try {
        await trx.notification.createMany({ data: notifications });
      } catch (error) {
        console.error('Failed to create notifications:', error);
      }
    }
  }

  /**
   * Get workflow state for UI rendering
   * Returns field-level security, available actions, current approvers
   */
  static async getWorkflowStatus(entityType: string, entityId: number) {
    const instance = await prisma.wfInstance.findFirst({
      where: { entityType, entityId },
      include: {
        currentStage: {
          include: {
            workflow: true,
            toTransitions: { include: { toStage: true } }
          }
        },
        history: { orderBy: { timestamp: 'desc' }, take: 10 }
      },
      orderBy: { id: 'desc' }
    });

    if (!instance) return null;

    // Check field-level security based on current stage
    const fieldSecurity = {
      allowEdit: instance.currentStage.allowEdit,
      editableFields: instance.currentStage.allowEdit ? [] : [],
      readOnlyFields: !instance.currentStage.allowEdit ? ['*'] : []
    };

    // Available actions from current stage
    const availableActions = instance.currentStage.toTransitions.map(t => ({
      action: t.action,
      toStage: t.toStage.name,
      requiresCondition: !!t.conditionJson
    }));

    return {
      ...instance,
      fieldSecurity,
      availableActions,
      stage: instance.currentStage.name
    };
  }

  /**
   * Get current approvers for an instance
   */
  static async getCurrentApprovers(instanceId: number) {
    return await prisma.wfApproval.findMany({
      where: { instanceId, status: 'PENDING' },
      include: { user: { select: { id: true, username: true, firstName: true, lastName: true } } }
    });
  }

  /**
   * Get workflow history with user details
   */
  static async getWorkflowHistory(instanceId: number) {
    return await prisma.wfHistory.findMany({
      where: { instanceId },
      include: { 
        // Note: WfHistory userId references MstUser; adjust if using a join table
      },
      orderBy: { timestamp: 'desc' }
    });
  }

  /**
   * Check if user can perform action on this instance
   */
  static async canUserApprove(instanceId: number, userId: number): Promise<boolean> {
    const approval = await prisma.wfApproval.findFirst({
      where: {
        instanceId,
        userId,
        status: 'PENDING'
      }
    });
    return !!approval;
  }
}
