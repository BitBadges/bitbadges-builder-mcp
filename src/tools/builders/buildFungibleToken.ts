/**
 * Tool: build_fungible_token
 * Build ERC-20 style fungible token
 */

import { z } from 'zod';

const MAX_UINT64 = '18446744073709551615';
const FOREVER_TIMES = [{ start: '1', end: MAX_UINT64 }];

export const buildFungibleTokenSchema = z.object({
  creatorAddress: z.string().describe('Creator/manager address (bb1...)'),
  name: z.string().describe('Token name'),
  symbol: z.string().describe('Token symbol'),
  description: z.string().optional().describe('Token description'),
  totalSupply: z.string().optional().describe('Total supply (optional, 0 for unlimited)'),
  mintPrice: z.string().optional().describe('Mint price in base units'),
  mintPriceDenom: z.string().optional().describe('Mint price denomination'),
  maxPerUser: z.string().optional().describe('Maximum tokens per user'),
  transferable: z.boolean().optional().describe('Whether tokens can be transferred'),
  swappable: z.boolean().optional().describe('Enable liquidity pool trading'),
  decimals: z.string().optional().describe('Token decimals (default 9)')
});

export type BuildFungibleTokenInput = z.infer<typeof buildFungibleTokenSchema>;

export interface BuildFungibleTokenResult {
  success: boolean;
  transaction?: {
    messages: unknown[];
  };
  summary?: {
    symbol: string;
    decimals: string;
    features: string[];
  };
  error?: string;
}

export const buildFungibleTokenTool = {
  name: 'build_fungible_token',
  description: 'Build ERC-20 style fungible token. Returns complete MsgUniversalUpdateCollection JSON.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      creatorAddress: {
        type: 'string',
        description: 'Creator/manager address (bb1...)'
      },
      name: {
        type: 'string',
        description: 'Token name'
      },
      symbol: {
        type: 'string',
        description: 'Token symbol'
      },
      description: {
        type: 'string',
        description: 'Token description'
      },
      totalSupply: {
        type: 'string',
        description: 'Total supply (optional, "0" for unlimited)'
      },
      mintPrice: {
        type: 'string',
        description: 'Mint price in base units (e.g., "5000000000" for 5 BADGE)'
      },
      mintPriceDenom: {
        type: 'string',
        description: 'Mint price denomination (e.g., "ubadge")'
      },
      maxPerUser: {
        type: 'string',
        description: 'Maximum tokens per user'
      },
      transferable: {
        type: 'boolean',
        description: 'Whether tokens can be transferred (default true)'
      },
      swappable: {
        type: 'boolean',
        description: 'Enable liquidity pool trading'
      },
      decimals: {
        type: 'string',
        description: 'Token decimals (default "9")'
      }
    },
    required: ['creatorAddress', 'name', 'symbol']
  }
};

function buildMintApproval(
  creatorAddress: string,
  options: {
    mintPrice?: string;
    mintPriceDenom?: string;
    maxPerUser?: string;
    totalSupply?: string;
  }
): Record<string, unknown> {
  const criteria: Record<string, unknown> = {
    overridesFromOutgoingApprovals: true
  };

  // Add mint price
  if (options.mintPrice && options.mintPriceDenom) {
    criteria.coinTransfers = [{
      to: creatorAddress,
      coins: [{ denom: options.mintPriceDenom, amount: options.mintPrice }],
      overrideFromWithApproverAddress: false,
      overrideToWithInitiator: false
    }];
  }

  // Add max per user
  if (options.maxPerUser) {
    criteria.maxNumTransfers = {
      perInitiatedByAddressMaxNumTransfers: '0',
      overallMaxNumTransfers: '0',
      perToAddressMaxNumTransfers: '0',
      perFromAddressMaxNumTransfers: '0',
      amountTrackerId: 'mint-tracker',
      resetTimeIntervals: { startTime: '0', intervalLength: '0' }
    };
    criteria.approvalAmounts = {
      perInitiatedByAddressApprovalAmount: options.maxPerUser,
      overallApprovalAmount: options.totalSupply || '0',
      perToAddressApprovalAmount: '0',
      perFromAddressApprovalAmount: '0',
      amountTrackerId: 'mint-tracker',
      resetTimeIntervals: { startTime: '0', intervalLength: '0' }
    };
  } else if (options.totalSupply && options.totalSupply !== '0') {
    criteria.approvalAmounts = {
      overallApprovalAmount: options.totalSupply,
      perInitiatedByAddressApprovalAmount: '0',
      perToAddressApprovalAmount: '0',
      perFromAddressApprovalAmount: '0',
      amountTrackerId: 'supply-tracker',
      resetTimeIntervals: { startTime: '0', intervalLength: '0' }
    };
  }

  return {
    fromListId: 'Mint',
    toListId: 'All',
    initiatedByListId: 'All',
    transferTimes: FOREVER_TIMES,
    tokenIds: [{ start: '1', end: '1' }],
    ownershipTimes: FOREVER_TIMES,
    uri: '',
    customData: '',
    approvalId: 'public-mint',
    approvalCriteria: criteria,
    version: '0'
  };
}

function buildTransferApproval(): Record<string, unknown> {
  return {
    fromListId: '!Mint',
    toListId: 'All',
    initiatedByListId: 'All',
    transferTimes: FOREVER_TIMES,
    tokenIds: [{ start: '1', end: '1' }],
    ownershipTimes: FOREVER_TIMES,
    uri: '',
    customData: '',
    approvalId: 'free-transfer',
    approvalCriteria: {},
    version: '0'
  };
}

function buildPermissions(): Record<string, unknown> {
  const forbidden = {
    permanentlyPermittedTimes: [],
    permanentlyForbiddenTimes: FOREVER_TIMES
  };

  const allowed = {
    permanentlyPermittedTimes: FOREVER_TIMES,
    permanentlyForbiddenTimes: []
  };

  const forbiddenTokenIds = {
    tokenIds: FOREVER_TIMES,
    permanentlyPermittedTimes: [],
    permanentlyForbiddenTimes: FOREVER_TIMES
  };

  const forbiddenApprovals = {
    fromListId: 'All',
    toListId: 'All',
    initiatedByListId: 'All',
    transferTimes: FOREVER_TIMES,
    tokenIds: FOREVER_TIMES,
    ownershipTimes: FOREVER_TIMES,
    approvalId: 'All',
    permanentlyPermittedTimes: [],
    permanentlyForbiddenTimes: FOREVER_TIMES
  };

  return {
    canDeleteCollection: [forbidden],
    canArchiveCollection: [allowed],
    canUpdateStandards: [forbidden],
    canUpdateCustomData: [allowed],
    canUpdateManager: [forbidden],
    canUpdateCollectionMetadata: [allowed],
    canUpdateValidTokenIds: [forbiddenTokenIds],
    canUpdateTokenMetadata: [{
      tokenIds: FOREVER_TIMES,
      permanentlyPermittedTimes: FOREVER_TIMES,
      permanentlyForbiddenTimes: []
    }],
    canUpdateCollectionApprovals: [forbiddenApprovals],
    canAddMoreAliasPaths: [forbidden],
    canAddMoreCosmosCoinWrapperPaths: [forbidden]
  };
}

function buildAliasPath(symbol: string, decimals: string): Record<string, unknown> {
  const denom = symbol.toLowerCase();
  return {
    denom,
    symbol: denom,
    conversion: {
      sideA: { amount: '1' },
      sideB: [{
        amount: '1',
        tokenIds: [{ start: '1', end: '1' }],
        ownershipTimes: FOREVER_TIMES
      }]
    },
    denomUnits: [{
      decimals,
      symbol,
      isDefaultDisplay: true,
      metadata: { uri: 'ipfs://METADATA_ALIAS_PATH', customData: '' }
    }],
    metadata: { uri: 'ipfs://METADATA_ALIAS_PATH', customData: '' }
  };
}

export function handleBuildFungibleToken(input: BuildFungibleTokenInput): BuildFungibleTokenResult {
  try {
    // Validate creator address
    if (!input.creatorAddress.startsWith('bb1')) {
      return {
        success: false,
        error: 'Creator address must start with "bb1"'
      };
    }

    const decimals = input.decimals || '9';
    const transferable = input.transferable !== false; // Default true

    // Build standards
    const standards = ['Fungible Tokens'];
    if (input.swappable) {
      standards.push('Liquidity Pools');
    }

    // Build features list
    const features: string[] = [];
    if (input.totalSupply && input.totalSupply !== '0') {
      features.push(`Max supply: ${input.totalSupply}`);
    } else {
      features.push('Unlimited supply');
    }
    if (input.mintPrice && input.mintPriceDenom) {
      features.push(`Mint price: ${input.mintPrice} ${input.mintPriceDenom}`);
    } else {
      features.push('Free minting');
    }
    if (input.maxPerUser) {
      features.push(`Max per user: ${input.maxPerUser}`);
    }
    if (transferable) {
      features.push('Transferable');
    } else {
      features.push('Non-transferable (soulbound)');
    }
    if (input.swappable) {
      features.push('Liquidity pools enabled');
    }

    // Build approvals
    const approvals: Record<string, unknown>[] = [
      buildMintApproval(input.creatorAddress, {
        mintPrice: input.mintPrice,
        mintPriceDenom: input.mintPriceDenom,
        maxPerUser: input.maxPerUser,
        totalSupply: input.totalSupply
      })
    ];

    if (transferable) {
      approvals.push(buildTransferApproval());
    }

    // Build the message
    const message = {
      typeUrl: '/tokenization.MsgUniversalUpdateCollection',
      value: {
        creator: input.creatorAddress,
        collectionId: '0',

        updateValidTokenIds: true,
        validTokenIds: [{ start: '1', end: '1' }],

        updateCollectionPermissions: true,
        collectionPermissions: buildPermissions(),

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
        collectionApprovals: approvals,

        updateStandards: true,
        standards,

        updateIsArchived: false,
        isArchived: false,

        mintEscrowCoinsToTransfer: [],

        invariants: {
          noCustomOwnershipTimes: true,
          maxSupplyPerId: input.totalSupply || '0',
          noForcefulPostMintTransfers: true,
          disablePoolCreation: !input.swappable,
          cosmosCoinBackedPath: null
        },

        aliasPathsToAdd: input.swappable ? [buildAliasPath(input.symbol, decimals)] : [],

        cosmosCoinWrapperPathsToAdd: []
      }
    };

    return {
      success: true,
      transaction: {
        messages: [message]
      },
      summary: {
        symbol: input.symbol,
        decimals,
        features
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to build Fungible Token: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
