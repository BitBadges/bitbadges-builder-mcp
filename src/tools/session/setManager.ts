import { z } from 'zod';
import { setManager as setManagerInSession, getOrCreateSession } from '../../session/sessionState.js';

export const setManagerSchema = z.object({
  sessionId: z.string().optional().describe("Session ID for per-request isolation."),
  creatorAddress: z.string().optional(),
  manager: z.string().describe('Manager bb1... address. Defaults to creator. Controls collection updates within permission bounds.')
});

export type SetManagerInput = z.infer<typeof setManagerSchema>;

export const setManagerTool = {
  name: 'set_manager',
  description: 'Set the collection manager address. Manager controls collection updates within permission bounds. Defaults to creator address.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      sessionId: { type: 'string', description: 'Session ID.' },
      creatorAddress: { type: 'string' },
      manager: { type: 'string', description: 'Manager bb1... address.' }
    },
    required: ['manager']
  }
};

export function handleSetManager(input: SetManagerInput) {
  getOrCreateSession(input.sessionId, input.creatorAddress);
  setManagerInSession(input.sessionId, input.manager);
  return { success: true, manager: input.manager };
}
