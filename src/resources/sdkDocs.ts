/**
 * SDK Documentation Resource
 * Quick reference for bitbadgesjs-sdk
 */

export interface SdkDocsResource {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

export const sdkDocsResourceInfo: SdkDocsResource = {
  uri: 'bitbadges://docs/sdk',
  name: 'SDK Quick Reference',
  description: 'BitBadges SDK installation, address conversion, and common patterns',
  mimeType: 'text/markdown'
};

/**
 * Embedded SDK documentation content
 */
export const SDK_DOCS_CONTENT = {
  installation: `# BitBadges SDK Quick Reference

## Installation

\`\`\`bash
npm install bitbadgesjs-sdk
\`\`\`

GitHub: https://github.com/bitbadges/bitbadgesjs
Full Documentation: https://bitbadges.github.io/bitbadgesjs/`,

  apiSetup: `## BitBadgesAPI Setup

The SDK provides a typed API client for interacting with the BitBadges API.

\`\`\`typescript
import { BigIntify, BitBadgesAPI } from 'bitbadgesjs-sdk';

// Initialize the API client
const BitBadgesApi = new BitBadgesAPI({
  apiKey: process.env.BITBADGES_API_KEY,
  convertFunction: BigIntify,  // Converts numbers to bigint
  apiUrl: 'https://api.bitbadges.io'  // Optional, defaults to official API
});

// Use typed routes
const collection = await BitBadgesApi.getCollections({
  collectionsToFetch: [{ collectionId: "1" }]
});

const account = await BitBadgesApi.getAccounts({
  accountsToFetch: [{ address: "bb1..." }]
});
\`\`\`

### Number Conversion Options

\`\`\`typescript
import { BigIntify, Numberify, Stringify } from 'bitbadgesjs-sdk';

// BigIntify - Convert to bigint (recommended for precision)
convertFunction: BigIntify

// Numberify - Convert to JavaScript number (may lose precision)
convertFunction: Numberify

// Stringify - Keep as strings
convertFunction: Stringify
\`\`\``,

  addressConversion: `## Address Conversion

BitBadges uses bb1-prefixed addresses (Cosmos format) but supports Ethereum addresses.

\`\`\`typescript
import { ethToCosmos, cosmosToEth } from 'bitbadgesjs-sdk';

// Convert ETH to BitBadges
const bbAddress = ethToCosmos('0x1234...');
// Returns: "bb1..."

// Convert BitBadges to ETH
const ethAddress = cosmosToEth('bb1...');
// Returns: "0x..."
\`\`\`

### Address Validation

\`\`\`typescript
import { isValidAddress } from 'bitbadgesjs-sdk';

// Validate any address format
const isValid = isValidAddress('bb1...');  // true
const isValid = isValidAddress('0x...');   // true
const isValid = isValidAddress('invalid'); // false
\`\`\``,

  numberHandling: `## Number Handling

**CRITICAL**: All numbers in BitBadges JSON must be strings.

\`\`\`typescript
// CORRECT
const balance = {
  amount: "1",
  tokenIds: [{ start: "1", end: "100" }]
};

// WRONG - will cause errors
const balance = {
  amount: 1,
  tokenIds: [{ start: 1, end: 100 }]
};
\`\`\`

### UintRange Helper

\`\`\`typescript
import { UintRangeArray } from 'bitbadgesjs-sdk';

// Create range arrays
const tokenIds = UintRangeArray.From([
  { start: 1n, end: 100n }
]);

// Check if contains a value
const contains = tokenIds.hasId(50n);  // true

// Get full range
const fullRange = UintRangeArray.FullRanges();
\`\`\``,

  balanceOperations: `## Balance Operations

\`\`\`typescript
import { BalanceArray } from 'bitbadgesjs-sdk';

// Create balance array
const balances = BalanceArray.From([
  {
    amount: 100n,
    tokenIds: [{ start: 1n, end: 10n }],
    ownershipTimes: [{ start: 1n, end: 18446744073709551615n }]
  }
]);

// Add balances (handles overlaps)
const newBalances = balances.addBalances([{
  amount: 50n,
  tokenIds: [{ start: 5n, end: 15n }],
  ownershipTimes: [{ start: 1n, end: 18446744073709551615n }]
}]);

// Subtract balances
const remaining = balances.subtractBalances([{
  amount: 10n,
  tokenIds: [{ start: 1n, end: 5n }],
  ownershipTimes: [{ start: 1n, end: 18446744073709551615n }]
}]);

// Get balance for specific token
const amount = balances.getBalanceForTokenId(5n);
\`\`\``,

  commonPatterns: `## Common Patterns

### Creating Metadata Objects

\`\`\`typescript
const collectionMetadata = {
  name: "My Collection",
  description: "A collection of unique tokens.",
  image: "ipfs://QmXxx..."
};

const tokenMetadata = {
  name: "Token #1",
  description: "The first token in the collection.",
  image: "ipfs://QmYyy..."
};
\`\`\`

### Building UintRanges for JSON

\`\`\`typescript
// Forever time range
const forever = [{ start: "1", end: "18446744073709551615" }];

// Single token
const singleToken = [{ start: "1", end: "1" }];

// Range of tokens
const tokenRange = [{ start: "1", end: "100" }];

// Current timestamp as string
const now = Date.now().toString();
\`\`\`

### Max Values

\`\`\`typescript
// Max uint64 (use for "forever" or "all")
const MAX_UINT64 = "18446744073709551615";

// Common time ranges
const FOREVER = [{ start: "1", end: MAX_UINT64 }];
const ALL_TOKENS = [{ start: "1", end: MAX_UINT64 }];
\`\`\``,

  typeImports: `## Common Type Imports

\`\`\`typescript
import {
  // Core types
  UintRange,
  Balance,
  CollectionApproval,
  ApprovalCriteria,

  // Permission types
  ActionPermission,
  TokenIdsActionPermission,
  CollectionApprovalPermission,

  // Utility classes
  UintRangeArray,
  BalanceArray,

  // API client
  BitBadgesAPI,

  // Converters
  BigIntify,
  Numberify,
  Stringify,

  // Address utilities
  ethToCosmos,
  cosmosToEth,
  isValidAddress
} from 'bitbadgesjs-sdk';
\`\`\`

### Transaction Types

\`\`\`typescript
import {
  MsgUniversalUpdateCollection,
  MsgTransferTokens,
  MsgCreateAddressLists,
  MsgUpdateUserApprovals
} from 'bitbadgesjs-sdk';
\`\`\``
};

/**
 * Get the complete SDK documentation as a single string
 */
export function getSdkDocsContent(): string {
  return Object.values(SDK_DOCS_CONTENT).join('\n\n');
}

/**
 * Get a specific section of the SDK documentation
 */
export function getSdkDocsSection(section: keyof typeof SDK_DOCS_CONTENT): string {
  return SDK_DOCS_CONTENT[section];
}
