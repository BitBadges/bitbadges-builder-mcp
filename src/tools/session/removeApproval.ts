import { z } from 'zod';
import { removeApproval as removeApprovalFromSession, getOrCreateSession } from '../../session/sessionState.js';

export const removeApprovalSchema = z.object({
  sessionId: z.string().optional().describe("Session ID for per-request isolation."),
  creatorAddress: z.string().optional(),
  approvalId: z.string().describe('The approvalId to remove.')
});

export type RemoveApprovalInput = z.infer<typeof removeApprovalSchema>;

export const removeApprovalTool = {
  name: 'remove_approval',
  description: 'Remove an approval by approvalId. To replace an approval, remove then re-add with the same approvalId — it will be inserted at the same position (order preserved).',
  inputSchema: {
    type: 'object' as const,
    properties: {
      sessionId: { type: 'string', description: 'Session ID.' },
      creatorAddress: { type: 'string' },
      approvalId: { type: 'string', description: 'The approvalId to remove.' }
    },
    required: ['approvalId']
  }
};

export function handleRemoveApproval(input: RemoveApprovalInput) {
  getOrCreateSession(input.sessionId, input.creatorAddress);
  const result = removeApprovalFromSession(input.sessionId, input.approvalId);
  return { success: result.removed, ...result };
}
