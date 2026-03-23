/**
 * remove_transfer — Remove a MsgTransferTokens from the session by index.
 */
import { z } from 'zod';
import { removeTransfer } from '../../session/sessionState.js';

export const removeTransferSchema = z.object({
  sessionId: z.string().optional().describe('Session ID. Omit for default session.'),
  index: z.number().int().min(1).describe('Message index to remove (1-based, since messages[0] is always the collection).')
});

export type RemoveTransferInput = z.infer<typeof removeTransferSchema>;

export const removeTransferTool = {
  name: 'remove_transfer',
  description: 'Remove a MsgTransferTokens from the session by message index. Index must be >= 1 (messages[0] is always the collection and cannot be removed).',
  inputSchema: {
    type: 'object' as const,
    properties: {
      sessionId: { type: 'string', description: 'Session ID. Omit for default session.' },
      index: { type: 'number', description: 'Message index to remove (>= 1).' }
    },
    required: ['index']
  }
};

export function handleRemoveTransfer(input: Record<string, any>): Record<string, any> {
  try {
    const parsed = removeTransferSchema.parse(input);
    const { removed } = removeTransfer(parsed.sessionId, parsed.index);

    if (!removed) {
      return { success: false, error: `No MsgTransferTokens found at messages[${parsed.index}].` };
    }

    return { success: true, note: `Removed transfer message at index ${parsed.index}.` };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
