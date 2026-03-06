/**
 * Tool: analyze_collection
 * Query a collection and produce a structured analysis of its transferability,
 * approvals, permissions, and how to obtain/transfer tokens.
 *
 * This is a COMPUTATIONAL tool — it actually parses on-chain data, not a knowledge lookup.
 */

import { z } from 'zod';
import { getCollections } from '../../sdk/apiClient.js';

export const analyzeCollectionSchema = z.object({
  collectionId: z.string().describe('The collection ID to analyze')
});

export type AnalyzeCollectionInput = z.infer<typeof analyzeCollectionSchema>;

const MAX_UINT64 = '18446744073709551615';

// ============================================
// Types for parsed approval data
// ============================================

interface ParsedApproval {
  approvalId: string;
  type: 'mint' | 'backing' | 'unbacking' | 'transfer' | 'other';
  description: string;
  from: string;
  to: string;
  initiatedBy: string;
  tokenIds: string;
  transferTimes: string;
  requirements: ParsedRequirements;
}

interface ParsedRequirements {
  payment?: { to: string; coins: Array<{ denom: string; amount: string }> };
  maxPerUser?: string;
  totalSupplyCap?: string;
  mustOwnTokens?: Array<{ collectionId: string; tokenIds: string; amount: string }>;
  overridesOutgoing: boolean;
  overridesIncoming: boolean;
  mustPrioritize: boolean;
  allowBackedMinting: boolean;
  autoDelete: boolean;
  predeterminedBalances?: string;
}

interface PermissionStatus {
  field: string;
  status: 'locked' | 'unlocked' | 'partially-locked';
  detail: string;
}

export interface AnalyzeCollectionResult {
  success: boolean;
  error?: string;
  analysis?: {
    collectionId: string;
    name: string;
    description: string;
    type: 'nft' | 'fungible' | 'smart-token' | 'subscription' | 'unknown';
    manager: string;
    tokenIds: string;
    standards: string[];

    transferability: {
      summary: string;
      isTransferable: boolean;
      isMintable: boolean;
      isSmartToken: boolean;
    };

    approvals: ParsedApproval[];

    howToObtain: {
      method: string;
      steps: string[];
      approvalId: string;
      prioritizedApprovals: Array<{ approvalId: string; approvalLevel: string; approverAddress: string }>;
    }[];

    howToTransfer: {
      method: string;
      steps: string[];
      approvalId: string;
      prioritizedApprovals: Array<{ approvalId: string; approvalLevel: string; approverAddress: string }>;
    }[];

    permissions: PermissionStatus[];

    invariants: {
      maxSupplyPerId: string;
      noCustomOwnershipTimes: boolean;
      noForcefulPostMintTransfers: boolean;
      ibcBacking: { denom: string; backingAddress: string } | null;
    };
  };
}

export const analyzeCollectionTool = {
  name: 'analyze_collection',
  description: 'Query a collection and produce a structured analysis of its transferability, approvals, permissions, and how to obtain/transfer tokens. Returns actionable information for constructing MsgTransferTokens. Requires BITBADGES_API_KEY.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      collectionId: {
        type: 'string',
        description: 'The collection ID to analyze'
      }
    },
    required: ['collectionId']
  }
};

// ============================================
// Helpers
// ============================================

function rangeToString(ranges: Array<{ start: string; end: string }> | undefined): string {
  if (!ranges || ranges.length === 0) return 'none';
  return ranges.map(r => {
    if (r.start === '1' && r.end === MAX_UINT64) return 'all';
    if (r.start === r.end) return `#${r.start}`;
    return `#${r.start}-${r.end}`;
  }).join(', ');
}

function listIdToHuman(id: string): string {
  if (id === 'All') return 'anyone';
  if (id === 'Mint') return 'Mint (escrow)';
  if (id === '!Mint') return 'any non-Mint address';
  if (id.startsWith('!Mint:')) return `any non-Mint except ${id.slice(6)}`;
  if (id.startsWith('!')) return `anyone except ${id.slice(1)}`;
  if (id.includes(':')) return id.split(':').join(', ');
  if (id.startsWith('bb1')) return id;
  return id;
}

function classifyApproval(approval: Record<string, unknown>): ParsedApproval['type'] {
  const from = (approval.fromListId as string) || '';
  const to = (approval.toListId as string) || '';
  const criteria = (approval.approvalCriteria as Record<string, unknown>) || {};

  if (from === 'Mint') return 'mint';
  if (criteria.allowBackedMinting === true) {
    if (from.startsWith('bb1') && !from.startsWith('!')) return 'backing';
    if (to.startsWith('bb1') && !to.startsWith('!')) return 'unbacking';
  }
  if (from === '!Mint' || from.startsWith('!Mint:') || from === 'All') {
    if (to === '!Mint' || to.startsWith('!Mint:') || to === 'All') {
      return 'transfer';
    }
  }
  return 'other';
}

function parseRequirements(criteria: Record<string, unknown>): ParsedRequirements {
  const reqs: ParsedRequirements = {
    overridesOutgoing: criteria.overridesFromOutgoingApprovals === true,
    overridesIncoming: criteria.overridesToIncomingApprovals === true,
    mustPrioritize: criteria.mustPrioritize === true,
    allowBackedMinting: criteria.allowBackedMinting === true,
    autoDelete: false,
  };

  // Payment
  if (Array.isArray(criteria.coinTransfers) && criteria.coinTransfers.length > 0) {
    const ct = criteria.coinTransfers[0] as Record<string, unknown>;
    reqs.payment = {
      to: (ct.to as string) || 'manager',
      coins: (ct.coins as Array<{ denom: string; amount: string }>) || []
    };
  }

  // Per-user limits
  const maxNum = criteria.maxNumTransfers as Record<string, unknown> | undefined;
  if (maxNum) {
    if (maxNum.perInitiatedByAddressMaxNumTransfers && maxNum.perInitiatedByAddressMaxNumTransfers !== '0') {
      reqs.maxPerUser = maxNum.perInitiatedByAddressMaxNumTransfers as string;
    }
  }

  // Total supply cap
  const amounts = criteria.approvalAmounts as Record<string, unknown> | undefined;
  if (amounts) {
    if (amounts.overallApprovalAmount && amounts.overallApprovalAmount !== '0') {
      reqs.totalSupplyCap = amounts.overallApprovalAmount as string;
    }
  }

  // Must own tokens
  if (Array.isArray(criteria.mustOwnTokens) && criteria.mustOwnTokens.length > 0) {
    reqs.mustOwnTokens = (criteria.mustOwnTokens as Array<Record<string, unknown>>).map(mot => ({
      collectionId: (mot.collectionId as string) || '?',
      tokenIds: rangeToString(mot.tokenIds as Array<{ start: string; end: string }>),
      amount: ((mot.amountRange as Record<string, unknown>)?.start as string) || '1'
    }));
  }

  // Auto-delete
  const autoDelete = criteria.autoDeletionOptions as Record<string, unknown> | undefined;
  if (autoDelete?.afterOneUse === true) {
    reqs.autoDelete = true;
  }

  // Predetermined balances
  const predBalances = criteria.predeterminedBalances as Record<string, unknown> | undefined;
  if (predBalances) {
    reqs.predeterminedBalances = 'Uses predetermined balance distribution (subscription/sequential pattern)';
  }

  return reqs;
}

function describeApproval(type: ParsedApproval['type'], reqs: ParsedRequirements, from: string, to: string): string {
  const parts: string[] = [];

  switch (type) {
    case 'mint':
      parts.push('Allows minting (new token creation)');
      break;
    case 'backing':
      parts.push('Smart token deposit (IBC → collection token)');
      break;
    case 'unbacking':
      parts.push('Smart token withdrawal (collection token → IBC)');
      break;
    case 'transfer':
      parts.push('Allows transfers between users');
      break;
    default:
      parts.push(`Transfer from ${listIdToHuman(from)} to ${listIdToHuman(to)}`);
  }

  if (reqs.payment) {
    const coins = reqs.payment.coins.map(c => `${c.amount} ${c.denom}`).join(' + ');
    parts.push(`Requires payment: ${coins} to ${reqs.payment.to}`);
  }
  if (reqs.maxPerUser) {
    parts.push(`Max ${reqs.maxPerUser} per user`);
  }
  if (reqs.totalSupplyCap) {
    parts.push(`Total cap: ${reqs.totalSupplyCap}`);
  }
  if (reqs.mustOwnTokens) {
    for (const mot of reqs.mustOwnTokens) {
      parts.push(`Must own ≥${mot.amount} of collection ${mot.collectionId} tokens ${mot.tokenIds}`);
    }
  }
  if (reqs.autoDelete) {
    parts.push('Auto-deletes after one use');
  }
  if (reqs.predeterminedBalances) {
    parts.push(reqs.predeterminedBalances);
  }

  return parts.join('. ');
}

function parsePermissions(permissions: Record<string, unknown>): PermissionStatus[] {
  const results: PermissionStatus[] = [];

  const permFields = [
    'canDeleteCollection', 'canArchiveCollection', 'canUpdateManager',
    'canUpdateCollectionMetadata', 'canUpdateTokenMetadata', 'canUpdateValidTokenIds',
    'canUpdateCollectionApprovals', 'canUpdateStandards', 'canUpdateCustomData',
    'canAddMoreAliasPaths', 'canAddMoreCosmosCoinWrapperPaths'
  ];

  for (const field of permFields) {
    const entries = permissions[field] as Array<Record<string, unknown>> | undefined;

    if (!entries || entries.length === 0) {
      results.push({ field, status: 'unlocked', detail: 'No restrictions (manager can update)' });
      continue;
    }

    const hasPermitted = entries.some(e =>
      Array.isArray(e.permanentlyPermittedTimes) && e.permanentlyPermittedTimes.length > 0
    );
    const hasForbidden = entries.some(e =>
      Array.isArray(e.permanentlyForbiddenTimes) && e.permanentlyForbiddenTimes.length > 0
    );

    // Check if fully frozen (forbidden for all time)
    const fullyForbidden = entries.some(e => {
      const forbidden = e.permanentlyForbiddenTimes as Array<{ start: string; end: string }> | undefined;
      return forbidden?.some(t => t.start === '1' && t.end === MAX_UINT64);
    });

    if (fullyForbidden) {
      results.push({ field, status: 'locked', detail: 'Permanently frozen — cannot be changed' });
    } else if (hasPermitted && hasForbidden) {
      results.push({ field, status: 'partially-locked', detail: 'Some time ranges locked, some permitted' });
    } else if (hasForbidden) {
      results.push({ field, status: 'partially-locked', detail: 'Some time ranges forbidden' });
    } else if (hasPermitted) {
      results.push({ field, status: 'unlocked', detail: 'Permanently permitted (always allowed)' });
    } else {
      results.push({ field, status: 'unlocked', detail: 'No restrictions' });
    }
  }

  return results;
}

type CollectionType = 'nft' | 'fungible' | 'smart-token' | 'subscription' | 'unknown';

function detectCollectionType(collection: Record<string, unknown>): CollectionType {
  const standards = (collection.standards as string[]) || [];
  const invariants = (collection.invariants as Record<string, unknown>) || {};

  if (standards.includes('Subscriptions')) return 'subscription';
  if (standards.includes('Smart Token') || invariants.cosmosCoinBackedPath) return 'smart-token';

  const maxSupply = (invariants.maxSupplyPerId as string) || '0';
  if (maxSupply === '1') return 'nft';
  return 'fungible';
}

// ============================================
// Main handler
// ============================================

export async function handleAnalyzeCollection(input: AnalyzeCollectionInput): Promise<AnalyzeCollectionResult> {
  try {
    const { collectionId } = input;

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

    // Extract basic info
    const metadataTimeline = collection.collectionMetadataTimeline as Array<Record<string, unknown>> | undefined;
    const metadata = (metadataTimeline?.[0]?.collectionMetadata as Record<string, unknown>)?.metadata as Record<string, unknown> | undefined;
    const name = (metadata?.name as string) || 'Unnamed';
    const description = (metadata?.description as string) || '';
    const manager = (collection.manager as string) || '';
    const standards = (collection.standards as string[]) || [];
    const validBadgeIds = collection.validBadgeIds as Array<{ start: string; end: string }> | undefined;
    const invariants = (collection.invariants as Record<string, unknown>) || {};
    const collType = detectCollectionType(collection);

    // Parse approvals
    const rawApprovals = (collection.collectionApprovals as Array<Record<string, unknown>>) || [];
    const parsedApprovals: ParsedApproval[] = rawApprovals.map(approval => {
      const from = (approval.fromListId as string) || 'All';
      const to = (approval.toListId as string) || 'All';
      const initiatedBy = (approval.initiatedByListId as string) || 'All';
      const criteria = (approval.approvalCriteria as Record<string, unknown>) || {};
      const type = classifyApproval(approval);
      const reqs = parseRequirements(criteria);

      return {
        approvalId: (approval.approvalId as string) || 'unknown',
        type,
        description: describeApproval(type, reqs, from, to),
        from: listIdToHuman(from),
        to: listIdToHuman(to),
        initiatedBy: listIdToHuman(initiatedBy),
        tokenIds: rangeToString(approval.tokenIds as Array<{ start: string; end: string }>),
        transferTimes: rangeToString(approval.transferTimes as Array<{ start: string; end: string }>),
        requirements: reqs
      };
    });

    // Determine transferability
    const hasTransferApproval = parsedApprovals.some(a => a.type === 'transfer');
    const hasMintApproval = parsedApprovals.some(a => a.type === 'mint');
    const hasBackingApproval = parsedApprovals.some(a => a.type === 'backing');
    const isSmartToken = collType === 'smart-token';

    const transferabilitySummary = [];
    if (hasMintApproval) transferabilitySummary.push('Mintable');
    if (hasBackingApproval) transferabilitySummary.push('IBC-backed deposit/withdraw');
    if (hasTransferApproval) transferabilitySummary.push('Freely transferable');
    if (!hasTransferApproval && !hasBackingApproval) transferabilitySummary.push('Non-transferable (soulbound)');

    // How to obtain
    const howToObtain: Array<{ method: string; steps: string[]; approvalId: string; prioritizedApprovals: Array<{ approvalId: string; approvalLevel: string; approverAddress: string }> }> = [];

    for (const approval of parsedApprovals) {
      if (approval.type === 'mint') {
        const steps: string[] = [];
        steps.push(`Use MsgTransferTokens with from: "Mint", collectionId: "${collectionId}"`);
        if (approval.requirements.payment) {
          const coins = approval.requirements.payment.coins.map(c => `${c.amount} ${c.denom}`).join(' + ');
          steps.push(`Include coinTransfers payment: ${coins} to ${approval.requirements.payment.to}`);
        }
        if (approval.requirements.mustOwnTokens) {
          for (const mot of approval.requirements.mustOwnTokens) {
            steps.push(`Must already own ≥${mot.amount} of collection ${mot.collectionId} tokens ${mot.tokenIds}`);
          }
        }
        if (approval.requirements.maxPerUser) {
          steps.push(`Limited to ${approval.requirements.maxPerUser} mint(s) per address`);
        }
        steps.push(`Set prioritizedApprovals to target approval "${approval.approvalId}"`);

        howToObtain.push({
          method: `Mint via "${approval.approvalId}"`,
          steps,
          approvalId: approval.approvalId,
          prioritizedApprovals: [{
            approvalId: approval.approvalId,
            approvalLevel: 'collection',
            approverAddress: ''
          }]
        });
      }

      if (approval.type === 'backing') {
        const ibcPath = invariants.cosmosCoinBackedPath as Record<string, unknown> | undefined;
        const denom = (ibcPath?.ibcDenom as string) || 'IBC denom';
        const backingAddr = (ibcPath?.backingAddress as string) || approval.from;
        const steps: string[] = [];
        steps.push(`Send ${denom} to backing address ${backingAddr} via IBC or bank transfer`);
        steps.push(`The protocol automatically mints corresponding collection tokens to your address`);
        steps.push(`This uses the "${approval.approvalId}" approval with mustPrioritize: true`);

        howToObtain.push({
          method: `Deposit IBC asset via "${approval.approvalId}"`,
          steps,
          approvalId: approval.approvalId,
          prioritizedApprovals: [{
            approvalId: approval.approvalId,
            approvalLevel: 'collection',
            approverAddress: ''
          }]
        });
      }
    }

    if (howToObtain.length === 0) {
      howToObtain.push({
        method: 'No active mint/deposit approvals found',
        steps: ['Tokens can only be obtained via transfer from existing holders, if transferable'],
        approvalId: '',
        prioritizedApprovals: []
      });
    }

    // How to transfer
    const howToTransfer: Array<{ method: string; steps: string[]; approvalId: string; prioritizedApprovals: Array<{ approvalId: string; approvalLevel: string; approverAddress: string }> }> = [];

    for (const approval of parsedApprovals) {
      if (approval.type === 'transfer') {
        const steps: string[] = [];
        steps.push(`Use MsgTransferTokens with from: your address, collectionId: "${collectionId}"`);
        if (approval.requirements.payment) {
          const coins = approval.requirements.payment.coins.map(c => `${c.amount} ${c.denom}`).join(' + ');
          steps.push(`Requires payment: ${coins} to ${approval.requirements.payment.to}`);
        }
        steps.push(`prioritizedApprovals: [{ approvalId: "${approval.approvalId}", approvalLevel: "collection", approverAddress: "" }] — or use [] if only one transfer approval exists`);

        howToTransfer.push({
          method: `Transfer via "${approval.approvalId}"`,
          steps,
          approvalId: approval.approvalId,
          prioritizedApprovals: [{
            approvalId: approval.approvalId,
            approvalLevel: 'collection',
            approverAddress: ''
          }]
        });
      }

      if (approval.type === 'unbacking') {
        const ibcPath = invariants.cosmosCoinBackedPath as Record<string, unknown> | undefined;
        const backingAddr = (ibcPath?.backingAddress as string) || '';
        const steps: string[] = [];
        steps.push(`Send collection tokens TO backing address ${backingAddr} via MsgTransferTokens`);
        steps.push(`The protocol automatically releases the underlying IBC asset to your address`);
        steps.push(`Must set prioritizedApprovals to target "${approval.approvalId}"`);

        howToTransfer.push({
          method: `Withdraw (unback) via "${approval.approvalId}"`,
          steps,
          approvalId: approval.approvalId,
          prioritizedApprovals: [{
            approvalId: approval.approvalId,
            approvalLevel: 'collection',
            approverAddress: ''
          }]
        });
      }
    }

    if (!hasTransferApproval && howToTransfer.length === 0) {
      howToTransfer.push({
        method: 'Non-transferable',
        steps: ['This collection does not allow transfers between users'],
        approvalId: '',
        prioritizedApprovals: []
      });
    }

    // Parse permissions
    const rawPermissions = (collection.collectionPermissions as Record<string, unknown>) || {};
    const permissions = parsePermissions(rawPermissions);

    // Invariants
    const ibcPath = invariants.cosmosCoinBackedPath as Record<string, unknown> | null | undefined;

    return {
      success: true,
      analysis: {
        collectionId,
        name,
        description,
        type: collType,
        manager,
        tokenIds: rangeToString(validBadgeIds),
        standards,
        transferability: {
          summary: transferabilitySummary.join(', '),
          isTransferable: hasTransferApproval,
          isMintable: hasMintApproval || hasBackingApproval,
          isSmartToken
        },
        approvals: parsedApprovals,
        howToObtain,
        howToTransfer,
        permissions,
        invariants: {
          maxSupplyPerId: (invariants.maxSupplyPerId as string) || '0',
          noCustomOwnershipTimes: (invariants.noCustomOwnershipTimes as boolean) || false,
          noForcefulPostMintTransfers: (invariants.noForcefulPostMintTransfers as boolean) || false,
          ibcBacking: ibcPath ? {
            denom: (ibcPath.ibcDenom as string) || '',
            backingAddress: (ibcPath.backingAddress as string) || ''
          } : null
        }
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to analyze collection: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
