/**
 * Tool: build_token
 * Universal token builder — single entry point for all collection types.
 * Replaces build_smart_token, build_fungible_token, build_nft_collection.
 */

import { z } from 'zod';
import { generateAliasAddressForIBCBackedDenom } from '../../sdk/addressGenerator.js';
import { lookupTokenInfo, resolveIbcDenom, getDecimals } from '../../sdk/coinRegistry.js';

const MAX_UINT64 = '18446744073709551615';
const FOREVER_TIMES = [{ start: '1', end: MAX_UINT64 }];

// --- Zod Schema ---

const supplySchema = z.union([
  z.literal('single-fungible'),
  z.object({ type: z.literal('fixed-nft'), count: z.string() }),
  z.object({ type: z.literal('multi-edition'), count: z.string(), editionSize: z.string() })
]).default('single-fungible');

const mintingSchema = z.union([
  z.literal('public'),
  z.literal('manager-only'),
  z.literal('ibc-backed'),
  z.literal('none'),
  z.object({
    type: z.enum(['public', 'manager-only', 'ibc-backed', 'none']),
    price: z.string().optional(),
    priceDenom: z.string().optional(),
    maxPerUser: z.string().optional(),
    totalSupply: z.string().optional(),
    ibcDenom: z.string().optional(),
    managerAddress: z.string().optional(),
    dailyWithdrawLimit: z.string().optional(),
    totalWithdrawLimit: z.string().optional(),
    requires2FA: z.boolean().optional(),
    twoFACollectionId: z.string().optional()
  })
]).default('public');

const timeBehaviorSchema = z.union([
  z.literal('permanent'),
  z.object({ type: z.enum(['expiring', 'subscription']), durationMs: z.string() })
]).default('permanent');

export const buildTokenSchema = z.object({
  creatorAddress: z.string().describe('Creator/manager address (bb1...)'),
  name: z.string().describe('Collection/token name'),

  // Token type preset
  tokenType: z.enum(['auto', 'smart-token', 'fungible-token', 'nft-collection', 'quest']).default('auto').describe('Token type preset'),

  // Smart-token specific fields
  ibcDenom: z.string().optional().describe('[smart-token] IBC denom or symbol'),
  dailyWithdrawLimit: z.string().optional().describe('[smart-token] Daily withdrawal limit'),
  totalWithdrawLimit: z.string().optional().describe('[smart-token] Total withdrawal limit'),
  requires2FA: z.boolean().optional().describe('[smart-token] Whether 2FA is required'),
  twoFACollectionId: z.string().optional().describe('[smart-token] Collection ID for 2FA tokens'),

  // Quest specific fields
  rewardAmount: z.string().optional().describe('[quest] Reward amount per claim in base units'),
  rewardDenom: z.string().optional().describe('[quest] Reward denomination (default "ubadge")'),
  maxClaims: z.string().optional().describe('[quest] Maximum number of claims'),

  // Fungible/NFT specific fields
  totalSupply: z.string().optional().describe('[fungible-token/nft-collection] Total supply'),
  mintPrice: z.string().optional().describe('[fungible-token/nft-collection] Mint price'),
  mintPriceDenom: z.string().optional().describe('[fungible-token/nft-collection] Mint price denom'),
  maxPerUser: z.string().optional().describe('[fungible-token/nft-collection] Max per user'),

  // Shared convenience flags
  transferable: z.boolean().optional().describe('Allow transfers (default true)'),
  swappable: z.boolean().optional().describe('Enable liquidity pool trading'),
  tradable: z.boolean().optional().describe('[nft-collection] Enable marketplace trading'),
  tradingCurrency: z.string().optional().describe('[nft-collection] Trading currency denom'),
  immutable: z.boolean().optional().describe('Lock all permissions'),

  // Design axes
  supply: supplySchema.describe('Supply model: "single-fungible", {type:"fixed-nft",count} or {type:"multi-edition",count,editionSize}'),
  minting: mintingSchema.describe('Minting mechanism: "public", "manager-only", "ibc-backed", "none", or object with options'),
  transferability: z.enum(['free', 'non-transferable', 'restricted']).default('free').describe('Transfer behavior'),
  timeBehavior: timeBehaviorSchema.describe('Time behavior: "permanent" or {type:"expiring"|"subscription", durationMs}'),
  permissions: z.enum(['immutable', 'locked-approvals', 'manager-controlled']).default('locked-approvals').describe('Permission preset'),
  trading: z.object({
    swappable: z.boolean().optional(),
    tradable: z.boolean().optional(),
    currency: z.string().optional()
  }).optional().describe('Trading options'),
  accessControl: z.object({
    mustOwnTokens: z.array(z.object({
      collectionId: z.string(),
      amountRange: z.object({ start: z.string(), end: z.string() }).optional(),
      tokenIds: z.array(z.object({ start: z.string(), end: z.string() })).optional(),
      ownershipCheckParty: z.enum(['initiator', 'from', 'to']).optional()
    })).optional(),
    dynamicStoreChallenges: z.array(z.unknown()).optional(),
    evmQueryChallenges: z.array(z.unknown()).optional()
  }).optional().describe('Access control requirements'),

  // Metadata
  symbol: z.string().optional().describe('Token symbol'),
  description: z.string().optional().describe('Collection description'),
  imageUrl: z.string().optional().describe('Image URL'),
  decimals: z.string().optional().describe('Token decimals (default "9" for fungible, N/A for NFT)'),

  // Advanced overrides
  customApprovals: z.array(z.unknown()).optional().describe('Additional custom approvals to append'),
  customPermissions: z.record(z.enum(['allowed', 'forbidden', 'neutral'])).optional().describe('Per-key permission overrides'),
  customData: z.string().optional().describe('Custom data string (JSON)')
});

/** Output type after Zod defaults are applied */
export type BuildTokenInput = z.infer<typeof buildTokenSchema>;

/** Input type before Zod defaults — tokenType and other preset fields are optional */
export type BuildTokenRawInput = z.input<typeof buildTokenSchema>;

export interface BuildTokenResult {
  success: boolean;
  transaction?: {
    messages: unknown[];
    metadataPlaceholders?: Record<string, { name: string; description: string; image: string }>;
  };
  designSummary?: {
    supply: string;
    minting: string;
    transferability: string;
    timeBehavior: string;
    permissions: string;
    features: string[];
  };
  warnings?: string[];
  nextSteps?: string;
  error?: string;
}

export const buildTokenTool = {
  name: 'build_token',
  description: 'Universal token builder — single entry point for all collection types (fungible tokens, NFT collections, IBC-backed smart tokens, etc.). Set tokenType for simplified inputs, or use the full design axes directly. Returns MsgUniversalUpdateCollection JSON. Read bitbadges://schema/token-builder for the full field reference.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      creatorAddress: { type: 'string', description: 'Creator/manager address (bb1...)' },
      name: { type: 'string', description: 'Collection/token name' },
      tokenType: {
        type: 'string',
        enum: ['auto', 'smart-token', 'fungible-token', 'nft-collection', 'quest'],
        description: 'Token type preset (default "auto"). "smart-token": IBC-backed token — requires ibcDenom, symbol. "fungible-token": ERC-20 style — requires symbol. "nft-collection": NFT collection — requires totalSupply. "quest": Quest/reward collection — requires rewardAmount, maxClaims. "auto": use explicit design axes below.'
      },
      // Smart-token specific (tokenType="smart-token")
      ibcDenom: { type: 'string', description: '[smart-token] IBC denom or symbol (e.g., "USDC", "ibc/F082B65...")' },
      dailyWithdrawLimit: { type: 'string', description: '[smart-token] Daily withdrawal limit in base units' },
      totalWithdrawLimit: { type: 'string', description: '[smart-token] Total withdrawal limit in base units' },
      requires2FA: { type: 'boolean', description: '[smart-token] Whether 2FA is required for withdrawals' },
      twoFACollectionId: { type: 'string', description: '[smart-token] Collection ID for 2FA tokens' },
      // Quest specific (tokenType="quest")
      rewardAmount: { type: 'string', description: '[quest] Reward amount per claim in base units' },
      rewardDenom: { type: 'string', description: '[quest] Reward denomination (default "ubadge")' },
      maxClaims: { type: 'string', description: '[quest] Maximum number of claims' },
      // Fungible/NFT specific
      totalSupply: { type: 'string', description: '[fungible-token/nft-collection] Total supply' },
      mintPrice: { type: 'string', description: '[fungible-token/nft-collection] Mint price in base units' },
      mintPriceDenom: { type: 'string', description: '[fungible-token/nft-collection] Mint price denomination' },
      maxPerUser: { type: 'string', description: '[fungible-token/nft-collection] Maximum per user' },
      // Shared convenience flags
      transferable: { type: 'boolean', description: 'Allow transfers (default true). Shorthand for transferability.' },
      swappable: { type: 'boolean', description: 'Enable liquidity pool trading' },
      tradable: { type: 'boolean', description: '[nft-collection] Enable marketplace trading' },
      tradingCurrency: { type: 'string', description: '[nft-collection] Trading currency denom (default "ubadge")' },
      immutable: { type: 'boolean', description: 'Lock all permissions (fully immutable)' },
      // Full design axes (used when tokenType="auto" or for overrides)
      supply: {
        description: 'Supply model: "single-fungible" (default), {"type":"fixed-nft","count":"N"}, or {"type":"multi-edition","count":"N","editionSize":"M"}',
        oneOf: [
          { type: 'string', enum: ['single-fungible'] },
          { type: 'object', properties: { type: { type: 'string' }, count: { type: 'string' }, editionSize: { type: 'string' } }, required: ['type', 'count'] }
        ]
      },
      minting: {
        description: 'Minting: "public" (default), "manager-only", "ibc-backed", "none", or object with {type, price?, priceDenom?, maxPerUser?, totalSupply?, ibcDenom?, ...}',
        oneOf: [
          { type: 'string', enum: ['public', 'manager-only', 'ibc-backed', 'none'] },
          { type: 'object', properties: { type: { type: 'string' }, price: { type: 'string' }, priceDenom: { type: 'string' }, maxPerUser: { type: 'string' }, totalSupply: { type: 'string' }, ibcDenom: { type: 'string' }, managerAddress: { type: 'string' }, dailyWithdrawLimit: { type: 'string' }, totalWithdrawLimit: { type: 'string' }, requires2FA: { type: 'boolean' }, twoFACollectionId: { type: 'string' } }, required: ['type'] }
        ]
      },
      transferability: { type: 'string', enum: ['free', 'non-transferable', 'restricted'], description: 'Transfer behavior (default "free")' },
      timeBehavior: {
        description: '"permanent" (default) or {"type":"expiring"|"subscription","durationMs":"N"}',
        oneOf: [
          { type: 'string', enum: ['permanent'] },
          { type: 'object', properties: { type: { type: 'string' }, durationMs: { type: 'string' } }, required: ['type', 'durationMs'] }
        ]
      },
      permissions: { type: 'string', enum: ['immutable', 'locked-approvals', 'manager-controlled'], description: 'Permission preset (default "locked-approvals")' },
      trading: { type: 'object', properties: { swappable: { type: 'boolean' }, tradable: { type: 'boolean' }, currency: { type: 'string' } }, description: 'Trading options' },
      accessControl: { type: 'object', description: 'Access control: {mustOwnTokens?, dynamicStoreChallenges?, evmQueryChallenges?}' },
      symbol: { type: 'string', description: 'Token symbol' },
      description: { type: 'string', description: 'Collection description' },
      imageUrl: { type: 'string', description: 'Image URL' },
      decimals: { type: 'string', description: 'Token decimals (default "9")' },
      customApprovals: { type: 'array', description: 'Additional custom approvals to append' },
      customPermissions: { type: 'object', description: 'Per-key permission overrides: {canDeleteCollection: "allowed"|"forbidden"|"neutral", ...}' },
      customData: { type: 'string', description: 'Custom data string (JSON)' }
    },
    required: ['creatorAddress', 'name']
  }
};

// --- Helpers ---

interface ResolvedMinting {
  type: 'public' | 'manager-only' | 'ibc-backed' | 'none';
  price?: string;
  priceDenom?: string;
  maxPerUser?: string;
  totalSupply?: string;
  ibcDenom?: string;
  resolvedIbcDenom?: string;
  backingAddress?: string;
  ibcDecimals?: number;
  managerAddress?: string;
  dailyWithdrawLimit?: string;
  totalWithdrawLimit?: string;
  requires2FA?: boolean;
  twoFACollectionId?: string;
}

interface ResolvedSupply {
  type: 'single-fungible' | 'fixed-nft' | 'multi-edition';
  count: string;
  editionSize: string;
  tokenIdRange: { start: string; end: string }[];
}

function resolveSupply(supply: BuildTokenInput['supply']): ResolvedSupply {
  if (supply === 'single-fungible') {
    return { type: 'single-fungible', count: '1', editionSize: '0', tokenIdRange: [{ start: '1', end: '1' }] };
  }
  if (supply.type === 'fixed-nft') {
    return { type: 'fixed-nft', count: supply.count, editionSize: '1', tokenIdRange: [{ start: '1', end: supply.count }] };
  }
  // multi-edition
  return { type: 'multi-edition', count: supply.count, editionSize: supply.editionSize, tokenIdRange: [{ start: '1', end: supply.count }] };
}

function resolveMinting(minting: BuildTokenInput['minting'], creatorAddress: string): ResolvedMinting | { error: string } {
  if (typeof minting === 'string') {
    if (minting === 'none') return { type: 'none' };
    if (minting === 'ibc-backed') return { error: 'ibc-backed minting requires object form with ibcDenom' };
    return { type: minting };
  }

  const type = minting.type;
  if (type === 'none') return { type: 'none' };

  const result: ResolvedMinting = {
    type,
    price: minting.price,
    priceDenom: minting.priceDenom,
    maxPerUser: minting.maxPerUser,
    totalSupply: minting.totalSupply,
    managerAddress: minting.managerAddress || creatorAddress,
    dailyWithdrawLimit: minting.dailyWithdrawLimit,
    totalWithdrawLimit: minting.totalWithdrawLimit,
    requires2FA: minting.requires2FA,
    twoFACollectionId: minting.twoFACollectionId
  };

  if (type === 'ibc-backed') {
    const ibcInput = minting.ibcDenom;
    if (!ibcInput) return { error: 'ibc-backed minting requires ibcDenom in minting options' };

    let ibcDenom = ibcInput;
    if (!ibcDenom.startsWith('ibc/')) {
      const resolved = resolveIbcDenom(ibcDenom);
      if (resolved) {
        ibcDenom = resolved;
      } else {
        const tokenInfo = lookupTokenInfo(ibcDenom);
        if (tokenInfo) {
          ibcDenom = tokenInfo.ibcDenom;
        } else {
          return { error: `Could not resolve "${ibcInput}" to IBC denom. Use known symbol (USDC, ATOM, OSMO) or full IBC denom.` };
        }
      }
    }

    result.ibcDenom = ibcInput;
    result.resolvedIbcDenom = ibcDenom;
    result.backingAddress = generateAliasAddressForIBCBackedDenom(ibcDenom);
    result.ibcDecimals = getDecimals(ibcDenom);

    if (result.requires2FA && !result.twoFACollectionId) {
      return { error: 'twoFACollectionId is required when requires2FA is true' };
    }
  }

  return result;
}

function buildApprovals(
  resolvedSupply: ResolvedSupply,
  resolvedMinting: ResolvedMinting,
  input: BuildTokenInput,
  creatorAddress: string
): Record<string, unknown>[] {
  const approvals: Record<string, unknown>[] = [];
  const tokenIds = resolvedSupply.tokenIdRange;
  const isNFT = resolvedSupply.type === 'fixed-nft';

  // --- Minting approval ---
  if (resolvedMinting.type === 'public' || resolvedMinting.type === 'manager-only') {
    const criteria: Record<string, unknown> = { overridesFromOutgoingApprovals: true };

    // Price
    if (resolvedMinting.price && resolvedMinting.priceDenom) {
      criteria.coinTransfers = [{
        to: creatorAddress,
        coins: [{ denom: resolvedMinting.priceDenom, amount: resolvedMinting.price }],
        overrideFromWithApproverAddress: false,
        overrideToWithInitiator: false
      }];
    }

    // Resolve time behavior for predetermined balances
    const isSubscription = typeof input.timeBehavior === 'object' && input.timeBehavior.type === 'subscription';
    const isExpiring = typeof input.timeBehavior === 'object' && input.timeBehavior.type === 'expiring';
    const durationMs = typeof input.timeBehavior === 'object' ? input.timeBehavior.durationMs : '0';

    // NFT predetermined balances
    if (isNFT) {
      criteria.predeterminedBalances = {
        manualBalances: [],
        incrementedBalances: {
          startBalances: [{ amount: '1', tokenIds: [{ start: '1', end: '1' }], ownershipTimes: FOREVER_TIMES }],
          incrementTokenIdsBy: '1',
          incrementOwnershipTimesBy: '0',
          durationFromTimestamp: '0',
          allowOverrideTimestamp: false,
          recurringOwnershipTimes: { startTime: '0', intervalLength: '0', chargePeriodLength: '0' },
          allowOverrideWithAnyValidToken: false
        },
        orderCalculationMethod: {
          useOverallNumTransfers: true,
          usePerToAddressNumTransfers: false,
          usePerFromAddressNumTransfers: false,
          usePerInitiatedByAddressNumTransfers: false,
          useMerkleChallengeLeafIndex: false,
          challengeTrackerId: ''
        }
      };

      // NFT max transfers
      criteria.maxNumTransfers = {
        overallMaxNumTransfers: resolvedMinting.totalSupply || resolvedSupply.count,
        perToAddressMaxNumTransfers: '0',
        perFromAddressMaxNumTransfers: '0',
        perInitiatedByAddressMaxNumTransfers: resolvedMinting.maxPerUser || '0',
        amountTrackerId: 'nft-mint-tracker',
        resetTimeIntervals: { startTime: '0', intervalLength: '0' }
      };
    } else if (isSubscription || isExpiring) {
      // Subscription/expiring: use predeterminedBalances with durationFromTimestamp
      criteria.predeterminedBalances = {
        manualBalances: [],
        incrementedBalances: {
          startBalances: [{ amount: '1', tokenIds: [{ start: '1', end: '1' }], ownershipTimes: FOREVER_TIMES }],
          incrementTokenIdsBy: '0',
          incrementOwnershipTimesBy: '0',
          durationFromTimestamp: durationMs,
          allowOverrideTimestamp: true,
          recurringOwnershipTimes: { startTime: '0', intervalLength: '0', chargePeriodLength: '0' },
          allowOverrideWithAnyValidToken: false
        },
        orderCalculationMethod: {
          useOverallNumTransfers: true,
          usePerToAddressNumTransfers: false,
          usePerFromAddressNumTransfers: false,
          usePerInitiatedByAddressNumTransfers: false,
          useMerkleChallengeLeafIndex: false,
          challengeTrackerId: ''
        }
      };
    } else {
      // Fungible supply/per-user limits
      if (resolvedMinting.maxPerUser) {
        criteria.maxNumTransfers = {
          perInitiatedByAddressMaxNumTransfers: '0',
          overallMaxNumTransfers: '0',
          perToAddressMaxNumTransfers: '0',
          perFromAddressMaxNumTransfers: '0',
          amountTrackerId: 'mint-tracker',
          resetTimeIntervals: { startTime: '0', intervalLength: '0' }
        };
        criteria.approvalAmounts = {
          perInitiatedByAddressApprovalAmount: resolvedMinting.maxPerUser,
          overallApprovalAmount: resolvedMinting.totalSupply || '0',
          perToAddressApprovalAmount: '0',
          perFromAddressApprovalAmount: '0',
          amountTrackerId: 'mint-tracker',
          resetTimeIntervals: { startTime: '0', intervalLength: '0' }
        };
      } else if (resolvedMinting.totalSupply && resolvedMinting.totalSupply !== '0') {
        criteria.approvalAmounts = {
          overallApprovalAmount: resolvedMinting.totalSupply,
          perInitiatedByAddressApprovalAmount: '0',
          perToAddressApprovalAmount: '0',
          perFromAddressApprovalAmount: '0',
          amountTrackerId: 'supply-tracker',
          resetTimeIntervals: { startTime: '0', intervalLength: '0' }
        };
      }
    }

    // Access control on mint
    if (input.accessControl?.mustOwnTokens?.length) {
      criteria.mustOwnTokens = input.accessControl.mustOwnTokens.map(mot => ({
        collectionId: mot.collectionId,
        amountRange: mot.amountRange || { start: '1', end: MAX_UINT64 },
        ownershipTimes: FOREVER_TIMES,
        tokenIds: mot.tokenIds || [{ start: '1', end: MAX_UINT64 }],
        overrideWithCurrentTime: true,
        mustSatisfyForAllAssets: false,
        ownershipCheckParty: mot.ownershipCheckParty || 'initiator'
      }));
    }

    // Dynamic store / EVM challenges
    const zkProofs: unknown[] = [];
    if (input.accessControl?.dynamicStoreChallenges?.length) {
      zkProofs.push(...input.accessControl.dynamicStoreChallenges);
    }
    if (input.accessControl?.evmQueryChallenges?.length) {
      zkProofs.push(...input.accessControl.evmQueryChallenges);
    }
    if (zkProofs.length) {
      criteria.zkProofs = zkProofs;
    }

    // Subscription-specific required fields
    if (isSubscription) {
      criteria.requireFromEqualsInitiatedBy = false;
      criteria.requireToEqualsInitiatedBy = false;
      criteria.overridesToIncomingApprovals = false;
      criteria.merkleChallenges = [];
    }

    // Determine approval ID
    let approvalId = 'public-mint';
    if (isSubscription) approvalId = 'subscription-mint';
    else if (resolvedMinting.type === 'manager-only') approvalId = 'manager-mint';

    approvals.push({
      fromListId: 'Mint',
      toListId: 'All',
      initiatedByListId: resolvedMinting.type === 'manager-only'
        ? (resolvedMinting.managerAddress || creatorAddress)
        : 'All',
      transferTimes: FOREVER_TIMES,
      tokenIds,
      ownershipTimes: FOREVER_TIMES,
      uri: `ipfs://METADATA_APPROVAL_${approvalId}`,
      customData: '',
      approvalId,
      approvalCriteria: criteria,
      version: '0'
    });
  } else if (resolvedMinting.type === 'ibc-backed') {
    const backingAddress = resolvedMinting.backingAddress!;

    // Backing approval (deposit)
    approvals.push({
      fromListId: backingAddress,
      toListId: `!${backingAddress}`,
      initiatedByListId: 'All',
      transferTimes: FOREVER_TIMES,
      tokenIds: [{ start: '1', end: '1' }],
      ownershipTimes: FOREVER_TIMES,
      uri: 'ipfs://METADATA_APPROVAL_backing',
      customData: '',
      approvalId: 'smart-token-backing',
      approvalCriteria: { mustPrioritize: true, allowBackedMinting: true },
      version: '0'
    });

    // Unbacking approval (withdraw)
    const unbackingCriteria: Record<string, unknown> = {
      mustPrioritize: true,
      allowBackedMinting: true
    };

    if (resolvedMinting.dailyWithdrawLimit || resolvedMinting.totalWithdrawLimit) {
      unbackingCriteria.approvalAmounts = {
        overallApprovalAmount: resolvedMinting.totalWithdrawLimit || '0',
        perFromAddressApprovalAmount: resolvedMinting.dailyWithdrawLimit || '0',
        perToAddressApprovalAmount: '0',
        perInitiatedByAddressApprovalAmount: '0',
        amountTrackerId: resolvedMinting.dailyWithdrawLimit ? 'daily-withdraw-limit' : 'total-withdraw-limit',
        resetTimeIntervals: resolvedMinting.dailyWithdrawLimit
          ? { startTime: '0', intervalLength: '86400000' }
          : { startTime: '0', intervalLength: '0' }
      };
    }

    if (resolvedMinting.requires2FA && resolvedMinting.twoFACollectionId) {
      unbackingCriteria.mustOwnTokens = [{
        collectionId: resolvedMinting.twoFACollectionId,
        amountRange: { start: '1', end: MAX_UINT64 },
        ownershipTimes: FOREVER_TIMES,
        tokenIds: [{ start: '1', end: MAX_UINT64 }],
        overrideWithCurrentTime: true,
        mustSatisfyForAllAssets: false,
        ownershipCheckParty: 'initiator'
      }];
    }

    approvals.push({
      fromListId: `!Mint:${backingAddress}`,
      toListId: backingAddress,
      initiatedByListId: 'All',
      transferTimes: FOREVER_TIMES,
      tokenIds: [{ start: '1', end: '1' }],
      ownershipTimes: FOREVER_TIMES,
      uri: 'ipfs://METADATA_APPROVAL_unbacking',
      customData: '',
      approvalId: 'smart-token-unbacking',
      approvalCriteria: unbackingCriteria,
      version: '0'
    });
  }

  // --- Transfer approval ---
  if (input.transferability === 'free') {
    approvals.push({
      fromListId: '!Mint',
      toListId: 'All',
      initiatedByListId: 'All',
      transferTimes: FOREVER_TIMES,
      tokenIds: resolvedSupply.type === 'single-fungible' ? [{ start: '1', end: '1' }] : tokenIds,
      ownershipTimes: FOREVER_TIMES,
      uri: 'ipfs://METADATA_APPROVAL_free-transfer',
      customData: '',
      approvalId: 'free-transfer',
      approvalCriteria: {},
      version: '0'
    });
  } else if (input.transferability === 'restricted') {
    const restrictedCriteria: Record<string, unknown> = {};
    if (resolvedMinting.maxPerUser) {
      restrictedCriteria.approvalAmounts = {
        perInitiatedByAddressApprovalAmount: resolvedMinting.maxPerUser,
        overallApprovalAmount: '0',
        perToAddressApprovalAmount: '0',
        perFromAddressApprovalAmount: '0',
        amountTrackerId: 'transfer-tracker',
        resetTimeIntervals: { startTime: '0', intervalLength: '0' }
      };
    }
    approvals.push({
      fromListId: '!Mint',
      toListId: 'All',
      initiatedByListId: 'All',
      transferTimes: FOREVER_TIMES,
      tokenIds,
      ownershipTimes: FOREVER_TIMES,
      uri: 'ipfs://METADATA_APPROVAL_restricted-transfer',
      customData: '',
      approvalId: 'restricted-transfer',
      approvalCriteria: restrictedCriteria,
      version: '0'
    });
  }
  // non-transferable: no transfer approval

  // Custom approvals
  if (input.customApprovals?.length) {
    approvals.push(...(input.customApprovals as Record<string, unknown>[]));
  }

  return approvals;
}

function buildPermissions(
  preset: BuildTokenInput['permissions'],
  tokenIdRange: { start: string; end: string }[],
  customOverrides?: Record<string, string>
): Record<string, unknown> {
  const forbidden = { permanentlyPermittedTimes: [], permanentlyForbiddenTimes: FOREVER_TIMES };
  const allowed = { permanentlyPermittedTimes: FOREVER_TIMES, permanentlyForbiddenTimes: [] };

  const forbiddenTokenIds = { tokenIds: tokenIdRange, permanentlyPermittedTimes: [], permanentlyForbiddenTimes: FOREVER_TIMES };
  const allowedTokenIds = { tokenIds: tokenIdRange, permanentlyPermittedTimes: FOREVER_TIMES, permanentlyForbiddenTimes: [] };

  const forbiddenApprovals = {
    fromListId: 'All', toListId: 'All', initiatedByListId: 'All',
    transferTimes: FOREVER_TIMES, tokenIds: tokenIdRange, ownershipTimes: FOREVER_TIMES,
    approvalId: 'All', permanentlyPermittedTimes: [], permanentlyForbiddenTimes: FOREVER_TIMES
  };
  const allowedApprovals = {
    fromListId: 'All', toListId: 'All', initiatedByListId: 'All',
    transferTimes: FOREVER_TIMES, tokenIds: tokenIdRange, ownershipTimes: FOREVER_TIMES,
    approvalId: 'All', permanentlyPermittedTimes: FOREVER_TIMES, permanentlyForbiddenTimes: []
  };

  type PermKey = 'canDeleteCollection' | 'canArchiveCollection' | 'canUpdateStandards' | 'canUpdateCustomData' |
    'canUpdateManager' | 'canUpdateCollectionMetadata' | 'canUpdateValidTokenIds' | 'canUpdateTokenMetadata' |
    'canUpdateCollectionApprovals' | 'canAddMoreAliasPaths' | 'canAddMoreCosmosCoinWrapperPaths';

  const tokenScopedKeys = new Set<PermKey>(['canUpdateValidTokenIds', 'canUpdateTokenMetadata']);
  const approvalKey: PermKey = 'canUpdateCollectionApprovals';

  const getVal = (key: PermKey, defaultVal: 'allowed' | 'forbidden'): unknown[] => {
    const override = customOverrides?.[key];
    const val = override || defaultVal;
    if (val === 'neutral') return [];
    if (key === approvalKey) return [val === 'forbidden' ? forbiddenApprovals : allowedApprovals];
    if (tokenScopedKeys.has(key)) return [val === 'forbidden' ? forbiddenTokenIds : allowedTokenIds];
    return [val === 'forbidden' ? forbidden : allowed];
  };

  let defaults: Record<PermKey, 'allowed' | 'forbidden'>;

  if (preset === 'immutable') {
    defaults = {
      canDeleteCollection: 'forbidden', canArchiveCollection: 'forbidden', canUpdateStandards: 'forbidden',
      canUpdateCustomData: 'forbidden', canUpdateManager: 'forbidden', canUpdateCollectionMetadata: 'forbidden',
      canUpdateValidTokenIds: 'forbidden', canUpdateTokenMetadata: 'forbidden',
      canUpdateCollectionApprovals: 'forbidden', canAddMoreAliasPaths: 'forbidden', canAddMoreCosmosCoinWrapperPaths: 'forbidden'
    };
  } else if (preset === 'manager-controlled') {
    defaults = {
      canDeleteCollection: 'forbidden', canArchiveCollection: 'allowed', canUpdateStandards: 'forbidden',
      canUpdateCustomData: 'allowed', canUpdateManager: 'forbidden', canUpdateCollectionMetadata: 'allowed',
      canUpdateValidTokenIds: 'allowed', canUpdateTokenMetadata: 'allowed',
      canUpdateCollectionApprovals: 'allowed', canAddMoreAliasPaths: 'allowed', canAddMoreCosmosCoinWrapperPaths: 'allowed'
    };
  } else {
    // locked-approvals (default)
    defaults = {
      canDeleteCollection: 'forbidden', canArchiveCollection: 'allowed', canUpdateStandards: 'forbidden',
      canUpdateCustomData: 'allowed', canUpdateManager: 'forbidden', canUpdateCollectionMetadata: 'allowed',
      canUpdateValidTokenIds: 'forbidden', canUpdateTokenMetadata: 'allowed',
      canUpdateCollectionApprovals: 'forbidden', canAddMoreAliasPaths: 'forbidden', canAddMoreCosmosCoinWrapperPaths: 'forbidden'
    };
  }

  const result: Record<string, unknown[]> = {};
  for (const key of Object.keys(defaults) as PermKey[]) {
    result[key] = getVal(key, defaults[key]);
  }
  return result;
}

function buildAliasPath(symbol: string, decimals: string | number, isIbcBacked: boolean): Record<string, unknown> {
  const denom = isIbcBacked ? `u${symbol.toLowerCase()}` : symbol.toLowerCase();
  const metadataUri = isIbcBacked ? 'ipfs://METADATA_ALIAS_PATH' : 'ipfs://METADATA_ALIAS_PATH';
  return {
    denom,
    symbol: denom,
    conversion: {
      sideA: { amount: '1' },
      sideB: [{ amount: '1', tokenIds: [{ start: '1', end: '1' }], ownershipTimes: FOREVER_TIMES }]
    },
    denomUnits: [{
      decimals: String(decimals),
      symbol,
      isDefaultDisplay: true,
      metadata: { uri: metadataUri, customData: '' }
    }],
    metadata: { uri: metadataUri, customData: '' }
  };
}

const DEFAULT_IMAGE = 'ipfs://QmbC7wwg3s2HkbBRu46AtgqJy7wPBbgkNVB6ssfMQ1WS16';

function validate(message: Record<string, unknown>, resolvedMinting: ResolvedMinting, input: BuildTokenInput): string[] {
  const warnings: string[] = [];
  const value = message.value as Record<string, unknown>;

  // 1. Creator address
  if (!(value.creator as string)?.startsWith('bb1')) {
    warnings.push('CRITICAL: creator must start with "bb1"');
  }

  // 3-5. Approval checks
  const approvals = (value.collectionApprovals || []) as Record<string, unknown>[];
  for (const appr of approvals) {
    const criteria = (appr.approvalCriteria || {}) as Record<string, unknown>;
    const id = appr.approvalId as string;

    if (appr.fromListId === 'Mint' && !criteria.overridesFromOutgoingApprovals) {
      warnings.push(`CRITICAL: Mint approval "${id}" missing overridesFromOutgoingApprovals:true`);
    }

    if (id === 'smart-token-backing') {
      if (!criteria.mustPrioritize) warnings.push(`CRITICAL: ${id} missing mustPrioritize:true`);
      if (!criteria.allowBackedMinting) warnings.push(`CRITICAL: ${id} missing allowBackedMinting:true`);
      if (!criteria.overridesFromOutgoingApprovals) warnings.push(`CRITICAL: ${id} must have overridesFromOutgoingApprovals:true (backing address is protocol-controlled)`);
    }
    if (id === 'smart-token-unbacking') {
      if (!criteria.mustPrioritize) warnings.push(`CRITICAL: ${id} missing mustPrioritize:true`);
      if (!criteria.allowBackedMinting) warnings.push(`CRITICAL: ${id} missing allowBackedMinting:true`);
      if (criteria.overridesFromOutgoingApprovals) warnings.push(`CRITICAL: ${id} must NOT have overridesFromOutgoingApprovals (sender is a regular user)`);
    }
  }

  // 6. defaultBalances check
  const db = value.defaultBalances as Record<string, unknown>;
  if (resolvedMinting.type !== 'none' && !db?.autoApproveAllIncomingTransfers) {
    warnings.push('CRITICAL: defaultBalances.autoApproveAllIncomingTransfers must be true for mintable collections');
  }

  // 7. Non-transferable check
  if (input.transferability === 'non-transferable') {
    const hasTransfer = approvals.some(a => (a.approvalId as string)?.includes('transfer'));
    if (hasTransfer) warnings.push('WARNING: Non-transferable collection has a transfer approval');
  }

  // 9. Swappable check
  const inv = value.invariants as Record<string, unknown>;
  if (input.trading?.swappable) {
    if (inv?.disablePoolCreation) warnings.push('WARNING: swappable but disablePoolCreation is true');
    if (!(value.aliasPathsToAdd as unknown[])?.length) warnings.push('WARNING: swappable but no alias path');
  }

  // Subscription checks
  const isSubscription = typeof input.timeBehavior === 'object' && input.timeBehavior.type === 'subscription';
  if (isSubscription) {
    const subApproval = approvals.find(a => (a.approvalId as string) === 'subscription-mint');
    if (subApproval) {
      const subCriteria = (subApproval.approvalCriteria || {}) as Record<string, unknown>;
      const pb = subCriteria.predeterminedBalances as Record<string, unknown> | undefined;
      const ib = (pb?.incrementedBalances || {}) as Record<string, unknown>;
      if (!ib.durationFromTimestamp || ib.durationFromTimestamp === '0') {
        warnings.push('CRITICAL: Subscription durationFromTimestamp must be non-zero');
      }
      if (ib.allowOverrideTimestamp !== true) {
        warnings.push('CRITICAL: Subscription allowOverrideTimestamp must be true');
      }
    }
    if (inv?.noCustomOwnershipTimes) {
      warnings.push('CRITICAL: Subscription requires noCustomOwnershipTimes: false');
    }
    const stds = (value.standards || []) as string[];
    if (!stds.includes('Subscriptions')) {
      warnings.push('CRITICAL: Subscription missing "Subscriptions" in standards');
    }
  }

  // 10. IBC backed check
  if (resolvedMinting.type === 'ibc-backed' && !inv?.cosmosCoinBackedPath) {
    warnings.push('CRITICAL: ibc-backed but cosmosCoinBackedPath not set in invariants');
  }

  // 11. Quest checks
  if (input.tokenType === 'quest') {
    const stds = (value.standards || []) as string[];
    if (!stds.includes('Quests')) {
      warnings.push('CRITICAL: Quest missing "Quests" in standards');
    }
    if (!inv?.noCustomOwnershipTimes) {
      warnings.push('CRITICAL: Quest requires noCustomOwnershipTimes: true');
    }
    const questApproval = approvals.find(a => (a.approvalId as string) === 'quest-approval');
    if (questApproval) {
      const qCriteria = (questApproval.approvalCriteria || {}) as Record<string, unknown>;
      if (!qCriteria.overridesFromOutgoingApprovals) {
        warnings.push('CRITICAL: Quest approval missing overridesFromOutgoingApprovals: true');
      }
    } else {
      warnings.push('CRITICAL: Quest collection missing quest-approval');
    }
  }

  return warnings;
}

// --- Token Type Preset Resolution ---

/**
 * Resolves tokenType presets into explicit design axes.
 * When tokenType is set, the convenience fields (ibcDenom, totalSupply, etc.)
 * are mapped to the corresponding design axes. Explicit design axes always
 * take precedence over preset defaults.
 */
export function resolveTokenTypePreset(input: BuildTokenInput): BuildTokenInput {
  const tokenType = input.tokenType || 'auto';
  if (tokenType === 'auto') {
    // Still apply convenience flags even in auto mode
    const result = { ...input };
    if (input.transferable === false && !input.transferability) {
      result.transferability = 'non-transferable';
    }
    if (input.immutable && !input.permissions) {
      result.permissions = 'immutable';
    }
    if ((input.swappable || input.tradable) && !input.trading) {
      result.trading = {
        swappable: input.swappable,
        tradable: input.tradable,
        currency: input.tradingCurrency
      };
    }
    return result;
  }

  const result = { ...input };

  if (tokenType === 'smart-token') {
    // IBC-backed smart token defaults
    if (!result.supply) result.supply = 'single-fungible';
    if (!result.minting) {
      if (!input.ibcDenom) {
        // Will fail validation later, but set what we can
        result.minting = { type: 'ibc-backed' as const, ibcDenom: '' };
      } else {
        result.minting = {
          type: 'ibc-backed' as const,
          ibcDenom: input.ibcDenom,
          dailyWithdrawLimit: input.dailyWithdrawLimit,
          totalWithdrawLimit: input.totalWithdrawLimit,
          requires2FA: input.requires2FA,
          twoFACollectionId: input.twoFACollectionId
        };
      }
    }
    if (!result.transferability) {
      result.transferability = (input.transferable === false) ? 'non-transferable' : 'free';
    }
    if (!result.timeBehavior) result.timeBehavior = 'permanent';
    if (!result.permissions) {
      result.permissions = input.immutable ? 'immutable' : 'locked-approvals';
    }
    if (!result.trading && input.swappable) {
      result.trading = { swappable: true };
    }
  } else if (tokenType === 'fungible-token') {
    // ERC-20 style fungible token defaults
    if (!result.supply) result.supply = 'single-fungible';
    if (!result.decimals) result.decimals = input.decimals || '9';
    if (!result.minting) {
      result.minting = {
        type: 'public' as const,
        price: input.mintPrice,
        priceDenom: input.mintPriceDenom,
        maxPerUser: input.maxPerUser,
        totalSupply: input.totalSupply
      };
    }
    if (!result.transferability) {
      result.transferability = (input.transferable === false) ? 'non-transferable' : 'free';
    }
    if (!result.timeBehavior) result.timeBehavior = 'permanent';
    if (!result.permissions) result.permissions = 'locked-approvals';
    if (!result.trading && input.swappable) {
      result.trading = { swappable: true };
    }
  } else if (tokenType === 'nft-collection') {
    // NFT collection defaults
    const totalSupply = input.totalSupply;
    if (!totalSupply) {
      // Will be caught by handleBuildToken validation
    }
    if (!result.supply && totalSupply) {
      result.supply = { type: 'fixed-nft' as const, count: totalSupply };
    }
    if (!result.minting) {
      result.minting = {
        type: 'public' as const,
        price: input.mintPrice,
        priceDenom: input.mintPriceDenom,
        maxPerUser: input.maxPerUser,
        totalSupply: input.totalSupply
      };
    }
    if (!result.transferability) result.transferability = 'free';
    if (!result.timeBehavior) result.timeBehavior = 'permanent';
    if (!result.permissions) result.permissions = 'locked-approvals';
    if (!result.trading && input.tradable) {
      result.trading = { tradable: true, currency: input.tradingCurrency || 'ubadge' };
    }
  } else if (tokenType === 'quest') {
    // Quest collection: single token, merkle-gated mint, coin reward
    result.supply = 'single-fungible';
    result.minting = 'none'; // quest uses custom approval, not standard minting
    if (!result.transferability) {
      result.transferability = (input.transferable === false) ? 'non-transferable' : 'free';
    }
    if (!result.timeBehavior) result.timeBehavior = 'permanent';
    if (!result.permissions) {
      result.permissions = input.immutable ? 'immutable' : 'locked-approvals';
    }
  }

  return result;
}

// --- Main Handler ---

export function handleBuildToken(rawInput: BuildTokenRawInput): BuildTokenResult {
  try {
    // Phase 0: Parse defaults and resolve tokenType preset into design axes
    const parsed = buildTokenSchema.parse(rawInput);
    const input = resolveTokenTypePreset(parsed);

    // Phase 1: Resolve
    if (!input.creatorAddress.startsWith('bb1')) {
      return { success: false, error: 'Creator address must start with "bb1"' };
    }

    const resolvedSupply = resolveSupply(input.supply);
    const mintingResult = resolveMinting(input.minting, input.creatorAddress);
    if ('error' in mintingResult) {
      return { success: false, error: mintingResult.error };
    }
    const resolvedMinting = mintingResult;

    const isNFT = resolvedSupply.type === 'fixed-nft' || resolvedSupply.type === 'multi-edition';
    const isIbcBacked = resolvedMinting.type === 'ibc-backed';
    const isSwappable = input.trading?.swappable === true;
    const isTradable = input.trading?.tradable === true;
    const symbol = input.symbol || input.name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase();
    const decimals = input.decimals || (isIbcBacked && resolvedMinting.ibcDecimals ? String(resolvedMinting.ibcDecimals) : '9');

    // Phase 2: Generate
    const isQuest = input.tokenType === 'quest';
    let approvals: Record<string, unknown>[];
    let questTokenIds: { start: string; end: string }[] | undefined;
    let mintEscrowCoinsToTransfer: Record<string, unknown>[] = [];

    if (isQuest) {
      // Quest: validate required fields
      if (!input.rewardAmount) {
        return { success: false, error: 'Quest tokenType requires rewardAmount' };
      }
      if (!input.maxClaims) {
        return { success: false, error: 'Quest tokenType requires maxClaims' };
      }

      const rewardAmount = input.rewardAmount;
      const rewardDenom = input.rewardDenom || 'ubadge';
      const maxClaims = input.maxClaims;
      questTokenIds = [{ start: '1', end: '1' }];

      // Build quest approval matching SDK isQuestApproval() validator
      const questApproval: Record<string, unknown> = {
        fromListId: 'Mint',
        toListId: 'All',
        initiatedByListId: 'All',
        transferTimes: FOREVER_TIMES,
        tokenIds: questTokenIds,
        ownershipTimes: FOREVER_TIMES,
        uri: 'ipfs://METADATA_APPROVAL_quest-approval',
        customData: '',
        approvalId: 'quest-approval',
        approvalCriteria: {
          merkleChallenges: [{
            root: '',
            expectedProofLength: '0',
            maxUsesPerLeaf: '1',
            useCreatorAddressAsLeaf: false,
            uri: '',
            customData: ''
          }],
          mustOwnTokens: [],
          dynamicStoreChallenges: [],
          ethSignatureChallenges: [],
          votingChallenges: [],
          evmQueryChallenges: [],
          coinTransfers: BigInt(rewardAmount) > 0n ? [{
            to: '',
            overrideFromWithApproverAddress: true,
            overrideToWithInitiator: true,
            coins: [{ amount: rewardAmount, denom: rewardDenom }]
          }] : [],
          predeterminedBalances: {
            manualBalances: [],
            orderCalculationMethod: {
              useOverallNumTransfers: true,
              usePerToAddressNumTransfers: false,
              usePerFromAddressNumTransfers: false,
              usePerInitiatedByAddressNumTransfers: false,
              useMerkleChallengeLeafIndex: false,
              challengeTrackerId: ''
            },
            incrementedBalances: {
              startBalances: [{ amount: '1', tokenIds: questTokenIds, ownershipTimes: FOREVER_TIMES }],
              incrementTokenIdsBy: '0',
              incrementOwnershipTimesBy: '0',
              durationFromTimestamp: '0',
              allowOverrideTimestamp: false,
              allowOverrideWithAnyValidToken: false,
              recurringOwnershipTimes: { startTime: '0', intervalLength: '0', chargePeriodLength: '0' }
            }
          },
          maxNumTransfers: {
            overallMaxNumTransfers: maxClaims,
            perToAddressMaxNumTransfers: '0',
            perFromAddressMaxNumTransfers: '0',
            perInitiatedByAddressMaxNumTransfers: '0',
            amountTrackerId: 'quest-approval',
            resetTimeIntervals: { startTime: '0', intervalLength: '0' }
          },
          approvalAmounts: {
            overallApprovalAmount: '0',
            perFromAddressApprovalAmount: '0',
            perToAddressApprovalAmount: '0',
            perInitiatedByAddressApprovalAmount: '0',
            amountTrackerId: 'quest-approval',
            resetTimeIntervals: { startTime: '0', intervalLength: '0' }
          },
          requireToEqualsInitiatedBy: false,
          requireFromEqualsInitiatedBy: false,
          overridesFromOutgoingApprovals: true,
          userRoyalties: { percentage: '0', payoutAddress: '' },
          mustPrioritize: false,
          allowBackedMinting: false,
          allowSpecialWrapping: false
        },
        version: '0'
      };

      approvals = [questApproval];

      // Also add transfer approval if transferable
      if (input.transferability === 'free') {
        approvals.push({
          fromListId: '!Mint',
          toListId: 'All',
          initiatedByListId: 'All',
          transferTimes: FOREVER_TIMES,
          tokenIds: questTokenIds,
          ownershipTimes: FOREVER_TIMES,
          uri: 'ipfs://METADATA_APPROVAL_free-transfer',
          customData: '',
          approvalId: 'free-transfer',
          approvalCriteria: {},
          version: '0'
        });
      }

      // Fund escrow
      if (BigInt(rewardAmount) > 0n) {
        mintEscrowCoinsToTransfer = [{
          denom: rewardDenom,
          amount: String(BigInt(rewardAmount) * BigInt(maxClaims))
        }];
      }
    } else {
      approvals = buildApprovals(resolvedSupply, resolvedMinting, input, input.creatorAddress);
    }

    const permissions = buildPermissions(input.permissions, isQuest ? [{ start: '1', end: '1' }] : resolvedSupply.tokenIdRange, input.customPermissions);

    // Standards
    const isSubscription = typeof input.timeBehavior === 'object' && input.timeBehavior.type === 'subscription';
    const standards: string[] = [];
    if (isQuest) {
      standards.push('Quests');
    } else {
      if (isIbcBacked) standards.push('Smart Token');
      if (isSubscription) standards.push('Subscriptions');
      if (!isNFT && !isSubscription) standards.push('Fungible Tokens');
      if (isNFT) standards.push('NFTs');
      if (isSwappable) standards.push('Liquidity Pools');
      if (isTradable) {
        standards.push('NFTMarketplace');
        standards.push(`NFTPricingDenom:${input.trading?.currency || 'ubadge'}`);
      }
    }

    // Alias paths
    const aliasPathsToAdd: Record<string, unknown>[] = [];
    if (!isQuest && (isSwappable || isIbcBacked)) {
      aliasPathsToAdd.push(buildAliasPath(symbol, decimals, isIbcBacked));
    }

    // Invariants
    const isExpiring = typeof input.timeBehavior === 'object' && input.timeBehavior.type === 'expiring';
    const hasTimeBoundedOwnership = isIbcBacked || isSubscription || isExpiring;
    const effectiveTokenIdRange = isQuest ? [{ start: '1', end: '1' }] : resolvedSupply.tokenIdRange;
    const invariants: Record<string, unknown> = {
      noCustomOwnershipTimes: isQuest ? true : !hasTimeBoundedOwnership,
      maxSupplyPerId: isQuest ? '0' : (isNFT ? resolvedSupply.editionSize : (resolvedMinting.totalSupply || '0')),
      noForcefulPostMintTransfers: true,
      disablePoolCreation: isQuest ? true : !isSwappable,
      cosmosCoinBackedPath: isIbcBacked ? {
        conversion: {
          sideA: { amount: '1', denom: resolvedMinting.resolvedIbcDenom },
          sideB: [{ amount: '1', tokenIds: [{ start: '1', end: '1' }], ownershipTimes: FOREVER_TIMES }]
        }
      } : null
    };

    // Token metadata URI
    const tokenMetadataUri = isNFT ? 'ipfs://METADATA_TOKEN_{id}' : 'ipfs://METADATA_TOKEN';

    // Phase 3: Assemble
    const message: Record<string, unknown> = {
      typeUrl: '/tokenization.MsgUniversalUpdateCollection',
      value: {
        creator: input.creatorAddress,
        collectionId: '0',

        updateValidTokenIds: true,
        validTokenIds: effectiveTokenIdRange,

        updateCollectionPermissions: true,
        collectionPermissions: permissions,

        updateManager: true,
        manager: input.creatorAddress,

        updateCollectionMetadata: true,
        collectionMetadata: { uri: 'ipfs://METADATA_COLLECTION', customData: '' },

        updateTokenMetadata: true,
        tokenMetadata: [{ uri: tokenMetadataUri, customData: '', tokenIds: effectiveTokenIdRange }],

        updateCustomData: true,
        customData: input.customData || '',

        updateCollectionApprovals: true,
        collectionApprovals: approvals,

        defaultBalances: {
          balances: [],
          outgoingApprovals: [],
          incomingApprovals: [],
          autoApproveAllIncomingTransfers: true,
          autoApproveSelfInitiatedOutgoingTransfers: true,
          autoApproveSelfInitiatedIncomingTransfers: true,
          userPermissions: {
            canUpdateOutgoingApprovals: [],
            canUpdateIncomingApprovals: [],
            canUpdateAutoApproveSelfInitiatedOutgoingTransfers: [],
            canUpdateAutoApproveSelfInitiatedIncomingTransfers: [],
            canUpdateAutoApproveAllIncomingTransfers: []
          }
        },

        updateStandards: true,
        standards,

        updateIsArchived: false,
        isArchived: false,

        mintEscrowCoinsToTransfer,

        invariants,

        aliasPathsToAdd,

        cosmosCoinWrapperPathsToAdd: []
      }
    };

    // Phase 4: Validate
    const warnings = validate(message, resolvedMinting, input);

    // Build metadata placeholders — ALWAYS (not just ibc-backed)
    const imageUrl = input.imageUrl || DEFAULT_IMAGE;
    const desc = input.description || `${input.name} on BitBadges.`;
    const metadataPlaceholders: Record<string, { name: string; description: string; image: string }> = {
      'ipfs://METADATA_COLLECTION': { name: input.name, description: desc, image: imageUrl },
      [tokenMetadataUri]: { name: input.name, description: desc, image: imageUrl },
    };

    // Add placeholders for each approval that uses a placeholder URI
    for (const approval of approvals) {
      const uri = approval.uri as string | undefined;
      if (uri && typeof uri === 'string' && uri.startsWith('ipfs://METADATA_')) {
        const approvalId = approval.approvalId as string;
        // Generate a human-readable title from the approvalId (e.g. "public-mint" → "Public Mint")
        const approvalTitle = approvalId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        metadataPlaceholders[uri] = {
          name: approvalTitle,
          description: `${approvalTitle} approval for ${input.name}.`,
          image: ''
        };
      }
    }

    // Add alias path placeholder if present
    if (aliasPathsToAdd.length > 0) {
      metadataPlaceholders['ipfs://METADATA_ALIAS_PATH'] = {
        name: symbol,
        description: `${symbol} alias for trading on BitBadges.`,
        image: imageUrl
      };
    }

    // Design summary
    const features: string[] = [];
    if (isQuest) {
      features.push('Quest collection');
      features.push(`Reward: ${input.rewardAmount} ${input.rewardDenom || 'ubadge'} per claim`);
      features.push(`Max claims: ${input.maxClaims}`);
      features.push(`Transferability: ${input.transferability}`);
    } else {
      features.push(resolvedSupply.type === 'single-fungible' ? 'Fungible token' : `${resolvedSupply.count} ${resolvedSupply.type === 'fixed-nft' ? 'NFTs' : 'multi-edition tokens'}`);
      features.push(`Minting: ${resolvedMinting.type}`);
      features.push(`Transferability: ${input.transferability}`);
      if (isSwappable) features.push('Liquidity pools enabled');
      if (isTradable) features.push('Marketplace trading');
      if (resolvedMinting.requires2FA) features.push('2FA required');
    }
    if (input.permissions === 'immutable') features.push('Fully immutable');

    const questNextSteps = 'IMPORTANT: Run audit_collection on this transaction before deploying. Then validate_transaction -> return transaction for user review to deploy.';

    return {
      success: true,
      transaction: {
        messages: [message],
        metadataPlaceholders
      },
      designSummary: {
        supply: isQuest ? 'quest (single token)' : (resolvedSupply.type + (resolvedSupply.type !== 'single-fungible' ? ` (${resolvedSupply.count})` : '')),
        minting: isQuest ? 'quest (merkle-gated)' : resolvedMinting.type,
        transferability: input.transferability,
        timeBehavior: typeof input.timeBehavior === 'string' ? input.timeBehavior : input.timeBehavior.type,
        permissions: input.permissions,
        features
      },
      warnings: warnings.length ? warnings : undefined,
      nextSteps: isQuest ? questNextSteps : 'IMPORTANT: Run audit_collection on this transaction before deploying. Then validate_transaction -> return transaction for user review to deploy.'
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to build token: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
