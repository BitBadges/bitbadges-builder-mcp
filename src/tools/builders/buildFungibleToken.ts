/**
 * Tool: build_fungible_token
 * Thin wrapper over build_token for ERC-20 style fungible tokens.
 * Preserved for backwards compatibility.
 */

import { z } from 'zod';
import { handleBuildToken } from './buildToken.js';

export const buildFungibleTokenSchema = z.object({
  creatorAddress: z.string().describe('Creator/manager address (bb1... or 0x...)'),
  name: z.string().describe('Token name'),
  symbol: z.string().describe('Token symbol'),
  description: z.string().optional().describe('Token description'),
  totalSupply: z.string().optional().describe('Total supply (optional, 0 for unlimited)'),
  mintPrice: z.string().optional().describe('Mint price in base units'),
  mintPriceDenom: z.string().optional().describe('Mint price denomination'),
  maxPerUser: z.string().optional().describe('Maximum tokens per user'),
  transferable: z.boolean().optional().describe('Whether tokens can be transferred'),
  swappable: z.boolean().optional().describe('Enable liquidity pool trading'),
  decimals: z.string().optional().describe('Token decimals (default 9)')
});

export type BuildFungibleTokenInput = z.infer<typeof buildFungibleTokenSchema>;

export interface BuildFungibleTokenResult {
  success: boolean;
  transaction?: {
    messages: unknown[];
  };
  summary?: {
    symbol: string;
    decimals: string;
    features: string[];
  };
  nextSteps?: string;
  error?: string;
}

export const buildFungibleTokenTool = {
  name: 'build_fungible_token',
  description: 'Build ERC-20 style fungible token. Returns complete MsgUniversalUpdateCollection JSON.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      creatorAddress: { type: 'string', description: 'Creator/manager address (bb1...)' },
      name: { type: 'string', description: 'Token name' },
      symbol: { type: 'string', description: 'Token symbol' },
      description: { type: 'string', description: 'Token description' },
      totalSupply: { type: 'string', description: 'Total supply (optional, "0" for unlimited)' },
      mintPrice: { type: 'string', description: 'Mint price in base units (e.g., "5000000000" for 5 BADGE)' },
      mintPriceDenom: { type: 'string', description: 'Mint price denomination (e.g., "ubadge")' },
      maxPerUser: { type: 'string', description: 'Maximum tokens per user' },
      transferable: { type: 'boolean', description: 'Whether tokens can be transferred (default true)' },
      swappable: { type: 'boolean', description: 'Enable liquidity pool trading' },
      decimals: { type: 'string', description: 'Token decimals (default "9")' }
    },
    required: ['creatorAddress', 'name', 'symbol']
  }
};

export function handleBuildFungibleToken(input: BuildFungibleTokenInput): BuildFungibleTokenResult {
  const transferable = input.transferable !== false;
  const decimals = input.decimals || '9';

  const result = handleBuildToken({
    creatorAddress: input.creatorAddress,
    name: input.name,
    symbol: input.symbol,
    description: input.description,
    decimals,
    supply: 'single-fungible',
    minting: {
      type: 'public',
      price: input.mintPrice,
      priceDenom: input.mintPriceDenom,
      maxPerUser: input.maxPerUser,
      totalSupply: input.totalSupply
    },
    transferability: transferable ? 'free' : 'non-transferable',
    timeBehavior: 'permanent',
    permissions: 'locked-approvals',
    trading: input.swappable ? { swappable: true } : undefined
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return {
    success: true,
    transaction: result.transaction ? { messages: result.transaction.messages } : undefined,
    summary: result.designSummary ? {
      symbol: input.symbol,
      decimals,
      features: result.designSummary.features
    } : undefined,
    nextSteps: result.nextSteps
  };
}
