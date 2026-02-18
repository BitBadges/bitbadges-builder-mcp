/**
 * Tool: generate_alias_path
 * Build alias path for liquidity pools and token display
 */

import { z } from 'zod';

const MAX_UINT64 = '18446744073709551615';
const FOREVER_TIMES = [{ start: '1', end: MAX_UINT64 }];

export const generateAliasPathSchema = z.object({
  symbol: z.string().describe('Display symbol (e.g., "wUSDC", "vATOM")'),
  decimals: z.string().describe('Number of decimals (e.g., "6" for USDC, "9" for BADGE)'),
  tokenId: z.string().optional().describe('Token ID for conversion (defaults to "1")'),
  metadataUri: z.string().optional().describe('IPFS URI for metadata'),
  name: z.string().optional().describe('Display name for the token'),
  description: z.string().optional().describe('Description for the token')
});

export type GenerateAliasPathInput = z.infer<typeof generateAliasPathSchema>;

export interface AliasPath {
  denom: string;
  symbol: string;
  conversion: {
    sideA: { amount: string };
    sideB: Array<{
      amount: string;
      tokenIds: Array<{ start: string; end: string }>;
      ownershipTimes: Array<{ start: string; end: string }>;
    }>;
  };
  denomUnits: Array<{
    decimals: string;
    symbol: string;
    isDefaultDisplay: boolean;
    metadata: { uri: string; customData: string };
  }>;
  metadata: { uri: string; customData: string };
}

export interface GenerateAliasPathResult {
  success: boolean;
  aliasPath?: AliasPath;
  error?: string;
}

export const generateAliasPathTool = {
  name: 'generate_alias_path',
  description: 'Build alias path for liquidity pools and token display. Creates properly formatted alias path for swappable tokens.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      symbol: {
        type: 'string',
        description: 'Display symbol (e.g., "wUSDC", "vATOM")'
      },
      decimals: {
        type: 'string',
        description: 'Number of decimals (e.g., "6" for USDC, "9" for BADGE)'
      },
      tokenId: {
        type: 'string',
        description: 'Token ID for conversion (defaults to "1")'
      },
      metadataUri: {
        type: 'string',
        description: 'IPFS URI for metadata (defaults to placeholder)'
      },
      name: {
        type: 'string',
        description: 'Display name for the token'
      },
      description: {
        type: 'string',
        description: 'Description for the token'
      }
    },
    required: ['symbol', 'decimals']
  }
};

export function handleGenerateAliasPath(input: GenerateAliasPathInput): GenerateAliasPathResult {
  try {
    const denom = input.symbol.toLowerCase();
    const tokenId = input.tokenId || '1';
    const metadataUri = input.metadataUri || 'ipfs://METADATA_ALIAS_PATH';

    const aliasPath: AliasPath = {
      denom,
      symbol: denom,
      conversion: {
        sideA: { amount: '1' },
        sideB: [{
          amount: '1',
          tokenIds: [{ start: tokenId, end: tokenId }],
          ownershipTimes: FOREVER_TIMES
        }]
      },
      denomUnits: [{
        decimals: input.decimals,
        symbol: input.symbol,
        isDefaultDisplay: true,
        metadata: { uri: metadataUri, customData: '' }
      }],
      metadata: { uri: metadataUri, customData: '' }
    };

    return {
      success: true,
      aliasPath
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to generate alias path: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
