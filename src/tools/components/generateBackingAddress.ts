/**
 * Tool: generate_backing_address
 * Compute deterministic backing address for IBC denom
 */

import { z } from 'zod';
import { generateAliasAddressForIBCBackedDenom } from '../../sdk/addressGenerator.js';
import { lookupTokenInfo, resolveIbcDenom } from '../../sdk/coinRegistry.js';

export const generateBackingAddressSchema = z.object({
  ibcDenom: z.string().describe('Full IBC denom (e.g., "ibc/F082B65...") or symbol (e.g., "USDC")')
});

export type GenerateBackingAddressInput = z.infer<typeof generateBackingAddressSchema>;

export interface GenerateBackingAddressResult {
  success: boolean;
  address?: string;
  ibcDenom?: string;
  symbol?: string;
  decimals?: string;
  approvalListIds?: {
    backingFromListId: string;
    backingToListId: string;
    unbackingFromListId: string;
    unbackingToListId: string;
  };
  error?: string;
}

export const generateBackingAddressTool = {
  name: 'generate_backing_address',
  description: 'Compute deterministic backing address for an IBC denom. Returns the backing address and pre-computed list IDs for Smart Token approvals.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      ibcDenom: {
        type: 'string',
        description: 'Full IBC denom (e.g., "ibc/F082B65C88E4B6D5EF1DB243CDA1D331D002759E938A0F5CD3FFDC5D53B3E349") or token symbol (e.g., "USDC", "ATOM")'
      }
    },
    required: ['ibcDenom']
  }
};

export function handleGenerateBackingAddress(input: GenerateBackingAddressInput): GenerateBackingAddressResult {
  try {
    // Try to resolve symbol to IBC denom
    let ibcDenom = input.ibcDenom;
    let symbol = 'UNKNOWN';
    let decimals = '6';

    // Check if it's a symbol
    if (!ibcDenom.startsWith('ibc/')) {
      const tokenInfo = lookupTokenInfo(ibcDenom);
      if (tokenInfo) {
        ibcDenom = tokenInfo.ibcDenom;
        symbol = tokenInfo.symbol;
        decimals = tokenInfo.decimals;
      } else {
        // Try to resolve as IBC denom
        const resolved = resolveIbcDenom(ibcDenom);
        if (!resolved) {
          return {
            success: false,
            error: `Could not resolve "${input.ibcDenom}" to an IBC denom. Use full IBC denom (ibc/...) or known symbol (USDC, ATOM, OSMO).`
          };
        }
        ibcDenom = resolved;
      }
    } else {
      // Look up token info by IBC denom
      const tokenInfo = lookupTokenInfo(ibcDenom);
      if (tokenInfo) {
        symbol = tokenInfo.symbol;
        decimals = tokenInfo.decimals;
      }
    }

    // Generate the backing address
    const address = generateAliasAddressForIBCBackedDenom(ibcDenom);

    return {
      success: true,
      address,
      ibcDenom,
      symbol,
      decimals,
      approvalListIds: {
        backingFromListId: address,
        backingToListId: `!${address}`,
        unbackingFromListId: `!Mint:${address}`,
        unbackingToListId: address
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to generate backing address: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
