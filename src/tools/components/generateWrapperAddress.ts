/**
 * generate_wrapper_address — Generate the deterministic wrapper address for a custom denom.
 * Used for Cosmos coin wrapper paths (NOT IBC backed paths — use generate_backing_address for those).
 */

import { z } from 'zod';
import { generateAliasAddressForDenom } from '../../sdk/addressGenerator.js';

export const generateWrapperAddressSchema = z.object({
  denom: z.string().describe('The custom denom used in the wrapper path (e.g., "utoken"). NOT an IBC denom.')
});

export type GenerateWrapperAddressInput = z.infer<typeof generateWrapperAddressSchema>;

export const generateWrapperAddressTool = {
  name: 'generate_wrapper_address',
  description: 'Generate the deterministic wrapper address for a Cosmos coin wrapper path denom. Use this when building wrap/unwrap approvals. The wrapper address has no private key — it is protocol-controlled.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      denom: { type: 'string', description: 'Custom denom from the wrapper path (e.g., "utoken").' }
    },
    required: ['denom']
  }
};

export function handleGenerateWrapperAddress(input: GenerateWrapperAddressInput): { success: boolean; address?: string; denom?: string; error?: string } {
  try {
    const address = generateAliasAddressForDenom(input.denom);
    return {
      success: true,
      address,
      denom: input.denom
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to generate wrapper address: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
