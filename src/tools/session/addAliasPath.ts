import { z } from 'zod';
import { addAliasPath as addAliasPathToSession, getOrCreateSession } from '../../session/sessionState.js';

export const addAliasPathSchema = z.object({
  sessionId: z.string().optional().describe("Session ID for per-request isolation."),
  creatorAddress: z.string().optional(),
  aliasPath: z.object({
    denom: z.string().describe('Base denom symbol (e.g., "uvatom", "uwusdc"). Must only contain a-zA-Z, _, {, }, -. NEVER use raw IBC denom (ibc/...).'),
    symbol: z.string().describe('Same as denom for the base unit.'),
    conversion: z.object({
      sideA: z.object({ amount: z.string() }).describe('IBC coin side. Usually {"amount":"1"}.'),
      sideB: z.array(z.any()).describe('Token side. Usually [{"amount":"1","tokenIds":[{"start":"1","end":"1"}],"ownershipTimes":[{"start":"1","end":"max"}]}].')
    }),
    denomUnits: z.array(z.object({
      decimals: z.string().describe('Decimal places as string. Must match IBC denom decimals (e.g., "6" for ATOM/USDC).'),
      symbol: z.string().describe('Display symbol (e.g., "vATOM", "wUSDC"). Do NOT reuse reserved symbols.'),
      isDefaultDisplay: z.boolean().optional(),
      metadata: z.object({
        uri: z.string().optional().default(''),
        customData: z.string().optional().default(''),
        image: z.string().describe('Token logo URL. REQUIRED.')
      }).optional()
    })).describe('Display units with decimals > 0 ONLY. Base decimals (0) is implicit.'),
    metadata: z.object({
      uri: z.string().optional().default(''),
      customData: z.string().optional().default(''),
      image: z.string().describe('Token logo URL. REQUIRED for alias paths.')
    }).optional()
  })
});

export type AddAliasPathInput = z.infer<typeof addAliasPathSchema>;

export const addAliasPathTool = {
  name: 'add_alias_path',
  description: 'Add an alias path for ICS20-backed tokens or liquidity pools. Required for smart tokens. Decimals must match the IBC denom decimals. All metadata MUST include an image field.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      sessionId: { type: 'string', description: 'Session ID.' },
      creatorAddress: { type: 'string' },
      aliasPath: {
        type: 'object',
        description: 'Alias path configuration.',
        properties: {
          denom: { type: 'string', description: 'Base denom symbol. Not raw IBC denom.' },
          symbol: { type: 'string' },
          conversion: { type: 'object' },
          denomUnits: { type: 'array' },
          metadata: { type: 'object' }
        },
        required: ['denom', 'symbol', 'conversion', 'denomUnits']
      }
    },
    required: ['aliasPath']
  }
};

export function handleAddAliasPath(input: AddAliasPathInput) {
  getOrCreateSession(input.sessionId, input.creatorAddress);
  addAliasPathToSession(input.sessionId, input.aliasPath);
  return { success: true, denom: input.aliasPath.denom };
}
