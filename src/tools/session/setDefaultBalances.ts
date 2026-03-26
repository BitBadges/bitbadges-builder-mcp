import { z } from 'zod';
import { setDefaultBalances as setDefaultBalancesInSession, getOrCreateSession } from '../../session/sessionState.js';

export const setDefaultBalancesSchema = z.object({
  sessionId: z.string().optional().describe("Session ID for per-request isolation."),
  creatorAddress: z.string().optional(),
  defaultBalances: z.object({
    balances: z.array(z.object({
      amount: z.string(),
      tokenIds: z.array(z.object({ start: z.string(), end: z.string() })),
      ownershipTimes: z.array(z.object({ start: z.string(), end: z.string() })).optional()
    })).optional().default([]).describe('Default token balances for new users. Almost always empty [].'),
    outgoingApprovals: z.array(z.record(z.any())).optional().default([]).describe('Default outgoing approvals. Almost always empty [].'),
    incomingApprovals: z.array(z.record(z.any())).optional().default([]).describe('Default incoming approvals. Almost always empty [].'),
    autoApproveAllIncomingTransfers: z.boolean().optional().default(true)
      .describe('CRITICAL: Must be true for any collection with mint approvals. Without this, recipients cannot receive tokens. #1 deployment bug.'),
    autoApproveSelfInitiatedOutgoingTransfers: z.boolean().optional().default(true)
      .describe('Allow users to send tokens they initiate. Almost always true.'),
    autoApproveSelfInitiatedIncomingTransfers: z.boolean().optional().default(true)
      .describe('Allow users to receive tokens they initiate. Almost always true.'),
    userPermissions: z.record(z.any()).optional().default({}).describe('Default user-level permissions. Almost always empty {}.')
  }).describe('In almost all cases: empty balances, empty approvals, all auto-approve flags true. Rarely needs customization.')
});

export type SetDefaultBalancesInput = z.infer<typeof setDefaultBalancesSchema>;

export const setDefaultBalancesTool = {
  name: 'set_default_balances',
  description: 'Set default balances for all users. In almost all cases, use empty balances/approvals with all auto-approve flags true. autoApproveAllIncomingTransfers MUST be true for any collection with mint approvals.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      sessionId: { type: 'string', description: 'Session ID.' },
      creatorAddress: { type: 'string' },
      defaultBalances: {
        type: 'object',
        description: 'Default balances config. Almost always: empty arrays + all auto-approve true.',
        properties: {
          balances: {
            type: 'array',
            description: 'Default token balances for new users. Almost always empty [].',
            items: {
              type: 'object',
              properties: {
                amount: { type: 'string', description: 'Amount as string.' },
                tokenIds: { type: 'array', items: { type: 'object', properties: { start: { type: 'string' }, end: { type: 'string' } }, required: ['start', 'end'] } },
                ownershipTimes: { type: 'array', items: { type: 'object', properties: { start: { type: 'string' }, end: { type: 'string' } }, required: ['start', 'end'] } }
              },
              required: ['amount', 'tokenIds']
            }
          },
          outgoingApprovals: { type: 'array', description: 'Default outgoing transfer approvals. Almost always empty [].', items: { type: 'object' } },
          incomingApprovals: { type: 'array', description: 'Default incoming transfer approvals. Almost always empty [].', items: { type: 'object' } },
          autoApproveAllIncomingTransfers: { type: 'boolean', description: 'CRITICAL: MUST be true for any collection with mint approvals. Without this, recipients cannot receive tokens.' },
          autoApproveSelfInitiatedOutgoingTransfers: { type: 'boolean', description: 'Allow users to send tokens they initiate. Almost always true.' },
          autoApproveSelfInitiatedIncomingTransfers: { type: 'boolean', description: 'Allow users to receive tokens they initiate. Almost always true.' },
          userPermissions: {
            type: 'object',
            description: 'Default user-level permissions. Almost always empty {}. Auto-filled by session state. Keys: canUpdateOutgoingApprovals, canUpdateIncomingApprovals, canUpdateAutoApproveSelfInitiatedOutgoingTransfers, canUpdateAutoApproveSelfInitiatedIncomingTransfers, canUpdateAutoApproveAllIncomingTransfers. Values: permission arrays ([] = neutral).'
          }
        }
      }
    },
    required: ['defaultBalances']
  }
};

export function handleSetDefaultBalances(input: SetDefaultBalancesInput) {
  getOrCreateSession(input.sessionId, input.creatorAddress);
  setDefaultBalancesInSession(input.sessionId, input.defaultBalances);
  return { success: true };
}
