import { z } from 'zod';
import { setCustomData as setCustomDataInSession, getOrCreateSession } from '../../session/sessionState.js';

export const setCustomDataSchema = z.object({
  sessionId: z.string().optional().describe("Session ID for per-request isolation."),
  creatorAddress: z.string().optional(),
  customData: z.string().describe('Custom data string. Can be any JSON or text. Stored on-chain.')
});

export type SetCustomDataInput = z.infer<typeof setCustomDataSchema>;

export const setCustomDataTool = {
  name: 'set_custom_data',
  description: 'Set custom data string on the collection. Can be any JSON or text, stored on-chain.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      sessionId: { type: 'string', description: 'Session ID.' },
      creatorAddress: { type: 'string' },
      customData: { type: 'string', description: 'Custom data string.' }
    },
    required: ['customData']
  }
};

export function handleSetCustomData(input: SetCustomDataInput) {
  getOrCreateSession(input.sessionId, input.creatorAddress);
  setCustomDataInSession(input.sessionId, input.customData);
  return { success: true };
}
