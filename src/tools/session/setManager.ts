import { z } from 'zod';
import { setManager as setManagerInSession, getOrCreateSession } from '../../session/sessionState.js';
import { ensureBb1 } from '../../sdk/addressUtils.js';

export const setManagerSchema = z.object({
  sessionId: z.string().optional().describe("Session ID for per-request isolation."),
  creatorAddress: z.string().optional(),
  manager: z.string().describe('Manager address (bb1... or 0x...). Defaults to creator. Controls collection updates within permission bounds.')
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
      manager: { type: 'string', description: 'Manager address (bb1... or 0x...).' }
    },
    required: ['manager']
  }
};

export function handleSetManager(input: SetManagerInput) {
  const creatorAddress = input.creatorAddress ? ensureBb1(input.creatorAddress) : input.creatorAddress;
  const manager = ensureBb1(input.manager);
  getOrCreateSession(input.sessionId, creatorAddress);
  setManagerInSession(input.sessionId, manager);
  return { success: true, manager };
}
