/**
 * add_approval — Add a collection approval to the session.
 *
 * This is the most critical tool in the builder. The input schema serves as
 * field-level documentation — every parameter has rich descriptions, defaults,
 * and gotchas so the LLM knows how to use it correctly.
 *
 * Remove + re-add with the same approvalId = replace in-place (preserves order).
 */
import { z } from 'zod';
import { randomBytes } from 'crypto';
import { addApproval as addApprovalToSession, getOrCreateSession } from '../../session/sessionState.js';
import { getCoinDetails } from '../../sdk/coinRegistry.js';

const MAX_UINT64 = '18446744073709551615';
const FOREVER_TIMES = [{ start: '1', end: MAX_UINT64 }];

/**
 * Walk merkleChallenges and auto-populate secrets for claim plugins.
 * - codes: generate seedCode if missing, or carry forward from existing approval
 * Mutates the approval in-place. Returns a summary of generated secrets for the response.
 */
function populateClaimSecrets(
  approval: Record<string, any>,
  existingApproval?: Record<string, any>
): Array<{ pluginId: string; label?: string; seedCode?: string; numCodes?: number }> {
  const secrets: Array<{ pluginId: string; label?: string; seedCode?: string; numCodes?: number }> = [];
  const challenges = approval.approvalCriteria?.merkleChallenges;
  if (!Array.isArray(challenges)) return secrets;

  // Collect existing seedCodes from the previous version of this approval (stable across refines)
  const existingSeedCodes = new Map<string, string>();
  const existingChallenges = existingApproval?.approvalCriteria?.merkleChallenges;
  if (Array.isArray(existingChallenges)) {
    for (const mc of existingChallenges) {
      for (const p of mc.claimConfig?.plugins || []) {
        if (p.pluginId === 'codes' && p.privateParams?.seedCode) {
          existingSeedCodes.set(mc.claimConfig?.label || '', p.privateParams.seedCode);
        }
      }
    }
  }

  for (const mc of challenges) {
    const plugins = mc.claimConfig?.plugins;
    if (!Array.isArray(plugins)) continue;
    const label = mc.claimConfig?.label || '';

    for (const plugin of plugins) {
      if (plugin.pluginId === 'codes') {
        plugin.privateParams = plugin.privateParams || {};
        if (!plugin.privateParams.seedCode) {
          // Carry forward existing seedCode if available, otherwise generate new
          plugin.privateParams.seedCode = existingSeedCodes.get(label) || randomBytes(32).toString('hex');
          plugin.privateParams.codes = [];
        }
        // Coerce numCodes to number if AI sent as string
        if (plugin.publicParams?.numCodes && typeof plugin.publicParams.numCodes === 'string') {
          plugin.publicParams.numCodes = parseInt(plugin.publicParams.numCodes, 10) || 100;
        }
        secrets.push({
          pluginId: 'codes',
          label: label || undefined,
          seedCode: plugin.privateParams.seedCode,
          numCodes: plugin.publicParams?.numCodes || 100
        });
      }
    }
  }

  return secrets;
}

const UintRangeSchema = z.object({
  start: z.string().describe('Start of range (string number). Use "1" for beginning.'),
  end: z.string().describe('End of range (string number). Use "18446744073709551615" for max/forever.')
});

const BalanceSchema = z.object({
  amount: z.string().describe('Amount as string (e.g., "1", "1000")'),
  tokenIds: z.array(UintRangeSchema).describe('Token ID ranges'),
  ownershipTimes: z.array(UintRangeSchema).describe('Ownership time ranges. Usually FOREVER: [{"start":"1","end":"18446744073709551615"}]')
});

const CoinTransferSchema = z.object({
  to: z.string().describe('Recipient address (bb1...). Who receives the payment.'),
  coins: z.array(z.object({
    denom: z.string().describe('Token denomination. Use full IBC denom for ICS20 tokens (e.g., "ibc/A4DB..." for ATOM). Use "ubadge" for BADGE. Amounts use base units (e.g., 5 ATOM = "5000000" with 6 decimals).'),
    amount: z.string().describe('Amount in base units as string.')
  })).describe('Coins to transfer as payment.'),
  overrideFromWithApproverAddress: z.boolean().optional().default(false)
    .describe('If true, payment comes from the approval address (escrow pattern). Default false for standard payments.'),
  overrideToWithInitiator: z.boolean().optional().default(false)
    .describe('If true, payment goes to the person initiating the transfer (escrow payout pattern). Default false for standard payments.')
});

const MaxNumTransfersSchema = z.object({
  overallMaxNumTransfers: z.string().optional().default('0').describe('Total transfer count limit across all users. "0" = unlimited.'),
  perInitiatedByAddressMaxNumTransfers: z.string().optional().default('0').describe('Max transfers per initiator address. "0" = unlimited. Common: "1" for one-per-user mints.'),
  perToAddressMaxNumTransfers: z.string().optional().default('0').describe('Max transfers per recipient. "0" = unlimited.'),
  perFromAddressMaxNumTransfers: z.string().optional().default('0').describe('Max transfers per sender. "0" = unlimited. Used for restricted-transfer pattern.'),
  amountTrackerId: z.string().optional().default('').describe('Unique ID for tracking. Required if any limit is non-zero. Must be unique per approval.'),
  resetTimeIntervals: z.object({
    startTime: z.string().optional().default('0'),
    intervalLength: z.string().optional().default('0').describe('"0" = no reset (permanent). "86400000" = daily reset (24h in ms).')
  }).optional()
});

const ApprovalAmountsSchema = z.object({
  overallApprovalAmount: z.string().optional().default('0').describe('Total amount limit. "0" = unlimited.'),
  perInitiatedByAddressApprovalAmount: z.string().optional().default('0').describe('Amount limit per initiator.'),
  perToAddressApprovalAmount: z.string().optional().default('0'),
  perFromAddressApprovalAmount: z.string().optional().default('0'),
  amountTrackerId: z.string().optional().default('').describe('Unique tracking ID. Required if any amount is non-zero.'),
  resetTimeIntervals: z.object({
    startTime: z.string().optional().default('0'),
    intervalLength: z.string().optional().default('0').describe('"0" = no reset. "86400000" = daily reset.')
  }).optional()
});

const PredeterminedBalancesSchema = z.object({
  manualBalances: z.array(BalanceSchema).optional().default([]),
  incrementedBalances: z.object({
    startBalances: z.array(BalanceSchema).describe('Starting balances for the first transfer.'),
    incrementTokenIdsBy: z.string().describe('"1" for NFTs (sequential IDs). "0" for subscriptions/fungible.'),
    incrementOwnershipTimesBy: z.string().optional().default('0'),
    durationFromTimestamp: z.string().optional().default('0')
      .describe('Subscription duration in ms. "0" = disabled. "2592000000" = 30 days. MUST be non-zero for subscriptions. MUTUALLY EXCLUSIVE with recurringOwnershipTimes and incrementOwnershipTimesBy.'),
    allowOverrideTimestamp: z.boolean().optional().default(false)
      .describe('MUST be true for subscriptions (each mint gets its own start time).'),
    recurringOwnershipTimes: z.object({
      startTime: z.string().optional().default('0'),
      intervalLength: z.string().optional().default('0'),
      chargePeriodLength: z.string().optional().default('0')
    }).optional().describe('MUST be all zeros if using durationFromTimestamp. Mutually exclusive.'),
    allowOverrideWithAnyValidToken: z.boolean().optional().default(false)
  }).optional(),
  orderCalculationMethod: z.object({
    useOverallNumTransfers: z.boolean().optional().default(true).describe('Most common. Sequential based on overall count.'),
    usePerToAddressNumTransfers: z.boolean().optional().default(false),
    usePerFromAddressNumTransfers: z.boolean().optional().default(false),
    usePerInitiatedByAddressNumTransfers: z.boolean().optional().default(false),
    useMerkleChallengeLeafIndex: z.boolean().optional().default(false),
    challengeTrackerId: z.string().optional().default('')
  }).optional().describe('EXACTLY ONE method must be true. Default: useOverallNumTransfers.')
}).describe('INCOMPATIBLE with approvalAmounts — use one or the other. NFTs use predeterminedBalances (incrementTokenIdsBy:"1"). Fungible tokens use approvalAmounts instead.');

const MustOwnTokensSchema = z.object({
  collectionId: z.string().describe('Collection ID to check ownership of.'),
  amountRange: UintRangeSchema.describe('Required amount range. Usually {"start":"1","end":"max"}.'),
  ownershipTimes: z.array(UintRangeSchema).describe('When ownership must be valid.'),
  tokenIds: z.array(UintRangeSchema).describe('Which token IDs to check.'),
  overrideWithCurrentTime: z.boolean().optional().default(true).describe('Use current block time for ownership check. true for expiring tokens (2FA).'),
  mustSatisfyForAllAssets: z.boolean().optional().default(false),
  ownershipCheckParty: z.enum(['initiator', 'sender', 'recipient']).optional().default('initiator')
    .describe('"initiator" = person starting the transfer. Most common for token gating.')
});

export const addApprovalSchema = z.object({
  sessionId: z.string().optional().describe("Session ID for per-request isolation."),
  creatorAddress: z.string().optional().describe('Creator bb1... address. Used to auto-create session if needed.'),
  approvalId: z.string().describe('Unique ID for this approval. Use descriptive names: "public-mint", "manager-mint", "subscription-mint", "transferable", "smart-token-backing", "smart-token-unbacking". Frontend displays this to users.'),
  fromListId: z.string().describe('Who can send. "Mint" for minting. "!Mint" for post-mint transfers. "All" for anyone. bb1... for specific address. "!Mint:bb1..." for exclusion syntax (smart token unbacking).'),
  toListId: z.string().optional().default('All').describe('Who can receive. "All" for anyone. bb1... for specific address (e.g., backing address for unbacking).'),
  initiatedByListId: z.string().optional().default('All').describe('Who can initiate. "All" for public. bb1... for manager-only. Must be a reserved list ID.'),
  tokenIds: z.array(UintRangeSchema).optional().describe('Token ID ranges this approval covers. Default: [{"start":"1","end":"1"}].'),
  transferTimes: z.array(UintRangeSchema).optional().describe('When this approval is active. Default: forever.'),
  ownershipTimes: z.array(UintRangeSchema).optional().describe('Ownership time ranges. Default: forever.'),
  approvalCriteria: z.object({
    overridesFromOutgoingApprovals: z.boolean().optional()
      .describe('MUST be true for Mint approvals (Mint has no outgoing approvals). Defaults false — only set true when sender outgoing approvals should be bypassed.'),
    overridesToIncomingApprovals: z.boolean().optional().default(false)
      .describe('Bypass recipient incoming approvals. Almost always false. Only true for forced transfers.'),
    coinTransfers: z.array(CoinTransferSchema).optional()
      .describe('Payment requirements. Specify denom (full IBC denom), amount (base units as string), and recipient.'),
    maxNumTransfers: MaxNumTransfersSchema.optional()
      .describe('Limit transfer count. Use for NFT minting caps, one-per-user limits.'),
    approvalAmounts: ApprovalAmountsSchema.optional()
      .describe('Limit total amount transferred. For fungible token supply tracking. INCOMPATIBLE with predeterminedBalances.'),
    predeterminedBalances: PredeterminedBalancesSchema.optional()
      .describe('Pre-define exact tokens per transfer. For NFT sequential minting and subscriptions. INCOMPATIBLE with approvalAmounts.'),
    mustOwnTokens: z.array(MustOwnTokensSchema).optional()
      .describe('Token gating — require ownership of specific tokens. Used for 2FA on unbacking, whitelist badges, etc.'),
    merkleChallenges: z.array(z.any()).optional()
      .describe('Merkle proof requirements for claim-based distribution. Use lookup_claim_plugins for schema.'),
    mustPrioritize: z.boolean().optional().default(false)
      .describe('MUST be true for IBC backed/unbacking operations. Requires explicit prioritizedApprovals in transfers.'),
    allowBackedMinting: z.boolean().optional().default(false)
      .describe('MUST be true for IBC backed/unbacking operations (smart tokens).'),
    requireToEqualsInitiatedBy: z.boolean().optional().default(false)
      .describe('Recipient must be the initiator. Used for self-mint patterns.'),
    autoDeletionOptions: z.object({
      afterOneUse: z.boolean().optional().default(false),
      allowPurgeIfExpired: z.boolean().optional().default(false).describe('MUST be true for Custom-2FA tokens.')
    }).optional()
  }).optional().describe('Conditions for this approval. Only include non-default fields — omit anything that is false, "0", or [].')
});

export type AddApprovalInput = z.infer<typeof addApprovalSchema>;

export const addApprovalTool = {
  name: 'add_approval',
  description: 'Add a collection approval to the session. Each approval defines WHO can transfer WHAT tokens WHEN and under WHAT conditions. Use one approval per purpose with clear approvalIds. Remove + re-add with same approvalId = replace in-place (preserves order). Only include non-default fields in approvalCriteria.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      sessionId: { type: 'string', description: 'Session ID.' },
      creatorAddress: { type: 'string', description: 'Creator bb1... address.' },
      approvalId: { type: 'string', description: 'Unique approval ID. Use descriptive names: "public-mint", "manager-mint", "subscription-mint", "transferable", "smart-token-backing", "smart-token-unbacking".' },
      fromListId: { type: 'string', description: 'Who can send. "Mint" for minting. "!Mint" for post-mint transfers. bb1... for specific address.' },
      toListId: { type: 'string', description: 'Who can receive. Default "All".' },
      initiatedByListId: { type: 'string', description: 'Who can initiate. "All" for public, bb1... for manager-only.' },
      tokenIds: { type: 'array', items: { type: 'object', properties: { start: { type: 'string' }, end: { type: 'string' } }, required: ['start', 'end'] }, description: 'Token ID ranges.' },
      transferTimes: { type: 'array', items: { type: 'object', properties: { start: { type: 'string' }, end: { type: 'string' } }, required: ['start', 'end'] } },
      ownershipTimes: { type: 'array', items: { type: 'object', properties: { start: { type: 'string' }, end: { type: 'string' } }, required: ['start', 'end'] } },
      approvalCriteria: {
        type: 'object',
        description: 'Conditions. Only include non-default fields. overridesFromOutgoingApprovals MUST be true for Mint approvals. predeterminedBalances and approvalAmounts are INCOMPATIBLE.',
        properties: {
          overridesFromOutgoingApprovals: { type: 'boolean', description: 'MUST be true for Mint approvals.' },
          overridesToIncomingApprovals: { type: 'boolean' },
          coinTransfers: { type: 'array', description: 'Payment requirements.' },
          maxNumTransfers: { type: 'object', description: 'Transfer count limits.' },
          approvalAmounts: { type: 'object', description: 'Amount limits. INCOMPATIBLE with predeterminedBalances.' },
          predeterminedBalances: { type: 'object', description: 'Pre-defined tokens per transfer. INCOMPATIBLE with approvalAmounts.' },
          mustOwnTokens: { type: 'array', description: 'Token gating requirements.' },
          merkleChallenges: { type: 'array', description: 'Merkle proof requirements.' },
          mustPrioritize: { type: 'boolean', description: 'Required for IBC backing/unbacking.' },
          allowBackedMinting: { type: 'boolean', description: 'Required for IBC backing/unbacking.' },
          requireToEqualsInitiatedBy: { type: 'boolean' },
          autoDeletionOptions: { type: 'object' }
        }
      }
    },
    required: ['approvalId', 'fromListId']
  }
};

export function handleAddApproval(input: AddApprovalInput) {
  try {
    const session = getOrCreateSession(input.sessionId, input.creatorAddress);

    // Capture existing approval's claim secrets before replacement (for seedCode stability on refine)
    const existingApprovals: any[] = session.messages[0].value.collectionApprovals || [];
    const existingApproval = existingApprovals.find((a: any) => a.approvalId === input.approvalId);

    const approval: Record<string, any> = {
      fromListId: input.fromListId,
      toListId: input.toListId || 'All',
      initiatedByListId: input.initiatedByListId || 'All',
      transferTimes: input.transferTimes || FOREVER_TIMES,
      tokenIds: input.tokenIds || [{ start: '1', end: '1' }],
      ownershipTimes: input.ownershipTimes || FOREVER_TIMES,
      uri: '',
      customData: '',
      approvalId: input.approvalId,
      approvalCriteria: input.approvalCriteria || {},
      version: '0'
    };

    // Normalize approvalCriteria — fill in missing sub-fields that cause SDK crashes
    const criteria = approval.approvalCriteria as Record<string, any>;
    const DEFAULT_RESET = { startTime: '0', intervalLength: '0' };
    if (criteria.maxNumTransfers) {
      criteria.maxNumTransfers.resetTimeIntervals = criteria.maxNumTransfers.resetTimeIntervals || DEFAULT_RESET;
      criteria.maxNumTransfers.amountTrackerId = criteria.maxNumTransfers.amountTrackerId || approval.approvalId || '';
      criteria.maxNumTransfers.perToAddressMaxNumTransfers = criteria.maxNumTransfers.perToAddressMaxNumTransfers || '0';
      criteria.maxNumTransfers.perFromAddressMaxNumTransfers = criteria.maxNumTransfers.perFromAddressMaxNumTransfers || '0';
      criteria.maxNumTransfers.perInitiatedByAddressMaxNumTransfers = criteria.maxNumTransfers.perInitiatedByAddressMaxNumTransfers || '0';
    }
    if (criteria.approvalAmounts) {
      criteria.approvalAmounts.resetTimeIntervals = criteria.approvalAmounts.resetTimeIntervals || DEFAULT_RESET;
      criteria.approvalAmounts.amountTrackerId = criteria.approvalAmounts.amountTrackerId || approval.approvalId || '';
      criteria.approvalAmounts.perToAddressApprovalAmount = criteria.approvalAmounts.perToAddressApprovalAmount || '0';
      criteria.approvalAmounts.perFromAddressApprovalAmount = criteria.approvalAmounts.perFromAddressApprovalAmount || '0';
      criteria.approvalAmounts.perInitiatedByAddressApprovalAmount = criteria.approvalAmounts.perInitiatedByAddressApprovalAmount || '0';
    }
    if (criteria.predeterminedBalances) {
      criteria.predeterminedBalances.manualBalances = criteria.predeterminedBalances.manualBalances || [];
      if (criteria.predeterminedBalances.orderCalculationMethod) {
        const ocm = criteria.predeterminedBalances.orderCalculationMethod;
        ocm.usePerToAddressNumTransfers = ocm.usePerToAddressNumTransfers ?? false;
        ocm.usePerFromAddressNumTransfers = ocm.usePerFromAddressNumTransfers ?? false;
        ocm.usePerInitiatedByAddressNumTransfers = ocm.usePerInitiatedByAddressNumTransfers ?? false;
        ocm.useMerkleChallengeLeafIndex = ocm.useMerkleChallengeLeafIndex ?? false;
        ocm.challengeTrackerId = ocm.challengeTrackerId ?? '';
      }
      if (criteria.predeterminedBalances.incrementedBalances) {
        const ib = criteria.predeterminedBalances.incrementedBalances;
        ib.recurringOwnershipTimes = ib.recurringOwnershipTimes || { startTime: '0', intervalLength: '0', chargePeriodLength: '0' };
      }
    }
    // Strip invalid fields from coinTransfers (e.g. hallucinated startTime)
    if (Array.isArray(criteria.coinTransfers)) {
      criteria.coinTransfers = criteria.coinTransfers.map((ct: any) => ({
        to: ct.to ?? '',
        coins: ct.coins ?? [],
        overrideFromWithApproverAddress: ct.overrideFromWithApproverAddress ?? false,
        overrideToWithInitiator: ct.overrideToWithInitiator ?? false
      }));
    }

    // Validate IBC denoms in coinTransfers — catch hallucinated denoms from training data
    const coinTransfers = (input.approvalCriteria as any)?.coinTransfers;
    const warnings: string[] = [];
    if (Array.isArray(coinTransfers)) {
      for (const ct of coinTransfers) {
        for (const coin of ct.coins || []) {
          if (coin.denom?.startsWith('ibc/') && !getCoinDetails(coin.denom)) {
            warnings.push(`WARNING: IBC denom "${coin.denom}" is not in the BitBadges coin registry. Use lookup_token_info to get the correct denom. Known denoms: ATOM=ibc/A4DB47A9D3CF9A068D454513891B526702455D3EF08FB9EB558C561F9DC2B701, USDC=ibc/F082B65C88E4B6D5EF1DB243CDA1D331D002759E938A0F5CD3FFDC5D53B3E349, OSMO=ibc/ED07A3391A112B175915CD8FAF43A2DA8E4790EDE12566649D0C2F97716B8518`);
          }
        }
      }
    }

    // Hard reject invalid IBC denoms
    if (warnings.length > 0) {
      return {
        success: false,
        error: warnings.join('\n'),
        approvalId: input.approvalId
      };
    }

    // Auto-generate secrets for claim plugins (codes seedCode, etc.)
    // Pass existing approval so seedCodes are carried forward on refine (not regenerated)
    const claimSecrets = populateClaimSecrets(approval, existingApproval);

    addApprovalToSession(input.sessionId, approval);

    return {
      success: true,
      approvalId: input.approvalId,
      message: `Approval "${input.approvalId}" added to session.`,
      ...(claimSecrets.length > 0 ? { claimSecrets } : {})
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
