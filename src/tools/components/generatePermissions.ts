/**
 * Tool: generate_permissions
 * Build permission presets for collections
 */

import { z } from 'zod';

const MAX_UINT64 = '18446744073709551615';
const FOREVER_TIMES = [{ start: '1', end: MAX_UINT64 }];

export const generatePermissionsSchema = z.object({
  preset: z.enum([
    'fully-immutable',
    'manager-controlled',
    'token-locked',
    'custom'
  ]).describe('Permission preset to use'),
  customPermissions: z.record(z.enum([
    'allowed',
    'forbidden',
    'neutral'
  ])).optional().describe('Custom permission settings when using custom preset')
});

export type GeneratePermissionsInput = z.infer<typeof generatePermissionsSchema>;

export interface ActionPermission {
  permanentlyPermittedTimes: Array<{ start: string; end: string }>;
  permanentlyForbiddenTimes: Array<{ start: string; end: string }>;
}

export interface TokenIdsActionPermission {
  tokenIds: Array<{ start: string; end: string }>;
  permanentlyPermittedTimes: Array<{ start: string; end: string }>;
  permanentlyForbiddenTimes: Array<{ start: string; end: string }>;
}

export interface CollectionApprovalPermission {
  fromListId: string;
  toListId: string;
  initiatedByListId: string;
  transferTimes: Array<{ start: string; end: string }>;
  tokenIds: Array<{ start: string; end: string }>;
  ownershipTimes: Array<{ start: string; end: string }>;
  approvalId: string;
  permanentlyPermittedTimes: Array<{ start: string; end: string }>;
  permanentlyForbiddenTimes: Array<{ start: string; end: string }>;
}

export interface CollectionPermissions {
  canDeleteCollection: ActionPermission[];
  canArchiveCollection: ActionPermission[];
  canUpdateStandards: ActionPermission[];
  canUpdateCustomData: ActionPermission[];
  canUpdateManager: ActionPermission[];
  canUpdateCollectionMetadata: ActionPermission[];
  canUpdateValidTokenIds: TokenIdsActionPermission[];
  canUpdateTokenMetadata: TokenIdsActionPermission[];
  canUpdateCollectionApprovals: CollectionApprovalPermission[];
  canAddMoreAliasPaths: ActionPermission[];
  canAddMoreCosmosCoinWrapperPaths: ActionPermission[];
}

export interface GeneratePermissionsResult {
  success: boolean;
  permissions?: CollectionPermissions;
  error?: string;
}

export const generatePermissionsTool = {
  name: 'generate_permissions',
  description: 'Build permission presets for collections. Generates properly formatted collection permissions for common configurations.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      preset: {
        type: 'string',
        enum: ['fully-immutable', 'manager-controlled', 'token-locked', 'custom'],
        description: 'Permission preset: fully-immutable (all frozen), manager-controlled (all allowed), token-locked (tokens frozen, metadata editable), custom (specify each)'
      },
      customPermissions: {
        type: 'object',
        additionalProperties: {
          type: 'string',
          enum: ['allowed', 'forbidden', 'neutral']
        },
        description: 'Custom permission settings. Keys: canDeleteCollection, canArchiveCollection, canUpdateStandards, canUpdateCustomData, canUpdateManager, canUpdateCollectionMetadata, canUpdateValidTokenIds, canUpdateTokenMetadata, canUpdateCollectionApprovals, canAddMoreAliasPaths, canAddMoreCosmosCoinWrapperPaths'
      }
    },
    required: ['preset']
  }
};

function createForbiddenAction(): ActionPermission {
  return {
    permanentlyPermittedTimes: [],
    permanentlyForbiddenTimes: FOREVER_TIMES
  };
}

function createAllowedAction(): ActionPermission {
  return {
    permanentlyPermittedTimes: FOREVER_TIMES,
    permanentlyForbiddenTimes: []
  };
}

function createNeutralAction(): ActionPermission[] {
  // Empty array means neutral/unspecified
  return [];
}

function createForbiddenTokenIds(): TokenIdsActionPermission {
  return {
    tokenIds: FOREVER_TIMES,
    permanentlyPermittedTimes: [],
    permanentlyForbiddenTimes: FOREVER_TIMES
  };
}

function createAllowedTokenIds(): TokenIdsActionPermission {
  return {
    tokenIds: FOREVER_TIMES,
    permanentlyPermittedTimes: FOREVER_TIMES,
    permanentlyForbiddenTimes: []
  };
}

function createNeutralTokenIds(): TokenIdsActionPermission[] {
  return [];
}

function createForbiddenApprovals(): CollectionApprovalPermission {
  return {
    fromListId: 'All',
    toListId: 'All',
    initiatedByListId: 'All',
    transferTimes: FOREVER_TIMES,
    tokenIds: FOREVER_TIMES,
    ownershipTimes: FOREVER_TIMES,
    approvalId: 'All',
    permanentlyPermittedTimes: [],
    permanentlyForbiddenTimes: FOREVER_TIMES
  };
}

function createAllowedApprovals(): CollectionApprovalPermission {
  return {
    fromListId: 'All',
    toListId: 'All',
    initiatedByListId: 'All',
    transferTimes: FOREVER_TIMES,
    tokenIds: FOREVER_TIMES,
    ownershipTimes: FOREVER_TIMES,
    approvalId: 'All',
    permanentlyPermittedTimes: FOREVER_TIMES,
    permanentlyForbiddenTimes: []
  };
}

function createNeutralApprovals(): CollectionApprovalPermission[] {
  return [];
}

function buildFullyImmutablePermissions(): CollectionPermissions {
  return {
    canDeleteCollection: [createForbiddenAction()],
    canArchiveCollection: [createForbiddenAction()],
    canUpdateStandards: [createForbiddenAction()],
    canUpdateCustomData: [createForbiddenAction()],
    canUpdateManager: [createForbiddenAction()],
    canUpdateCollectionMetadata: [createForbiddenAction()],
    canUpdateValidTokenIds: [createForbiddenTokenIds()],
    canUpdateTokenMetadata: [createForbiddenTokenIds()],
    canUpdateCollectionApprovals: [createForbiddenApprovals()],
    canAddMoreAliasPaths: [createForbiddenAction()],
    canAddMoreCosmosCoinWrapperPaths: [createForbiddenAction()]
  };
}

function buildManagerControlledPermissions(): CollectionPermissions {
  return {
    canDeleteCollection: [createForbiddenAction()], // Usually keep delete forbidden
    canArchiveCollection: [createAllowedAction()],
    canUpdateStandards: [createAllowedAction()],
    canUpdateCustomData: [createAllowedAction()],
    canUpdateManager: [createAllowedAction()],
    canUpdateCollectionMetadata: [createAllowedAction()],
    canUpdateValidTokenIds: [createAllowedTokenIds()],
    canUpdateTokenMetadata: [createAllowedTokenIds()],
    canUpdateCollectionApprovals: [createAllowedApprovals()],
    canAddMoreAliasPaths: [createAllowedAction()],
    canAddMoreCosmosCoinWrapperPaths: [createAllowedAction()]
  };
}

function buildTokenLockedPermissions(): CollectionPermissions {
  return {
    canDeleteCollection: [createForbiddenAction()],
    canArchiveCollection: [createAllowedAction()],
    canUpdateStandards: [createForbiddenAction()],
    canUpdateCustomData: [createAllowedAction()],
    canUpdateManager: [createForbiddenAction()],
    canUpdateCollectionMetadata: [createAllowedAction()],
    canUpdateValidTokenIds: [createForbiddenTokenIds()], // Token IDs locked
    canUpdateTokenMetadata: [createAllowedTokenIds()], // But metadata editable
    canUpdateCollectionApprovals: [createForbiddenApprovals()], // Approvals locked
    canAddMoreAliasPaths: [createForbiddenAction()],
    canAddMoreCosmosCoinWrapperPaths: [createForbiddenAction()]
  };
}

function buildCustomPermissions(customSettings: Record<string, string>): CollectionPermissions {
  const getActionPermission = (value: string | undefined): ActionPermission[] => {
    switch (value) {
      case 'allowed':
        return [createAllowedAction()];
      case 'forbidden':
        return [createForbiddenAction()];
      default:
        return createNeutralAction();
    }
  };

  const getTokenIdsPermission = (value: string | undefined): TokenIdsActionPermission[] => {
    switch (value) {
      case 'allowed':
        return [createAllowedTokenIds()];
      case 'forbidden':
        return [createForbiddenTokenIds()];
      default:
        return createNeutralTokenIds();
    }
  };

  const getApprovalPermission = (value: string | undefined): CollectionApprovalPermission[] => {
    switch (value) {
      case 'allowed':
        return [createAllowedApprovals()];
      case 'forbidden':
        return [createForbiddenApprovals()];
      default:
        return createNeutralApprovals();
    }
  };

  return {
    canDeleteCollection: getActionPermission(customSettings.canDeleteCollection),
    canArchiveCollection: getActionPermission(customSettings.canArchiveCollection),
    canUpdateStandards: getActionPermission(customSettings.canUpdateStandards),
    canUpdateCustomData: getActionPermission(customSettings.canUpdateCustomData),
    canUpdateManager: getActionPermission(customSettings.canUpdateManager),
    canUpdateCollectionMetadata: getActionPermission(customSettings.canUpdateCollectionMetadata),
    canUpdateValidTokenIds: getTokenIdsPermission(customSettings.canUpdateValidTokenIds),
    canUpdateTokenMetadata: getTokenIdsPermission(customSettings.canUpdateTokenMetadata),
    canUpdateCollectionApprovals: getApprovalPermission(customSettings.canUpdateCollectionApprovals),
    canAddMoreAliasPaths: getActionPermission(customSettings.canAddMoreAliasPaths),
    canAddMoreCosmosCoinWrapperPaths: getActionPermission(customSettings.canAddMoreCosmosCoinWrapperPaths)
  };
}

export function handleGeneratePermissions(input: GeneratePermissionsInput): GeneratePermissionsResult {
  try {
    let permissions: CollectionPermissions;

    switch (input.preset) {
      case 'fully-immutable':
        permissions = buildFullyImmutablePermissions();
        break;
      case 'manager-controlled':
        permissions = buildManagerControlledPermissions();
        break;
      case 'token-locked':
        permissions = buildTokenLockedPermissions();
        break;
      case 'custom':
        if (!input.customPermissions) {
          return {
            success: false,
            error: 'customPermissions required when using custom preset'
          };
        }
        permissions = buildCustomPermissions(input.customPermissions);
        break;
      default:
        return {
          success: false,
          error: `Unknown preset: ${input.preset}`
        };
    }

    return {
      success: true,
      permissions
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to generate permissions: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
