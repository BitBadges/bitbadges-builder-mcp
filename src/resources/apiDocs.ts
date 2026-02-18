/**
 * API Documentation Resource
 * Reference for BitBadges API usage
 */

export interface ApiDocsResource {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

export const apiDocsResourceInfo: ApiDocsResource = {
  uri: 'bitbadges://docs/api',
  name: 'API Reference',
  description: 'BitBadges API endpoints, authentication, and rate limits',
  mimeType: 'text/markdown'
};

/**
 * Embedded API documentation content
 */
export const API_DOCS_CONTENT = {
  overview: `# BitBadges API Reference

## Base URLs

| Environment | URL |
|-------------|-----|
| **Mainnet** | https://api.bitbadges.io |
| **Testnet** | https://api.bitbadges.io/testnet |
| **RPC** | https://rpc.bitbadges.io |
| **LCD** | https://lcd.bitbadges.io |

## Other Resources

| Resource | URL |
|----------|-----|
| Explorer | https://explorer.bitbadges.io/BitBadges%20Mainnet |
| Docs | https://docs.bitbadges.io |
| OpenAPI Spec | https://raw.githubusercontent.com/bitbadges/bitbadgesjs/main/packages/bitbadgesjs-sdk/openapi-hosted/openapi.json |`,

  authentication: `## Authentication

### API Key

1. Create an API key at https://bitbadges.io/developer → API Keys tab
2. Include the key in HTTP headers:

\`\`\`
x-api-key: YOUR_API_KEY
\`\`\`

### Rate Limits

| Tier | Daily Limit | Batch Size |
|------|-------------|------------|
| Free | 10,000 requests | 250 items |
| Paid | Higher limits | Higher limits |

Upgrade at https://bitbadges.io/pricing

### Using with SDK

\`\`\`typescript
import { BitBadgesAPI, BigIntify } from 'bitbadgesjs-sdk';

const BitBadgesApi = new BitBadgesAPI({
  apiKey: process.env.BITBADGES_API_KEY,
  convertFunction: BigIntify,
  apiUrl: 'https://api.bitbadges.io'
});
\`\`\``,

  pagination: `## Pagination

BitBadges API uses bookmark-based pagination.

### Flow

1. **First request**: No bookmark needed (empty string)
2. **Response**: Contains \`bookmark\` and \`hasMore\`
3. **Next page**: Use returned \`bookmark\` in next request
4. **Repeat**: Until \`hasMore: false\`

### Example

\`\`\`typescript
// First request
let response = await BitBadgesApi.getCollections({
  collectionsToFetch: [{ collectionId: "1" }],
  bookmark: ""  // First page
});

// Check for more pages
while (response.hasMore) {
  response = await BitBadgesApi.getCollections({
    collectionsToFetch: [{ collectionId: "1" }],
    bookmark: response.bookmark
  });
}
\`\`\``,

  keyEndpoints: `## Key Endpoints

### Collections

\`\`\`typescript
// Get collection details
POST /api/v0/collections
await BitBadgesApi.getCollections({
  collectionsToFetch: [{
    collectionId: "1",
    metadataToFetch: { uris: [] },  // Optional metadata
    fetchTotalAndMintBalances: true
  }]
});
\`\`\`

### Accounts

\`\`\`typescript
// Get account details and balances
POST /api/v0/users
await BitBadgesApi.getAccounts({
  accountsToFetch: [{
    address: "bb1...",
    fetchBalance: true,
    collectionsToFetch: [{ collectionId: "1" }]
  }]
});
\`\`\`

### Balance

\`\`\`typescript
// Get specific balance
POST /api/v0/collections/:collectionId/balance/:address
await BitBadgesApi.getBalanceByAddress(collectionId, address);
\`\`\`

### Search

\`\`\`typescript
// Search collections, accounts, lists
POST /api/v0/search
await BitBadgesApi.getSearchResults({
  searchValue: "my collection",
  specificCollectionId: ""  // Optional filter
});
\`\`\``,

  simulation: `## Transaction Simulation

Validate transactions before broadcasting.

### Simulate

\`\`\`typescript
// Simulate transaction
POST /api/v0/simulate
await BitBadgesApi.simulateTx({
  txs: [{
    context: { address: "bb1...", chain: "eth" },
    messages: [...],
    memo: "",
    fee: { amount: [{ denom: "ubadge", amount: "5000" }], gas: "500000" }
  }]
});
\`\`\`

### Response

\`\`\`typescript
{
  success: true,
  results: [{
    gasUsed: "250000",
    events: [...],
    error: null  // null if successful
  }]
}
\`\`\`

### Broadcast

\`\`\`typescript
// Broadcast signed transaction
POST /api/v0/broadcast
await BitBadgesApi.broadcastTx({
  txBytes: "...",  // Signed transaction bytes
  mode: "BROADCAST_MODE_SYNC"
});
\`\`\``,

  ownership: `## Ownership Verification

Verify if addresses meet ownership requirements.

### Simple Check

\`\`\`typescript
// Check if address owns specific tokens
POST /api/v0/verifyOwnershipRequirements
await BitBadgesApi.verifyOwnershipRequirements({
  address: "bb1...",
  assetOwnershipRequirements: {
    $and: [{
      assets: [{
        collectionId: "1",
        tokenIds: [{ start: "1", end: "100" }],
        ownershipTimes: [{ start: "1", end: "18446744073709551615" }],
        amountRange: { start: "1", end: "18446744073709551615" }
      }]
    }]
  }
});
\`\`\`

### AssetConditionGroup

Supports complex requirements with AND/OR/NOT logic:

\`\`\`typescript
{
  "$and": [...],  // All must be satisfied
  "$or": [...],   // At least one must be satisfied
  "$not": {...},  // Must NOT be satisfied
  "assets": [...]  // Direct asset requirements
}
\`\`\``,

  numberTypes: `## Number Types

**Important**: API responses stringify numbers to prevent precision loss.

### Response Format

\`\`\`json
{
  "collectionId": "1",
  "totalSupply": "1000000000000000000"
}
\`\`\`

### SDK Conversion

The SDK automatically converts based on your \`convertFunction\`:

\`\`\`typescript
// BigIntify - Recommended for precision
const api = new BitBadgesAPI({ convertFunction: BigIntify });
// collectionId will be bigint

// Numberify - May lose precision for large values
const api = new BitBadgesAPI({ convertFunction: Numberify });
// collectionId will be number

// Stringify - Keep as strings
const api = new BitBadgesAPI({ convertFunction: Stringify });
// collectionId will be string
\`\`\``
};

/**
 * Get the complete API documentation as a single string
 */
export function getApiDocsContent(): string {
  return Object.values(API_DOCS_CONTENT).join('\n\n');
}

/**
 * Get a specific section of the API documentation
 */
export function getApiDocsSection(section: keyof typeof API_DOCS_CONTENT): string {
  return API_DOCS_CONTENT[section];
}
