/**
 * Tool: build_smart_token
 * Build IBC-backed smart token (stablecoin, wrapped asset)
 * Includes metadataPlaceholders support for automatic IPFS upload
 */

import { z } from 'zod';
import { generateAliasAddressForIBCBackedDenom } from '../../sdk/addressGenerator.js';
import { lookupTokenInfo, resolveIbcDenom, getDecimals } from '../../sdk/coinRegistry.js';

const MAX_UINT64 = '18446744073709551615';
const FOREVER_TIMES = [{ start: '1', end: MAX_UINT64 }];

export const buildSmartTokenSchema = z.object({
  ibcDenom: z.string().describe('IBC denom (e.g., "USDC" or "ibc/F082B65...")'),
  creatorAddress: z.string().describe('Creator/manager address (bb1...)'),
  name: z.string().describe('Collection name (e.g., "Wrapped USDC")'),
  symbol: z.string().describe('Token symbol (e.g., "wUSDC")'),
  description: z.string().optional().describe('Collection description (1-2 sentences, end with period)'),
  imageUrl: z.string().optional().describe('Image URL for collection and token metadata'),
  dailyWithdrawLimit: z.string().optional().describe('Daily withdrawal limit in base units'),
  totalWithdrawLimit: z.string().optional().describe('Total withdrawal limit in base units'),
  requires2FA: z.boolean().optional().describe('Whether 2FA is required'),
  twoFACollectionId: z.string().optional().describe('Collection ID for 2FA tokens'),
  swappable: z.boolean().optional().describe('Enable liquidity pool trading'),
  immutable: z.boolean().optional().describe('Lock all permissions')
});

export type BuildSmartTokenInput = z.infer<typeof buildSmartTokenSchema>;

export interface MetadataPlaceholder {
  name: string;
  description: string;
  image: string;
}

export interface BuildSmartTokenResult {
  success: boolean;
  transaction?: {
    messages: unknown[];
    metadataPlaceholders?: Record<string, MetadataPlaceholder>;
  };
  summary?: {
    ibcDenom: string;
    backingAddress: string;
    symbol: string;
    decimals: number;
    features: string[];
  };
  error?: string;
}

export const buildSmartTokenTool = {
  name: 'build_smart_token',
  description: 'Build IBC-backed smart token (stablecoin, wrapped asset). Returns complete MsgUniversalUpdateCollection JSON with metadataPlaceholders for 1:1 backed tokens.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      ibcDenom: {
        type: 'string',
        description: 'Token symbol (e.g., "USDC", "ATOM") or IBC denom (e.g., "ibc/F082B65...")'
      },
      creatorAddress: {
        type: 'string',
        description: 'Creator/manager address (bb1...)'
      },
      name: {
        type: 'string',
        description: 'Collection name (e.g., "Wrapped USDC")'
      },
      symbol: {
        type: 'string',
        description: 'Token symbol for alias path (e.g., "wUSDC")'
      },
      description: {
        type: 'string',
        description: 'Collection description (1-2 sentences, end with period)'
      },
      imageUrl: {
        type: 'string',
        description: 'Image URL for collection and token metadata (IPFS or HTTP)'
      },
      dailyWithdrawLimit: {
        type: 'string',
        description: 'Daily withdrawal limit in base units (e.g., "100000000" for 100 USDC)'
      },
      totalWithdrawLimit: {
        type: 'string',
        description: 'Total withdrawal limit in base units'
      },
      requires2FA: {
        type: 'boolean',
        description: 'Whether 2FA is required for withdrawals'
      },
      twoFACollectionId: {
        type: 'string',
        description: 'Collection ID for 2FA tokens (required if requires2FA is true)'
      },
      swappable: {
        type: 'boolean',
        description: 'Enable liquidity pool trading'
      },
      immutable: {
        type: 'boolean',
        description: 'Lock all permissions (fully immutable)'
      }
    },
    required: ['ibcDenom', 'creatorAddress', 'name', 'symbol']
  }
};

function buildBackingApproval(backingAddress: string): Record<string, unknown> {
  return {
    fromListId: backingAddress,
    toListId: `!${backingAddress}`,
    initiatedByListId: 'All',
    transferTimes: FOREVER_TIMES,
    tokenIds: [{ start: '1', end: '1' }],
    ownershipTimes: FOREVER_TIMES,
    uri: 'ipfs://METADATA_APPROVAL_backing',
    customData: '',
    approvalId: 'smart-token-backing',
    approvalCriteria: {
      mustPrioritize: true,
      allowBackedMinting: true
      // Note: overridesFromOutgoingApprovals defaults to false - DO NOT include for backing addresses
    },
    version: '0'
  };
}

function buildUnbackingApproval(
  backingAddress: string,
  options: {
    dailyLimit?: string;
    totalLimit?: string;
    requires2FA?: boolean;
    twoFACollectionId?: string;
  }
): Record<string, unknown> {
  const criteria: Record<string, unknown> = {
    mustPrioritize: true,
    allowBackedMinting: true
    // Note: overridesFromOutgoingApprovals defaults to false - DO NOT include for backing addresses
  };

  // Add withdrawal limits via approvalAmounts
  if (options.dailyLimit || options.totalLimit) {
    criteria.approvalAmounts = {
      overallApprovalAmount: options.totalLimit || '0',
      perFromAddressApprovalAmount: options.dailyLimit || '0',
      perToAddressApprovalAmount: '0',
      perInitiatedByAddressApprovalAmount: '0',
      amountTrackerId: options.dailyLimit ? 'daily-withdraw-limit' : 'total-withdraw-limit',
      resetTimeIntervals: options.dailyLimit
        ? { startTime: '0', intervalLength: '86400000' } // 24 hours in ms
        : { startTime: '0', intervalLength: '0' }
    };
  }

  // Add 2FA requirement
  if (options.requires2FA && options.twoFACollectionId) {
    criteria.mustOwnTokens = [{
      collectionId: options.twoFACollectionId,
      amountRange: { start: '1', end: MAX_UINT64 },
      ownershipTimes: FOREVER_TIMES,
      tokenIds: [{ start: '1', end: MAX_UINT64 }],
      overrideWithCurrentTime: true,
      mustSatisfyForAllAssets: false,
      ownershipCheckParty: 'initiator'
    }];
  }

  return {
    fromListId: `!Mint:${backingAddress}`,
    toListId: backingAddress,
    initiatedByListId: 'All',
    transferTimes: FOREVER_TIMES,
    tokenIds: [{ start: '1', end: '1' }],
    ownershipTimes: FOREVER_TIMES,
    uri: 'ipfs://METADATA_APPROVAL_unbacking',
    customData: '',
    approvalId: 'smart-token-unbacking',
    approvalCriteria: criteria,
    version: '0'
  };
}

function buildPermissions(immutable: boolean): Record<string, unknown> {
  const forbidden = {
    permanentlyPermittedTimes: [],
    permanentlyForbiddenTimes: FOREVER_TIMES
  };

  const allowed = {
    permanentlyPermittedTimes: FOREVER_TIMES,
    permanentlyForbiddenTimes: []
  };

  const forbiddenTokenIds = {
    tokenIds: [{ start: '1', end: MAX_UINT64 }],
    permanentlyPermittedTimes: [],
    permanentlyForbiddenTimes: FOREVER_TIMES
  };

  const forbiddenApprovals = {
    fromListId: 'All',
    toListId: 'All',
    initiatedByListId: 'All',
    transferTimes: FOREVER_TIMES,
    tokenIds: [{ start: '1', end: MAX_UINT64 }],
    ownershipTimes: FOREVER_TIMES,
    approvalId: 'All',
    permanentlyPermittedTimes: [],
    permanentlyForbiddenTimes: FOREVER_TIMES
  };

  if (immutable) {
    return {
      canDeleteCollection: [forbidden],
      canArchiveCollection: [forbidden],
      canUpdateStandards: [forbidden],
      canUpdateCustomData: [forbidden],
      canUpdateManager: [forbidden],
      canUpdateCollectionMetadata: [forbidden],
      canUpdateValidTokenIds: [forbiddenTokenIds],
      canUpdateTokenMetadata: [forbiddenTokenIds],
      canUpdateCollectionApprovals: [forbiddenApprovals],
      canAddMoreAliasPaths: [forbidden],
      canAddMoreCosmosCoinWrapperPaths: [forbidden]
    };
  }

  // Default: approvals frozen for security, metadata editable
  return {
    canDeleteCollection: [forbidden],
    canArchiveCollection: [allowed],
    canUpdateStandards: [forbidden],
    canUpdateCustomData: [allowed],
    canUpdateManager: [forbidden],
    canUpdateCollectionMetadata: [allowed],
    canUpdateValidTokenIds: [forbiddenTokenIds],
    canUpdateTokenMetadata: [{
      tokenIds: [{ start: '1', end: MAX_UINT64 }],
      permanentlyPermittedTimes: FOREVER_TIMES,
      permanentlyForbiddenTimes: []
    }],
    // IMPORTANT: Freeze approvals for security
    canUpdateCollectionApprovals: [forbiddenApprovals],
    canAddMoreAliasPaths: [forbidden],
    canAddMoreCosmosCoinWrapperPaths: [forbidden]
  };
}

function buildAliasPath(symbol: string, decimals: number): Record<string, unknown> {
  const baseDenom = `u${symbol.toLowerCase()}`;
  return {
    denom: baseDenom,
    symbol: baseDenom,
    conversion: {
      sideA: { amount: '1' },
      sideB: [{
        amount: '1',
        tokenIds: [{ start: '1', end: '1' }],
        ownershipTimes: FOREVER_TIMES
      }]
    },
    // CRITICAL: Only include display units (decimals > 0), NOT base unit
    denomUnits: [{
      decimals: String(decimals),
      symbol: symbol,
      isDefaultDisplay: true,
      metadata: { uri: 'ipfs://METADATA_ALIAS_PATH', customData: '' }
    }],
    // CRITICAL: Metadata MUST be added to BOTH base alias path AND denomUnits
    metadata: { uri: 'ipfs://METADATA_ALIAS_PATH', customData: '' }
  };
}

export function handleBuildSmartToken(input: BuildSmartTokenInput): BuildSmartTokenResult {
  try {
    // Resolve IBC denom
    let ibcDenom = input.ibcDenom;
    let tokenSymbol = input.ibcDenom;
    if (!ibcDenom.startsWith('ibc/')) {
      const resolved = resolveIbcDenom(input.ibcDenom);
      if (!resolved) {
        // Try token lookup
        const tokenInfo = lookupTokenInfo(input.ibcDenom);
        if (tokenInfo) {
          ibcDenom = tokenInfo.ibcDenom;
          tokenSymbol = tokenInfo.symbol;
        } else {
          return {
            success: false,
            error: `Could not resolve "${input.ibcDenom}" to IBC denom. Use known symbol (USDC, ATOM, OSMO) or full IBC denom.`
          };
        }
      } else {
        ibcDenom = resolved;
      }
    }

    // Generate backing address
    const backingAddress = generateAliasAddressForIBCBackedDenom(ibcDenom);
    const decimals = getDecimals(ibcDenom);

    // Validate creator address
    if (!input.creatorAddress.startsWith('bb1')) {
      return {
        success: false,
        error: 'Creator address must start with "bb1"'
      };
    }

    // Check 2FA requirements
    if (input.requires2FA && !input.twoFACollectionId) {
      return {
        success: false,
        error: 'twoFACollectionId is required when requires2FA is true'
      };
    }

    // Build standards
    const standards = ['Smart Token', 'Fungible Tokens'];
    if (input.swappable) {
      standards.push('Liquidity Pools');
    }

    // Build features list
    const features: string[] = ['1:1 IBC backing'];
    if (input.dailyWithdrawLimit) {
      features.push(`Daily limit: ${input.dailyWithdrawLimit} base units`);
    }
    if (input.totalWithdrawLimit) {
      features.push(`Total limit: ${input.totalWithdrawLimit} base units`);
    }
    if (input.requires2FA) {
      features.push('2FA required');
    }
    if (input.swappable) {
      features.push('Liquidity pools enabled');
    }
    if (input.immutable) {
      features.push('Fully immutable');
    }

    // Generate description if not provided
    const description = input.description ||
      `${input.name} backed 1:1 by ${tokenSymbol} via IBC on BitBadges.`;

    // Default image if not provided
    const imageUrl = input.imageUrl || 'ipfs://QmbC7wwg3s2HkbBRu46AtgqJy7wPBbgkNVB6ssfMQ1WS16';

    // Build the message
    const message = {
      typeUrl: '/tokenization.MsgUniversalUpdateCollection',
      value: {
        creator: input.creatorAddress,
        collectionId: '0',

        updateValidTokenIds: true,
        validTokenIds: [{ start: '1', end: '1' }],

        updateCollectionPermissions: true,
        collectionPermissions: buildPermissions(input.immutable || false),

        updateManager: true,
        manager: input.creatorAddress,

        updateCollectionMetadata: true,
        collectionMetadata: {
          uri: 'ipfs://METADATA_COLLECTION',
          customData: ''
        },

        updateTokenMetadata: true,
        tokenMetadata: [{
          uri: 'ipfs://METADATA_TOKEN',
          customData: '',
          tokenIds: [{ start: '1', end: '1' }]
        }],

        updateCustomData: true,
        customData: '',

        updateCollectionApprovals: true,
        collectionApprovals: [
          buildBackingApproval(backingAddress),
          buildUnbackingApproval(backingAddress, {
            dailyLimit: input.dailyWithdrawLimit,
            totalLimit: input.totalWithdrawLimit,
            requires2FA: input.requires2FA,
            twoFACollectionId: input.twoFACollectionId
          })
        ],

        updateStandards: true,
        standards,

        updateIsArchived: false,
        isArchived: false,

        mintEscrowCoinsToTransfer: [],

        invariants: {
          noCustomOwnershipTimes: false,
          maxSupplyPerId: '0',
          noForcefulPostMintTransfers: true,
          disablePoolCreation: !input.swappable,
          cosmosCoinBackedPath: {
            conversion: {
              sideA: { amount: '1', denom: ibcDenom },
              sideB: [{
                amount: '1',
                tokenIds: [{ start: '1', end: '1' }],
                ownershipTimes: FOREVER_TIMES
              }]
            }
          }
        },

        aliasPathsToAdd: [buildAliasPath(input.symbol, decimals)],

        cosmosCoinWrapperPathsToAdd: []
      }
    };

    // Build metadataPlaceholders
    // This is the key feature - metadata is specified separately and will be uploaded to IPFS
    const metadataPlaceholders: Record<string, MetadataPlaceholder> = {
      'ipfs://METADATA_COLLECTION': {
        name: input.name,
        description: description,
        image: imageUrl
      },
      'ipfs://METADATA_TOKEN': {
        name: input.name,
        description: description,
        image: imageUrl
      },
      // CRITICAL: Approval metadata MUST have empty image
      'ipfs://METADATA_APPROVAL_backing': {
        name: 'Backing Approval',
        description: `Allows backing of ${input.symbol} tokens with ${tokenSymbol} via IBC.`,
        image: ''  // REQUIRED: Empty for approval metadata
      },
      'ipfs://METADATA_APPROVAL_unbacking': {
        name: 'Unbacking Approval',
        description: `Allows unbacking of ${input.symbol} tokens to receive ${tokenSymbol} via IBC.`,
        image: ''  // REQUIRED: Empty for approval metadata
      },
      'ipfs://METADATA_ALIAS_PATH': {
        name: input.symbol,
        description: `${input.symbol} alias for liquidity pools and trading.`,
        image: imageUrl
      }
    };

    return {
      success: true,
      transaction: {
        messages: [message],
        metadataPlaceholders
      },
      summary: {
        ibcDenom,
        backingAddress,
        symbol: input.symbol,
        decimals,
        features
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to build Smart Token: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
