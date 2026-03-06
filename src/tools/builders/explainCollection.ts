/**
 * Tool: explain_collection
 * Produces a human-readable markdown explanation of any collection.
 * Works on build results, raw transaction JSON, or on-chain query results.
 * No API key required — purely local analysis.
 */

const MAX_UINT64 = '18446744073709551615';

export const explainCollectionTool = {
  name: 'explain_collection',
  description: 'Generate a human-readable markdown explanation of a collection. Works on build results, transaction JSON, or on-chain query results. Covers: what it is, how to get tokens, what the manager can change, trust signals, and risk summary. No API key required.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      collection: {
        type: 'object',
        description: 'The collection to explain. Accepts: (1) A build result with transaction.messages, (2) A MsgUniversalUpdateCollection message, (3) A raw collection object from query_collection.'
      },
      question: {
        type: 'string',
        description: 'Optional specific question to answer about the collection (e.g., "can the manager freeze my tokens?", "how do I mint?", "is the supply fixed?"). If omitted, generates a full overview.'
      },
      audience: {
        type: 'string',
        enum: ['user', 'developer', 'auditor'],
        description: 'Target audience. "user" = non-technical, "developer" = technical details, "auditor" = security-focused. Default: "user".'
      }
    },
    required: ['collection']
  }
};

// --- Extraction helpers ---

interface CollectionData {
  creator: string;
  collectionId: string;
  manager: string;
  validTokenIds: { start: string; end: string }[];
  collectionPermissions: Record<string, PermEntry[]>;
  collectionApprovals: ApprovalData[];
  invariants: Record<string, unknown>;
  standards: string[];
  customData: string;
  collectionMetadata: { uri?: string; customData?: string };
  tokenMetadata: { uri?: string; customData?: string; tokenIds?: { start: string; end: string }[] }[];
  aliasPathsToAdd: Record<string, unknown>[];
  defaultBalances: Record<string, unknown>;
  isArchived: boolean;
}

interface PermEntry {
  permanentlyPermittedTimes?: { start: string; end: string }[];
  permanentlyForbiddenTimes?: { start: string; end: string }[];
  tokenIds?: { start: string; end: string }[];
  fromListId?: string;
  toListId?: string;
  initiatedByListId?: string;
  approvalId?: string;
}

interface ApprovalData {
  fromListId: string;
  toListId: string;
  initiatedByListId: string;
  transferTimes: { start: string; end: string }[];
  tokenIds: { start: string; end: string }[];
  ownershipTimes: { start: string; end: string }[];
  approvalId: string;
  approvalCriteria: Record<string, unknown>;
  uri: string;
  customData: string;
  version: string;
}

function extractCollection(input: Record<string, unknown>): CollectionData {
  // Unwrap nested structures
  let raw: Record<string, unknown> = input;

  // Handle { transaction: { messages: [...] } } from builders
  if (raw.transaction) {
    raw = raw.transaction as Record<string, unknown>;
  }
  // Handle { messages: [{ typeUrl, value }] }
  if (raw.messages && Array.isArray(raw.messages)) {
    const msg = (raw.messages as Record<string, unknown>[])[0];
    raw = (msg?.value || msg || raw) as Record<string, unknown>;
  }
  // Handle { typeUrl, value }
  if (raw.typeUrl && raw.value) {
    raw = raw.value as Record<string, unknown>;
  }

  // Handle on-chain format (timelines)
  if (raw.collectionMetadataTimeline && !raw.collectionMetadata) {
    const timeline = raw.collectionMetadataTimeline as Record<string, unknown>[];
    if (timeline[0]?.collectionMetadata) {
      raw.collectionMetadata = timeline[0].collectionMetadata;
    }
  }
  if (raw.managerTimeline && !raw.manager) {
    const timeline = raw.managerTimeline as Record<string, unknown>[];
    if (timeline[0]?.manager) {
      raw.manager = timeline[0].manager;
    }
  }
  if (raw.standardsTimeline && !raw.standards) {
    const timeline = raw.standardsTimeline as Record<string, unknown>[];
    if (timeline[0]?.standards) {
      raw.standards = timeline[0].standards;
    }
  }
  if (raw.isArchivedTimeline && raw.isArchived === undefined) {
    const timeline = raw.isArchivedTimeline as Record<string, unknown>[];
    if (timeline[0]?.isArchived !== undefined) {
      raw.isArchived = timeline[0].isArchived;
    }
  }
  if (raw.customDataTimeline && !raw.customData) {
    const timeline = raw.customDataTimeline as Record<string, unknown>[];
    if (timeline[0]?.customData) {
      raw.customData = timeline[0].customData;
    }
  }
  // On-chain uses validBadgeIds
  if (raw.validBadgeIds && !raw.validTokenIds) {
    raw.validTokenIds = raw.validBadgeIds;
  }

  return {
    creator: (raw.creator as string) || '',
    collectionId: (raw.collectionId as string) || '',
    manager: (raw.manager as string) || '',
    validTokenIds: (raw.validTokenIds as { start: string; end: string }[]) || [],
    collectionPermissions: (raw.collectionPermissions as Record<string, PermEntry[]>) || {},
    collectionApprovals: (raw.collectionApprovals as ApprovalData[]) || [],
    invariants: (raw.invariants as Record<string, unknown>) || {},
    standards: (raw.standards as string[]) || [],
    customData: (raw.customData as string) || '',
    collectionMetadata: (raw.collectionMetadata as { uri?: string; customData?: string }) || {},
    tokenMetadata: (raw.tokenMetadata as { uri?: string; customData?: string; tokenIds?: { start: string; end: string }[] }[]) || [],
    aliasPathsToAdd: (raw.aliasPathsToAdd as Record<string, unknown>[]) || [],
    defaultBalances: (raw.defaultBalances as Record<string, unknown>) || {},
    isArchived: (raw.isArchived as boolean) || false
  };
}

// --- Formatting helpers ---

function isForever(ranges: { start: string; end: string }[] | undefined): boolean {
  if (!ranges || ranges.length === 0) return false;
  return ranges.some(r => r.start === '1' && r.end === MAX_UINT64);
}

function isForbidden(entries: PermEntry[] | undefined): boolean {
  if (!entries || entries.length === 0) return false;
  return entries.some(e => isForever(e.permanentlyForbiddenTimes));
}

function isPermitted(entries: PermEntry[] | undefined): boolean {
  if (!entries || entries.length === 0) return false;
  return entries.some(e => isForever(e.permanentlyPermittedTimes));
}

function permState(entries: PermEntry[] | undefined): 'locked' | 'open' | 'undecided' {
  if (isForbidden(entries)) return 'locked';
  if (isPermitted(entries)) return 'open';
  return 'undecided';
}

function permEmoji(state: 'locked' | 'open' | 'undecided'): string {
  if (state === 'locked') return 'LOCKED';
  if (state === 'open') return 'OPEN';
  return 'UNDECIDED';
}

function rangeStr(ranges: { start: string; end: string }[] | undefined): string {
  if (!ranges || ranges.length === 0) return 'none';
  return ranges.map(r => {
    if (r.start === '1' && r.end === MAX_UINT64) return 'all';
    if (r.start === r.end) return `#${r.start}`;
    return `#${r.start}-#${r.end}`;
  }).join(', ');
}

function listIdHuman(id: string): string {
  if (id === 'All') return 'anyone';
  if (id === 'Mint') return 'the Mint address (new token creation)';
  if (id === '!Mint') return 'any holder (not Mint)';
  if (id === 'Total') return 'Total (aggregate tracker)';
  if (id.startsWith('!Mint:')) return `any holder except ${id.slice(6)}`;
  if (id.startsWith('!')) return `anyone except ${id.slice(1)}`;
  if (id.includes(':')) return id.split(':').join(' and ');
  if (id.startsWith('bb1')) return `address ${id.slice(0, 12)}...`;
  return id;
}

function detectType(col: CollectionData): string {
  const s = col.standards;
  if (s.some(x => x.toLowerCase().includes('subscription'))) return 'Subscription Token';
  if (s.some(x => x.toLowerCase().includes('ai agent stablecoin'))) return 'AI Agent Stablecoin';
  if (s.some(x => x.toLowerCase().includes('smart token')) || col.invariants.cosmosCoinBackedPath) return 'Smart Token (IBC-backed)';
  if (s.includes('NFTs')) return 'NFT Collection';
  if (s.includes('Fungible Tokens')) return 'Fungible Token';
  return 'Token Collection';
}

function countTokenIds(ranges: { start: string; end: string }[]): string {
  if (ranges.length === 0) return '0';
  let total = BigInt(0);
  for (const r of ranges) {
    const s = BigInt(r.start);
    const e = BigInt(r.end);
    total += e - s + BigInt(1);
  }
  if (total > BigInt(1000000)) return `${total.toString()} (very large range)`;
  return total.toString();
}

// --- Section builders ---

function buildOverview(col: CollectionData): string {
  const type = detectType(col);
  const tokenCount = countTokenIds(col.validTokenIds);
  const maxSupply = (col.invariants.maxSupplyPerId as string) || '0';

  let lines = `## Overview\n\n`;
  lines += `- **Type**: ${type}\n`;
  lines += `- **Collection ID**: ${col.collectionId || '(new — not yet deployed)'}\n`;
  lines += `- **Manager**: ${col.manager || '(none)'}\n`;
  lines += `- **Token IDs**: ${rangeStr(col.validTokenIds)} (${tokenCount} unique IDs)\n`;
  lines += `- **Max supply per ID**: ${maxSupply === '0' ? 'Unlimited' : maxSupply}\n`;
  lines += `- **Standards**: ${col.standards.length > 0 ? col.standards.join(', ') : '(none set)'}\n`;

  if (col.isArchived) {
    lines += `- **Status**: ARCHIVED — this collection is no longer active\n`;
  }

  // Describe in plain language
  lines += `\n### What is this?\n\n`;
  if (type === 'NFT Collection') {
    lines += `This is an NFT collection with ${tokenCount} unique tokens. Each token ID has a maximum supply of ${maxSupply === '1' ? '1 (each is truly unique)' : maxSupply}.`;
  } else if (type.includes('Smart Token')) {
    const backing = col.invariants.cosmosCoinBackedPath as Record<string, unknown> | undefined;
    const conversion = backing?.conversion as Record<string, unknown> | undefined;
    const sideA = conversion?.sideA as Record<string, unknown> | undefined;
    const denom = (sideA?.denom as string) || 'an IBC asset';
    lines += `This is a smart token backed 1:1 by ${denom}. Users can deposit the IBC asset to receive collection tokens, and withdraw collection tokens to get the IBC asset back.`;
  } else if (type === 'Fungible Token') {
    lines += `This is a fungible token (like ERC-20). All tokens are interchangeable. ${maxSupply === '0' ? 'There is no supply cap.' : `Maximum supply: ${maxSupply}.`}`;
  } else if (type === 'Subscription Token') {
    lines += `This is a subscription token. Holding it grants access to something for a time period. It may require periodic renewal/payment.`;
  } else if (type === 'AI Agent Stablecoin') {
    lines += `This is an AI agent-managed stablecoin vault. An AI agent manages the vault and controls minting/burning.`;
  } else {
    lines += `This is a token collection on BitBadges.`;
  }

  return lines + '\n';
}

function buildHowToGetTokens(col: CollectionData): string {
  const approvals = col.collectionApprovals;
  let lines = `## How to Get Tokens\n\n`;

  const mintApprovals = approvals.filter(a => a.fromListId === 'Mint');
  const backingApprovals = approvals.filter(a =>
    a.approvalCriteria?.allowBackedMinting && a.fromListId && !a.fromListId.startsWith('!')
  );

  if (mintApprovals.length === 0 && backingApprovals.length === 0) {
    lines += `There are no active minting or deposit approvals. Tokens can only be obtained via transfer from existing holders (if the collection is transferable).\n`;
    return lines + '\n';
  }

  for (const approval of mintApprovals) {
    const criteria = approval.approvalCriteria || {};
    lines += `### Mint: "${approval.approvalId}"\n\n`;

    // Who can mint
    lines += `- **Who can mint**: ${listIdHuman(approval.initiatedByListId)}\n`;
    lines += `- **Recipients**: ${listIdHuman(approval.toListId)}\n`;
    lines += `- **Token IDs**: ${rangeStr(approval.tokenIds)}\n`;

    // Payment
    const coinTransfers = criteria.coinTransfers as Array<Record<string, unknown>> | undefined;
    if (coinTransfers && coinTransfers.length > 0) {
      const ct = coinTransfers[0];
      const coins = (ct.coins as Array<{ denom: string; amount: string }>) || [];
      const costStr = coins.map(c => `${c.amount} ${c.denom}`).join(' + ');
      lines += `- **Cost**: ${costStr} per mint\n`;
      lines += `- **Payment goes to**: ${ct.to || 'manager'}\n`;
    } else {
      lines += `- **Cost**: Free\n`;
    }

    // Limits
    const amounts = criteria.approvalAmounts as Record<string, unknown> | undefined;
    const maxNum = criteria.maxNumTransfers as Record<string, unknown> | undefined;
    if (amounts?.overallApprovalAmount && amounts.overallApprovalAmount !== '0') {
      lines += `- **Total supply cap**: ${amounts.overallApprovalAmount} tokens\n`;
    }
    if (amounts?.perInitiatedByAddressApprovalAmount && amounts.perInitiatedByAddressApprovalAmount !== '0') {
      lines += `- **Max per user**: ${amounts.perInitiatedByAddressApprovalAmount} tokens\n`;
    }
    if (maxNum?.overallMaxNumTransfers && maxNum.overallMaxNumTransfers !== '0') {
      lines += `- **Total mint transactions**: ${maxNum.overallMaxNumTransfers}\n`;
    }
    if (maxNum?.perInitiatedByAddressMaxNumTransfers && maxNum.perInitiatedByAddressMaxNumTransfers !== '0') {
      lines += `- **Mints per user**: ${maxNum.perInitiatedByAddressMaxNumTransfers}\n`;
    }

    // Ownership gate
    const mustOwn = criteria.mustOwnTokens as Array<Record<string, unknown>> | undefined;
    if (mustOwn && mustOwn.length > 0) {
      for (const mot of mustOwn) {
        const amtRange = mot.amountRange as { start: string; end: string } | undefined;
        lines += `- **Requirement**: Must own >= ${amtRange?.start || '1'} of collection ${mot.collectionId} tokens\n`;
      }
    }

    // Predetermined
    if (criteria.predeterminedBalances) {
      lines += `- **Distribution**: Sequential allocation (each minter gets the next token in sequence)\n`;
    }

    lines += '\n';
  }

  for (const approval of backingApprovals) {
    lines += `### Deposit: "${approval.approvalId}"\n\n`;
    const backing = col.invariants.cosmosCoinBackedPath as Record<string, unknown> | undefined;
    const conversion = backing?.conversion as Record<string, unknown> | undefined;
    const sideA = conversion?.sideA as Record<string, unknown> | undefined;
    const denom = (sideA?.denom as string) || 'the IBC asset';

    lines += `- **How**: Send ${denom} to the backing address to receive collection tokens\n`;
    lines += `- **Rate**: 1:1 (each unit of ${denom} gives 1 collection token)\n`;
    lines += `- **Who can deposit**: ${listIdHuman(approval.toListId)}\n`;
    lines += '\n';
  }

  return lines;
}

function buildTransferability(col: CollectionData): string {
  const approvals = col.collectionApprovals;
  let lines = `## Transferability\n\n`;

  const transferApprovals = approvals.filter(a =>
    a.fromListId !== 'Mint' &&
    !a.approvalCriteria?.allowBackedMinting
  );

  const unbackingApprovals = approvals.filter(a =>
    a.approvalCriteria?.allowBackedMinting &&
    a.fromListId?.startsWith('!')
  );

  if (transferApprovals.length === 0 && unbackingApprovals.length === 0) {
    lines += `**Non-transferable (soulbound)**: Once minted, tokens cannot be sent to another address.\n\n`;
    return lines;
  }

  for (const approval of transferApprovals) {
    const criteria = approval.approvalCriteria || {};
    lines += `### Transfer: "${approval.approvalId}"\n\n`;
    lines += `- **From**: ${listIdHuman(approval.fromListId)}\n`;
    lines += `- **To**: ${listIdHuman(approval.toListId)}\n`;
    lines += `- **Initiated by**: ${listIdHuman(approval.initiatedByListId)}\n`;

    // Check for forceful transfers
    if (approval.fromListId === 'All' && approval.initiatedByListId === 'All' && !criteria.requireToEqualsInitiatedBy) {
      lines += `- **WARNING**: This approval allows ANYONE to move tokens FROM any holder. This means forceful transfers/seizure are possible.\n`;
    }

    // Payment for transfer
    const coinTransfers = criteria.coinTransfers as Array<Record<string, unknown>> | undefined;
    if (coinTransfers && coinTransfers.length > 0) {
      const ct = coinTransfers[0];
      const coins = (ct.coins as Array<{ denom: string; amount: string }>) || [];
      const costStr = coins.map(c => `${c.amount} ${c.denom}`).join(' + ');
      lines += `- **Transfer fee**: ${costStr}\n`;
    } else {
      lines += `- **Transfer fee**: None (free transfers)\n`;
    }

    lines += '\n';
  }

  for (const approval of unbackingApprovals) {
    lines += `### Withdraw: "${approval.approvalId}"\n\n`;
    const backing = col.invariants.cosmosCoinBackedPath as Record<string, unknown> | undefined;
    const conversion = backing?.conversion as Record<string, unknown> | undefined;
    const sideA = conversion?.sideA as Record<string, unknown> | undefined;
    const denom = (sideA?.denom as string) || 'the IBC asset';

    lines += `- **How**: Send collection tokens to the backing address to receive ${denom} back\n`;
    lines += `- **Who can withdraw**: ${listIdHuman(approval.fromListId)}\n`;

    // Withdrawal limits
    const amounts = approval.approvalCriteria?.approvalAmounts as Record<string, unknown> | undefined;
    if (amounts) {
      if (amounts.overallApprovalAmount && amounts.overallApprovalAmount !== '0') {
        lines += `- **Total withdrawal limit**: ${amounts.overallApprovalAmount}\n`;
      }
      if (amounts.perFromAddressApprovalAmount && amounts.perFromAddressApprovalAmount !== '0') {
        const reset = amounts.resetTimeIntervals as Record<string, unknown> | undefined;
        const interval = (reset?.intervalLength as string) || '0';
        if (interval !== '0') {
          const hours = Math.round(parseInt(interval) / 3600000);
          lines += `- **Per-user limit**: ${amounts.perFromAddressApprovalAmount} per ${hours} hours\n`;
        } else {
          lines += `- **Per-user limit**: ${amounts.perFromAddressApprovalAmount} total\n`;
        }
      }
    }

    lines += '\n';
  }

  // Invariant
  if (col.invariants.noForcefulPostMintTransfers) {
    lines += `**Safety guarantee**: The \`noForcefulPostMintTransfers\` invariant is set. No one can forcefully move tokens from holders after minting.\n\n`;
  }

  return lines;
}

function buildPermissionsSection(col: CollectionData, audience: string): string {
  const perms = col.collectionPermissions;
  let lines = `## What Can the Manager Change?\n\n`;
  lines += `The manager (${col.manager || 'not set'}) has the following control:\n\n`;

  const permDescriptions: Record<string, { label: string; userDesc: string }> = {
    canDeleteCollection: { label: 'Delete collection', userDesc: 'Permanently destroy the entire collection and all tokens' },
    canArchiveCollection: { label: 'Archive collection', userDesc: 'Mark the collection as archived (inactive)' },
    canUpdateStandards: { label: 'Change standards', userDesc: 'Change what type of collection this is (NFT, fungible, etc.)' },
    canUpdateCustomData: { label: 'Update custom data', userDesc: 'Change the custom JSON data stored on the collection' },
    canUpdateManager: { label: 'Transfer management', userDesc: 'Hand over management control to a different address' },
    canUpdateCollectionMetadata: { label: 'Update collection info', userDesc: 'Change the collection name, description, and image' },
    canUpdateValidTokenIds: { label: 'Create new token IDs', userDesc: 'Add new token IDs (this creates new supply that can be minted)' },
    canUpdateTokenMetadata: { label: 'Update token metadata', userDesc: 'Change individual token names, images, and descriptions' },
    canUpdateCollectionApprovals: { label: 'Change transfer rules', userDesc: 'Modify who can mint, transfer, or receive tokens — the most powerful permission' },
    canAddMoreAliasPaths: { label: 'Add alias paths', userDesc: 'Add new trading pairs for liquidity pools' },
    canAddMoreCosmosCoinWrapperPaths: { label: 'Add IBC backing paths', userDesc: 'Add new IBC asset backing configurations' }
  };

  lines += `| What | Status | Meaning |\n`;
  lines += `|------|--------|--------|\n`;

  const permKeys = Object.keys(permDescriptions);
  let lockedCount = 0;
  let openCount = 0;
  let undecidedCount = 0;

  for (const key of permKeys) {
    const state = permState(perms[key]);
    const desc = permDescriptions[key];
    const stateLabel = permEmoji(state);

    if (state === 'locked') lockedCount++;
    else if (state === 'open') openCount++;
    else undecidedCount++;

    let meaning: string;
    if (state === 'locked') {
      meaning = 'Permanently frozen — can never be done';
    } else if (state === 'open') {
      meaning = `Manager CAN ${desc.userDesc.toLowerCase()}`;
    } else {
      meaning = `Currently allowed — manager could lock or keep open later`;
    }

    lines += `| ${desc.label} | ${stateLabel} | ${meaning} |\n`;
  }

  lines += `\n`;

  // Trust summary
  lines += `### Trust Summary\n\n`;
  lines += `- **${lockedCount}** of 11 permissions are permanently LOCKED (cannot change)\n`;
  lines += `- **${openCount}** are permanently OPEN (manager can always use)\n`;
  lines += `- **${undecidedCount}** are UNDECIDED (currently allowed, could be locked later)\n\n`;

  if (lockedCount === 11) {
    lines += `**Fully immutable** — the manager cannot change anything about this collection. Maximum trust.\n\n`;
  } else if (lockedCount >= 8) {
    lines += `**Mostly immutable** — only ${11 - lockedCount} aspects can be changed. Good trust level.\n\n`;
  } else if (lockedCount >= 5) {
    lines += `**Partially locked** — the manager retains significant control. Review what's open carefully.\n\n`;
  } else {
    lines += `**Highly mutable** — the manager can change most things. Only trust this collection if you trust the manager.\n\n`;
  }

  // Critical permission callouts
  const approvalState = permState(perms.canUpdateCollectionApprovals);
  if (approvalState !== 'locked') {
    lines += `**Important**: Transfer rules are ${approvalState === 'open' ? 'permanently changeable' : 'currently changeable'}. `;
    const hasMint = col.collectionApprovals.some(a => a.fromListId === 'Mint');
    if (hasMint) {
      lines += `Since the collection has mint approvals, the manager could potentially change minting rules (add unlimited minting, change prices, etc.).`;
    } else {
      lines += `The manager could add new transfer rules or modify existing ones.`;
    }
    lines += '\n\n';
  }

  const validTokenState = permState(perms.canUpdateValidTokenIds);
  if (validTokenState !== 'locked') {
    lines += `**Important**: Token ID creation is ${validTokenState === 'open' ? 'permanently allowed' : 'currently allowed'}. The manager can create new token IDs, which means new supply can be minted.\n\n`;
  }

  const managerState = permState(perms.canUpdateManager);
  if (managerState !== 'locked') {
    lines += `**Note**: Management can be transferred to another address.\n\n`;
  }

  if (audience === 'auditor') {
    // Extra detail for auditors: scoped approval permissions
    const approvalPerms = perms.canUpdateCollectionApprovals || [];
    if (approvalPerms.length > 1) {
      lines += `### Scoped Approval Permissions (Auditor Detail)\n\n`;
      lines += `The approval permission has ${approvalPerms.length} scoped entries:\n\n`;
      for (let i = 0; i < approvalPerms.length; i++) {
        const entry = approvalPerms[i];
        const state = isForever(entry.permanentlyForbiddenTimes) ? 'FORBIDDEN' :
                     isForever(entry.permanentlyPermittedTimes) ? 'PERMITTED' : 'NEUTRAL';
        lines += `${i + 1}. from=${entry.fromListId || 'All'}, to=${entry.toListId || 'All'}, approvalId=${entry.approvalId || 'All'} → ${state}\n`;
      }
      lines += '\n';
    }
  }

  return lines;
}

function buildInvariantsSection(col: CollectionData): string {
  const inv = col.invariants;
  let lines = `## Safety Guarantees (Invariants)\n\n`;
  lines += `These are on-chain guarantees that cannot be changed once set:\n\n`;

  const maxSupply = (inv.maxSupplyPerId as string) || '0';
  lines += `- **Max supply per token ID**: ${maxSupply === '0' ? 'No limit' : maxSupply}\n`;
  lines += `- **No forceful post-mint transfers**: ${inv.noForcefulPostMintTransfers ? 'Yes — tokens cannot be forcefully seized after minting' : 'No — forceful transfers may be possible'}\n`;
  lines += `- **No custom ownership times**: ${inv.noCustomOwnershipTimes ? 'Yes — simplified time model' : 'No — custom ownership time windows allowed'}\n`;
  lines += `- **Pool creation disabled**: ${inv.disablePoolCreation ? 'Yes — no liquidity pools' : 'No — liquidity pools allowed'}\n`;

  if (inv.cosmosCoinBackedPath) {
    const backing = inv.cosmosCoinBackedPath as Record<string, unknown>;
    const conversion = backing.conversion as Record<string, unknown> | undefined;
    const sideA = conversion?.sideA as Record<string, unknown> | undefined;
    const denom = (sideA?.denom as string) || 'unknown';
    lines += `- **IBC backing**: Backed 1:1 by ${denom}\n`;
  }

  lines += '\n';
  return lines;
}

function buildRiskSummary(col: CollectionData): string {
  let lines = `## Risk Summary\n\n`;
  const risks: { level: string; text: string }[] = [];
  const positives: string[] = [];

  const perms = col.collectionPermissions;
  const approvals = col.collectionApprovals;

  // Positive signals
  if (isForbidden(perms.canDeleteCollection)) positives.push('Collection cannot be deleted');
  if (isForbidden(perms.canUpdateManager)) positives.push('Manager cannot be changed');
  if (isForbidden(perms.canUpdateCollectionApprovals)) positives.push('Transfer/mint rules are permanently frozen');
  if (isForbidden(perms.canUpdateValidTokenIds)) positives.push('No new token IDs can be created');
  if (col.invariants.noForcefulPostMintTransfers) positives.push('No forceful seizure of tokens possible');

  // Risk signals
  if (!isForbidden(perms.canUpdateCollectionApprovals)) {
    const hasMint = approvals.some(a => a.fromListId === 'Mint');
    if (hasMint) {
      risks.push({ level: 'HIGH', text: 'Manager can modify minting rules — supply is not guaranteed to be fixed' });
    }
    risks.push({ level: 'MEDIUM', text: 'Manager can change who can transfer tokens and under what conditions' });
  }

  if (!isForbidden(perms.canUpdateValidTokenIds)) {
    risks.push({ level: 'MEDIUM', text: 'Manager can create new token IDs (new supply)' });
  }

  if (!isForbidden(perms.canUpdateManager)) {
    risks.push({ level: 'LOW', text: 'Management could be transferred to an unknown address' });
  }

  if (isPermitted(perms.canDeleteCollection)) {
    risks.push({ level: 'HIGH', text: 'Collection can be permanently deleted by the manager' });
  }

  // Forceful transfer check
  const forcefulApprovals = approvals.filter(a =>
    a.fromListId === 'All' &&
    a.initiatedByListId === 'All' &&
    !a.approvalCriteria?.requireToEqualsInitiatedBy
  );
  if (forcefulApprovals.length > 0 && !col.invariants.noForcefulPostMintTransfers) {
    risks.push({ level: 'HIGH', text: 'Tokens can be forcefully moved from any holder by anyone' });
  }

  // Unlimited mint check
  for (const a of approvals) {
    if (a.fromListId !== 'Mint') continue;
    const criteria = a.approvalCriteria || {};
    const amounts = criteria.approvalAmounts as Record<string, unknown> | undefined;
    const transfers = criteria.maxNumTransfers as Record<string, unknown> | undefined;
    const predetermined = criteria.predeterminedBalances as Record<string, unknown> | undefined;

    const hasLimit = (amounts && amounts.overallApprovalAmount && amounts.overallApprovalAmount !== '0') ||
                     (transfers && transfers.overallMaxNumTransfers && transfers.overallMaxNumTransfers !== '0') ||
                     (predetermined && Object.keys(predetermined).length > 0);
    if (!hasLimit) {
      risks.push({ level: 'HIGH', text: `Mint approval "${a.approvalId}" has no supply cap — unlimited tokens can be minted` });
    }
  }

  if (positives.length > 0) {
    lines += `### Trust Signals\n`;
    for (const p of positives) {
      lines += `- ${p}\n`;
    }
    lines += '\n';
  }

  if (risks.length > 0) {
    lines += `### Risks to Consider\n`;
    for (const r of risks) {
      lines += `- **[${r.level}]** ${r.text}\n`;
    }
    lines += '\n';
  } else {
    lines += `### No significant risks identified.\n\n`;
  }

  return lines;
}

function buildQuestionAnswer(col: CollectionData, question: string): string {
  const q = question.toLowerCase();
  let lines = `## Answer\n\n`;
  lines += `> ${question}\n\n`;

  const perms = col.collectionPermissions;
  const approvals = col.collectionApprovals;

  // Supply questions
  if (q.includes('supply') || q.includes('inflation') || q.includes('fixed') || q.includes('how many')) {
    const maxSupply = (col.invariants.maxSupplyPerId as string) || '0';
    const tokenCount = countTokenIds(col.validTokenIds);
    const canAddIds = !isForbidden(perms.canUpdateValidTokenIds);
    const canChangeApprovals = !isForbidden(perms.canUpdateCollectionApprovals);

    lines += `**Token IDs**: ${tokenCount} (${rangeStr(col.validTokenIds)})\n`;
    lines += `**Max supply per ID**: ${maxSupply === '0' ? 'Unlimited' : maxSupply}\n\n`;

    if (!canAddIds && isForbidden(perms.canUpdateCollectionApprovals)) {
      lines += `The supply is **fixed**. No new token IDs can be created and minting rules cannot be changed.\n`;
    } else {
      lines += `The supply is **NOT guaranteed to be fixed**:\n`;
      if (canAddIds) lines += `- The manager can create new token IDs\n`;
      if (canChangeApprovals) lines += `- The manager can modify minting rules\n`;
    }
    return lines + '\n';
  }

  // Transfer/send questions
  if (q.includes('transfer') || q.includes('send') || q.includes('move') || q.includes('tradeable') || q.includes('tradable')) {
    const transferApprovals = approvals.filter(a => a.fromListId !== 'Mint' && !a.approvalCriteria?.allowBackedMinting);
    if (transferApprovals.length === 0) {
      lines += `**Non-transferable (soulbound)**. Tokens cannot be sent to another address after minting.\n`;
    } else {
      lines += `**Transferable**. Transfers are allowed via:\n\n`;
      for (const a of transferApprovals) {
        lines += `- "${a.approvalId}": ${listIdHuman(a.fromListId)} → ${listIdHuman(a.toListId)} (initiated by ${listIdHuman(a.initiatedByListId)})\n`;
      }
    }
    return lines + '\n';
  }

  // Mint questions
  if (q.includes('mint') || q.includes('get') || q.includes('obtain') || q.includes('buy') || q.includes('acquire')) {
    return buildHowToGetTokens(col);
  }

  // Manager/admin/control questions
  if (q.includes('manager') || q.includes('admin') || q.includes('control') || q.includes('centralize') || q.includes('owner') || q.includes('who can change')) {
    return buildPermissionsSection(col, 'user');
  }

  // Freeze/seize/revoke questions
  if (q.includes('freeze') || q.includes('seize') || q.includes('revoke') || q.includes('confiscate') || q.includes('forceful')) {
    if (col.invariants.noForcefulPostMintTransfers) {
      lines += `**No**. The \`noForcefulPostMintTransfers\` invariant is set. No one can forcefully move your tokens after minting.\n`;
    } else {
      const forceful = approvals.filter(a =>
        a.fromListId === 'All' && a.initiatedByListId === 'All' && !a.approvalCriteria?.requireToEqualsInitiatedBy
      );
      if (forceful.length > 0) {
        lines += `**Yes — forceful transfers are possible**. There are approvals that allow anyone to move tokens from any holder.\n`;
      } else {
        lines += `The invariant \`noForcefulPostMintTransfers\` is not set, but there are currently no approvals enabling forceful transfers. `;
        if (!isForbidden(perms.canUpdateCollectionApprovals)) {
          lines += `However, the manager COULD add such approvals in the future since transfer rules are not locked.\n`;
        } else {
          lines += `Transfer rules are locked, so this cannot change.\n`;
        }
      }
    }
    return lines + '\n';
  }

  // Permission questions
  if (q.includes('permission') || q.includes('immutable') || q.includes('locked') || q.includes('frozen') || q.includes('trust')) {
    return buildPermissionsSection(col, 'user');
  }

  // Risk/safety questions
  if (q.includes('risk') || q.includes('safe') || q.includes('secure') || q.includes('rug') || q.includes('scam')) {
    return buildRiskSummary(col);
  }

  // Default: give a broad answer
  lines += `Here's what I can tell you about this collection:\n\n`;
  lines += buildOverview(col);
  lines += `For more specific information, try asking about: supply, transfers, minting, manager control, permissions, or risks.\n`;
  return lines;
}

// --- Main handler ---

export function handleExplainCollection(input: {
  collection: Record<string, unknown>;
  question?: string;
  audience?: string;
}): { success: boolean; explanation: string; error?: string } {
  try {
    const col = extractCollection(input.collection);
    const audience = input.audience || 'user';

    // If a specific question, answer it directly
    if (input.question) {
      const answer = buildQuestionAnswer(col, input.question);
      return { success: true, explanation: answer };
    }

    // Full report
    let report = `# Collection Report\n\n`;
    report += buildOverview(col);
    report += buildHowToGetTokens(col);
    report += buildTransferability(col);
    report += buildPermissionsSection(col, audience);
    report += buildInvariantsSection(col);
    report += buildRiskSummary(col);

    // Developer extras
    if (audience === 'developer') {
      report += `## Developer Notes\n\n`;
      report += `- **Collection ID**: ${col.collectionId || '0 (new)'}\n`;
      report += `- **Creator**: ${col.creator}\n`;
      report += `- **Custom Data**: ${col.customData || '(empty)'}\n`;
      report += `- **Alias Paths**: ${col.aliasPathsToAdd.length}\n`;
      report += `- **Approval Count**: ${col.collectionApprovals.length}\n`;

      report += `\n### Approval IDs\n`;
      for (const a of col.collectionApprovals) {
        const criteria = a.approvalCriteria || {};
        const flags: string[] = [];
        if (criteria.allowBackedMinting) flags.push('backed');
        if (criteria.mustPrioritize) flags.push('mustPrioritize');
        if (criteria.overridesFromOutgoingApprovals) flags.push('overridesOutgoing');
        if (criteria.coinTransfers) flags.push('payment');
        if (criteria.predeterminedBalances) flags.push('predetermined');
        report += `- \`${a.approvalId}\`: ${a.fromListId} → ${a.toListId} (by ${a.initiatedByListId}) ${flags.length > 0 ? `[${flags.join(', ')}]` : ''}\n`;
      }
      report += '\n';
    }

    return { success: true, explanation: report };
  } catch (error) {
    return {
      success: false,
      explanation: '',
      error: `Failed to explain collection: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
