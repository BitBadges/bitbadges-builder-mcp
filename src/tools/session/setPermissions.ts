import { z } from 'zod';
import { setPermissions as setPermissionsInSession, getOrCreateSession } from '../../session/sessionState.js';

const MAX_UINT64 = '18446744073709551615';
const FOREVER_TIMES = [{ start: '1', end: MAX_UINT64 }];

const FORBIDDEN_ACTION = [{ permanentlyPermittedTimes: [], permanentlyForbiddenTimes: FOREVER_TIMES }];
const ALLOWED_ACTION = [{ permanentlyPermittedTimes: FOREVER_TIMES, permanentlyForbiddenTimes: [] }];
const FORBIDDEN_TOKEN_IDS = [{ tokenIds: FOREVER_TIMES, permanentlyPermittedTimes: [], permanentlyForbiddenTimes: FOREVER_TIMES }];
const ALLOWED_TOKEN_IDS = [{ tokenIds: FOREVER_TIMES, permanentlyPermittedTimes: FOREVER_TIMES, permanentlyForbiddenTimes: [] }];
const FORBIDDEN_APPROVALS = [{ fromListId: 'All', toListId: 'All', initiatedByListId: 'All', transferTimes: FOREVER_TIMES, tokenIds: FOREVER_TIMES, ownershipTimes: FOREVER_TIMES, approvalId: 'All', permanentlyPermittedTimes: [], permanentlyForbiddenTimes: FOREVER_TIMES }];
const ALLOWED_APPROVALS = [{ fromListId: 'All', toListId: 'All', initiatedByListId: 'All', transferTimes: FOREVER_TIMES, tokenIds: FOREVER_TIMES, ownershipTimes: FOREVER_TIMES, approvalId: 'All', permanentlyPermittedTimes: FOREVER_TIMES, permanentlyForbiddenTimes: [] }];

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
    canArchiveCollection: ALLOWED_ACTION,
    canUpdateStandards: ALLOWED_ACTION,
    canUpdateCustomData: ALLOWED_ACTION,
    canUpdateManager: ALLOWED_ACTION,
    canUpdateCollectionMetadata: ALLOWED_ACTION,
    canUpdateValidTokenIds: ALLOWED_TOKEN_IDS,
    canUpdateTokenMetadata: ALLOWED_TOKEN_IDS,
    canUpdateCollectionApprovals: ALLOWED_APPROVALS,
    canAddMoreAliasPaths: ALLOWED_ACTION,
    canAddMoreCosmosCoinWrapperPaths: ALLOWED_ACTION
  },
  'locked-approvals': {
    canDeleteCollection: FORBIDDEN_ACTION,
    canArchiveCollection: ALLOWED_ACTION,
    canUpdateStandards: FORBIDDEN_ACTION,
    canUpdateCustomData: ALLOWED_ACTION,
    canUpdateManager: FORBIDDEN_ACTION,
    canUpdateCollectionMetadata: ALLOWED_ACTION,
    canUpdateValidTokenIds: FORBIDDEN_TOKEN_IDS,
    canUpdateTokenMetadata: ALLOWED_TOKEN_IDS,
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
  permissions: z.record(z.any()).optional()
    .describe('Custom permissions object. Overrides preset if both provided. Keys: canDeleteCollection, canArchiveCollection, canUpdateStandards, canUpdateCustomData, canUpdateManager, canUpdateCollectionMetadata, canUpdateValidTokenIds, canUpdateTokenMetadata, canUpdateCollectionApprovals, canAddMoreAliasPaths, canAddMoreCosmosCoinWrapperPaths. Values: permission arrays. Empty array [] = neutral (unlocked). Missing keys auto-filled as [] (neutral).')
});

export type SetPermissionsInput = z.infer<typeof setPermissionsSchema>;

export const setPermissionsTool = {
  name: 'set_permissions',
  description: 'Set collection permissions. Use a preset ("locked-approvals" recommended) or provide custom permissions. Permissions control what the manager can change after creation. Security: freeze canUpdateCollectionApprovals by default — if open, manager can mint unlimited tokens. canDeleteCollection is always forbidden.',
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
        description: 'Custom permissions. Overrides preset. Empty array [] = neutral. permanentlyForbiddenTimes: FOREVER = frozen.'
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

  setPermissionsInSession(input.sessionId, permissions);
  return { success: true, preset: input.preset || 'custom' };
}
