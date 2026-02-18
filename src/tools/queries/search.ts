/**
 * Tool: search
 * Search collections, accounts, and tokens
 */

import { z } from 'zod';
import { search, type SearchResponse } from '../../sdk/apiClient.js';

export const searchSchema = z.object({
  query: z.string().describe('The search query')
});

export type SearchInput = z.infer<typeof searchSchema>;

export interface SearchResult {
  success: boolean;
  results?: SearchResponse;
  error?: string;
}

export const searchTool = {
  name: 'search',
  description: 'Search collections, accounts, and tokens. Requires BITBADGES_API_KEY environment variable.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      query: {
        type: 'string',
        description: 'The search query'
      }
    },
    required: ['query']
  }
};

export async function handleSearch(input: SearchInput): Promise<SearchResult> {
  try {
    const { query } = input;

    if (!query || query.trim() === '') {
      return {
        success: false,
        error: 'Search query cannot be empty'
      };
    }

    const response = await search({
      searchValue: query
    });

    if (!response.success) {
      return {
        success: false,
        error: response.error
      };
    }

    return {
      success: true,
      results: response.data
    };
  } catch (error) {
    return {
      success: false,
      error: 'Failed to search: ' + (error instanceof Error ? error.message : String(error))
    };
  }
}
