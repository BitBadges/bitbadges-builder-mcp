import { describe, it, expect } from 'vitest';
import {
  generateAlias,
  generateAliasAddressForIBCBackedDenom,
  generateAliasAddressForDenom,
  getAliasDerivationKeysForIBCBackedDenom,
  getAliasDerivationKeysForDenom
} from '../src/sdk/addressGenerator.js';

describe('generateAlias', () => {
  it('produces a valid bb1 address', () => {
    const result = generateAlias('tokenization', [Buffer.from([0x12]), Buffer.from('test', 'utf8')]);
    expect(result).toMatch(/^bb1/);
    expect(result.length).toBeGreaterThan(3);
  });

  it('is deterministic — same input produces same output', () => {
    const keys = [Buffer.from([0x12]), Buffer.from('test', 'utf8')];
    const a = generateAlias('tokenization', keys);
    const b = generateAlias('tokenization', keys);
    expect(a).toBe(b);
  });

  it('different module names produce different addresses', () => {
    const keys = [Buffer.from([0x12]), Buffer.from('test', 'utf8')];
    const a = generateAlias('tokenization', keys);
    const b = generateAlias('staking', keys);
    expect(a).not.toBe(b);
  });

  it('different derivation keys produce different addresses', () => {
    const a = generateAlias('tokenization', [Buffer.from([0x12]), Buffer.from('foo', 'utf8')]);
    const b = generateAlias('tokenization', [Buffer.from([0x12]), Buffer.from('bar', 'utf8')]);
    expect(a).not.toBe(b);
  });

  it('throws for empty derivation keys', () => {
    expect(() => generateAlias('tokenization', [])).toThrow('derivationKeys must not be empty');
  });

  it('works with single derivation key', () => {
    const result = generateAlias('tokenization', [Buffer.from('single-key', 'utf8')]);
    expect(result).toMatch(/^bb1/);
  });

  it('works with many derivation keys', () => {
    const keys = [Buffer.from('a'), Buffer.from('b'), Buffer.from('c'), Buffer.from('d')];
    const result = generateAlias('tokenization', keys);
    expect(result).toMatch(/^bb1/);
  });
});

describe('getAliasDerivationKeysForIBCBackedDenom', () => {
  it('returns an array of two Buffers', () => {
    const keys = getAliasDerivationKeysForIBCBackedDenom('ibc/ABC123');
    expect(keys).toHaveLength(2);
    expect(Buffer.isBuffer(keys[0])).toBe(true);
    expect(Buffer.isBuffer(keys[1])).toBe(true);
  });

  it('first buffer contains the BackedPathGenerationPrefix (0x12)', () => {
    const keys = getAliasDerivationKeysForIBCBackedDenom('ibc/ABC123');
    expect(keys[0][0]).toBe(0x12);
  });

  it('second buffer contains the denom string', () => {
    const keys = getAliasDerivationKeysForIBCBackedDenom('ibc/ABC123');
    expect(keys[1].toString('utf8')).toBe('ibc/ABC123');
  });
});

describe('getAliasDerivationKeysForDenom', () => {
  it('returns an array of two Buffers', () => {
    const keys = getAliasDerivationKeysForDenom('ubadge');
    expect(keys).toHaveLength(2);
  });

  it('first buffer contains the DenomGenerationPrefix (0x0c)', () => {
    const keys = getAliasDerivationKeysForDenom('ubadge');
    expect(keys[0][0]).toBe(0x0c);
  });

  it('second buffer contains the denom string', () => {
    const keys = getAliasDerivationKeysForDenom('ubadge');
    expect(keys[1].toString('utf8')).toBe('ubadge');
  });
});

describe('generateAliasAddressForIBCBackedDenom', () => {
  it('produces a valid bb1 address for a known IBC denom', () => {
    const result = generateAliasAddressForIBCBackedDenom(
      'ibc/F082B65C88E4B6D5EF1DB243CDA1D331D002759E938A0F5CD3FFDC5D53B3E349'
    );
    expect(result).toMatch(/^bb1/);
  });

  it('is deterministic', () => {
    const denom = 'ibc/ABC123';
    const a = generateAliasAddressForIBCBackedDenom(denom);
    const b = generateAliasAddressForIBCBackedDenom(denom);
    expect(a).toBe(b);
  });

  it('different denoms produce different addresses', () => {
    const a = generateAliasAddressForIBCBackedDenom('ibc/AAA');
    const b = generateAliasAddressForIBCBackedDenom('ibc/BBB');
    expect(a).not.toBe(b);
  });
});

describe('generateAliasAddressForDenom', () => {
  it('produces a valid bb1 address', () => {
    const result = generateAliasAddressForDenom('ubadge');
    expect(result).toMatch(/^bb1/);
  });

  it('is deterministic', () => {
    const a = generateAliasAddressForDenom('ubadge');
    const b = generateAliasAddressForDenom('ubadge');
    expect(a).toBe(b);
  });

  it('IBC-backed and denom addresses differ for the same string', () => {
    // Different prefixes (0x12 vs 0x0c) should yield different addresses
    const ibcAddr = generateAliasAddressForIBCBackedDenom('ubadge');
    const denomAddr = generateAliasAddressForDenom('ubadge');
    expect(ibcAddr).not.toBe(denomAddr);
  });
});
