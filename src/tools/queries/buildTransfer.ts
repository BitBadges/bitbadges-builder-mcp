/**
 * Tool: build_transfer
 * Construct a correct MsgTransferTokens by querying the collection,
 * analyzing its approvals, and generating the right transaction.
 *
 * This is a COMPUTATIONAL tool — it auto-queries the collection and builds
 * the transfer with correct prioritizedApprovals, coinTransfers, etc.
 */

import { z } from 'zod';
import { getCollections } from '../../sdk/apiClient.js';
import { ensureBb1 } from '../../sdk/addressUtils.js';

export const buildTransferSchema = z.object({
  collectionId: z.string().describe('The collection ID'),
  fromAddress: z.string().describe('Sender address (bb1... or 0x...) — use "Mint" for minting'),
  toAddress: z.string().describe('Recipient address (bb1... or 0x...) — for unbacking, use the backing address'),
  tokenIds: z.array(z.object({
    start: z.string(),
    end: z.string()
  })).optional().describe('Token ID ranges to transfer (default: all valid token IDs)'),
  amount: z.string().optional().describe('Amount to transfer (default: "1")'),
  intent: z.enum(['mint', 'transfer', 'deposit', 'withdraw']).optional()
    .describe('Transfer intent — helps select the right approval. Auto-detected if not specified.')
});

export type BuildTransferInput = z.infer<typeof buildTransferSchema>;

const MAX_UINT64 = '18446744073709551615';
const FOREVER = [{ start: '1', end: MAX_UINT64 }];

export interface BuildTransferResult {
  success: boolean;
  error?: string;
  transaction?: {
    messages: unknown[];
    memo: string;
    fee: { amount: Array<{ denom: string; amount: string }>; gas: string };
  };
  explanation?: {
    approvalUsed: string;
    intent: string;
    steps: string[];
    warnings: string[];
  };
}

export const buildTransferTool = {
  name: 'build_transfer',
  description: 'Build a MsgTransferTokens by auto-querying the collection, analyzing its approvals, and constructing the correct transaction with proper prioritizedApprovals, coinTransfers, etc. Supports mint, transfer, deposit (IBC→token), and withdraw (token→IBC). Requires BITBADGES_API_KEY.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      collectionId: {
        type: 'string',
        description: 'The collection ID'
      },
      fromAddress: {
        type: 'string',
        description: 'Sender address (bb1... or 0x...) — use "Mint" for minting'
      },
      toAddress: {
        type: 'string',
        description: 'Recipient address (bb1... or 0x...) — for unbacking, use the backing address'
      },
      tokenIds: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            start: { type: 'string' },
            end: { type: 'string' }
          },
          required: ['start', 'end']
        },
        description: 'Token ID ranges (default: all valid IDs)'
      },
      amount: {
        type: 'string',
        description: 'Amount to transfer (default: "1")'
      },
      intent: {
        type: 'string',
        enum: ['mint', 'transfer', 'deposit', 'withdraw'],
        description: 'Transfer intent (auto-detected if not specified)'
      }
    },
    required: ['collectionId', 'fromAddress', 'toAddress']
  }
};

function detectIntent(from: string, to: string, collection: Record<string, unknown>): string {
  if (from === 'Mint') return 'mint';

  const invariants = (collection.invariants as Record<string, unknown>) || {};
  const ibcPath = invariants.cosmosCoinBackedPath as Record<string, unknown> | null | undefined;
  const backingAddr = ibcPath?.backingAddress as string | undefined;

  if (backingAddr) {
    if (to === backingAddr) return 'withdraw';
    if (from === backingAddr) return 'deposit';
  }

  return 'transfer';
}

function findMatchingApproval(
  approvals: Array<Record<string, unknown>>,
  intent: string,
  from: string,
  to: string,
  backingAddress?: string
): Record<string, unknown> | null {
  for (const approval of approvals) {
    const fromList = (approval.fromListId as string) || '';
    const toList = (approval.toListId as string) || '';
    const criteria = (approval.approvalCriteria as Record<string, unknown>) || {};

    switch (intent) {
      case 'mint':
        if (fromList === 'Mint') return approval;
        break;
      case 'deposit':
        if (criteria.allowBackedMinting === true && backingAddress &&
            fromList.includes(backingAddress) && !fromList.startsWith('!')) {
          return approval;
        }
        break;
      case 'withdraw':
        if (criteria.allowBackedMinting === true && backingAddress &&
            toList.includes(backingAddress) && !toList.startsWith('!')) {
          return approval;
        }
        break;
      case 'transfer':
        // Match transfer approvals (non-mint, non-backing)
        if (fromList !== 'Mint' && !criteria.allowBackedMinting) {
          // Check the from matches
          if (fromList === 'All' || fromList === '!Mint' ||
              fromList.startsWith('!Mint:') ||
              (from && fromList.includes(from))) {
            return approval;
          }
        }
        break;
    }
  }
  return null;
}

export async function handleBuildTransfer(input: BuildTransferInput): Promise<BuildTransferResult> {
  try {
    const { collectionId, amount = '1' } = input;
    const fromAddress = input.fromAddress === 'Mint' ? 'Mint' : ensureBb1(input.fromAddress);
    const toAddress = ensureBb1(input.toAddress);

    // Query collection
    const response = await getCollections({
      collectionsToFetch: [{
        collectionId,
        metadataToFetch: { uris: [] },
        fetchTotalAndMintBalances: true
      }]
    });

    if (!response.success || !response.data?.collections?.[0]) {
      return {
        success: false,
        error: response.error || `Collection ${collectionId} not found`
      };
    }

    const collection = response.data.collections[0] as Record<string, unknown>;
    const validBadgeIds = (collection.validBadgeIds as Array<{ start: string; end: string }>) || [{ start: '1', end: '1' }];
    const rawApprovals = (collection.collectionApprovals as Array<Record<string, unknown>>) || [];
    const invariants = (collection.invariants as Record<string, unknown>) || {};
    const ibcPath = invariants.cosmosCoinBackedPath as Record<string, unknown> | null | undefined;
    const backingAddress = ibcPath?.backingAddress as string | undefined;

    // Detect intent
    const intent = input.intent || detectIntent(fromAddress, toAddress, collection);
    const tokenIds = input.tokenIds || validBadgeIds;

    // Find matching approval
    const matchedApproval = findMatchingApproval(rawApprovals, intent, fromAddress, toAddress, backingAddress);

    if (!matchedApproval) {
      return {
        success: false,
        error: `No matching ${intent} approval found in collection ${collectionId}. Available approvals: ${rawApprovals.map(a => `"${a.approvalId}" (from: ${a.fromListId}, to: ${a.toListId})`).join(', ')}. Use analyze_collection for full details.`
      };
    }

    const approvalId = (matchedApproval.approvalId as string) || '';
    const criteria = (matchedApproval.approvalCriteria as Record<string, unknown>) || {};
    const warnings: string[] = [];
    const steps: string[] = [];

    // Determine the actual from address for the transfer
    let transferFrom = fromAddress;
    if (intent === 'mint') {
      transferFrom = 'Mint';
    }

    // Build prioritizedApprovals
    const prioritizedApprovals: Array<{ approvalId: string; approvalLevel: string; approverAddress: string }> = [{
      approvalId,
      approvalLevel: 'collection',
      approverAddress: ''
    }];

    steps.push(`Using approval "${approvalId}" (${intent})`);
    steps.push(`prioritizedApprovals set to target this specific approval`);

    // Build the transfer object
    const transfer: Record<string, unknown> = {
      from: transferFrom,
      toAddresses: [toAddress],
      balances: [{
        amount,
        tokenIds,
        ownershipTimes: FOREVER
      }],
      prioritizedApprovals,
      onlyCheckPrioritizedApprovals: false
    };

    // Handle coinTransfers if payment required
    if (Array.isArray(criteria.coinTransfers) && criteria.coinTransfers.length > 0) {
      const coinTransfer = criteria.coinTransfers[0] as Record<string, unknown>;
      const payTo = (coinTransfer.to as string) || '';
      const coins = (coinTransfer.coins as Array<{ denom: string; amount: string }>) || [];

      if (coins.length > 0) {
        // Scale payment by amount if needed
        const coinDesc = coins.map(c => `${c.amount} ${c.denom}`).join(' + ');
        steps.push(`Payment required: ${coinDesc} to ${payTo}`);
        warnings.push(`Ensure the sender has sufficient ${coins[0].denom} for the payment`);
      }
    }

    // Check per-user limits
    const maxNum = criteria.maxNumTransfers as Record<string, unknown> | undefined;
    if (maxNum?.perInitiatedByAddressMaxNumTransfers &&
        maxNum.perInitiatedByAddressMaxNumTransfers !== '0') {
      steps.push(`Per-user limit: ${maxNum.perInitiatedByAddressMaxNumTransfers} transfer(s)`);
      warnings.push(`This address may have already used some of its ${maxNum.perInitiatedByAddressMaxNumTransfers} allowed transfers`);
    }

    // Check supply cap
    const amounts = criteria.approvalAmounts as Record<string, unknown> | undefined;
    if (amounts?.overallApprovalAmount && amounts.overallApprovalAmount !== '0') {
      steps.push(`Total supply cap: ${amounts.overallApprovalAmount}`);
      warnings.push('Supply cap may have been partially used. Use simulate_transaction to verify.');
    }

    // Must own tokens
    if (Array.isArray(criteria.mustOwnTokens) && criteria.mustOwnTokens.length > 0) {
      for (const mot of criteria.mustOwnTokens as Array<Record<string, unknown>>) {
        const motCollId = (mot.collectionId as string) || '?';
        const amtRange = (mot.amountRange as Record<string, unknown>) || {};
        steps.push(`Prerequisite: must own tokens from collection ${motCollId} (min amount: ${amtRange.start || '1'})`);
        warnings.push(`Use verify_ownership to confirm prerequisite ownership before sending`);
      }
    }

    // Smart token specific warnings
    if (intent === 'deposit') {
      steps.push(`IBC deposit: send ${ibcPath?.ibcDenom || 'IBC denom'} to backing address ${backingAddress}`);
      warnings.push('Backing deposits are handled by the protocol — the MsgTransferTokens triggers the IBC conversion');
    }
    if (intent === 'withdraw') {
      steps.push(`IBC withdrawal: sending collection tokens to backing address ${backingAddress} releases the underlying asset`);
    }

    // Build the complete transaction
    const creatorAddress = intent === 'mint' ? toAddress : fromAddress;

    const transaction = {
      messages: [{
        typeUrl: '/tokenization.MsgTransferTokens',
        value: {
          creator: creatorAddress,
          collectionId,
          transfers: [transfer]
        }
      }],
      memo: '',
      fee: {
        amount: [{ denom: 'ubadge', amount: '5000' }],
        gas: '500000'
      }
    };

    return {
      success: true,
      transaction,
      explanation: {
        approvalUsed: approvalId,
        intent,
        steps,
        warnings
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to build transfer: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
