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
  generateBackingAddressTool,
  handleGenerateBackingAddress,
  generateApprovalTool,
  handleGenerateApproval,
  generatePermissionsTool,
  handleGeneratePermissions,
  generateAliasPathTool,
  handleGenerateAliasPath,
  buildTokenTool,
  handleBuildToken,
  buildAddressListTool,
  handleBuildAddressList,
  // Address utilities
  convertAddressTool,
  handleConvertAddress,
  validateAddressTool,
  handleValidateAddress,
  // Documentation
  fetchDocsTool,
  handleFetchDocs,
  // Query tools
  queryCollectionTool,
  handleQueryCollection,
  queryBalanceTool,
  handleQueryBalance,
  simulateTransactionTool,
  handleSimulateTransaction,
  verifyOwnershipTool,
  handleVerifyOwnership,
  searchTool,
  handleSearch,
  searchPluginsTool,
  handleSearchPlugins,
  // Knowledge base tools
  searchKnowledgeBaseTool,
  handleSearchKnowledgeBase,
  diagnoseErrorTool,
  handleDiagnoseError,
  // Collection analysis tools
  analyzeCollectionTool,
  handleAnalyzeCollection,
  buildTransferTool,
  handleBuildTransfer,
  // Dynamic store tools
  buildDynamicStoreTool,
  handleBuildDynamicStore,
  queryDynamicStoreTool,
  handleQueryDynamicStore,
  // Audit tool
  auditCollectionTool,
  handleAuditCollection,
  // Explain tool
  explainCollectionTool,
  handleExplainCollection,
  // Claim builder
  buildClaimTool,
  handleBuildClaim,
  // Session-based per-field tools (v2)
  setStandardsTool, handleSetStandards,
  setValidTokenIdsTool, handleSetValidTokenIds,
  setDefaultBalancesTool, handleSetDefaultBalances,
  setPermissionsTool, handleSetPermissions,
  setInvariantsTool, handleSetInvariants,
  setManagerTool, handleSetManager,
  setCollectionMetadataTool, handleSetCollectionMetadata,
  setTokenMetadataTool, handleSetTokenMetadata,
  setCustomDataTool, handleSetCustomData,
  addApprovalTool, handleAddApproval,
  removeApprovalTool, handleRemoveApproval,
  setApprovalMetadataTool, handleSetApprovalMetadata,
  addAliasPathTool, handleAddAliasPath,
  removeAliasPathTool, handleRemoveAliasPath,
  addCosmosWrapperPathTool, handleAddCosmosWrapperPath,
  removeCosmosWrapperPathTool, handleRemoveCosmosWrapperPath,
  addTransferTool, handleAddTransfer,
  removeTransferTool, handleRemoveTransfer,
  getTransactionTool, handleGetTransaction
} from './tools/index.js';

// Import resources
import {
  tokenRegistryResourceInfo,
  getTokenRegistryContent,
  formatTokenRegistryForDisplay,
  masterPromptResourceInfo,
  getMasterPromptContent,
  getSkillInstructions,
  getAllSkillInstructions,
  formatSkillInstructionsForDisplay,
  // Documentation resources
  conceptsDocsResourceInfo,
  getConceptsDocsContent,
  examplesDocsResourceInfo,
  getExamplesDocsContent,
  // Knowledge base resources
  recipesResourceInfo,
  getRecipesContent,
  learningsResourceInfo,
  getLearningsContent,
  errorPatternsResourceInfo,
  getErrorPatternsContent,
  frontendDocsResourceInfo,
  getFrontendDocsContent,
  workflowsResourceInfo,
  getWorkflowsContent,
  tokenSchemaResourceInfo,
  getTokenSchemaContent
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

        // Components
        generateBackingAddressTool,
        generateApprovalTool,
        generatePermissionsTool,
        generateAliasPathTool,

        // High-level builders
        buildTokenTool,
        buildAddressListTool,

        // Skill instructions tool
        {
          name: 'get_skill_instructions',
          description: 'Get detailed instructions for a specific skill. Skills: smart-token, fungible-token, nft-collection, subscription, bb-402, ai-criteria-gate, minting, custom-2fa, immutability, liquidity-pools, payment-protocol, verified, tradable, address-list, burnable, multi-sig-voting, credit-token. Decision matrices are in bitbadges://recipes/all.',
          inputSchema: {
            type: 'object',
            properties: {
              skillId: {
                type: 'string',
                description: 'Skill ID: smart-token, minting, liquidity-pools, fungible-token, nft-collection, subscription, immutability, custom-2fa, address-list, bb-402, burnable, multi-sig-voting, ai-criteria-gate, verified, payment-protocol, tradable, credit-token'
              }
            },
            required: ['skillId']
          }
        },

        // Address utilities
        convertAddressTool,
        validateAddressTool,

        // Documentation
        fetchDocsTool,

        // Knowledge base tools
        searchKnowledgeBaseTool,
        diagnoseErrorTool,

        // Query tools (require API key)
        queryCollectionTool,
        queryBalanceTool,
        simulateTransactionTool,
        verifyOwnershipTool,
        searchTool,
        searchPluginsTool,

        // Collection analysis (require API key)
        analyzeCollectionTool,
        buildTransferTool,

        // Dynamic store tools
        buildDynamicStoreTool,
        queryDynamicStoreTool,

        // Audit tool
        auditCollectionTool,

        // Explain tool
        explainCollectionTool,

        // Claim builder
        buildClaimTool,

        // Session-based per-field tools (v2)
        setStandardsTool,
        setValidTokenIdsTool,
        setDefaultBalancesTool,
        setPermissionsTool,
        setInvariantsTool,
        setManagerTool,
        setCollectionMetadataTool,
        setTokenMetadataTool,
        setCustomDataTool,
        addApprovalTool,
        removeApprovalTool,
        setApprovalMetadataTool,
        addAliasPathTool,
        removeAliasPathTool,
        addCosmosWrapperPathTool,
        removeCosmosWrapperPathTool,
        addTransferTool,
        removeTransferTool,
        getTransactionTool
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
        case 'build_token': {
          const result = handleBuildToken(args as Parameters<typeof handleBuildToken>[0]);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }


        case 'build_address_list': {
          const result = handleBuildAddressList(args as Parameters<typeof handleBuildAddressList>[0]);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'audit_collection': {
          const result = handleAuditCollection(args as Parameters<typeof handleAuditCollection>[0]);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'explain_collection': {
          const result = handleExplainCollection(args as Parameters<typeof handleExplainCollection>[0]);
          return {
            content: [{ type: 'text', text: result.success ? result.explanation : JSON.stringify(result, null, 2) }]
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

        // Address utilities
        case 'convert_address': {
          const result = handleConvertAddress(args as Parameters<typeof handleConvertAddress>[0]);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'validate_address': {
          const result = handleValidateAddress(args as Parameters<typeof handleValidateAddress>[0]);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        // Documentation
        case 'fetch_docs': {
          const result = await handleFetchDocs(args as Parameters<typeof handleFetchDocs>[0]);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        // Knowledge base tools
        case 'search_knowledge_base': {
          const result = handleSearchKnowledgeBase(args as Parameters<typeof handleSearchKnowledgeBase>[0]);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'diagnose_error': {
          const result = handleDiagnoseError(args as Parameters<typeof handleDiagnoseError>[0]);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        // Query tools
        case 'query_collection': {
          const result = await handleQueryCollection(args as Parameters<typeof handleQueryCollection>[0]);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'query_balance': {
          const result = await handleQueryBalance(args as Parameters<typeof handleQueryBalance>[0]);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'simulate_transaction': {
          const result = await handleSimulateTransaction(args as Parameters<typeof handleSimulateTransaction>[0]);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'verify_ownership': {
          const result = await handleVerifyOwnership(args as Parameters<typeof handleVerifyOwnership>[0]);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'search': {
          const result = await handleSearch(args as Parameters<typeof handleSearch>[0]);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'search_plugins': {
          const result = await handleSearchPlugins(args as Parameters<typeof handleSearchPlugins>[0]);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        // Collection analysis tools
        case 'analyze_collection': {
          const result = await handleAnalyzeCollection(args as Parameters<typeof handleAnalyzeCollection>[0]);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'build_transfer': {
          const result = await handleBuildTransfer(args as Parameters<typeof handleBuildTransfer>[0]);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        // Dynamic store tools
        case 'build_dynamic_store': {
          const result = handleBuildDynamicStore(args as Parameters<typeof handleBuildDynamicStore>[0]);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'query_dynamic_store': {
          const result = await handleQueryDynamicStore(args as Parameters<typeof handleQueryDynamicStore>[0]);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        case 'build_claim': {
          const result = handleBuildClaim(args as Parameters<typeof handleBuildClaim>[0]);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
          };
        }

        // Session-based per-field tools (v2)
        case 'set_standards': {
          const result = handleSetStandards(args as any);
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        }
        case 'set_valid_token_ids': {
          const result = handleSetValidTokenIds(args as any);
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        }
        case 'set_default_balances': {
          const result = handleSetDefaultBalances(args as any);
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        }
        case 'set_permissions': {
          const result = handleSetPermissions(args as any);
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        }
        case 'set_invariants': {
          const result = handleSetInvariants(args as any);
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        }
        case 'set_manager': {
          const result = handleSetManager(args as any);
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        }
        case 'set_collection_metadata': {
          const result = handleSetCollectionMetadata(args as any);
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        }
        case 'set_token_metadata': {
          const result = handleSetTokenMetadata(args as any);
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        }
        case 'set_custom_data': {
          const result = handleSetCustomData(args as any);
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        }
        case 'add_approval': {
          const result = handleAddApproval(args as any);
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        }
        case 'remove_approval': {
          const result = handleRemoveApproval(args as any);
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        }
        case 'set_approval_metadata': {
          const result = handleSetApprovalMetadata(args as any);
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        }
        case 'add_alias_path': {
          const result = handleAddAliasPath(args as any);
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        }
        case 'remove_alias_path': {
          const result = handleRemoveAliasPath(args as any);
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        }
        case 'add_cosmos_wrapper_path': {
          const result = handleAddCosmosWrapperPath(args as any);
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        }
        case 'remove_cosmos_wrapper_path': {
          const result = handleRemoveCosmosWrapperPath(args as any);
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        }
        case 'add_transfer': {
          const result = handleAddTransfer(args as any);
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        }
        case 'remove_transfer': {
          const result = handleRemoveTransfer(args as any);
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        }
        case 'get_transaction': {
          const result = handleGetTransaction(args as any);
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
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
        },
        // Documentation resources
        conceptsDocsResourceInfo,
        examplesDocsResourceInfo,
        // Knowledge base resources
        recipesResourceInfo,
        learningsResourceInfo,
        errorPatternsResourceInfo,
        frontendDocsResourceInfo,
        workflowsResourceInfo,
        tokenSchemaResourceInfo
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

      // Documentation resources
      case 'bitbadges://docs/concepts': {
        return {
          contents: [{
            uri,
            mimeType: 'text/markdown',
            text: getConceptsDocsContent()
          }]
        };
      }

      case 'bitbadges://docs/examples': {
        return {
          contents: [{
            uri,
            mimeType: 'text/markdown',
            text: getExamplesDocsContent()
          }]
        };
      }

      // Knowledge base resources
      case 'bitbadges://recipes/all': {
        return {
          contents: [{
            uri,
            mimeType: 'text/markdown',
            text: getRecipesContent()
          }]
        };
      }

      case 'bitbadges://learnings/all': {
        return {
          contents: [{
            uri,
            mimeType: 'text/markdown',
            text: getLearningsContent()
          }]
        };
      }

      case 'bitbadges://errors/patterns': {
        return {
          contents: [{
            uri,
            mimeType: 'text/markdown',
            text: getErrorPatternsContent()
          }]
        };
      }

      case 'bitbadges://docs/frontend': {
        return {
          contents: [{
            uri,
            mimeType: 'text/markdown',
            text: getFrontendDocsContent()
          }]
        };
      }

      case 'bitbadges://workflows/all': {
        return {
          contents: [{
            uri,
            mimeType: 'text/markdown',
            text: getWorkflowsContent()
          }]
        };
      }

      case 'bitbadges://schema/token-builder': {
        return {
          contents: [{
            uri,
            mimeType: 'text/markdown',
            text: getTokenSchemaContent()
          }]
        };
      }

      default:
        throw new Error(`Unknown resource: ${uri}`);
    }
  });

  return server;
}
