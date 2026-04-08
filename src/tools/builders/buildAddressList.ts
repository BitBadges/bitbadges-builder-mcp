/**
 * Tool: build_address_list
 * Builds a complete Address List collection using token ownership as the membership primitive.
 * Returns MsgUniversalUpdateCollection JSON with both manager-add and manager-remove approvals.
 */

import { z } from 'zod';
import { ensureBb1, isAddressAlias } from '../../sdk/addressUtils.js';

export const buildAddressListSchema = z.object({
  creatorAddress: z.string().describe('Creator/manager address (bb1..., 0x..., or alias: MintEscrow, CosmosWrapper/N, IBCBacking)'),
  name: z.string().describe('Collection name (e.g., "VIP Members List")'),
  description: z.string().optional().describe('Collection description (1-2 sentences)'),
  imageUrl: z.string().optional().describe('Image URL for collection and token metadata (IPFS or HTTP)'),
  immutable: z.boolean().optional().describe('Lock standards, validTokenIds, and deletion permissions (default true)')
});

export type BuildAddressListInput = z.infer<typeof buildAddressListSchema>;

export interface BuildAddressListResult {
  success: boolean;
  transaction?: {
    messages: unknown[];
    metadataPlaceholders?: Record<string, { name: string; description: string; image: string }>;
  };
  designSummary?: {
    standard: string;
    features: string[];
  };
  nextSteps?: string;
  error?: string;
}

const MAX_UINT64 = '18446744073709551615';
const BURN_ADDRESS = 'bb1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqs7gvmv';

export const buildAddressListTool = {
  name: 'build_address_list',
  description:
    'Build an on-chain address list collection. List membership = owning x1 of token ID 1. Manager can add (mint) and remove (burn) addresses. No peer-to-peer transfers. Returns complete MsgUniversalUpdateCollection JSON.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      creatorAddress: { type: 'string', description: 'Creator/manager address (bb1...)' },
      name: { type: 'string', description: 'Collection name (e.g., "VIP Members List")' },
      description: { type: 'string', description: 'Collection description (1-2 sentences)' },
      imageUrl: { type: 'string', description: 'Image URL for collection and token metadata (IPFS or HTTP)' },
      immutable: { type: 'boolean', description: 'Lock standards, validTokenIds, and deletion (default true)' }
    },
    required: ['creatorAddress', 'name']
  }
};

export function handleBuildAddressList(input: BuildAddressListInput): BuildAddressListResult {
  const { name, description, imageUrl, immutable } = input;
  const creatorAddress = ensureBb1(input.creatorAddress);

  if (!creatorAddress || (!creatorAddress.startsWith('bb1') && !isAddressAlias(creatorAddress))) {
    return { success: false, error: 'creatorAddress must be a valid bb1..., 0x..., or alias (MintEscrow, CosmosWrapper/N, IBCBacking)' };
  }

  if (!name) {
    return { success: false, error: 'name is required' };
  }

  const lockImmutable = immutable !== false; // default true

  const collectionDescription = description || `On-chain managed address list: ${name}. Membership is determined by token ownership.`;
  const image = imageUrl || '';

  // Forbidden permission helper
  const forbidden = [{ permanentlyPermittedTimes: [], permanentlyForbiddenTimes: [{ start: '1', end: MAX_UINT64 }] }];

  const msg = {
    typeUrl: '/tokenization.MsgUniversalUpdateCollection',
    value: {
      creator: creatorAddress,
      collectionId: '0',

      updateStandards: true,
      standards: ['Address List'],

      updateValidTokenIds: true,
      validTokenIds: [{ start: '1', end: '1' }],

      updateManager: true,
      manager: creatorAddress,

      updateCollectionMetadata: true,
      collectionMetadata: { uri: 'ipfs://METADATA_COLLECTION', customData: '' },

      updateTokenMetadata: true,
      tokenMetadata: [{ uri: 'ipfs://METADATA_TOKEN', customData: '', tokenIds: [{ start: '1', end: '1' }] }],

      updateCustomData: true,
      customData: '',

      defaultBalances: {
        balances: [],
        autoApproveAllIncomingTransfers: true,
        autoApproveSelfInitiatedOutgoingTransfers: true,
        autoApproveSelfInitiatedIncomingTransfers: true,
        outgoingApprovals: [],
        incomingApprovals: [],
        userPermissions: {
          canUpdateOutgoingApprovals: [],
          canUpdateIncomingApprovals: [],
          canUpdateAutoApproveSelfInitiatedOutgoingTransfers: [],
          canUpdateAutoApproveSelfInitiatedIncomingTransfers: [],
          canUpdateAutoApproveAllIncomingTransfers: []
        }
      },

      updateCollectionApprovals: true,
      collectionApprovals: [
        {
          fromListId: 'Mint',
          toListId: 'All',
          initiatedByListId: creatorAddress,
          approvalId: 'manager-add',
          tokenIds: [{ start: '1', end: '1' }],
          transferTimes: [{ start: '1', end: MAX_UINT64 }],
          ownershipTimes: [{ start: '1', end: MAX_UINT64 }],
          uri: 'ipfs://METADATA_APPROVAL_manager-add',
          customData: '',
          approvalCriteria: { overridesFromOutgoingApprovals: true },
          version: '0'
        },
        {
          fromListId: 'All',
          toListId: BURN_ADDRESS,
          initiatedByListId: creatorAddress,
          approvalId: 'manager-remove',
          tokenIds: [{ start: '1', end: '1' }],
          transferTimes: [{ start: '1', end: MAX_UINT64 }],
          ownershipTimes: [{ start: '1', end: MAX_UINT64 }],
          uri: 'ipfs://METADATA_APPROVAL_manager-remove',
          customData: '',
          approvalCriteria: { overridesFromOutgoingApprovals: true },
          version: '0'
        }
      ],

      updateCollectionPermissions: true,
      collectionPermissions: {
        canDeleteCollection: lockImmutable ? forbidden : [],
        canArchiveCollection: [],
        canUpdateStandards: lockImmutable ? forbidden : [],
        canUpdateCustomData: [],
        canUpdateManager: [],
        canUpdateCollectionMetadata: [],
        canUpdateValidTokenIds: lockImmutable
          ? [{ tokenIds: [{ start: '1', end: '1' }], permanentlyPermittedTimes: [], permanentlyForbiddenTimes: [{ start: '1', end: MAX_UINT64 }] }]
          : [],
        canUpdateTokenMetadata: [],
        canUpdateCollectionApprovals: [],
        canAddMoreAliasPaths: [],
        canAddMoreCosmosCoinWrapperPaths: []
      },

      updateIsArchived: false,
      isArchived: false,
      mintEscrowCoinsToTransfer: [],
      invariants: {
        noCustomOwnershipTimes: true,
        maxSupplyPerId: '0',
        noForcefulPostMintTransfers: true,
        disablePoolCreation: true,
        cosmosCoinBackedPath: null
      },
      aliasPathsToAdd: [],
      cosmosCoinWrapperPathsToAdd: []
    }
  };

  const metadataPlaceholders: Record<string, { name: string; description: string; image: string }> = {
    'ipfs://METADATA_COLLECTION': {
      name,
      description: collectionDescription,
      image
    },
    'ipfs://METADATA_TOKEN': {
      name,
      description: `Membership token for ${name}. Owning this token means you are on the list.`,
      image
    },
    'ipfs://METADATA_APPROVAL_manager-add': {
      name: 'Add to List',
      description: `Allows the manager to add addresses to ${name} by minting membership tokens.`,
      image: ''
    },
    'ipfs://METADATA_APPROVAL_manager-remove': {
      name: 'Remove from List',
      description: `Allows the manager to remove addresses from ${name} by burning membership tokens.`,
      image: ''
    }
  };

  return {
    success: true,
    transaction: {
      messages: [msg],
      metadataPlaceholders
    },
    designSummary: {
      standard: 'Address List',
      features: [
        'On-chain managed address list',
        'Manager-controlled add/remove',
        'No peer-to-peer transfers',
        'Single token ID (1), amount 1 per member',
        ...(lockImmutable ? ['Immutable standards and token IDs'] : [])
      ]
    },
    nextSteps:
      'Run audit_collection to verify the structure, then validate_transaction to check for errors. The collection will be created with collectionId=0 (auto-assigned on-chain). After publishing, use MsgTransferTokens with the manager-add approval to add addresses, and manager-remove to remove them.'
  };
}
