import { z } from 'zod';
import { setApprovalMetadata as setApprovalMetadataInSession, getOrCreateSession } from '../../session/sessionState.js';

export const setApprovalMetadataSchema = z.object({
  sessionId: z.string().optional().describe("Session ID for per-request isolation."),
  creatorAddress: z.string().optional(),
  approvalId: z.string().describe('The approvalId to set metadata for.'),
  name: z.string().describe('Approval name. Descriptive (e.g., "Public Mint", "Monthly Subscription").'),
  description: z.string().describe('What this approval does. 1-2 sentences, ends with period.')
});

export type SetApprovalMetadataInput = z.infer<typeof setApprovalMetadataSchema>;

export const setApprovalMetadataTool = {
  name: 'set_approval_metadata',
  description: 'Set metadata for an approval. Image is always empty string for approvals. Call this after add_approval to set descriptive names.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      sessionId: { type: 'string', description: 'Session ID.' },
      creatorAddress: { type: 'string' },
      approvalId: { type: 'string', description: 'Approval ID to set metadata for.' },
      name: { type: 'string', description: 'Approval name.' },
      description: { type: 'string', description: 'What this approval does.' }
    },
    required: ['approvalId', 'name', 'description']
  }
};

export function handleSetApprovalMetadata(input: SetApprovalMetadataInput) {
  getOrCreateSession(input.sessionId, input.creatorAddress);
  setApprovalMetadataInSession(input.sessionId, input.approvalId, input.name, input.description, '');
  return { success: true };
}
