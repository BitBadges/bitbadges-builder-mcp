import { describe, it, expect } from 'vitest';
import {
  ethToCosmos,
  cosmosToEth,
  validateAddress,
  toBitBadgesAddress,
  toEthAddress
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
