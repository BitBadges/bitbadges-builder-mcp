import { z } from 'zod';
import { setMintEscrowCoins as setMintEscrowCoinsInSession, getOrCreateSession } from '../../session/sessionState.js';

export const setMintEscrowCoinsSchema = z.object({
  sessionId: z.string().optional().describe("Session ID for per-request isolation."),
  creatorAddress: z.string().optional(),
  coins: z.array(z.object({
    denom: z.string().describe('Coin denomination (e.g. "ubadge", "ibc/...")'),
    amount: z.string().describe('Amount in base units')
  })).describe('Coins to transfer to the mint escrow address on collection creation. Used to fund quest rewards, escrow payouts, etc.')
});

export type SetMintEscrowCoinsInput = z.infer<typeof setMintEscrowCoinsSchema>;

export const setMintEscrowCoinsTool = {
  name: 'set_mint_escrow_coins',
  description: 'Set coins to fund the mint escrow address on collection creation. Required for quest rewards and escrow payouts where coinTransfers use overrideFromWithApproverAddress.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      sessionId: { type: 'string', description: 'Session ID.' },
      creatorAddress: { type: 'string' },
      coins: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            denom: { type: 'string', description: 'Coin denomination (e.g. "ubadge", "ibc/...")' },
            amount: { type: 'string', description: 'Amount in base units' }
          },
          required: ['denom', 'amount']
        },
        description: 'Coins to fund the escrow. For quests: rewardAmount * maxClaims.'
      }
    },
    required: ['coins']
  }
};

export function handleSetMintEscrowCoins(input: SetMintEscrowCoinsInput) {
  getOrCreateSession(input.sessionId, input.creatorAddress);
  // Handle case where AI passes coins as a JSON string instead of array
  let coins = input.coins;
  if (typeof coins === 'string') {
    try { coins = JSON.parse(coins); } catch { return { success: false, error: 'coins must be an array of {denom, amount} objects' }; }
  }

  // Chain only supports 1 escrow coin entry
  if (Array.isArray(coins) && coins.length > 1) {
    return { success: false, error: 'mintEscrowCoinsToTransfer supports at most 1 coin entry. Combine into a single denomination or use separate transactions.' };
  }

  setMintEscrowCoinsInSession(input.sessionId, coins);
  return { success: true, coins };
}
