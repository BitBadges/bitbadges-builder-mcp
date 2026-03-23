import { z } from 'zod';
import { setCollectionMetadata as setCollectionMetadataInSession, getOrCreateSession } from '../../session/sessionState.js';

export const setCollectionMetadataSchema = z.object({
  sessionId: z.string().optional().describe("Session ID for per-request isolation."),
  creatorAddress: z.string().optional(),
  name: z.string().describe('Collection name. Must be specific and user-facing (e.g., "Premium Membership", "5 ATOM Monthly Subscription").'),
  description: z.string().describe('Collection description. 1-2 sentences, specific, ends with a period.'),
  image: z.string().describe('Image URL or placeholder. Use IMAGE_1, IMAGE_2 etc. if user uploaded images. Use BitBadges default logo "ipfs://QmNTpizCkY5tcMpPMf1kkn7Y5YxFQo3oT54A9oKP5ijP9E" if no image available.')
});

export type SetCollectionMetadataInput = z.infer<typeof setCollectionMetadataSchema>;

export const setCollectionMetadataTool = {
  name: 'set_collection_metadata',
  description: 'Set collection metadata (name, description, image). Auto-creates a metadata placeholder URI. Names and descriptions must be specific and user-facing.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      sessionId: { type: 'string', description: 'Session ID.' },
      creatorAddress: { type: 'string' },
      name: { type: 'string', description: 'Collection name. Specific and user-facing.' },
      description: { type: 'string', description: '1-2 sentences, ends with period.' },
      image: { type: 'string', description: 'Image URL or IMAGE_N placeholder.' }
    },
    required: ['name', 'description', 'image']
  }
};

export function handleSetCollectionMetadata(input: SetCollectionMetadataInput) {
  getOrCreateSession(input.sessionId, input.creatorAddress);
  setCollectionMetadataInSession(input.sessionId, input.name, input.description, input.image);
  return { success: true };
}
