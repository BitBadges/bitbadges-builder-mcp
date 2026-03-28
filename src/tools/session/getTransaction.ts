import { z } from 'zod';
import { getTransaction as getTransactionFromSession, getOrCreateSession, ensureStringNumbers } from '../../session/sessionState.js';

export const getTransactionSchema = z.object({
  sessionId: z.string().optional().describe("Session ID for per-request isolation."),
  creatorAddress: z.string().optional().describe('Creator bb1... address.')
});

export type GetTransactionInput = z.infer<typeof getTransactionSchema>;

export const getTransactionTool = {
  name: 'get_transaction',
  description: 'Get the assembled transaction JSON with metadataPlaceholders. Call this after building to retrieve the final output. Numbers are auto-converted to strings.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      sessionId: { type: 'string', description: 'Session ID.' },
      creatorAddress: { type: 'string', description: 'Creator address (bb1... or 0x...).' }
    }
  }
};

const DEFAULT_IMAGE = 'ipfs://QmNTpizCkY5tcMpPMf1kkn7Y5YxFQo3oT54A9oKP5ijP9E';
const IMAGE_PLACEHOLDER_REGEX = /^IMAGE_\d+$/;

/**
 * Replace any unreplaced IMAGE_N placeholders with the default logo.
 * This catches cases where the LLM used IMAGE_N but the user didn't upload images,
 * or on refinement where the original images aren't available.
 */
function replaceUnresolvedImagePlaceholders(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') {
    return IMAGE_PLACEHOLDER_REGEX.test(obj) ? DEFAULT_IMAGE : obj;
  }
  if (Array.isArray(obj)) return obj.map(replaceUnresolvedImagePlaceholders);
  if (typeof obj === 'object') {
    const result: Record<string, any> = {};
    for (const [key, val] of Object.entries(obj)) {
      result[key] = replaceUnresolvedImagePlaceholders(val);
    }
    return result;
  }
  return obj;
}

export function handleGetTransaction(input: GetTransactionInput) {
  const transaction = getTransactionFromSession(input.sessionId, input.creatorAddress);
  // Ensure all numbers are strings (common LLM mistake)
  const sanitized = ensureStringNumbers(transaction);
  // Replace any unreplaced IMAGE_N placeholders with default logo
  const cleaned = replaceUnresolvedImagePlaceholders(sanitized);
  return { success: true, transaction: cleaned };
}
