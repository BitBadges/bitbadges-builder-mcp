/**
 * Deterministic skill/standard verification.
 *
 * These validators run POST-BUILD with 0 AI tokens. They check only
 * 100% deterministic structural rules that are critical for:
 *   - Correct on-chain functionality
 *   - Frontend display/protocol support
 *   - SDK constructor compatibility
 *
 * The AI handles creative work (metadata, naming, amounts, addresses).
 * These validators ensure the structural skeleton is correct.
 */

import { CollectionDoc, doesCollectionFollowSubscriptionProtocol } from 'bitbadgesjs-sdk';

const MAX_UINT64 = '18446744073709551615';
const FOREVER = [{ start: '1', end: MAX_UINT64 }];
const BURN_ADDRESS = 'bb1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqs7gvmv';

// ============================================================
// Types
// ============================================================

export interface StandardViolation {
  standard: string;
  field: string;
  message: string;
  fix?: string; // Optional auto-fix description
}

export interface VerificationResult {
  valid: boolean;
  violations: StandardViolation[];
  standardsChecked: string[];
}

// ============================================================
// Helpers
// ============================================================

function isForever(times: any[]): boolean {
  if (!Array.isArray(times) || times.length !== 1) return false;
  return String(times[0]?.start) === '1' && String(times[0]?.end) === MAX_UINT64;
}

function isSingleToken(tokenIds: any[]): boolean {
  if (!Array.isArray(tokenIds) || tokenIds.length !== 1) return false;
  return String(tokenIds[0]?.start) === '1' && String(tokenIds[0]?.end) === '1';
}

function getApprovals(value: any): any[] {
  return value?.collectionApprovals || [];
}

function getStandards(value: any): string[] {
  return value?.standards || [];
}

function getInvariants(value: any): any {
  return value?.invariants || {};
}

function getMintApprovals(value: any): any[] {
  return getApprovals(value).filter((a: any) => a.fromListId === 'Mint');
}

/**
 * Build a CollectionDoc-like object from raw transaction value for SDK protocol checks.
 * Uses the SDK's own .convert(BigInt) to handle all type conversions safely.
 * Do NOT pre-convert with JSON.parse reviver — that causes "Cannot mix BigInt and other types"
 * when the CollectionDoc constructor does arithmetic before .convert() runs.
 */
function buildCollectionDocLike(value: any): any {
  try {
    // Deep clone without any type conversion — keep all values as strings/numbers/booleans
    const raw = JSON.parse(JSON.stringify(value));

    // The SDK expects iCollectionDoc shape — wrap the MsgUniversalUpdateCollection value
    // Let .convert(BigInt) handle all string→BigInt conversion uniformly
    return new CollectionDoc({
      ...raw,
      collectionId: raw.collectionId ?? '0',
      createdBy: raw.creator ?? '',
      createdBlock: '0',
      createdTimestamp: '0',
      updateHistory: [],
      mintEscrowAddress: '',
      cosmosCoinWrapperPaths: raw.cosmosCoinWrapperPathsToAdd ?? [],
      aliasPaths: raw.aliasPathsToAdd ?? [],
      invariants: raw.invariants ?? {},
      collectionMetadata: raw.collectionMetadata ?? { uri: '', customData: '' },
      tokenMetadata: raw.tokenMetadata ?? [],
      customData: raw.customData ?? '',
      isArchived: raw.isArchived ?? false,
      defaultBalances: raw.defaultBalances ?? {
        balances: [], outgoingApprovals: [], incomingApprovals: [],
        autoApproveAllIncomingTransfers: false,
        autoApproveSelfInitiatedOutgoingTransfers: false,
        autoApproveSelfInitiatedIncomingTransfers: false,
        userPermissions: {
          canUpdateOutgoingApprovals: [], canUpdateIncomingApprovals: [],
          canUpdateAutoApproveSelfInitiatedOutgoingTransfers: [],
          canUpdateAutoApproveSelfInitiatedIncomingTransfers: [],
          canUpdateAutoApproveAllIncomingTransfers: []
        }
      },
      _docId: '',
      _id: ''
    }).convert(BigInt);
  } catch {
    return null;
  }
}

// ============================================================
// Per-Standard Validators
// ============================================================

function verifySmartToken(value: any): StandardViolation[] {
  const violations: StandardViolation[] = [];
  const std = 'Smart Token';
  const approvals = getApprovals(value);
  const invariants = getInvariants(value);

  // Must have cosmosCoinBackedPath or cosmosCoinWrapperPathsToAdd
  const hasCosmosCoinPath = invariants.cosmosCoinBackedPath ||
    (value.cosmosCoinWrapperPathsToAdd && value.cosmosCoinWrapperPathsToAdd.length > 0);
  if (!hasCosmosCoinPath) {
    violations.push({
      standard: std,
      field: 'invariants.cosmosCoinBackedPath',
      message: 'Smart tokens MUST have a cosmosCoinBackedPath or cosmosCoinWrapperPathsToAdd defining the IBC backing.',
      fix: 'Add cosmosCoinWrapperPathsToAdd with the IBC denom and conversion ratio.'
    });
  }

  // Must have at least a backing approval (allowBackedMinting: true)
  const backingApprovals = approvals.filter((a: any) =>
    a.approvalCriteria?.allowBackedMinting === true || a.approvalCriteria?.allowBackedMinting === 'true'
  );
  if (backingApprovals.length === 0) {
    violations.push({
      standard: std,
      field: 'collectionApprovals',
      message: 'Smart tokens MUST have at least one approval with allowBackedMinting: true (backing/deposit approval).'
    });
  }

  // Backing approvals must have mustPrioritize: true
  for (const ba of backingApprovals) {
    if (ba.approvalCriteria?.mustPrioritize !== true && ba.approvalCriteria?.mustPrioritize !== 'true') {
      violations.push({
        standard: std,
        field: `collectionApprovals[${ba.approvalId}].approvalCriteria.mustPrioritize`,
        message: `Backing approval "${ba.approvalId}" MUST have mustPrioritize: true. Without it, users can bypass the backing mechanism.`,
        fix: 'Set mustPrioritize: true on this approval.'
      });
    }
  }

  // Should NOT have fromListId: "Mint" approvals (smart tokens mint via IBC backing, not direct mint)
  const mintApprovals = getMintApprovals(value);
  if (mintApprovals.length > 0) {
    violations.push({
      standard: std,
      field: 'collectionApprovals',
      message: 'Smart tokens should NOT have fromListId: "Mint" approvals. Tokens are created via IBC backing deposits, not traditional minting.'
    });
  }

  // Must have alias path
  const hasAliasPath = (value.aliasPathsToAdd && value.aliasPathsToAdd.length > 0) ||
    (invariants.aliasPath);
  if (!hasAliasPath) {
    violations.push({
      standard: std,
      field: 'aliasPathsToAdd',
      message: 'Smart tokens MUST have an alias path configured for the IBC denom conversion.',
      fix: 'Add aliasPathsToAdd with the IBC denom and decimal configuration.'
    });
  }

  return violations;
}

function verifySubscription(value: any): StandardViolation[] {
  const violations: StandardViolation[] = [];
  const std = 'Subscription';

  // validTokenIds must be exactly 1 token
  if (!isSingleToken(value.validTokenIds)) {
    violations.push({
      standard: std,
      field: 'validTokenIds',
      message: 'Subscription collections MUST have validTokenIds = [{ start: "1", end: "1" }] (exactly 1 token ID).',
      fix: 'Set validTokenIds to [{ "start": "1", "end": "1" }].'
    });
  }

  // Must have at least one subscription faucet approval
  const mintApprovals = getMintApprovals(value);
  if (mintApprovals.length === 0) {
    violations.push({
      standard: std,
      field: 'collectionApprovals',
      message: 'Subscription collections MUST have at least one mint approval (fromListId: "Mint") acting as a subscription faucet.'
    });
    return violations; // Can't check further without approvals
  }

  for (const approval of mintApprovals) {
    const ac = approval.approvalCriteria || {};
    const prefix = `collectionApprovals[${approval.approvalId}]`;

    // Must have overridesFromOutgoingApprovals: true
    if (ac.overridesFromOutgoingApprovals !== true && ac.overridesFromOutgoingApprovals !== 'true') {
      violations.push({
        standard: std,
        field: `${prefix}.approvalCriteria.overridesFromOutgoingApprovals`,
        message: `Mint approval "${approval.approvalId}" MUST have overridesFromOutgoingApprovals: true.`,
        fix: 'Set overridesFromOutgoingApprovals: true.'
      });
    }

    // Must have predeterminedBalances with incrementedBalances
    const pb = ac.predeterminedBalances;
    const ib = pb?.incrementedBalances;
    if (!ib) {
      violations.push({
        standard: std,
        field: `${prefix}.approvalCriteria.predeterminedBalances.incrementedBalances`,
        message: `Subscription approval "${approval.approvalId}" MUST use predeterminedBalances with incrementedBalances.`
      });
      continue;
    }

    // startBalances must be length 1 with amount 1
    if (!Array.isArray(ib.startBalances) || ib.startBalances.length !== 1) {
      violations.push({
        standard: std,
        field: `${prefix}.predeterminedBalances.incrementedBalances.startBalances`,
        message: `Subscription approval "${approval.approvalId}" startBalances must have exactly 1 entry.`
      });
    } else if (String(ib.startBalances[0]?.amount) !== '1') {
      violations.push({
        standard: std,
        field: `${prefix}.predeterminedBalances.incrementedBalances.startBalances[0].amount`,
        message: `Subscription approval "${approval.approvalId}" startBalances amount must be "1".`
      });
    }

    // durationFromTimestamp must be non-zero
    if (!ib.durationFromTimestamp || ib.durationFromTimestamp === '0') {
      violations.push({
        standard: std,
        field: `${prefix}.predeterminedBalances.incrementedBalances.durationFromTimestamp`,
        message: `Subscription approval "${approval.approvalId}" MUST have a non-zero durationFromTimestamp (subscription duration in ms). Common values: 2592000000 (30 days), 31536000000 (1 year).`,
        fix: 'Set durationFromTimestamp to the subscription period in milliseconds.'
      });
    }

    // allowOverrideTimestamp must be true (for renewal)
    if (ib.allowOverrideTimestamp !== true && ib.allowOverrideTimestamp !== 'true') {
      violations.push({
        standard: std,
        field: `${prefix}.predeterminedBalances.incrementedBalances.allowOverrideTimestamp`,
        message: `Subscription approval "${approval.approvalId}" MUST have allowOverrideTimestamp: true to allow subscription renewal.`,
        fix: 'Set allowOverrideTimestamp: true.'
      });
    }

    // incrementTokenIdsBy and incrementOwnershipTimesBy should be "0"
    if (ib.incrementTokenIdsBy && ib.incrementTokenIdsBy !== '0') {
      violations.push({
        standard: std,
        field: `${prefix}.predeterminedBalances.incrementedBalances.incrementTokenIdsBy`,
        message: `Subscription approval "${approval.approvalId}" incrementTokenIdsBy should be "0" (single token ID for subscriptions).`
      });
    }
    if (ib.incrementOwnershipTimesBy && ib.incrementOwnershipTimesBy !== '0') {
      violations.push({
        standard: std,
        field: `${prefix}.predeterminedBalances.incrementedBalances.incrementOwnershipTimesBy`,
        message: `Subscription approval "${approval.approvalId}" incrementOwnershipTimesBy should be "0".`
      });
    }

    // Mutual exclusivity: only ONE of durationFromTimestamp, incrementOwnershipTimesBy, recurringOwnershipTimes can be non-zero
    const rot = ib.recurringOwnershipTimes;
    const hasDuration = ib.durationFromTimestamp && ib.durationFromTimestamp !== '0';
    const hasIncrement = ib.incrementOwnershipTimesBy && ib.incrementOwnershipTimesBy !== '0';
    const hasRecurring = rot && (
      (rot.startTime && rot.startTime !== '0') ||
      (rot.intervalLength && rot.intervalLength !== '0') ||
      (rot.chargePeriodLength && rot.chargePeriodLength !== '0')
    );
    const activeCount = [hasDuration, hasIncrement, hasRecurring].filter(Boolean).length;
    if (activeCount > 1) {
      violations.push({
        standard: std,
        field: `${prefix}.predeterminedBalances.incrementedBalances`,
        message: `Subscription approval "${approval.approvalId}" has multiple ownership-time methods set (durationFromTimestamp, incrementOwnershipTimesBy, recurringOwnershipTimes). The chain requires EXACTLY ONE. For subscriptions, use durationFromTimestamp and set recurringOwnershipTimes to all-zeros { startTime: "0", intervalLength: "0", chargePeriodLength: "0" }.`,
        fix: 'Keep durationFromTimestamp set to the subscription period. Set recurringOwnershipTimes to { startTime: "0", intervalLength: "0", chargePeriodLength: "0" } and incrementOwnershipTimesBy to "0".'
      });
    }

    // coinTransfers validation
    const ct = ac.coinTransfers;
    if (Array.isArray(ct) && ct.length > 0) {
      for (const coin of ct) {
        if (coin.overrideFromWithApproverAddress === true || coin.overrideFromWithApproverAddress === 'true') {
          violations.push({
            standard: std,
            field: `${prefix}.approvalCriteria.coinTransfers.overrideFromWithApproverAddress`,
            message: `Subscription approval "${approval.approvalId}" coinTransfers MUST have overrideFromWithApproverAddress: false.`
          });
        }
        if (coin.overrideToWithInitiator === true || coin.overrideToWithInitiator === 'true') {
          violations.push({
            standard: std,
            field: `${prefix}.approvalCriteria.coinTransfers.overrideToWithInitiator`,
            message: `Subscription approval "${approval.approvalId}" coinTransfers MUST have overrideToWithInitiator: false.`
          });
        }
      }
    }
  }

  // Final check: use SDK's canonical doesCollectionFollowSubscriptionProtocol
  // This is the same function the frontend/indexer uses to determine protocol compliance
  try {
    const collectionLike = buildCollectionDocLike(value);
    if (collectionLike && !doesCollectionFollowSubscriptionProtocol(collectionLike as any)) {
      violations.push({
        standard: std,
        field: 'collection',
        message: 'Collection does not pass the SDK doesCollectionFollowSubscriptionProtocol() check. The frontend will not recognize this as a valid subscription collection. Review the subscription faucet approval structure.'
      });
    }
  } catch (e: any) {
    violations.push({
      standard: std,
      field: 'collection',
      message: `SDK subscription protocol check threw an error: ${e.message}. This likely means the approval structure is malformed.`
    });
  }

  return violations;
}

function verifyFungibleToken(value: any): StandardViolation[] {
  const violations: StandardViolation[] = [];
  const std = 'Fungible Token';

  // validTokenIds must be exactly 1 token
  if (!isSingleToken(value.validTokenIds)) {
    violations.push({
      standard: std,
      field: 'validTokenIds',
      message: 'Fungible token collections MUST have validTokenIds = [{ start: "1", end: "1" }]. All units share token ID 1.',
      fix: 'Set validTokenIds to [{ "start": "1", "end": "1" }].'
    });
  }

  // Mint approvals must have overridesFromOutgoingApprovals: true
  for (const approval of getMintApprovals(value)) {
    const ac = approval.approvalCriteria || {};
    if (ac.overridesFromOutgoingApprovals !== true && ac.overridesFromOutgoingApprovals !== 'true') {
      violations.push({
        standard: std,
        field: `collectionApprovals[${approval.approvalId}].approvalCriteria.overridesFromOutgoingApprovals`,
        message: `Mint approval "${approval.approvalId}" MUST have overridesFromOutgoingApprovals: true.`,
        fix: 'Set overridesFromOutgoingApprovals: true.'
      });
    }
  }

  return violations;
}

function verifyNFTCollection(value: any): StandardViolation[] {
  const violations: StandardViolation[] = [];
  const std = 'NFT Collection';

  // Should have validTokenIds with a range > 1 token
  if (isSingleToken(value.validTokenIds)) {
    violations.push({
      standard: std,
      field: 'validTokenIds',
      message: 'NFT collections typically have multiple token IDs (e.g., [{ start: "1", end: "100" }]). Single-token collections are usually fungible tokens or subscriptions, not NFTs.'
    });
  }

  // Mint approvals must have overridesFromOutgoingApprovals: true
  for (const approval of getMintApprovals(value)) {
    const ac = approval.approvalCriteria || {};
    if (ac.overridesFromOutgoingApprovals !== true && ac.overridesFromOutgoingApprovals !== 'true') {
      violations.push({
        standard: std,
        field: `collectionApprovals[${approval.approvalId}].approvalCriteria.overridesFromOutgoingApprovals`,
        message: `Mint approval "${approval.approvalId}" MUST have overridesFromOutgoingApprovals: true.`,
        fix: 'Set overridesFromOutgoingApprovals: true.'
      });
    }
  }

  return violations;
}

function verifyAddressList(value: any): StandardViolation[] {
  const violations: StandardViolation[] = [];
  const std = 'Address List';

  // validTokenIds must be exactly 1 token
  if (!isSingleToken(value.validTokenIds)) {
    violations.push({
      standard: std,
      field: 'validTokenIds',
      message: 'Address list collections MUST have validTokenIds = [{ start: "1", end: "1" }]. Membership = owning x1 of token ID 1.',
      fix: 'Set validTokenIds to [{ "start": "1", "end": "1" }].'
    });
  }

  const approvals = getApprovals(value);

  // Must have a manager-add approval (Mint → All)
  const addApprovals = approvals.filter((a: any) =>
    a.fromListId === 'Mint' && a.toListId === 'All'
  );
  if (addApprovals.length === 0) {
    violations.push({
      standard: std,
      field: 'collectionApprovals',
      message: 'Address list MUST have a manager-add approval (fromListId: "Mint", toListId: "All") for adding members.',
      fix: 'Add a mint approval with fromListId: "Mint", toListId: "All", initiatedByListId: manager address.'
    });
  }

  // Must have a manager-remove approval (All → burn address)
  const removeApprovals = approvals.filter((a: any) =>
    a.toListId === BURN_ADDRESS
  );
  if (removeApprovals.length === 0) {
    violations.push({
      standard: std,
      field: 'collectionApprovals',
      message: `Address list MUST have a manager-remove approval (toListId: "${BURN_ADDRESS}") for removing members.`,
      fix: `Add a burn approval with fromListId: "All", toListId: "${BURN_ADDRESS}", initiatedByListId: manager address.`
    });
  }

  // Mint approvals must have overridesFromOutgoingApprovals: true
  for (const approval of getMintApprovals(value)) {
    const ac = approval.approvalCriteria || {};
    if (ac.overridesFromOutgoingApprovals !== true && ac.overridesFromOutgoingApprovals !== 'true') {
      violations.push({
        standard: std,
        field: `collectionApprovals[${approval.approvalId}].approvalCriteria.overridesFromOutgoingApprovals`,
        message: `Mint approval "${approval.approvalId}" MUST have overridesFromOutgoingApprovals: true.`,
        fix: 'Set overridesFromOutgoingApprovals: true.'
      });
    }
  }

  return violations;
}

function verifyCustom2FA(value: any): StandardViolation[] {
  const violations: StandardViolation[] = [];
  const std = 'Custom-2FA';
  const approvals = getApprovals(value);

  // Must have at least one approval with autoDeletionOptions.allowPurgeIfExpired
  const has2FAApproval = approvals.some((a: any) =>
    a.approvalCriteria?.autoDeletionOptions?.allowPurgeIfExpired === true ||
    a.approvalCriteria?.autoDeletionOptions?.allowPurgeIfExpired === 'true'
  );

  if (!has2FAApproval) {
    violations.push({
      standard: std,
      field: 'collectionApprovals.approvalCriteria.autoDeletionOptions',
      message: 'Custom-2FA collections MUST have at least one approval with autoDeletionOptions.allowPurgeIfExpired: true so expired 2FA tokens can be cleaned up.'
    });
  }

  return violations;
}

function verifyLiquidityPools(value: any): StandardViolation[] {
  const violations: StandardViolation[] = [];
  const std = 'Liquidity Pools';
  const invariants = getInvariants(value);

  // disablePoolCreation must be false or absent
  if (invariants.disablePoolCreation === true || invariants.disablePoolCreation === 'true') {
    violations.push({
      standard: std,
      field: 'invariants.disablePoolCreation',
      message: 'Liquidity pool collections MUST have disablePoolCreation: false (or omitted).',
      fix: 'Set invariants.disablePoolCreation to false or remove it.'
    });
  }

  // Must have alias path
  const hasAliasPath = (value.aliasPathsToAdd && value.aliasPathsToAdd.length > 0) ||
    (invariants.aliasPath);
  if (!hasAliasPath) {
    violations.push({
      standard: std,
      field: 'aliasPathsToAdd',
      message: 'Liquidity pool collections MUST have at least one alias path configured for DEX trading.'
    });
  }

  return violations;
}

function verifyNonTransferable(value: any): StandardViolation[] {
  const violations: StandardViolation[] = [];
  const std = 'Non-Transferable';
  const approvals = getApprovals(value);

  // Should NOT have peer-to-peer transfer approvals (fromListId: "!Mint", toListId: "All" or similar)
  const peerTransfers = approvals.filter((a: any) =>
    a.fromListId !== 'Mint' &&
    a.toListId !== BURN_ADDRESS &&
    a.fromListId !== BURN_ADDRESS
  );

  // Only flag if the collection explicitly says non-transferable but has transfer approvals
  if (peerTransfers.length > 0) {
    // This is just an info-level check since the standard name implies non-transferable
    // but the user might want controlled transfers (e.g., manager-only)
  }

  return violations;
}

// ============================================================
// Common Mint Approval Checks (run for ALL standards with mint approvals)
// ============================================================

function verifyCommonMintRules(value: any): StandardViolation[] {
  const violations: StandardViolation[] = [];
  const mintApprovals = getMintApprovals(value);
  const defaultBalances = value.defaultBalances || {};

  // If there are mint approvals, defaultBalances should have autoApproveAllIncomingTransfers
  if (mintApprovals.length > 0) {
    if (defaultBalances.autoApproveAllIncomingTransfers !== true &&
        defaultBalances.autoApproveAllIncomingTransfers !== 'true') {
      violations.push({
        standard: 'Common',
        field: 'defaultBalances.autoApproveAllIncomingTransfers',
        message: 'Collections with mint approvals MUST have defaultBalances.autoApproveAllIncomingTransfers: true. Without this, recipients cannot receive minted tokens.',
        fix: 'Set defaultBalances.autoApproveAllIncomingTransfers: true.'
      });
    }
  }

  // Each mint approval must have overridesFromOutgoingApprovals: true
  for (const approval of mintApprovals) {
    const ac = approval.approvalCriteria || {};
    if (ac.overridesFromOutgoingApprovals !== true && ac.overridesFromOutgoingApprovals !== 'true') {
      violations.push({
        standard: 'Common',
        field: `collectionApprovals[${approval.approvalId}].approvalCriteria.overridesFromOutgoingApprovals`,
        message: `Mint approval "${approval.approvalId}" MUST have overridesFromOutgoingApprovals: true. This is required for all Mint (fromListId: "Mint") approvals.`,
        fix: 'Set overridesFromOutgoingApprovals: true.'
      });
    }
  }

  // Mint approvals with predeterminedBalances must have exactly one orderCalculationMethod
  for (const approval of mintApprovals) {
    const ac = approval.approvalCriteria || {};
    const pb = ac.predeterminedBalances;
    if (pb?.orderCalculationMethod) {
      const ocm = pb.orderCalculationMethod;
      const trueCount = [
        ocm.useOverallNumTransfers,
        ocm.usePerToAddressNumTransfers,
        ocm.usePerFromAddressNumTransfers,
        ocm.usePerInitiatedByAddressNumTransfers,
        ocm.useMerkleChallengeLeafIndex
      ].filter(v => v === true || v === 'true').length;

      if (trueCount === 0) {
        violations.push({
          standard: 'Common',
          field: `collectionApprovals[${approval.approvalId}].predeterminedBalances.orderCalculationMethod`,
          message: `Approval "${approval.approvalId}" uses predeterminedBalances but no orderCalculationMethod is set to true. Exactly one must be true.`,
          fix: 'Set useOverallNumTransfers: true (most common default).'
        });
      } else if (trueCount > 1) {
        violations.push({
          standard: 'Common',
          field: `collectionApprovals[${approval.approvalId}].predeterminedBalances.orderCalculationMethod`,
          message: `Approval "${approval.approvalId}" has ${trueCount} orderCalculationMethods set to true. Exactly one must be true.`
        });
      }
    }
  }

  return violations;
}

// ============================================================
// Standard → Validator Map
// ============================================================

const STANDARD_VALIDATORS: Record<string, (value: any) => StandardViolation[]> = {
  'Smart Token': verifySmartToken,
  'Subscriptions': verifySubscription,
  'Fungible Tokens': verifyFungibleToken,
  'NFTs': verifyNFTCollection,
  'Address List': verifyAddressList,
  'Custom-2FA': verifyCustom2FA,
  'Liquidity Pools': verifyLiquidityPools,
};

// Also match common alternative names
const STANDARD_ALIASES: Record<string, string> = {
  'Smart Token': 'Smart Token',
  'IBC Token Factory': 'Smart Token',
  'Subscription': 'Subscriptions',
  'Subscriptions': 'Subscriptions',
  'Fungible Token': 'Fungible Tokens',
  'Fungible Tokens': 'Fungible Tokens',
  'NFT': 'NFTs',
  'NFTs': 'NFTs',
  'NFT Collection': 'NFTs',
  'Address List': 'Address List',
  'Custom-2FA': 'Custom-2FA',
  'Liquidity Pools': 'Liquidity Pools',
  'Credit Token': 'Fungible Tokens', // Credit tokens are fungible
};

// ============================================================
// Common: Approval Metadata
// ============================================================

function verifyApprovalMetadata(value: any): StandardViolation[] {
  const violations: StandardViolation[] = [];
  const approvals = getApprovals(value);

  for (const a of approvals) {
    const id = a.approvalId || 'unnamed';
    // Approvals should have a URI set (placeholder or real) so they display properly in the frontend
    if (!a.uri && a.uri !== '') {
      // Missing entirely — not a blocker but note it
    }
    // More importantly: if collectionMetadata has placeholder URIs set, approvals should too
    // The frontend renders approval cards and needs metadata for each
    // Check: if the collection uses placeholder metadata pattern, approvals should match
    const collUri = value.collectionMetadata?.uri || '';
    const usesPlaceholders = collUri.startsWith('ipfs://METADATA_');
    if (usesPlaceholders && (!a.uri || a.uri === '')) {
      violations.push({
        standard: 'Common',
        field: `collectionApprovals[${id}].uri`,
        message: `Approval "${id}" has no metadata URI. All approvals should have a placeholder URI (e.g. "ipfs://METADATA_APPROVAL_${id.toUpperCase().replace(/[^A-Z0-9]/g, '_')}") with corresponding metadata set via set_metadata_placeholders. The frontend renders approval cards and needs name/description/image for each.`,
        fix: `Set uri to a placeholder like "ipfs://METADATA_APPROVAL_${id.toUpperCase().replace(/[^A-Z0-9]/g, '_')}" and call set_metadata_placeholders with a descriptive name and description for this approval.`
      });
    }
  }

  return violations;
}

// ============================================================
// Common: Reserved Symbol Check
// ============================================================

const RESERVED_SYMBOLS = new Set([
  // Major tokens — these already exist on-chain and should not be reused
  'USDC', 'usdc', 'uusdc',
  'ATOM', 'atom', 'uatom',
  'OSMO', 'osmo', 'uosmo',
  'BADGE', 'badge', 'ubadge',
  'ETH', 'eth', 'wei',
  'BTC', 'btc', 'sat', 'sats',
  'USDT', 'usdt',
  'DAI', 'dai',
  'WETH', 'weth',
  'WBTC', 'wbtc',
  'SOL', 'sol',
  'DOT', 'dot',
  'AVAX', 'avax',
  'BNB', 'bnb',
  'MATIC', 'matic',
  'ARB', 'arb',
  'OP', 'op',
  'TIA', 'tia', 'utia',
  'STARS', 'stars', 'ustars',
  'JUNO', 'juno', 'ujuno',
  'EVMOS', 'evmos', 'aevmos',
  'INJ', 'inj',
]);

function verifyReservedSymbols(value: any): StandardViolation[] {
  const violations: StandardViolation[] = [];
  const std = 'Common';

  // Check aliasPathsToAdd
  const aliasPaths = value.aliasPathsToAdd || [];
  for (let i = 0; i < aliasPaths.length; i++) {
    const ap = aliasPaths[i];
    // Check for invalid characters in denom/symbol (only a-zA-Z, _, {, }, - allowed)
    const VALID_DENOM_RE = /^[a-zA-Z_{}/-]+$/;  // Note: / is invalid but IBC denoms have it
    const INVALID_DENOM_RE = /[^a-zA-Z0-9_{}/-]/;  // any truly invalid chars
    if (ap.denom && ap.denom.includes('/')) {
      violations.push({
        standard: std,
        field: `aliasPathsToAdd[${i}].denom`,
        message: `Alias path denom "${ap.denom}" contains "/" which is not allowed. Do NOT use the raw IBC denom as the alias path denom — create a new unique symbol like "wuusdc" or "uwrapped".`,
        fix: `Change denom to a simple alphanumeric string like "wuusdc" (no "/" characters).`
      });
    }
    if (ap.symbol && ap.symbol.includes('/')) {
      violations.push({
        standard: std,
        field: `aliasPathsToAdd[${i}].symbol`,
        message: `Alias path symbol "${ap.symbol}" contains "/" which is not allowed. Create a new unique symbol.`,
        fix: `Change symbol to a simple alphanumeric string (no "/" characters).`
      });
    }
    if (ap.symbol && RESERVED_SYMBOLS.has(ap.symbol)) {
      violations.push({
        standard: std,
        field: `aliasPathsToAdd[${i}].symbol`,
        message: `Alias path symbol "${ap.symbol}" is a reserved/existing token symbol. New wrapped tokens must use a unique symbol (e.g. "w${ap.symbol}", "v${ap.symbol}", or a custom name) to avoid confusion with the underlying native token.`,
        fix: `Change the symbol to something unique like "w${ap.symbol}" or a custom name for this wrapped token.`
      });
    }
    // Also check denomUnits
    if (Array.isArray(ap.denomUnits)) {
      for (let j = 0; j < ap.denomUnits.length; j++) {
        const du = ap.denomUnits[j];
        if (du.symbol && RESERVED_SYMBOLS.has(du.symbol)) {
          violations.push({
            standard: std,
            field: `aliasPathsToAdd[${i}].denomUnits[${j}].symbol`,
            message: `Denom unit symbol "${du.symbol}" is a reserved/existing token symbol. Use a unique display symbol (e.g. "w${du.symbol}", "v${du.symbol}") for your new wrapped token.`,
            fix: `Change to a unique symbol like "w${du.symbol}" to distinguish from the native ${du.symbol} token.`
          });
        }
      }
    }
    // Check denom field too
    if (ap.denom && RESERVED_SYMBOLS.has(ap.denom)) {
      violations.push({
        standard: std,
        field: `aliasPathsToAdd[${i}].denom`,
        message: `Alias path denom "${ap.denom}" is a reserved token denom. Use a unique denom for the alias path (e.g. "w${ap.denom}").`,
        fix: `Change denom to a unique value like "w${ap.denom}".`
      });
    }
  }

  // Check cosmosCoinWrapperPathsToAdd
  const wrapperPaths = value.cosmosCoinWrapperPathsToAdd || [];
  for (let i = 0; i < wrapperPaths.length; i++) {
    const wp = wrapperPaths[i];
    if (wp.symbol && RESERVED_SYMBOLS.has(wp.symbol)) {
      violations.push({
        standard: std,
        field: `cosmosCoinWrapperPathsToAdd[${i}].symbol`,
        message: `Cosmos coin wrapper symbol "${wp.symbol}" is a reserved token symbol. Use a unique symbol for this wrapped token.`,
        fix: `Change to a unique symbol like "w${wp.symbol}".`
      });
    }
    if (wp.denom && RESERVED_SYMBOLS.has(wp.denom)) {
      violations.push({
        standard: std,
        field: `cosmosCoinWrapperPathsToAdd[${i}].denom`,
        message: `Cosmos coin wrapper denom "${wp.denom}" is a reserved token denom. Use a unique denom.`,
        fix: `Change to a unique denom like "w${wp.denom}".`
      });
    }
  }

  return violations;
}

// ============================================================
// Common: Metadata Quality
// ============================================================

const LAZY_METADATA_PATTERNS = [
  /^(collection|token|badge|nft|approval|metadata)\s*(name|#?\d*)?$/i,
  /^(name|title|description)\s*(here|placeholder|todo|tbd|tba|example)?$/i,
  /^(approval|transfer)\s*\d+$/i,
  /^my (token|collection|nft|badge)$/i,
  /^(test|sample|placeholder|default)\s*(token|collection|nft|badge|metadata)?$/i,
  /^(token|badge|nft)\s*#?\{?id\}?$/i, // "Token #1", "NFT {id}", "Badge #id"
];

function isLazyMetadata(text: string): boolean {
  if (!text || text.trim().length === 0) return false;
  const trimmed = text.trim();
  if (trimmed.length < 3) return true;
  return LAZY_METADATA_PATTERNS.some(p => p.test(trimmed));
}

const BITBADGES_DEFAULT_IMAGE = 'ipfs://QmNTpizCkY5tcMpPMf1kkn7Y5YxFQo3oT54A9oKP5ijP9E';
const FAKE_IMAGE_PATTERNS = [
  /^ipfs:\/\/Qm(NonExistent|Placeholder|Example|Default|Test|TODO|TBD|XXXXX)/i,
  /^ipfs:\/\/baf(NonExistent|Placeholder|Example|Default|Test|TODO)/i,
  /^https?:\/\/(example\.com|placeholder|test)/i,
];

function isFakeOrMissingImage(image: string | undefined): boolean {
  if (!image || image.trim() === '') return true;
  return FAKE_IMAGE_PATTERNS.some(p => p.test(image));
}

function verifyMetadataPlaceholders(value: any): StandardViolation[] {
  const violations: StandardViolation[] = [];
  const std = 'Common';

  // Check tokenMetadata for lazy patterns in inline metadata
  if (Array.isArray(value.tokenMetadata)) {
    for (let i = 0; i < value.tokenMetadata.length; i++) {
      const tm = value.tokenMetadata[i];
      if (tm?.name && isLazyMetadata(tm.name)) {
        violations.push({
          standard: std,
          field: `tokenMetadata[${i}].name`,
          message: `Token metadata name "${tm.name}" looks like a placeholder. Every name must be specific and descriptive.`,
          fix: 'Replace with a real, descriptive name that explains what this token represents.'
        });
      }
      if (tm?.description && isLazyMetadata(tm.description)) {
        violations.push({
          standard: std,
          field: `tokenMetadata[${i}].description`,
          message: `Token metadata description "${tm.description}" looks like a placeholder. Every description must be meaningful (1-2 sentences).`,
          fix: 'Replace with a real description explaining what this token does and who can use it.'
        });
      }
    }
  }

  // Check approval names for lazy patterns
  const approvals = getApprovals(value);
  for (const a of approvals) {
    if (a.approvalId && isLazyMetadata(a.approvalId)) {
      violations.push({
        standard: std,
        field: `collectionApprovals[${a.approvalId}].approvalId`,
        message: `Approval ID "${a.approvalId}" looks like a placeholder. Approval IDs should be descriptive (e.g. "public-mint", "manager-transfer").`,
        fix: 'Use a descriptive, kebab-case approval ID that explains what this approval does.'
      });
    }
  }

  // Check alias path metadata — ALL alias paths and denomUnits MUST have metadata with an image
  const aliasPaths = value.aliasPathsToAdd || [];
  for (let i = 0; i < aliasPaths.length; i++) {
    const ap = aliasPaths[i];
    if (!ap.metadata) {
      violations.push({
        standard: std,
        field: `aliasPathsToAdd[${i}].metadata`,
        message: `Alias path "${ap.denom || i}" is missing metadata entirely. All alias paths MUST have metadata with a uri, customData, and image.`,
        fix: `Add metadata: { uri: "", customData: "", image: "${BITBADGES_DEFAULT_IMAGE}" }.`
      });
    } else if (isFakeOrMissingImage(ap.metadata?.image)) {
      violations.push({
        standard: std,
        field: `aliasPathsToAdd[${i}].metadata.image`,
        message: `Alias path metadata has no image or uses a fake placeholder. Use the BitBadges default: "${BITBADGES_DEFAULT_IMAGE}" or the user-provided image.`,
        fix: `Set metadata.image to "${BITBADGES_DEFAULT_IMAGE}".`
      });
    }
    // Check denomUnit metadata — each denomUnit MUST have metadata with an image
    if (Array.isArray(ap.denomUnits)) {
      for (let j = 0; j < ap.denomUnits.length; j++) {
        const du = ap.denomUnits[j];
        if (!du.metadata) {
          violations.push({
            standard: std,
            field: `aliasPathsToAdd[${i}].denomUnits[${j}].metadata`,
            message: `Denom unit "${du.symbol || j}" is missing metadata entirely. All denomUnits MUST have metadata with a uri, customData, and image.`,
            fix: `Add metadata: { uri: "", customData: "", image: "${BITBADGES_DEFAULT_IMAGE}" }.`
          });
        } else if (isFakeOrMissingImage(du.metadata?.image)) {
          violations.push({
            standard: std,
            field: `aliasPathsToAdd[${i}].denomUnits[${j}].metadata.image`,
            message: `Denom unit "${du.symbol || j}" metadata has no image or uses a fake placeholder.`,
            fix: `Set metadata.image to "${BITBADGES_DEFAULT_IMAGE}".`
          });
        }
      }
    }
  }

  // Check cosmos coin wrapper path metadata
  const wrapperPaths = value.cosmosCoinWrapperPathsToAdd || [];
  for (let i = 0; i < wrapperPaths.length; i++) {
    const wp = wrapperPaths[i];
    if (!wp.metadata) {
      violations.push({
        standard: std,
        field: `cosmosCoinWrapperPathsToAdd[${i}].metadata`,
        message: `Cosmos coin wrapper path is missing metadata entirely. MUST have metadata with image.`,
        fix: `Add metadata: { uri: "", customData: "", image: "${BITBADGES_DEFAULT_IMAGE}" }.`
      });
    } else if (isFakeOrMissingImage(wp.metadata?.image)) {
      violations.push({
        standard: std,
        field: `cosmosCoinWrapperPathsToAdd[${i}].metadata.image`,
        message: `Cosmos coin wrapper path metadata has no image or uses a fake placeholder.`,
        fix: `Set metadata.image to "${BITBADGES_DEFAULT_IMAGE}".`
      });
    }
  }

  return violations;
}

// ============================================================
// Common: Approval Tracking Fields (approvalAmounts / maxNumTransfers)
// ============================================================

const TRACKING_REQUIRED_FIELDS: Record<string, string[]> = {
  approvalAmounts: [
    'overallApprovalAmount', 'perToAddressApprovalAmount',
    'perFromAddressApprovalAmount', 'perInitiatedByAddressApprovalAmount',
    'amountTrackerId', 'resetTimeIntervals'
  ],
  maxNumTransfers: [
    'overallMaxNumTransfers', 'perToAddressMaxNumTransfers',
    'perFromAddressMaxNumTransfers', 'perInitiatedByAddressMaxNumTransfers',
    'amountTrackerId', 'resetTimeIntervals'
  ]
};

function verifyApprovalTrackingFields(value: any): StandardViolation[] {
  const violations: StandardViolation[] = [];
  const approvals = value.collectionApprovals || [];

  for (const approval of approvals) {
    const criteria = approval.approvalCriteria;
    if (!criteria) continue;

    for (const [field, requiredKeys] of Object.entries(TRACKING_REQUIRED_FIELDS)) {
      const obj = criteria[field];
      if (!obj || typeof obj !== 'object') continue;

      const missing = requiredKeys.filter(k => !(k in obj));
      if (missing.length > 0) {
        violations.push({
          standard: 'Common',
          field: `collectionApprovals[${approval.approvalId}].approvalCriteria.${field}`,
          message: `Incomplete ${field}: missing required fields [${missing.join(', ')}]. All fields must be present — use "0" for unused limits and {startTime: "0", intervalLength: "0"} for resetTimeIntervals.`
        });
      }

      // Check resetTimeIntervals sub-fields
      if (obj.resetTimeIntervals && typeof obj.resetTimeIntervals === 'object') {
        if (!('startTime' in obj.resetTimeIntervals) || !('intervalLength' in obj.resetTimeIntervals)) {
          violations.push({
            standard: 'Common',
            field: `collectionApprovals[${approval.approvalId}].approvalCriteria.${field}.resetTimeIntervals`,
            message: `resetTimeIntervals must have both "startTime" and "intervalLength" — use "0" for no time intervals.`
          });
        }
      }
    }
  }

  return violations;
}

// ============================================================
// Main Entry Point
// ============================================================

/**
 * Verify that a collection transaction satisfies all deterministic
 * requirements for its declared standards.
 *
 * Runs with 0 AI tokens — pure structural validation.
 *
 * @param transaction - The full transaction object (with messages array)
 * @returns VerificationResult with violations and checked standards
 */
export function verifyStandardsCompliance(transaction: any): VerificationResult {
  const msg = transaction?.messages?.[0] || transaction?.msgs?.[0];
  const value = msg?.value || msg;
  if (!value) {
    return { valid: false, violations: [{ standard: 'Common', field: 'messages', message: 'Transaction has no messages.' }], standardsChecked: [] };
  }

  const standards = getStandards(value);
  const violations: StandardViolation[] = [];
  const standardsChecked: string[] = [];

  // Always run common checks
  violations.push(...verifyCommonMintRules(value));
  violations.push(...verifyApprovalMetadata(value));
  violations.push(...verifyReservedSymbols(value));
  violations.push(...verifyMetadataPlaceholders(value));
  violations.push(...verifyApprovalTrackingFields(value));
  standardsChecked.push('Common (mint rules)', 'Common (approval metadata)', 'Common (reserved symbols)', 'Common (metadata quality)', 'Common (approval tracking)');

  // Run per-standard validators
  for (const std of standards) {
    const canonical = STANDARD_ALIASES[std];
    if (canonical && STANDARD_VALIDATORS[canonical]) {
      violations.push(...STANDARD_VALIDATORS[canonical](value));
      if (!standardsChecked.includes(canonical)) {
        standardsChecked.push(canonical);
      }
    }
  }

  return {
    valid: violations.length === 0,
    violations,
    standardsChecked
  };
}

/**
 * Format verification results as a human-readable string for error display.
 */
export function formatVerificationResult(result: VerificationResult): string {
  if (result.valid) {
    return `Standards verification PASSED. Checked: ${result.standardsChecked.join(', ')}.`;
  }

  const lines: string[] = [];
  lines.push(`Standards verification FAILED — ${result.violations.length} violation(s) found.`);
  lines.push(`Standards checked: ${result.standardsChecked.join(', ')}.`);
  lines.push('');

  for (const v of result.violations) {
    lines.push(`[${v.standard}] ${v.field}: ${v.message}`);
    if (v.fix) {
      lines.push(`  Fix: ${v.fix}`);
    }
  }

  return lines.join('\n');
}
