/**
 * Tool: broadcast
 * Broadcast a pre-signed transaction to the BitBadges blockchain.
 *
 * For agents that handle signing externally (e.g., using the SDK directly,
 * hardware wallets, or custodial signing services) and just need to submit
 * the signed transaction.
 */

import { z } from 'zod';

export const broadcastSchema = z.object({
  signedTxBody: z.string().describe('The signed transaction body as JSON (standard Cosmos BroadcastTxRequest format)'),
  network: z.enum(['mainnet', 'testnet', 'local']).optional().describe('Network to broadcast to. Default: "testnet"'),
  apiKey: z.string().optional().describe('BitBadges API key. Falls back to BITBADGES_API_KEY env var.')
});

export type BroadcastInput = z.infer<typeof broadcastSchema>;

export interface BroadcastResult {
  success: boolean;
  txHash?: string;
  code?: number;
  explorerUrl?: string;
  error?: string;
}

export const broadcastTool = {
  name: 'broadcast',
  description: 'Broadcast a pre-signed transaction to the BitBadges blockchain. Use this if you signed the transaction externally (via SDK, hardware wallet, or custodial service). For most cases, use sign_and_broadcast instead.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      signedTxBody: {
        type: 'string',
        description: 'The signed transaction body as JSON string (standard Cosmos BroadcastTxRequest format with tx_bytes and mode)'
      },
      network: {
        type: 'string',
        enum: ['mainnet', 'testnet', 'local'],
        description: 'Network to broadcast to. Default: "testnet"'
      },
      apiKey: {
        type: 'string',
        description: 'BitBadges API key. Falls back to BITBADGES_API_KEY environment variable.'
      }
    },
    required: ['signedTxBody']
  }
};

const API_URLS: Record<string, string> = {
  mainnet: 'https://api.bitbadges.io',
  testnet: 'https://api.bitbadges.io/testnet',
  local: 'http://localhost:3001'
};

const EXPLORER_URLS: Record<string, string> = {
  mainnet: 'https://explorer.bitbadges.io/BitBadges%20Mainnet/tx',
  testnet: 'https://explorer.bitbadges.io/BitBadges%20Testnet/tx',
  local: 'http://localhost:3000/tx'
};

export async function handleBroadcast(input: BroadcastInput): Promise<BroadcastResult> {
  const network = input.network || 'testnet';
  const apiKey = input.apiKey || process.env.BITBADGES_API_KEY;
  const apiUrl = API_URLS[network] || API_URLS.testnet;

  try {
    let body: unknown;
    try {
      body = JSON.parse(input.signedTxBody);
    } catch {
      return { success: false, error: 'Invalid JSON: Could not parse signedTxBody' };
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey) {
      headers['x-api-key'] = apiKey;
    }

    const response = await fetch(`${apiUrl}/api/v0/broadcast`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `Broadcast API error ${response.status}: ${errorText}`
      };
    }

    const data = await response.json() as any;
    const txResponse = data.tx_response;
    const code = txResponse?.code || 0;
    const txHash = txResponse?.txhash || '';

    if (code !== 0) {
      return {
        success: false,
        txHash,
        code,
        error: txResponse?.raw_log || `Transaction failed with code ${code}`
      };
    }

    const explorerBase = EXPLORER_URLS[network] || EXPLORER_URLS.testnet;

    return {
      success: true,
      txHash,
      code: 0,
      explorerUrl: `${explorerBase}/${txHash}`
    };
  } catch (error) {
    return {
      success: false,
      error: `Broadcast failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
