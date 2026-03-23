import { z } from 'zod';
import { removeCosmosWrapperPath as removeCosmosWrapperPathFromSession, getOrCreateSession } from '../../session/sessionState.js';

export const removeCosmosWrapperPathSchema = z.object({
  sessionId: z.string().optional().describe("Session ID for per-request isolation."),
  creatorAddress: z.string().optional(),
  denom: z.string().describe('Denom of the wrapper path to remove.')
});

export type RemoveCosmosWrapperPathInput = z.infer<typeof removeCosmosWrapperPathSchema>;

export const removeCosmosWrapperPathTool = {
  name: 'remove_cosmos_wrapper_path',
  description: 'Remove a Cosmos wrapper path by denom.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      sessionId: { type: 'string', description: 'Session ID.' },
      creatorAddress: { type: 'string' },
      denom: { type: 'string', description: 'Denom to remove.' }
    },
    required: ['denom']
  }
};

export function handleRemoveCosmosWrapperPath(input: RemoveCosmosWrapperPathInput) {
  getOrCreateSession(input.sessionId, input.creatorAddress);
  const result = removeCosmosWrapperPathFromSession(input.sessionId, input.denom);
  return { success: result.removed, ...result };
}
