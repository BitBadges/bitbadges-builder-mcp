/**
 * Tool: load_collection
 * Load an existing on-chain collection into the session so agents can use
 * per-field tools (add_approval, set_permissions, etc.) to edit it.
 *
 * All updateX flags start as FALSE. Per-field tools flip them to TRUE when
 * a field is actually modified, so get_transaction only includes changed fields.
 */

import { z } from 'zod';
import { getCollections } from '../../sdk/apiClient.js';
import { ensureBb1 } from '../../sdk/addressUtils.js';
import { resetSession, getOrCreateSession, type SessionTransaction } from '../../session/sessionState.js';

export const loadCollectionSchema = z.object({
  sessionId: z.string().optional().describe('Session ID for per-request isolation.'),
  collectionId: z.string().describe('The on-chain collection ID to load.'),
  creatorAddress: z.string().describe('Creator address (bb1... or 0x...) that will sign the update transaction.')
});

export type LoadCollectionInput = z.infer<typeof loadCollectionSchema>;

export const loadCollectionTool = {
  name: 'load_collection',
  description:
    'Load an existing on-chain collection into the session for editing. ' +
    'After loading, use per-field tools (set_permissions, add_approval, etc.) to modify it. ' +
    'Only fields you actually change will be included in the update transaction (updateX flags). ' +
    'Call get_transaction when done to retrieve the final output.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      sessionId: { type: 'string', description: 'Session ID.' },
      collectionId: { type: 'string', description: 'The on-chain collection ID to load.' },
      creatorAddress: { type: 'string', description: 'Creator address (bb1... or 0x...).' }
    },
    required: ['collectionId', 'creatorAddress']
  }
};

export async function handleLoadCollection(input: LoadCollectionInput): Promise<{
  success: boolean;
  collectionId?: string;
  summary?: {
    standards: string[];
    approvalCount: number;
    manager: string;
    validTokenIds: number;
  };
  error?: string;
}> {
  try {
    const { collectionId, sessionId } = input;
    const creatorAddress = ensureBb1(input.creatorAddress);

    // 1. Fetch the collection from the API
    const response = await getCollections({
      collectionsToFetch: [{
        collectionId,
        metadataToFetch: { uris: [] },
        fetchTotalAndMintBalances: true
      }]
    });

    if (!response.success || !response.data?.collections?.length) {
      return {
        success: false,
        error: response.error || `Collection ${collectionId} not found`
      };
    }

    const collection = response.data.collections[0] as Record<string, any>;

    // 2. Reset any existing session state, then initialize fresh
    resetSession(sessionId);
    const session = getOrCreateSession(sessionId, creatorAddress);
    const value = session.messages[0].value;

    // 3. Set the real collectionId (not "0")
    value.collectionId = collectionId;
    value.creator = creatorAddress;

    // 4. Populate session with existing collection data
    //    Map from API response format to message format

    // Standards
    value.standards = collection.standards || [];

    // Valid token IDs (API uses validBadgeIds)
    value.validTokenIds = collection.validBadgeIds || [];

    // Manager
    value.manager = collection.manager || '';

    // Collection metadata — use the URI from the timeline if available
    if (collection.collectionMetadataTimeline?.length) {
      const metaEntry = collection.collectionMetadataTimeline[0];
      value.collectionMetadata = {
        uri: metaEntry.collectionMetadata?.uri || '',
        customData: metaEntry.collectionMetadata?.customData || ''
      };
    }

    // Token metadata — from badgeMetadataTimeline
    if (collection.badgeMetadataTimeline?.length) {
      const tokenMetaEntries = collection.badgeMetadataTimeline[0]?.badgeMetadata || [];
      value.tokenMetadata = tokenMetaEntries.map((entry: any) => ({
        uri: entry.uri || '',
        customData: entry.customData || '',
        tokenIds: entry.badgeIds || entry.tokenIds || []
      }));
    } else {
      value.tokenMetadata = [];
    }

    // Collection permissions
    value.collectionPermissions = collection.collectionPermissions || {};

    // Collection approvals (API uses collectionApprovals)
    const approvals = collection.collectionApprovals || [];
    value.collectionApprovals = approvals;

    // Track original approval IDs so we can detect additions/removals
    session.originalApprovalIds = new Set(
      approvals.map((a: any) => a.approvalId).filter(Boolean)
    );

    // Default balances
    value.defaultBalances = collection.defaultBalances || {
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
    };

    // Invariants
    value.invariants = collection.invariants || null;

    // Custom data
    value.customData = collection.customData || '';

    // Is archived
    if (collection.isArchivedTimeline?.length) {
      value.isArchived = collection.isArchivedTimeline[0]?.isArchived || false;
    }

    // 5. Set ALL updateX flags to FALSE — only modified fields get flipped
    value.updateCollectionApprovals = false;
    value.updateStandards = false;
    value.updateValidTokenIds = false;
    value.updateCollectionMetadata = false;
    value.updateTokenMetadata = false;
    value.updateCollectionPermissions = false;
    value.updateInvariants = false;
    value.updateDefaultBalances = false;
    value.updateManager = false;
    value.updateCustomData = false;
    value.updateIsArchived = false;

    // Clear transfer-related fields (these are additive, not update-based)
    value.mintEscrowCoinsToTransfer = [];
    value.aliasPathsToAdd = [];
    value.cosmosCoinWrapperPathsToAdd = [];

    return {
      success: true,
      collectionId,
      summary: {
        standards: value.standards,
        approvalCount: approvals.length,
        manager: value.manager,
        validTokenIds: (value.validTokenIds || []).length
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to load collection: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
