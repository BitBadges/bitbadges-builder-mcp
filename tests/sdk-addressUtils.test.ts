import { describe, it, expect } from 'vitest';
import {
  ethToCosmos,
  cosmosToEth,
  validateAddress,
  toBitBadgesAddress,
  toEthAddress,
  ensureBb1,
  ensureBb1ListId
} from '../src/sdk/addressUtils.js';
import { generateAlias } from '../src/sdk/addressGenerator.js';

describe('ethToCosmos', () => {
  it('converts a valid ETH address to bb1 format', () => {
    const eth = '0x0000000000000000000000000000000000000001';
    const result = ethToCosmos(eth);
    expect(result).toMatch(/^bb1/);
    expect(result.length).toBeGreaterThan(3);
  });

  it('converts a realistic ETH address', () => {
    const eth = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
    const result = ethToCosmos(eth);
    expect(result).toMatch(/^bb1/);
  });

  it('round-trips: ethToCosmos -> cosmosToEth returns original (lowercased)', () => {
    const eth = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
    const bb = ethToCosmos(eth);
    const back = cosmosToEth(bb);
    expect(back).toBe(eth.toLowerCase());
  });

  it('throws for address without 0x prefix', () => {
    expect(() => ethToCosmos('d8dA6BF26964aF9D7eEd9e03E53415D37aA96045')).toThrow('must start with 0x');
  });

  it('throws for address with wrong length', () => {
    expect(() => ethToCosmos('0x1234')).toThrow('must be 40 hex characters');
  });

  it('throws for non-hex characters after 0x', () => {
    expect(() => ethToCosmos('0xGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG')).toThrow('must be 40 hex characters');
  });

  it('handles all-zero address', () => {
    const eth = '0x0000000000000000000000000000000000000000';
    const result = ethToCosmos(eth);
    expect(result).toMatch(/^bb1/);
  });

  it('handles all-f address', () => {
    const eth = '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF';
    const result = ethToCosmos(eth);
    expect(result).toMatch(/^bb1/);
  });
});

describe('cosmosToEth', () => {
  it('converts a valid bb1 address to 0x format', () => {
    const eth = '0x0000000000000000000000000000000000000001';
    const bb = ethToCosmos(eth);
    const result = cosmosToEth(bb);
    expect(result).toMatch(/^0x/);
    expect(result.length).toBe(42);
  });

  it('throws for address without bb1 prefix', () => {
    expect(() => cosmosToEth('cosmos1abcdef')).toThrow('must start with bb1');
  });

  it('throws for invalid bech32 encoding', () => {
    expect(() => cosmosToEth('bb1invalidaddress!!!')).toThrow();
  });

  it('produces lowercase hex output', () => {
    const eth = '0xABCDEF1234567890ABCDEF1234567890ABCDEF12';
    const bb = ethToCosmos(eth);
    const result = cosmosToEth(bb);
    expect(result).toBe(result.toLowerCase());
  });
});

describe('validateAddress', () => {
  it('validates a correct ETH address', () => {
    const result = validateAddress('0x0000000000000000000000000000000000000001');
    expect(result.valid).toBe(true);
    expect(result.chain).toBe('eth');
    expect(result.isModuleDerived).toBe(false);
    expect(result.normalized).toBe('0x0000000000000000000000000000000000000001');
  });

  it('normalizes ETH address to lowercase', () => {
    const result = validateAddress('0xABCDEF1234567890ABCDEF1234567890ABCDEF12');
    expect(result.valid).toBe(true);
    expect(result.normalized).toBe('0xabcdef1234567890abcdef1234567890abcdef12');
  });

  it('rejects ETH address with wrong length', () => {
    const result = validateAddress('0x1234');
    expect(result.valid).toBe(false);
    expect(result.chain).toBe('unknown');
    expect(result.error).toBeDefined();
  });

  it('rejects ETH address with non-hex characters', () => {
    const result = validateAddress('0xGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG');
    expect(result.valid).toBe(false);
  });

  it('validates a correct bb1 address (20-byte / standard)', () => {
    const eth = '0x0000000000000000000000000000000000000001';
    const bb = ethToCosmos(eth);
    const result = validateAddress(bb);
    expect(result.valid).toBe(true);
    expect(result.chain).toBe('cosmos');
    expect(result.isModuleDerived).toBe(false);
  });

  it('detects module-derived (32-byte) bb1 address', () => {
    // Module-derived addresses are 32 bytes. generateAlias produces them.
    const moduleDerived = generateAlias('tokenization', [Buffer.from([0x12]), Buffer.from('test', 'utf8')]);
    const result = validateAddress(moduleDerived);
    expect(result.valid).toBe(true);
    expect(result.chain).toBe('cosmos');
    expect(result.isModuleDerived).toBe(true);
  });

  it('rejects invalid bb1 address', () => {
    const result = validateAddress('bb1invalid!!!');
    expect(result.valid).toBe(false);
    expect(result.chain).toBe('unknown');
  });

  it('returns unknown for random string', () => {
    const result = validateAddress('hello world');
    expect(result.valid).toBe(false);
    expect(result.chain).toBe('unknown');
    expect(result.error).toBeDefined();
  });

  it('returns unknown for empty string', () => {
    const result = validateAddress('');
    expect(result.valid).toBe(false);
    expect(result.chain).toBe('unknown');
  });
});

describe('toBitBadgesAddress', () => {
  it('converts ETH address to bb1', () => {
    const eth = '0x0000000000000000000000000000000000000001';
    const result = toBitBadgesAddress(eth);
    expect(result).toMatch(/^bb1/);
  });

  it('returns bb1 address as-is', () => {
    const eth = '0x0000000000000000000000000000000000000001';
    const bb = ethToCosmos(eth);
    const result = toBitBadgesAddress(bb);
    expect(result).toBe(bb);
  });

  it('throws for unknown format', () => {
    expect(() => toBitBadgesAddress('hello')).toThrow('Unknown address format');
  });
});

describe('toEthAddress', () => {
  it('converts bb1 address to 0x', () => {
    const eth = '0x0000000000000000000000000000000000000001';
    const bb = ethToCosmos(eth);
    const result = toEthAddress(bb);
    expect(result).toMatch(/^0x/);
    expect(result.length).toBe(42);
  });

  it('returns 0x address as-is', () => {
    const eth = '0x0000000000000000000000000000000000000001';
    const result = toEthAddress(eth);
    expect(result).toBe(eth);
  });

  it('throws for unknown format', () => {
    expect(() => toEthAddress('hello')).toThrow('Unknown address format');
  });

  it('throws for module-derived address (32-byte)', () => {
    const moduleDerived = generateAlias('tokenization', [Buffer.from([0x12]), Buffer.from('test', 'utf8')]);
    expect(() => toEthAddress(moduleDerived)).toThrow('not a standard 20-byte address');
  });
});

describe('ensureBb1', () => {
  const ETH_ADDR = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
  const BB1_ADDR = ethToCosmos(ETH_ADDR);

  it('converts a 0x address to bb1', () => {
    const result = ensureBb1(ETH_ADDR);
    expect(result).toMatch(/^bb1/);
    expect(result).toBe(BB1_ADDR);
  });

  it('returns bb1 address unchanged', () => {
    expect(ensureBb1(BB1_ADDR)).toBe(BB1_ADDR);
  });

  it('passes through "Mint"', () => {
    expect(ensureBb1('Mint')).toBe('Mint');
  });

  it('passes through "All"', () => {
    expect(ensureBb1('All')).toBe('All');
  });

  it('passes through "None"', () => {
    expect(ensureBb1('None')).toBe('None');
  });

  it('passes through "Total"', () => {
    expect(ensureBb1('Total')).toBe('Total');
  });

  it('passes through "AllWithMint"', () => {
    expect(ensureBb1('AllWithMint')).toBe('AllWithMint');
  });

  it('passes through "AllWithout" prefixed values', () => {
    expect(ensureBb1('AllWithoutMint')).toBe('AllWithoutMint');
    expect(ensureBb1(`AllWithout${BB1_ADDR}`)).toBe(`AllWithout${BB1_ADDR}`);
  });

  it('passes through "!" prefixed values', () => {
    expect(ensureBb1('!Mint')).toBe('!Mint');
    expect(ensureBb1(`!${BB1_ADDR}`)).toBe(`!${BB1_ADDR}`);
  });

  it('passes through empty string', () => {
    expect(ensureBb1('')).toBe('');
  });

  it('passes through falsy values', () => {
    expect(ensureBb1(undefined as any)).toBe(undefined);
    expect(ensureBb1(null as any)).toBe(null);
  });

  it('passes through unknown format (lets downstream validation catch it)', () => {
    expect(ensureBb1('cosmos1abc')).toBe('cosmos1abc');
    expect(ensureBb1('randomstring')).toBe('randomstring');
  });

  it('does NOT convert short 0x strings (not valid addresses)', () => {
    expect(ensureBb1('0x1234')).toBe('0x1234');
  });

  it('does NOT convert 0x strings that are too long', () => {
    const tooLong = '0x' + 'a'.repeat(42);
    expect(ensureBb1(tooLong)).toBe(tooLong);
  });

  it('round-trips correctly: ensureBb1(0x) -> cosmosToEth -> original', () => {
    const bb = ensureBb1(ETH_ADDR);
    const back = cosmosToEth(bb);
    expect(back).toBe(ETH_ADDR.toLowerCase());
  });
});

describe('ensureBb1ListId', () => {
  const ETH_ADDR = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
  const BB1_ADDR = ethToCosmos(ETH_ADDR);

  it('converts a bare 0x address', () => {
    expect(ensureBb1ListId(ETH_ADDR)).toBe(BB1_ADDR);
  });

  it('returns bb1 address unchanged', () => {
    expect(ensureBb1ListId(BB1_ADDR)).toBe(BB1_ADDR);
  });

  it('converts 0x inside negated list ID', () => {
    const result = ensureBb1ListId(`!${ETH_ADDR}`);
    expect(result).toBe(`!${BB1_ADDR}`);
  });

  it('converts 0x in compound colon-separated list ID', () => {
    const result = ensureBb1ListId(`Mint:${ETH_ADDR}`);
    expect(result).toBe(`Mint:${BB1_ADDR}`);
  });

  it('converts 0x in negated compound list ID', () => {
    const result = ensureBb1ListId(`!Mint:${ETH_ADDR}`);
    expect(result).toBe(`!Mint:${BB1_ADDR}`);
  });

  it('converts multiple 0x addresses in compound list', () => {
    const eth2 = '0x0000000000000000000000000000000000000001';
    const bb2 = ethToCosmos(eth2);
    const result = ensureBb1ListId(`${ETH_ADDR}:${eth2}`);
    expect(result).toBe(`${BB1_ADDR}:${bb2}`);
  });

  it('handles mixed bb1 and 0x in compound list', () => {
    const result = ensureBb1ListId(`${BB1_ADDR}:${ETH_ADDR}`);
    expect(result).toBe(`${BB1_ADDR}:${BB1_ADDR}`);
  });

  it('passes through reserved list IDs unchanged', () => {
    expect(ensureBb1ListId('All')).toBe('All');
    expect(ensureBb1ListId('Mint')).toBe('Mint');
    expect(ensureBb1ListId('!Mint')).toBe('!Mint');
    expect(ensureBb1ListId('None')).toBe('None');
  });

  it('handles parenthesized list IDs', () => {
    const result = ensureBb1ListId(`(${ETH_ADDR})`);
    expect(result).toBe(`(${BB1_ADDR})`);
  });

  it('handles negated parenthesized list IDs', () => {
    const result = ensureBb1ListId(`!(${ETH_ADDR}:Mint)`);
    expect(result).toBe(`!(${BB1_ADDR}:Mint)`);
  });

  it('passes through empty/falsy values', () => {
    expect(ensureBb1ListId('')).toBe('');
    expect(ensureBb1ListId(undefined as any)).toBe(undefined);
  });

  it('does not convert short 0x parts in compound list', () => {
    const result = ensureBb1ListId('Mint:0x1234');
    expect(result).toBe('Mint:0x1234');
  });
});
