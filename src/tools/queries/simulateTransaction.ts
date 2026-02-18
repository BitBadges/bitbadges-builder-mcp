/**
 * Tool: simulate_transaction
 * Dry-run a transaction to check validity and estimate gas
 */

import { z } from 'zod';
import { simulateTx } from '../../sdk/apiClient.js';

export const simulateTransactionSchema = z.object({
  transactionJson: z.string().describe('The full transaction JSON to simulate')
});

export type SimulateTransactionInput = z.infer<typeof simulateTransactionSchema>;

export interface SimulateTransactionResult {
  success: boolean;
  valid?: boolean;
  gasUsed?: string;
  events?: unknown[];
  simulationError?: string;
  error?: string;
}

export const simulateTransactionTool = {
  name: 'simulate_transaction',
  description: 'Dry-run a transaction to check validity and estimate gas. Requires BITBADGES_API_KEY environment variable.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      transactionJson: {
        type: 'string',
        description: 'The full transaction JSON to simulate'
      }
    },
    required: ['transactionJson']
  }
};

export async function handleSimulateTransaction(input: SimulateTransactionInput): Promise<SimulateTransactionResult> {
  try {
    const { transactionJson } = input;

    // Parse the transaction JSON
    let tx: {
      messages: unknown[];
      memo?: string;
      fee?: {
        amount: Array<{ denom: string; amount: string }>;
        gas: string;
      };
    };

    try {
      tx = JSON.parse(transactionJson);
    } catch {
      return {
        success: false,
        error: 'Invalid JSON: Could not parse transaction JSON'
      };
    }

    // Validate basic structure
    if (!tx.messages || !Array.isArray(tx.messages)) {
      return {
        success: false,
        error: 'Invalid transaction: Missing "messages" array'
      };
    }

    // Create simulation request
    const response = await simulateTx({
      txs: [{
        context: {
          address: 'bb1simulation',
          chain: 'eth'
        },
        messages: tx.messages,
        memo: tx.memo || '',
        fee: tx.fee || {
          amount: [{ denom: 'ubadge', amount: '5000' }],
          gas: '500000'
        }
      }]
    });

    if (!response.success) {
      return {
        success: false,
        error: response.error
      };
    }

    const result = response.data?.results?.[0];

    if (result?.error) {
      return {
        success: true,
        valid: false,
        simulationError: result.error
      };
    }

    return {
      success: true,
      valid: true,
      gasUsed: result?.gasUsed,
      events: result?.events
    };
  } catch (error) {
    return {
      success: false,
      error: 'Failed to simulate transaction: ' + (error instanceof Error ? error.message : String(error))
    };
  }
}
