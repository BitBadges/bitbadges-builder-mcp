/**
 * Tool: validate_address
 * Check if an address is valid and detect its chain type
 */

import { z } from 'zod';
import { bech32 } from 'bech32';

export const validateAddressSchema = z.object({
  address: z.string().describe('The address to validate')
});

export type ValidateAddressInput = z.infer<typeof validateAddressSchema>;

export interface ValidateAddressResult {
  success: boolean;
  valid: boolean;
  chain?: 'eth' | 'cosmos' | 'unknown';
  normalized?: string;
  details?: {
    prefix?: string;
    length?: number;
    format?: string;
  };
  error?: string;
}

export const validateAddressTool = {
  name: 'validate_address',
  description: 'Check if an address is valid and detect its chain type',
  inputSchema: {
    type: 'object' as const,
    properties: {
      address: {
        type: 'string',
        description: 'The address to validate'
      }
    },
    required: ['address']
  }
};

/**
 * Validate an Ethereum address
 */
function isValidEthAddress(address: string): boolean {
  if (!address.startsWith('0x')) {
    return false;
  }
  if (address.length !== 42) {
    return false;
  }
  // Check if it's valid hex
  const hexPart = address.slice(2);
  return /^[0-9a-fA-F]+$/.test(hexPart);
}

/**
 * Validate a Cosmos/BitBadges address
 */
function isValidCosmosAddress(address: string): { valid: boolean; prefix?: string } {
  try {
    const decoded = bech32.decode(address);
    return {
      valid: true,
      prefix: decoded.prefix
    };
  } catch {
    return { valid: false };
  }
}

/**
 * Normalize an address to lowercase
 */
function normalizeAddress(address: string, chain: 'eth' | 'cosmos'): string {
  if (chain === 'eth') {
    return address.toLowerCase();
  }
  return address.toLowerCase();
}

export function handleValidateAddress(input: ValidateAddressInput): ValidateAddressResult {
  try {
    const { address } = input;

    if (!address || address.trim() === '') {
      return {
        success: true,
        valid: false,
        chain: 'unknown',
        error: 'Address is empty'
      };
    }

    // Check for ETH address
    if (address.startsWith('0x')) {
      const isValid = isValidEthAddress(address);
      return {
        success: true,
        valid: isValid,
        chain: 'eth',
        normalized: isValid ? normalizeAddress(address, 'eth') : undefined,
        details: {
          prefix: '0x',
          length: address.length,
          format: 'ethereum'
        }
      };
    }

    // Check for Cosmos/BitBadges address
    if (address.startsWith('bb1') || address.startsWith('cosmos1')) {
      const cosmosResult = isValidCosmosAddress(address);
      return {
        success: true,
        valid: cosmosResult.valid,
        chain: 'cosmos',
        normalized: cosmosResult.valid ? normalizeAddress(address, 'cosmos') : undefined,
        details: {
          prefix: cosmosResult.prefix,
          length: address.length,
          format: 'bech32'
        }
      };
    }

    // Try to decode as generic bech32
    const cosmosResult = isValidCosmosAddress(address);
    if (cosmosResult.valid) {
      return {
        success: true,
        valid: true,
        chain: 'cosmos',
        normalized: normalizeAddress(address, 'cosmos'),
        details: {
          prefix: cosmosResult.prefix,
          length: address.length,
          format: 'bech32'
        }
      };
    }

    // Unknown format
    return {
      success: true,
      valid: false,
      chain: 'unknown',
      details: {
        length: address.length,
        format: 'unknown'
      },
      error: 'Address format not recognized. Expected 0x... (ETH) or bb1... (BitBadges)'
    };
  } catch (error) {
    return {
      success: false,
      valid: false,
      error: `Failed to validate address: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
