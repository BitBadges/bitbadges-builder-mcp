/**
 * Tool: build_smart_token
 * Thin wrapper over build_token for IBC-backed smart tokens.
 * Preserved for backwards compatibility.
 */

import { z } from 'zod';
import { handleBuildToken } from './buildToken.js';

export const buildSmartTokenSchema = z.object({
  ibcDenom: z.string().describe('IBC denom (e.g., "USDC" or "ibc/F082B65...")'),
  creatorAddress: z.string().describe('Creator/manager address (bb1...)'),
  name: z.string().describe('Collection name (e.g., "Wrapped USDC")'),
  symbol: z.string().describe('Token symbol (e.g., "wUSDC")'),
  description: z.string().optional().describe('Collection description (1-2 sentences, end with period)'),
  imageUrl: z.string().optional().describe('Image URL for collection and token metadata'),
  dailyWithdrawLimit: z.string().optional().describe('Daily withdrawal limit in base units'),
  totalWithdrawLimit: z.string().optional().describe('Total withdrawal limit in base units'),
  requires2FA: z.boolean().optional().describe('Whether 2FA is required'),
  twoFACollectionId: z.string().optional().describe('Collection ID for 2FA tokens'),
  transferable: z.boolean().optional().describe('Allow peer-to-peer transfers between users (default true). Set false for strict deposit/withdraw-only vaults.'),
  swappable: z.boolean().optional().describe('Enable liquidity pool trading'),
  immutable: z.boolean().optional().describe('Lock all permissions')
});

export type BuildSmartTokenInput = z.infer<typeof buildSmartTokenSchema>;

export interface MetadataPlaceholder {
  name: string;
  description: string;
  image: string;
}

export interface BuildSmartTokenResult {
  success: boolean;
  transaction?: {
    messages: unknown[];
    metadataPlaceholders?: Record<string, MetadataPlaceholder>;
  };
  summary?: {
    ibcDenom: string;
    backingAddress: string;
    symbol: string;
    decimals: number;
    features: string[];
  };
  nextSteps?: string;
  error?: string;
}

export const buildSmartTokenTool = {
  name: 'build_smart_token',
  description: 'Build IBC-backed smart token (stablecoin, wrapped asset). Returns complete MsgUniversalUpdateCollection JSON with metadataPlaceholders for 1:1 backed tokens.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      ibcDenom: { type: 'string', description: 'Token symbol (e.g., "USDC", "ATOM") or IBC denom (e.g., "ibc/F082B65...")' },
      creatorAddress: { type: 'string', description: 'Creator/manager address (bb1...)' },
      name: { type: 'string', description: 'Collection name (e.g., "Wrapped USDC")' },
      symbol: { type: 'string', description: 'Token symbol for alias path (e.g., "wUSDC")' },
      description: { type: 'string', description: 'Collection description (1-2 sentences, end with period)' },
      imageUrl: { type: 'string', description: 'Image URL for collection and token metadata (IPFS or HTTP)' },
      dailyWithdrawLimit: { type: 'string', description: 'Daily withdrawal limit in base units (e.g., "100000000" for 100 USDC)' },
      totalWithdrawLimit: { type: 'string', description: 'Total withdrawal limit in base units' },
      requires2FA: { type: 'boolean', description: 'Whether 2FA is required for withdrawals' },
      twoFACollectionId: { type: 'string', description: 'Collection ID for 2FA tokens (required if requires2FA is true)' },
      transferable: { type: 'boolean', description: 'Allow peer-to-peer transfers between users (default true).' },
      swappable: { type: 'boolean', description: 'Enable liquidity pool trading' },
      immutable: { type: 'boolean', description: 'Lock all permissions (fully immutable)' }
    },
    required: ['ibcDenom', 'creatorAddress', 'name', 'symbol']
  }
};

export function handleBuildSmartToken(input: BuildSmartTokenInput): BuildSmartTokenResult {
  const transferable = input.transferable !== false;

  const result = handleBuildToken({
    creatorAddress: input.creatorAddress,
    name: input.name,
    symbol: input.symbol,
    description: input.description,
    imageUrl: input.imageUrl,
    supply: 'single-fungible',
    minting: {
      type: 'ibc-backed',
      ibcDenom: input.ibcDenom,
      dailyWithdrawLimit: input.dailyWithdrawLimit,
      totalWithdrawLimit: input.totalWithdrawLimit,
      requires2FA: input.requires2FA,
      twoFACollectionId: input.twoFACollectionId
    },
    transferability: transferable ? 'free' : 'non-transferable',
    timeBehavior: 'permanent',
    permissions: input.immutable ? 'immutable' : 'locked-approvals',
    trading: input.swappable ? { swappable: true } : undefined
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  // Map back to legacy result format
  return {
    success: true,
    transaction: result.transaction,
    summary: result.designSummary ? {
      ibcDenom: input.ibcDenom,
      backingAddress: '', // Caller can get this from generate_backing_address
      symbol: input.symbol,
      decimals: 0,
      features: result.designSummary.features
    } : undefined,
    nextSteps: result.nextSteps
  };
}
