import { describe, it, expect, beforeEach } from 'vitest';
import {
  MAINNET_COINS_REGISTRY,
  buildSymbolToTokenInfoMap,
  lookupTokenInfo,
  getAllTokens,
  getCoinDetails,
  resolveIbcDenom,
  getDecimals
} from '../src/sdk/coinRegistry.js';

describe('MAINNET_COINS_REGISTRY', () => {
  it('contains ubadge entry', () => {
    expect(MAINNET_COINS_REGISTRY['ubadge']).toBeDefined();
    expect(MAINNET_COINS_REGISTRY['ubadge'].symbol).toBe('BADGE');
  });

  it('contains USDC IBC entry', () => {
    const usdcDenom = 'ibc/F082B65C88E4B6D5EF1DB243CDA1D331D002759E938A0F5CD3FFDC5D53B3E349';
    expect(MAINNET_COINS_REGISTRY[usdcDenom]).toBeDefined();
    expect(MAINNET_COINS_REGISTRY[usdcDenom].symbol).toBe('USDC');
    expect(MAINNET_COINS_REGISTRY[usdcDenom].decimals).toBe('6');
  });

  it('contains at least 5 entries', () => {
    expect(Object.keys(MAINNET_COINS_REGISTRY).length).toBeGreaterThanOrEqual(5);
  });
});

describe('buildSymbolToTokenInfoMap', () => {
  it('returns a Map', () => {
    const map = buildSymbolToTokenInfoMap();
    expect(map).toBeInstanceOf(Map);
  });

  it('only includes IBC denoms (not ubadge or badge denoms)', () => {
    const map = buildSymbolToTokenInfoMap();
    for (const [, info] of map) {
      expect(info.ibcDenom).toMatch(/^ibc\//);
    }
  });

  it('generates backing addresses for all IBC tokens', () => {
    const map = buildSymbolToTokenInfoMap();
    for (const [, info] of map) {
      expect(info.backingAddress).toMatch(/^bb1/);
    }
  });

  it('caches result on second call', () => {
    const map1 = buildSymbolToTokenInfoMap();
    const map2 = buildSymbolToTokenInfoMap();
    expect(map1).toBe(map2); // Same reference = cached
  });
});

describe('lookupTokenInfo', () => {
  it('finds USDC by symbol (case-insensitive)', () => {
    const result = lookupTokenInfo('usdc');
    expect(result).not.toBeNull();
    expect(result!.symbol).toBe('USDC');
  });

  it('finds USDC by uppercase symbol', () => {
    const result = lookupTokenInfo('USDC');
    expect(result).not.toBeNull();
    expect(result!.symbol).toBe('USDC');
  });

  it('finds ATOM by symbol', () => {
    const result = lookupTokenInfo('ATOM');
    expect(result).not.toBeNull();
    expect(result!.symbol).toBe('ATOM');
  });

  it('finds OSMO by symbol', () => {
    const result = lookupTokenInfo('OSMO');
    expect(result).not.toBeNull();
    expect(result!.symbol).toBe('OSMO');
  });

  it('finds token by IBC denom', () => {
    const denom = 'ibc/F082B65C88E4B6D5EF1DB243CDA1D331D002759E938A0F5CD3FFDC5D53B3E349';
    const result = lookupTokenInfo(denom);
    expect(result).not.toBeNull();
    expect(result!.symbol).toBe('USDC');
  });

  it('finds token by IBC denom case-insensitively', () => {
    const denom = 'ibc/f082b65c88e4b6d5ef1db243cda1d331d002759e938a0f5cd3ffdc5d53b3e349';
    const result = lookupTokenInfo(denom);
    expect(result).not.toBeNull();
    expect(result!.symbol).toBe('USDC');
  });

  it('returns null for unknown symbol', () => {
    const result = lookupTokenInfo('FAKECOIN');
    expect(result).toBeNull();
  });

  it('generates a placeholder for unknown IBC denom', () => {
    const result = lookupTokenInfo('ibc/UNKNOWN_DENOM_123');
    expect(result).not.toBeNull();
    expect(result!.symbol).toBe('UNKNOWN');
    expect(result!.decimals).toBe('6');
    expect(result!.backingAddress).toMatch(/^bb1/);
  });

  it('returns null for non-IBC unknown string', () => {
    const result = lookupTokenInfo('random-string');
    expect(result).toBeNull();
  });
});

describe('getAllTokens', () => {
  it('returns a non-empty array', () => {
    const tokens = getAllTokens();
    expect(tokens.length).toBeGreaterThan(0);
  });

  it('each token has required fields', () => {
    const tokens = getAllTokens();
    for (const t of tokens) {
      expect(t.symbol).toBeTypeOf('string');
      expect(t.ibcDenom).toMatch(/^ibc\//);
      expect(t.decimals).toBeTypeOf('string');
      expect(t.backingAddress).toMatch(/^bb1/);
      expect(t.displayName).toBeTypeOf('string');
    }
  });
});

describe('getCoinDetails', () => {
  it('returns details for ubadge', () => {
    const result = getCoinDetails('ubadge');
    expect(result).not.toBeNull();
    expect(result!.symbol).toBe('BADGE');
    expect(result!.decimals).toBe('9');
  });

  it('returns details for IBC denom', () => {
    const result = getCoinDetails('ibc/F082B65C88E4B6D5EF1DB243CDA1D331D002759E938A0F5CD3FFDC5D53B3E349');
    expect(result).not.toBeNull();
    expect(result!.symbol).toBe('USDC');
  });

  it('returns null for unknown denom', () => {
    const result = getCoinDetails('unknown-denom');
    expect(result).toBeNull();
  });
});

describe('resolveIbcDenom', () => {
  it('returns IBC denom as-is', () => {
    const denom = 'ibc/F082B65C88E4B6D5EF1DB243CDA1D331D002759E938A0F5CD3FFDC5D53B3E349';
    expect(resolveIbcDenom(denom)).toBe(denom);
  });

  it('resolves USDC symbol to IBC denom', () => {
    const result = resolveIbcDenom('USDC');
    expect(result).toMatch(/^ibc\//);
  });

  it('resolves ATOM symbol to IBC denom', () => {
    const result = resolveIbcDenom('ATOM');
    expect(result).toMatch(/^ibc\//);
  });

  it('returns null for unknown symbol', () => {
    const result = resolveIbcDenom('FAKECOIN');
    expect(result).toBeNull();
  });

  it('returns unknown IBC denom as-is', () => {
    const result = resolveIbcDenom('ibc/UNKNOWN123');
    expect(result).toBe('ibc/UNKNOWN123');
  });
});

describe('getDecimals', () => {
  it('returns 9 for ubadge', () => {
    expect(getDecimals('ubadge')).toBe(9);
  });

  it('returns 6 for USDC IBC denom', () => {
    expect(getDecimals('ibc/F082B65C88E4B6D5EF1DB243CDA1D331D002759E938A0F5CD3FFDC5D53B3E349')).toBe(6);
  });

  it('returns 6 for USDC symbol lookup', () => {
    expect(getDecimals('USDC')).toBe(6);
  });

  it('returns 6 for unknown IBC denom (default)', () => {
    expect(getDecimals('ibc/UNKNOWN')).toBe(6);
  });

  it('returns 9 for unknown native token (default)', () => {
    expect(getDecimals('unknowntoken')).toBe(9);
  });
});
