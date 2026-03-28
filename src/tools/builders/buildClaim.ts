/**
 * Tool: build_claim
 * Generates claim JSON for the BitBadges API (POST /api/v0/claims).
 * Supports code-gated, password-gated, whitelist-gated, and open claim types.
 */

import { z } from 'zod';
import crypto from 'crypto';
import { ensureBb1 } from '../../sdk/addressUtils.js';

export const buildClaimSchema = z.object({
  claimType: z.enum(['code-gated', 'password-gated', 'whitelist-gated', 'open']).describe('Type of claim gating'),
  name: z.string().describe('Claim name'),
  description: z.string().optional().describe('Claim description'),
  maxUses: z.number().describe('Maximum total number of claims allowed'),

  // code-gated
  numCodes: z.number().optional().describe('Number of codes to generate (defaults to maxUses)'),

  // password-gated
  password: z.string().optional().describe('Shared password for password-gated claims'),

  // whitelist-gated
  whitelist: z.array(z.string()).optional().describe('Array of addresses (bb1... or 0x...) for whitelist-gated claims'),
  maxUsesPerAddress: z.number().optional().describe('Max claims per address (default 1)'),

  // optional action (links claim to a collection approval)
  action: z.object({
    collectionId: z.string().optional().describe('Collection ID to link this claim to'),
    badgeIds: z.array(z.object({ start: z.string(), end: z.string() })).optional().describe('Badge ID ranges for the claim action'),
    ownershipTimes: z.array(z.object({ start: z.string(), end: z.string() })).optional().describe('Ownership time ranges for the claim action')
  }).passthrough().optional().describe('Action object to include in the claim (links to a collection approval). All fields passed through as-is.'),

  // optional features
  showInSearchResults: z.boolean().optional().describe('Whether to show this claim in search results'),
  categories: z.array(z.string()).optional().describe('Categories for the claim')
});

export type BuildClaimInput = z.infer<typeof buildClaimSchema>;

export interface BuildClaimResult {
  success: boolean;
  claim?: object;
  codes?: string[];
  apiPayload?: object;
  nextSteps?: string;
  error?: string;
}

export const buildClaimTool = {
  name: 'build_claim',
  description:
    'Build a claim document for the BitBadges API. Supports code-gated, password-gated, whitelist-gated, and open claims. Returns JSON ready for POST /api/v0/claims.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      claimType: {
        type: 'string',
        enum: ['code-gated', 'password-gated', 'whitelist-gated', 'open'],
        description: 'Type of claim gating'
      },
      name: { type: 'string', description: 'Claim name' },
      description: { type: 'string', description: 'Claim description' },
      maxUses: { type: 'number', description: 'Maximum total number of claims allowed' },
      numCodes: { type: 'number', description: 'Number of codes to generate (defaults to maxUses, code-gated only)' },
      password: { type: 'string', description: 'Shared password (password-gated only)' },
      whitelist: {
        type: 'array',
        items: { type: 'string' },
        description: 'Array of addresses (bb1... or 0x..., whitelist-gated only)'
      },
      maxUsesPerAddress: { type: 'number', description: 'Max claims per address (default 1, whitelist-gated only)' },
      action: {
        type: 'object',
        description: 'Action object to include in the claim — links to a collection approval. Pass collectionId, badgeIds, ownershipTimes, or any other fields needed. For code-gated claims, seedCode is merged in automatically.',
        properties: {
          collectionId: { type: 'string', description: 'Collection ID to link this claim to' },
          badgeIds: {
            type: 'array',
            items: { type: 'object', properties: { start: { type: 'string' }, end: { type: 'string' } }, required: ['start', 'end'] },
            description: 'Badge ID ranges for the claim action'
          },
          ownershipTimes: {
            type: 'array',
            items: { type: 'object', properties: { start: { type: 'string' }, end: { type: 'string' } }, required: ['start', 'end'] },
            description: 'Ownership time ranges for the claim action'
          }
        }
      },
      showInSearchResults: { type: 'boolean', description: 'Whether to show this claim in search results' },
      categories: { type: 'array', items: { type: 'string' }, description: 'Categories for the claim' }
    },
    required: ['claimType', 'name', 'maxUses']
  }
};

function generateSeedCode(): string {
  return crypto.randomBytes(32).toString('hex');
}

function generateCodesFromSeed(seedCode: string, count: number): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const hash = crypto.createHash('sha256').update(`${seedCode}-${i}`).digest('hex');
    codes.push(hash);
  }
  return codes;
}

export function handleBuildClaim(input: BuildClaimInput): BuildClaimResult {
  // Auto-convert 0x addresses in whitelist
  if (input.whitelist) {
    input.whitelist = input.whitelist.map(addr => ensureBb1(addr));
  }

  // Validate type-specific required fields
  if (input.claimType === 'password-gated' && !input.password) {
    return { success: false, error: 'password is required for password-gated claims' };
  }
  if (input.claimType === 'whitelist-gated' && (!input.whitelist || input.whitelist.length === 0)) {
    return { success: false, error: 'whitelist array is required for whitelist-gated claims' };
  }

  const plugins: object[] = [];
  let generatedCodes: string[] | undefined;
  let seedCode: string | undefined;

  // 1. Always include numUses plugin
  plugins.push({
    pluginId: 'numUses',
    instanceId: 'numUses',
    publicParams: {
      maxUses: input.maxUses,
      assignMethod: 'firstComeFirstServe'
    },
    privateParams: {}
  });

  // 2. Add type-specific plugin
  switch (input.claimType) {
    case 'code-gated': {
      seedCode = generateSeedCode();
      const numCodes = input.numCodes ?? input.maxUses;
      generatedCodes = generateCodesFromSeed(seedCode, numCodes);

      plugins.push({
        pluginId: 'codes',
        instanceId: 'codes',
        publicParams: {
          numCodes
        },
        privateParams: {
          seedCode
        }
      });
      break;
    }

    case 'password-gated': {
      plugins.push({
        pluginId: 'password',
        instanceId: 'password',
        publicParams: {},
        privateParams: {
          password: input.password
        }
      });
      break;
    }

    case 'whitelist-gated': {
      plugins.push({
        pluginId: 'whitelist',
        instanceId: 'whitelist',
        publicParams: {
          maxUsesPerAddress: input.maxUsesPerAddress ?? 1,
          addresses: input.whitelist
        },
        privateParams: {}
      });
      break;
    }

    case 'open':
      // No additional gating plugin needed — numUses is sufficient
      break;
  }

  // Build the claim document
  const claim: Record<string, unknown> = {
    name: input.name,
    description: input.description || '',
    plugins,
    showInSearchResults: input.showInSearchResults ?? false,
    categories: input.categories ?? []
  };

  // Always include action when provided by the caller.
  // For code-gated claims, merge seedCode into the action automatically.
  if (input.action !== undefined || seedCode) {
    claim.action = {
      ...(input.action ?? {}),
      ...(seedCode ? { seedCode } : {})
    };
  }

  // Build the API payload
  const apiPayload = {
    claims: [claim]
  };

  // Build helpful nextSteps
  const nextStepsParts: string[] = [];

  nextStepsParts.push(
    '## How to submit this claim\n' +
      'Send a POST request to the BitBadges API:\n' +
      '```\n' +
      'POST https://api.bitbadges.io/api/v0/claims\n' +
      'Authorization: Bearer <YOUR_API_KEY>\n' +
      'Content-Type: application/json\n' +
      'Body: <the apiPayload object from this response>\n' +
      '```'
  );

  if (input.claimType === 'code-gated') {
    nextStepsParts.push(
      '## Distributing codes\n' +
        `${generatedCodes!.length} unique claim codes were generated. Distribute these codes to your intended recipients. ` +
        'Each code can only be used once. The codes are derived from a seed — keep the seedCode private.'
    );
  }

  if (input.claimType === 'password-gated') {
    nextStepsParts.push(
      '## Sharing the password\n' +
        'Share the password with users who should be able to claim. Anyone with the password can claim (up to maxUses total).'
    );
  }

  nextStepsParts.push(
    '## On-chain usage (optional)\n' +
      'To use this claim for on-chain gated minting/transfers, link it to a collection approval via the BitBadges UI or API. ' +
      'The collectionId and trackerDetails are applied automatically when linking. After a user completes the claim, ' +
      'they receive a Merkle code that can be used as proof in a `MsgTransferTokens` transaction.'
  );

  return {
    success: true,
    claim,
    codes: generatedCodes,
    apiPayload,
    nextSteps: nextStepsParts.join('\n\n')
  };
}
