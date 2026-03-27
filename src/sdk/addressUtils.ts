/**
 * Address conversion utilities for BitBadges
 * Converts between ETH (0x) and BitBadges (bb1) address formats
 */

import { bech32 } from 'bech32';
import crypto from 'crypto';

const BITBADGES_PREFIX = 'bb';

/**
 * Check if a string is a valid hex string
 */
function isHex(str: string): boolean {
  return /^[0-9a-fA-F]+$/.test(str);
}

/**
 * Convert Ethereum address (0x) to BitBadges address (bb1)
 */
export function ethToCosmos(ethAddress: string): string {
  if (!ethAddress.startsWith('0x')) {
    throw new Error('Invalid ETH address: must start with 0x');
  }

  const hex = ethAddress.slice(2);
  if (hex.length !== 40 || !isHex(hex)) {
    throw new Error('Invalid ETH address: must be 40 hex characters after 0x');
  }

  const bytes = Buffer.from(hex, 'hex');
  const words = bech32.toWords(bytes);
  return bech32.encode(BITBADGES_PREFIX, words);
}

/**
 * Convert BitBadges address (bb1) to Ethereum address (0x)
 */
export function cosmosToEth(cosmosAddress: string): string {
  if (!cosmosAddress.startsWith(BITBADGES_PREFIX + '1')) {
    throw new Error(`Invalid BitBadges address: must start with ${BITBADGES_PREFIX}1`);
  }

  try {
    const decoded = bech32.decode(cosmosAddress);
    const bytes = Buffer.from(bech32.fromWords(decoded.words));

    // Check for 20-byte addresses (standard ETH format)
    if (bytes.length !== 20) {
      throw new Error('Address is not a standard 20-byte address (may be a module-derived address)');
    }

    return '0x' + bytes.toString('hex');
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to decode BitBadges address');
  }
}

/**
 * Validate an address and return its type
 */
export interface AddressValidationResult {
  valid: boolean;
  chain: 'eth' | 'cosmos' | 'unknown';
  normalized: string;
  isModuleDerived: boolean;
  error?: string;
}

export function validateAddress(address: string): AddressValidationResult {
  // Check ETH format
  if (address.startsWith('0x')) {
    const hex = address.slice(2);
    if (hex.length === 40 && isHex(hex)) {
      return {
        valid: true,
        chain: 'eth',
        normalized: address.toLowerCase(),
        isModuleDerived: false
      };
    }
    return {
      valid: false,
      chain: 'unknown',
      normalized: address,
      isModuleDerived: false,
      error: 'Invalid ETH address: must be 40 hex characters after 0x'
    };
  }

  // Check BitBadges (Cosmos) format
  if (address.startsWith(BITBADGES_PREFIX + '1')) {
    try {
      const decoded = bech32.decode(address);
      const bytes = Buffer.from(bech32.fromWords(decoded.words));

      // 20-byte = standard address, 32-byte = module-derived
      const isModuleDerived = bytes.length === 32;

      return {
        valid: true,
        chain: 'cosmos',
        normalized: address.toLowerCase(),
        isModuleDerived
      };
    } catch {
      return {
        valid: false,
        chain: 'unknown',
        normalized: address,
        isModuleDerived: false,
        error: 'Invalid BitBadges address: failed to decode bech32'
      };
    }
  }

  return {
    valid: false,
    chain: 'unknown',
    normalized: address,
    isModuleDerived: false,
    error: 'Unknown address format: must start with 0x (ETH) or bb1 (BitBadges)'
  };
}

/**
 * Convert any address to BitBadges format
 * If already bb1, returns as-is
 * If 0x, converts to bb1
 */
export function toBitBadgesAddress(address: string): string {
  if (address.startsWith(BITBADGES_PREFIX + '1')) {
    return address;
  }
  if (address.startsWith('0x')) {
    return ethToCosmos(address);
  }
  throw new Error('Unknown address format');
}

/**
 * Ensure address is in bb1... format, passing through special values.
 * - If already bb1..., returns as-is
 * - If 0x..., converts to bb1...
 * - Special values (Mint, All, None, Total, !, AllWithout*) pass through unchanged
 * - Empty/falsy values pass through unchanged
 */
export function ensureBb1(address: string): string {
  if (!address) return address;

  // Pass through special/reserved list values
  if (['Mint', 'All', 'None', 'Total', 'AllWithMint'].includes(address) ||
      address.startsWith('!') ||
      address.startsWith('AllWithout') ||
      address.startsWith(BITBADGES_PREFIX + '1')) {
    return address;
  }

  // Convert 0x to bb1
  if (address.startsWith('0x') && address.length === 42) {
    return ethToCosmos(address);
  }

  // Unknown format — return as-is, let downstream validation catch it
  return address;
}

/**
 * Convert 0x addresses within a compound list ID string.
 * Handles formats like "0x742d...", "!Mint:0x742d...", "AllWithout:0x742d...:bb1abc..."
 * Splits on ":", converts each part that looks like an address, reassembles.
 */
export function ensureBb1ListId(listId: string): string {
  if (!listId) return listId;

  // Handle ! prefix
  let prefix = '';
  let rest = listId;
  if (rest.startsWith('!')) {
    prefix = '!';
    rest = rest.substring(1);
  }

  // Handle parentheses
  let parenPrefix = '';
  let parenSuffix = '';
  if (rest.startsWith('(') && rest.endsWith(')')) {
    parenPrefix = '(';
    parenSuffix = ')';
    rest = rest.substring(1, rest.length - 1);
  }

  // Split on : and convert each part
  const parts = rest.split(':').map(part => {
    if (part.startsWith('0x') && part.length === 42) {
      return ensureBb1(part);
    }
    return part;
  });

  return prefix + parenPrefix + parts.join(':') + parenSuffix;
}

/**
 * Convert any standard address to ETH format
 * If already 0x, returns as-is
 * If bb1 (20-byte), converts to 0x
 * Module-derived addresses cannot be converted to ETH format
 */
export function toEthAddress(address: string): string {
  if (address.startsWith('0x')) {
    return address;
  }
  if (address.startsWith(BITBADGES_PREFIX + '1')) {
    return cosmosToEth(address);
  }
  throw new Error('Unknown address format');
}
