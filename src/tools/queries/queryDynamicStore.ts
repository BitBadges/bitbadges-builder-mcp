/**
 * Tool: query_dynamic_store
 * Query on-chain dynamic store data: store info, single value, all values, or list by creator.
 */

import { z } from 'zod';
import { apiRequest } from '../../sdk/apiClient.js';

export const queryDynamicStoreSchema = z.object({
  action: z.enum(['get_store', 'get_value', 'list_values', 'list_by_creator'])
    .describe('Query type'),
  storeId: z.string().optional().describe('Store ID (required for get_store, get_value, list_values)'),
  address: z.string().optional().describe('Address to check (required for get_value, list_by_creator)'),
  bookmark: z.string().optional().describe('Pagination bookmark for list_values')
});

export type QueryDynamicStoreInput = z.infer<typeof queryDynamicStoreSchema>;

export interface DynamicStoreInfo {
  storeId: string;
  createdBy: string;
  defaultValue: boolean;
  globalEnabled: boolean;
  uri?: string;
  customData?: string;
  metadata?: Record<string, unknown>;
}

export interface DynamicStoreValue {
  storeId: string;
  address: string;
  value: boolean;
}

export interface QueryDynamicStoreResult {
  success: boolean;
  error?: string;
  store?: DynamicStoreInfo;
  stores?: DynamicStoreInfo[];
  value?: DynamicStoreValue;
  values?: DynamicStoreValue[];
  pagination?: { bookmark?: string; hasMore?: boolean };
}

export const queryDynamicStoreTool = {
  name: 'query_dynamic_store',
  description: 'Query on-chain dynamic store data. Actions: get_store (store details), get_value (check if an address is true/false), list_values (paginated list of all set values), list_by_creator (all stores created by an address). Requires BITBADGES_API_KEY.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      action: {
        type: 'string',
        enum: ['get_store', 'get_value', 'list_values', 'list_by_creator'],
        description: 'Query type'
      },
      storeId: {
        type: 'string',
        description: 'Store ID (required for get_store, get_value, list_values)'
      },
      address: {
        type: 'string',
        description: 'Address (required for get_value, list_by_creator)'
      },
      bookmark: {
        type: 'string',
        description: 'Pagination bookmark for list_values'
      }
    },
    required: ['action']
  }
};

export async function handleQueryDynamicStore(input: QueryDynamicStoreInput): Promise<QueryDynamicStoreResult> {
  switch (input.action) {
    case 'get_store': {
      if (!input.storeId) return { success: false, error: 'storeId is required for get_store' };
      const res = await apiRequest<{ store: DynamicStoreInfo }>(
        `/api/v0/onChainDynamicStore/${input.storeId}`,
        'GET'
      );
      if (!res.success || !res.data) return { success: false, error: res.error || 'Store not found' };
      return { success: true, store: res.data.store };
    }

    case 'get_value': {
      if (!input.storeId) return { success: false, error: 'storeId is required for get_value' };
      if (!input.address) return { success: false, error: 'address is required for get_value' };
      const res = await apiRequest<DynamicStoreValue>(
        `/api/v0/onChainDynamicStore/${input.storeId}/value/${input.address}`,
        'GET'
      );
      if (!res.success || !res.data) {
        // If 404, the address hasn't been explicitly set — return the default
        return { success: false, error: res.error || 'Value not found. The address may not be explicitly set — it uses the store defaultValue.' };
      }
      return { success: true, value: res.data };
    }

    case 'list_values': {
      if (!input.storeId) return { success: false, error: 'storeId is required for list_values' };
      const url = input.bookmark
        ? `/api/v0/onChainDynamicStore/${input.storeId}/values?bookmark=${encodeURIComponent(input.bookmark)}`
        : `/api/v0/onChainDynamicStore/${input.storeId}/values`;
      const res = await apiRequest<{ values: DynamicStoreValue[]; pagination: { bookmark?: string; hasMore?: boolean } }>(
        url,
        'GET'
      );
      if (!res.success || !res.data) return { success: false, error: res.error || 'Failed to list values' };
      return {
        success: true,
        values: res.data.values,
        pagination: res.data.pagination
      };
    }

    case 'list_by_creator': {
      if (!input.address) return { success: false, error: 'address is required for list_by_creator' };
      const res = await apiRequest<{ stores: DynamicStoreInfo[] }>(
        `/api/v0/onChainDynamicStores/by-creator/${input.address}`,
        'GET'
      );
      if (!res.success || !res.data) return { success: false, error: res.error || 'Failed to list stores' };
      return { success: true, stores: res.data.stores };
    }

    default:
      return { success: false, error: `Unknown action: ${input.action}` };
  }
}
