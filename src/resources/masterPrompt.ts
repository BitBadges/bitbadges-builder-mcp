/**
 * Master Prompt Resource
 * Complete rules and instructions for BitBadges transaction building
 * Ported from frontend promptContent.ts - contains ALL critical rules
 */

export interface MasterPromptResource {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

export const masterPromptResourceInfo: MasterPromptResource = {
  uri: 'bitbadges://rules/critical',
  name: 'Critical Rules',
  description: 'Critical rules that must be followed when building BitBadges transactions',
  mimeType: 'text/markdown'
};

/**
 * Complete Master Prompt Content - mirrors frontend promptContent.ts
 */
export const MASTER_PROMPT_CONTENT = {
  overview: `# BitBadges Transaction Builder - Complete Guide

## What is BitBadges?

BitBadges is a Cosmos SDK blockchain for tokenization-as-a-service. It provides:
- NFTs, fungible tokens, subscriptions, credentials
- Compliance checked on every transfer
- Time-dependent ownership (expiring tokens)
- No smart contracts needed - uses x/tokenization module

### Key URLs
- API: https://api.bitbadges.io
- RPC: https://rpc.bitbadges.io
- LCD: https://lcd.bitbadges.io
- Explorer: https://explorer.bitbadges.io/BitBadges%20Mainnet
- Docs: https://docs.bitbadges.io

### Token Decimals & x/precisebank

**CRITICAL: BADGE has DIFFERENT decimals in Cosmos vs EVM contexts.**

BitBadges uses the \`x/precisebank\` module to bridge the decimal gap between Cosmos (9 decimals) and EVM (18 decimals).

#### Three denomination levels:
| Denom | Decimals | Context | Relationship |
|-------|----------|---------|-------------|
| **BADGE** | Display unit | Both | 1 BADGE = 10^9 ubadge = 10^18 abadge |
| **ubadge** | 9 (Cosmos base) | Cosmos SDK, bank module, IBC | 1 ubadge = 10^9 abadge |
| **abadge** | 0 (EVM base) | EVM, Solidity, MetaMask | Smallest unit (like wei) |

#### In Cosmos context:
- Gas fees, bank sends, IBC transfers use \`ubadge\`
- 1 BADGE = 1,000,000,000 ubadge (9 decimals)
- ubadge is the base denom for Cosmos transactions

#### In EVM context:
- Solidity \`msg.value\`, MetaMask amounts, ERC-20 patterns use 18 decimal representation
- 1 BADGE = 10^18 abadge (18 decimals, like ETH/wei)
- ubadge in EVM = 10^9 abadge (ubadge has 9 decimals in EVM context)
- \`x/precisebank\` handles the fractional conversion between ubadge and abadge automatically

#### Conversion examples:
\`\`\`
1 BADGE    = 1,000,000,000 ubadge         (Cosmos)
1 BADGE    = 1,000,000,000,000,000,000 abadge  (EVM, 18 decimals)
1 ubadge   = 1,000,000,000 abadge         (EVM)
0.5 ubadge = 500,000,000 abadge           (only possible via x/precisebank)
\`\`\`

#### Why this matters:
- When writing Solidity that sends BADGE via SendManager precompile, amounts are in \`ubadge\` (Cosmos format)
- When MetaMask displays native balance, it shows 18-decimal format (abadge as base)
- When checking \`address(this).balance\` in Solidity, result is in abadge (18 decimals)
- x/precisebank ensures sub-ubadge amounts (fractional) are tracked correctly in EVM

#### Other tokens:
- USDC (IBC): 6 decimals (1 USDC = 1,000,000 ibc/F082B65...)
- ATOM (IBC): 6 decimals (1 ATOM = 1,000,000 ibc/A4DB47...)
- IBC tokens do NOT have precisebank conversion — they use standard Cosmos decimals`,

  workflow: `## Decision Tree

When the user wants to:
- Create new collection → Use MsgUniversalUpdateCollection with collectionId: "0"
- Update existing collection → Use MsgUniversalUpdateCollection with actual collection ID
- Create subscription → Use MsgUniversalUpdateCollection with "Subscriptions" standard

## Build → Audit → Deploy Flow (MANDATORY)

After EVERY collection build, follow this pipeline:
1. **Build** → Use per-field tools in parallel: set_standards, set_valid_token_ids, set_invariants, add_approval, set_permissions, set_default_balances, set_collection_metadata, set_token_metadata, add_alias_path, set_mint_escrow_coins
2. **Audit** → audit_collection, validate_transaction
3. **Fix** → Address findings, re-audit if needed
4. **Present** → Show audit results to user with plain-language explanations
5. **Deploy** → get_transaction to retrieve the final transaction, return for user review and submission

**IMPORTANT: JSON Output Format** — When returning the final transaction JSON, do NOT just print it inline in the terminal. Terminal output often introduces formatting artifacts (line wrapping, ANSI codes, truncation) that break JSON parsing. Instead:
- **Preferred**: Save the JSON to a file (e.g., \`transaction.json\`) so the user can copy clean JSON
- **Alternative**: Copy the JSON to the user's clipboard if your environment supports it
- **If printing inline**: Wrap in a markdown code fence (\\\`\\\`\\\`json ... \\\`\\\`\\\`) and ensure no truncation

NEVER skip the audit step. Always present audit findings to the user before deploying.`,

  criticalRules: `## Critical Rules (MUST FOLLOW - NO EXCEPTIONS)

1. **ALL NUMBERS MUST BE STRINGS**: Use "1" not 1, "0" not 0, "18446744073709551615" not 18446744073709551615
2. **UintRange format**: Always { "start": "string", "end": "string" } - both start and end are REQUIRED strings
3. **Max uint64**: "18446744073709551615" - use this for "forever" time ranges
4. **collectionId: "0"**: Creates a new collection OR references a just-created collection in the same transaction
5. **tokenMetadata MUST include tokenIds**: Every tokenMetadata entry MUST have a "tokenIds" field with UintRange array
6. **Mint approvals MUST have overridesFromOutgoingApprovals: true**: When fromListId is "Mint", you MUST set this to true
7. **Use ONLY reserved list IDs**: "All", "Mint", "Total", "!Mint", direct bb1... addresses, "!bb1...", colon-separated addresses ("bb1abc:bb1xyz"), or reverse colon-separated ("!bb1abc:bb1xyz") - NO custom list IDs allowed
8. **approvalCriteria optimization**: ONLY include non-default fields in approvalCriteria. Omit fields with default values (false, "0", [], ""). See "ApprovalCriteria - Optimized Structure" section for details.
9. **Metadata descriptions**: Must be 1-2 sentences, end with periods, be specific and descriptive (see examples below)
10. **Approval metadata**: Must have empty image field ("") - do NOT include an image URI
11. **canUpdateValidTokenIds permissions MUST include tokenIds**: This permission type requires tokenIds field
12. **canUpdateTokenMetadata permissions MUST include tokenIds**: This permission type requires tokenIds field
13. **Empty permission arrays - CRITICAL**: If a permission entry has both permanentlyPermittedTimes and permanentlyForbiddenTimes as empty arrays, the entire permission entry is redundant and MUST be replaced with an empty array. This applies to ALL permission types:
   - **ActionPermission**: "canArchiveCollection": [] (NOT [{ "permanentlyPermittedTimes": [], "permanentlyForbiddenTimes": [] }])
   - **TokenIdsActionPermission**: "canUpdateTokenMetadata": [] (NOT [{ "tokenIds": [...], "permanentlyPermittedTimes": [], "permanentlyForbiddenTimes": [] }])
   - **CollectionApprovalPermission**: "canUpdateCollectionApprovals": [] (if both time arrays are empty)
   - **Rule**: If both time arrays are empty, the permission provides no restrictions, so use [] instead of the full object structure
14. **Token IDs vs Supply**: Think carefully about whether the user wants 1 token ID with high supply (e.g., 1 ID with 1000 supply for a fungible token) vs many token IDs with 1 supply each (e.g., 1000 IDs with 1 supply each for an NFT collection). This is especially important for NFTs and collections that could have multiple IDs.
15. **orderCalculationMethod - EXACTLY ONE true**: When using incrementedBalances with startBalances, exactly ONE orderCalculationMethod field must be true. Default: useOverallNumTransfers: true.
16. **canUpdateValidTokenIds default**: Should be **forbidden (frozen)** unless user explicitly specifies otherwise - most collections have fixed token ID ranges.
17. **canUpdateCollectionApprovals SECURITY**: Should be **forbidden (frozen)** by default, especially with Mint approvals. If manager can update approvals, they can create new mint approvals = unlimited minting.
18. **defaultBalances MUST include autoApproveAllIncomingTransfers: true**: For ANY collection with mint approvals, set defaultBalances with autoApproveAllIncomingTransfers: true. Without this, recipients CANNOT receive minted tokens. This is the #1 deployment bug. Always include: \`defaultBalances: { balances: [], outgoingApprovals: [], incomingApprovals: [], autoApproveAllIncomingTransfers: true, autoApproveSelfInitiatedOutgoingTransfers: true, autoApproveSelfInitiatedIncomingTransfers: true, userPermissions: {} }\``,

  transactionStructure: `## Transaction Structure

The complete transaction is a JSON object with this EXACT structure:

{
  "messages": [
    { "typeUrl": "/tokenization.MsgUniversalUpdateCollection", "value": {...} }
  ],
  "memo": "Optional memo text",
  "fee": {
    "amount": [{ "denom": "ubadge", "amount": "5000" }],
    "gas": "500000"
  }
}

### Key Rules
1. All numbers as strings: "1" not 1, "0" not 0
2. UintRange format: { "start": "1", "end": "18446744073709551615" }
3. Max uint64: "18446744073709551615" (use for "forever" time ranges)
4. collectionId: "0": Creates new collection OR references just-created collection`,

  messageTypes: `## Message Types

### Primary Messages

| typeUrl | Purpose |
|---------|---------|
| /tokenization.MsgUniversalUpdateCollection | Create/update collections |
| /tokenization.MsgCreateAddressLists | Create reusable address lists |
| /tokenization.MsgUpdateUserApprovals | Update user-level approvals |

### Message Selection
- **New collection**: MsgUniversalUpdateCollection with collectionId: "0"
- **Update collection**: MsgUniversalUpdateCollection with actual ID`,

  msgUniversalUpdateCollection: `## MsgUniversalUpdateCollection - Complete Structure

Here is the COMPLETE structure with ALL required fields and their types:

{
  "typeUrl": "/tokenization.MsgUniversalUpdateCollection",
  "value": {
    "creator": "bb1...",  // REQUIRED: Signer address (bb1... format)
    "collectionId": "0",  // REQUIRED: "0" for new collection, else existing ID

    // Valid Token IDs
    "updateValidTokenIds": true,  // REQUIRED: Set to true to update
    "validTokenIds": [{ "start": "1", "end": "1" }],  // REQUIRED: Array of UintRange objects

    // Collection Permissions
    "updateCollectionPermissions": true,  // REQUIRED: Set to true to update
    "collectionPermissions": {
      "canDeleteCollection": [{  // ActionPermission array
        "permanentlyPermittedTimes": [],
        "permanentlyForbiddenTimes": [{ "start": "1", "end": "18446744073709551615" }]
      }],
      "canArchiveCollection": [{  // ActionPermission array
        "permanentlyPermittedTimes": [],
        "permanentlyForbiddenTimes": []
      }],
      "canUpdateStandards": [],
      "canUpdateCustomData": [],
      "canUpdateManager": [],
      "canUpdateCollectionMetadata": [],
      "canUpdateValidTokenIds": [{  // TokenIdsActionPermission array - REQUIRES tokenIds
        "tokenIds": [{ "start": "1", "end": "18446744073709551615" }],
        "permanentlyPermittedTimes": [],
        "permanentlyForbiddenTimes": []
      }],
      "canUpdateTokenMetadata": [{  // TokenIdsActionPermission array - REQUIRES tokenIds
        "tokenIds": [{ "start": "1", "end": "18446744073709551615" }],
        "permanentlyPermittedTimes": [],
        "permanentlyForbiddenTimes": []
      }],
      "canUpdateCollectionApprovals": [{  // CollectionApprovalPermission array
        "fromListId": "All",
        "toListId": "All",
        "initiatedByListId": "All",
        "transferTimes": [{ "start": "1", "end": "18446744073709551615" }],
        "tokenIds": [{ "start": "1", "end": "18446744073709551615" }],
        "ownershipTimes": [{ "start": "1", "end": "18446744073709551615" }],
        "approvalId": "All",
        "permanentlyPermittedTimes": [],
        "permanentlyForbiddenTimes": []
      }],
      "canAddMoreAliasPaths": [],
      "canAddMoreCosmosCoinWrapperPaths": []
    },

    // Manager
    "updateManager": true,  // REQUIRED: Set to true to update
    "manager": "bb1...",  // REQUIRED: Address that can manage collection

    // Collection Metadata
    "updateCollectionMetadata": true,  // REQUIRED: Set to true to update
    "collectionMetadata": {  // REQUIRED
      "uri": "ipfs://Qm...",  // REQUIRED: IPFS URI or other metadata URI
      "customData": ""  // REQUIRED: Empty string or custom data
    },

    // Token Metadata
    "updateTokenMetadata": true,  // REQUIRED: Set to true to update
    "tokenMetadata": [{  // REQUIRED: Array - each entry MUST have tokenIds
      "uri": "ipfs://Qm...",  // REQUIRED: IPFS URI or other metadata URI
      "customData": "",  // REQUIRED: Empty string or custom data
      "tokenIds": [{ "start": "1", "end": "1" }]  // REQUIRED: UintRange array
    }],

    // Custom Data
    "updateCustomData": true,  // REQUIRED: Set to true to update
    "customData": "",  // REQUIRED: Empty string or custom data

    // Collection Approvals
    "updateCollectionApprovals": true,  // REQUIRED: Set to true to update
    "collectionApprovals": [{  // REQUIRED: Array of approval objects
      "fromListId": "Mint",  // REQUIRED: Reserved ID or bb1... address
      "toListId": "All",  // REQUIRED: Reserved ID or bb1... address
      "initiatedByListId": "All",  // REQUIRED: Reserved ID or bb1... address
      "transferTimes": [{ "start": "1", "end": "18446744073709551615" }],  // REQUIRED
      "tokenIds": [{ "start": "1", "end": "1" }],  // REQUIRED
      "ownershipTimes": [{ "start": "1", "end": "18446744073709551615" }],  // REQUIRED
      "uri": "ipfs://...",  // REQUIRED: IPFS URI for approval metadata
      "customData": "",  // REQUIRED
      "approvalId": "my-approval",  // REQUIRED: Unique identifier
      "approvalCriteria": {...},  // REQUIRED: See ApprovalCriteria Structure
      "version": "0"  // REQUIRED: Version string
    }],

    // Standards
    "updateStandards": true,  // REQUIRED: Set to true to update
    "standards": [],  // REQUIRED: Array of standard strings

    // Archive Status
    "updateIsArchived": false,  // REQUIRED
    "isArchived": false,  // REQUIRED: Boolean

    // Mint Escrow
    "mintEscrowCoinsToTransfer": [],  // REQUIRED: Array of coin objects

    // Invariants
    "invariants": {  // REQUIRED
      "noCustomOwnershipTimes": false,  // REQUIRED: Boolean
      "maxSupplyPerId": "0",  // REQUIRED: String - "0" means unlimited
      "noForcefulPostMintTransfers": false,  // REQUIRED: Boolean
      "disablePoolCreation": true,  // REQUIRED: Boolean
      "cosmosCoinBackedPath": null  // REQUIRED: null or CosmosCoinBackedPath object
    },

    // Alias Paths
    "aliasPathsToAdd": [],  // REQUIRED: Array of alias path objects

    // Cosmos Coin Wrapper Paths
    "cosmosCoinWrapperPathsToAdd": []  // REQUIRED: Array
  }
}

### Permission Types

| Permission | Type | Description |
|------------|------|-------------|
| canDeleteCollection | ActionPermission[] | Can collection be deleted |
| canArchiveCollection | ActionPermission[] | Can collection be archived |
| canUpdateStandards | ActionPermission[] | Can standards be changed |
| canUpdateCustomData | ActionPermission[] | Can customData be changed |
| canUpdateManager | ActionPermission[] | Can manager be changed |
| canUpdateCollectionMetadata | ActionPermission[] | Can collection metadata change |
| canUpdateValidTokenIds | TokenIdsActionPermission[] | Can valid token IDs change |
| canUpdateTokenMetadata | TokenIdsActionPermission[] | Can token metadata change |
| canUpdateCollectionApprovals | CollectionApprovalPermission[] | Can approvals change |
| canAddMoreAliasPaths | ActionPermission[] | Can alias paths be added |
| canAddMoreCosmosCoinWrapperPaths | ActionPermission[] | Can wrapper paths be added |

### Invariants

{
  "noCustomOwnershipTimes": false,
  "maxSupplyPerId": "0",
  "noForcefulPostMintTransfers": false,
  "disablePoolCreation": true,
  "cosmosCoinBackedPath": null,
  "evmQueryChallenges": []
}

| Field | Description |
|-------|-------------|
| noCustomOwnershipTimes | If true, all ownership times must be forever |
| maxSupplyPerId | Maximum supply per token ID (0 = unlimited) |
| noForcefulPostMintTransfers | If true, can't force transfers post-mint |
| disablePoolCreation | If true, can't create liquidity pools |
| cosmosCoinBackedPath | IBC backing configuration for Smart Tokens |
| evmQueryChallenges | EVM query challenges checked after ALL transfers (v25+) |`,

  approvalsSystem: `## Approvals System

### Approval Structure

{
  "fromListId": "Mint",
  "toListId": "All",
  "initiatedByListId": "All",
  "transferTimes": [{ "start": "1", "end": "18446744073709551615" }],
  "tokenIds": [{ "start": "1", "end": "1" }],
  "ownershipTimes": [{ "start": "1", "end": "18446744073709551615" }],
  "uri": "ipfs://...",
  "customData": "",
  "approvalId": "my-approval",
  "approvalCriteria": {...},
  "version": "0"
}

### Reserved List IDs

| ID | Meaning |
|----|---------|
| "Mint" | The mint/escrow address |
| "All" | Any address |
| "Total" | Total supply tracking |
| "!Mint" | Everything except Mint |
| "bb1..." | Specific address |
| "!bb1..." | Everything except the specific address |
| "bb1abc:bb1xyz" | Colon-separated list of addresses |
| "!bb1abc:bb1xyz" | Everything except the colon-separated addresses |

**CRITICAL**: Do NOT use custom list IDs. Use only reserved IDs, direct bb1... addresses, or the colon-separated formats.

### Approval Design Best Practices

**CRITICAL**: Prefer separate collection approvals for different use cases. We prioritize clear separation of concerns and user understandability over brevity.

**Guidelines:**

1. **One Approval Per Purpose**: Create separate approvals for distinct use cases
   - GOOD: Separate "public-mint" and "whitelist-mint" approvals
   - BAD: One approval trying to handle both

2. **Clear Separation of Concerns**: Each approval should have a single, well-defined purpose
   - GOOD: "manager-mint" (manager only), "public-mint" (everyone)
   - BAD: One approval handling manager minting, public minting, and subscriptions

3. **User Understandability**: Users should understand what each approval does from its approvalId and metadata
   - GOOD: approvalId: "public-mint-5-badge", approvalId: "whitelist-mint-free"
   - BAD: approvalId: "mint-approval" (unclear)

4. **When to Combine**: Only combine multiple concerns if they are truly inseparable and serve the exact same purpose`,

  approvalCriteria: `## ApprovalCriteria - Optimized Structure

### CRITICAL: Keep approvalCriteria Minimal

**DO NOT include fields with default values.** The system automatically applies defaults. Including them bloats the JSON unnecessarily.

**Default Values (OMIT these from your JSON):**
- All boolean fields: false
- All numeric/string fields: "0" or ""
- All arrays: []
- All nested objects with only default values: omit entirely
- overridesFromOutgoingApprovals: defaults to true for Mint approvals, false otherwise

### Minimal Examples

**Example 1: Simple Mint approval (most fields omitted)**
\`\`\`json
{
  "approvalCriteria": {
    "overridesFromOutgoingApprovals": true
  }
}
\`\`\`

**Example 2: Mint with payment requirement**
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

**Example 3: Mint with transfer limit**
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

**Example 4: Smart Token backing approval**
\`\`\`json
{
  "approvalCriteria": {
    "mustPrioritize": true,
    "allowBackedMinting": true
  }
}
\`\`\`

### Fields Reference (only include if non-default)

| Field | Default | Include When |
|-------|---------|--------------|
| overridesFromOutgoingApprovals | true (Mint), false (others) | For Mint: always include as true. For others: only if true |
| overridesToIncomingApprovals | false | Only if true |
| coinTransfers | [] | If payment required |
| maxNumTransfers.perInitiatedByAddressMaxNumTransfers | "0" | If limiting mints per user |
| maxNumTransfers.overallMaxNumTransfers | "0" | If limiting total mints |
| approvalAmounts.* | "0" | If tracking amounts (incompatible with predeterminedBalances) |
| predeterminedBalances.* | empty | If pre-defining exact tokens |
| mustPrioritize | false | true for IBC backed/wrapper operations |
| allowBackedMinting | false | true for IBC backed operations |
| allowSpecialWrapping | false | true for Cosmos wrapper operations |
| mustOwnTokens | [] | If requiring token ownership |
| merkleChallenges | [] | If using merkle proofs |
| requireToEqualsInitiatedBy | false | If recipient must be initiator |
| autoDeletionOptions.afterOneUse | false | If approval should delete after use |
| evmQueryChallenges | [] | EVM contract query validation (v25+) |

### Valid Check Fields

For senderChecks/recipientChecks/initiatorChecks, ONLY these fields are valid:
- mustBeEvmContract (default: false)
- mustNotBeEvmContract (default: false)
- mustBeLiquidityPool (default: false)
- mustNotBeLiquidityPool (default: false)

**DO NOT USE**: requireDiscord, requireTwitter, requireGithub, requireGoogle, requireVerified, or any social checks.

### CoinTransfer Structure

{
  "to": "bb1...",  // REQUIRED: Recipient address
  "coins": [{ "denom": "ubadge", "amount": "5000000000" }],  // REQUIRED
  "overrideFromWithApproverAddress": false,  // REQUIRED: Boolean
  "overrideToWithInitiator": false  // REQUIRED: Boolean
}

**AllowedDenoms**: The chain enforces an allowed denoms list for coin transfers. If the allowlist is non-empty, every coin denom must be on the list or use the "badgeslp:" prefix (LP shares). Using an unlisted denom causes a rejection. Common allowed denoms: "ubadge", standard IBC denoms (ibc/...).

### MustOwnTokens Structure

{
  "collectionId": "74",  // Use "0" to self-reference THIS collection (resolved at runtime)
  "amountRange": { "start": "1", "end": "18446744073709551615" },
  "ownershipTimes": [{ "start": "1", "end": "18446744073709551615" }],
  "tokenIds": [{ "start": "1", "end": "1" }],
  "overrideWithCurrentTime": true,
  "mustSatisfyForAllAssets": false,
  "ownershipCheckParty": "initiator"  // "initiator" | "sender" | "recipient"
}

**Self-reference**: Set collectionId to "0" to mean "this collection" — the chain resolves it to the current collection ID at runtime. Useful when gating an approval on ownership of tokens from the same collection (e.g., require holding token 1 before claiming token 2). This avoids hardcoding the collection ID, which is unknown at creation time.

### DynamicStoreChallenges Structure

\`\`\`json
{
  "dynamicStoreChallenges": [
    {
      "storeId": "123",  // REQUIRED: The dynamic store ID
      "ownershipCheckParty": "initiator"  // REQUIRED: "initiator" | "sender" | "recipient"
    }
  ]
}
\`\`\`

**Purpose**: Require that the specified party owns tokens from a specific dynamic store collection.

### AltTimeChecks Structure

\`\`\`json
{
  "altTimeChecks": {
    "offlineHours": [
      { "start": "0", "end": "5" }  // Block transfers from midnight to 5 AM (0-23 hours)
    ],
    "offlineDays": [
      { "start": "0", "end": "0" }  // Block transfers on Sundays (0=Sunday, 6=Saturday)
    ],
    "offlineMonths": [
      { "start": "12", "end": "12" }  // Block transfers in December (1-12)
    ],
    "offlineDaysOfMonth": [
      { "start": "1", "end": "1" }  // Block transfers on the 1st of each month (1-31)
    ],
    "offlineWeeksOfYear": [
      { "start": "52", "end": "52" }  // Block transfers during ISO week 52 (1-52)
    ],
    "timezoneOffsetMinutes": "300",  // Timezone offset in minutes (e.g., 300 = UTC-5 or UTC+5)
    "timezoneOffsetNegative": true   // If true, offset is negative (UTC-5). If false, positive (UTC+5).
  }
}
\`\`\`

**Purpose**: Block transfers during specific hours, days of the week, months, days of the month, or ISO weeks. Timezone offset adjusts all time checks from UTC.

### VotingChallenges Structure

\`\`\`json
{
  "votingChallenges": [
    {
      "collectionId": "123",  // The collection containing the vote/proposal
      "proposalId": "proposal-1",  // The proposal ID within the collection
      "voters": [
        {
          "address": "bb1voter1...",
          "weight": "100"  // Voting weight
        }
      ],
      "quorumThreshold": "50",  // Min percentage (0-100) of weight that must vote "yes"
      "ownershipCheckParty": "initiator",  // "initiator" | "sender" | "recipient"
      "resetAfterExecution": true,  // v29: Reset all votes after quorum is met and transfer executes
      "delayAfterQuorum": "86400000"  // v29: Delay in ms after quorum before execution is allowed (e.g., 24h)
    }
  ]
}
\`\`\`

**Purpose**: Require that a governance proposal has passed before allowing transfers. With v29, supports automatic vote reset after execution (for recurring multi-sig) and a configurable delay after quorum is reached.

### UserApprovalSettings Structure (v29)

\`\`\`json
{
  "userApprovalSettings": {
    "allowedDenoms": ["ubadge", "ibc/A4DB..."],  // Restrict which coin denoms users can use in their approval coinTransfers
    "disableUserCoinTransfers": false  // If true, users cannot attach coinTransfers to their approvals
  }
}
\`\`\`

**Purpose**: Controls user-level approval behavior. \`allowedDenoms\` restricts which coin denominations can appear in user-level coinTransfers. \`disableUserCoinTransfers\` disables user coin transfers entirely. Note: \`userRoyalties\` has been conceptually migrated here but the existing field is kept for backward compatibility.`,

  metadataRequirements: `## Metadata Requirements

### Default URIs (Verified Working)
- **Metadata**: ipfs://QmexK8Ux3NytdXGGehAhFEmR7b449XGAWqF5xyHnmxzrZx
- **Image**: ipfs://QmbC7wwg3s2HkbBRu46AtgqJy7wPBbgkNVB6ssfMQ1WS16

### Requirements by Type

| Type | name | description | image |
|------|------|-------------|-------|
| Collection Metadata | Required | Required | Required |
| Token Metadata | Required | Required | Required |
| Approval Metadata | Required | Required | "" (empty) |
| Alias Path Metadata | Required | Required | Required |
| Wrapper Path Metadata | Required | Required | Required |

### Collection Metadata Example

{
  "name": "Premium Membership",
  "description": "A collection representing premium membership tiers with exclusive benefits.",
  "image": "ipfs://QmbC7wwg3s2HkbBRu46AtgqJy7wPBbgkNVB6ssfMQ1WS16"
}

### Token Metadata Example

{
  "name": "Gold Tier Token",
  "description": "Grants access to gold tier benefits including priority support and exclusive content.",
  "image": "ipfs://QmbC7wwg3s2HkbBRu46AtgqJy7wPBbgkNVB6ssfMQ1WS16"
}

### Approval Metadata Example (NO IMAGE)

{
  "name": "Public Mint Approval",
  "description": "Allows anyone to mint one token by paying 5 BADGE.",
  "image": ""
}

### Alias Path Metadata - CRITICAL

Alias paths require metadata in BOTH locations:
1. **Base alias path**: aliasPathsToAdd[].metadata
2. **Each denomUnit**: aliasPathsToAdd[].denomUnits[].metadata

Use the same metadata URI for all denomUnits.

### Description Style Rules

**REQUIRED:**
- 1-2 sentences maximum
- Proper punctuation (end with periods)
- Clear, specific, descriptive
- Proper capitalization

**GOOD Examples:**
- "Allows holders to withdraw up to 10 ATOM daily."
- "Monthly subscription granting premium access for 30 days."
- "Wrapped ATOM token backed 1:1 by native ATOM via IBC."

**BAD Examples (DO NOT USE):**
- "A token"
- "An approval"
- "This is a collection"
- "Approval for minting"
- "Token metadata"
- "test"`,

  ibcBackingGeneral: `## IBC Backing & Special Addresses

### System Addresses

- **Burn Address**: \`bb1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqs7gvmv\` — ETH null address in bb1 format. Tokens sent here are permanently destroyed (no one controls the private key).
- **Governance Address**: \`bb10d07y265gmmuvt4z0w9aw880jnsr700jelmk2z\` — The on-chain governance module address.
- **Community Pool Address**: \`bb1jv65s3grqf6v6jl3dp4t6c9t9rk99cd8yzv04w\` — The community pool module address.

### IBC Backed Minting Rules (General)

1. **Do NOT use overridesFromOutgoingApprovals: true** when fromListId is a backing address
2. **Use allowBackedMinting: true** for IBC backed operations
3. **Use allowSpecialWrapping: true** for Cosmos wrapper operations
4. **Use mustPrioritize: true** (required, not compatible with auto-scan)

### If noForcefulPostMintTransfers: true in invariants:
- Cannot use overridesFromOutgoingApprovals or overridesToIncomingApprovals
- Exception: Only allowed if fromListId is exactly "Mint"

### Alias Path Configuration

{
  "denom": "uvatom",
  "symbol": "uvatom",
  "conversion": {
    "sideA": { "amount": "1" },
    "sideB": [{ "amount": "1", "tokenIds": [{ "start": "1", "end": "1" }], "ownershipTimes": [{ "start": "1", "end": "18446744073709551615" }] }]
  },
  "denomUnits": [
    {
      "decimals": "6",
      "symbol": "vATOM",
      "isDefaultDisplay": true,
      "metadata": { "uri": "ipfs://...", "customData": "" }
    }
  ],
  "metadata": { "uri": "ipfs://...", "customData": "" }
}

**Rules:**
- symbol = base unit symbol (e.g., "uvatom")
- denomUnits = display units with decimals > 0 ONLY
- Base decimals (0) is implicit - do NOT include in denomUnits
- Avoid duplicate symbols
- **CRITICAL**: Metadata MUST be added to BOTH the base alias path AND all denomUnits`,

  balanceTrackingMethods: `## Balance Tracking Methods: predeterminedBalances vs approvalAmounts vs maxNumTransfers

These three systems control **which tokens** can be transferred and **how many times** transfers can occur.

### Quick Decision Guide

| Use Case | Use This |
|----------|----------|
| Pre-define exact tokens to transfer (e.g., token IDs 1-100) | **predeterminedBalances** |
| Limit total amount transferred (e.g., max 10 tokens total) | **approvalAmounts** |
| Limit number of transfer operations (e.g., max 5 transfers) | **maxNumTransfers** |
| Time-dependent/expiring tokens | **predeterminedBalances** (with incrementedBalances) |
| Recurring subscriptions | **predeterminedBalances** (with incrementedBalances) |

### CRITICAL: Incompatibility Rule

**predeterminedBalances and approvalAmounts are INCOMPATIBLE** - you MUST use one or the other, NOT both.

- If you use **predeterminedBalances**, set **approvalAmounts** to all zeros and empty amountTrackerId
- If you use **approvalAmounts**, set **predeterminedBalances** to empty (manualBalances: [], incrementedBalances with all zeros)

### 1. predeterminedBalances

**Purpose**: Pre-define the exact tokens that can be transferred.

**Use when:**
- You know exactly which token IDs should be transferred
- You want time-dependent/expiring tokens
- You want recurring subscriptions
- You want incrementing token IDs (e.g., mint token 1, then 2, then 3)

**Key Fields:**
- **manualBalances**: Static list of exact tokens to transfer
- **incrementedBalances**: Dynamic tokens that increment over time
- **orderCalculationMethod**: How to determine which tokens to transfer first

**CRITICAL: orderCalculationMethod Rule**
When using \`predeterminedBalances\` (either \`manualBalances\` or \`incrementedBalances\` with \`startBalances\`), the \`orderCalculationMethod\` MUST have **exactly ONE** method set to \`true\`. The increment is calculated based on this method - for example, \`useOverallNumTransfers: true\` makes it sequential from order 0 to order 1 to order 2.

\`\`\`json
{
  "orderCalculationMethod": {
    "useOverallNumTransfers": true,  // EXACTLY ONE must be true
    "usePerToAddressNumTransfers": false,
    "usePerFromAddressNumTransfers": false,
    "usePerInitiatedByAddressNumTransfers": false,
    "useMerkleChallengeLeafIndex": false,
    "challengeTrackerId": ""
  }
}
\`\`\`

**Available methods:**
- \`useOverallNumTransfers\`: Sequential based on overall transfer count (most common, default)
- \`usePerToAddressNumTransfers\`: Sequential per recipient address
- \`usePerFromAddressNumTransfers\`: Sequential per sender address
- \`usePerInitiatedByAddressNumTransfers\`: Sequential per initiator address
- \`useMerkleChallengeLeafIndex\`: Use merkle challenge leaf index (requires \`challengeTrackerId\`)

### 2. approvalAmounts

**Purpose**: Limit the total amount of tokens that can be transferred (tallied/counted).

**Use when:**
- You want to limit total tokens transferred (e.g., "max 100 tokens total")
- You don't care about specific token IDs
- You want amount-based tracking with resets

**Key Fields:**
- **overallApprovalAmount**: Total limit across all transfers
- **perToAddressApprovalAmount**: Limit per recipient address
- **perFromAddressApprovalAmount**: Limit per sender address
- **perInitiatedByAddressApprovalAmount**: Limit per initiator address
- **amountTrackerId**: Unique identifier for tracking (required if using amounts)

### 3. maxNumTransfers

**Purpose**: Limit the number of transfer operations (not token amounts).

**Use when:**
- You want to limit how many times transfers can occur (e.g., "max 5 transfers")
- You want to track transfer count, not token amounts
- You want to auto-delete after a certain number of transfers

**Key Fields:**
- **overallMaxNumTransfers**: Total transfer count limit
- **perInitiatedByAddressMaxNumTransfers**: Transfer count limit per initiator
- **amountTrackerId**: Unique identifier for tracking (required if using maxNumTransfers)

### Compatibility Matrix

| System | Compatible With | Incompatible With |
|--------|----------------|-------------------|
| **predeterminedBalances** | maxNumTransfers | **approvalAmounts** |
| **approvalAmounts** | maxNumTransfers | **predeterminedBalances** |
| **maxNumTransfers** | Both | None |

### Key Rules Summary

1. **predeterminedBalances** and **approvalAmounts** are MUTUALLY EXCLUSIVE
2. **maxNumTransfers** can be used with either system
3. If using **predeterminedBalances**, set **approvalAmounts** to all zeros and empty amountTrackerId
4. If using **approvalAmounts**, set **predeterminedBalances** to empty/zeros
5. **amountTrackerId** is required when using **approvalAmounts** or **maxNumTransfers**`,

  timeDependentAndOverrides: `## Time-Dependent Balances and Forceful Overrides

### Default Behavior (Most Common)

For the vast majority of collections, you should use:

1. **ownershipTimes**: Always use "forever" (the full range)
   \`\`\`json
   "ownershipTimes": [{ "start": "1", "end": "18446744073709551615" }]
   \`\`\`
   - This means tokens never expire
   - Use this unless you specifically need expiring tokens

2. **overridesFromOutgoingApprovals**: Always false EXCEPT for Mint approvals and backing address approvals
   - Set to true when fromListId is "Mint" (REQUIRED — Mint has no outgoing approvals)
   - Set to true when fromListId is a backing address (RECOMMENDED — backing addresses auto-set their approvals, so it works either way)
   - Set to false for all other approvals (post-mint transfers, unbacking, etc.)

3. **overridesToIncomingApprovals**: Always false
   - Almost never set to true
   - Only use if you need to force transfers to recipients without their approval

### When to Use Forceful Overrides

#### overridesFromOutgoingApprovals

**MUST be true for:**
- **Mint approvals** (fromListId: "Mint")
  - Required for all minting operations
  - Allows tokens to be created without checking sender's outgoing approvals

**RECOMMENDED true for:**
- **IBC backing addresses** (Smart Tokens)
  - Backing addresses auto-set their approvals, so it works either way, but true is good practice

**MUST be false for:**
- **Post-mint transfers** (fromListId: "!Mint" or specific addresses)
- **Unbacking approvals** (sender is a regular user)

### Summary: Default Values

**For most collections, use these defaults:**

1. **ownershipTimes**: [{ "start": "1", "end": "18446744073709551615" }] (forever)
2. **overridesFromOutgoingApprovals**:
   - true if fromListId is "Mint"
   - false for all other approvals
3. **overridesToIncomingApprovals**: false (almost always)`,

  criticalGotchas: `## Critical Gotchas

### MUST DO

| Rule | Details |
|------|---------|
| Numbers as strings | "1" not 1 |
| UintRange format | Always { "start": "...", "end": "..." } |
| tokenMetadata needs tokenIds | [{ "uri": "...", "customData": "", "tokenIds": [...] }] |
| Mint transfers need override | overridesFromOutgoingApprovals: true |
| canUpdateValidTokenIds needs tokenIds | Include tokenIds in permission |
| canUpdateTokenMetadata needs tokenIds | Include tokenIds in permission |
| approvalCriteria optimization | ONLY include non-default fields |
| Separate approvals per use case | Prefer multiple approvals over combining |
| Empty permission arrays | If both time arrays are empty, use [] |
| Think deeply about IDs vs supply | 1 ID with 1000 supply vs 1000 IDs with 1 supply |
| canUpdateValidTokenIds default | Should be forbidden (frozen) unless specified |
| canUpdateCollectionApprovals security | Should be forbidden, especially with Mint approvals |
| prioritizedApprovals always specified | In MsgTransferTokens, always include (use [] if none) |
| orderCalculationMethod exactly ONE true | When using incrementedBalances with startBalances |
| Subscription validTokenIds | MUST be exactly [{ "start": "1", "end": "1" }] |
| Subscription coinTransfers override flags | MUST be false (NOT true) |
| Subscription durationFromTimestamp | MUST be non-zero |
| Subscription allowOverrideTimestamp | MUST be true |

### MUST NOT DO

| Bad | Good |
|-----|------|
| requireDiscord: true | Use senderChecks: { mustBeEvmContract: false, ... } |
| Custom list IDs | Use "All", "Mint", "!Mint", bb1... addresses |
| Number values: 1 | String values: "1" |
| Missing tokenIds in tokenMetadata | Always include tokenIds |
| Generic descriptions: "A token" | Specific: "Grants premium access for 30 days." |
| Missing periods in descriptions | Always end with proper punctuation |
| Redundant empty permission objects | Use [] if both time arrays empty |
| Assuming supply = IDs | Don't assume "1000 tokens" means 1000 IDs |
| Multiple orderCalculationMethod true | Exactly ONE must be true |
| Subscription coinTransfers overrides true | MUST be false for subscriptions |
| Subscription durationFromTimestamp "0" | MUST be non-zero (duration in ms) |

### List ID Rules

**ONLY USE:**
- "All" - Any address
- "Mint" - Mint address
- "Total" - Total supply
- "!Mint" - Everything except Mint
- "bb1..." - Direct address
- "!bb1..." - Everything except the specific address
- "bb1abc:bb1xyz" - Colon-separated list of addresses
- "!bb1abc:bb1xyz" - Everything except the colon-separated addresses

**DO NOT USE:**
- Custom list IDs
- addressListsToCreate field`,

  troubleshooting: `## Troubleshooting

### Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| "Invalid fromListId" | Custom list ID used | Use "All", "Mint", "!Mint", bb1... address |
| "tokenIds required" | Missing tokenIds in tokenMetadata | Add "tokenIds": [...] |
| "Invalid number" | Number instead of string | Use "1" not 1 |
| "Simulation failed" | Various | Check error message, fix structure |
| "overridesFromOutgoingApprovals required" | Mint transfer without override | Add "overridesFromOutgoingApprovals": true |

### Validation Checklist

Before outputting JSON, verify:
- [ ] All numbers are strings
- [ ] All UintRanges have start AND end
- [ ] tokenMetadata entries have tokenIds
- [ ] Mint approvals have overridesFromOutgoingApprovals: true
- [ ] No custom list IDs (only reserved or bb1... addresses)
- [ ] Metadata descriptions end with periods
- [ ] Approval metadata has empty image
- [ ] approvalCriteria only includes non-default fields`,

  metadataPlaceholders: `## Metadata Placeholders System

The metadataPlaceholders system allows you to generate metadata for collection, token, or approval metadata that will be automatically uploaded to IPFS.

### Format

\`\`\`json
{
  "messages": [...],
  "metadataPlaceholders": {
    "ipfs://METADATA_COLLECTION": {
      "name": "My Collection Name",
      "description": "A description of the collection.",
      "image": "https://example.com/image.png"
    },
    "ipfs://METADATA_TOKEN_1": {
      "name": "Token Name",
      "description": "Token description.",
      "image": "https://example.com/token.png"
    },
    "ipfs://METADATA_APPROVAL_public-mint": {
      "name": "Public Mint Approval",
      "description": "Allows anyone to mint one token by paying 5 BADGE.",
      "image": ""
    },
    "ipfs://METADATA_ALIAS_PATH": {
      "name": "vATOM",
      "description": "Wrapped ATOM token for liquidity pools.",
      "image": "https://example.com/vatom.png"
    }
  }
}
\`\`\`

### How It Works

1. In your messages, use placeholder URIs like \`ipfs://METADATA_COLLECTION\`, \`ipfs://METADATA_TOKEN_1\`, etc.
2. In the \`metadataPlaceholders\` object, provide the actual metadata for each placeholder URI
3. The system will automatically replace the placeholder URIs with the provided metadata and upload to IPFS
4. This works for:
   - Collection metadata (collectionMetadata.uri)
   - Token metadata (tokenMetadata[].uri)
   - Approval metadata (collectionApprovals[].uri)
   - Alias path metadata (aliasPathsToAdd[].metadata.uri)

### Important Notes

- Approval metadata should have \`image: ""\` (empty string) as approvals don't have images
- Collection and token metadata require \`name\`, \`description\`, and \`image\`
- You can use any placeholder URI format (e.g., \`ipfs://METADATA_APPROVAL_public-mint\`)
- The placeholder URI in the message must exactly match the key in \`metadataPlaceholders\`
- Always include proper descriptions ending with periods`,

  evmQueryChallenges: `## EVM Query Challenges (v25+)

EVM Query Challenges allow you to validate transfers by calling read-only EVM smart contracts. They can be used in two contexts:

### 1. In ApprovalCriteria (per-transfer validation)
Challenges are checked for EACH transfer that matches the approval.

### 2. In CollectionInvariants (post-transfer validation)
Challenges are checked ONCE after ALL transfers in a message complete. This is useful for checking aggregate state.

### EVMQueryChallenge Structure

\`\`\`json
{
  "evmQueryChallenges": [{
    "contractAddress": "0x1234567890abcdef1234567890abcdef12345678",
    "calldata": "0x70a08231$sender",
    "expectedResult": "0x0000000000000000000000000000000000000000000000000000000000000001",
    "comparisonOperator": "gte",
    "gasLimit": "100000",
    "uri": "",
    "customData": ""
  }]
}
\`\`\`

### Fields

| Field | Required | Description |
|-------|----------|-------------|
| contractAddress | Yes | EVM contract address (0x format or bb1 bech32) |
| calldata | Yes | ABI-encoded function call (hex string with 0x prefix). Supports placeholders. |
| expectedResult | No | Expected return value (hex string with 0x prefix). If empty, any non-error result passes. |
| comparisonOperator | No | How to compare result: "eq" (default), "ne", "gt", "gte", "lt", "lte" |
| gasLimit | No | Gas limit as string. Default: "100000", Max: "500000" |
| uri | No | Metadata URI for the challenge |
| customData | No | Arbitrary custom data |

### Calldata Placeholders

The following placeholders are replaced at runtime with the actual values (32-byte padded hex):

| Placeholder | ApprovalCriteria | Invariants | Description |
|-------------|------------------|------------|-------------|
| \`$initiator\` | ✅ | ✅ | Transaction initiator address |
| \`$sender\` | ✅ | ✅ | Token sender address |
| \`$recipient\` | ✅ | ✅ | Token recipient address (first recipient for invariants) |
| \`$collectionId\` | ✅ | ✅ | Collection ID as uint256 |
| \`$recipients\` | ❌ | ✅ | ALL recipient addresses concatenated (invariants only) |

### Comparison Operators

| Operator | Description |
|----------|-------------|
| eq | Equal (default) |
| ne | Not equal |
| gt | Greater than (numeric) |
| gte | Greater than or equal (numeric) |
| lt | Less than (numeric) |
| lte | Less than or equal (numeric) |

### Gas Limits

- Default per-challenge: 100,000
- Maximum per-challenge: 500,000
- Maximum total across all challenges: 1,000,000

### Example: Require ERC-20 Balance

\`\`\`json
{
  "approvalCriteria": {
    "evmQueryChallenges": [{
      "contractAddress": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      "calldata": "0x70a08231$initiator",
      "expectedResult": "0x00000000000000000000000000000000000000000000000000000000000f4240",
      "comparisonOperator": "gte",
      "gasLimit": "100000"
    }]
  }
}
\`\`\`

This checks that the initiator has at least 1,000,000 (0xf4240) units of the ERC-20 token.

### Example: Post-Transfer Invariant

\`\`\`json
{
  "invariants": {
    "evmQueryChallenges": [{
      "contractAddress": "0x1234...",
      "calldata": "0x...$sender$recipients",
      "expectedResult": "0x0000...0001",
      "comparisonOperator": "eq",
      "gasLimit": "200000"
    }]
  }
}
\`\`\`

### Building Calldata

To call a function like \`balanceOf(address)\`:
1. Get the function selector: \`keccak256("balanceOf(address)")[:4]\` = \`0x70a08231\`
2. Append the address parameter: Use placeholder \`$initiator\`, \`$sender\`, or \`$recipient\`
3. Full calldata: \`0x70a08231$initiator\`

For boolean return values:
- true = \`0x0000000000000000000000000000000000000000000000000000000000000001\`
- false = \`0x0000000000000000000000000000000000000000000000000000000000000000\``,

  collectionStats: `## Collection Stats Query (v25+)

The \`getCollectionStats\` query returns real-time statistics for a collection.

### Query

\`\`\`
GET /tokenization/collections/{collectionId}/stats
\`\`\`

### Response

\`\`\`json
{
  "stats": {
    "holderCount": "1234",
    "circulatingSupply": "5678000000"
  }
}
\`\`\`

### Fields

| Field | Description |
|-------|-------------|
| holderCount | Number of unique addresses holding tokens (excludes Mint, Total, backing addresses) |
| circulatingSupply | Total circulating supply for Smart Tokens (backed tokens) |

### Notes

- \`holderCount\` excludes protocol addresses (Mint, Total) and backing addresses
- \`circulatingSupply\` is tracked for Smart Tokens and updates on backing/unbacking operations
- Stats are updated automatically on transfers`
};

/**
 * Get the complete master prompt content as a single string
 */
export function getMasterPromptContent(): string {
  return Object.values(MASTER_PROMPT_CONTENT).join('\n\n');
}

/**
 * Get a specific section of the master prompt
 */
export function getMasterPromptSection(section: keyof typeof MASTER_PROMPT_CONTENT): string {
  return MASTER_PROMPT_CONTENT[section];
}

// Legacy exports for backwards compatibility
export const CRITICAL_RULES = MASTER_PROMPT_CONTENT.criticalRules;

export const SMART_TOKEN_RULES = `# Smart Token Configuration Rules

## Two-Approval System

Smart Tokens require TWO approvals (backing + unbacking). The transferable approval is common but optional:

### 1. Backing Approval (tokens FROM backing address)
- approvalId: "smart-token-backing"
- fromListId: [backing address] (bb1...)
- toListId: "![backing address]" (everything except backing)
- mustPrioritize: true
- allowBackedMinting: true
- overridesFromOutgoingApprovals: true (backing address is protocol-controlled, has no user-level outgoing approvals)

### 2. Transferable Approval (peer-to-peer transfers)
- approvalId: "smart-token-transferable"
- fromListId: "!Mint:[backing address]" (only regular holders)
- toListId: "!Mint:[backing address]" (only regular holders)
- overridesFromOutgoingApprovals: false (sender is a regular user)

### 3. Unbacking Approval (tokens TO backing address)
- approvalId: "smart-token-unbacking"
- fromListId: "!Mint:[backing address]" (colon-separated exclude — only regular holders can unback)
- toListId: [backing address]
- mustPrioritize: true
- allowBackedMinting: true
- overridesFromOutgoingApprovals: false (sender is a regular user, their outgoing approvals should be checked)

## Required Configuration

1. **Standards**: Include "Smart Token"
2. **Invariants**: Must include cosmosCoinBackedPath
3. **Alias Path**: Required with matching decimals

## Key Gotchas
- NO fromListId: "Mint" approvals
- Backing approvals: overridesFromOutgoingApprovals: true is RECOMMENDED (backing addresses auto-set their approvals, so it works either way, but true is good practice)
- Unbacking approvals: overridesFromOutgoingApprovals MUST be false (sender is a regular user)
- Alias path decimals MUST match IBC denom decimals
`;

export function getSmartTokenRules(): string {
  return SMART_TOKEN_RULES;
}
