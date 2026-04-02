/**
 * Recipes Resource
 * Code snippets and decision matrices for common BitBadges operations.
 * Includes the collection-recipes decision matrix (formerly a separate skill).
 */

export interface Recipe {
  id: string;
  name: string;
  description: string;
  tags: string[];
  code: string;
}

export const RECIPES: Recipe[] = [
  // --- Decision Matrices (from collection-recipes skill) ---
  {
    id: 'token-type-decision',
    name: 'Token Type Decision Matrix',
    description: 'Choose the right token type for your use case',
    tags: ['decision', 'type', 'choose', 'collection', 'recipes'],
    code: `// Token Type Decision Tree
//
// | Use Case                  | Token Type       | Key Standards                               | Key Features                                    |
// |---------------------------|-----------------|---------------------------------------------|------------------------------------------------|
// | Cryptocurrency / points   | Fungible Token   | "Fungible Tokens"                           | Single token ID 1                               |
// | Digital collectibles      | NFT Collection   | "NFTs"                                      | Unique token IDs                                |
// | Trading / marketplace     | NFT + Marketplace| "NFTs", "NFTMarketplace", "NFTPricingDenom"  | Orderbook integration                           |
// | Recurring payment         | Subscription     | "Subscriptions"                             | durationFromTimestamp, allowOverrideTimestamp    |
// | Wrapped IBC asset         | Smart Token      | "Smart Token"                               | cosmosCoinBackedPath, alias paths               |
// | Vault / escrow            | Smart Token      | "Smart Token"                               | Non-transferable variant                        |
// | Time-expiring auth        | Custom 2FA       | "Custom-2FA"                                | allowPurgeIfExpired                             |
// | Managed address list      | Address List     | "Address List"                              | Manager add/remove addresses                    |
// | Invoices / payments       | Payment Protocol | "ListView:..."                              | coinTransfer-based approvals                    |
// | Bounty / escrow           | Bounty           | "Bounty"                                    | 5 approvals, verifier voting, expiration        |
// | DEX trading               | + Liquidity Pools| "Liquidity Pools"                           | disablePoolCreation: false, alias paths         |`
  },
  {
    id: 'approval-pattern-decision',
    name: 'Approval Pattern Decision Matrix',
    description: 'Choose the right approval pattern for your needs',
    tags: ['decision', 'approval', 'pattern', 'recipes'],
    code: `// Approval Pattern Decision Tree
//
// | Need                     | Pattern                                                    |
// |--------------------------|------------------------------------------------------------|
// | Anyone can mint          | initiatedByListId: "All"                                   |
// | Only creator mints       | initiatedByListId: "bb1creator..."                         |
// | Pay to mint              | coinTransfers in approvalCriteria                          |
// | Free mint (escrow payout)| mintEscrowCoinsToTransfer + overrideFromWithApproverAddress |
// | Sequential NFT IDs       | incrementedBalances with incrementTokenIdsBy: "1"          |
// | Pay-per-token (any qty)  | incrementedBalances with allowAmountScaling: true           |
// | Limit per address        | maxNumTransfers.perInitiatedByAddressMaxNumTransfers       |
// | Non-transferable         | No transfer approval + lock canUpdateCollectionApprovals   |
// | Token-gated access       | BB-402 with must-own-badges                                |
// | AI-evaluated gate        | AI Criteria Gate (attestation NFT or dynamic store)        |
//
// Permission Defaults:
// | Scenario                | canUpdateCollectionApprovals | canUpdateManager |
// |-------------------------|----------------------------|------------------|
// | Immutable (most secure) | Frozen (all)               | Frozen           |
// | Flexible (updatable)    | Open                       | Open             |
// | Mint-locked only        | Frozen (Mint only)         | Open             |`
  },

  // --- Code Snippets ---
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
    description: 'Build a token transfer transaction',
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

// Return this transaction JSON for user to sign with their wallet`
  },
  {
    id: 'verify-ownership',
    name: 'Verify Token Ownership (Gate Access)',
    description: 'Check if an address owns specific tokens — use for gating',
    tags: ['verify', 'gate', 'access', 'ownership', 'check'],
    code: `// Via MCP tool: verify_ownership
// Supports AND/OR/NOT logic for complex ownership checks
//
// verify_ownership({
//   address: "bb1...",
//   requirements: { collectionId: "123", tokenIds: [{ start: "1", end: "1" }] }
// })

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
    id: 'smart-token-key-points',
    name: 'Smart Token (IBC-Backed) Key Points',
    description: 'Key gotchas and patterns for IBC-backed smart tokens',
    tags: ['smart-token', 'ibc', 'usdc', 'wrapped', 'stablecoin', 'backing'],
    code: `// Smart Token Key Points:
//
// 1. Use generate_backing_address MCP tool to get the deterministic backing address
//    for an IBC denom (e.g., USDC → bb1backingaddr...)
//
// 2. Two approvals required (backing + unbacking). Transferable is common but optional:
//    - Backing (deposit): fromListId: "bb1backingaddr...", toListId: "!bb1backingaddr..."
//      → mustPrioritize: true, allowBackedMinting: true
//    - Transferable (peer-to-peer) (OPTIONAL): fromListId: "!Mint:bb1backingaddr...", toListId: "!Mint:bb1backingaddr..."
//    - Unbacking (withdraw): fromListId: "!Mint:bb1backingaddr...", toListId: "bb1backingaddr..."
//      → mustPrioritize: true, allowBackedMinting: true
//
// 3. Backing addresses are protocol-controlled — overridesFromOutgoingApprovals is irrelevant (leave unset or false).
//    noForcefulPostMintTransfers should be TRUE — smart tokens do NOT need forceful transfer overrides.
// 4. Smart tokens mint from backing address, NOT from "Mint"
// 5. invariants.cosmosCoinBackedPath must be set with the IBC denom conversion
// 6. Need an alias path for liquidity pool / display integration
//
// Use get_skill_instructions("smart-token") for full details`
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
    description: 'Set up a claim with criteria plugins (meet criteria -> get reward)',
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
// All must pass (customizable) -> reward distributed`
  },
  {
    id: 'address-conversion',
    name: 'Convert Between Address Formats',
    description: 'Convert ETH (0x) <-> BitBadges (bb1) addresses',
    tags: ['address', 'convert', 'eth', 'cosmos', 'bb1', '0x'],
    code: `import { ethToCosmos, cosmosToEth } from 'bitbadgesjs-sdk';

// ETH -> BitBadges
const bb1Address = ethToCosmos('0x1234...');

// BitBadges -> ETH
const ethAddress = cosmosToEth('bb1...');

// Or via MCP: convert_address({ address: "0x1234..." })

// IMPORTANT: This is byte-level conversion (same key, different encoding)
// This is NOT public key derivation — both addresses share the same key pair`
  },
  {
    id: 'vault-withdraw',
    name: 'Withdraw from Smart Token Vault',
    description: 'Convert smart token back to underlying IBC asset',
    tags: ['vault', 'withdraw', 'redeem', 'unbacking', 'smart-token'],
    code: `// To withdraw (unback) from a smart token vault:
// This burns vault tokens and releases the underlying IBC asset

const withdrawMsg = {
  typeUrl: '/tokenization.MsgTransferTokens',
  value: {
    creator: 'bb1youraddress...',
    collectionId: '456',  // vault collection ID
    transfers: [{
      from: 'bb1youraddress...',
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

// Return this transaction JSON for user to sign with their wallet`
  },
  {
    id: 'bb402-gated-api',
    name: 'BB-402: Token-Gated API Access',
    description: 'Gate an API endpoint behind token ownership verification',
    tags: ['bb-402', 'gate', 'api', 'token-gated', 'access-control'],
    code: `// BB-402: Verify token ownership before granting API access

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

// Express middleware pattern:
// app.use('/protected', async (req, res, next) => {
//   const hasAccess = await verifyAccess(req.headers['x-bitbadges-address']);
//   if (!hasAccess) return res.status(402).json({ error: 'Token required' });
//   next();
// });`
  },
  {
    id: 'bounty-escrow',
    name: 'Bounty Escrow Pattern',
    description: 'Create a bounty with escrow, verifier arbitration, and expiration',
    tags: ['bounty', 'escrow', 'verifier', 'voting', 'expiration'],
    code: `// Bounty Standard — 3 Approvals (escrow pre-funded via mintEscrowCoinsToTransfer)
// All 3 approvals: Mint → burn (1x token ID 1), maxNumTransfers=1 (one-shot)
// Token is just a vehicle for the approval engine's coinTransfer
//
// 1. Accept: Mint → burn, coinTransfers escrow → recipient, votingChallenge (verifier), transferTimes [1, expiration]
// 2. Deny: Mint → burn, coinTransfers escrow → submitter, votingChallenge (verifier), transferTimes [1, expiration]
// 3. Expire: Mint → burn, coinTransfers escrow → submitter, NO vote, transferTimes [expiration+1, MAX]
//
// Key: Escrow funded at creation via mintEscrowCoinsToTransfer
// Key: No allowAmountScaling — fixed amount at creation
// Key: coinTransfers use overrideFromWithApproverAddress=true (escrow pays) + overrideToWithInitiator=false (hardcoded recipient)
// Key: Accept/Deny gated by votingChallenges with verifier as sole voter (quorum=100, weight=1)
// Key: Expiration enforced via non-overlapping transferTimes windows
//
// Settlement: MsgCastVote { approval_id, proposal_id, yes_weight: "100" }
// Claim: MsgTransferTokens burn to bb1qqq...s7gvmv with prioritizedApprovals
//
// Standards: ["Bounty"]
// Valid token IDs: [{ start: "1", end: "1" }]
// Invariants: { noCustomOwnershipTimes: true, disablePoolCreation: true }
// Permissions: ALL frozen`
  }
];

export const recipesResourceInfo = {
  uri: 'bitbadges://recipes/all',
  name: 'Code Recipes & Decision Matrices',
  description: 'Code snippets and decision matrices for common BitBadges operations',
  mimeType: 'text/markdown'
};

/**
 * Get all recipes as markdown
 */
export function getRecipesContent(): string {
  let content = '# BitBadges Code Recipes & Decision Matrices\n\n';
  content += 'Snippets and decision guides for common operations.\n\n';

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
