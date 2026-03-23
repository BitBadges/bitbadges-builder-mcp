import { z } from 'zod';
import { setTokenMetadata as setTokenMetadataInSession, getOrCreateSession } from '../../session/sessionState.js';

export const setTokenMetadataSchema = z.object({
  sessionId: z.string().optional().describe("Session ID for per-request isolation."),
  creatorAddress: z.string().optional(),
  tokenIds: z.array(z.object({
    start: z.string(),
    end: z.string()
  })).describe('Token ID ranges this metadata applies to.'),
  name: z.string().describe('Token name. Must be specific (e.g., "Subscription Pass", "MYCOIN Token"). Do NOT use "{id}" in names.'),
  description: z.string().describe('Token description. 1-2 sentences, specific, ends with period. Do NOT use "{id}" in descriptions.'),
  image: z.string().describe('Image URL or IMAGE_N placeholder. Do NOT use "{id}" in image URLs.')
});

export type SetTokenMetadataInput = z.infer<typeof setTokenMetadataSchema>;

export const setTokenMetadataTool = {
  name: 'set_token_metadata',
  description: 'Set token metadata for specific token ID ranges. Auto-creates placeholder URI. The {id} placeholder works in the URI only (not in name/description/image fields).',
  inputSchema: {
    type: 'object' as const,
    properties: {
      sessionId: { type: 'string', description: 'Session ID.' },
      creatorAddress: { type: 'string' },
      tokenIds: { type: 'array', items: { type: 'object', properties: { start: { type: 'string' }, end: { type: 'string' } }, required: ['start', 'end'] } },
      name: { type: 'string', description: 'Token name. No {id} placeholder.' },
      description: { type: 'string', description: 'Token description. No {id} placeholder.' },
      image: { type: 'string', description: 'Image URL. No {id} placeholder.' }
    },
    required: ['tokenIds', 'name', 'description', 'image']
  }
};

export function handleSetTokenMetadata(input: SetTokenMetadataInput) {
  getOrCreateSession(input.sessionId, input.creatorAddress);
  setTokenMetadataInSession(input.sessionId, input.tokenIds, input.name, input.description, input.image);
  return { success: true };
}
