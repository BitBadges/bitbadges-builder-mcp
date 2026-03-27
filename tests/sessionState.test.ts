import { describe, it, expect, beforeEach } from 'vitest';
import {
  getOrCreateSession,
  getCollectionValue,
  resetSession,
  resetAllSessions,
  hasSession,
  setStandards,
  setValidTokenIds,
  setDefaultBalances,
  setPermissions,
  setInvariants,
  setManager,
  setCustomData,
  setIsArchived,
  setMintEscrowCoins,
  setCollectionMetadata,
  setTokenMetadata,
  addApproval,
  removeApproval,
  setApprovalMetadata,
  addAliasPath,
  removeAliasPath,
  addCosmosWrapperPath,
  removeCosmosWrapperPath,
  addTransfer,
  removeTransfer,
  getTransaction,
  ensureStringNumbers
} from '../src/session/sessionState.js';

beforeEach(() => {
  resetAllSessions();
});

describe('session lifecycle', () => {
  it('creates a new session on first access', () => {
    expect(hasSession('test-1')).toBe(false);
    getOrCreateSession('test-1');
    expect(hasSession('test-1')).toBe(true);
  });

  it('returns same session on repeated access', () => {
    const s1 = getOrCreateSession('test-2');
    const s2 = getOrCreateSession('test-2');
    expect(s1).toBe(s2);
  });

  it('uses default session when no ID provided', () => {
    getOrCreateSession();
    expect(hasSession()).toBe(true);
  });

  it('resets a specific session', () => {
    getOrCreateSession('test-3');
    expect(hasSession('test-3')).toBe(true);
    resetSession('test-3');
    expect(hasSession('test-3')).toBe(false);
  });

  it('resetAllSessions clears everything', () => {
    getOrCreateSession('a');
    getOrCreateSession('b');
    resetAllSessions();
    expect(hasSession('a')).toBe(false);
    expect(hasSession('b')).toBe(false);
  });

  it('new session has correct template structure', () => {
    const s = getOrCreateSession('s1', '0xCreator');
    expect(s.messages).toHaveLength(1);
    expect(s.messages[0].typeUrl).toBe('/tokenization.MsgUniversalUpdateCollection');
    expect(s.messages[0].value.creator).toBe('0xCreator');
    expect(s.messages[0].value.collectionId).toBe('0');
    expect(s.messages[0].value.collectionApprovals).toEqual([]);
    expect(s.messages[0].value.updateCollectionApprovals).toBe(true);
    expect(s.metadataPlaceholders).toEqual({});
  });

  it('creator defaults to empty string when not provided', () => {
    const s = getOrCreateSession('s2');
    expect(s.messages[0].value.creator).toBe('');
  });
});

describe('set operations', () => {
  it('setStandards replaces standards array', () => {
    const sid = 'set-test';
    setStandards(sid, ['ERC721', 'SmartToken']);
    const v = getCollectionValue(sid);
    expect(v.standards).toEqual(['ERC721', 'SmartToken']);
    expect(v.updateStandards).toBe(true);
  });

  it('setValidTokenIds sets token ID ranges', () => {
    const sid = 'set-test-2';
    setValidTokenIds(sid, [{ start: '1', end: '100' }]);
    const v = getCollectionValue(sid);
    expect(v.validTokenIds).toEqual([{ start: '1', end: '100' }]);
    expect(v.updateValidTokenIds).toBe(true);
  });

  it('setDefaultBalances merges userPermissions with defaults', () => {
    const sid = 'set-test-3';
    setDefaultBalances(sid, {
      balances: [{ amount: '1', badgeIds: [{ start: '1', end: '1' }], ownershipTimes: [{ start: '0', end: '18446744073709551615' }] }],
      userPermissions: { canUpdateOutgoingApprovals: [{ some: 'value' }] }
    });
    const v = getCollectionValue(sid);
    expect(v.defaultBalances.userPermissions.canUpdateOutgoingApprovals).toEqual([{ some: 'value' }]);
    expect(v.defaultBalances.userPermissions.canUpdateIncomingApprovals).toEqual([]);
    expect(v.updateDefaultBalances).toBe(true);
  });

  it('setDefaultBalances fills all default userPermissions when none provided', () => {
    const sid = 'set-test-3b';
    setDefaultBalances(sid, { balances: [] });
    const v = getCollectionValue(sid);
    expect(v.defaultBalances.userPermissions.canUpdateOutgoingApprovals).toEqual([]);
    expect(v.defaultBalances.userPermissions.canUpdateIncomingApprovals).toEqual([]);
    expect(v.defaultBalances.userPermissions.canUpdateAutoApproveSelfInitiatedOutgoingTransfers).toEqual([]);
    expect(v.defaultBalances.userPermissions.canUpdateAutoApproveSelfInitiatedIncomingTransfers).toEqual([]);
    expect(v.defaultBalances.userPermissions.canUpdateAutoApproveAllIncomingTransfers).toEqual([]);
  });

  it('setPermissions replaces permissions object', () => {
    const sid = 'set-test-4';
    setPermissions(sid, { canDeleteCollection: [] });
    const v = getCollectionValue(sid);
    expect(v.collectionPermissions).toEqual({ canDeleteCollection: [] });
    expect(v.updateCollectionPermissions).toBe(true);
  });

  it('setInvariants sets invariants', () => {
    const sid = 'set-test-5';
    setInvariants(sid, { mustOwnBadges: [] });
    const v = getCollectionValue(sid);
    expect(v.invariants).toEqual({ mustOwnBadges: [] });
    expect(v.updateInvariants).toBe(true);
  });

  it('setInvariants can set to null', () => {
    const sid = 'set-test-5b';
    setInvariants(sid, { mustOwnBadges: [] });
    setInvariants(sid, null);
    const v = getCollectionValue(sid);
    expect(v.invariants).toBeNull();
  });

  it('setManager sets manager', () => {
    const sid = 'set-test-6';
    setManager(sid, '0xNewManager');
    const v = getCollectionValue(sid);
    expect(v.manager).toBe('0xNewManager');
    expect(v.updateManager).toBe(true);
  });

  it('setCustomData sets custom data', () => {
    const sid = 'set-test-7';
    setCustomData(sid, 'my-custom-data');
    const v = getCollectionValue(sid);
    expect(v.customData).toBe('my-custom-data');
    expect(v.updateCustomData).toBe(true);
  });

  it('setIsArchived sets archived flag', () => {
    const sid = 'set-test-8';
    setIsArchived(sid, true);
    const v = getCollectionValue(sid);
    expect(v.isArchived).toBe(true);
    expect(v.updateIsArchived).toBe(true);
  });

  it('setMintEscrowCoins sets coins array', () => {
    const sid = 'set-test-9';
    setMintEscrowCoins(sid, [{ denom: 'ubadge', amount: '1000' }]);
    const v = getCollectionValue(sid);
    expect(v.mintEscrowCoinsToTransfer).toEqual([{ denom: 'ubadge', amount: '1000' }]);
  });
});

describe('metadata operations', () => {
  it('setCollectionMetadata sets URI and placeholder', () => {
    const sid = 'meta-1';
    setCollectionMetadata(sid, 'My Collection', 'A description', 'https://example.com/img.png');
    const s = getOrCreateSession(sid);
    const v = s.messages[0].value;
    expect(v.collectionMetadata.uri).toBe('ipfs://METADATA_COLLECTION');
    expect(v.updateCollectionMetadata).toBe(true);
    expect(s.metadataPlaceholders['ipfs://METADATA_COLLECTION']).toEqual({
      name: 'My Collection',
      description: 'A description',
      image: 'https://example.com/img.png'
    });
  });

  it('setCollectionMetadata sanitizes invalid image to default', () => {
    const sid = 'meta-1b';
    setCollectionMetadata(sid, 'Name', 'Desc', 'not-a-url');
    const s = getOrCreateSession(sid);
    expect(s.metadataPlaceholders['ipfs://METADATA_COLLECTION'].image).toBe('ipfs://QmNTpizCkY5tcMpPMf1kkn7Y5YxFQo3oT54A9oKP5ijP9E');
  });

  it('setCollectionMetadata accepts ipfs:// image', () => {
    const sid = 'meta-1c';
    setCollectionMetadata(sid, 'Name', 'Desc', 'ipfs://QmABC123');
    const s = getOrCreateSession(sid);
    expect(s.metadataPlaceholders['ipfs://METADATA_COLLECTION'].image).toBe('ipfs://QmABC123');
  });

  it('setCollectionMetadata accepts IMAGE_N placeholder', () => {
    const sid = 'meta-1d';
    setCollectionMetadata(sid, 'Name', 'Desc', 'IMAGE_0');
    const s = getOrCreateSession(sid);
    expect(s.metadataPlaceholders['ipfs://METADATA_COLLECTION'].image).toBe('IMAGE_0');
  });

  it('setCollectionMetadata accepts data: URI', () => {
    const sid = 'meta-1e';
    setCollectionMetadata(sid, 'Name', 'Desc', 'data:image/png;base64,abc');
    const s = getOrCreateSession(sid);
    expect(s.metadataPlaceholders['ipfs://METADATA_COLLECTION'].image).toBe('data:image/png;base64,abc');
  });

  it('setTokenMetadata sets token URI with single ID', () => {
    const sid = 'meta-2';
    setTokenMetadata(sid, [{ start: '1', end: '1' }], 'Token #1', 'First token', 'https://img.com/1.png');
    const s = getOrCreateSession(sid);
    const v = s.messages[0].value;
    expect(v.tokenMetadata).toHaveLength(1);
    expect(v.tokenMetadata[0].uri).toBe('ipfs://METADATA_TOKEN_1');
    expect(v.updateTokenMetadata).toBe(true);
    expect(s.metadataPlaceholders['ipfs://METADATA_TOKEN_1']).toEqual({
      name: 'Token #1',
      description: 'First token',
      image: 'https://img.com/1.png'
    });
  });

  it('setTokenMetadata uses {id} placeholder for range', () => {
    const sid = 'meta-3';
    setTokenMetadata(sid, [{ start: '1', end: '100' }], 'Token', 'A token', 'https://img.com/t.png');
    const s = getOrCreateSession(sid);
    const v = s.messages[0].value;
    expect(v.tokenMetadata[0].uri).toBe('ipfs://METADATA_TOKEN_1-100/{id}');
  });

  it('setTokenMetadata replaces existing entry with same tokenIds', () => {
    const sid = 'meta-4';
    const ids = [{ start: '5', end: '5' }];
    setTokenMetadata(sid, ids, 'V1', 'Version 1', 'https://v1.png');
    setTokenMetadata(sid, ids, 'V2', 'Version 2', 'https://v2.png');
    const s = getOrCreateSession(sid);
    expect(s.messages[0].value.tokenMetadata).toHaveLength(1);
    expect(s.metadataPlaceholders['ipfs://METADATA_TOKEN_5'].name).toBe('V2');
  });

  it('setTokenMetadata adds new entry for different tokenIds', () => {
    const sid = 'meta-5';
    setTokenMetadata(sid, [{ start: '1', end: '1' }], 'T1', 'D1', 'https://1.png');
    setTokenMetadata(sid, [{ start: '2', end: '2' }], 'T2', 'D2', 'https://2.png');
    const s = getOrCreateSession(sid);
    expect(s.messages[0].value.tokenMetadata).toHaveLength(2);
  });
});

describe('approval operations', () => {
  it('addApproval adds a new approval', () => {
    const sid = 'appr-1';
    addApproval(sid, { approvalId: 'public-mint', fromListId: 'Mint', toListId: 'All' });
    const v = getCollectionValue(sid);
    expect(v.collectionApprovals).toHaveLength(1);
    expect(v.collectionApprovals[0].approvalId).toBe('public-mint');
    expect(v.updateCollectionApprovals).toBe(true);
  });

  it('addApproval auto-creates metadata placeholder', () => {
    const sid = 'appr-1b';
    addApproval(sid, { approvalId: 'subscription-mint' });
    const s = getOrCreateSession(sid);
    expect(s.metadataPlaceholders['ipfs://METADATA_APPROVAL_subscription-mint']).toBeDefined();
    expect(s.metadataPlaceholders['ipfs://METADATA_APPROVAL_subscription-mint'].name).toBe('Subscription Mint');
  });

  it('addApproval replaces existing approval with same ID', () => {
    const sid = 'appr-2';
    addApproval(sid, { approvalId: 'mint', fromListId: 'Mint' });
    addApproval(sid, { approvalId: 'mint', fromListId: 'All' });
    const v = getCollectionValue(sid);
    expect(v.collectionApprovals).toHaveLength(1);
    expect(v.collectionApprovals[0].fromListId).toBe('All');
  });

  it('addApproval auto-sets uri, customData, version defaults', () => {
    const sid = 'appr-3';
    addApproval(sid, { approvalId: 'test-a' });
    const v = getCollectionValue(sid);
    expect(v.collectionApprovals[0].uri).toBe('ipfs://METADATA_APPROVAL_test-a');
    expect(v.collectionApprovals[0].customData).toBe('');
    expect(v.collectionApprovals[0].version).toBe('0');
  });

  it('addApproval preserves existing uri/customData/version', () => {
    const sid = 'appr-4';
    addApproval(sid, { approvalId: 'test-b', uri: 'custom-uri', customData: 'data', version: '2' });
    const v = getCollectionValue(sid);
    expect(v.collectionApprovals[0].uri).toBe('custom-uri');
    expect(v.collectionApprovals[0].customData).toBe('data');
    expect(v.collectionApprovals[0].version).toBe('2');
  });

  it('removeApproval removes existing approval', () => {
    const sid = 'appr-5';
    addApproval(sid, { approvalId: 'a1' });
    addApproval(sid, { approvalId: 'a2' });
    const result = removeApproval(sid, 'a1');
    expect(result.removed).toBe(true);
    expect(result.position).toBe(0);
    const v = getCollectionValue(sid);
    expect(v.collectionApprovals).toHaveLength(1);
    expect(v.collectionApprovals[0].approvalId).toBe('a2');
  });

  it('removeApproval returns false for non-existent approval', () => {
    const sid = 'appr-6';
    addApproval(sid, { approvalId: 'exists' });
    const result = removeApproval(sid, 'does-not-exist');
    expect(result.removed).toBe(false);
    expect(result.position).toBe(-1);
  });

  it('setApprovalMetadata updates metadata placeholder', () => {
    const sid = 'appr-7';
    addApproval(sid, { approvalId: 'my-approval' });
    setApprovalMetadata(sid, 'my-approval', 'Updated Name', 'Updated Desc', 'https://new-img.png');
    const s = getOrCreateSession(sid);
    expect(s.metadataPlaceholders['ipfs://METADATA_APPROVAL_my-approval']).toEqual({
      name: 'Updated Name',
      description: 'Updated Desc',
      image: 'https://new-img.png'
    });
    expect(s.messages[0].value.collectionApprovals[0].uri).toBe('ipfs://METADATA_APPROVAL_my-approval');
  });

  it('setApprovalMetadata on non-existent approval still saves placeholder', () => {
    const sid = 'appr-8';
    getOrCreateSession(sid);
    setApprovalMetadata(sid, 'ghost', 'Ghost Name', 'Ghost Desc');
    const s = getOrCreateSession(sid);
    expect(s.metadataPlaceholders['ipfs://METADATA_APPROVAL_ghost']).toBeDefined();
  });
});

describe('alias path operations', () => {
  it('addAliasPath adds a new path', () => {
    const sid = 'alias-1';
    addAliasPath(sid, { denom: 'ubadge', amount: '100' });
    const v = getCollectionValue(sid);
    expect(v.aliasPathsToAdd).toHaveLength(1);
    expect(v.aliasPathsToAdd[0].denom).toBe('ubadge');
  });

  it('addAliasPath replaces existing path with same denom', () => {
    const sid = 'alias-2';
    addAliasPath(sid, { denom: 'ubadge', amount: '100' });
    addAliasPath(sid, { denom: 'ubadge', amount: '200' });
    const v = getCollectionValue(sid);
    expect(v.aliasPathsToAdd).toHaveLength(1);
    expect(v.aliasPathsToAdd[0].amount).toBe('200');
  });

  it('removeAliasPath removes existing path', () => {
    const sid = 'alias-3';
    addAliasPath(sid, { denom: 'ubadge' });
    const result = removeAliasPath(sid, 'ubadge');
    expect(result.removed).toBe(true);
    const v = getCollectionValue(sid);
    expect(v.aliasPathsToAdd).toHaveLength(0);
  });

  it('removeAliasPath returns false for non-existent path', () => {
    const sid = 'alias-4';
    const result = removeAliasPath(sid, 'nonexistent');
    expect(result.removed).toBe(false);
  });
});

describe('cosmos wrapper path operations', () => {
  it('addCosmosWrapperPath adds a new path', () => {
    const sid = 'wrap-1';
    addCosmosWrapperPath(sid, { denom: 'ubadge', amount: '50' });
    const v = getCollectionValue(sid);
    expect(v.cosmosCoinWrapperPathsToAdd).toHaveLength(1);
  });

  it('addCosmosWrapperPath replaces existing path with same denom', () => {
    const sid = 'wrap-2';
    addCosmosWrapperPath(sid, { denom: 'ubadge', amount: '50' });
    addCosmosWrapperPath(sid, { denom: 'ubadge', amount: '100' });
    const v = getCollectionValue(sid);
    expect(v.cosmosCoinWrapperPathsToAdd).toHaveLength(1);
    expect(v.cosmosCoinWrapperPathsToAdd[0].amount).toBe('100');
  });

  it('removeCosmosWrapperPath removes existing path', () => {
    const sid = 'wrap-3';
    addCosmosWrapperPath(sid, { denom: 'ubadge' });
    const result = removeCosmosWrapperPath(sid, 'ubadge');
    expect(result.removed).toBe(true);
  });

  it('removeCosmosWrapperPath returns false for non-existent', () => {
    const sid = 'wrap-4';
    const result = removeCosmosWrapperPath(sid, 'ghost');
    expect(result.removed).toBe(false);
  });
});

describe('transfer operations', () => {
  it('addTransfer appends a MsgTransferTokens message', () => {
    const sid = 'tx-1';
    getOrCreateSession(sid, '0xCreator');
    const result = addTransfer(sid, { to: '0xRecipient', amount: '100' });
    expect(result.index).toBe(1);
    const s = getOrCreateSession(sid);
    expect(s.messages).toHaveLength(2);
    expect(s.messages[1].typeUrl).toBe('/tokenization.MsgTransferTokens');
    expect(s.messages[1].value.creator).toBe('0xCreator');
    expect(s.messages[1].value.to).toBe('0xRecipient');
    expect(s.messages[1].value.collectionId).toBe('0');
  });

  it('addTransfer uses provided collectionId', () => {
    const sid = 'tx-1b';
    getOrCreateSession(sid);
    addTransfer(sid, { collectionId: '42', to: '0xR' });
    const s = getOrCreateSession(sid);
    expect(s.messages[1].value.collectionId).toBe('42');
  });

  it('multiple addTransfer calls append messages', () => {
    const sid = 'tx-2';
    getOrCreateSession(sid);
    addTransfer(sid, { to: '0x1' });
    addTransfer(sid, { to: '0x2' });
    const s = getOrCreateSession(sid);
    expect(s.messages).toHaveLength(3);
  });

  it('removeTransfer removes a transfer message by index', () => {
    const sid = 'tx-3';
    getOrCreateSession(sid);
    addTransfer(sid, { to: '0x1' });
    addTransfer(sid, { to: '0x2' });
    const result = removeTransfer(sid, 1);
    expect(result.removed).toBe(true);
    const s = getOrCreateSession(sid);
    expect(s.messages).toHaveLength(2);
    expect(s.messages[1].value.to).toBe('0x2');
  });

  it('removeTransfer refuses to remove index 0 (the UpdateCollection msg)', () => {
    const sid = 'tx-4';
    getOrCreateSession(sid);
    const result = removeTransfer(sid, 0);
    expect(result.removed).toBe(false);
  });

  it('removeTransfer refuses out-of-bounds index', () => {
    const sid = 'tx-5';
    getOrCreateSession(sid);
    expect(removeTransfer(sid, 5).removed).toBe(false);
    expect(removeTransfer(sid, -1).removed).toBe(false);
  });

  it('removeTransfer refuses to remove non-transfer message type', () => {
    const sid = 'tx-6';
    const s = getOrCreateSession(sid);
    // Manually add a message that is not MsgTransferTokens
    s.messages.push({ typeUrl: '/some.OtherMsg', value: {} });
    const result = removeTransfer(sid, 1);
    expect(result.removed).toBe(false);
  });
});

describe('getTransaction', () => {
  it('returns the full session with metadataPlaceholders', () => {
    const sid = 'gt-1';
    getOrCreateSession(sid, '0xCreator');
    setCollectionMetadata(sid, 'Test', 'Desc', 'https://img.png');
    const tx = getTransaction(sid);
    expect(tx.messages).toHaveLength(1);
    expect(tx.metadataPlaceholders['ipfs://METADATA_COLLECTION']).toBeDefined();
  });

  it('auto-creates session if none exists', () => {
    const tx = getTransaction('new-session', '0xCreator');
    expect(tx.messages).toHaveLength(1);
    expect(tx.messages[0].value.creator).toBe('0xCreator');
  });
});

describe('ensureStringNumbers', () => {
  it('converts numbers to strings', () => {
    expect(ensureStringNumbers(42)).toBe('42');
  });

  it('leaves strings unchanged', () => {
    expect(ensureStringNumbers('hello')).toBe('hello');
  });

  it('handles null and undefined', () => {
    expect(ensureStringNumbers(null)).toBeNull();
    expect(ensureStringNumbers(undefined)).toBeUndefined();
  });

  it('converts numbers in arrays', () => {
    expect(ensureStringNumbers([1, 2, 3])).toEqual(['1', '2', '3']);
  });

  it('converts numbers in nested objects', () => {
    const input = { amount: 100, nested: { id: 5 }, name: 'test' };
    const result = ensureStringNumbers(input);
    expect(result).toEqual({ amount: '100', nested: { id: '5' }, name: 'test' });
  });

  it('handles deeply nested structures', () => {
    const input = { a: [{ b: { c: 999 } }] };
    const result = ensureStringNumbers(input);
    expect(result).toEqual({ a: [{ b: { c: '999' } }] });
  });

  it('handles booleans (passes through)', () => {
    expect(ensureStringNumbers(true)).toBe(true);
    expect(ensureStringNumbers(false)).toBe(false);
  });

  it('handles empty arrays and objects', () => {
    expect(ensureStringNumbers([])).toEqual([]);
    expect(ensureStringNumbers({})).toEqual({});
  });
});
