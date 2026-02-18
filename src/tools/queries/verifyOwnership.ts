/**
 * Tool: verify_ownership
 * Verify if an address meets ownership requirements (AND/OR/NOT)
 */

import { z } from 'zod';
import { verifyOwnership } from '../../sdk/apiClient.js';

export const verifyOwnershipSchema = z.object({
  address: z.string().describe('The address to verify (bb1... or 0x...)'),
  requirements: z.string().describe('AssetConditionGroup structure as JSON string')
});

export type VerifyOwnershipInput = z.infer<typeof verifyOwnershipSchema>;

export interface VerifyOwnershipResult {
  success: boolean;
  verified?: boolean;
  details?: unknown;
  error?: string;
}

export const verifyOwnershipTool = {
  name: 'verify_ownership',
  description: 'Verify if an address meets ownership requirements (AND/OR/NOT). Requires BITBADGES_API_KEY environment variable.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      address: {
        type: 'string',
        description: 'The address to verify (bb1... or 0x...)'
      },
      requirements: {
        type: 'string',
        description: 'AssetConditionGroup structure as JSON string'
      }
    },
    required: ['address', 'requirements']
  }
};

export async function handleVerifyOwnership(input: VerifyOwnershipInput): Promise<VerifyOwnershipResult> {
  try {
    const { address, requirements } = input;

    // Parse requirements JSON
    let parsedRequirements: unknown;
    try {
      parsedRequirements = JSON.parse(requirements);
    } catch {
      return {
        success: false,
        error: 'Invalid JSON: Could not parse requirements'
      };
    }

    const response = await verifyOwnership({
      address,
      assetOwnershipRequirements: parsedRequirements as {
        $and?: unknown[];
        $or?: unknown[];
        $not?: unknown;
        assets?: Array<{
          collectionId: string;
          tokenIds: Array<{ start: string; end: string }>;
          ownershipTimes: Array<{ start: string; end: string }>;
          amountRange: { start: string; end: string };
        }>;
      }
    });

    if (!response.success) {
      return {
        success: false,
        error: response.error
      };
    }

    return {
      success: true,
      verified: response.data?.verified,
      details: response.data?.details
    };
  } catch (error) {
    return {
      success: false,
      error: 'Failed to verify ownership: ' + (error instanceof Error ? error.message : String(error))
    };
  }
}
