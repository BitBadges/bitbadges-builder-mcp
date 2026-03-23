import { z } from 'zod';
import { setStandards as setStandardsInSession, getOrCreateSession } from '../../session/sessionState.js';

export const setStandardsSchema = z.object({
  sessionId: z.string().optional().describe("Session ID for per-request isolation."),
  creatorAddress: z.string().optional(),
  standards: z.array(z.string()).describe('Standards array. Common: ["Fungible Tokens"], ["NFTs"], ["Subscriptions"], ["Smart Token"], ["Address List"], ["Custom-2FA"]. For tradable NFTs: ["NFTs", "NFTMarketplace", "NFTPricingDenom:ubadge"]. For AI vaults: ["Smart Token", "AI Agent Vault"].')
});

export type SetStandardsInput = z.infer<typeof setStandardsSchema>;

export const setStandardsTool = {
  name: 'set_standards',
  description: 'Set the standards array for the collection. Standards signal to the frontend which dedicated views to show and define structural conventions.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      sessionId: { type: 'string', description: 'Session ID.' },
      creatorAddress: { type: 'string', description: 'Creator bb1... address.' },
      standards: { type: 'array', items: { type: 'string' }, description: 'Standards array. E.g., ["Subscriptions"], ["NFTs"], ["Smart Token"].' }
    },
    required: ['standards']
  }
};

export function handleSetStandards(input: SetStandardsInput) {
  getOrCreateSession(input.sessionId, input.creatorAddress);
  setStandardsInSession(input.sessionId, input.standards);
  return { success: true, standards: input.standards };
}
