/**
 * Tool: query_balance
 * Check token balance for an address in a collection
 */

import { z } from 'zod';
import { getBalance, type BalanceResponse } from '../../sdk/apiClient.js';

export const queryBalanceSchema = z.object({
  collectionId: z.string().describe('The collection ID'),
  address: z.string().describe('The address to check (bb1... or 0x...)')
});

export type QueryBalanceInput = z.infer<typeof queryBalanceSchema>;

export interface QueryBalanceResult {
  success: boolean;
  balance?: BalanceResponse['balance'];
  error?: string;
}

export const queryBalanceTool = {
  name: 'query_balance',
  description: 'Check token balance for an address in a collection. Requires BITBADGES_API_KEY environment variable.',
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
      }
    },
    required: ['collectionId', 'address']
  }
};

export async function handleQueryBalance(input: QueryBalanceInput): Promise<QueryBalanceResult> {
  try {
    const { collectionId, address } = input;

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
