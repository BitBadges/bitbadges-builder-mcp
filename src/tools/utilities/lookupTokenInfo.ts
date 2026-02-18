/**
 * Tool: lookup_token_info
 * Get token info by symbol or IBC denom
 */

import { z } from 'zod';
import { lookupTokenInfo, getAllTokens, type TokenInfo } from '../../sdk/coinRegistry.js';

export const lookupTokenInfoSchema = z.object({
  query: z.string().describe('Token symbol (e.g., "USDC", "ATOM") or IBC denom (e.g., "ibc/...")')
});

export type LookupTokenInfoInput = z.infer<typeof lookupTokenInfoSchema>;

export interface LookupTokenInfoResult {
  success: boolean;
  tokenInfo?: TokenInfo;
  allTokens?: TokenInfo[];
  error?: string;
}

export const lookupTokenInfoTool = {
  name: 'lookup_token_info',
  description: 'Get token info by symbol or IBC denom. Returns symbol, IBC denom, decimals, and pre-generated backing address.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      query: {
        type: 'string',
        description: 'Token symbol (e.g., "USDC", "ATOM", "OSMO") or IBC denom (e.g., "ibc/F082B65...")'
      }
    },
    required: ['query']
  }
};

export function handleLookupTokenInfo(input: LookupTokenInfoInput): LookupTokenInfoResult {
  try {
    // Special case: if query is "all" or empty, return all tokens
    if (!input.query || input.query.toLowerCase() === 'all') {
      return {
        success: true,
        allTokens: getAllTokens()
      };
    }

    const tokenInfo = lookupTokenInfo(input.query);

    if (!tokenInfo) {
      return {
        success: false,
        error: `Token not found: "${input.query}". Available symbols: ${getAllTokens().map(t => t.symbol).join(', ')}`
      };
    }

    return {
      success: true,
      tokenInfo
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to lookup token: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
