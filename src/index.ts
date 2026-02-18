#!/usr/bin/env node

/**
 * BitBadges Builder MCP Server
 *
 * Enable natural language collection creation via MCP.
 *
 * Example usage:
 * > "Create a 1:1 backed USDC stablecoin with 100 USDC/day spend limit"
 *
 * Supported collection types:
 * - Smart Tokens (IBC-backed stablecoins, wrapped assets)
 * - Fungible Tokens (ERC-20 style)
 * - NFT Collections
 * - Subscriptions
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './server.js';

async function main() {
  const server = createServer();
  const transport = new StdioServerTransport();

  await server.connect(transport);

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    await server.close();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await server.close();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
