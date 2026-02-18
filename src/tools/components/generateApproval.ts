/**
 * Tool: generate_approval
 * Build approval structures by type
 */

import { z } from 'zod';

const MAX_UINT64 = '18446744073709551615';
const FOREVER_TIMES = [{ start: '1', end: MAX_UINT64 }];

export const generateApprovalSchema = z.object({
  approvalType: z.enum([
    'public-mint',
    'manager-mint',
    'smart-token-backing',
    'smart-token-unbacking',
    'subscription',
    'free-transfer',
    'restricted-transfer'
  ]).describe('The type of approval to generate'),
  approvalId: z.string().describe('Unique identifier for this approval'),
  tokenIds: z.array(z.object({
    start: z.string(),
    end: z.string()
  })).optional().describe('Token ID ranges (defaults to token 1)'),
  backingAddress: z.string().optional().describe('For Smart Token approvals: the IBC backing address'),
  paymentAmount: z.string().optional().describe('Payment amount in base units'),
  paymentDenom: z.string().optional().describe('Payment denomination'),
  paymentRecipient: z.string().optional().describe('Address to receive payment'),
  maxPerUser: z.string().optional().describe('Maximum mints per user'),
  totalMax: z.string().optional().describe('Total maximum transfers'),
  fromListId: z.string().optional().describe('Override from list ID'),
  toListId: z.string().optional().describe('Override to list ID'),
  initiatedByListId: z.string().optional().describe('Override initiated by list ID')
});

export type GenerateApprovalInput = z.infer<typeof generateApprovalSchema>;

export interface ApprovalStructure {
  fromListId: string;
  toListId: string;
  initiatedByListId: string;
  transferTimes: Array<{ start: string; end: string }>;
  tokenIds: Array<{ start: string; end: string }>;
  ownershipTimes: Array<{ start: string; end: string }>;
  uri: string;
  customData: string;
  approvalId: string;
  approvalCriteria: Record<string, unknown>;
  version: string;
}

export interface GenerateApprovalResult {
  success: boolean;
  approval?: ApprovalStructure;
  error?: string;
}

export const generateApprovalTool = {
  name: 'generate_approval',
  description: 'Build approval structures by type. Generates properly formatted approvals for common use cases like minting, Smart Tokens, and transfers.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      approvalType: {
        type: 'string',
        enum: [
          'public-mint',
          'manager-mint',
          'smart-token-backing',
          'smart-token-unbacking',
          'subscription',
          'free-transfer',
          'restricted-transfer'
        ],
        description: 'The type of approval to generate'
      },
      approvalId: {
        type: 'string',
        description: 'Unique identifier for this approval'
      },
      tokenIds: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            start: { type: 'string' },
            end: { type: 'string' }
          }
        },
        description: 'Token ID ranges (defaults to token 1)'
      },
      backingAddress: {
        type: 'string',
        description: 'For Smart Token approvals: the IBC backing address (bb1...)'
      },
      paymentAmount: {
        type: 'string',
        description: 'Payment amount in base units'
      },
      paymentDenom: {
        type: 'string',
        description: 'Payment denomination (e.g., "ubadge")'
      },
      paymentRecipient: {
        type: 'string',
        description: 'Address to receive payment (bb1...)'
      },
      maxPerUser: {
        type: 'string',
        description: 'Maximum mints/transfers per user'
      },
      totalMax: {
        type: 'string',
        description: 'Total maximum transfers allowed'
      },
      fromListId: {
        type: 'string',
        description: 'Override from list ID'
      },
      toListId: {
        type: 'string',
        description: 'Override to list ID'
      },
      initiatedByListId: {
        type: 'string',
        description: 'Override initiated by list ID'
      }
    },
    required: ['approvalType', 'approvalId']
  }
};

function createBaseApproval(input: GenerateApprovalInput): ApprovalStructure {
  return {
    fromListId: input.fromListId || 'Mint',
    toListId: input.toListId || 'All',
    initiatedByListId: input.initiatedByListId || 'All',
    transferTimes: FOREVER_TIMES,
    tokenIds: input.tokenIds || [{ start: '1', end: '1' }],
    ownershipTimes: FOREVER_TIMES,
    uri: '',
    customData: '',
    approvalId: input.approvalId,
    approvalCriteria: {},
    version: '0'
  };
}

function buildPublicMintApproval(input: GenerateApprovalInput): ApprovalStructure {
  const approval = createBaseApproval(input);
  approval.fromListId = 'Mint';

  const criteria: Record<string, unknown> = {
    overridesFromOutgoingApprovals: true
  };

  // Add payment if specified
  if (input.paymentAmount && input.paymentDenom && input.paymentRecipient) {
    criteria.coinTransfers = [{
      to: input.paymentRecipient,
      coins: [{ denom: input.paymentDenom, amount: input.paymentAmount }],
      overrideFromWithApproverAddress: false,
      overrideToWithInitiator: false
    }];
  }

  // Add max per user if specified
  if (input.maxPerUser) {
    criteria.maxNumTransfers = {
      perInitiatedByAddressMaxNumTransfers: input.maxPerUser,
      overallMaxNumTransfers: '0',
      perToAddressMaxNumTransfers: '0',
      perFromAddressMaxNumTransfers: '0',
      amountTrackerId: input.approvalId,
      resetTimeIntervals: { startTime: '0', intervalLength: '0' }
    };
  }

  // Add total max if specified
  if (input.totalMax) {
    if (!criteria.maxNumTransfers) {
      criteria.maxNumTransfers = {
        overallMaxNumTransfers: input.totalMax,
        perInitiatedByAddressMaxNumTransfers: '0',
        perToAddressMaxNumTransfers: '0',
        perFromAddressMaxNumTransfers: '0',
        amountTrackerId: input.approvalId,
        resetTimeIntervals: { startTime: '0', intervalLength: '0' }
      };
    } else {
      (criteria.maxNumTransfers as Record<string, unknown>).overallMaxNumTransfers = input.totalMax;
    }
  }

  approval.approvalCriteria = criteria;
  return approval;
}

function buildManagerMintApproval(input: GenerateApprovalInput): ApprovalStructure {
  const approval = createBaseApproval(input);
  approval.fromListId = 'Mint';

  // Manager is specified in initiatedByListId
  if (input.initiatedByListId) {
    approval.initiatedByListId = input.initiatedByListId;
  }

  approval.approvalCriteria = {
    overridesFromOutgoingApprovals: true
  };

  return approval;
}

function buildSmartTokenBackingApproval(input: GenerateApprovalInput): ApprovalStructure {
  if (!input.backingAddress) {
    throw new Error('backingAddress is required for smart-token-backing approval');
  }

  const approval = createBaseApproval(input);
  approval.fromListId = input.backingAddress;
  approval.toListId = `!${input.backingAddress}`;

  approval.approvalCriteria = {
    mustPrioritize: true,
    allowBackedMinting: true,
    overridesFromOutgoingApprovals: false
  };

  return approval;
}

function buildSmartTokenUnbackingApproval(input: GenerateApprovalInput): ApprovalStructure {
  if (!input.backingAddress) {
    throw new Error('backingAddress is required for smart-token-unbacking approval');
  }

  const approval = createBaseApproval(input);
  approval.fromListId = `!Mint:${input.backingAddress}`;
  approval.toListId = input.backingAddress;

  approval.approvalCriteria = {
    mustPrioritize: true,
    allowBackedMinting: true,
    overridesFromOutgoingApprovals: false
  };

  return approval;
}

function buildSubscriptionApproval(input: GenerateApprovalInput): ApprovalStructure {
  const approval = createBaseApproval(input);
  approval.fromListId = 'Mint';

  const criteria: Record<string, unknown> = {
    overridesFromOutgoingApprovals: true
  };

  // Add payment if specified
  if (input.paymentAmount && input.paymentDenom && input.paymentRecipient) {
    criteria.coinTransfers = [{
      to: input.paymentRecipient,
      coins: [{ denom: input.paymentDenom, amount: input.paymentAmount }],
      overrideFromWithApproverAddress: false,
      overrideToWithInitiator: false
    }];
  }

  approval.approvalCriteria = criteria;
  return approval;
}

function buildFreeTransferApproval(input: GenerateApprovalInput): ApprovalStructure {
  const approval = createBaseApproval(input);
  approval.fromListId = input.fromListId || '!Mint';
  approval.toListId = input.toListId || 'All';

  approval.approvalCriteria = {
    // No overrides needed for post-mint transfers
  };

  return approval;
}

function buildRestrictedTransferApproval(input: GenerateApprovalInput): ApprovalStructure {
  const approval = createBaseApproval(input);
  approval.fromListId = input.fromListId || '!Mint';
  approval.toListId = input.toListId || 'All';

  const criteria: Record<string, unknown> = {};

  // Add max per user if specified
  if (input.maxPerUser) {
    criteria.maxNumTransfers = {
      perFromAddressMaxNumTransfers: input.maxPerUser,
      overallMaxNumTransfers: '0',
      perInitiatedByAddressMaxNumTransfers: '0',
      perToAddressMaxNumTransfers: '0',
      amountTrackerId: input.approvalId,
      resetTimeIntervals: { startTime: '0', intervalLength: '0' }
    };
  }

  approval.approvalCriteria = criteria;
  return approval;
}

export function handleGenerateApproval(input: GenerateApprovalInput): GenerateApprovalResult {
  try {
    let approval: ApprovalStructure;

    switch (input.approvalType) {
      case 'public-mint':
        approval = buildPublicMintApproval(input);
        break;
      case 'manager-mint':
        approval = buildManagerMintApproval(input);
        break;
      case 'smart-token-backing':
        approval = buildSmartTokenBackingApproval(input);
        break;
      case 'smart-token-unbacking':
        approval = buildSmartTokenUnbackingApproval(input);
        break;
      case 'subscription':
        approval = buildSubscriptionApproval(input);
        break;
      case 'free-transfer':
        approval = buildFreeTransferApproval(input);
        break;
      case 'restricted-transfer':
        approval = buildRestrictedTransferApproval(input);
        break;
      default:
        return {
          success: false,
          error: `Unknown approval type: ${input.approvalType}`
        };
    }

    return {
      success: true,
      approval
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to generate approval: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
