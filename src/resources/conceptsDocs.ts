/**
 * Concepts Documentation Resource
 * Core concepts for BitBadges ecosystem developers
 */

export interface ConceptsDocsResource {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

export const conceptsDocsResourceInfo: ConceptsDocsResource = {
  uri: 'bitbadges://docs/concepts',
  name: 'Core Concepts',
  description: 'Core BitBadges concepts: transferability, approvals, permissions, balances, and address lists',
  mimeType: 'text/markdown'
};

/**
 * Embedded documentation content for core concepts
 */
export const CONCEPTS_DOCS_CONTENT = {
  overview: `# BitBadges Core Concepts

This document covers the essential mental model for understanding BitBadges tokenization.

## Quick Reference

| Concept | Description |
|---------|-------------|
| **Collection** | Container for tokens with shared rules and metadata |
| **Token IDs** | Unique identifiers within a collection (can have supply > 1) |
| **Balances** | Who owns what tokens, with time-based ownership |
| **Approvals** | Rules governing who can transfer tokens |
| **Permissions** | Controls on what the manager can update |
| **Manager** | Address that can execute administrative actions |`,

  transferability: `## Transferability & Approvals

BitBadges uses a three-level approval system for transfers:

### The Three Levels

| Level | Controlled By | Purpose | Stored On |
|-------|--------------|---------|-----------|
| **Collection** | Manager/Issuer | Global rules, compliance | TokenCollection.collectionApprovals |
| **Outgoing** | Sender | Who can send on my behalf | UserBalanceStore.outgoingApprovals |
| **Incoming** | Recipient | Who can send to me | UserBalanceStore.incomingApprovals |

### Transfer Validation Flow

Every transfer must satisfy:
1. Sufficient balance exists
2. Collection-level approval matches
3. Sender's outgoing approval matches (unless overridden)
4. Recipient's incoming approval matches (unless overridden)

### Approval Structure

\`\`\`typescript
interface CollectionApproval {
  // WHO can participate
  fromListId: string;        // Who can send ("Mint", "All", "bb1...")
  toListId: string;          // Who can receive
  initiatedByListId: string; // Who can initiate

  // WHEN and WHAT
  transferTimes: UintRange[];   // When transfers allowed (UNIX ms)
  tokenIds: UintRange[];        // Which token IDs
  ownershipTimes: UintRange[];  // Which ownership times

  // Identity and version
  approvalId: string;        // Unique identifier
  version: string;           // Version control

  // Optional restrictions
  approvalCriteria?: ApprovalCriteria;
}
\`\`\`

### Override Behavior

Collection approvals can override user-level approvals:

- \`overridesFromOutgoingApprovals: true\` - Skip sender approval checks
- \`overridesToIncomingApprovals: true\` - Skip recipient approval checks

**Critical Rule**: Mint approvals (fromListId: "Mint") MUST have \`overridesFromOutgoingApprovals: true\` because the Mint address cannot set its own outgoing approvals.`,

  permissions: `## Permissions

Permissions control what the manager can update over time.

### Permission States

| State | Description | Behavior |
|-------|-------------|----------|
| **Permanently Permitted** | Frozen as allowed | Can always be executed |
| **Permanently Forbidden** | Frozen as blocked | Can never be executed |
| **Neutral** (empty array) | Currently allowed | Can change later |

**Important**: Once set to permanently permitted or forbidden, a permission can NEVER be changed. This is enforced on-chain.

### Permission Types

| Type | Criteria | Examples |
|------|----------|----------|
| **ActionPermission** | Time only | canDeleteCollection, canUpdateManager |
| **TokenIdsActionPermission** | Token IDs + time | canUpdateTokenMetadata, canUpdateValidTokenIds |
| **ApprovalPermission** | Transfer criteria + time | canUpdateCollectionApprovals |

### Example: Locking Token Metadata

\`\`\`typescript
const collectionPermissions = {
  canUpdateTokenMetadata: [{
    tokenIds: [{ start: "1", end: "100" }],
    permanentlyPermittedTimes: [],
    permanentlyForbiddenTimes: [{ start: "1", end: "18446744073709551615" }]
  }]
};
\`\`\`

This permanently forbids updating metadata for tokens 1-100.

### First Match Policy

Permissions are evaluated as a linear array. Only the FIRST matching element applies:
- Order matters
- Partial matches are ignored
- Unhandled combinations are allowed by default (neutral)`,

  balancesAndRanges: `## Balances & UintRanges

### UintRange Format

BitBadges uses ranges for token IDs, times, and amounts:

\`\`\`typescript
interface UintRange {
  start: string;  // MUST be string, not number
  end: string;    // MUST be string, not number
}
\`\`\`

**Critical Rules**:
- All numbers are strings: \`"1"\` not \`1\`
- Max uint64: \`"18446744073709551615"\` (use for "forever")
- Both start and end are REQUIRED

### Common Patterns

\`\`\`typescript
// Single token
{ start: "1", end: "1" }

// Range of tokens
{ start: "1", end: "100" }

// Forever (all time)
{ start: "1", end: "18446744073709551615" }

// Specific time window
{ start: "1704067200000", end: "1735689600000" }  // 2024 timestamps in ms
\`\`\`

### Balance Structure

\`\`\`typescript
interface Balance {
  amount: string;             // How many
  tokenIds: UintRange[];      // Which tokens
  ownershipTimes: UintRange[]; // When owned
}
\`\`\`

### Time-Dependent Ownership

Tokens can have expiring ownership:

\`\`\`typescript
// Token that expires after 30 days
const balance = {
  amount: "1",
  tokenIds: [{ start: "1", end: "1" }],
  ownershipTimes: [{
    start: Date.now().toString(),
    end: (Date.now() + 30 * 24 * 60 * 60 * 1000).toString()
  }]
};
\`\`\`

### Token IDs vs Supply

**Important distinction**:
- **1 token ID with supply 1000**: Fungible-like (1000 units of token #1)
- **1000 token IDs with supply 1 each**: NFT-like (unique tokens 1-1000)

Think carefully about your use case!`,

  addressLists: `## Address Lists

Address lists define who can participate in transfers.

### Reserved List IDs

| ID | Meaning | Usage |
|----|---------|-------|
| \`"Mint"\` | The mint/escrow address | fromListId for minting |
| \`"All"\` | Any address | Public access |
| \`"Total"\` | Total supply tracking | Amount tracking |
| \`"!Mint"\` | Everything except Mint | Post-mint transfers |

### Direct Addresses

Use bb1... addresses directly:

\`\`\`typescript
// Single address
fromListId: "bb1abc123..."

// Exclude single address
fromListId: "!bb1abc123..."

// Multiple addresses (colon-separated)
fromListId: "bb1abc123:bb1xyz789"

// Exclude multiple addresses
fromListId: "!bb1abc123:bb1xyz789"
\`\`\`

### Critical Rule

**DO NOT use custom list IDs.** Only use:
- Reserved IDs: \`"All"\`, \`"Mint"\`, \`"Total"\`, \`"!Mint"\`
- Direct addresses: \`"bb1..."\`
- Negated addresses: \`"!bb1..."\`
- Colon-separated: \`"bb1...:bb1..."\`

Custom list IDs require separate MsgCreateAddressLists which is not supported in the builder.`,

  invariants: `## Invariants

Invariants are set-once rules that cannot be changed after creation.

### Available Invariants

\`\`\`typescript
interface Invariants {
  noCustomOwnershipTimes: boolean;      // If true, all ownership forever
  maxSupplyPerId: string;               // "0" = unlimited
  noForcefulPostMintTransfers: boolean; // Prevent override flags post-mint
  disablePoolCreation: boolean;         // Prevent liquidity pools
  cosmosCoinBackedPath: object | null;  // IBC backing config (Smart Tokens)
}
\`\`\`

### Common Configurations

**Standard NFT Collection**:
\`\`\`typescript
invariants: {
  noCustomOwnershipTimes: true,
  maxSupplyPerId: "1",
  noForcefulPostMintTransfers: true,
  disablePoolCreation: true,
  cosmosCoinBackedPath: null
}
\`\`\`

**Fungible Token**:
\`\`\`typescript
invariants: {
  noCustomOwnershipTimes: true,
  maxSupplyPerId: "0",  // Unlimited supply
  noForcefulPostMintTransfers: false,
  disablePoolCreation: false,  // Allow pools
  cosmosCoinBackedPath: null
}
\`\`\`

**Smart Token (IBC-backed)**:
\`\`\`typescript
invariants: {
  noCustomOwnershipTimes: true,
  maxSupplyPerId: "0",
  noForcefulPostMintTransfers: true,
  disablePoolCreation: false,
  cosmosCoinBackedPath: {
    ibcDenom: "ibc/...",
    backingAddress: "bb1..."
  }
}
\`\`\`

### Key Points

- \`maxSupplyPerId\` and \`cosmosCoinBackedPath\` can only be set at creation
- Once set, they cannot be modified
- Plan carefully before creating your collection`
};

/**
 * Get the complete concepts documentation as a single string
 */
export function getConceptsDocsContent(): string {
  return Object.values(CONCEPTS_DOCS_CONTENT).join('\n\n');
}

/**
 * Get a specific section of the concepts documentation
 */
export function getConceptsDocsSection(section: keyof typeof CONCEPTS_DOCS_CONTENT): string {
  return CONCEPTS_DOCS_CONTENT[section];
}
