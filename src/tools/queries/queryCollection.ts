/**
 * Tool: query_collection
 * Fetch collection details from BitBadges API
 */

import { z } from 'zod';
import { getCollections, type CollectionResponse } from '../../sdk/apiClient.js';

export const queryCollectionSchema = z.object({
  collectionId: z.string().describe('The collection ID to fetch'),
  includeMetadata: z.boolean().optional().default(true).describe('Whether to include metadata (default: true)')
});

export type QueryCollectionInput = z.infer<typeof queryCollectionSchema>;

export interface QueryCollectionResult {
  success: boolean;
  collection?: CollectionResponse['collections'][0];
  error?: string;
}

export const queryCollectionTool = {
  name: 'query_collection',
  description: 'Fetch collection details from BitBadges API. Requires BITBADGES_API_KEY environment variable.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      collectionId: {
        type: 'string',
        description: 'The collection ID to fetch'
      },
      includeMetadata: {
        type: 'boolean',
        description: 'Whether to include metadata (default: true)'
      }
    },
    required: ['collectionId']
  }
};

export async function handleQueryCollection(input: QueryCollectionInput): Promise<QueryCollectionResult> {
  try {
    const { collectionId, includeMetadata = true } = input;

    const response = await getCollections({
      collectionsToFetch: [{
        collectionId,
        metadataToFetch: includeMetadata ? { uris: [] } : undefined,
        fetchTotalAndMintBalances: true
      }]
    });

    if (!response.success) {
      return {
        success: false,
        error: response.error
      };
    }

    if (!response.data?.collections || response.data.collections.length === 0) {
      return {
        success: false,
        error: `Collection ${collectionId} not found`
      };
    }

    return {
      success: true,
      collection: response.data.collections[0]
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to query collection: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
