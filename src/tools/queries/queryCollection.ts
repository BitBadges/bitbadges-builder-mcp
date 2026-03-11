/**
 * Tool: query_collection
 * Fetch collection details from BitBadges API
 */

import { z } from 'zod';
import { getCollections, type CollectionResponse } from '../../sdk/apiClient.js';

export const queryCollectionSchema = z.object({
  collectionId: z.string().describe('The collection ID to fetch'),
  includeMetadata: z.boolean().optional().default(true).describe('Whether to include metadata (default: true)'),
  fields: z.array(z.string()).optional().describe('Optional list of top-level fields to return (e.g. ["collectionApprovals", "collectionPermissions"]). If omitted, returns the full collection.')
});

export type QueryCollectionInput = z.infer<typeof queryCollectionSchema>;

export interface QueryCollectionResult {
  success: boolean;
  collection?: CollectionResponse['collections'][0];
  error?: string;
}

export const queryCollectionTool = {
  name: 'query_collection',
  description: 'Fetch collection details from BitBadges API. Requires BITBADGES_API_KEY environment variable. Use the "fields" parameter to return only specific top-level fields and reduce response size.',
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
      },
      fields: {
        type: 'array',
        items: { type: 'string' },
        description: 'Optional list of top-level fields to return (e.g. ["collectionApprovals", "collectionPermissions"]). If omitted, returns the full collection.'
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

    let collection = response.data.collections[0];

    // Filter to requested fields if specified
    if (input.fields && input.fields.length > 0) {
      const filtered: Record<string, any> = {};
      for (const field of input.fields) {
        if (field in (collection as any)) {
          filtered[field] = (collection as any)[field];
        }
      }
      // Always include collectionId for context
      filtered.collectionId = (collection as any).collectionId;
      collection = filtered as any;
    }

    return {
      success: true,
      collection
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to query collection: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
