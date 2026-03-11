import { describe, it, expect } from 'vitest';

describe('subpath exports', () => {
  describe('tools (bitbadges-builder-mcp/tools)', () => {
    it('exports tool definitions with correct shape', async () => {
      const tools = await import('../src/tools/index.js');

      // Spot-check a few tool definitions
      const toolDefs = [
        tools.buildDynamicStoreTool,
        tools.verifyOwnershipTool,
        tools.searchTool,
      ];

      for (const tool of toolDefs) {
        expect(tool).toBeDefined();
        expect(tool.name).toBeTypeOf('string');
        expect(tool.description).toBeTypeOf('string');
        expect(tool.inputSchema).toBeDefined();
        expect(tool.inputSchema.type).toBe('object');
      }
    });

    it('exports handler functions', async () => {
      const tools = await import('../src/tools/index.js');
      expect(tools.handleBuildDynamicStore).toBeTypeOf('function');
    });
  });

  describe('skills (bitbadges-builder-mcp/skills)', () => {
    it('exports skill functions', async () => {
      const skills = await import('../src/resources/skillInstructions.js');

      expect(skills.getSkillContent).toBeTypeOf('function');
      expect(skills.getAllSkillIds).toBeTypeOf('function');
      expect(skills.getSkillInstructions).toBeTypeOf('function');
      expect(skills.getAllSkillInstructions).toBeTypeOf('function');
      expect(skills.getReferenceCollectionIdsForSkills).toBeTypeOf('function');
    });

    it('getAllSkillIds returns non-empty array of strings', async () => {
      const { getAllSkillIds } = await import('../src/resources/skillInstructions.js');
      const ids = getAllSkillIds();
      expect(ids.length).toBeGreaterThan(0);
      for (const id of ids) {
        expect(id).toBeTypeOf('string');
      }
    });

    it('getSkillContent returns content for known skill', async () => {
      const { getSkillContent, getAllSkillIds } = await import('../src/resources/skillInstructions.js');
      const ids = getAllSkillIds();
      const content = getSkillContent(ids[0]);
      expect(content).toBeTypeOf('string');
      expect(content!.length).toBeGreaterThan(0);
    });

    it('getSkillContent returns null for unknown skill', async () => {
      const { getSkillContent } = await import('../src/resources/skillInstructions.js');
      expect(getSkillContent('nonexistent-skill-xyz')).toBeNull();
    });
  });

  describe('resources (bitbadges-builder-mcp/resources)', () => {
    it('exports resource content', async () => {
      const resources = await import('../src/resources/index.js');

      expect(resources.SKILL_INSTRUCTIONS).toBeDefined();
      expect(Array.isArray(resources.SKILL_INSTRUCTIONS)).toBe(true);
      expect(resources.SKILL_INSTRUCTIONS.length).toBeGreaterThan(0);
    });
  });

  describe('sdk (bitbadges-builder-mcp/sdk)', () => {
    it('exports address utilities', async () => {
      const sdk = await import('../src/sdk/index.js');

      expect(sdk.ethToCosmos).toBeTypeOf('function');
      expect(sdk.cosmosToEth).toBeTypeOf('function');
      expect(sdk.validateAddress).toBeTypeOf('function');
      expect(sdk.toBitBadgesAddress).toBeTypeOf('function');
    });

    it('exports coin registry', async () => {
      const sdk = await import('../src/sdk/index.js');

      expect(sdk.lookupTokenInfo).toBeTypeOf('function');
      expect(sdk.getAllTokens).toBeTypeOf('function');
      expect(sdk.MAINNET_COINS_REGISTRY).toBeDefined();
    });

    it('exports address generator', async () => {
      const sdk = await import('../src/sdk/index.js');

      expect(sdk.generateAlias).toBeTypeOf('function');
      expect(sdk.generateAliasAddressForDenom).toBeTypeOf('function');
    });

    it('validateAddress works for valid ETH address', async () => {
      const { validateAddress } = await import('../src/sdk/index.js');
      const result = validateAddress('0x0000000000000000000000000000000000000001');
      expect(result.valid).toBe(true);
    });

    it('getAllTokens returns non-empty array', async () => {
      const { getAllTokens } = await import('../src/sdk/index.js');
      const tokens = getAllTokens();
      expect(tokens.length).toBeGreaterThan(0);
    });
  });
});
