/**
 * Tool: query_balance
 * Check token balance for an address in a collection.
 * Supports two modes:
 *   - Without tokenId: returns the full 3D balance array
 *   - With tokenId: returns just the balance amount for that token at the current time
 */

import { z } from 'zod';
import { getBalance, getBalanceForToken, type BalanceResponse } from '../../sdk/apiClient.js';
import { ensureBb1 } from '../../sdk/addressUtils.js';

export const queryBalanceSchema = z.object({
  collectionId: z.string().describe('The collection ID'),
  address: z.string().describe('The address to check (bb1... or 0x...)'),
  tokenId: z.string().optional().describe('Optional. If provided, returns just the balance amount for this specific token ID at the current time, instead of the full balance array.')
});

export type QueryBalanceInput = z.infer<typeof queryBalanceSchema>;

export interface QueryBalanceResult {
  success: boolean;
  balance?: BalanceResponse['balance'] | string;
  tokenId?: string;
  collectionId?: string;
  address?: string;
  error?: string;
}

export const queryBalanceTool = {
  name: 'query_balance',
  description: 'Check token balance for an address in a collection. Without tokenId, returns the full balance array with amounts, token ID ranges, and ownership time ranges. With tokenId, returns just the balance amount for the specified token at the current time. Requires BITBADGES_API_KEY environment variable.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      collectionId: {
        type: 'string',
        description: 'The collection ID'
      },
      address: {
        type: 'string',
        description: 'The address to check (bb1... or 0x...)'
      },
      tokenId: {
        type: 'string',
        description: 'Optional. If provided, returns just the balance amount for this specific token ID at the current time, instead of the full balance array.'
      }
    },
    required: ['collectionId', 'address']
  }
};

export async function handleQueryBalance(input: QueryBalanceInput): Promise<QueryBalanceResult> {
  try {
    const { collectionId, tokenId } = input;
    const address = ensureBb1(input.address);

    // If tokenId is provided, use the specific-token endpoint for a single balance amount
    if (tokenId) {
      const response = await getBalanceForToken(collectionId, tokenId, address);

      if (!response.success) {
        return {
          success: false,
          error: response.error
        };
      }

      return {
        success: true,
        balance: response.data?.balance ?? '0',
        tokenId,
        collectionId,
        address
      };
    }

    // Default: return full balance array
    const response = await getBalance(collectionId, address);

    if (!response.success) {
      return {
        success: false,
        error: response.error
      };
    }

    return {
      success: true,
      balance: response.data?.balance
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to query balance: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
