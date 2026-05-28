import { Router } from 'express';
import { WorkflowEngine } from '../services/workflowService';

const router = Router();

/**
 * Get the current workflow state for a specific document
 * Used by UI to determine field-level security, available actions, and current approvers
 */
router.get('/state/:entityType/:entityId', async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const status = await WorkflowEngine.getWorkflowStatus(entityType as string, parseInt(entityId as string));
    
    if (!status) {
      return res.json({ message: 'No workflow found for this document', stage: 'NONE', status: 'ACTIVE' });
    }
    
    res.json(status);
  } catch (error: any) {
    console.error("Workflow Error:", error.message);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

/**
 * Process an action (APPROVE/REJECT)
 * documentData is used for condition evaluation
 */
router.post('/action', async (req, res) => {
  try {
    const { instanceId, action, userId, comments, documentData } = req.body;
    
    // Check if user has permission to approve
    const canApprove = await WorkflowEngine.canUserApprove(instanceId, userId);
    if (!canApprove) {
      return res.status(403).json({ error: 'You are not authorized to approve this document' });
    }
    
    const result = await WorkflowEngine.processAction(instanceId, action, userId, comments, documentData);
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error("Workflow Error:", error.message);
    res.status(400).json({ error: error.message || 'Action failed' });
  }
});

/**
 * Get current pending approvers for a workflow instance
 */
router.get('/approvers/:instanceId', async (req, res) => {
  try {
    const { instanceId } = req.params;
    const approvers = await WorkflowEngine.getCurrentApprovers(parseInt(instanceId as string));
    res.json(approvers);
  } catch (error: any) {
    console.error("Workflow Error:", error.message);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

/**
 * Get workflow history for an instance
 */
router.get('/history/:instanceId', async (req, res) => {
  try {
    const { instanceId } = req.params;
    const history = await WorkflowEngine.getWorkflowHistory(parseInt(instanceId as string));
    res.json(history);
  } catch (error: any) {
    console.error("Workflow Error:", error.message);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

/**
 * Check if current user can approve an instance
 */
router.post('/can-approve', async (req, res) => {
  try {
    const { instanceId, userId } = req.body;
    const canApprove = await WorkflowEngine.canUserApprove(instanceId, userId);
    res.json({ canApprove });
  } catch (error: any) {
    console.error("Workflow Error:", error.message);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

export default router;
