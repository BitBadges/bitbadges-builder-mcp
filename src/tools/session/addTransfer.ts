/**
 * add_transfer — Append a MsgTransferTokens to the session.
 *
 * Used for auto-mint flows: after building the collection (messages[0]),
 * append transfer messages to mint tokens to specific addresses on creation.
 *
 * The transfer's collectionId is set to "0" (references the just-created collection).
 * The creator is automatically set from the session's creator address.
 */
import { z } from 'zod';
import { addTransfer } from '../../session/sessionState.js';
import { ensureBb1 } from '../../sdk/addressUtils.js';

const MAX_UINT64 = '18446744073709551615';

const UintRangeSchema = z.object({
  start: z.string().describe('Start of range (string number).'),
  end: z.string().describe('End of range (string number). Use "18446744073709551615" for max.')
});

const BalanceSchema = z.object({
  amount: z.string().describe('Amount as string (e.g., "1", "1000000")'),
  tokenIds: z.array(UintRangeSchema).describe('Token ID ranges to transfer'),
  ownershipTimes: z.array(UintRangeSchema).optional()
    .default([{ start: '1', end: MAX_UINT64 }])
    .describe('Ownership time ranges. Default: forever.')
});

const TransferSchema = z.object({
  from: z.string().describe('Sender address (bb1... or 0x...). Use "Mint" to mint new tokens.'),
  toAddresses: z.array(z.string()).describe('Recipient addresses (bb1... or 0x...).'),
  balances: z.array(BalanceSchema).describe('What to transfer: amount × tokenIds × ownershipTimes.'),
  prioritizedApprovals: z.array(z.object({
    approvalId: z.string().describe('The approvalId from the collection that authorizes this transfer.'),
    approverAddress: z.string().optional().default('').describe('Address of the approver. Usually empty string for collection-level approvals.')
  })).optional().default([]).describe('Which approval(s) to use. Required for minting — reference the mint approval by ID.'),
  merkleProofs: z.array(z.any()).optional().default([]),
  memo: z.string().optional().default('')
});

export const addTransferSchema = z.object({
  sessionId: z.string().optional().describe('Session ID. Omit for default session.'),
  transfers: z.array(TransferSchema).min(1)
    .describe('Array of transfers. Each transfer specifies from/to/balances and which approval to use.')
});

export type AddTransferInput = z.infer<typeof addTransferSchema>;

export const addTransferTool = {
  name: 'add_transfer',
  description: 'Append a MsgTransferTokens to the session (after the collection message). Use this for auto-mint: mint tokens to specific addresses at creation time. The collectionId is automatically set to "0" (the just-created collection). Requires a matching mint approval in the collection.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      sessionId: { type: 'string', description: 'Session ID. Omit for default session.' },
      transfers: {
        type: 'array',
        description: 'Array of transfers. Each specifies from/to/balances and which approval to use.',
        items: {
          type: 'object',
          properties: {
            from: { type: 'string', description: 'Sender. Use "Mint" to mint new tokens.' },
            toAddresses: { type: 'array', items: { type: 'string' }, description: 'Recipient addresses (bb1... or 0x...).' },
            balances: {
              type: 'array',
              description: 'What to transfer: amount × tokenIds × ownershipTimes.',
              items: {
                type: 'object',
                properties: {
                  amount: { type: 'string' },
                  tokenIds: { type: 'array', items: { type: 'object', properties: { start: { type: 'string' }, end: { type: 'string' } }, required: ['start', 'end'] } },
                  ownershipTimes: { type: 'array', items: { type: 'object', properties: { start: { type: 'string' }, end: { type: 'string' } }, required: ['start', 'end'] } }
                },
                required: ['amount', 'tokenIds']
              }
            },
            prioritizedApprovals: {
              type: 'array',
              description: 'Which approval(s) authorize this transfer. For minting, reference the mint approval ID.',
              items: {
                type: 'object',
                properties: {
                  approvalId: { type: 'string' },
                  approverAddress: { type: 'string' }
                },
                required: ['approvalId']
              }
            },
            memo: { type: 'string' }
          },
          required: ['from', 'toAddresses', 'balances']
        }
      }
    },
    required: ['transfers']
  }
};

export function handleAddTransfer(input: Record<string, any>): Record<string, any> {
  try {
    const parsed = addTransferSchema.parse(input);

    const transferValue = {
      transfers: parsed.transfers.map((t) => ({
        from: t.from === 'Mint' ? 'Mint' : ensureBb1(t.from),
        toAddresses: t.toAddresses.map((a: string) => ensureBb1(a)),
        balances: t.balances,
        prioritizedApprovals: t.prioritizedApprovals || [],
        merkleProofs: t.merkleProofs || [],
        memo: t.memo || ''
      }))
    };

    const { index } = addTransfer(parsed.sessionId, transferValue);

    return {
      success: true,
      messageIndex: index,
      note: `Added MsgTransferTokens at messages[${index}]. CollectionId set to "0" (references the collection being created in messages[0]).`
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
