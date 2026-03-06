/**
 * Tool: sign_and_broadcast
 * Sign a transaction with a private key or mnemonic and broadcast it to the BitBadges blockchain.
 *
 * This is the primary tool for autonomous agents to execute transactions on BitBadges.
 * It handles the full signing flow: credential → adapter → signing client → broadcast.
 */

import { z } from 'zod';

export const signAndBroadcastSchema = z.object({
  transactionJson: z.string().describe('The full transaction JSON (with messages, memo, fee) as produced by the builder tools'),
  signingMethod: z.enum(['privateKey', 'mnemonic']).describe('How to sign: "privateKey" (hex, with or without 0x) or "mnemonic" (BIP-39 phrase)'),
  credential: z.string().describe('The private key (hex) or mnemonic phrase'),
  network: z.enum(['mainnet', 'testnet', 'local']).optional().describe('Network to broadcast to. Default: "testnet" (safe default for bots)'),
  apiKey: z.string().optional().describe('BitBadges API key. Falls back to BITBADGES_API_KEY env var.')
});

export type SignAndBroadcastInput = z.infer<typeof signAndBroadcastSchema>;

export interface SignAndBroadcastResult {
  success: boolean;
  txHash?: string;
  signerAddress?: string;
  network?: string;
  gasUsed?: string;
  fee?: { amount: string; denom: string; gas: string };
  explorerUrl?: string;
  error?: string;
  /** Details about the signing flow for agent learning */
  signingDetails?: {
    chainType: string;
    cosmosChainId: string;
    accountNumber: number;
    sequence: number;
    messagesCount: number;
    messageTypes: string[];
  };
}

export const signAndBroadcastTool = {
  name: 'sign_and_broadcast',
  description: 'Sign a transaction with a private key or mnemonic and broadcast it to BitBadges. Returns txHash, explorer URL, and signing details. Supports mainnet, testnet (default), and local networks. Use this after building a transaction with the builder tools.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      transactionJson: {
        type: 'string',
        description: 'The full transaction JSON (with messages array, optional memo and fee) as produced by the builder tools'
      },
      signingMethod: {
        type: 'string',
        enum: ['privateKey', 'mnemonic'],
        description: 'How to sign: "privateKey" (hex, with or without 0x prefix) or "mnemonic" (BIP-39 phrase, 12 or 24 words)'
      },
      credential: {
        type: 'string',
        description: 'The private key (hex string) or mnemonic phrase (space-separated words)'
      },
      network: {
        type: 'string',
        enum: ['mainnet', 'testnet', 'local'],
        description: 'Network to broadcast to. Default: "testnet" (safe default for autonomous agents)'
      },
      apiKey: {
        type: 'string',
        description: 'BitBadges API key. Falls back to BITBADGES_API_KEY environment variable if not provided.'
      }
    },
    required: ['transactionJson', 'signingMethod', 'credential']
  }
};

const EXPLORER_URLS: Record<string, string> = {
  mainnet: 'https://explorer.bitbadges.io/BitBadges%20Mainnet/tx',
  testnet: 'https://explorer.bitbadges.io/BitBadges%20Testnet/tx',
  local: 'http://localhost:3000/tx'
};

export async function handleSignAndBroadcast(input: SignAndBroadcastInput): Promise<SignAndBroadcastResult> {
  const network = input.network || 'testnet';
  const apiKey = input.apiKey || process.env.BITBADGES_API_KEY;

  try {
    // Dynamic import to avoid loading heavy SDK at module level
    const {
      BitBadgesSigningClient,
      GenericCosmosAdapter,
      ProtoTypeRegistry
    } = await import('bitbadgesjs-sdk');

    // 1. Parse transaction JSON
    let tx: {
      messages: Array<{ typeUrl: string; value: unknown }>;
      memo?: string;
      fee?: { amount: Array<{ denom: string; amount: string }>; gas: string };
    };

    try {
      tx = JSON.parse(input.transactionJson);
    } catch {
      return { success: false, error: 'Invalid JSON: Could not parse transaction JSON' };
    }

    if (!tx.messages || !Array.isArray(tx.messages) || tx.messages.length === 0) {
      return { success: false, error: 'Invalid transaction: "messages" must be a non-empty array' };
    }

    // 2. Convert JSON messages to proto Messages using the registry
    const protoMessages: any[] = [];
    const messageTypes: string[] = [];

    for (const msg of tx.messages) {
      if (!msg.typeUrl || msg.value === undefined) {
        return { success: false, error: `Invalid message: each message must have "typeUrl" and "value". Got: ${JSON.stringify(msg).slice(0, 200)}` };
      }

      // Extract type name from typeUrl (e.g., "/tokenization.MsgUniversalUpdateCollection" → "tokenization.MsgUniversalUpdateCollection")
      const typeName = msg.typeUrl.startsWith('/') ? msg.typeUrl.slice(1) : msg.typeUrl;
      messageTypes.push(typeName);

      const messageType = (ProtoTypeRegistry as any).findMessage(typeName);
      if (!messageType) {
        return {
          success: false,
          error: `Unknown message type: "${msg.typeUrl}". Ensure the typeUrl is correct (e.g., "/tokenization.MsgUniversalUpdateCollection").`
        };
      }

      try {
        const protoMsg = (messageType as any).fromJson(msg.value, {
          ignoreUnknownFields: true,
          typeRegistry: ProtoTypeRegistry
        });
        protoMessages.push(protoMsg);
      } catch (e) {
        return {
          success: false,
          error: `Failed to convert message "${msg.typeUrl}" to proto format: ${e instanceof Error ? e.message : String(e)}`
        };
      }
    }

    // 3. Create wallet adapter
    let adapter: Awaited<ReturnType<typeof GenericCosmosAdapter.fromPrivateKey>>;
    const chainId = network === 'testnet' ? 'bitbadges-2' : 'bitbadges-1';

    try {
      if (input.signingMethod === 'mnemonic') {
        adapter = await GenericCosmosAdapter.fromMnemonic(input.credential, chainId);
      } else {
        const key = input.credential.startsWith('0x') ? input.credential : `0x${input.credential}`;
        adapter = await GenericCosmosAdapter.fromPrivateKey(key, chainId);
      }
    } catch (e) {
      return {
        success: false,
        error: `Failed to create wallet adapter: ${e instanceof Error ? e.message : String(e)}. ` +
          (input.signingMethod === 'mnemonic'
            ? 'Ensure the mnemonic is a valid BIP-39 phrase (12 or 24 space-separated words).'
            : 'Ensure the private key is a valid hex string (64 characters, with or without 0x prefix).')
      };
    }

    // 4. Create signing client
    const client = new BitBadgesSigningClient({
      adapter,
      network,
      apiKey
    });

    // 5. Get account info for signing details
    let accountInfo;
    try {
      accountInfo = await client.getAccountInfo();
    } catch (e) {
      return {
        success: false,
        error: `Failed to fetch account info from chain: ${e instanceof Error ? e.message : String(e)}. ` +
          `Ensure the ${network} network is accessible and the account exists. ` +
          (network === 'testnet' ? 'Use the testnet faucet (POST /api/v0/faucet) to fund a new account.' : '')
      };
    }

    // 6. Sign and broadcast
    const result = await client.signAndBroadcast(protoMessages, {
      memo: tx.memo || '',
      fee: tx.fee ? {
        amount: tx.fee.amount[0]?.amount || '5000',
        denom: tx.fee.amount[0]?.denom || 'ubadge',
        gas: tx.fee.gas || '500000'
      } : undefined
    });

    if (!result.success) {
      return {
        success: false,
        txHash: result.txHash || undefined,
        signerAddress: client.address,
        network,
        error: result.error || `Transaction failed with code ${result.code}`,
        signingDetails: {
          chainType: 'cosmos',
          cosmosChainId: chainId,
          accountNumber: accountInfo.accountNumber,
          sequence: accountInfo.sequence,
          messagesCount: protoMessages.length,
          messageTypes
        }
      };
    }

    const explorerBase = EXPLORER_URLS[network] || EXPLORER_URLS.testnet;

    return {
      success: true,
      txHash: result.txHash,
      signerAddress: client.address,
      network,
      explorerUrl: `${explorerBase}/${result.txHash}`,
      signingDetails: {
        chainType: 'cosmos',
        cosmosChainId: chainId,
        accountNumber: accountInfo.accountNumber,
        sequence: accountInfo.sequence,
        messagesCount: protoMessages.length,
        messageTypes
      }
    };
  } catch (error) {
    return {
      success: false,
      network,
      error: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
