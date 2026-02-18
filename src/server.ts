/**
 * BitBadges Builder MCP Server Configuration
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema, ListResourcesRequestSchema, ReadResourceRequestSchema } from '@modelcontextprotocol/sdk/types.js';

// Import tool definitions and handlers
import {
  lookupTokenInfoTool,
  handleLookupTokenInfo,
  validateTransactionTool,
  handleValidateTransaction,
  getCurrentTimestampTool,
  handleGetCurrentTimestamp,
  publishToBitbadgesTool,
  handlePublishToBitbadges,
  generateBackingAddressTool,
  handleGenerateBackingAddress,
  generateApprovalTool,
  handleGenerateApproval,
  generatePermissionsTool,
  handleGeneratePermissions,
  generateAliasPathTool,
  handleGenerateAliasPath,
  buildSmartTokenTool,
  handleBuildSmartToken,
  buildFungibleTokenTool,
  handleBuildFungibleToken,
  buildNFTCollectionTool,
  handleBuildNFTCollection
} from './tools/index.js';

// Import resources
import {
  tokenRegistryResourceInfo,
  getTokenRegistryContent,
  formatTokenRegistryForDisplay,
  masterPromptResourceInfo,
  getMasterPromptContent,
  getSmartTokenRules,
  getSkillInstructions,
  getAllSkillInstructions,
  formatSkillInstructionsForDisplay
} from './resources/index.js';

/**
 * Create and configure the MCP server
 */
export function createServer(): Server {
  const server = new Server(
    {
      name: 'bitbadges-builder-mcp',
      version: '1.0.0'
    },
    {
      capabilities: {
        tools: {},
        resources: {}
      }
    }
  );

  // Register tool list handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        // Utilities
        lookupTokenInfoTool,
        validateTransactionTool,
        getCurrentTimestampTool,
        publishToBitbadgesTool,

        // Components
        generateBackingAddressTool,
        generateApprovalTool,
        generatePermissionsTool,
        generateAliasPathTool,

        // High-level builders
        buildSmartTokenTool,
        buildFungibleTokenTool,
        buildNFTCollectionTool,

        // Skill instructions tool
        {
          name: 'get_skill_instructions',
          description: 'Get instructions for a specific skill (smart-token, fungible-token, nft-collection, subscription)',
          inputSchema: {
            type: 'object',
            properties: {
              skillId: {
                type: 'string',
                description: 'Skill ID: smart-token, fungible-token, nft-collection, or subscription'
              }
            },
            required: ['skillId']
          }
        },

        // Master prompt tool
        {
          name: 'get_master_prompt',
          description: 'Get the complete builder master prompt with critical rules',
          inputSchema: {
            type: 'object',
            properties: {},
            required: []
          }
        }
      ]
    };
  });

  // Register tool call handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        // Utilities
        case 'lookup_token_info': {
          const result = handleLookupTokenInfo(args as { query: string });
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'validate_transaction': {
          const result = handleValidateTransaction(args as { transactionJson: string });
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'get_current_timestamp': {
          const result = handleGetCurrentTimestamp(args as { offsetMs?: number; offsetDays?: number; offsetHours?: number });
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'publish_to_bitbadges': {
          const result = await handlePublishToBitbadges(args as Parameters<typeof handlePublishToBitbadges>[0]);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        // Components
        case 'generate_backing_address': {
          const result = handleGenerateBackingAddress(args as { ibcDenom: string });
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'generate_approval': {
          const result = handleGenerateApproval(args as Parameters<typeof handleGenerateApproval>[0]);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'generate_permissions': {
          const result = handleGeneratePermissions(args as Parameters<typeof handleGeneratePermissions>[0]);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'generate_alias_path': {
          const result = handleGenerateAliasPath(args as Parameters<typeof handleGenerateAliasPath>[0]);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        // High-level builders
        case 'build_smart_token': {
          const result = handleBuildSmartToken(args as Parameters<typeof handleBuildSmartToken>[0]);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'build_fungible_token': {
          const result = handleBuildFungibleToken(args as Parameters<typeof handleBuildFungibleToken>[0]);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'build_nft_collection': {
          const result = handleBuildNFTCollection(args as Parameters<typeof handleBuildNFTCollection>[0]);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        // Skill instructions
        case 'get_skill_instructions': {
          const skillId = (args as { skillId: string }).skillId;
          const instruction = getSkillInstructions(skillId);
          if (instruction) {
            return {
              content: [{ type: 'text', text: JSON.stringify(instruction, null, 2) }]
            };
          } else {
            const allSkills = getAllSkillInstructions();
            return {
              content: [{
                type: 'text',
                text: `Skill "${skillId}" not found. Available skills: ${allSkills.map(s => s.id).join(', ')}`
              }]
            };
          }
        }

        // Master prompt
        case 'get_master_prompt': {
          const content = getMasterPromptContent();
          const smartTokenRules = getSmartTokenRules();
          return {
            content: [{
              type: 'text',
              text: content + '\n\n' + smartTokenRules
            }]
          };
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  });

  // Register resource list handler
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources: [
        tokenRegistryResourceInfo,
        masterPromptResourceInfo,
        {
          uri: 'bitbadges://skills/all',
          name: 'Skill Instructions',
          description: 'Instructions for all builder skills',
          mimeType: 'text/markdown'
        }
      ]
    };
  });

  // Register resource read handler
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;

    switch (uri) {
      case 'bitbadges://tokens/registry': {
        const content = getTokenRegistryContent();
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(content, null, 2)
          }]
        };
      }

      case 'bitbadges://rules/critical': {
        return {
          contents: [{
            uri,
            mimeType: 'text/markdown',
            text: getMasterPromptContent()
          }]
        };
      }

      case 'bitbadges://skills/all': {
        return {
          contents: [{
            uri,
            mimeType: 'text/markdown',
            text: formatSkillInstructionsForDisplay()
          }]
        };
      }

      default:
        throw new Error(`Unknown resource: ${uri}`);
    }
  });

  return server;
}
