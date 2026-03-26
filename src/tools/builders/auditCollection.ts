/**
 * Tool: audit_collection
 * Audits a MsgUniversalUpdateCollection for security risks, design flaws, and common gotchas.
 * Returns categorized findings with severity levels.
 */

const MAX_UINT64 = '18446744073709551615';

type Severity = 'critical' | 'warning' | 'info';

interface AuditFinding {
  severity: Severity;
  category: string;
  title: string;
  detail: string;
  recommendation: string;
}

interface PermissionEntry {
  permanentlyPermittedTimes?: { start: string; end: string }[];
  permanentlyForbiddenTimes?: { start: string; end: string }[];
  tokenIds?: { start: string; end: string }[];
  fromListId?: string;
  toListId?: string;
  initiatedByListId?: string;
  approvalId?: string;
  transferTimes?: { start: string; end: string }[];
  ownershipTimes?: { start: string; end: string }[];
}

interface ApprovalEntry {
  fromListId?: string;
  toListId?: string;
  initiatedByListId?: string;
  transferTimes?: { start: string; end: string }[];
  tokenIds?: { start: string; end: string }[];
  ownershipTimes?: { start: string; end: string }[];
  approvalId?: string;
  approvalCriteria?: Record<string, unknown>;
  version?: string;
  uri?: string;
  customData?: string;
}

interface CollectionValue {
  creator?: string;
  collectionId?: string;
  manager?: string;
  validTokenIds?: { start: string; end: string }[];
  collectionPermissions?: Record<string, PermissionEntry[]>;
  collectionApprovals?: ApprovalEntry[];
  invariants?: Record<string, unknown>;
  standards?: string[];
  customData?: string;
  collectionMetadata?: { uri?: string; customData?: string };
  tokenMetadata?: { uri?: string; customData?: string; tokenIds?: { start: string; end: string }[] }[];
  aliasPathsToAdd?: Record<string, unknown>[];
  cosmosCoinWrapperPathsToAdd?: unknown[];
  isArchived?: boolean;
  defaultBalances?: Record<string, unknown>;
  [key: string]: unknown;
}

export const auditCollectionTool = {
  name: 'audit_collection',
  description: 'Audit a collection transaction or on-chain collection for security risks, design flaws, and common gotchas. Pass either a MsgUniversalUpdateCollection message or a raw collection object. Returns categorized findings with severity levels (critical/warning/info).',
  inputSchema: {
    type: 'object' as const,
    properties: {
      collection: {
        type: 'object',
        description: 'The collection to audit. Can be: (1) A MsgUniversalUpdateCollection message object with typeUrl and value, (2) The value field directly, or (3) A raw collection object from query_collection.'
      },
      context: {
        type: 'string',
        description: 'Optional context about the intended use case (e.g., "NFT art collection", "stablecoin vault", "subscription token"). Helps tailor findings.'
      }
    },
    required: ['collection']
  }
};

// --- Permission helpers ---

function isForever(ranges: { start: string; end: string }[] | undefined): boolean {
  if (!ranges || ranges.length === 0) return false;
  return ranges.some(r => r.start === '1' && r.end === MAX_UINT64);
}

function isForbidden(entries: PermissionEntry[] | undefined): boolean {
  if (!entries || entries.length === 0) return false; // neutral
  return entries.some(e => isForever(e.permanentlyForbiddenTimes));
}

function isPermitted(entries: PermissionEntry[] | undefined): boolean {
  if (!entries || entries.length === 0) return false; // neutral
  return entries.some(e => isForever(e.permanentlyPermittedTimes));
}

function isNeutral(entries: PermissionEntry[] | undefined): boolean {
  if (!entries || entries.length === 0) return true;
  // Neutral if no forever forbidden or permitted
  return !isForbidden(entries) && !isPermitted(entries);
}

function permissionState(entries: PermissionEntry[] | undefined): string {
  if (isForbidden(entries)) return 'FORBIDDEN';
  if (isPermitted(entries)) return 'PERMITTED';
  return 'NEUTRAL';
}

// --- Special address helpers ---

function isSpecialAddress(addr: string): { special: boolean; type: string } {
  if (addr === 'Mint') return { special: true, type: 'Mint (token creation source)' };
  if (addr === 'All') return { special: true, type: 'All (everyone)' };
  if (addr === '!Mint') return { special: true, type: '!Mint (everyone except Mint)' };
  if (addr === 'Total') return { special: true, type: 'Total (aggregate tracker)' };
  if (addr.startsWith('!')) return { special: true, type: `Negated list (${addr})` };
  if (addr.includes(':')) return { special: true, type: `Compound list (${addr})` };
  return { special: false, type: 'regular address' };
}

// --- Main audit function ---

function extractCollection(input: Record<string, unknown>): CollectionValue {
  // Handle MsgUniversalUpdateCollection wrapper
  if (input.typeUrl || input.messages) {
    const messages = input.messages as Record<string, unknown>[] | undefined;
    if (messages && messages.length > 0) {
      const msg = messages[0] as Record<string, unknown>;
      return (msg.value || msg) as CollectionValue;
    }
    return (input.value || input) as CollectionValue;
  }
  // Handle transaction wrapper { messages: [...] }
  if (input.transaction) {
    return extractCollection(input.transaction as Record<string, unknown>);
  }
  return input as CollectionValue;
}

export function handleAuditCollection(input: { collection: Record<string, unknown>; context?: string }): {
  success: boolean;
  findings: AuditFinding[];
  summary: { critical: number; warning: number; info: number; verdict: string };
  permissionSummary: Record<string, string>;
  approvalSummary: string[];
  error?: string;
} {
  try {
    const col = extractCollection(input.collection);
    const findings: AuditFinding[] = [];
    const context = (input.context || '').toLowerCase();

    const perms = col.collectionPermissions || {};
    const approvals = col.collectionApprovals || [];
    const invariants = (col.invariants || {}) as Record<string, unknown>;

    // ========================================
    // 1. MANAGER & CENTRALIZATION ANALYSIS
    // ========================================

    // 1a. Manager exists
    if (col.manager) {
      const managerState = permissionState(perms.canUpdateManager);
      if (managerState === 'NEUTRAL') {
        findings.push({
          severity: 'warning',
          category: 'centralization',
          title: 'Manager change permission is NEUTRAL',
          detail: `Manager is ${col.manager}. The canUpdateManager permission is neutral, meaning the manager could lock or transfer manager control at any time.`,
          recommendation: 'Set canUpdateManager to FORBIDDEN to prevent manager address changes, or to PERMITTED if intentional.'
        });
      } else if (managerState === 'PERMITTED') {
        findings.push({
          severity: 'warning',
          category: 'centralization',
          title: 'Manager can be changed permanently',
          detail: 'canUpdateManager is PERMITTED. The current manager can transfer control to any address at any time.',
          recommendation: 'This is valid for multi-sig rotation or planned ownership transfer. Otherwise, set to FORBIDDEN.'
        });
      }
    }

    // 1b. What can the manager actually do? Audit each permission
    const permNames = [
      'canDeleteCollection', 'canArchiveCollection', 'canUpdateStandards',
      'canUpdateCustomData', 'canUpdateManager', 'canUpdateCollectionMetadata',
      'canUpdateValidTokenIds', 'canUpdateTokenMetadata',
      'canUpdateCollectionApprovals', 'canAddMoreAliasPaths', 'canAddMoreCosmosCoinWrapperPaths'
    ];

    const neutralPerms = permNames.filter(p => isNeutral(perms[p]));
    const permittedPerms = permNames.filter(p => isPermitted(perms[p]));

    if (neutralPerms.length > 0) {
      findings.push({
        severity: 'info',
        category: 'centralization',
        title: `${neutralPerms.length} permission(s) are NEUTRAL (undecided)`,
        detail: `Neutral permissions: ${neutralPerms.join(', ')}. These can be changed to forbidden or permitted at any time by the manager.`,
        recommendation: 'Consider locking permissions you are confident about. Neutral permissions signal uncertainty to users.'
      });
    }

    // ========================================
    // 2. SUPPLY CONTROL & INFLATION
    // ========================================

    // 2a. canUpdateValidTokenIds
    const validTokenIdState = permissionState(perms.canUpdateValidTokenIds);
    if (validTokenIdState !== 'FORBIDDEN') {
      findings.push({
        severity: 'warning',
        category: 'supply',
        title: 'Token ID creation is not locked',
        detail: `canUpdateValidTokenIds is ${validTokenIdState}. The manager can add new token IDs, which creates new supply.`,
        recommendation: 'Set canUpdateValidTokenIds to FORBIDDEN if supply should be fixed. Even with locked mint approvals, new token IDs = new supply ranges.'
      });
    }

    // 2b. maxSupplyPerId invariant
    const maxSupply = invariants.maxSupplyPerId as string | undefined;
    if (!maxSupply || maxSupply === '0') {
      findings.push({
        severity: 'info',
        category: 'supply',
        title: 'No per-token-ID supply cap (maxSupplyPerId = 0)',
        detail: 'maxSupplyPerId is 0 or unset, meaning unlimited tokens can exist per token ID. For NFTs, this should be "1".',
        recommendation: 'Set maxSupplyPerId to "1" for NFTs, or an appropriate cap for fungible tokens.'
      });
    }

    // ========================================
    // 3. APPROVAL ANALYSIS
    // ========================================

    // 3a. canUpdateCollectionApprovals
    const approvalPermState = permissionState(perms.canUpdateCollectionApprovals);

    // Check if it's scoped or blanket
    const approvalPerms = perms.canUpdateCollectionApprovals || [];
    const hasScopedMintLock = approvalPerms.some(p =>
      (p.fromListId === 'Mint' || p.fromListId === 'All') && isForever(p.permanentlyForbiddenTimes)
    );

    if (approvalPermState === 'PERMITTED' || (approvalPermState === 'NEUTRAL' && !hasScopedMintLock)) {
      // Check if there are mint approvals - if so, this is a supply risk
      const hasMintApproval = approvals.some(a => a.fromListId === 'Mint');
      if (hasMintApproval) {
        findings.push({
          severity: 'critical',
          category: 'supply',
          title: 'Mint approvals can be modified - UNLIMITED SUPPLY RISK',
          detail: `canUpdateCollectionApprovals is ${approvalPermState} and the collection has mint approvals. The manager can add new mint approvals, change mint limits, or remove restrictions at any time. This effectively means unlimited supply.`,
          recommendation: 'Lock canUpdateCollectionApprovals for mint-related approvals (fromListId: "Mint"). Use scoped approval permissions to lock mint while allowing transfer approval updates if needed.'
        });
      }
    }

    if (approvalPermState !== 'FORBIDDEN' && !hasScopedMintLock) {
      findings.push({
        severity: 'warning',
        category: 'transferability',
        title: 'Transfer rules can be modified',
        detail: `canUpdateCollectionApprovals is ${approvalPermState}. The manager can add, remove, or modify transfer approvals. This includes adding forceful transfer approvals.`,
        recommendation: 'If transfer rules should be fixed, set canUpdateCollectionApprovals to FORBIDDEN. For compliance tokens, this may need to stay PERMITTED.'
      });
    }

    // 3b. Analyze each approval
    for (const approval of approvals) {
      const fromId = approval.fromListId || '';
      const toId = approval.toListId || '';
      const initiatedBy = approval.initiatedByListId || '';
      const criteria = (approval.approvalCriteria || {}) as Record<string, unknown>;
      const approvalId = approval.approvalId || 'unnamed';

      // --- Mint approval checks ---
      if (fromId === 'Mint') {
        // Must have overridesFromOutgoingApprovals
        if (!criteria.overridesFromOutgoingApprovals) {
          findings.push({
            severity: 'critical',
            category: 'approval-bug',
            title: `Mint approval "${approvalId}" missing overridesFromOutgoingApprovals`,
            detail: 'Approvals with fromListId: "Mint" MUST have overridesFromOutgoingApprovals: true. Without this, the Mint address cannot send tokens and minting will fail.',
            recommendation: 'Add overridesFromOutgoingApprovals: true to approvalCriteria.'
          });
        }

        // Check for unlimited mint (no amount limits and no transfer limits)
        const amounts = criteria.approvalAmounts as Record<string, unknown> | undefined;
        const transfers = criteria.maxNumTransfers as Record<string, unknown> | undefined;
        const predetermined = criteria.predeterminedBalances as Record<string, unknown> | undefined;

        const hasAmountLimit = amounts && (
          (amounts.overallApprovalAmount && amounts.overallApprovalAmount !== '0') ||
          (amounts.perInitiatedByAddressApprovalAmount && amounts.perInitiatedByAddressApprovalAmount !== '0')
        );
        const hasTransferLimit = transfers && (
          (transfers.overallMaxNumTransfers && transfers.overallMaxNumTransfers !== '0') ||
          (transfers.perInitiatedByAddressMaxNumTransfers && transfers.perInitiatedByAddressMaxNumTransfers !== '0')
        );
        const hasPredetermined = predetermined && (
          (predetermined.incrementedBalances && Object.keys(predetermined.incrementedBalances as object).length > 0) ||
          (predetermined.manualBalances && (predetermined.manualBalances as unknown[]).length > 0)
        );

        if (!hasAmountLimit && !hasTransferLimit && !hasPredetermined) {
          findings.push({
            severity: 'critical',
            category: 'supply',
            title: `Mint approval "${approvalId}" has NO supply limits`,
            detail: 'This mint approval has no overallApprovalAmount, no maxNumTransfers, and no predeterminedBalances. Anyone matching the approval can mint unlimited tokens.',
            recommendation: 'Add approvalAmounts.overallApprovalAmount to cap total supply, or maxNumTransfers.overallMaxNumTransfers to cap mint count, or use predeterminedBalances for sequential allocation.'
          });
        }

        // Public mint check
        if (initiatedBy === 'All' && toId === 'All') {
          findings.push({
            severity: 'info',
            category: 'approval-design',
            title: `Mint approval "${approvalId}" is PUBLIC`,
            detail: 'Anyone can mint tokens. initiatedByListId and toListId are both "All".',
            recommendation: 'This is correct for public mints. For restricted mints, use a specific address or dynamic store challenge.'
          });
        }
      }

      // --- Backing address checks ---
      if (criteria.allowBackedMinting) {
        if (criteria.overridesFromOutgoingApprovals) {
          findings.push({
            severity: 'warning',
            category: 'approval-bug',
            title: `Backing approval "${approvalId}" has overridesFromOutgoingApprovals`,
            detail: 'Smart token backing/unbacking approvals should NOT set overridesFromOutgoingApprovals: true. The backing address is a special system address.',
            recommendation: 'Remove overridesFromOutgoingApprovals from backing/unbacking approval criteria.'
          });
        }
        if (!criteria.mustPrioritize) {
          findings.push({
            severity: 'critical',
            category: 'approval-bug',
            title: `Backing approval "${approvalId}" missing mustPrioritize`,
            detail: 'Smart token backing/unbacking approvals MUST have mustPrioritize: true. Without this, the approval cannot be matched by transfers.',
            recommendation: 'Add mustPrioritize: true to approvalCriteria.'
          });
        }

        // Exact backing address guardrail (chain rule enforced in PR #34):
        // isExactlyAddress returns true only for a bare address string. Exactly one side
        // (fromListId XOR toListId) must equal the backing address string exactly.
        const backingPath = invariants.cosmosCoinBackedPath as Record<string, unknown> | undefined;
        const backingAddr: string | undefined =
          (backingPath?.address as string | undefined) ||
          (col.cosmosCoinWrapperPathsToAdd as { address?: string }[] | undefined)?.[0]?.address;

        if (backingAddr) {
          const fromIsExact = fromId === backingAddr;
          const toIsExact = toId === backingAddr;

          if (fromIsExact && toIsExact) {
            findings.push({
              severity: 'critical',
              category: 'approval-bug',
              title: `Backing approval "${approvalId}" has BOTH sides set to the backing address`,
              detail: `Both fromListId ("${fromId}") and toListId ("${toId}") are the backing address. The chain requires exactly one side to be the backing address (isExactlyAddress). Broad lists ("All", multi-address, inverted) do NOT satisfy this rule — and having both sides set is also rejected.`,
              recommendation: 'For a deposit (backing) approval set fromListId to the backing address and toListId to the recipient list (e.g. "!Mint:backingAddress"). For a withdrawal (unbacking) approval set toListId to the backing address and fromListId to the sender list.'
            });
          } else if (!fromIsExact && !toIsExact) {
            findings.push({
              severity: 'critical',
              category: 'approval-bug',
              title: `Backing approval "${approvalId}" has NEITHER side set to the backing address exactly`,
              detail: `fromListId is "${fromId}" and toListId is "${toId}". Neither is the bare backing address string ("${backingAddr}"). The chain enforces that exactly one of fromListId or toListId must equal the backing address exactly — broad lists such as "All", inverted lists, or compound lists do NOT satisfy this rule and the chain will reject the approval.`,
              recommendation: 'Set exactly one side to the bare backing address string. For a deposit approval use fromListId: "<backingAddr>". For a withdrawal approval use toListId: "<backingAddr>".'
            });
          }
        }
      }

      // --- Wrapper address checks (allowSpecialWrapping) ---
      if (criteria.allowSpecialWrapping) {
        if (criteria.overridesFromOutgoingApprovals) {
          findings.push({
            severity: 'warning',
            category: 'approval-bug',
            title: `Wrapping approval "${approvalId}" has overridesFromOutgoingApprovals`,
            detail: 'Smart token wrapping/unwrapping approvals should NOT set overridesFromOutgoingApprovals: true. The wrapper address is a special system address.',
            recommendation: 'Remove overridesFromOutgoingApprovals from wrapping/unwrapping approval criteria.'
          });
        }
        if (!criteria.mustPrioritize) {
          findings.push({
            severity: 'critical',
            category: 'approval-bug',
            title: `Wrapping approval "${approvalId}" missing mustPrioritize`,
            detail: 'Smart token wrapping/unwrapping approvals MUST have mustPrioritize: true. Without this, the approval cannot be matched by transfers.',
            recommendation: 'Add mustPrioritize: true to approvalCriteria.'
          });
        }

        // Check that the collection actually has cosmosCoinWrapperPaths
        const wrapperPaths = col.cosmosCoinWrapperPathsToAdd as { address?: string }[] | undefined;
        if (!wrapperPaths || wrapperPaths.length === 0) {
          findings.push({
            severity: 'warning',
            category: 'approval-bug',
            title: `Wrapping approval "${approvalId}" but collection has no cosmosCoinWrapperPaths`,
            detail: 'allowSpecialWrapping: true is set but the collection has no cosmosCoinWrapperPathsToAdd. The wrapping approval has no wrapper path to target.',
            recommendation: 'Add a cosmosCoinWrapperPathsToAdd entry, or remove allowSpecialWrapping if wrapping is not intended.'
          });
        }

        // Note: wrapper address validation is skipped here because the address is auto-derived
        // on-chain from the denom — it's not present in cosmosCoinWrapperPathsToAdd.
        // Chain simulation will catch any from/to list mismatches at deploy time.
      }

      // --- Dangerous sender/recipient combos ---
      // Mint -> Mint (tokens going nowhere useful)
      if (fromId === 'Mint' && toId === 'Mint') {
        findings.push({
          severity: 'critical',
          category: 'approval-bug',
          title: `Approval "${approvalId}" sends from Mint TO Mint`,
          detail: 'Mint -> Mint is a no-op. Tokens minted to the Mint address are effectively burned immediately.',
          recommendation: 'Change toListId to "All" or a specific recipient address.'
        });
      }

      // Transfers TO Mint (non-backing context)
      if (toId === 'Mint' && !criteria.allowBackedMinting) {
        findings.push({
          severity: 'warning',
          category: 'approval-design',
          title: `Approval "${approvalId}" allows transfers TO Mint address`,
          detail: 'Sending tokens to the Mint address effectively burns them. This may be intentional (burn mechanism) or a mistake.',
          recommendation: 'If this is a burn approval, document it. Otherwise, change toListId.'
        });
      }

      // All -> specific address with no initiator restriction (forceful revocation)
      if (fromId === 'All' && initiatedBy === 'All' && !criteria.requireToEqualsInitiatedBy) {
        findings.push({
          severity: 'critical',
          category: 'transferability',
          title: `Approval "${approvalId}" allows FORCEFUL transfers from anyone`,
          detail: 'fromListId: "All" + initiatedByListId: "All" means ANYONE can initiate a transfer FROM any address. This allows forceful seizure/revocation of tokens.',
          recommendation: 'Add requireToEqualsInitiatedBy: true, or restrict initiatedByListId to the token owner, or restrict fromListId to "!Mint" for voluntary transfers only.'
        });
      }

      // Specific from -> specific to with All initiator (can move between arbitrary addresses)
      if (fromId !== 'Mint' && fromId !== '!Mint' && fromId !== 'All' && !fromId.startsWith('!') &&
          toId !== 'All' && initiatedBy === 'All') {
        // This might be a specific address transfer - check if it's the same
        if (fromId !== toId) {
          findings.push({
            severity: 'info',
            category: 'approval-design',
            title: `Approval "${approvalId}" is a directed transfer channel`,
            detail: `Allows transfers from ${fromId} to ${toId}, initiated by anyone.`,
            recommendation: 'Verify this directed channel is intentional.'
          });
        }
      }
    }

    // 3c. Check for backing approval completeness (smart tokens need BOTH)
    const standards = col.standards || [];
    const isSmartToken = standards.some(s => s.toLowerCase().includes('smart token'));
    // Detect backing/unbacking approvals robustly:
    // Backing: allowBackedMinting + fromListId is NOT negated (the backing address sends tokens out)
    // Unbacking: allowBackedMinting + fromListId IS negated or contains ':' (users send tokens to backing address)
    // Also check by approvalId pattern as fallback
    const hasBackingApproval = approvals.some(a => {
      const criteria = a.approvalCriteria as Record<string, unknown> | undefined;
      if (criteria?.allowBackedMinting && a.fromListId && !a.fromListId.startsWith('!')) return true;
      if (a.approvalId && /backing/i.test(a.approvalId) && !/unbacking/i.test(a.approvalId)) return true;
      return false;
    });
    const hasUnbackingApproval = approvals.some(a => {
      const criteria = a.approvalCriteria as Record<string, unknown> | undefined;
      if (criteria?.allowBackedMinting && a.toListId && a.fromListId && (a.fromListId.startsWith('!') || a.fromListId === 'All')) return true;
      if (a.approvalId && /unbacking/i.test(a.approvalId)) return true;
      return false;
    });

    if (isSmartToken || invariants.cosmosCoinBackedPath) {
      if (!hasBackingApproval) {
        findings.push({
          severity: 'critical',
          category: 'smart-token',
          title: 'Missing backing approval (deposit)',
          detail: 'Smart token has cosmosCoinBackedPath but no backing approval (from backingAddress to users with allowBackedMinting: true).',
          recommendation: 'Add a backing approval with fromListId: backingAddress, toListId: !backingAddress, allowBackedMinting: true, mustPrioritize: true.'
        });
      }
      if (!hasUnbackingApproval) {
        findings.push({
          severity: 'critical',
          category: 'smart-token',
          title: 'Missing unbacking approval (withdrawal)',
          detail: 'Smart token has cosmosCoinBackedPath but no unbacking approval (from users to backingAddress with allowBackedMinting: true).',
          recommendation: 'Add an unbacking approval with fromListId: !Mint:backingAddress, toListId: backingAddress, allowBackedMinting: true, mustPrioritize: true.'
        });
      }
    }

    // ========================================
    // 4. TRANSFERABILITY ANALYSIS
    // ========================================

    const hasTransferApproval = approvals.some(a =>
      a.fromListId === '!Mint' || (a.fromListId !== 'Mint' && !(a.approvalCriteria as Record<string, unknown>)?.allowBackedMinting)
    );

    if (!hasTransferApproval && approvals.length > 0) {
      findings.push({
        severity: 'info',
        category: 'transferability',
        title: 'No post-mint transfer approval found (non-transferable / soulbound)',
        detail: 'The collection has no approval allowing transfers between non-Mint addresses. Tokens are soulbound after minting.',
        recommendation: 'If this is intentional (soulbound tokens), this is correct. Add a free-transfer approval (fromListId: "!Mint") if transfers should be allowed.'
      });
    }

    // Check noForcefulPostMintTransfers invariant
    if (!invariants.noForcefulPostMintTransfers) {
      // Check if there are any approvals that could be forceful
      const potentialForceful = approvals.some(a => {
        if (a.fromListId === 'Mint') return false; // Mint approvals are not forceful transfers
        const initiated = a.initiatedByListId as string;
        // Any list ID that resolves to "everyone" or "everyone except Mint" allows third-party initiation
        const anyoneCanInitiate = initiated === 'All' || initiated === '!Mint' || initiated === 'AllWithMint';
        if (!anyoneCanInitiate) return false;
        const criteria = a.approvalCriteria as Record<string, unknown> | undefined;
        return !criteria?.requireToEqualsInitiatedBy;
      });
      if (potentialForceful) {
        findings.push({
          severity: 'warning',
          category: 'transferability',
          title: 'noForcefulPostMintTransfers is not set',
          detail: 'The invariant noForcefulPostMintTransfers is false/unset, and there are approvals that could allow forceful transfers. The manager or third parties might be able to move tokens from holders without consent.',
          recommendation: 'Set invariants.noForcefulPostMintTransfers: true if forceful transfers should never be possible.'
        });
      }
    }

    // ========================================
    // 5. INVARIANTS ANALYSIS
    // ========================================

    if (invariants.cosmosCoinBackedPath) {
      // Smart token - check alias paths
      if (!col.aliasPathsToAdd || col.aliasPathsToAdd.length === 0) {
        findings.push({
          severity: 'info',
          category: 'smart-token',
          title: 'Smart token has no alias paths',
          detail: 'The token has IBC backing but no alias paths for liquidity pool trading.',
          recommendation: 'Add an alias path if you want the token to be swappable on liquidity pools.'
        });
      }
    }

    // ========================================
    // 6. METADATA & STANDARDS CHECKS
    // ========================================

    // Check for placeholder URIs
    const collectionUri = col.collectionMetadata?.uri || '';
    if (collectionUri.startsWith('ipfs://METADATA_') || collectionUri === '') {
      findings.push({
        severity: 'info',
        category: 'metadata',
        title: 'Collection metadata URI is a placeholder',
        detail: `URI is "${collectionUri}". This needs to be replaced with actual IPFS metadata before deployment.`,
        recommendation: 'Upload metadata to IPFS and replace placeholder URIs. If using return transaction for user review, metadataPlaceholders handles this automatically.'
      });
    }

    // Token metadata
    if (col.tokenMetadata) {
      for (const tm of col.tokenMetadata) {
        if (!tm.tokenIds || tm.tokenIds.length === 0) {
          findings.push({
            severity: 'critical',
            category: 'metadata',
            title: 'Token metadata entry missing tokenIds',
            detail: 'Each tokenMetadata entry MUST include a tokenIds array specifying which tokens it applies to.',
            recommendation: 'Add tokenIds: [{ start: "1", end: "N" }] to each tokenMetadata entry.'
          });
        }
      }
    }

    // Approval metadata image check
    for (const approval of approvals) {
      if (approval.uri && approval.uri !== '' && !approval.uri.startsWith('ipfs://METADATA_')) {
        // Has a real URI - would need to verify image is empty, but we can flag this
        findings.push({
          severity: 'info',
          category: 'metadata',
          title: `Approval "${approval.approvalId}" has metadata URI`,
          detail: `Approval metadata images MUST be empty string (""). Verify the metadata at ${approval.uri} has image: "".`,
          recommendation: 'Ensure approval metadata has image: "" (empty string). Non-empty images on approvals cause display issues.'
        });
      }
    }

    // Standards consistency
    if (standards.includes('NFTs') && maxSupply !== '1') {
      findings.push({
        severity: 'warning',
        category: 'standards',
        title: 'NFT standard but maxSupplyPerId is not 1',
        detail: `Collection has "NFTs" standard but maxSupplyPerId is "${maxSupply || '0'}". NFTs should have exactly 1 per token ID.`,
        recommendation: 'Set invariants.maxSupplyPerId: "1" for NFT collections.'
      });
    }

    if (standards.includes('Fungible Tokens') && col.validTokenIds) {
      const hasMultipleTokenIds = col.validTokenIds.some(r =>
        r.start !== r.end && !(r.start === '1' && r.end === '1')
      );
      if (hasMultipleTokenIds) {
        findings.push({
          severity: 'warning',
          category: 'standards',
          title: 'Fungible token with multiple token IDs',
          detail: 'Fungible tokens typically use a single token ID (start: "1", end: "1"). Multiple token IDs may cause confusion.',
          recommendation: 'Use validTokenIds: [{ start: "1", end: "1" }] for standard fungible tokens.'
        });
      }
    }

    // ========================================
    // 7. SERIALIZATION CHECKS
    // ========================================

    // Check for number values where strings expected
    function checkNumericStrings(obj: unknown, path: string): void {
      if (obj === null || obj === undefined) return;
      if (typeof obj === 'number') {
        findings.push({
          severity: 'critical',
          category: 'serialization',
          title: `Numeric value found at ${path}`,
          detail: `Value ${obj} at ${path} is a JavaScript number. BitBadges requires ALL numeric values as strings.`,
          recommendation: `Change to "${obj}" (string) instead of ${obj} (number).`
        });
        return;
      }
      if (Array.isArray(obj)) {
        obj.forEach((item, i) => checkNumericStrings(item, `${path}[${i}]`));
        return;
      }
      if (typeof obj === 'object') {
        for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
          // Skip off-chain plugin config — numbers are valid there (maxUses, numCodes, etc.)
          if (key === 'claimConfig' || key === 'plugins' || key === 'publicParams' || key === 'privateParams') continue;
          // Only check fields that should be numeric strings
          if (['start', 'end', 'amount', 'collectionId', 'totalSupply', 'decimals',
               'overallApprovalAmount', 'perInitiatedByAddressApprovalAmount',
               'perToAddressApprovalAmount', 'perFromAddressApprovalAmount',
               'overallMaxNumTransfers', 'perInitiatedByAddressMaxNumTransfers',
               'perToAddressMaxNumTransfers', 'perFromAddressMaxNumTransfers',
               'intervalLength', 'startTime', 'maxSupplyPerId',
               'incrementTokenIdsBy', 'incrementOwnershipTimesBy',
               'durationFromTimestamp', 'chargePeriodLength'].includes(key)) {
            if (typeof val === 'number') {
              findings.push({
                severity: 'critical',
                category: 'serialization',
                title: `Numeric value for "${key}" at ${path}.${key}`,
                detail: `Value ${val} must be a string "${val}". BitBadges uses string-encoded uint64 everywhere.`,
                recommendation: `Change ${key}: ${val} to ${key}: "${val}".`
              });
            }
          }
          checkNumericStrings(val, `${path}.${key}`);
        }
      }
    }
    checkNumericStrings(col, 'collection');

    // ========================================
    // 8. CONTEXT-SPECIFIC CHECKS
    // ========================================

    // If NFT context, check for common NFT issues
    if (context.includes('nft') || context.includes('art') || context.includes('pfp') || standards.includes('NFTs')) {
      if (isPermitted(perms.canUpdateTokenMetadata)) {
        findings.push({
          severity: 'warning',
          category: 'context',
          title: 'NFT token metadata is updatable',
          detail: 'For art/PFP NFTs, token metadata should typically be frozen so artwork cannot be changed after mint.',
          recommendation: 'Set canUpdateTokenMetadata to FORBIDDEN for art/PFP collections.'
        });
      }
    }

    // If stablecoin/vault context
    if (context.includes('stablecoin') || context.includes('vault') || context.includes('wrapped') || isSmartToken) {
      if (!invariants.cosmosCoinBackedPath) {
        findings.push({
          severity: 'warning',
          category: 'context',
          title: 'Stablecoin/vault without IBC backing path',
          detail: 'This appears to be a stablecoin or vault but has no cosmosCoinBackedPath invariant.',
          recommendation: 'Set invariants.cosmosCoinBackedPath with the correct IBC denom and conversion.'
        });
      }
    }

    // If subscription context
    if (context.includes('subscription') || standards.includes('Subscriptions')) {
      if (approvalPermState === 'FORBIDDEN') {
        findings.push({
          severity: 'warning',
          category: 'context',
          title: 'Subscription with frozen approvals',
          detail: 'Subscriptions may need approval updates for price/duration changes. Approval permission is FORBIDDEN.',
          recommendation: 'Consider using PERMITTED for canUpdateCollectionApprovals if pricing may change.'
        });
      }
    }

    // ========================================
    // 9. DEFAULT BALANCES CHECKS
    // ========================================
    const defaultBalances = col.defaultBalances as Record<string, unknown> | undefined;
    if (defaultBalances) {
      if (!defaultBalances.autoApproveAllIncomingTransfers) {
        const hasMint = approvals.some(a => a.fromListId === 'Mint');
        if (hasMint) {
          findings.push({
            severity: 'critical',
            category: 'approval-bug',
            title: 'Missing autoApproveAllIncomingTransfers for mint collection',
            detail: 'defaultBalances.autoApproveAllIncomingTransfers is not true, but the collection has mint approvals. Recipients will not be able to receive minted tokens.',
            recommendation: 'Set defaultBalances.autoApproveAllIncomingTransfers: true.'
          });
        }
      }
    } else {
      // No defaultBalances at all - check if this is a creation (collectionId = 0)
      const hasMint = approvals.some(a => a.fromListId === 'Mint');
      if (hasMint && col.collectionId === '0') {
        findings.push({
          severity: 'warning',
          category: 'approval-bug',
          title: 'No defaultBalances specified with mint approvals',
          detail: 'The collection has mint approvals but no defaultBalances. The chain defaults may not include autoApproveAllIncomingTransfers: true.',
          recommendation: 'Explicitly set defaultBalances with autoApproveAllIncomingTransfers: true for mint collections.'
        });
      }
    }

    // ========================================
    // BUILD SUMMARY
    // ========================================

    const critical = findings.filter(f => f.severity === 'critical').length;
    const warning = findings.filter(f => f.severity === 'warning').length;
    const info = findings.filter(f => f.severity === 'info').length;

    let verdict: string;
    if (critical > 0) {
      verdict = `CRITICAL: ${critical} critical issue(s) found. DO NOT deploy without fixing these.`;
    } else if (warning > 0) {
      verdict = `WARNING: ${warning} warning(s) found. Review before deploying.`;
    } else {
      verdict = 'PASS: No critical or warning issues found.';
    }

    // Permission summary
    const permissionSummary: Record<string, string> = {};
    for (const p of permNames) {
      permissionSummary[p] = permissionState(perms[p]);
    }

    // Approval summary
    const approvalSummary = approvals.map(a => {
      const criteria = (a.approvalCriteria || {}) as Record<string, unknown>;
      const flags: string[] = [];
      if (criteria.allowBackedMinting) flags.push('IBC-backed');
      if (criteria.mustPrioritize) flags.push('must-prioritize');
      if (criteria.overridesFromOutgoingApprovals) flags.push('overrides-outgoing');
      if (criteria.coinTransfers) flags.push('payment-required');
      if (criteria.mustOwnTokens) flags.push('ownership-gated');
      if (criteria.merkleChallenges) flags.push('merkle-gated');
      if (criteria.predeterminedBalances) flags.push('predetermined');
      const flagStr = flags.length > 0 ? ` [${flags.join(', ')}]` : '';
      return `${a.approvalId}: ${a.fromListId} -> ${a.toListId} (by ${a.initiatedByListId})${flagStr}`;
    });

    return {
      success: true,
      findings: findings.sort((a, b) => {
        const order: Record<Severity, number> = { critical: 0, warning: 1, info: 2 };
        return order[a.severity] - order[b.severity];
      }),
      summary: { critical, warning, info, verdict },
      permissionSummary,
      approvalSummary
    };
  } catch (error) {
    return {
      success: false,
      findings: [],
      summary: { critical: 0, warning: 0, info: 0, verdict: 'ERROR' },
      permissionSummary: {},
      approvalSummary: [],
      error: `Audit failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
