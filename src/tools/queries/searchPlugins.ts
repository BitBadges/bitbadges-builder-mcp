/**
 * Tool: search_plugins
 * Search for off-chain claim plugins by name, get specific plugins by ID, or list a creator's public plugins
 */

import { z } from 'zod';
import { searchPlugins, type SearchPluginsResponse } from '../../sdk/apiClient.js';
import { ensureBb1 } from '../../sdk/addressUtils.js';

export const searchPluginsSchema = z.object({
  searchValue: z.string().optional().describe('Search query to find plugins by name or description'),
  pluginIds: z.array(z.string()).optional().describe('Specific plugin IDs to fetch directly'),
  creatorAddress: z.string().optional().describe('Creator address to list their public plugins. Returns only reviewCompleted plugins by this creator. Does not require session auth.'),
  bookmark: z.string().optional().describe('Pagination bookmark from previous search')
});

export type SearchPluginsInput = z.infer<typeof searchPluginsSchema>;

export interface SearchPluginsResult {
  success: boolean;
  results?: SearchPluginsResponse;
  error?: string;
}

export const searchPluginsTool = {
  name: 'search_plugins',
  description: 'Search for off-chain claim plugins or fetch specific plugins by ID. Can also list public plugins by a specific creator address. Plugins are flat configs (no versioning) — returns plugin metadata, params schema, and configuration. Any plugin is fetchable by ID without auth. Use this to find custom plugins to integrate into claims.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      searchValue: {
        type: 'string',
        description: 'Search query to find plugins by name or description'
      },
      pluginIds: {
        type: 'array',
        items: { type: 'string' },
        description: 'Specific plugin IDs to fetch directly'
      },
      creatorAddress: {
        type: 'string',
        description: 'Creator address to list their public plugins. Returns only reviewed/published plugins by this creator.'
      },
      bookmark: {
        type: 'string',
        description: 'Pagination bookmark from previous search'
      }
    }
  }
};

export async function handleSearchPlugins(input: SearchPluginsInput): Promise<SearchPluginsResult> {
  try {
    if (!input.searchValue && (!input.pluginIds || input.pluginIds.length === 0) && !input.creatorAddress) {
      return {
        success: false,
        error: 'At least one of searchValue, pluginIds, or creatorAddress must be provided'
      };
    }

    const response = await searchPlugins({
      searchValue: input.searchValue,
      pluginIds: input.pluginIds,
      creatorAddress: input.creatorAddress ? ensureBb1(input.creatorAddress) : input.creatorAddress,
      bookmark: input.bookmark
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
      error: 'Failed to search plugins: ' + (error instanceof Error ? error.message : String(error))
    };
  }
}
