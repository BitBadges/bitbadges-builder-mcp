import { z } from 'zod';
import { setInvariants as setInvariantsInSession, getOrCreateSession } from '../../session/sessionState.js';

export const setInvariantsSchema = z.object({
  sessionId: z.string().optional().describe("Session ID for per-request isolation."),
  creatorAddress: z.string().optional(),
  invariants: z.object({
    noCustomOwnershipTimes: z.boolean().optional()
      .describe('If true, all ownership times must be forever. Set false for subscriptions (they use time-dependent ownership). Most other token types set true.'),
    maxSupplyPerId: z.string().optional()
      .describe('Maximum supply per token ID. "0" = unlimited. "1" for unique NFTs.'),
    noForcefulPostMintTransfers: z.boolean().optional()
      .describe('If true, cannot use overridesFromOutgoingApprovals or overridesToIncomingApprovals on non-Mint approvals.'),
    disablePoolCreation: z.boolean().optional()
      .describe('If true, cannot create liquidity pools for this token.'),
    cosmosCoinBackedPath: z.any().optional()
      .describe('IBC backing configuration for Smart Tokens. REQUIRED for smart tokens. Contains conversion sideA/sideB.')
  }).nullable().describe('Collection invariants. Cannot be removed after creation. Use null to explicitly clear. Skill instructions specify which invariants each standard requires.')
});

export type SetInvariantsInput = z.infer<typeof setInvariantsSchema>;

export const setInvariantsTool = {
  name: 'set_invariants',
  description: 'Set collection invariants (on-chain constraints). Cannot be removed after creation. Key: noCustomOwnershipTimes (false for subscriptions, true for most others), maxSupplyPerId, cosmosCoinBackedPath (required for smart tokens).',
  inputSchema: {
    type: 'object' as const,
    properties: {
      sessionId: { type: 'string', description: 'Session ID.' },
      creatorAddress: { type: 'string' },
      invariants: {
        type: 'object',
        nullable: true,
        description: 'Invariants object or null to clear.',
        properties: {
          noCustomOwnershipTimes: { type: 'boolean', description: 'True for most tokens. False for subscriptions.' },
          maxSupplyPerId: { type: 'string', description: '"0" = unlimited. "1" for unique NFTs.' },
          noForcefulPostMintTransfers: { type: 'boolean' },
          disablePoolCreation: { type: 'boolean' },
          cosmosCoinBackedPath: { type: 'object', description: 'Required for smart tokens. Contains conversion sideA/sideB.' }
        }
      }
    },
    required: ['invariants']
  }
};

export function handleSetInvariants(input: SetInvariantsInput) {
  getOrCreateSession(input.sessionId, input.creatorAddress);
  setInvariantsInSession(input.sessionId, input.invariants);
  return { success: true };
}
