/**
 * Tool: build_dynamic_store
 * Generate transaction JSON for dynamic store operations:
 * create, update, delete, set_value, batch_set_values
 *
 * Dynamic stores are on-chain boolean address maps. The creator controls
 * who is true/false, and these can be referenced by approval criteria
 * (dynamicStoreChallenges) or used as standalone allowlists/blocklists.
 */

import { z } from 'zod';
import { ensureBb1 } from '../../sdk/addressUtils.js';

export const buildDynamicStoreSchema = z.object({
  action: z.enum(['create', 'update', 'delete', 'set_value', 'batch_set_values'])
    .describe('The operation to perform'),
  creator: z.string().describe('Your address (bb1... or 0x...) — must be the store creator for update/delete/set_value'),
  storeId: z.string().optional().describe('Store ID (required for update, delete, set_value, batch_set_values)'),
  defaultValue: z.boolean().optional().describe('Default value for uninitialized addresses (used in create/update)'),
  globalEnabled: z.boolean().optional().describe('Kill switch — set false to disable the store (used in update)'),
  uri: z.string().optional().describe('Metadata URI for the store (used in create/update)'),
  customData: z.string().optional().describe('Arbitrary custom data JSON (used in create/update)'),
  address: z.string().optional().describe('Target address for set_value'),
  value: z.boolean().optional().describe('Boolean value to set for the address'),
  entries: z.array(z.object({
    address: z.string(),
    value: z.boolean()
  })).optional().describe('Batch entries for batch_set_values')
});

export type BuildDynamicStoreInput = z.infer<typeof buildDynamicStoreSchema>;

export interface BuildDynamicStoreResult {
  success: boolean;
  error?: string;
  transaction?: {
    messages: unknown[];
    memo: string;
    fee: { amount: Array<{ denom: string; amount: string }>; gas: string };
  };
  explanation?: {
    action: string;
    description: string;
    nextSteps: string[];
  };
}

export const buildDynamicStoreTool = {
  name: 'build_dynamic_store',
  description: 'Build transaction JSON for dynamic store operations: create a new boolean address map, update settings, delete, or set values for addresses. Dynamic stores are on-chain allowlists/blocklists usable in approval criteria (dynamicStoreChallenges). Returns ready-to-sign transaction JSON.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      action: {
        type: 'string',
        enum: ['create', 'update', 'delete', 'set_value', 'batch_set_values'],
        description: 'Operation: create, update, delete, set_value, or batch_set_values'
      },
      creator: {
        type: 'string',
        description: 'Your address (bb1... or 0x...) — must be the store creator'
      },
      storeId: {
        type: 'string',
        description: 'Store ID (required for update, delete, set_value, batch_set_values)'
      },
      defaultValue: {
        type: 'boolean',
        description: 'Default value for uninitialized addresses'
      },
      globalEnabled: {
        type: 'boolean',
        description: 'Kill switch — false disables the store'
      },
      uri: {
        type: 'string',
        description: 'Metadata URI'
      },
      customData: {
        type: 'string',
        description: 'Arbitrary custom data JSON'
      },
      address: {
        type: 'string',
        description: 'Target address for set_value'
      },
      value: {
        type: 'boolean',
        description: 'Boolean value to set'
      },
      entries: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            address: { type: 'string' },
            value: { type: 'boolean' }
          },
          required: ['address', 'value']
        },
        description: 'Batch entries for batch_set_values'
      }
    },
    required: ['action', 'creator']
  }
};

function buildCreateMsg(input: BuildDynamicStoreInput): BuildDynamicStoreResult {
  if (input.defaultValue === undefined) {
    return { success: false, error: 'defaultValue is required for create. Set to false for an allowlist (addresses default to not-in-list) or true for a blocklist (addresses default to in-list).' };
  }

  const msg = {
    '@type': '/bitbadges.bitbadgeschain.tokenization.MsgCreateDynamicStore',
    creator: input.creator,
    defaultValue: input.defaultValue,
    ...(input.uri !== undefined && { uri: input.uri }),
    ...(input.customData !== undefined && { customData: input.customData })
  };

  return {
    success: true,
    transaction: {
      messages: [msg],
      memo: '',
      fee: { amount: [{ denom: 'ubadge', amount: '0' }], gas: '300000' }
    },
    explanation: {
      action: 'create',
      description: `Create a new dynamic store with defaultValue=${input.defaultValue}. ${input.defaultValue ? 'All addresses start as TRUE (blocklist pattern — set specific addresses to false).' : 'All addresses start as FALSE (allowlist pattern — set specific addresses to true).'}`,
      nextSteps: [
        'Return transaction for user to review and submit',
        'Note the storeId from the transaction response (check events)',
        'Use set_value or batch_set_values to populate the store',
        'Reference the storeId in approval dynamicStoreChallenges to gate transfers'
      ]
    }
  };
}

function buildUpdateMsg(input: BuildDynamicStoreInput): BuildDynamicStoreResult {
  if (!input.storeId) {
    return { success: false, error: 'storeId is required for update' };
  }

  const msg: Record<string, unknown> = {
    '@type': '/bitbadges.bitbadgeschain.tokenization.MsgUpdateDynamicStore',
    creator: input.creator,
    storeId: input.storeId
  };
  if (input.defaultValue !== undefined) msg.defaultValue = input.defaultValue;
  if (input.globalEnabled !== undefined) msg.globalEnabled = input.globalEnabled;
  if (input.uri !== undefined) msg.uri = input.uri;
  if (input.customData !== undefined) msg.customData = input.customData;

  const changes: string[] = [];
  if (input.defaultValue !== undefined) changes.push(`defaultValue → ${input.defaultValue}`);
  if (input.globalEnabled !== undefined) changes.push(`globalEnabled → ${input.globalEnabled}`);
  if (input.uri !== undefined) changes.push(`uri updated`);
  if (input.customData !== undefined) changes.push(`customData updated`);

  return {
    success: true,
    transaction: {
      messages: [msg],
      memo: '',
      fee: { amount: [{ denom: 'ubadge', amount: '0' }], gas: '200000' }
    },
    explanation: {
      action: 'update',
      description: `Update dynamic store ${input.storeId}: ${changes.join(', ')}`,
      nextSteps: ['Return transaction for user to review and submit']
    }
  };
}

function buildDeleteMsg(input: BuildDynamicStoreInput): BuildDynamicStoreResult {
  if (!input.storeId) {
    return { success: false, error: 'storeId is required for delete' };
  }

  return {
    success: true,
    transaction: {
      messages: [{
        '@type': '/bitbadges.bitbadgeschain.tokenization.MsgDeleteDynamicStore',
        creator: input.creator,
        storeId: input.storeId
      }],
      memo: '',
      fee: { amount: [{ denom: 'ubadge', amount: '0' }], gas: '200000' }
    },
    explanation: {
      action: 'delete',
      description: `Delete dynamic store ${input.storeId}. WARNING: This is irreversible. Any approvals referencing this store will fail.`,
      nextSteps: ['Return transaction for user to review and submit']
    }
  };
}

function buildSetValueMsg(input: BuildDynamicStoreInput): BuildDynamicStoreResult {
  if (!input.storeId) {
    return { success: false, error: 'storeId is required for set_value' };
  }
  if (!input.address) {
    return { success: false, error: 'address is required for set_value' };
  }
  if (input.value === undefined) {
    return { success: false, error: 'value (true/false) is required for set_value' };
  }

  return {
    success: true,
    transaction: {
      messages: [{
        '@type': '/bitbadges.bitbadgeschain.tokenization.MsgSetDynamicStoreValue',
        creator: input.creator,
        storeId: input.storeId,
        address: input.address,
        value: input.value
      }],
      memo: '',
      fee: { amount: [{ denom: 'ubadge', amount: '0' }], gas: '200000' }
    },
    explanation: {
      action: 'set_value',
      description: `Set ${input.address} → ${input.value} in store ${input.storeId}`,
      nextSteps: ['Return transaction for user to review and submit']
    }
  };
}

function buildBatchSetValuesMsg(input: BuildDynamicStoreInput): BuildDynamicStoreResult {
  if (!input.storeId) {
    return { success: false, error: 'storeId is required for batch_set_values' };
  }
  if (!input.entries || input.entries.length === 0) {
    return { success: false, error: 'entries array is required for batch_set_values (each with address + value)' };
  }

  const messages = input.entries.map(entry => ({
    '@type': '/bitbadges.bitbadgeschain.tokenization.MsgSetDynamicStoreValue',
    creator: input.creator,
    storeId: input.storeId,
    address: entry.address,
    value: entry.value
  }));

  return {
    success: true,
    transaction: {
      messages,
      memo: '',
      fee: { amount: [{ denom: 'ubadge', amount: '0' }], gas: String(200000 + (input.entries.length * 50000)) }
    },
    explanation: {
      action: 'batch_set_values',
      description: `Set ${input.entries.length} address values in store ${input.storeId}. ${input.entries.filter(e => e.value).length} set to true, ${input.entries.filter(e => !e.value).length} set to false.`,
      nextSteps: [
        'Return transaction for user to review and submit',
        `Gas estimated for ${input.entries.length} entries — adjust if needed`
      ]
    }
  };
}

export function handleBuildDynamicStore(input: BuildDynamicStoreInput): BuildDynamicStoreResult {
  input.creator = ensureBb1(input.creator);
  if (input.address) input.address = ensureBb1(input.address);
  if (input.entries) input.entries = input.entries.map(e => ({ ...e, address: ensureBb1(e.address) }));
  switch (input.action) {
    case 'create': return buildCreateMsg(input);
    case 'update': return buildUpdateMsg(input);
    case 'delete': return buildDeleteMsg(input);
    case 'set_value': return buildSetValueMsg(input);
    case 'batch_set_values': return buildBatchSetValuesMsg(input);
    default:
      return { success: false, error: `Unknown action: ${input.action}. Use: create, update, delete, set_value, batch_set_values` };
  }
}
