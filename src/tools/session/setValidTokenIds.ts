import { z } from 'zod';
import { setValidTokenIds as setValidTokenIdsInSession, getOrCreateSession } from '../../session/sessionState.js';

export const setValidTokenIdsSchema = z.object({
  sessionId: z.string().optional().describe("Session ID for per-request isolation."),
  creatorAddress: z.string().optional(),
  tokenIds: z.array(z.object({
    start: z.string().describe('Start token ID as string.'),
    end: z.string().describe('End token ID as string.')
  })).describe('Valid token ID ranges. Fungible: [{"start":"1","end":"1"}]. NFTs (100): [{"start":"1","end":"100"}]. Subscriptions: [{"start":"1","end":"1"}].')
});

export type SetValidTokenIdsInput = z.infer<typeof setValidTokenIdsSchema>;

export const setValidTokenIdsTool = {
  name: 'set_valid_token_ids',
  description: 'Set the valid token ID ranges for the collection. Defines which token IDs can exist. Fungible tokens and subscriptions use a single ID; NFTs use a range.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      sessionId: { type: 'string', description: 'Session ID.' },
      creatorAddress: { type: 'string' },
      tokenIds: { type: 'array', items: { type: 'object', properties: { start: { type: 'string' }, end: { type: 'string' } }, required: ['start', 'end'] } }
    },
    required: ['tokenIds']
  }
};

export function handleSetValidTokenIds(input: SetValidTokenIdsInput) {
  getOrCreateSession(input.sessionId, input.creatorAddress);
  setValidTokenIdsInSession(input.sessionId, input.tokenIds);
  return { success: true, tokenIds: input.tokenIds };
}
