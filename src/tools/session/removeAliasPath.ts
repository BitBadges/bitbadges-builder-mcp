import { z } from 'zod';
import { removeAliasPath as removeAliasPathFromSession, getOrCreateSession } from '../../session/sessionState.js';

export const removeAliasPathSchema = z.object({
  sessionId: z.string().optional().describe("Session ID for per-request isolation."),
  creatorAddress: z.string().optional(),
  denom: z.string().describe('Denom of the alias path to remove.')
});

export type RemoveAliasPathInput = z.infer<typeof removeAliasPathSchema>;

export const removeAliasPathTool = {
  name: 'remove_alias_path',
  description: 'Remove an alias path by denom.',
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

export function handleRemoveAliasPath(input: RemoveAliasPathInput) {
  getOrCreateSession(input.sessionId, input.creatorAddress);
  const result = removeAliasPathFromSession(input.sessionId, input.denom);
  return { success: result.removed, ...result };
}
