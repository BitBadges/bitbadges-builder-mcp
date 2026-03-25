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
  // Validate denom and symbol characters
  const VALID_CHARS = /^[a-zA-Z_{}-]+$/;
  const denom = input.aliasPath.denom;
  const symbol = input.aliasPath.symbol;

  if (denom.startsWith('ibc/')) {
    return { success: false, error: `Denom "${denom}" is a raw IBC denom. Use a short symbol like "wuusdc" or "uvault" instead.` };
  }
  if (!VALID_CHARS.test(denom)) {
    return { success: false, error: `Denom "${denom}" contains invalid characters. Only a-zA-Z, _, {, }, - are allowed.` };
  }
  if (symbol && !VALID_CHARS.test(symbol)) {
    return { success: false, error: `Symbol "${symbol}" contains invalid characters. Only a-zA-Z, _, {, }, - are allowed.` };
  }

  // Propagate path-level image to denomUnits that are missing metadata/image
  const pathImage = input.aliasPath.metadata?.image || '';
  if (input.aliasPath.denomUnits && Array.isArray(input.aliasPath.denomUnits)) {
    input.aliasPath.denomUnits = input.aliasPath.denomUnits.map((unit: any) => {
      if (!unit.metadata) {
        unit.metadata = { uri: '', customData: '', image: pathImage };
      } else if (!unit.metadata.image) {
        unit.metadata.image = pathImage;
      }
      return unit;
    });
  }

  getOrCreateSession(input.sessionId, input.creatorAddress);
  addAliasPathToSession(input.sessionId, input.aliasPath);
  return { success: true, denom: input.aliasPath.denom };
}
