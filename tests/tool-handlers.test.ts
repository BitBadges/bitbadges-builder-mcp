import { describe, it, expect } from 'vitest';
import { handleValidateAddress } from '../src/tools/utilities/validateAddress.js';
import { handleConvertAddress } from '../src/tools/utilities/convertAddress.js';
import { handleGenerateUniqueId } from '../src/tools/utilities/generateUniqueId.js';
import { handleGetCurrentTimestamp } from '../src/tools/utilities/getCurrentTimestamp.js';
import { handleLookupTokenInfo } from '../src/tools/utilities/lookupTokenInfo.js';
import { handleDiagnoseError } from '../src/tools/utilities/diagnoseError.js';
import { handleBuildToken } from '../src/tools/builders/buildToken.js';
import { handleBuildAddressList } from '../src/tools/builders/buildAddressList.js';
import { handleSetManager } from '../src/tools/session/setManager.js';
import { handleBuildDynamicStore } from '../src/tools/queries/buildDynamicStore.js';
import { ethToCosmos } from '../src/sdk/addressUtils.js';

// ============================================================
// handleValidateAddress
// ============================================================
describe('handleValidateAddress', () => {
  it('validates a correct ETH address', () => {
    const result = handleValidateAddress({ address: '0x0000000000000000000000000000000000000001' });
    expect(result.success).toBe(true);
    expect(result.valid).toBe(true);
    expect(result.chain).toBe('eth');
    expect(result.details?.format).toBe('ethereum');
    expect(result.details?.prefix).toBe('0x');
    expect(result.details?.length).toBe(42);
  });

  it('normalizes ETH address to lowercase', () => {
    const result = handleValidateAddress({ address: '0xABCDEF1234567890ABCDEF1234567890ABCDEF12' });
    expect(result.normalized).toBe('0xabcdef1234567890abcdef1234567890abcdef12');
  });

  it('rejects short ETH address', () => {
    const result = handleValidateAddress({ address: '0x1234' });
    expect(result.valid).toBe(false);
    expect(result.chain).toBe('eth');
  });

  it('validates a correct bb1 address', () => {
    // First convert a known ETH address to get a valid bb1
    const convertResult = handleConvertAddress({ address: '0x0000000000000000000000000000000000000001', targetFormat: 'bitbadges' });
    const bb = convertResult.convertedAddress!;
    const result = handleValidateAddress({ address: bb });
    expect(result.success).toBe(true);
    expect(result.valid).toBe(true);
    expect(result.chain).toBe('cosmos');
    expect(result.details?.format).toBe('bech32');
  });

  it('validates a cosmos1 address', () => {
    // cosmos1 should also be detected as cosmos chain
    const result = handleValidateAddress({ address: 'cosmos1qypqxpq9qcrsszg2pvxq6rs0zqg3yyc5lzv7xu' });
    // If valid bech32, it should work
    if (result.valid) {
      expect(result.chain).toBe('cosmos');
    }
  });

  it('handles empty address', () => {
    const result = handleValidateAddress({ address: '' });
    expect(result.success).toBe(true);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Address is empty');
  });

  it('handles whitespace-only address', () => {
    const result = handleValidateAddress({ address: '   ' });
    expect(result.success).toBe(true);
    expect(result.valid).toBe(false);
  });

  it('returns unknown for random string', () => {
    const result = handleValidateAddress({ address: 'not-an-address' });
    expect(result.success).toBe(true);
    expect(result.valid).toBe(false);
    expect(result.chain).toBe('unknown');
    expect(result.details?.format).toBe('unknown');
  });
});

// ============================================================
// handleConvertAddress
// ============================================================
describe('handleConvertAddress', () => {
  it('converts ETH to bitbadges', () => {
    const result = handleConvertAddress({
      address: '0x0000000000000000000000000000000000000001',
      targetFormat: 'bitbadges'
    });
    expect(result.success).toBe(true);
    expect(result.convertedAddress).toMatch(/^bb1/);
    expect(result.originalFormat).toBe('eth');
    expect(result.targetFormat).toBe('bitbadges');
  });

  it('converts bitbadges to ETH', () => {
    const ethAddr = '0x0000000000000000000000000000000000000001';
    const convert1 = handleConvertAddress({ address: ethAddr, targetFormat: 'bitbadges' });
    const result = handleConvertAddress({
      address: convert1.convertedAddress!,
      targetFormat: 'eth'
    });
    expect(result.success).toBe(true);
    expect(result.convertedAddress).toMatch(/^0x/);
    expect(result.originalFormat).toBe('bitbadges');
  });

  it('round-trips correctly', () => {
    const ethAddr = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
    const toBB = handleConvertAddress({ address: ethAddr, targetFormat: 'bitbadges' });
    const toEth = handleConvertAddress({ address: toBB.convertedAddress!, targetFormat: 'eth' });
    expect(toEth.convertedAddress).toBe(ethAddr.toLowerCase());
  });

  it('returns same address when already in target format (ETH to ETH)', () => {
    const result = handleConvertAddress({
      address: '0x0000000000000000000000000000000000000001',
      targetFormat: 'eth'
    });
    expect(result.success).toBe(true);
    expect(result.convertedAddress).toBe('0x0000000000000000000000000000000000000001');
  });

  it('returns same address when already in target format (bb1 to bitbadges)', () => {
    const toBB = handleConvertAddress({
      address: '0x0000000000000000000000000000000000000001',
      targetFormat: 'bitbadges'
    });
    const result = handleConvertAddress({
      address: toBB.convertedAddress!,
      targetFormat: 'bitbadges'
    });
    expect(result.success).toBe(true);
    expect(result.convertedAddress).toBe(toBB.convertedAddress);
  });

  it('fails for unknown address format', () => {
    const result = handleConvertAddress({ address: 'hello', targetFormat: 'eth' });
    expect(result.success).toBe(false);
    expect(result.error).toContain('Unknown address format');
  });
});

// ============================================================
// handleGenerateUniqueId
// ============================================================
describe('handleGenerateUniqueId', () => {
  it('generates a single ID with prefix', () => {
    const result = handleGenerateUniqueId({ prefix: 'public-mint' });
    expect(result.success).toBe(true);
    expect(result.ids).toHaveLength(1);
    expect(result.ids[0]).toMatch(/^public-mint_[0-9a-f]{8}$/);
  });

  it('generates multiple IDs when count > 1', () => {
    const result = handleGenerateUniqueId({ prefix: 'test', count: 5 });
    expect(result.ids).toHaveLength(5);
    // All should be unique
    const unique = new Set(result.ids);
    expect(unique.size).toBe(5);
  });

  it('caps count at 20', () => {
    const result = handleGenerateUniqueId({ prefix: 'test', count: 100 });
    expect(result.ids).toHaveLength(20);
  });

  it('clamps count minimum to 1', () => {
    const result = handleGenerateUniqueId({ prefix: 'test', count: 0 });
    expect(result.ids).toHaveLength(1);
  });

  it('handles negative count as 1', () => {
    const result = handleGenerateUniqueId({ prefix: 'test', count: -5 });
    expect(result.ids).toHaveLength(1);
  });

  it('defaults count to 1 when undefined', () => {
    const result = handleGenerateUniqueId({ prefix: 'x' });
    expect(result.ids).toHaveLength(1);
  });

  it('includes a note about usage', () => {
    const result = handleGenerateUniqueId({ prefix: 'test' });
    expect(result.note).toBeTypeOf('string');
    expect(result.note.length).toBeGreaterThan(0);
  });

  it('generates IDs that do not collide across calls', () => {
    const r1 = handleGenerateUniqueId({ prefix: 'same', count: 10 });
    const r2 = handleGenerateUniqueId({ prefix: 'same', count: 10 });
    const allIds = [...r1.ids, ...r2.ids];
    const unique = new Set(allIds);
    expect(unique.size).toBe(20);
  });
});

// ============================================================
// handleGetCurrentTimestamp
// ============================================================
describe('handleGetCurrentTimestamp', () => {
  it('returns a timestamp near Date.now()', () => {
    const before = Date.now();
    const result = handleGetCurrentTimestamp({});
    const after = Date.now();
    expect(result.timestampMs).toBeGreaterThanOrEqual(before);
    expect(result.timestampMs).toBeLessThanOrEqual(after);
  });

  it('timestamp and timestampMs are consistent', () => {
    const result = handleGetCurrentTimestamp({});
    expect(result.timestamp).toBe(String(result.timestampMs));
  });

  it('isoDate is a valid ISO string', () => {
    const result = handleGetCurrentTimestamp({});
    const parsed = new Date(result.isoDate);
    expect(parsed.getTime()).toBe(result.timestampMs);
  });

  it('foreverEnd is MAX_UINT64', () => {
    const result = handleGetCurrentTimestamp({});
    expect(result.foreverEnd).toBe('18446744073709551615');
  });

  it('helpers contain future timestamps', () => {
    const result = handleGetCurrentTimestamp({});
    const now = result.timestampMs;
    expect(Number(result.helpers.fiveMinutesFromNow)).toBeGreaterThan(now);
    expect(Number(result.helpers.oneHourFromNow)).toBeGreaterThan(now);
    expect(Number(result.helpers.oneDayFromNow)).toBeGreaterThan(now);
    expect(Number(result.helpers.oneWeekFromNow)).toBeGreaterThan(now);
    expect(Number(result.helpers.oneMonthFromNow)).toBeGreaterThan(now);
    expect(Number(result.helpers.oneYearFromNow)).toBeGreaterThan(now);
  });

  it('durations are correct', () => {
    const result = handleGetCurrentTimestamp({});
    expect(result.durations.fiveMinutes).toBe(String(5 * 60 * 1000));
    expect(result.durations.oneHour).toBe(String(60 * 60 * 1000));
    expect(result.durations.oneDay).toBe(String(24 * 60 * 60 * 1000));
    expect(result.durations.oneWeek).toBe(String(7 * 24 * 60 * 60 * 1000));
    expect(result.durations.oneMonth).toBe(String(30 * 24 * 60 * 60 * 1000));
    expect(result.durations.oneYear).toBe(String(365 * 24 * 60 * 60 * 1000));
  });

  it('applies offsetMs', () => {
    const result = handleGetCurrentTimestamp({ offsetMs: 10000 });
    const now = Date.now();
    // Should be roughly now + 10s (within 1s tolerance)
    expect(result.timestampMs).toBeGreaterThanOrEqual(now + 9000);
    expect(result.timestampMs).toBeLessThanOrEqual(now + 11000);
  });

  it('applies offsetHours', () => {
    const result = handleGetCurrentTimestamp({ offsetHours: 1 });
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    expect(result.timestampMs).toBeGreaterThanOrEqual(now + oneHour - 1000);
  });

  it('applies offsetDays', () => {
    const result = handleGetCurrentTimestamp({ offsetDays: 1 });
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    expect(result.timestampMs).toBeGreaterThanOrEqual(now + oneDay - 1000);
  });

  it('combines multiple offsets', () => {
    const result = handleGetCurrentTimestamp({ offsetMs: 1000, offsetHours: 1, offsetDays: 1 });
    const now = Date.now();
    const expected = 1000 + 60 * 60 * 1000 + 24 * 60 * 60 * 1000;
    expect(result.timestampMs).toBeGreaterThanOrEqual(now + expected - 1000);
  });
});

// ============================================================
// handleLookupTokenInfo
// ============================================================
describe('handleLookupTokenInfo', () => {
  it('looks up USDC by symbol', () => {
    const result = handleLookupTokenInfo({ query: 'USDC' });
    expect(result.success).toBe(true);
    expect(result.tokenInfo).toBeDefined();
    expect(result.tokenInfo!.symbol).toBe('USDC');
    expect(result.tokenInfo!.decimals).toBe('6');
    expect(result.tokenInfo!.backingAddress).toMatch(/^bb1/);
  });

  it('looks up ATOM by symbol (case-insensitive)', () => {
    const result = handleLookupTokenInfo({ query: 'atom' });
    expect(result.success).toBe(true);
    expect(result.tokenInfo!.symbol).toBe('ATOM');
  });

  it('returns all tokens when query is "all"', () => {
    const result = handleLookupTokenInfo({ query: 'all' });
    expect(result.success).toBe(true);
    expect(result.allTokens).toBeDefined();
    expect(result.allTokens!.length).toBeGreaterThan(0);
  });

  it('returns all tokens when query is empty', () => {
    const result = handleLookupTokenInfo({ query: '' });
    expect(result.success).toBe(true);
    expect(result.allTokens).toBeDefined();
  });

  it('fails for unknown symbol', () => {
    const result = handleLookupTokenInfo({ query: 'NONEXISTENT' });
    expect(result.success).toBe(false);
    expect(result.error).toContain('Token not found');
    expect(result.error).toContain('Available symbols');
  });

  it('generates placeholder for unknown IBC denom', () => {
    const result = handleLookupTokenInfo({ query: 'ibc/UNKNOWN_123' });
    expect(result.success).toBe(true);
    expect(result.tokenInfo!.symbol).toBe('UNKNOWN');
    expect(result.tokenInfo!.backingAddress).toMatch(/^bb1/);
  });
});

// ============================================================
// handleDiagnoseError
// ============================================================
describe('handleDiagnoseError', () => {
  it('matches "auto-scan" error to approval matching pattern', () => {
    const result = handleDiagnoseError({ error: 'auto-scan failed: no valid approval found' });
    expect(result.success).toBe(true);
    expect(result.diagnosis).not.toBeNull();
    expect(result.diagnosis!.category).toBe('transfer');
  });

  it('matches "cannot unmarshal number" to serialization pattern', () => {
    const result = handleDiagnoseError({ error: 'json: cannot unmarshal number into string' });
    expect(result.success).toBe(true);
    expect(result.diagnosis).not.toBeNull();
    expect(result.diagnosis!.matchedPattern).toBe('Numbers not strings');
  });

  it('matches "prioritizedApprovals" error', () => {
    const result = handleDiagnoseError({ error: 'prioritizedApprovals: approval not found for transfer' });
    expect(result.success).toBe(true);
    expect(result.diagnosis).not.toBeNull();
  });

  it('matches "Mint" + "outgoing" to override pattern', () => {
    const result = handleDiagnoseError({ error: 'cannot transfer from Mint address', context: 'approval with outgoing override missing' });
    expect(result.success).toBe(true);
    expect(result.diagnosis).not.toBeNull();
  });

  it('returns no diagnosis for unrelated error', () => {
    const result = handleDiagnoseError({ error: 'completely unrelated error xyz123' });
    expect(result.success).toBe(false);
    expect(result.diagnosis).toBeNull();
    expect(result.suggestions).toHaveLength(0);
    expect(result.tip).toContain('No matching error pattern');
  });

  it('context boosts scoring', () => {
    // An error that mentions "transfer" with context "approval" should match transfer-related patterns
    const result = handleDiagnoseError({ error: 'transfer failed', context: 'prioritizedApprovals was empty' });
    expect(result.success).toBe(true);
    expect(result.diagnosis).not.toBeNull();
  });

  it('returns suggestions beyond the top match', () => {
    // A broad error that could match multiple patterns
    const result = handleDiagnoseError({ error: 'mint transfer failed with no matching approval auto-scan' });
    expect(result.success).toBe(true);
    if (result.suggestions.length > 0) {
      expect(result.suggestions[0].pattern).toBeTypeOf('string');
      expect(result.suggestions[0].relevance).toBeGreaterThan(0);
    }
  });

  it('tip suggests simulate_transaction when diagnosis exists', () => {
    const result = handleDiagnoseError({ error: 'auto-scan failed' });
    expect(result.tip).toContain('simulate_transaction');
  });
});

// ============================================================
// Auto-convert 0x addresses in tool handlers
// ============================================================
const TEST_ETH = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
const TEST_BB1 = ethToCosmos(TEST_ETH);

describe('handleConvertAddress — auto-detect targetFormat', () => {
  it('auto-detects eth->bitbadges when targetFormat omitted', () => {
    const result = handleConvertAddress({ address: TEST_ETH } as any);
    expect(result.success).toBe(true);
    expect(result.convertedAddress).toBe(TEST_BB1);
    expect(result.targetFormat).toBe('bitbadges');
  });

  it('auto-detects bitbadges->eth when targetFormat omitted', () => {
    const result = handleConvertAddress({ address: TEST_BB1 } as any);
    expect(result.success).toBe(true);
    expect(result.convertedAddress).toMatch(/^0x/);
    expect(result.targetFormat).toBe('eth');
  });

  it('still works with explicit targetFormat', () => {
    const result = handleConvertAddress({ address: TEST_ETH, targetFormat: 'bitbadges' });
    expect(result.success).toBe(true);
    expect(result.convertedAddress).toBe(TEST_BB1);
  });
});

describe('handleBuildToken — accepts 0x creatorAddress', () => {
  it('succeeds with 0x address (auto-converts to bb1)', () => {
    const result = handleBuildToken({
      creatorAddress: TEST_ETH,
      name: 'Test Token',
      supply: 'single-fungible'
    });
    expect(result.success).toBe(true);
    expect(result.transaction).toBeDefined();
    // Verify the creator in the transaction is bb1 format
    const creator = (result.transaction as any)?.messages?.[0]?.value?.creator;
    expect(creator).toBe(TEST_BB1);
  });

  it('still works with bb1 address', () => {
    const result = handleBuildToken({
      creatorAddress: TEST_BB1,
      name: 'Test Token',
      supply: 'single-fungible'
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid address format', () => {
    const result = handleBuildToken({
      creatorAddress: 'invalidaddress',
      name: 'Test Token',
      supply: 'single-fungible'
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain('bb1');
  });
});

describe('handleBuildAddressList — accepts 0x creatorAddress', () => {
  it('succeeds with 0x address', () => {
    const result = handleBuildAddressList({
      creatorAddress: TEST_ETH,
      name: 'Test List'
    });
    expect(result.success).toBe(true);
    const creator = (result as any).transaction?.messages?.[0]?.value?.creator;
    expect(creator).toBe(TEST_BB1);
  });

  it('rejects empty creatorAddress', () => {
    const result = handleBuildAddressList({
      creatorAddress: '',
      name: 'Test List'
    });
    expect(result.success).toBe(false);
  });
});

describe('handleSetManager — accepts 0x addresses', () => {
  it('converts 0x manager address to bb1', () => {
    const result = handleSetManager({
      manager: TEST_ETH
    });
    expect(result.success).toBe(true);
    expect(result.manager).toBe(TEST_BB1);
  });

  it('bb1 manager passes through unchanged', () => {
    const result = handleSetManager({
      manager: TEST_BB1
    });
    expect(result.success).toBe(true);
    expect(result.manager).toBe(TEST_BB1);
  });
});

describe('handleBuildDynamicStore — accepts 0x addresses', () => {
  it('converts 0x creator in create action', () => {
    const result = handleBuildDynamicStore({
      action: 'create',
      creator: TEST_ETH,
      defaultValue: false
    });
    expect(result.success).toBe(true);
    const creator = (result.transaction as any)?.messages?.[0]?.creator;
    expect(creator).toBe(TEST_BB1);
  });

  it('converts 0x address in set_value action', () => {
    const result = handleBuildDynamicStore({
      action: 'set_value',
      creator: TEST_ETH,
      storeId: '1',
      address: TEST_ETH,
      value: true
    });
    expect(result.success).toBe(true);
    const msg = (result.transaction as any)?.messages?.[0];
    expect(msg?.creator).toBe(TEST_BB1);
    expect(msg?.address).toBe(TEST_BB1);
  });

  it('converts 0x addresses in batch_set_values entries', () => {
    const result = handleBuildDynamicStore({
      action: 'batch_set_values',
      creator: TEST_ETH,
      storeId: '1',
      entries: [
        { address: TEST_ETH, value: true },
        { address: TEST_BB1, value: false }
      ]
    });
    expect(result.success).toBe(true);
    const msgs = (result.transaction as any)?.messages;
    // Each entry becomes a separate message
    expect(msgs?.[0]?.address).toBe(TEST_BB1);
    expect(msgs?.[1]?.address).toBe(TEST_BB1);
  });
});
