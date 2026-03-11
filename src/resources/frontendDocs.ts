/**
 * Frontend Patterns Resource
 * Reference patterns from the BitBadges reference frontend implementation.
 * NOTE: These patterns are specific to the BitBadges official frontend (Next.js + Ant Design).
 * Third-party developers building their own UIs should adapt these patterns to their stack.
 */

export const frontendDocsResourceInfo = {
  uri: 'bitbadges://docs/frontend',
  name: 'Reference Frontend Patterns',
  description: 'Patterns from the BitBadges reference frontend (Next.js + Ant Design). Adapt to your own stack as needed.',
  mimeType: 'text/markdown'
};

const FRONTEND_DOCS_CONTENT = {
  overview: `# BitBadges Reference Frontend Patterns

> **Note:** These patterns are from the official BitBadges frontend implementation.
> If you are building your own app, adapt these concepts to your framework and UI library.

## Reference Stack (BitBadges Official)
- **Framework**: Next.js (Pages Router)
- **UI Library**: Ant Design (antd)
- **State**: React Context + custom hooks
- **SDK**: \`bitbadgesjs-sdk\` for all BitBadges types and API calls

## Key Concepts (Framework-Agnostic)

### Address Handling
- Always validate addresses before use (0x or bb1 format)
- Use \`convert_address\` MCP tool or SDK's \`ethToCosmos\`/\`cosmosToEth\` for format conversion
- Display resolved names when available

### Amount Display
- Never show raw base units (ubadge, uatom) to end users
- Convert to display units using token decimals (e.g., ubadge has 9 decimals)
- Show both the human-readable amount and denomination

### Transaction Flow
- Build transaction JSON (via MCP tools or manually)
- Present to user for review before signing
- User signs with their wallet (MetaMask for EVM, Keplr for Cosmos)
- Broadcast the signed transaction
- Poll for confirmation`,

  collectionPatterns: `## Working with Collections

### Fetching Collection Data
Use the BitBadges API (via SDK or MCP \`query_collection\` tool):
\`\`\`typescript
import { BitBadgesAPI } from 'bitbadgesjs-sdk';

const api = new BitBadgesAPI({ apiUrl: 'https://api.bitbadges.io', apiKey: YOUR_KEY });
const collection = await api.getCollection(collectionId);
// Access: collection.collectionApprovals, collection.manager, collection.standards, etc.
\`\`\`

### Checking Token Ownership
\`\`\`typescript
const balance = await api.getBalanceByAddress(collectionId, userAddress);
const hasToken = balance.balances.some(b => BigInt(b.amount) > 0n);
\`\`\`

### Determining Collection Type
Check the \`standards\` array on the collection:
\`\`\`typescript
const isSmartToken = collection.standards?.includes('Smart Token');
const isSubscription = collection.standards?.includes('Subscriptions');
const isNFT = collection.standards?.includes('NFTs');
const isFungible = collection.standards?.includes('Fungible Tokens');
\`\`\`

### Custom Protocol Data
Use \`collection.customData\` (JSON string) for protocol-specific metadata:
\`\`\`typescript
const protocolData = JSON.parse(collection.customData || '{}');
\`\`\``,

  transactionPatterns: `## Transaction Patterns

### Building and Submitting
1. Build transaction JSON using MCP tools or construct manually
2. Validate with \`validate_transaction\` tool
3. Present to user for review
4. User signs with their wallet
5. Broadcast via RPC

### Wallet Integration Options
- **EVM wallets** (MetaMask, WalletConnect): Call EVM precompiles at known addresses
- **Cosmos wallets** (Keplr): Use signDirect with the transaction's SignDoc
- **SDK adapters**: \`bitbadgesjs-sdk\` provides \`GenericEvmAdapter\` and \`GenericCosmosAdapter\` for server-side signing`,

  bestPractices: `## Best Practices

- Always show loading states while fetching data
- Handle address format conversion transparently for users
- Never hardcode collection IDs or addresses — make them configurable
- Use the SDK's type definitions for type safety
- Validate all user input before building transactions
- Show human-readable explanations of what a transaction will do before signing`
};

export function getFrontendDocsContent(): string {
  return Object.values(FRONTEND_DOCS_CONTENT).join('\n\n');
}
