/**
 * Token Registry Resource
 * Provides IBC denoms, symbols, decimals, and backing addresses
 */

import { getAllTokens, MAINNET_COINS_REGISTRY, type TokenInfo } from '../sdk/coinRegistry.js';

export interface TokenRegistryResource {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

export const tokenRegistryResourceInfo: TokenRegistryResource = {
  uri: 'bitbadges://tokens/registry',
  name: 'Token Registry',
  description: 'IBC denoms, symbols, decimals, and pre-generated backing addresses for BitBadges',
  mimeType: 'application/json'
};

export interface TokenRegistryContent {
  tokens: TokenInfo[];
  nativeCoins: Array<{
    denom: string;
    symbol: string;
    decimals: string;
    label: string;
  }>;
  notes: string[];
}

export function getTokenRegistryContent(): TokenRegistryContent {
  const tokens = getAllTokens();

  const nativeCoins = Object.entries(MAINNET_COINS_REGISTRY)
    .filter(([denom]) => !denom.startsWith('ibc/'))
    .map(([denom, details]) => ({
      denom,
      symbol: details.symbol,
      decimals: details.decimals,
      label: details.label
    }));

  return {
    tokens,
    nativeCoins,
    notes: [
      'All backing addresses are deterministic and pre-generated',
      'Use lookup_token_info tool to query by symbol or IBC denom',
      'Use generate_backing_address tool to compute backing address for custom IBC denoms',
      'Token decimals: ubadge=9, USDC=6, ATOM=6, OSMO=6',
      'When creating Smart Tokens, use the backingAddress from this registry'
    ]
  };
}

export function formatTokenRegistryForDisplay(): string {
  const content = getTokenRegistryContent();

  let output = '# BitBadges Token Registry\n\n';

  output += '## IBC Tokens (for Smart Token Backing)\n\n';
  output += '| Symbol | IBC Denom | Decimals | Backing Address |\n';
  output += '|--------|-----------|----------|------------------|\n';
  for (const token of content.tokens) {
    output += `| ${token.symbol} | ${token.ibcDenom.slice(0, 20)}... | ${token.decimals} | ${token.backingAddress.slice(0, 15)}... |\n`;
  }

  output += '\n## Native Coins\n\n';
  output += '| Denom | Symbol | Decimals |\n';
  output += '|-------|--------|----------|\n';
  for (const coin of content.nativeCoins) {
    output += `| ${coin.denom} | ${coin.symbol} | ${coin.decimals} |\n`;
  }

  output += '\n## Notes\n\n';
  for (const note of content.notes) {
    output += `- ${note}\n`;
  }

  return output;
}
