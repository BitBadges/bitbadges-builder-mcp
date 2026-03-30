import { z } from 'zod';
import { setPermissions as setPermissionsInSession, getOrCreateSession } from '../../session/sessionState.js';

const MAX_UINT64 = '18446744073709551615';
const FOREVER_TIMES = [{ start: '1', end: MAX_UINT64 }];

const FORBIDDEN_ACTION = [{ permanentlyPermittedTimes: [], permanentlyForbiddenTimes: FOREVER_TIMES }];
const NEUTRAL_ACTION: any[] = []; // Neutral — manager can update now, can lock later
const FORBIDDEN_TOKEN_IDS = [{ tokenIds: FOREVER_TIMES, permanentlyPermittedTimes: [], permanentlyForbiddenTimes: FOREVER_TIMES }];
const NEUTRAL_TOKEN_IDS: any[] = []; // Neutral — manager can update now, can lock later
const FORBIDDEN_APPROVALS = [{ fromListId: 'All', toListId: 'All', initiatedByListId: 'All', transferTimes: FOREVER_TIMES, tokenIds: FOREVER_TIMES, ownershipTimes: FOREVER_TIMES, approvalId: 'All', permanentlyPermittedTimes: [], permanentlyForbiddenTimes: FOREVER_TIMES }];
const NEUTRAL_APPROVALS: any[] = []; // Neutral — manager can update now, can lock later

const PRESETS: Record<string, Record<string, any>> = {
  'fully-immutable': {
    canDeleteCollection: FORBIDDEN_ACTION,
    canArchiveCollection: FORBIDDEN_ACTION,
    canUpdateStandards: FORBIDDEN_ACTION,
    canUpdateCustomData: FORBIDDEN_ACTION,
    canUpdateManager: FORBIDDEN_ACTION,
    canUpdateCollectionMetadata: FORBIDDEN_ACTION,
    canUpdateValidTokenIds: FORBIDDEN_TOKEN_IDS,
    canUpdateTokenMetadata: FORBIDDEN_TOKEN_IDS,
    canUpdateCollectionApprovals: FORBIDDEN_APPROVALS,
    canAddMoreAliasPaths: FORBIDDEN_ACTION,
    canAddMoreCosmosCoinWrapperPaths: FORBIDDEN_ACTION
  },
  'manager-controlled': {
    canDeleteCollection: FORBIDDEN_ACTION,
    canArchiveCollection: NEUTRAL_ACTION,
    canUpdateStandards: NEUTRAL_ACTION,
    canUpdateCustomData: NEUTRAL_ACTION,
    canUpdateManager: NEUTRAL_ACTION,
    canUpdateCollectionMetadata: NEUTRAL_ACTION,
    canUpdateValidTokenIds: NEUTRAL_TOKEN_IDS,
    canUpdateTokenMetadata: NEUTRAL_TOKEN_IDS,
    canUpdateCollectionApprovals: NEUTRAL_APPROVALS,
    canAddMoreAliasPaths: NEUTRAL_ACTION,
    canAddMoreCosmosCoinWrapperPaths: NEUTRAL_ACTION
  },
  'locked-approvals': {
    canDeleteCollection: FORBIDDEN_ACTION,
    canArchiveCollection: NEUTRAL_ACTION,
    canUpdateStandards: FORBIDDEN_ACTION,
    canUpdateCustomData: NEUTRAL_ACTION,
    canUpdateManager: FORBIDDEN_ACTION,
    canUpdateCollectionMetadata: NEUTRAL_ACTION,
    canUpdateValidTokenIds: FORBIDDEN_TOKEN_IDS,
    canUpdateTokenMetadata: NEUTRAL_TOKEN_IDS,
    canUpdateCollectionApprovals: FORBIDDEN_APPROVALS,
    canAddMoreAliasPaths: FORBIDDEN_ACTION,
    canAddMoreCosmosCoinWrapperPaths: FORBIDDEN_ACTION
  }
};

export const setPermissionsSchema = z.object({
  sessionId: z.string().optional().describe("Session ID for per-request isolation."),
  creatorAddress: z.string().optional(),
  preset: z.enum(['fully-immutable', 'manager-controlled', 'locked-approvals']).optional()
    .describe('Use a preset instead of specifying individual permissions. "locked-approvals" (recommended default): supply and approvals frozen, metadata editable. "fully-immutable": everything frozen. "manager-controlled": everything allowed except delete.'),
  permissions: z.record(z.array(z.object({
    permanentlyPermittedTimes: z.array(z.object({ start: z.string(), end: z.string() })).optional().default([]),
    permanentlyForbiddenTimes: z.array(z.object({ start: z.string(), end: z.string() })).optional().default([]),
    tokenIds: z.array(z.object({ start: z.string(), end: z.string() })).optional(),
    fromListId: z.string().optional(),
    toListId: z.string().optional(),
    initiatedByListId: z.string().optional(),
    transferTimes: z.array(z.object({ start: z.string(), end: z.string() })).optional(),
    ownershipTimes: z.array(z.object({ start: z.string(), end: z.string() })).optional(),
    approvalId: z.string().optional()
  }).passthrough())).optional()
    .describe('Custom permissions object. Overrides preset if both provided. Keys: canDeleteCollection, canArchiveCollection, canUpdateStandards, canUpdateCustomData, canUpdateManager, canUpdateCollectionMetadata, canUpdateValidTokenIds, canUpdateTokenMetadata, canUpdateCollectionApprovals, canAddMoreAliasPaths, canAddMoreCosmosCoinWrapperPaths. Values: permission arrays. Empty array [] = neutral (unlocked). Missing keys auto-filled as [] (neutral).')
});

export type SetPermissionsInput = z.infer<typeof setPermissionsSchema>;

export const setPermissionsTool = {
  name: 'set_permissions',
  description: 'Set collection permissions. Use a preset ("locked-approvals" recommended) or provide custom permissions. Fields are either FROZEN (permanentlyForbiddenTimes: FOREVER) or NEUTRAL (empty []). Use NEUTRAL for editable fields — this preserves flexibility to lock them later. Avoid permanentlyPermittedTimes unless absolutely necessary. Security: freeze canUpdateCollectionApprovals by default.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      sessionId: { type: 'string', description: 'Session ID.' },
      creatorAddress: { type: 'string' },
      preset: {
        type: 'string',
        enum: ['fully-immutable', 'manager-controlled', 'locked-approvals'],
        description: '"locked-approvals" (default): approvals+supply frozen, metadata editable. "fully-immutable": everything frozen. "manager-controlled": everything allowed except delete.'
      },
      permissions: {
        type: 'object',
        description: 'Custom permissions. Overrides preset. Each value is an array: [] = neutral (unlocked), or [{permanentlyPermittedTimes: [], permanentlyForbiddenTimes: [{start:"1",end:"18446744073709551615"}]}] = frozen.',
        properties: {
          canDeleteCollection: { type: 'array', description: 'ActionPermission[]. Items: {permanentlyPermittedTimes, permanentlyForbiddenTimes}. [] = neutral.' },
          canArchiveCollection: { type: 'array', description: 'ActionPermission[]. Items: {permanentlyPermittedTimes, permanentlyForbiddenTimes}. [] = neutral.' },
          canUpdateStandards: { type: 'array', description: 'ActionPermission[]. Items: {permanentlyPermittedTimes, permanentlyForbiddenTimes}. [] = neutral.' },
          canUpdateCustomData: { type: 'array', description: 'ActionPermission[]. Items: {permanentlyPermittedTimes, permanentlyForbiddenTimes}. [] = neutral.' },
          canUpdateManager: { type: 'array', description: 'ActionPermission[]. Items: {permanentlyPermittedTimes, permanentlyForbiddenTimes}. [] = neutral.' },
          canUpdateCollectionMetadata: { type: 'array', description: 'ActionPermission[]. Items: {permanentlyPermittedTimes, permanentlyForbiddenTimes}. [] = neutral.' },
          canUpdateValidTokenIds: { type: 'array', description: 'TokenIdsActionPermission[]. Items: {tokenIds, permanentlyPermittedTimes, permanentlyForbiddenTimes}. [] = neutral.' },
          canUpdateTokenMetadata: { type: 'array', description: 'TokenIdsActionPermission[]. Items: {tokenIds, permanentlyPermittedTimes, permanentlyForbiddenTimes}. [] = neutral.' },
          canUpdateCollectionApprovals: { type: 'array', description: 'CollectionApprovalPermission[]. Items: {fromListId, toListId, initiatedByListId, transferTimes, tokenIds, ownershipTimes, approvalId, permanentlyPermittedTimes, permanentlyForbiddenTimes}. [] = neutral.' },
          canAddMoreAliasPaths: { type: 'array', description: 'ActionPermission[]. Items: {permanentlyPermittedTimes, permanentlyForbiddenTimes}. [] = neutral.' },
          canAddMoreCosmosCoinWrapperPaths: { type: 'array', description: 'ActionPermission[]. Items: {permanentlyPermittedTimes, permanentlyForbiddenTimes}. [] = neutral.' }
        }
      }
    }
  }
};

export function handleSetPermissions(input: SetPermissionsInput) {
  getOrCreateSession(input.sessionId, input.creatorAddress);

  let permissions: Record<string, any>;
  if (input.preset && PRESETS[input.preset]) {
    permissions = { ...PRESETS[input.preset] };
    // Allow custom overrides on top of preset
    if (input.permissions) {
      Object.assign(permissions, input.permissions);
    }
  } else if (input.permissions) {
    permissions = input.permissions;
  } else {
    // Default to locked-approvals
    permissions = { ...PRESETS['locked-approvals'] };
  }

  // Ensure all 11 standard permission keys are present — fill missing with neutral []
  const REQUIRED_KEYS = [
    'canDeleteCollection', 'canArchiveCollection', 'canUpdateStandards', 'canUpdateCustomData',
    'canUpdateManager', 'canUpdateCollectionMetadata', 'canUpdateValidTokenIds',
    'canUpdateTokenMetadata', 'canUpdateCollectionApprovals', 'canAddMoreAliasPaths',
    'canAddMoreCosmosCoinWrapperPaths'
  ];
  for (const key of REQUIRED_KEYS) {
    if (!(key in permissions)) permissions[key] = [];
  }

  // Validate each value is an array with properly structured entries
  for (const [key, val] of Object.entries(permissions)) {
    if (!Array.isArray(val)) {
      return { success: false, error: `Permission "${key}" must be an array, got ${typeof val}.` };
    }
    for (let i = 0; i < val.length; i++) {
      const entry = val[i];
      if (typeof entry !== 'object' || entry === null) {
        return { success: false, error: `Permission "${key}[${i}]" must be an object, got ${typeof entry}.` };
      }
      if (Object.keys(entry).length === 0) {
        return { success: false, error: `Permission "${key}[${i}]" is an empty object. Each entry must have permanentlyPermittedTimes and/or permanentlyForbiddenTimes.` };
      }
      if (!entry.permanentlyPermittedTimes && !entry.permanentlyForbiddenTimes) {
        return { success: false, error: `Permission "${key}[${i}]" is missing permanentlyPermittedTimes and permanentlyForbiddenTimes. At least one must be provided.` };
      }
    }
  }

  setPermissionsInSession(input.sessionId, permissions);
  return { success: true, preset: input.preset || 'custom' };
}
