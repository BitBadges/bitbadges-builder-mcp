/**
 * Tool: build_nft_collection
 * Thin wrapper over build_token for NFT collections.
 * Preserved for backwards compatibility.
 */

import { z } from 'zod';
import { handleBuildToken } from './buildToken.js';

export const buildNFTCollectionSchema = z.object({
  creatorAddress: z.string().describe('Creator/manager address (bb1...)'),
  name: z.string().describe('Collection name'),
  description: z.string().optional().describe('Collection description'),
  totalSupply: z.string().describe('Total number of NFTs in collection'),
  mintPrice: z.string().optional().describe('Mint price in base units'),
  mintPriceDenom: z.string().optional().describe('Mint price denomination'),
  maxPerUser: z.string().optional().describe('Maximum NFTs per user'),
  tradable: z.boolean().optional().describe('Enable marketplace trading'),
  tradingCurrency: z.string().optional().describe('Trading currency denom (default ubadge)')
});

export type BuildNFTCollectionInput = z.infer<typeof buildNFTCollectionSchema>;

export interface BuildNFTCollectionResult {
  success: boolean;
  transaction?: {
    messages: unknown[];
  };
  summary?: {
    totalSupply: string;
    features: string[];
  };
  nextSteps?: string;
  error?: string;
}

export const buildNFTCollectionTool = {
  name: 'build_nft_collection',
  description: 'Build NFT collection with minting config. Returns complete MsgUniversalUpdateCollection JSON.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      creatorAddress: { type: 'string', description: 'Creator/manager address (bb1...)' },
      name: { type: 'string', description: 'Collection name' },
      description: { type: 'string', description: 'Collection description' },
      totalSupply: { type: 'string', description: 'Total number of NFTs in collection' },
      mintPrice: { type: 'string', description: 'Mint price in base units (e.g., "5000000000" for 5 BADGE)' },
      mintPriceDenom: { type: 'string', description: 'Mint price denomination (e.g., "ubadge")' },
      maxPerUser: { type: 'string', description: 'Maximum NFTs per user' },
      tradable: { type: 'boolean', description: 'Enable marketplace trading' },
      tradingCurrency: { type: 'string', description: 'Trading currency denom (default "ubadge")' }
    },
    required: ['creatorAddress', 'name', 'totalSupply']
  }
};

export function handleBuildNFTCollection(input: BuildNFTCollectionInput): BuildNFTCollectionResult {
  const supply = parseInt(input.totalSupply, 10);
  if (isNaN(supply) || supply <= 0) {
    return { success: false, error: 'Total supply must be a positive number' };
  }

  const result = handleBuildToken({
    creatorAddress: input.creatorAddress,
    name: input.name,
    description: input.description,
    supply: { type: 'fixed-nft', count: input.totalSupply },
    minting: {
      type: 'public',
      price: input.mintPrice,
      priceDenom: input.mintPriceDenom,
      maxPerUser: input.maxPerUser,
      totalSupply: input.totalSupply
    },
    transferability: 'free',
    timeBehavior: 'permanent',
    permissions: 'locked-approvals',
    trading: input.tradable ? { tradable: true, currency: input.tradingCurrency || 'ubadge' } : undefined
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return {
    success: true,
    transaction: result.transaction ? { messages: result.transaction.messages } : undefined,
    summary: result.designSummary ? {
      totalSupply: input.totalSupply,
      features: result.designSummary.features
    } : undefined,
    nextSteps: result.nextSteps
  };
}
