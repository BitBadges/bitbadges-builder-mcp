import { z } from 'zod';
import { addCosmosWrapperPath as addCosmosWrapperPathToSession, getOrCreateSession } from '../../session/sessionState.js';

export const addCosmosWrapperPathSchema = z.object({
  sessionId: z.string().optional().describe("Session ID for per-request isolation."),
  creatorAddress: z.string().optional(),
  wrapperPath: z.object({
    denom: z.string().describe('Denom for the wrapper (e.g., "uatom").'),
    symbol: z.string(),
    conversion: z.object({
      sideA: z.object({ amount: z.string() }),
      sideB: z.array(z.any())
    }),
    denomUnits: z.array(z.any()).optional(),
    metadata: z.object({
      uri: z.string().optional().default(''),
      customData: z.string().optional().default(''),
      image: z.string().describe('Token logo URL. REQUIRED.')
    }).optional()
  })
});

export type AddCosmosWrapperPathInput = z.infer<typeof addCosmosWrapperPathSchema>;

export const addCosmosWrapperPathTool = {
  name: 'add_cosmos_wrapper_path',
  description: 'Add a Cosmos coin wrapper path for wrapping native SDK coins. Uses allowSpecialWrapping: true in approval criteria.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      sessionId: { type: 'string', description: 'Session ID.' },
      creatorAddress: { type: 'string' },
      wrapperPath: { type: 'object', description: 'Wrapper path configuration.', required: ['denom', 'symbol', 'conversion'] }
    },
    required: ['wrapperPath']
  }
};

export function handleAddCosmosWrapperPath(input: AddCosmosWrapperPathInput) {
  getOrCreateSession(input.sessionId, input.creatorAddress);
  addCosmosWrapperPathToSession(input.sessionId, input.wrapperPath);
  return { success: true, denom: input.wrapperPath.denom };
}
