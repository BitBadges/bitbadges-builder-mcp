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
    cosmosCoinBackedPath: z.object({
      conversion: z.object({
        sideA: z.object({
          amount: z.string().describe('Usually "1".'),
          denom: z.string().describe('The IBC denom from generate_backing_address (e.g., "ibc/...").')
        }),
        sideB: z.array(z.object({
          amount: z.string(),
          tokenIds: z.array(z.object({ start: z.string(), end: z.string() })),
          ownershipTimes: z.array(z.object({ start: z.string(), end: z.string() }))
        }))
      })
    }).optional()
      .describe('IBC backing configuration for Smart Tokens. REQUIRED for smart tokens. Contains conversion sideA/sideB.'),
    evmQueryChallenges: z.array(z.any()).optional()
      .describe('EVM query invariants. Advanced — use search_knowledge_base for details.')
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
          noCustomOwnershipTimes: { type: 'boolean', description: 'If true, all ownership times must be forever. MUST be false for subscriptions. True for most other token types.' },
          maxSupplyPerId: { type: 'string', description: 'Maximum supply per token ID. "0" = unlimited. "1" for unique NFTs.' },
          noForcefulPostMintTransfers: { type: 'boolean', description: 'If true, cannot use overridesFromOutgoingApprovals or overridesToIncomingApprovals on non-Mint approvals.' },
          disablePoolCreation: { type: 'boolean', description: 'If true, cannot create liquidity pools for this token.' },
          cosmosCoinBackedPath: {
            type: 'object',
            description: 'IBC backing configuration. REQUIRED for smart tokens. Use generate_backing_address to get the backing address.',
            properties: {
              conversion: {
                type: 'object',
                description: 'Conversion between IBC coin and token.',
                properties: {
                  sideA: {
                    type: 'object',
                    description: 'IBC coin side.',
                    properties: {
                      amount: { type: 'string', description: 'Usually "1".' },
                      denom: { type: 'string', description: 'The IBC denom from generate_backing_address (e.g., "ibc/F082B65C88E4B6D5EF1DB243CDA1D331D002759E938A0F5CD3FFDC5D53B3E349").' }
                    },
                    required: ['amount', 'denom']
                  },
                  sideB: {
                    type: 'array',
                    description: 'Token side.',
                    items: {
                      type: 'object',
                      properties: {
                        amount: { type: 'string' },
                        tokenIds: { type: 'array', items: { type: 'object', properties: { start: { type: 'string' }, end: { type: 'string' } }, required: ['start', 'end'] } },
                        ownershipTimes: { type: 'array', items: { type: 'object', properties: { start: { type: 'string' }, end: { type: 'string' } }, required: ['start', 'end'] } }
                      },
                      required: ['amount', 'tokenIds', 'ownershipTimes']
                    }
                  }
                },
                required: ['sideA', 'sideB']
              }
            },
            required: ['conversion']
          },
          evmQueryChallenges: { type: 'array', description: 'EVM query invariants. Advanced — use search_knowledge_base for details.' }
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
