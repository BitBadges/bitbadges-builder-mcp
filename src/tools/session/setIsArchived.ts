import { z } from 'zod';
import { setIsArchived as setIsArchivedInSession, getOrCreateSession } from '../../session/sessionState.js';

export const setIsArchivedSchema = z.object({
  sessionId: z.string().optional().describe("Session ID for per-request isolation."),
  creatorAddress: z.string().optional(),
  isArchived: z.boolean().describe('Whether the collection should be archived (true) or unarchived (false).')
});

export const setIsArchivedTool = {
  name: 'set_is_archived',
  description: 'Archive or unarchive a collection. Archived collections are hidden from browsing but still exist on-chain.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      sessionId: { type: 'string', description: 'Session ID.' },
      creatorAddress: { type: 'string' },
      isArchived: { type: 'boolean', description: 'true to archive, false to unarchive.' }
    },
    required: ['isArchived']
  }
};

export function handleSetIsArchived(input: z.infer<typeof setIsArchivedSchema>) {
  getOrCreateSession(input.sessionId, input.creatorAddress);
  setIsArchivedInSession(input.sessionId, input.isArchived);
  return { success: true };
}
