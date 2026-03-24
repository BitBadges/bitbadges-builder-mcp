/**
 * generate_unique_id — Generate unique suffixed IDs for approvals, trackers, etc.
 * The LLM calls this when creating NEW approvals to get collision-free IDs.
 */

import { z } from 'zod';
import { randomBytes } from 'crypto';

export const generateUniqueIdSchema = z.object({
  prefix: z.string().describe('Human-readable prefix for the ID (e.g. "subscription-mint", "public-mint", "transferable"). The suffix will be appended after an underscore.'),
  count: z.number().optional().default(1).describe('Number of unique IDs to generate (default: 1). Use when creating multiple new approvals at once.')
});

export type GenerateUniqueIdInput = z.infer<typeof generateUniqueIdSchema>;

export const generateUniqueIdTool = {
  name: 'generate_unique_id',
  description: 'Generate unique IDs for new approvals, trackers, etc. Returns IDs like "prefix_a1b2c3d4". Use this for ALL new approval IDs to prevent collisions. Do NOT use for existing approvals being updated — keep their original IDs.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      prefix: { type: 'string', description: 'Human-readable prefix (e.g. "subscription-mint", "public-mint").' },
      count: { type: 'number', description: 'Number of unique IDs to generate (default: 1).' }
    },
    required: ['prefix']
  }
};

export function handleGenerateUniqueId(input: GenerateUniqueIdInput) {
  const count = Math.min(Math.max(input.count || 1, 1), 20);
  const ids: string[] = [];
  for (let i = 0; i < count; i++) {
    const suffix = randomBytes(4).toString('hex');
    ids.push(`${input.prefix}_${suffix}`);
  }
  return {
    success: true,
    ids,
    note: 'Use these IDs as approvalId and amountTrackerId for new approvals. Do NOT change IDs of existing approvals.'
  };
}
