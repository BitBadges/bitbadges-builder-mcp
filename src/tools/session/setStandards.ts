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
      creatorAddress: { type: 'string', description: 'Creator address (bb1... or 0x...).' },
      standards: { type: 'array', items: { type: 'string' }, description: 'Standards array. E.g., ["Subscriptions"], ["NFTs"], ["Smart Token"].' }
    },
    required: ['standards']
  }
};

const KNOWN_STANDARDS = new Set([
  'Subscriptions', 'Quests', 'Products', 'IBC Token Factory', 'Smart Token',
  'Credit Token', 'Custom-2FA', 'Address List', 'Fungible Tokens', 'NFTs',
  'NFTMarketplace', 'Tradable', 'Liquidity Pools', 'Non-Transferable',
  'No User Ownership', 'AI Agent Vault', 'AI Agent Stablecoin',
  'Leaderboard', 'Milestones', 'Invoices', '1 of 1', 'Issuer-Controlled Tokens'
]);

export function handleSetStandards(input: SetStandardsInput) {
  getOrCreateSession(input.sessionId, input.creatorAddress);

  // Warn about unknown standards (non-blocking — custom standards are allowed)
  const warnings: string[] = [];
  for (const std of input.standards) {
    // Skip dynamic standards like ListView:*, NFTPricingDenom:*, DefaultDisplayCurrency:*
    if (std.includes(':')) continue;
    if (!KNOWN_STANDARDS.has(std)) {
      warnings.push(`"${std}" is not a recognized standard. Check for typos.`);
    }
  }

  setStandardsInSession(input.sessionId, input.standards);
  return {
    success: true,
    standards: input.standards,
    ...(warnings.length > 0 ? { warnings } : {})
  };
}
