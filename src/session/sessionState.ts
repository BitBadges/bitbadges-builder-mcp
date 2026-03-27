/**
 * In-memory session state for the MCP builder v2.
 *
 * Uses a Map keyed by sessionId for per-request isolation.
 * Each session holds a blank MsgUniversalUpdateCollection template that per-field tools mutate.
 * Auto-creates on first mutation. State is ephemeral — scoped to the MCP process lifetime.
 *
 * Design principles:
 * - Set tools replace the entire field
 * - Add/Remove tools manage arrays with order preservation
 * - Remove + re-add with same ID = replace in-place
 * - Metadata placeholders are managed alongside their fields
 */

import { ensureBb1 } from '../sdk/addressUtils.js';

const MAX_UINT64 = '18446744073709551615';
const DEFAULT_IMAGE = 'ipfs://QmNTpizCkY5tcMpPMf1kkn7Y5YxFQo3oT54A9oKP5ijP9E';

/**
 * Sanitize image value — if it's not a valid URL/IPFS/placeholder, use default logo.
 * IMAGE_N placeholders are valid (frontend replaces them), but only if they match the pattern.
 */
function sanitizeImage(image: string): string {
  if (!image) return DEFAULT_IMAGE;
  if (image.startsWith('http://') || image.startsWith('https://') || image.startsWith('ipfs://') || image.startsWith('data:')) return image;
  if (/^IMAGE_\d+$/.test(image)) return image; // Valid frontend placeholder
  return DEFAULT_IMAGE;
}

export interface SessionTransaction {
  messages: Array<{
    typeUrl: string;
    value: Record<string, any>;
  }>;
  metadataPlaceholders: Record<string, { name: string; description: string; image: string }>;
  /** Approval IDs that existed when the session was initialized (for update flows) */
  originalApprovalIds?: Set<string>;
}

// Per-session state keyed by sessionId
const sessions = new Map<string, SessionTransaction>();

// Default sessionId when none is provided (MCP-direct / single-user mode)
const DEFAULT_SESSION_ID = '__default__';

function resolveSessionId(sessionId?: string): string {
  return sessionId || DEFAULT_SESSION_ID;
}

/**
 * Get or auto-create a session. First call initializes with a blank template.
 */
export function getOrCreateSession(sessionId?: string, creatorAddress?: string): SessionTransaction {
  const sid = resolveSessionId(sessionId);
  const resolvedCreator = creatorAddress ? ensureBb1(creatorAddress) : creatorAddress;
  let session = sessions.get(sid);
  if (!session) {
    session = {
      messages: [{
        typeUrl: '/tokenization.MsgUniversalUpdateCollection',
        value: {
          creator: resolvedCreator || '',
          collectionId: '0',
          updateCollectionApprovals: true,
          collectionApprovals: [],
          updateStandards: true,
          standards: [],
          updateValidTokenIds: true,
          validTokenIds: [],
          updateCollectionMetadata: true,
          collectionMetadata: { uri: '', customData: '' },
          updateTokenMetadata: true,
          tokenMetadata: [],
          updateCollectionPermissions: true,
          collectionPermissions: {},
          updateInvariants: true,
          invariants: null,
          updateDefaultBalances: true,
          defaultBalances: {
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
          },
          updateManager: true,
          manager: creatorAddress || '',
          updateCustomData: false,
          customData: '',
          mintEscrowCoinsToTransfer: [],
          aliasPathsToAdd: [],
          cosmosCoinWrapperPathsToAdd: []
        }
      }],
      metadataPlaceholders: {}
    };
    sessions.set(sid, session);
  }
  return session;
}

/**
 * Get the collection value (messages[0].value) from a session.
 */
export function getCollectionValue(sessionId?: string, creatorAddress?: string): Record<string, any> {
  return getOrCreateSession(sessionId, creatorAddress).messages[0].value;
}

/**
 * Reset a specific session (or the default session).
 */
export function resetSession(sessionId?: string): void {
  sessions.delete(resolveSessionId(sessionId));
}

/**
 * Reset all sessions (for testing).
 */
export function resetAllSessions(): void {
  sessions.clear();
}

/**
 * Check if a session exists.
 */
export function hasSession(sessionId?: string): boolean {
  return sessions.has(resolveSessionId(sessionId));
}

// ============================================================
// Set operations — replace the entire field
// ============================================================

export function setStandards(sessionId: string | undefined, standards: string[]): void {
  const value = getCollectionValue(sessionId);
  value.standards = standards;
  value.updateStandards = true;
}

export function setValidTokenIds(sessionId: string | undefined, tokenIds: Array<{ start: string; end: string }>): void {
  const value = getCollectionValue(sessionId);
  value.validTokenIds = tokenIds;
  value.updateValidTokenIds = true;
}

const DEFAULT_USER_PERMISSIONS = {
  canUpdateOutgoingApprovals: [],
  canUpdateIncomingApprovals: [],
  canUpdateAutoApproveSelfInitiatedOutgoingTransfers: [],
  canUpdateAutoApproveSelfInitiatedIncomingTransfers: [],
  canUpdateAutoApproveAllIncomingTransfers: []
};

export function setDefaultBalances(sessionId: string | undefined, defaultBalances: Record<string, any>): void {
  const value = getCollectionValue(sessionId);
  // Auto-fill required userPermissions fields that the SDK needs
  const userPerms = defaultBalances.userPermissions || {};
  defaultBalances.userPermissions = { ...DEFAULT_USER_PERMISSIONS, ...userPerms };
  value.defaultBalances = defaultBalances;
  value.updateDefaultBalances = true;
}

export function setPermissions(sessionId: string | undefined, permissions: Record<string, any>): void {
  const value = getCollectionValue(sessionId);
  value.collectionPermissions = permissions;
  value.updateCollectionPermissions = true;
}

export function setInvariants(sessionId: string | undefined, invariants: Record<string, any> | null): void {
  const value = getCollectionValue(sessionId);
  value.invariants = invariants;
  value.updateInvariants = true;
}

export function setManager(sessionId: string | undefined, manager: string): void {
  const value = getCollectionValue(sessionId);
  value.manager = manager;
  value.updateManager = true;
}

export function setCustomData(sessionId: string | undefined, customData: string): void {
  const value = getCollectionValue(sessionId);
  value.customData = customData;
  value.updateCustomData = true;
}

export function setIsArchived(sessionId: string | undefined, isArchived: boolean): void {
  const value = getCollectionValue(sessionId);
  value.isArchived = isArchived;
  value.updateIsArchived = true;
}

export function setMintEscrowCoins(sessionId: string | undefined, coins: Array<{ denom: string; amount: string }>): void {
  const value = getCollectionValue(sessionId);
  value.mintEscrowCoinsToTransfer = coins;
}

export function setCollectionMetadata(sessionId: string | undefined, name: string, description: string, image: string): void {
  const s = getOrCreateSession(sessionId);
  const value = s.messages[0].value;
  const uri = 'ipfs://METADATA_COLLECTION';
  value.collectionMetadata = { uri, customData: '' };
  value.updateCollectionMetadata = true;
  s.metadataPlaceholders[uri] = { name, description, image: sanitizeImage(image) };
}

export function setTokenMetadata(
  sessionId: string | undefined,
  tokenIds: Array<{ start: string; end: string }>,
  name: string,
  description: string,
  image: string
): void {
  const s = getOrCreateSession(sessionId);
  const value = s.messages[0].value;
  const uriKey = tokenIds.length === 1 && tokenIds[0].start === tokenIds[0].end
    ? `ipfs://METADATA_TOKEN_${tokenIds[0].start}`
    : `ipfs://METADATA_TOKEN_${tokenIds[0].start}-${tokenIds[tokenIds.length - 1].end}`;

  const useIdPlaceholder = tokenIds.length === 1 && tokenIds[0].start !== tokenIds[0].end;
  const uri = useIdPlaceholder ? `${uriKey}/{id}` : uriKey;

  const existing = value.tokenMetadata?.findIndex((tm: any) =>
    JSON.stringify(tm.tokenIds) === JSON.stringify(tokenIds)
  );
  const entry = { uri, customData: '', tokenIds };
  if (existing >= 0) {
    value.tokenMetadata[existing] = entry;
  } else {
    value.tokenMetadata = [...(value.tokenMetadata || []), entry];
  }
  value.updateTokenMetadata = true;
  s.metadataPlaceholders[uriKey] = { name, description, image: sanitizeImage(image) };
}

// ============================================================
// Add/Remove operations — array items with order preservation
// ============================================================

export function addApproval(sessionId: string | undefined, approval: Record<string, any>): void {
  const s = getOrCreateSession(sessionId);
  const value = s.messages[0].value;
  const approvals: any[] = value.collectionApprovals || [];
  const approvalId = approval.approvalId;

  const existingIdx = approvals.findIndex((a: any) => a.approvalId === approvalId);
  if (existingIdx >= 0) {
    approvals[existingIdx] = approval;
  } else {
    approvals.push(approval);
  }

  value.collectionApprovals = approvals;
  value.updateCollectionApprovals = true;

  // Auto-create approval metadata placeholder
  const uri = `ipfs://METADATA_APPROVAL_${approvalId}`;
  const idx = existingIdx >= 0 ? existingIdx : approvals.length - 1;
  approvals[idx].uri = approvals[idx].uri || uri;
  approvals[idx].customData = approvals[idx].customData || '';
  approvals[idx].version = approvals[idx].version || '0';
  if (!s.metadataPlaceholders[uri]) {
    const approvalTitle = (approvalId as string).replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
    s.metadataPlaceholders[uri] = { name: approvalTitle, description: '', image: '' };
  }
}

export function removeApproval(sessionId: string | undefined, approvalId: string): { removed: boolean; position: number } {
  const value = getCollectionValue(sessionId);
  const approvals: any[] = value.collectionApprovals || [];
  const idx = approvals.findIndex((a: any) => a.approvalId === approvalId);
  if (idx >= 0) {
    approvals.splice(idx, 1);
    value.collectionApprovals = approvals;
    return { removed: true, position: idx };
  }
  return { removed: false, position: -1 };
}

export function setApprovalMetadata(sessionId: string | undefined, approvalId: string, name: string, description: string, image: string = ''): void {
  const s = getOrCreateSession(sessionId);
  const uri = `ipfs://METADATA_APPROVAL_${approvalId}`;
  s.metadataPlaceholders[uri] = { name, description, image };

  const value = s.messages[0].value;
  const approvals: any[] = value.collectionApprovals || [];
  const approval = approvals.find((a: any) => a.approvalId === approvalId);
  if (approval) {
    approval.uri = uri;
  }
}

export function addAliasPath(sessionId: string | undefined, aliasPath: Record<string, any>): void {
  const value = getCollectionValue(sessionId);
  const paths: any[] = value.aliasPathsToAdd || [];
  const denom = aliasPath.denom;

  const existingIdx = paths.findIndex((p: any) => p.denom === denom);
  if (existingIdx >= 0) {
    paths[existingIdx] = aliasPath;
  } else {
    paths.push(aliasPath);
  }
  value.aliasPathsToAdd = paths;
}

export function removeAliasPath(sessionId: string | undefined, denom: string): { removed: boolean } {
  const value = getCollectionValue(sessionId);
  const paths: any[] = value.aliasPathsToAdd || [];
  const idx = paths.findIndex((p: any) => p.denom === denom);
  if (idx >= 0) {
    paths.splice(idx, 1);
    value.aliasPathsToAdd = paths;
    return { removed: true };
  }
  return { removed: false };
}

export function addCosmosWrapperPath(sessionId: string | undefined, wrapperPath: Record<string, any>): void {
  const value = getCollectionValue(sessionId);
  const paths: any[] = value.cosmosCoinWrapperPathsToAdd || [];
  const denom = wrapperPath.denom;

  const existingIdx = paths.findIndex((p: any) => p.denom === denom);
  if (existingIdx >= 0) {
    paths[existingIdx] = wrapperPath;
  } else {
    paths.push(wrapperPath);
  }
  value.cosmosCoinWrapperPathsToAdd = paths;
}

export function removeCosmosWrapperPath(sessionId: string | undefined, denom: string): { removed: boolean } {
  const value = getCollectionValue(sessionId);
  const paths: any[] = value.cosmosCoinWrapperPathsToAdd || [];
  const idx = paths.findIndex((p: any) => p.denom === denom);
  if (idx >= 0) {
    paths.splice(idx, 1);
    value.cosmosCoinWrapperPathsToAdd = paths;
    return { removed: true };
  }
  return { removed: false };
}

// ============================================================
// Transfer messages — append/remove MsgTransferTokens
// ============================================================

export function addTransfer(sessionId: string | undefined, transfer: Record<string, any>): { index: number } {
  const s = getOrCreateSession(sessionId);
  const creatorAddress = s.messages[0].value.creator || '';

  const msg = {
    typeUrl: '/tokenization.MsgTransferTokens',
    value: {
      ...transfer,
      creator: creatorAddress,
      collectionId: transfer.collectionId || '0'
    }
  };

  s.messages.push(msg);
  return { index: s.messages.length - 1 };
}

export function removeTransfer(sessionId: string | undefined, index: number): { removed: boolean } {
  const s = getOrCreateSession(sessionId);
  // Index 0 is always MsgUniversalUpdateCollection — can't remove it
  if (index < 1 || index >= s.messages.length) return { removed: false };
  if (s.messages[index].typeUrl !== '/tokenization.MsgTransferTokens') return { removed: false };
  s.messages.splice(index, 1);
  return { removed: true };
}

// ============================================================
// Read operations
// ============================================================

/**
 * Get the assembled transaction JSON with metadataPlaceholders.
 */
export function getTransaction(sessionId?: string, creatorAddress?: string): SessionTransaction {
  return getOrCreateSession(sessionId, creatorAddress);
}

/**
 * Ensure all string numbers are actually strings (common LLM mistake).
 */
export function ensureStringNumbers(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'number') return String(obj);
  if (Array.isArray(obj)) return obj.map(ensureStringNumbers);
  if (typeof obj === 'object') {
    const result: Record<string, any> = {};
    for (const [key, val] of Object.entries(obj)) {
      result[key] = ensureStringNumbers(val);
    }
    return result;
  }
  return obj;
}
