/**
 * Recipes Resource
 * Copy-paste code snippets for common BitBadges operations
 */

export interface Recipe {
  id: string;
  name: string;
  description: string;
  tags: string[];
  code: string;
}

export const RECIPES: Recipe[] = [
  {
    id: 'mint-fungible',
    name: 'Mint a Fungible Token',
    description: 'Create a new fungible token collection with unlimited supply and broadcast it',
    tags: ['mint', 'fungible', 'create', 'collection'],
    code: `import { BitBadgesAPI } from 'bitbadgesjs-sdk';

// 1. Build the transaction using MCP: build_fungible_token
// 2. Validate: validate_transaction
// 3. Sign and broadcast:
const result = await BitBadgesAPI.signAndBroadcast({
  messages: [/* from build_fungible_token */],
  memo: '',
  fee: { amount: [{ denom: 'ubadge', amount: '5000' }], gas: '500000' }
});

// Or use MCP tools directly:
// build_fungible_token → validate_transaction → simulate_transaction → sign_and_broadcast`
  },
  {
    id: 'check-balance',
    name: 'Check Token Balance',
    description: 'Query a specific address balance in a collection',
    tags: ['balance', 'query', 'ownership', 'check'],
    code: `import { BitBadgesAPI } from 'bitbadgesjs-sdk';

const api = new BitBadgesAPI({ apiUrl: 'https://api.bitbadges.io', apiKey: process.env.BITBADGES_API_KEY });

const balance = await api.getBalanceByAddress(collectionId, 'bb1address...');
console.log(balance.balances); // Balance[]

// Or via MCP: query_balance({ collectionId: "123", address: "bb1..." })`
  },
  {
    id: 'transfer-tokens',
    name: 'Transfer Tokens Between Addresses',
    description: 'Build and broadcast a token transfer',
    tags: ['transfer', 'send', 'move'],
    code: `// MsgTransferTokens — ALWAYS include prioritizedApprovals (even if [])
const transferMsg = {
  typeUrl: '/tokenization.MsgTransferTokens',
  value: {
    creator: 'bb1sender...',
    collectionId: '123',
    transfers: [{
      from: 'bb1sender...',
      toAddresses: ['bb1recipient...'],
      balances: [{
        amount: '100',
        tokenIds: [{ start: '1', end: '1' }],
        ownershipTimes: [{ start: '1', end: '18446744073709551615' }]
      }],
      prioritizedApprovals: [],  // CRITICAL: always include this
      onlyCheckPrioritizedApprovals: false
    }]
  }
};

// sign_and_broadcast({ messages: [transferMsg], ... })`
  },
  {
    id: 'verify-ownership',
    name: 'Verify Token Ownership (Gate Access)',
    description: 'Check if an address owns specific tokens — use for gating',
    tags: ['verify', 'gate', 'access', 'ownership', 'check'],
    code: `// Via MCP tool: verify_ownership
// Supports AND/OR/NOT logic for complex ownership checks

// Simple check:
// verify_ownership({ address: "bb1...", requirements: { collectionId: "123", tokenIds: [{ start: "1", end: "1" }] } })

// Via SDK:
import { BitBadgesAPI } from 'bitbadgesjs-sdk';

const api = new BitBadgesAPI({ apiUrl: 'https://api.bitbadges.io', apiKey: process.env.BITBADGES_API_KEY });
const balance = await api.getBalanceByAddress('123', 'bb1address...');
const hasToken = balance.balances.some(b =>
  BigInt(b.amount) > 0n &&
  b.tokenIds.some(r => BigInt(r.start) <= 1n && BigInt(r.end) >= 1n)
);`
  },
  {
    id: 'create-smart-token',
    name: 'Create IBC-Backed Smart Token (e.g., Wrapped USDC)',
    description: 'Create a smart token backed 1:1 by an IBC asset',
    tags: ['smart-token', 'ibc', 'usdc', 'wrapped', 'stablecoin', 'backing'],
    code: `// Use MCP: build_smart_token({ backingDenom: "USDC", ... })
// This handles:
//   - Deterministic backing address generation
//   - Backing/unbacking approval setup (mustPrioritize: true, allowBackedMinting: true)
//   - cosmosCoinBackedPath in invariants
//   - Alias path for liquidity pools

// Key gotchas:
// - NO overridesFromOutgoingApprovals on backing address approvals
// - Smart tokens mint from backing address, NOT from "Mint"
// - fromListId for backing: "bb1backingaddress..."
// - fromListId for unbacking: "!Mint:bb1backingaddress..."
// - toListId for unbacking: "bb1backingaddress..."`
  },
  {
    id: 'websocket-events',
    name: 'Subscribe to Blockchain Events (WebSocket)',
    description: 'Listen for real-time transfers, mints, and collection updates',
    tags: ['websocket', 'events', 'subscribe', 'listen', 'reactive', 'bot'],
    code: `import WebSocket from 'ws';

const ws = new WebSocket('wss://rpc.bitbadges.io/websocket');

ws.on('open', () => {
  // Subscribe to transfer events
  ws.send(JSON.stringify({
    jsonrpc: '2.0',
    method: 'subscribe',
    id: 1,
    params: {
      query: "tm.event='Tx' AND message.action='/badges.MsgTransferTokens'"
    }
  }));
});

ws.on('message', (data) => {
  const event = JSON.parse(data.toString());
  if (event.result?.events) {
    // Process transfer event
    console.log('Transfer detected:', event.result.events);
  }
});

// Implement reconnection with exponential backoff for production`
  },
  {
    id: 'create-claim',
    name: 'Create a Gated Claim',
    description: 'Set up a claim with criteria plugins (meet criteria → get reward)',
    tags: ['claim', 'gate', 'criteria', 'plugin', 'reward'],
    code: `// Claims are best created via the BitBadges developer portal (in-site)
// But can be managed via API:

// 1. Create claim via developer portal at https://bitbadges.io
// 2. Use claims API to check/trigger programmatically:

import { BitBadgesAPI } from 'bitbadgesjs-sdk';
const api = new BitBadgesAPI({ apiUrl: 'https://api.bitbadges.io', apiKey: process.env.BITBADGES_API_KEY });

// Check claim eligibility
// Use dynamic stores for pre-computed eligibility
// Connect to Zapier AI Actions for automated workflows

// Key pattern: claims = plugins executed in order
// All must pass (customizable) → reward distributed`
  },
  {
    id: 'address-conversion',
    name: 'Convert Between Address Formats',
    description: 'Convert ETH (0x) ↔ BitBadges (bb1) addresses',
    tags: ['address', 'convert', 'eth', 'cosmos', 'bb1', '0x'],
    code: `import { ethToCosmos, cosmosToEth } from 'bitbadgesjs-sdk';

// ETH → BitBadges
const bb1Address = ethToCosmos('0x1234...');

// BitBadges → ETH
const ethAddress = cosmosToEth('bb1...');

// Or via MCP: convert_address({ address: "0x1234..." })

// IMPORTANT: This is byte-level conversion (same private key, different encoding)
// This is NOT public key derivation — both addresses share the same key pair`
  },
  {
    id: 'vault-withdraw',
    name: 'Withdraw from AI Agent Vault (Smart Token)',
    description: 'Convert smart token back to underlying IBC asset',
    tags: ['vault', 'withdraw', 'redeem', 'unbacking', 'smart-token'],
    code: `// To withdraw (unback) from a smart token vault:
// This burns vault tokens and releases the underlying IBC asset

const withdrawMsg = {
  typeUrl: '/tokenization.MsgTransferTokens',
  value: {
    creator: 'bb1agentaddress...',
    collectionId: '456',  // vault collection ID
    transfers: [{
      from: 'bb1agentaddress...',
      toAddresses: ['bb1backingaddress...'],  // send TO backing address to unback
      balances: [{
        amount: '1000000',  // amount in base units
        tokenIds: [{ start: '1', end: '1' }],
        ownershipTimes: [{ start: '1', end: '18446744073709551615' }]
      }],
      prioritizedApprovals: [{
        approvalId: 'smart-token-unbacking',
        approvalLevel: 'collection',
        approverAddress: ''
      }],
      onlyCheckPrioritizedApprovals: false
    }]
  }
};

// sign_and_broadcast({ messages: [withdrawMsg], ... })`
  },
  {
    id: 'bb402-gated-api',
    name: 'BB-402: Token-Gated API Access',
    description: 'Gate an API endpoint behind token ownership verification',
    tags: ['bb-402', 'gate', 'api', 'token-gated', 'access-control'],
    code: `// BB-402: Verify token ownership before granting API access
// Instead of per-request payments, check ownership once

// Server-side verification:
// 1. Client presents their address
// 2. Server verifies ownership via MCP or API

// Via MCP:
// verify_ownership({
//   address: "bb1clientaddress...",
//   requirements: {
//     collectionId: "789",
//     tokenIds: [{ start: "1", end: "1" }],
//     amountRange: { start: "1", end: "18446744073709551615" }
//   }
// })

// Via SDK:
import { BitBadgesAPI } from 'bitbadgesjs-sdk';
const api = new BitBadgesAPI({ apiUrl: 'https://api.bitbadges.io', apiKey: process.env.BITBADGES_API_KEY });

async function verifyAccess(userAddress: string): Promise<boolean> {
  const balance = await api.getBalanceByAddress('789', userAddress);
  return balance.balances.some(b => BigInt(b.amount) > 0n);
}

// Middleware pattern:
// app.use('/protected', async (req, res, next) => {
//   const hasAccess = await verifyAccess(req.headers['x-bitbadges-address']);
//   if (!hasAccess) return res.status(402).json({ error: 'Token required' });
//   next();
// });`
  }
];

export const recipesResourceInfo = {
  uri: 'bitbadges://recipes/all',
  name: 'Code Recipes',
  description: 'Copy-paste code snippets for common BitBadges operations',
  mimeType: 'text/markdown'
};

/**
 * Get all recipes as markdown
 */
export function getRecipesContent(): string {
  let content = '# BitBadges Code Recipes\n\n';
  content += 'Copy-paste snippets for common operations.\n\n';

  for (const recipe of RECIPES) {
    content += `## ${recipe.name}\n\n`;
    content += `${recipe.description}\n\n`;
    content += `**Tags:** ${recipe.tags.join(', ')}\n\n`;
    content += '```typescript\n';
    content += recipe.code;
    content += '\n```\n\n---\n\n';
  }

  return content;
}

/**
 * Find a recipe by ID or search by tags/name
 */
export function findRecipe(query: string): Recipe | undefined {
  const q = query.toLowerCase();

  // Exact ID match
  const byId = RECIPES.find(r => r.id === q);
  if (byId) return byId;

  // Tag match
  const byTag = RECIPES.find(r => r.tags.some(t => t === q));
  if (byTag) return byTag;

  // Fuzzy name/tag match
  return RECIPES.find(r =>
    r.name.toLowerCase().includes(q) ||
    r.tags.some(t => t.includes(q) || q.includes(t))
  );
}
