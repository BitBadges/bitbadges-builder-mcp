/**
 * Tool: convert_address
 * Convert between ETH (0x) and BitBadges (bb1) address formats
 */

import { z } from 'zod';
import { bech32 } from 'bech32';

export const convertAddressSchema = z.object({
  address: z.string().describe('The address to convert (0x... or bb1...)'),
  targetFormat: z.enum(['eth', 'bitbadges']).describe('Target format: "eth" for 0x or "bitbadges" for bb1')
});

export type ConvertAddressInput = z.infer<typeof convertAddressSchema>;

export interface ConvertAddressResult {
  success: boolean;
  originalAddress?: string;
  convertedAddress?: string;
  originalFormat?: string;
  targetFormat?: string;
  error?: string;
}

export const convertAddressTool = {
  name: 'convert_address',
  description: 'Convert between ETH (0x) and BitBadges (bb1) address formats',
  inputSchema: {
    type: 'object' as const,
    properties: {
      address: {
        type: 'string',
        description: 'The address to convert (0x... or bb1...)'
      },
      targetFormat: {
        type: 'string',
        enum: ['eth', 'bitbadges'],
        description: 'Target format: "eth" for 0x or "bitbadges" for bb1'
      }
    },
    required: ['address', 'targetFormat']
  }
};

/**
 * Convert Ethereum address to Cosmos (bb1) address
 */
function ethToCosmos(ethAddress: string): string {
  // Remove 0x prefix if present
  const cleanAddress = ethAddress.toLowerCase().replace('0x', '');

  // Convert hex string to bytes
  const addressBytes = Buffer.from(cleanAddress, 'hex');

  // Encode to bech32 with bb prefix
  const words = bech32.toWords(addressBytes);
  return bech32.encode('bb', words);
}

/**
 * Convert Cosmos (bb1) address to Ethereum address
 */
function cosmosToEth(cosmosAddress: string): string {
  // Decode bech32
  const decoded = bech32.decode(cosmosAddress);

  // Convert words back to bytes
  const addressBytes = Buffer.from(bech32.fromWords(decoded.words));

  // Convert to hex with 0x prefix
  return '0x' + addressBytes.toString('hex');
}

/**
 * Detect address format
 */
function detectFormat(address: string): 'eth' | 'cosmos' | 'unknown' {
  if (address.startsWith('0x') && address.length === 42) {
    return 'eth';
  }
  if (address.startsWith('bb1')) {
    return 'cosmos';
  }
  return 'unknown';
}

export function handleConvertAddress(input: ConvertAddressInput): ConvertAddressResult {
  try {
    const { address, targetFormat } = input;
    const sourceFormat = detectFormat(address);

    if (sourceFormat === 'unknown') {
      return {
        success: false,
        error: `Unknown address format: "${address}". Expected 0x... (ETH) or bb1... (BitBadges)`
      };
    }

    // Check if already in target format
    if ((sourceFormat === 'eth' && targetFormat === 'eth') ||
        (sourceFormat === 'cosmos' && targetFormat === 'bitbadges')) {
      return {
        success: true,
        originalAddress: address,
        convertedAddress: address,
        originalFormat: sourceFormat === 'eth' ? 'eth' : 'bitbadges',
        targetFormat: targetFormat
      };
    }

    // Convert
    let convertedAddress: string;
    if (sourceFormat === 'eth' && targetFormat === 'bitbadges') {
      convertedAddress = ethToCosmos(address);
    } else if (sourceFormat === 'cosmos' && targetFormat === 'eth') {
      convertedAddress = cosmosToEth(address);
    } else {
      return {
        success: false,
        error: `Cannot convert from ${sourceFormat} to ${targetFormat}`
      };
    }

    return {
      success: true,
      originalAddress: address,
      convertedAddress,
      originalFormat: sourceFormat === 'eth' ? 'eth' : 'bitbadges',
      targetFormat
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to convert address: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
