/**
 * Coin registry for BitBadges
 * Contains IBC denoms, symbols, decimals, and generates backing addresses
 */

import { generateAliasAddressForIBCBackedDenom } from './addressGenerator.js';

/**
 * Coin details interface
 */
export interface CoinDetails {
  symbol: string;
  label: string;
  decimals: string;
  baseDenom: string;
  image?: string;
  backingAddress?: string;
}

/**
 * Token info with pre-generated backing address
 */
export interface TokenInfo {
  symbol: string;
  ibcDenom: string;
  decimals: string;
  backingAddress: string;
  displayName: string;
}

/**
 * Mainnet coins registry
 */
export const MAINNET_COINS_REGISTRY: Record<string, CoinDetails> = {
  ubadge: {
    label: 'BADGE',
    symbol: 'BADGE',
    decimals: '9',
    baseDenom: 'ubadge',
    image: 'https://github.com/cosmos/chain-registry/blob/master/bitbadges/images/badge_logo.png?raw=true'
  },
  'badges:49:chaosnet': {
    label: 'CHAOS',
    symbol: 'CHAOS',
    decimals: '9',
    baseDenom: 'badges:49:chaosnet',
    image: 'https://bitbadges.io/_next/image?url=https%3A%2F%2Fbitbadges-ipfs.infura-ipfs.io%2Fipfs%2FQmdRQUvQBo6p24RQ7AS7RD6srqyUjoHJ5Cjs4p22zie9bQ&w=1920&q=75'
  },
  'ibc/F082B65C88E4B6D5EF1DB243CDA1D331D002759E938A0F5CD3FFDC5D53B3E349': {
    label: 'USDC',
    symbol: 'USDC',
    decimals: '6',
    baseDenom: 'ibc/F082B65C88E4B6D5EF1DB243CDA1D331D002759E938A0F5CD3FFDC5D53B3E349',
    image: 'https://github.com/cosmos/chain-registry/blob/master/noble/images/USDCoin.png?raw=true'
  },
  'ibc/A4DB47A9D3CF9A068D454513891B526702455D3EF08FB9EB558C561F9DC2B701': {
    label: 'ATOM',
    symbol: 'ATOM',
    decimals: '6',
    baseDenom: 'ibc/A4DB47A9D3CF9A068D454513891B526702455D3EF08FB9EB558C561F9DC2B701',
    image: 'https://github.com/cosmos/chain-registry/blob/master/cosmoshub/images/atom.png?raw=true'
  },
  'ibc/ED07A3391A112B175915CD8FAF43A2DA8E4790EDE12566649D0C2F97716B8518': {
    label: 'OSMO',
    symbol: 'OSMO',
    decimals: '6',
    baseDenom: 'ibc/ED07A3391A112B175915CD8FAF43A2DA8E4790EDE12566649D0C2F97716B8518',
    image: 'https://github.com/cosmos/chain-registry/blob/master/osmosis/images/osmo.png?raw=true'
  }
};

/**
 * Symbol to IBC denom mapping with pre-generated backing addresses
 * Built at runtime for quick lookups
 */
let symbolToTokenInfoCache: Map<string, TokenInfo> | null = null;

/**
 * Build symbol to token info mapping with pre-generated backing addresses
 */
export function buildSymbolToTokenInfoMap(): Map<string, TokenInfo> {
  if (symbolToTokenInfoCache) {
    return symbolToTokenInfoCache;
  }

  const symbolMap = new Map<string, TokenInfo>();

  Object.entries(MAINNET_COINS_REGISTRY).forEach(([baseDenom, coinDetails]) => {
    // Only include IBC denoms for Smart Token backing
    if (baseDenom.startsWith('ibc/')) {
      const symbol = coinDetails.symbol.toUpperCase();
      if (!symbolMap.has(symbol)) {
        try {
          const backingAddress = generateAliasAddressForIBCBackedDenom(baseDenom);
          symbolMap.set(symbol, {
            symbol,
            ibcDenom: baseDenom,
            decimals: coinDetails.decimals,
            backingAddress,
            displayName: coinDetails.label
          });
        } catch (error) {
          console.warn(`Failed to generate backing address for ${baseDenom}:`, error);
        }
      }
    }
  });

  symbolToTokenInfoCache = symbolMap;
  return symbolMap;
}

/**
 * Look up token info by symbol or IBC denom
 */
export function lookupTokenInfo(query: string): TokenInfo | null {
  const tokenMap = buildSymbolToTokenInfoMap();

  // Try symbol lookup first (case-insensitive)
  const upperQuery = query.toUpperCase();
  if (tokenMap.has(upperQuery)) {
    return tokenMap.get(upperQuery)!;
  }

  // Try IBC denom lookup
  const lowerQuery = query.toLowerCase();
  for (const tokenInfo of tokenMap.values()) {
    if (tokenInfo.ibcDenom.toLowerCase() === lowerQuery) {
      return tokenInfo;
    }
  }

  // Try to generate backing address for unknown IBC denom
  if (query.startsWith('ibc/')) {
    try {
      const backingAddress = generateAliasAddressForIBCBackedDenom(query);
      return {
        symbol: 'UNKNOWN',
        ibcDenom: query,
        decimals: '6', // Default to 6 decimals
        backingAddress,
        displayName: 'Unknown IBC Token'
      };
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Get all registered tokens
 */
export function getAllTokens(): TokenInfo[] {
  const tokenMap = buildSymbolToTokenInfoMap();
  return Array.from(tokenMap.values());
}

/**
 * Get coin details by denom (including non-IBC denoms)
 */
export function getCoinDetails(denom: string): CoinDetails | null {
  return MAINNET_COINS_REGISTRY[denom] || null;
}

/**
 * Resolve a symbol or denom to its full IBC denom
 */
export function resolveIbcDenom(input: string): string | null {
  // If already an IBC denom, return as-is
  if (input.startsWith('ibc/')) {
    return input;
  }

  // Try symbol lookup
  const tokenInfo = lookupTokenInfo(input);
  if (tokenInfo) {
    return tokenInfo.ibcDenom;
  }

  return null;
}

/**
 * Get decimals for a denom (IBC or native)
 */
export function getDecimals(denom: string): number {
  const coinDetails = getCoinDetails(denom);
  if (coinDetails) {
    return parseInt(coinDetails.decimals, 10);
  }

  // Check symbol mapping
  const tokenInfo = lookupTokenInfo(denom);
  if (tokenInfo) {
    return parseInt(tokenInfo.decimals, 10);
  }

  // Default to 6 for unknown IBC tokens
  if (denom.startsWith('ibc/')) {
    return 6;
  }

  // Default to 9 for native tokens
  return 9;
}
