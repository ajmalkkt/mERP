import { useState, useEffect } from 'react';
import axios from 'axios';

interface WorkflowState {
  id?: number;
  instanceId?: number;
  stage: string;
  status: string;
  availableActions: Array<{
    action: string;
    toStage: string;
    requiresCondition: boolean;
  }>;
  fieldSecurity: {
    allowEdit: boolean;
    readOnlyFields: string[];
  };
  history?: Array<{
    action: string;
    userId: number;
    comments?: string;
    timestamp: string;
  }>;
}

interface WorkflowApprovalPanelProps {
  entityType: string;
  entityId: number;
  userId: number;
  onStateChange?: (state: WorkflowState) => void;
  disabled?: boolean;
}

export function WorkflowApprovalPanel({
  entityType,
  entityId,
  userId,
  onStateChange,
  disabled = false
}: WorkflowApprovalPanelProps) {
  const [workflowState, setWorkflowState] = useState<WorkflowState | null>(null);
  const [currentApprovers, setCurrentApprovers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [canApprove, setCanApprove] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch workflow state
  useEffect(() => {
    fetchWorkflowState();
  }, [entityType, entityId]);

  // Check if user can approve
  useEffect(() => {
    if (workflowState?.status === 'IN_PROGRESS') {
      checkUserApprovalPermission();
    }
  }, [workflowState, userId]);

  const fetchWorkflowState = async () => {
    try {
      setLoading(true);
      setError(null);

      const stateRes = await axios.get(
        `http://localhost:5000/api/workflow/state/${entityType}/${entityId}`
      );

      if (stateRes.data) {
        setWorkflowState(stateRes.data);
        onStateChange?.(stateRes.data);

        // Fetch current approvers if in progress
        if (stateRes.data.status === 'IN_PROGRESS' && stateRes.data.instanceId) {
          const approversRes = await axios.get(
            `http://localhost:5000/api/workflow/approvers/${stateRes.data.instanceId}`
          );
          setCurrentApprovers(approversRes.data);
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch workflow state:', err);
      setError('Unable to load workflow state');
    } finally {
      setLoading(false);
    }
  };

  const checkUserApprovalPermission = async () => {
    if (!workflowState?.instanceId) return;

    try {
      const res = await axios.post(
        'http://localhost:5000/api/workflow/can-approve',
        {
          instanceId: workflowState.instanceId,
          userId
        }
      );
      setCanApprove(res.data.canApprove);
    } catch (err) {
      console.error('Failed to check approval permission:', err);
      setCanApprove(false);
    }
  };

  const handleApprovalAction = async (selectedAction: string) => {
    if (!workflowState?.instanceId) {
      setError('No workflow instance found');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      await axios.post(
        'http://localhost:5000/api/workflow/action',
        {
          instanceId: workflowState.instanceId,
          action: selectedAction,
          userId,
          comments: comments || undefined
        }
      );

      setSuccess(`Action "${selectedAction}" completed successfully`);
      setComments('');

      // Refresh workflow state
      setTimeout(() => {
        fetchWorkflowState();
      }, 1000);
    } catch (err: any) {
      console.error('Approval action failed:', err);
      setError(
        err.response?.data?.error || 'Failed to process approval action'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
        <div className="flex items-center justify-center py-8">
          <div className="text-slate-500">Loading workflow state...</div>
        </div>
      </div>
    );
  }

  if (!workflowState) {
    return (
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
        <div className="text-slate-500">No workflow configured for this document</div>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    'IN_PROGRESS': 'bg-blue-50 border-blue-200',
    'COMPLETED': 'bg-green-50 border-green-200',
    'REJECTED': 'bg-red-50 border-red-200'
  };

  const statusBadgeColors: Record<string, string> = {
    'IN_PROGRESS': 'bg-blue-100 text-blue-800',
    'COMPLETED': 'bg-green-100 text-green-800',
    'REJECTED': 'bg-red-100 text-red-800'
  };

  return (
    <div className={`border rounded-lg shadow-sm ${statusColors[workflowState.status] || 'bg-white border-slate-200'}`}>
      {/* Header */}
      <div className="bg-white border-b border-inherit px-6 py-4 flex justify-between items-center">
        <div>
          <h3 className="font-bold text-lg text-slate-800">Workflow Status</h3>
          <p className="text-sm text-slate-500 mt-1">Current Stage: <span className="font-semibold">{workflowState.stage || 'N/A'}</span></p>
        </div>
        <div className={`px-3 py-2 rounded-full text-sm font-medium ${statusBadgeColors[workflowState.status]}`}>
          {workflowState.status}
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="px-6 pt-4 pb-0">
          <div className="bg-red-50 border border-red-200 px-4 py-3 rounded-md text-red-800 text-sm flex items-center gap-2">
            <span className="text-lg">⚠️</span>
            {error}
          </div>
        </div>
      )}

      {success && (
        <div className="px-6 pt-4 pb-0">
          <div className="bg-green-50 border border-green-200 px-4 py-3 rounded-md text-green-800 text-sm flex items-center gap-2">
            <span className="text-lg">✅</span>
            {success}
          </div>
        </div>
      )}

      <div className="px-6 py-4 space-y-6">
        {/* Field Security Info */}
        <div className="bg-amber-50 border border-amber-200 px-4 py-3 rounded-md text-sm text-amber-800">
          <strong>Field Security:</strong> {workflowState.fieldSecurity?.allowEdit ? '✏️ Editable' : '🔒 Read-Only'}
        </div>

        {/* Current Approvers */}
        {workflowState.status === 'IN_PROGRESS' && currentApprovers.length > 0 && (
          <div>
            <h4 className="font-semibold text-slate-700 mb-3 text-sm">Pending Approvers</h4>
            <div className="space-y-2">
              {currentApprovers.map((approver: any, idx: number) => (
                <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 rounded-md border border-slate-200">
                  <div className="w-8 h-8 rounded-full bg-slate-300 flex items-center justify-center text-sm font-semibold text-slate-700">
                    {approver.user?.name?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div>
                    <div className="font-medium text-slate-800 text-sm">{approver.user?.name || 'Unknown'}</div>
                    <div className="text-xs text-slate-500">{approver.user?.username || approver.user?.email || 'N/A'}</div>
                  </div>
                  <div className="ml-auto px-2 py-1 bg-amber-100 text-amber-800 rounded text-xs font-medium">
                    Pending
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Available Actions */}
        {canApprove && !disabled && workflowState.availableActions && workflowState.availableActions.length > 0 && (
          <div>
            <h4 className="font-semibold text-slate-700 mb-3 text-sm">Actions</h4>
            
            {/* Comments */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Comments (Optional)
              </label>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Enter any comments for this action..."
                disabled={submitting}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-merp-primary/20 disabled:bg-slate-100"
                rows={3}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              {workflowState.availableActions.map((act: any, idx: number) => (
                <button
                  key={idx}
                  onClick={() => handleApprovalAction(act.action)}
                  disabled={submitting}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                    act.action === 'APPROVE'
                      ? 'bg-green-600 hover:bg-green-700 text-white disabled:bg-green-400'
                      : 'bg-red-600 hover:bg-red-700 text-white disabled:bg-red-400'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {submitting ? `${act.action}ing...` : act.action}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* No Action Needed */}
        {!canApprove && workflowState.status === 'IN_PROGRESS' && (
          <div className="bg-blue-50 border border-blue-200 px-4 py-3 rounded-md text-blue-800 text-sm">
            ℹ️ This document is awaiting approval from another user. You don't have pending approval tasks.
          </div>
        )}

        {/* Workflow Complete */}
        {workflowState.status === 'COMPLETED' && (
          <div className="bg-green-50 border border-green-200 px-4 py-3 rounded-md text-green-800 text-sm">
            ✅ This workflow has been completed and posted.
          </div>
        )}

        {/* Workflow Rejected */}
        {workflowState.status === 'REJECTED' && (
          <div className="bg-red-50 border border-red-200 px-4 py-3 rounded-md text-red-800 text-sm">
            ❌ This document was rejected. Please review and resubmit if needed.
          </div>
        )}
      </div>

      {/* Navigation to Next Stage */}
      {workflowState.availableActions && workflowState.availableActions.length > 0 && (
        <div className="px-6 py-4 bg-slate-50 border-t border-inherit text-xs text-slate-600">
          <strong>Next Steps:</strong>
          {' '}
          {workflowState.availableActions
            .map((act: any) => `${act.action} → ${act.toStage}`)
            .join(', ')}
        </div>
      )}
    </div>
  );
}
