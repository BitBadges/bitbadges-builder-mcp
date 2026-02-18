/**
 * Tool: build_nft_collection
 * Build NFT collection with minting config
 */

import { z } from 'zod';

const MAX_UINT64 = '18446744073709551615';
const FOREVER_TIMES = [{ start: '1', end: MAX_UINT64 }];

export const buildNFTCollectionSchema = z.object({
  creatorAddress: z.string().describe('Creator/manager address (bb1...)'),
  name: z.string().describe('Collection name'),
  description: z.string().optional().describe('Collection description'),
  totalSupply: z.string().describe('Total number of NFTs in collection'),
  mintPrice: z.string().optional().describe('Mint price in base units'),
  mintPriceDenom: z.string().optional().describe('Mint price denomination'),
  maxPerUser: z.string().optional().describe('Maximum NFTs per user'),
  tradable: z.boolean().optional().describe('Enable marketplace trading'),
  tradingCurrency: z.string().optional().describe('Trading currency denom (default ubadge)')
});

export type BuildNFTCollectionInput = z.infer<typeof buildNFTCollectionSchema>;

export interface BuildNFTCollectionResult {
  success: boolean;
  transaction?: {
    messages: unknown[];
  };
  summary?: {
    totalSupply: string;
    features: string[];
  };
  error?: string;
}

export const buildNFTCollectionTool = {
  name: 'build_nft_collection',
  description: 'Build NFT collection with minting config. Returns complete MsgUniversalUpdateCollection JSON.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      creatorAddress: {
        type: 'string',
        description: 'Creator/manager address (bb1...)'
      },
      name: {
        type: 'string',
        description: 'Collection name'
      },
      description: {
        type: 'string',
        description: 'Collection description'
      },
      totalSupply: {
        type: 'string',
        description: 'Total number of NFTs in collection'
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
        description: 'Maximum NFTs per user'
      },
      tradable: {
        type: 'boolean',
        description: 'Enable marketplace trading'
      },
      tradingCurrency: {
        type: 'string',
        description: 'Trading currency denom (default "ubadge")'
      }
    },
    required: ['creatorAddress', 'name', 'totalSupply']
  }
};

function buildMintApproval(
  creatorAddress: string,
  totalSupply: string,
  options: {
    mintPrice?: string;
    mintPriceDenom?: string;
    maxPerUser?: string;
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

  // Use predeterminedBalances to allocate sequential NFTs
  criteria.predeterminedBalances = {
    manualBalances: [],
    incrementedBalances: {
      startBalances: [{
        amount: '1',
        tokenIds: [{ start: '1', end: '1' }],
        ownershipTimes: FOREVER_TIMES
      }],
      incrementTokenIdsBy: '1',
      incrementOwnershipTimesBy: '0',
      durationFromTimestamp: '0',
      allowOverrideTimestamp: false,
      recurringOwnershipTimes: {
        startTime: '0',
        intervalLength: '0',
        chargePeriodLength: '0'
      },
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

  // Add max limits
  const maxTransfers: Record<string, unknown> = {
    overallMaxNumTransfers: totalSupply,
    perToAddressMaxNumTransfers: '0',
    perFromAddressMaxNumTransfers: '0',
    perInitiatedByAddressMaxNumTransfers: options.maxPerUser || '0',
    amountTrackerId: 'nft-mint-tracker',
    resetTimeIntervals: { startTime: '0', intervalLength: '0' }
  };

  criteria.maxNumTransfers = maxTransfers;

  return {
    fromListId: 'Mint',
    toListId: 'All',
    initiatedByListId: 'All',
    transferTimes: FOREVER_TIMES,
    tokenIds: [{ start: '1', end: totalSupply }],
    ownershipTimes: FOREVER_TIMES,
    uri: '',
    customData: '',
    approvalId: 'public-mint',
    approvalCriteria: criteria,
    version: '0'
  };
}

function buildTransferApproval(totalSupply: string): Record<string, unknown> {
  return {
    fromListId: '!Mint',
    toListId: 'All',
    initiatedByListId: 'All',
    transferTimes: FOREVER_TIMES,
    tokenIds: [{ start: '1', end: totalSupply }],
    ownershipTimes: FOREVER_TIMES,
    uri: '',
    customData: '',
    approvalId: 'free-transfer',
    approvalCriteria: {},
    version: '0'
  };
}

function buildPermissions(totalSupply: string): Record<string, unknown> {
  const forbidden = {
    permanentlyPermittedTimes: [],
    permanentlyForbiddenTimes: FOREVER_TIMES
  };

  const allowed = {
    permanentlyPermittedTimes: FOREVER_TIMES,
    permanentlyForbiddenTimes: []
  };

  const tokenIdRange = [{ start: '1', end: totalSupply }];

  const forbiddenTokenIds = {
    tokenIds: tokenIdRange,
    permanentlyPermittedTimes: [],
    permanentlyForbiddenTimes: FOREVER_TIMES
  };

  const forbiddenApprovals = {
    fromListId: 'All',
    toListId: 'All',
    initiatedByListId: 'All',
    transferTimes: FOREVER_TIMES,
    tokenIds: tokenIdRange,
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
      tokenIds: tokenIdRange,
      permanentlyPermittedTimes: FOREVER_TIMES,
      permanentlyForbiddenTimes: []
    }],
    canUpdateCollectionApprovals: [forbiddenApprovals],
    canAddMoreAliasPaths: [forbidden],
    canAddMoreCosmosCoinWrapperPaths: [forbidden]
  };
}

export function handleBuildNFTCollection(input: BuildNFTCollectionInput): BuildNFTCollectionResult {
  try {
    // Validate creator address
    if (!input.creatorAddress.startsWith('bb1')) {
      return {
        success: false,
        error: 'Creator address must start with "bb1"'
      };
    }

    // Validate total supply
    const supply = parseInt(input.totalSupply, 10);
    if (isNaN(supply) || supply <= 0) {
      return {
        success: false,
        error: 'Total supply must be a positive number'
      };
    }

    // Build standards
    const standards: string[] = ['NFTs'];
    if (input.tradable) {
      standards.push('Tradable');
      standards.push(`DefaultDisplayCurrency:${input.tradingCurrency || 'ubadge'}`);
    }

    // Build features list
    const features: string[] = [`Total supply: ${input.totalSupply} NFTs`];
    if (input.mintPrice && input.mintPriceDenom) {
      features.push(`Mint price: ${input.mintPrice} ${input.mintPriceDenom}`);
    } else {
      features.push('Free minting');
    }
    if (input.maxPerUser) {
      features.push(`Max per user: ${input.maxPerUser}`);
    }
    features.push('Transferable');
    if (input.tradable) {
      features.push(`Marketplace trading (${input.tradingCurrency || 'ubadge'})`);
    }

    // Build the message
    const message = {
      typeUrl: '/tokenization.MsgUniversalUpdateCollection',
      value: {
        creator: input.creatorAddress,
        collectionId: '0',

        updateValidTokenIds: true,
        validTokenIds: [{ start: '1', end: input.totalSupply }],

        updateCollectionPermissions: true,
        collectionPermissions: buildPermissions(input.totalSupply),

        updateManager: true,
        manager: input.creatorAddress,

        updateCollectionMetadata: true,
        collectionMetadata: {
          uri: 'ipfs://METADATA_COLLECTION',
          customData: ''
        },

        updateTokenMetadata: true,
        tokenMetadata: [{
          uri: 'ipfs://METADATA_TOKEN_{id}', // Use {id} placeholder for unique metadata
          customData: '',
          tokenIds: [{ start: '1', end: input.totalSupply }]
        }],

        updateCustomData: true,
        customData: '',

        updateCollectionApprovals: true,
        collectionApprovals: [
          buildMintApproval(input.creatorAddress, input.totalSupply, {
            mintPrice: input.mintPrice,
            mintPriceDenom: input.mintPriceDenom,
            maxPerUser: input.maxPerUser
          }),
          buildTransferApproval(input.totalSupply)
        ],

        updateStandards: true,
        standards,

        updateIsArchived: false,
        isArchived: false,

        mintEscrowCoinsToTransfer: [],

        invariants: {
          noCustomOwnershipTimes: true,
          maxSupplyPerId: '1', // Each NFT has supply of 1
          noForcefulPostMintTransfers: true,
          disablePoolCreation: true, // NFTs don't need liquidity pools
          cosmosCoinBackedPath: null
        },

        aliasPathsToAdd: [],

        cosmosCoinWrapperPathsToAdd: []
      }
    };

    return {
      success: true,
      transaction: {
        messages: [message]
      },
      summary: {
        totalSupply: input.totalSupply,
        features
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to build NFT Collection: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
