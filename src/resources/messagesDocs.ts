/**
 * Messages Documentation Resource
 * Reference for BitBadges transaction message types
 */

export interface MessagesDocsResource {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

export const messagesDocsResourceInfo: MessagesDocsResource = {
  uri: 'bitbadges://docs/messages',
  name: 'Message Type Reference',
  description: 'BitBadges transaction message types: MsgUniversalUpdateCollection, MsgTransferTokens, etc.',
  mimeType: 'text/markdown'
};

/**
 * Embedded message type documentation
 */
export const MESSAGES_DOCS_CONTENT = {
  overview: `# BitBadges Message Types

## Primary Messages

| typeUrl | Purpose | Use Case |
|---------|---------|----------|
| /tokenization.MsgUniversalUpdateCollection | Create/update collections | New collections, metadata updates |
| /tokenization.MsgTransferTokens | Transfer/mint tokens | Minting, transfers |
| /tokenization.MsgCreateAddressLists | Create address lists | Reusable address groups |
| /tokenization.MsgUpdateUserApprovals | Update user approvals | Outgoing/incoming rules |

## Message Selection Guide

| Action | Message | Key Field |
|--------|---------|-----------|
| Create new collection | MsgUniversalUpdateCollection | collectionId: "0" |
| Update existing collection | MsgUniversalUpdateCollection | collectionId: "123" |
| Mint tokens | MsgTransferTokens | from: "Mint" |
| Transfer tokens | MsgTransferTokens | from: "bb1..." |
| Create + Mint in one tx | Both messages | Both with collectionId: "0" |`,

  msgUniversalUpdateCollection: `## MsgUniversalUpdateCollection

The primary message for creating and updating collections.

### typeUrl
\`/tokenization.MsgUniversalUpdateCollection\`

### Key Fields

\`\`\`typescript
{
  "typeUrl": "/tokenization.MsgUniversalUpdateCollection",
  "value": {
    // Required
    "creator": "bb1...",           // Signer address
    "collectionId": "0",           // "0" = new collection

    // Update flags (set to true to update)
    "updateValidTokenIds": true,
    "updateCollectionPermissions": true,
    "updateManager": true,
    "updateCollectionMetadata": true,
    "updateTokenMetadata": true,
    "updateCustomData": true,
    "updateCollectionApprovals": true,
    "updateStandards": true,
    "updateIsArchived": false,

    // Data fields
    "validTokenIds": [{ "start": "1", "end": "1" }],
    "collectionPermissions": { ... },
    "manager": "bb1...",
    "collectionMetadata": { "uri": "ipfs://...", "customData": "" },
    "tokenMetadata": [{ "uri": "ipfs://...", "customData": "", "tokenIds": [...] }],
    "customData": "",
    "collectionApprovals": [...],
    "standards": [],
    "isArchived": false,

    // Invariants (set-once fields)
    "invariants": {
      "noCustomOwnershipTimes": false,
      "maxSupplyPerId": "0",
      "noForcefulPostMintTransfers": false,
      "disablePoolCreation": true,
      "cosmosCoinBackedPath": null
    },

    // Additional fields
    "mintEscrowCoinsToTransfer": [],
    "aliasPathsToAdd": [],
    "cosmosCoinWrapperPathsToAdd": []
  }
}
\`\`\`

### Critical Rules

1. **collectionId: "0"** creates a new collection
2. **tokenMetadata MUST include tokenIds** for each entry
3. **All numbers must be strings**: "1" not 1
4. **Update flags**: Only fields with \`update*: true\` are modified`,

  msgTransferTokens: `## MsgTransferTokens

Execute token transfers and minting operations.

### typeUrl
\`/tokenization.MsgTransferTokens\`

### Structure

\`\`\`typescript
{
  "typeUrl": "/tokenization.MsgTransferTokens",
  "value": {
    "creator": "bb1...",           // Signer address
    "collectionId": "0",           // Collection ID or "0" for just-created
    "transfers": [{
      "from": "Mint",              // "Mint" for minting, "bb1..." for transfer
      "toAddresses": ["bb1..."],   // Recipients
      "balances": [{
        "amount": "1",
        "tokenIds": [{ "start": "1", "end": "1" }],
        "ownershipTimes": [{ "start": "1", "end": "18446744073709551615" }]
      }],
      "prioritizedApprovals": [{
        "approvalId": "my-approval",
        "approvalLevel": "collection",
        "approverAddress": "",
        "version": "0"
      }],
      "onlyCheckPrioritizedCollectionApprovals": false,
      "onlyCheckPrioritizedIncomingApprovals": false,
      "onlyCheckPrioritizedOutgoingApprovals": false,
      "memo": ""
    }]
  }
}
\`\`\`

### Minting vs Transferring

| Action | from | Description |
|--------|------|-------------|
| Minting | "Mint" | Create new tokens from escrow |
| Transferring | "bb1..." | Move tokens between addresses |

### Prioritized Approvals

Reference specific approvals by ID to use:

\`\`\`typescript
"prioritizedApprovals": [{
  "approvalId": "public-mint",
  "approvalLevel": "collection",  // "collection" | "outgoing" | "incoming"
  "approverAddress": "",          // Empty for collection level
  "version": "0"
}]
\`\`\``,

  msgUpdateUserApprovals: `## MsgUpdateUserApprovals

Update user-level incoming and outgoing approvals.

### typeUrl
\`/tokenization.MsgUpdateUserApprovals\`

### Structure

\`\`\`typescript
{
  "typeUrl": "/tokenization.MsgUpdateUserApprovals",
  "value": {
    "creator": "bb1...",           // User's address
    "collectionId": "1",           // Collection ID
    "updateOutgoingApprovals": true,
    "updateIncomingApprovals": true,
    "updateAutoApproveSelfInitiatedOutgoingTransfers": true,
    "updateAutoApproveSelfInitiatedIncomingTransfers": true,
    "updateAutoApproveAllIncomingTransfers": true,
    "outgoingApprovals": [...],
    "incomingApprovals": [...],
    "autoApproveSelfInitiatedOutgoingTransfers": true,
    "autoApproveSelfInitiatedIncomingTransfers": true,
    "autoApproveAllIncomingTransfers": true
  }
}
\`\`\`

### Auto-Approve Flags

| Flag | Description |
|------|-------------|
| autoApproveSelfInitiatedOutgoingTransfers | Auto-approve transfers you initiate (sending) |
| autoApproveSelfInitiatedIncomingTransfers | Auto-approve transfers you initiate (receiving) |
| autoApproveAllIncomingTransfers | Auto-approve all incoming transfers |

**Recommendation**: Leave all auto-approve flags as \`true\` for typical use cases.`,

  msgCreateAddressLists: `## MsgCreateAddressLists

Create reusable address lists for approvals.

### typeUrl
\`/tokenization.MsgCreateAddressLists\`

### Structure

\`\`\`typescript
{
  "typeUrl": "/tokenization.MsgCreateAddressLists",
  "value": {
    "creator": "bb1...",
    "addressLists": [{
      "listId": "my-list-id",
      "addresses": ["bb1...", "bb1..."],
      "whitelist": true,           // true = only these, false = exclude these
      "uri": "ipfs://...",
      "customData": ""
    }]
  }
}
\`\`\`

### Note

**For the builder**, prefer using reserved list IDs and direct addresses instead of creating custom address lists:
- \`"All"\`, \`"Mint"\`, \`"!Mint"\`
- Direct addresses: \`"bb1..."\`
- Colon-separated: \`"bb1...:bb1..."\``,

  transactionStructure: `## Transaction Structure

Complete transaction format for BitBadges.

\`\`\`typescript
{
  "messages": [
    { "typeUrl": "/tokenization.MsgUniversalUpdateCollection", "value": {...} },
    { "typeUrl": "/tokenization.MsgTransferTokens", "value": {...} }
  ],
  "memo": "Optional memo text",
  "fee": {
    "amount": [{ "denom": "ubadge", "amount": "5000" }],
    "gas": "500000"
  }
}
\`\`\`

### Multi-Message Transactions

When creating a collection AND minting in the same transaction:
- Both messages use \`collectionId: "0"\`
- MsgTransferTokens references the just-created collection

\`\`\`typescript
{
  "messages": [
    {
      "typeUrl": "/tokenization.MsgUniversalUpdateCollection",
      "value": { "collectionId": "0", ... }  // Creates collection
    },
    {
      "typeUrl": "/tokenization.MsgTransferTokens",
      "value": { "collectionId": "0", ... }  // References just-created
    }
  ]
}
\`\`\``,

  approvalCriteriaMinimal: `## ApprovalCriteria (Minimal)

**CRITICAL**: Only include non-default fields in approvalCriteria.

### Default Values (OMIT from JSON)

- Boolean fields: \`false\`
- Numeric/string fields: \`"0"\` or \`""\`
- Arrays: \`[]\`
- Nested objects with defaults: omit entirely

### Minimal Examples

**Simple Mint (no payment)**:
\`\`\`json
{
  "approvalCriteria": {
    "overridesFromOutgoingApprovals": true
  }
}
\`\`\`

**Mint with Payment**:
\`\`\`json
{
  "approvalCriteria": {
    "overridesFromOutgoingApprovals": true,
    "coinTransfers": [{
      "to": "bb1creator...",
      "coins": [{ "denom": "ubadge", "amount": "5000000000" }]
    }]
  }
}
\`\`\`

**Mint with Limit**:
\`\`\`json
{
  "approvalCriteria": {
    "overridesFromOutgoingApprovals": true,
    "maxNumTransfers": {
      "perInitiatedByAddressMaxNumTransfers": "1"
    }
  }
}
\`\`\`

**Smart Token (IBC-backed)**:
\`\`\`json
{
  "approvalCriteria": {
    "mustPrioritize": true,
    "allowBackedMinting": true
  }
}
\`\`\``
};

/**
 * Get the complete messages documentation as a single string
 */
export function getMessagesDocsContent(): string {
  return Object.values(MESSAGES_DOCS_CONTENT).join('\n\n');
}

/**
 * Get a specific section of the messages documentation
 */
export function getMessagesDocsSection(section: keyof typeof MESSAGES_DOCS_CONTENT): string {
  return MESSAGES_DOCS_CONTENT[section];
}
