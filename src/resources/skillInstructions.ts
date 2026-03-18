/**
 * Skill Instructions Resource
 * Detailed skill-specific guidance for different collection types
 * SINGLE SOURCE OF TRUTH — all skill instructions live here.
 * Skill instructions are the single source of truth for all BitBadges builder skills.
 * Consumers (indexer, frontend, CLI tools) can import these programmatically.
 */

export interface SkillInstruction {
  id: string;
  name: string;
  description: string;
  category: 'token-type' | 'standard' | 'approval' | 'feature' | 'advanced';
  summary: string;
  instructions: string;
  referenceCollectionIds?: string[];
}

export const SKILL_INSTRUCTIONS: SkillInstruction[] = [
  {
    id: 'smart-token',
    name: 'Smart Token',
    category: 'token-type',
    description: 'IBC-backed smart token with 1:1 backing and three-approval system',
    summary: `Required standards: ["Smart Token"]

- MUST include cosmosCoinBackedPath in invariants with conversion sideA/sideB
- MUST configure at least one alias path (decimals must match IBC denom decimals)
- MUST create THREE default collection approvals:
  1. Backing approval: fromListId = backing address, allowBackedMinting: true, mustPrioritize: true
  2. Transferable approval: fromListId = "!Mint", toListId = "All" (omit for non-transferable)
  3. Unbacking approval: toListId = backing address, allowBackedMinting: true, mustPrioritize: true
- DO NOT use fromListId: "Mint" — tokens are created via IBC backing, not traditional minting
- Backing approval (FROM backing address): USE overridesFromOutgoingApprovals: true (backing address is protocol-controlled, has no user-level outgoing approvals)
- Unbacking approval (TO backing address): DO NOT use overridesFromOutgoingApprovals: true (sender is a regular user)
- Unbacking fromListId uses "!Mint:backingAddress" syntax (excludes both Mint and backing address — meaning only regular holders can unback)
- Backing address is deterministic — use generate_backing_address tool
- Optional: Add "AI Agent Vault" to standards for AI Prompt tab (display-only)
- Alias path: symbol = base unit (e.g. "uvatom"), denomUnits = display units with decimals > 0 only, each denomUnit MUST have metadata with an image
- All alias path and denomUnit metadata MUST include an \`image\` field (token logo URL)`,
    instructions: `## Smart Token Configuration

### Mental Model: Three Phases

Think about smart tokens in three distinct phases:

1. **Phase 1 — Deposits (Backing)**: Users send IBC coins (e.g. USDC) to the backing address and receive wrapped tokens 1:1. This is the on-ramp.
2. **Phase 2 — Transferability (While Backed)**: While tokens exist in the wrapped silo, can users transfer them peer-to-peer? This is the key design decision — transferable for wrapped assets, non-transferable for vaults/escrows.
3. **Phase 3 — Withdrawals (Unbacking)**: Users send wrapped tokens back to the backing address and receive their IBC coins 1:1. This is the off-ramp. Rate limits, 2FA, and other controls go here.

Each phase maps to at least one collection approval. Design each phase independently — they are orthogonal concerns.

### Required Structure

1. **Standards**: MUST include "Smart Token"
   - "standards": ["Smart Token"]

2. **Invariants**: MUST include cosmosCoinBackedPath
   \`\`\`json
   {
     "standards": ["Smart Token"],
     "invariants": {
       "cosmosCoinBackedPath": {
         "conversion": {
           "sideA": {
             "amount": "1",
             "denom": "ibc/A4DB47A9D3CF9A068D454513891B526702455D3EF08FB9EB558C561F9DC2B701"
           },
           "sideB": [{
             "amount": "1",
             "tokenIds": [{ "start": "1", "end": "1" }],
             "ownershipTimes": [{ "start": "1", "end": "18446744073709551615" }]
           }]
         }
       }
     }
   }
   \`\`\`

3. **Alias Paths**: MUST configure at least one alias path
   - The alias path decimals MUST match the IBC denom's decimals
   - This is REQUIRED for Smart Tokens to function properly
   - Use the alias path configuration provided in the skill config
   - Alias path denom and symbol MUST only contain a-zA-Z, _, {, }, and - characters. NEVER use the raw IBC denom (ibc/...) as the alias path denom — create a new symbol like "wuusdc" or "uwrapped"
   - Do NOT reuse reserved symbols (USDC, ATOM, BADGE, etc.) — always prefix with "w" or similar (e.g., wUSDC, wATOM)

### Three-Approval System

Smart Tokens require THREE default approvals (backing, transferable, unbacking):

#### 1. Backing Approval (for backing tokens)
This approval allows tokens to be sent FROM the IBC backing address (backing the tokens).

\`\`\`json
{
  "fromListId": "bb1backingaddress...",
  "toListId": "!bb1backingaddress...",
  "initiatedByListId": "All",
  "approvalId": "smart-token-backing",
  "tokenIds": [{ "start": "1", "end": "1" }],
  "transferTimes": [{ "start": "1", "end": "18446744073709551615" }],
  "ownershipTimes": [{ "start": "1", "end": "18446744073709551615" }],
  "approvalCriteria": {
    "overridesFromOutgoingApprovals": true,
    "overridesToIncomingApprovals": false,
    "mustPrioritize": true,
    "allowBackedMinting": true
  }
}
\`\`\`
Note: \`overridesFromOutgoingApprovals: true\` is required here because the backing address is protocol-controlled and has no user-level outgoing approvals.

#### 2. Transferable Approval (for peer-to-peer transfers)
This approval allows tokens to be transferred between users (non-backing addresses).

\`\`\`json
{
  "fromListId": "!Mint",
  "toListId": "All",
  "initiatedByListId": "All",
  "approvalId": "transferable-approval",
  "tokenIds": [{ "start": "1", "end": "18446744073709551615" }],
  "transferTimes": [{ "start": "1", "end": "18446744073709551615" }],
  "ownershipTimes": [{ "start": "1", "end": "18446744073709551615" }]
}
\`\`\`

#### 3. Unbacking Approval (for unbacking tokens)
This approval allows tokens to be sent TO the IBC backing address (unbacking the tokens).
The \`!Mint:bb1backingaddress...\` fromListId uses colon-separated exclude syntax — it means "everyone except Mint and the backing address", so only regular holders can unback.

\`\`\`json
{
  "fromListId": "!Mint:bb1backingaddress...",
  "toListId": "bb1backingaddress...",
  "initiatedByListId": "All",
  "approvalId": "smart-token-unbacking",
  "tokenIds": [{ "start": "1", "end": "1" }],
  "transferTimes": [{ "start": "1", "end": "18446744073709551615" }],
  "ownershipTimes": [{ "start": "1", "end": "18446744073709551615" }],
  "approvalCriteria": {
    "overridesFromOutgoingApprovals": false,
    "overridesToIncomingApprovals": false,
    "mustPrioritize": true,
    "allowBackedMinting": true
  }
}
\`\`\`

### Multi-Message Deposit/Withdraw Pattern

For safety, backing approvals enforce that the initiator must be the recipient (deposit) and the initiator must be the sender (withdraw). To deposit to or withdraw for another address, use a multi-message transaction:

#### Deposit to Another Address (2 msgs in one tx)
1. **MsgTransferTokens**: Deposit to self (from: backingAddress, to: self)
2. **MsgTransferTokens**: Transfer from self to target (from: self, to: targetAddress) — uses the transferable approval

#### Withdraw for Another Address (2 msgs in one tx)
1. **MsgTransferTokens**: Withdraw to self (from: self, to: backingAddress)
2. **MsgSend** (cosmos bank): Send equivalent IBC coins from self to target address

### Optional: AI Agent Vault Standard

Add "AI Agent Vault" to the standards array to enable an AI Prompt tab in the frontend. This is **display-only** and has no impact on on-chain logic.

\`\`\`json
"standards": ["Smart Token", "AI Agent Vault"]
\`\`\`

### IBC Backed Minting Rules

- **Backing approval** (FROM backing address → All): **USE overridesFromOutgoingApprovals: true** — the backing address is protocol-controlled and has no user-level outgoing approvals
- **Unbacking approval** (FROM users → TO backing address): **DO NOT use overridesFromOutgoingApprovals: true** — the sender is a regular user whose outgoing approvals should be checked
- **Unbacking fromListId**: Use \`!Mint:backingAddress\` syntax — colon-separated addresses with \`!\` prefix means "everyone except Mint and backing address" (only regular holders can unback)
- **Use allowBackedMinting: true** for IBC backed operations
- **Use mustPrioritize: true** (required, not compatible with auto-scan)
- **Backing Address**: Use the backing address as fromListId (NOT "Mint") — generated deterministically from the IBC denom via generate_backing_address tool

### Alias Path Configuration

MUST configure at least one alias path. Structure:
\`\`\`json
{
  "aliasPathsToAdd": [{
    "denom": "uvatom",
    "symbol": "uvatom",
    "conversion": {
      "sideA": { "amount": "1" },
      "sideB": [{ "amount": "1", "tokenIds": [{ "start": "1", "end": "1" }], "ownershipTimes": [{ "start": "1", "end": "18446744073709551615" }] }]
    },
    "denomUnits": [{
      "decimals": "6",
      "symbol": "vATOM",
      "isDefaultDisplay": true,
      "metadata": { "uri": "ipfs://...", "customData": "" }
    }],
    "metadata": { "uri": "", "customData": "", "image": "https://example.com/token-logo.png" }
  }]
}
\`\`\`

Rules:
- symbol = base unit symbol (e.g., "uvatom")
- denomUnits = display units with decimals > 0 ONLY (base decimals 0 is implicit)
- Each denomUnit MUST have metadata with an image field (often the same image as the base alias path)
- The alias path itself MUST have metadata with an image field — this is the token logo shown in the UI
- isDefaultDisplay: true for the primary display unit
- **CRITICAL**: All metadata objects (alias path, denomUnits, cosmosCoinWrapperPaths) MUST include an \`image\` field with a valid URL. Missing images will be auto-fixed to a default but you should always provide a descriptive image.

### Cosmos Coin Wrapper (Optional)

For wrapping native Cosmos SDK coins, use \`allowSpecialWrapping: true\` and \`cosmosCoinWrapperPathsToAdd\`:
\`\`\`json
{
  "cosmosCoinWrapperPathsToAdd": [{
    "denom": "uatom",
    "symbol": "uatom",
    "conversion": {
      "sideA": { "amount": "1" },
      "sideB": [{ "amount": "1", "tokenIds": [{ "start": "1", "end": "1" }], "ownershipTimes": [{ "start": "1", "end": "18446744073709551615" }] }]
    },
    "denomUnits": [{ "decimals": "6", "symbol": "ATOM", "isDefaultDisplay": true, "metadata": { "uri": "", "customData": "", "image": "https://example.com/token-logo.png" } }],
    "metadata": { "uri": "", "customData": "", "image": "https://example.com/token-logo.png" },
    "allowOverrideWithAnyValidToken": false
  }]
}
\`\`\`

### Metadata Guidance

- Collection metadata, token metadata, alias path metadata, and denomUnit metadata should all have descriptive names/descriptions and images
- Do NOT use lazy placeholder names like "Backing Approval" — write real user-facing descriptions explaining what each approval does

### Key Rules Summary

1. **NO fromListId: "Mint" approvals**: Tokens are created via IBC backing, not traditional minting
2. **Use allowBackedMinting: true** in both backing and unbacking approvals
3. **Use mustPrioritize: true** (required for IBC backed operations)
4. **Backing approval**: overridesFromOutgoingApprovals: true is RECOMMENDED (backing addresses auto-set their approvals, so it works either way, but true is good practice). **Unbacking approval**: MUST be false (sender is a regular user)
5. **Unbacking fromListId**: Use \`!Mint:backingAddress\` syntax — excludes both Mint and backing address so only regular holders can send tokens back
6. **MUST create THREE default approvals**: backing, transferable, and unbacking
7. **MUST configure alias path** with matching decimals
8. The backing address is deterministic — use the one from generate_backing_address tool`
  },
  {
    id: 'minting',
    name: 'Minting',
    category: 'approval',
    description: 'Mint approval patterns including public mint, whitelist mint, creator-only mint, payment-gated mint, and escrow payouts',
    summary: `Required fields for all minting approvals:
- fromListId: "Mint"
- overridesFromOutgoingApprovals: true (REQUIRED for ALL Mint approvals)
- autoApproveAllIncomingTransfers: true in defaultBalances (for public-mint collections)
- predeterminedBalances vs approvalAmounts: incompatible — use one or the other
- orderCalculationMethod: MUST have exactly ONE method set to true (default: useOverallNumTransfers)
- coinTransfers override flags: false for standard payments, true for escrow payouts
- Mint escrow: overrideFromWithApproverAddress: true + overrideToWithInitiator: true (pays the minter from the escrow address)
- amountTrackerId: required when using maxNumTransfers or approvalAmounts`,
    instructions: `## Minting Configuration

When configuring minting approvals, you create collection approvals with fromListId: "Mint" that allow tokens to be minted from the Mint address.

### Core Structure

All minting approvals MUST have:
- **fromListId**: "Mint" (required for all minting operations)
- **overridesFromOutgoingApprovals**: true (REQUIRED for all Mint approvals)
- **toListId**: Typically "All" or specific address list
- **initiatedByListId**: Who can initiate the mint (typically "All" for public mints)

### 1. Payments Per Mint

Use \`coinTransfers\` in approvalCriteria to require payment:

\`\`\`json
{
  "approvalCriteria": {
    "coinTransfers": [{
      "to": "bb1creator...",
      "coins": [{ "denom": "ubadge", "amount": "5000000000" }],
      "overrideFromWithApproverAddress": false,
      "overrideToWithInitiator": false
    }]
  }
}
\`\`\`

**Important:**
- \`overrideFromWithApproverAddress\`: false (standard for mint payments)
- \`overrideToWithInitiator\`: false (standard for mint payments)
- Payment recipient (\`to\`) should be the creator or approver address

### 2. Incremented Token IDs

Use \`predeterminedBalances.incrementedBalances\` to automatically increment token IDs:

\`\`\`json
{
  "approvalCriteria": {
    "predeterminedBalances": {
      "incrementedBalances": {
        "startBalances": [{
          "amount": "1",
          "tokenIds": [{ "start": "1", "end": "1" }],
          "ownershipTimes": [{ "start": "1", "end": "18446744073709551615" }]
        }],
        "incrementTokenIdsBy": "1",
        "incrementOwnershipTimesBy": "0",
        "durationFromTimestamp": "0",
        "allowOverrideTimestamp": false,
        "recurringOwnershipTimes": { "startTime": "0", "intervalLength": "0", "chargePeriodLength": "0" },
        "allowOverrideWithAnyValidToken": false
      },
      "orderCalculationMethod": {
        "useOverallNumTransfers": true,
        "usePerToAddressNumTransfers": false,
        "usePerFromAddressNumTransfers": false,
        "usePerInitiatedByAddressNumTransfers": false,
        "useMerkleChallengeLeafIndex": false,
        "challengeTrackerId": ""
      },
      "manualBalances": []
    }
  }
}
\`\`\`

**CRITICAL: orderCalculationMethod Rule**
- When using \`predeterminedBalances\`, the \`orderCalculationMethod\` MUST have exactly ONE method set to \`true\`
- Default: \`useOverallNumTransfers: true\` (sequential across all mints)
- Cannot have zero methods true, cannot have multiple methods true

### 3. Auto-Deletions

Use \`autoDeletionOptions\` to automatically delete approvals after use:

\`\`\`json
{
  "approvalCriteria": {
    "autoDeletionOptions": {
      "afterOneUse": true,
      "afterOverallMaxNumTransfers": false,
      "allowCounterpartyPurge": false,
      "allowPurgeIfExpired": false
    }
  }
}
\`\`\`

### 4. Transfer Limits (Max Num Transfers)

Use \`maxNumTransfers\` to limit how many times minting can occur:

\`\`\`json
{
  "approvalCriteria": {
    "maxNumTransfers": {
      "overallMaxNumTransfers": "100",
      "perInitiatedByAddressMaxNumTransfers": "1",
      "perToAddressMaxNumTransfers": "0",
      "perFromAddressMaxNumTransfers": "0",
      "amountTrackerId": "mint-tracker-id",
      "resetTimeIntervals": { "startTime": "0", "intervalLength": "0" }
    }
  }
}
\`\`\`

### 5. Appending Minting Approvals After Creation

To allow minting approvals to be added after collection creation:
- Collection must have appropriate permissions (canUpdateCollectionApprovals not frozen for Mint)
- Approval can be added via separate MsgUniversalUpdateCollection transaction

### Mint Escrow (Free Mints with Payout)

The **Mint Escrow Address** is a special reserved address generated from the collection ID that holds Cosmos native funds. Use \`mintEscrowCoinsToTransfer\` to fund it during collection creation:

\`\`\`json
{
  "collectionId": "0",
  "mintEscrowCoinsToTransfer": [{ "denom": "ubadge", "amount": "10000000000" }],
  "collectionApprovals": [{
    "fromListId": "Mint",
    "toListId": "All",
    "initiatedByListId": "All",
    "approvalId": "free-mint",
    "approvalCriteria": {
      "coinTransfers": [{
        "to": "bb1user...",
        "coins": [{ "denom": "ubadge", "amount": "1000000000" }],
        "overrideFromWithApproverAddress": true,
        "overrideToWithInitiator": true
      }],
      "overridesFromOutgoingApprovals": true
    }
  }]
}
\`\`\`

Key escrow rules:
- **overrideFromWithApproverAddress: true** — uses mint escrow as the payer
- **overrideToWithInitiator: true** — pays the user who initiated the mint
- Escrow address has no private key, only collection approvals can transfer from it

### Complete Example: Public Mint with Payment and Incremented IDs

\`\`\`json
{
  "collectionApprovals": [{
    "fromListId": "Mint",
    "toListId": "All",
    "initiatedByListId": "All",
    "approvalId": "public-mint-5-badge",
    "tokenIds": [{ "start": "1", "end": "18446744073709551615" }],
    "transferTimes": [{ "start": "1", "end": "18446744073709551615" }],
    "ownershipTimes": [{ "start": "1", "end": "18446744073709551615" }],
    "approvalCriteria": {
      "overridesFromOutgoingApprovals": true,
      "coinTransfers": [{
        "to": "bb1creator...",
        "coins": [{ "denom": "ubadge", "amount": "5000000000" }],
        "overrideFromWithApproverAddress": false,
        "overrideToWithInitiator": false
      }],
      "predeterminedBalances": {
        "incrementedBalances": {
          "startBalances": [{ "amount": "1", "tokenIds": [{ "start": "1", "end": "1" }], "ownershipTimes": [{ "start": "1", "end": "18446744073709551615" }] }],
          "incrementTokenIdsBy": "1",
          "incrementOwnershipTimesBy": "0",
          "durationFromTimestamp": "0",
          "allowOverrideTimestamp": false,
          "recurringOwnershipTimes": { "startTime": "0", "intervalLength": "0", "chargePeriodLength": "0" },
          "allowOverrideWithAnyValidToken": false
        },
        "orderCalculationMethod": {
          "useOverallNumTransfers": true,
          "usePerToAddressNumTransfers": false,
          "usePerFromAddressNumTransfers": false,
          "usePerInitiatedByAddressNumTransfers": false,
          "useMerkleChallengeLeafIndex": false,
          "challengeTrackerId": ""
        },
        "manualBalances": []
      },
      "maxNumTransfers": {
        "overallMaxNumTransfers": "1000",
        "perInitiatedByAddressMaxNumTransfers": "1",
        "perToAddressMaxNumTransfers": "0",
        "perFromAddressMaxNumTransfers": "0",
        "amountTrackerId": "public-mint-tracker",
        "resetTimeIntervals": { "startTime": "0", "intervalLength": "0" }
      }
    }
  }]
}
\`\`\`

### Minting Gotchas

- **MUST have overridesFromOutgoingApprovals: true** (required for all Mint approvals)
- **coinTransfers override flags**: Should be false for standard payments, true for escrow payouts
- **predeterminedBalances vs approvalAmounts**: These are incompatible — use one or the other
- **orderCalculationMethod**: MUST have exactly ONE method set to true
- **amountTrackerId**: Required when using maxNumTransfers or approvalAmounts
- **autoApproveAllIncomingTransfers**: Must be true in defaultBalances for public-mint collections`
  },
  {
    id: 'liquidity-pools',
    name: 'Liquidity Pools',
    category: 'standard',
    description: 'Liquidity pool standard with the "Liquidity Pools" protocol standard tag',
    summary: `Required standards: ["Liquidity Pools"]

- MUST set invariants.disablePoolCreation: false
- MUST configure at least one alias path (required for liquidity pools to function)
- Merkle challenges are NOT compatible with liquidity pools
- Enables decentralized exchange (DEX) trading interfaces`,
    instructions: `## Liquidity Pools Configuration

When enabling liquidity pools for a collection, follow these requirements:

### Required Structure

1. **Standards**: MUST include "Liquidity Pools"
   - "standards": ["Liquidity Pools"]

2. **Invariants**: MUST set disablePoolCreation to false
   \`\`\`json
   {
     "standards": ["Liquidity Pools"],
     "invariants": {
       "disablePoolCreation": false
     }
   }
   \`\`\`

3. **Alias Paths**: MUST configure at least one alias path
   - This is REQUIRED for liquidity pools to function
   - Use the alias path configuration provided in the skill config
   \`\`\`json
   {
     "aliasPathsToAdd": [{
       "denom": "uvatom",
       "symbol": "uvatom",
       "conversion": {
         "sideA": { "amount": "1" },
         "sideB": [{ "amount": "1", "tokenIds": [{ "start": "1", "end": "1" }], "ownershipTimes": [{ "start": "1", "end": "18446744073709551615" }] }]
       },
       "denomUnits": [{
         "decimals": "6",
         "symbol": "vATOM",
         "isDefaultDisplay": true,
         "metadata": { "uri": "", "customData": "", "image": "https://example.com/token-logo.png" }
       }],
       "metadata": { "uri": "", "customData": "", "image": "https://example.com/token-logo.png" }
     }]
   }
   \`\`\`

### Liquidity Pools Gotchas

- disablePoolCreation MUST be false (not true)
- MUST configure at least one alias path (required for liquidity pools)
- All alias path and denomUnit metadata MUST include an \`image\` field with a valid URL (token logo)
- Merkle challenges are NOT compatible with liquidity pools
- This enables decentralized exchange (DEX) trading interfaces`
  },
  {
    id: 'fungible-token',
    name: 'Fungible Token',
    category: 'token-type',
    description: 'Simple fungible token with fixed or unlimited supply and configurable mint/transfer approvals',
    summary: `Required standards: ["Fungible Tokens"]

- validTokenIds: MUST be exactly [{ "start": "1", "end": "1" }] (single token ID)
- All tokens share the same token ID (1), making them interchangeable
- Amount field in transfers determines quantity
- Token metadata must reference token ID 1
- Ownership times typically forever: [{ "start": "1", "end": "18446744073709551615" }]`,
    instructions: `## Fungible Token Configuration

When creating a fungible token collection, you MUST follow these requirements:

### Required Configuration

1. **validTokenIds**: Set to exactly [{ "start": "1", "end": "1" }]
   - This ensures only token ID 1 is valid
   - This is the standard pattern for fungible tokens

2. **Standards**: Include "Fungible Tokens" in the standards array
   - Example: "standards": ["Fungible Tokens"]

3. **Token Metadata**: Each tokenMetadata entry must reference token ID 1
   - Example: "tokenIds": [{ "start": "1", "end": "1" }]

### Pattern-Specific Gotchas

- All tokens share the same token ID (1), making them interchangeable
- Amount field in transfers determines quantity (e.g., "amount": "100" means 100 tokens)
- Ownership times are typically forever: [{ "start": "1", "end": "18446744073709551615" }]

### Example Structure

\`\`\`json
{
  "updateValidTokenIds": true,
  "validTokenIds": [{ "start": "1", "end": "1" }],
  "updateStandards": true,
  "standards": ["Fungible Tokens"],
  "updateTokenMetadata": true,
  "tokenMetadata": [{
    "uri": "ipfs://...",
    "customData": "",
    "tokenIds": [{ "start": "1", "end": "1" }]
  }]
}
\`\`\``
  },
  {
    id: 'nft-collection',
    name: 'NFT Collection',
    category: 'token-type',
    description: 'Non-fungible token collection with unique token IDs, metadata URIs, and badge-based ownership',
    summary: `Required standards: ["NFTs"]
- For tradable NFTs: ["NFTs", "Tradable", "DefaultDisplayCurrency:ubadge"]

- validTokenIds: set to the range of unique token IDs (e.g. [{ "start": "1", "end": "100" }])
- Each token ID represents a unique NFT; amount in transfers is typically "1"
- Use {id} placeholder in tokenMetadata URI for per-token metadata (e.g. "ipfs://QmHash/{id}")
- Mint approvals MUST have overridesFromOutgoingApprovals: true
- Ownership times are usually forever for NFTs`,
    instructions: `## NFT Collection Configuration

When creating an NFT collection, follow this pattern:

### Required Configuration

1. **Standards**: Include "NFTs" in the standards array
   - Example: "standards": ["NFTs"]
   - For tradable NFTs: "standards": ["NFTs", "Tradable", "DefaultDisplayCurrency:ubadge"]

2. **validTokenIds**: Set to the range of unique token IDs
   - Example for 100 NFTs: [{ "start": "1", "end": "100" }]
   - Each token ID represents a unique NFT

3. **Token Metadata**: Each tokenMetadata entry must include tokenIds matching the range
   - Use {id} placeholder for per-token metadata URIs

### Pattern Example

\`\`\`json
{
  "updateValidTokenIds": true,
  "validTokenIds": [{ "start": "1", "end": "100" }],
  "updateCollectionMetadata": true,
  "collectionMetadata": {
    "uri": "ipfs://QmCollectionMetadata",
    "customData": ""
  },
  "updateTokenMetadata": true,
  "tokenMetadata": [{
    "uri": "ipfs://QmTokenMetadata/{id}",
    "customData": "",
    "tokenIds": [{ "start": "1", "end": "100" }]
  }],
  "updateCollectionApprovals": true,
  "collectionApprovals": [{
    "fromListId": "Mint",
    "toListId": "All",
    "initiatedByListId": "bb1creator...",
    "approvalId": "manager-mint",
    "tokenIds": [{ "start": "1", "end": "100" }],
    "transferTimes": [{ "start": "1", "end": "18446744073709551615" }],
    "ownershipTimes": [{ "start": "1", "end": "18446744073709551615" }],
    "approvalCriteria": {
      "overridesFromOutgoingApprovals": true
    }
  }],
  "updateStandards": true,
  "standards": ["NFTs"]
}
\`\`\`

### NFT-Specific Gotchas

- Each token ID is unique and represents a distinct NFT
- Amount in transfers is typically "1" (one NFT per transfer)
- Ownership times are usually forever for NFTs
- Mint approvals MUST have overridesFromOutgoingApprovals: true
- Use {id} in metadata URIs for per-token metadata`
  },
  {
    id: 'subscription',
    name: 'Subscription',
    category: 'token-type',
    description: 'Time-based subscription token with recurring payment approvals and auto-deletion on expiry',
    summary: `Required standards: ["Subscriptions"]

- validTokenIds: MUST be exactly one token ID [{ "start": "1", "end": "1" }]
- Subscription faucet approval requirements:
  - fromListId: "Mint"
  - overridesFromOutgoingApprovals: true
  - coinTransfers: at least 1 entry, both override flags false
  - predeterminedBalances.incrementedBalances.durationFromTimestamp: MUST be non-zero (duration in ms)
  - allowOverrideTimestamp: MUST be true
  - incrementTokenIdsBy: "0", incrementOwnershipTimesBy: "0"
  - orderCalculationMethod: MUST have exactly ONE method true (default: useOverallNumTransfers)
- Duration constants: monthly = "2592000000", annual = "31536000000", daily = "86400000"
- CRITICAL: recurringOwnershipTimes MUST be all-zeros { startTime: "0", intervalLength: "0", chargePeriodLength: "0" } — chain enforces mutual exclusivity with durationFromTimestamp`,
    instructions: `## Subscription Collection Configuration

When creating a subscription collection, you MUST follow these EXACT requirements:

### Required Structure

1. **Standards**: MUST include "Subscriptions"
   - "standards": ["Subscriptions"]

2. **validTokenIds**: MUST be exactly one token ID
   - "validTokenIds": [{ "start": "1", "end": "1" }]

3. **Subscription Faucet Approval Requirements**:
   - fromListId: MUST be "Mint"
   - tokenIds: MUST be exactly 1 token: [{ "start": "1", "end": "1" }]
   - coinTransfers: MUST have at least 1 entry, NO override flags (both false)
   - predeterminedBalances.incrementedBalances:
     - durationFromTimestamp: MUST be non-zero (subscription duration in milliseconds)
     - allowOverrideTimestamp: MUST be true
     - incrementTokenIdsBy: "0"
     - incrementOwnershipTimesBy: "0"
   - orderCalculationMethod: MUST have EXACTLY ONE method set to true (default: useOverallNumTransfers)
   - overridesFromOutgoingApprovals: true (required for Mint approvals)

### Duration Constants (in milliseconds)

- Monthly: "2592000000" (30 days)
- Annual: "31536000000" (365 days)
- Daily: "86400000" (24 hours)

### Complete Example

\`\`\`json
{
  "standards": ["Subscriptions"],
  "validTokenIds": [{ "start": "1", "end": "1" }],
  "collectionApprovals": [{
    "fromListId": "Mint",
    "toListId": "All",
    "initiatedByListId": "All",
    "approvalId": "subscription-mint",
    "tokenIds": [{ "start": "1", "end": "1" }],
    "transferTimes": [{ "start": "1", "end": "18446744073709551615" }],
    "ownershipTimes": [{ "start": "1", "end": "18446744073709551615" }],
    "approvalCriteria": {
      "coinTransfers": [{
        "to": "bb1creator...",
        "coins": [{ "denom": "ubadge", "amount": "5000000000" }],
        "overrideFromWithApproverAddress": false,
        "overrideToWithInitiator": false
      }],
      "predeterminedBalances": {
        "incrementedBalances": {
          "startBalances": [{ "amount": "1", "tokenIds": [{ "start": "1", "end": "1" }], "ownershipTimes": [{ "start": "1", "end": "18446744073709551615" }] }],
          "incrementTokenIdsBy": "0",
          "incrementOwnershipTimesBy": "0",
          "durationFromTimestamp": "2592000000",
          "allowOverrideTimestamp": true,
          "recurringOwnershipTimes": { "startTime": "0", "intervalLength": "0", "chargePeriodLength": "0" },
          "allowOverrideWithAnyValidToken": false
        },
        "orderCalculationMethod": {
          "useOverallNumTransfers": true,
          "usePerToAddressNumTransfers": false,
          "usePerFromAddressNumTransfers": false,
          "usePerInitiatedByAddressNumTransfers": false,
          "useMerkleChallengeLeafIndex": false,
          "challengeTrackerId": ""
        },
        "manualBalances": []
      },
      "overridesFromOutgoingApprovals": true,
      "merkleChallenges": []
    }
  }]
}
\`\`\`

### Subscription-Specific Gotchas

- MUST have exactly 1 token ID (not multiple)
- coinTransfers override flags MUST be false (not true)
- durationFromTimestamp MUST be non-zero
- allowOverrideTimestamp MUST be true
- **CRITICAL MUTUAL EXCLUSIVITY**: The chain enforces that ONLY ONE of \`durationFromTimestamp\`, \`incrementOwnershipTimesBy\`, or \`recurringOwnershipTimes\` can be non-zero. For subscriptions, use \`durationFromTimestamp\` and keep \`recurringOwnershipTimes\` as ALL ZEROS: \`{ "startTime": "0", "intervalLength": "0", "chargePeriodLength": "0" }\`. DO NOT set non-zero values in \`recurringOwnershipTimes\` — the template already has the correct structure.`
  },
  {
    id: 'immutability',
    name: 'Transferability & Update Rules',
    category: 'advanced',
    description: 'Lock collection permissions to make properties permanently immutable or permanently permitted',
    summary: `Controls whether collection properties can be changed after creation.

- canUpdateCollectionApprovals: controls transfer rule mutability
  - SECURITY: If manager can update Mint approvals, they can mint unlimited tokens
  - Default to frozen (permanentlyForbiddenTimes: full range) unless user requests updatable
- List IDs in permissions: ONLY use reserved IDs ("All", "Mint", "!Mint", direct "bb1..." addresses, "!bb1..." negation, colon-separated "bb1abc:bb1xyz") — NO custom list IDs
- approvalId: "All" restricts all approvals, or use a specific approvalId string
- Empty permission arrays: if both permanentlyPermittedTimes and permanentlyForbiddenTimes are [], the entry is redundant — replace with empty array []
- permanentlyForbiddenTimes: [{ "start": "1", "end": "18446744073709551615" }] = frozen forever`,
    instructions: `## Transferability & Update Rules Configuration

When configuring collection permissions for transferability and update rules, you MUST follow these critical requirements:

### Critical Permission Rules

**canUpdateCollectionApprovals**:
   - **CRITICAL**: Controls whether transfer rules (approvals) can be changed after creation
   - **SECURITY RISK**: If the manager can update approvals from the "Mint" address, they can mint any amount
   - **DEFAULT**: Should be **forbidden (frozen)** for collections where transfer rules should be locked
   - **Format**: Uses CollectionApprovalPermission format (see below)

### CollectionApprovalPermission Format

\`\`\`json
{
  "fromListId": "All",
  "toListId": "All",
  "initiatedByListId": "All",
  "transferTimes": [{ "start": "1", "end": "18446744073709551615" }],
  "tokenIds": [{ "start": "1", "end": "18446744073709551615" }],
  "ownershipTimes": [{ "start": "1", "end": "18446744073709551615" }],
  "approvalId": "All",
  "permanentlyPermittedTimes": [],
  "permanentlyForbiddenTimes": [{ "start": "1", "end": "18446744073709551615" }]
}
\`\`\`

**Key Fields:**
- **List IDs** (fromListId, toListId, initiatedByListId): Use ONLY reserved list IDs:
  - "All" — Any address
  - "Mint" — Mint address
  - "!Mint" — Everything except Mint
  - "bb1..." — Direct address
  - "!bb1..." — Everything except the specific address
  - "bb1abc:bb1xyz" — Colon-separated addresses
  - **DO NOT USE**: Custom list IDs — only reserved IDs or direct addresses
- **approvalId**: "All" to restrict all approvals, or a specific approvalId string

### Example: Immutable Transfer Rules (All Frozen)

\`\`\`json
{
  "collectionPermissions": {
    "canUpdateCollectionApprovals": [{
      "fromListId": "All",
      "toListId": "All",
      "initiatedByListId": "All",
      "transferTimes": [{ "start": "1", "end": "18446744073709551615" }],
      "tokenIds": [{ "start": "1", "end": "18446744073709551615" }],
      "ownershipTimes": [{ "start": "1", "end": "18446744073709551615" }],
      "approvalId": "All",
      "permanentlyForbiddenTimes": [{ "start": "1", "end": "18446744073709551615" }],
      "permanentlyPermittedTimes": []
    }]
  }
}
\`\`\`

### Example: Restricting Only Mint Approvals

\`\`\`json
{
  "canUpdateCollectionApprovals": [{
    "fromListId": "Mint",
    "toListId": "All",
    "initiatedByListId": "All",
    "transferTimes": [{ "start": "1", "end": "18446744073709551615" }],
    "tokenIds": [{ "start": "1", "end": "18446744073709551615" }],
    "ownershipTimes": [{ "start": "1", "end": "18446744073709551615" }],
    "approvalId": "All",
    "permanentlyForbiddenTimes": [{ "start": "1", "end": "18446744073709551615" }],
    "permanentlyPermittedTimes": []
  }]
}
\`\`\`

### Example: Restricting Specific Approval ID

\`\`\`json
{
  "canUpdateCollectionApprovals": [{
    "fromListId": "All",
    "toListId": "All",
    "initiatedByListId": "All",
    "transferTimes": [{ "start": "1", "end": "18446744073709551615" }],
    "tokenIds": [{ "start": "1", "end": "18446744073709551615" }],
    "ownershipTimes": [{ "start": "1", "end": "18446744073709551615" }],
    "approvalId": "mint-approval",
    "permanentlyForbiddenTimes": [{ "start": "1", "end": "18446744073709551615" }],
    "permanentlyPermittedTimes": []
  }]
}
\`\`\`

### Empty Permission Arrays — CRITICAL

**IMPORTANT**: If a permission entry has both \`permanentlyPermittedTimes\` and \`permanentlyForbiddenTimes\` as empty arrays, the entire permission entry is redundant and should be replaced with an empty array.

**For ActionPermission** (canDeleteCollection, canArchiveCollection, etc.):
- Wrong: \`"canArchiveCollection": [{ "permanentlyPermittedTimes": [], "permanentlyForbiddenTimes": [] }]\`
- Correct: \`"canArchiveCollection": []\`

**For TokenIdsActionPermission** (canUpdateTokenMetadata, canUpdateValidTokenIds):
- Wrong: \`"canUpdateTokenMetadata": [{ "tokenIds": [...], "permanentlyPermittedTimes": [], "permanentlyForbiddenTimes": [] }]\`
- Correct: \`"canUpdateTokenMetadata": []\`

**For CollectionApprovalPermission** (canUpdateCollectionApprovals):
- If both time arrays are empty, use empty array: \`"canUpdateCollectionApprovals": []\`

### Security Considerations

- **Mint Transfer Rules**: If canUpdateCollectionApprovals is allowed for Mint, the manager could mint unlimited tokens
- **Post-Mint Transfer Rules**: If post-mint transfer rules can be updated, the manager could change transferability
- **Best Practice**: Default to locked (frozen) transfer rules unless user explicitly requests updatable rules
- Only allow updates for dynamic collections where the user explicitly requests flexibility`
  },
  {
    id: 'custom-2fa',
    name: 'Custom 2FA',
    category: 'token-type',
    description: 'Two-factor authentication for transfers using a secondary approval address',
    summary: `Required standards: ["Custom-2FA"]

- autoDeletionOptions.allowPurgeIfExpired: MUST be true
- Approval name MUST contain "Custom 2FA"
- Use time-dependent ownershipTimes in MsgTransferTokens (not forever)
- Calculate timestamps: current time + expiration duration (milliseconds since epoch)
- Tokens automatically expire and can be purged after expiration`,
    instructions: `## Custom-2FA Configuration

When creating a Custom-2FA collection, follow these requirements:

### Required Structure

1. **Standards**: MUST include "Custom-2FA"
   - "standards": ["Custom-2FA"]

2. **Approval Requirements**:
   - autoDeletionOptions.allowPurgeIfExpired: MUST be true
   - This allows expired tokens to be automatically purged
   - Approval name MUST contain "Custom 2FA"

3. **Time-Dependent Ownership**: Use time-dependent ownershipTimes in MsgTransferTokens
   - Calculate timestamps: current time + expiration duration
   - Example: 5 minutes = Date.now() + (5 * 60 * 1000)

### Complete Example

\`\`\`json
{
  "messages": [
    {
      "typeUrl": "/tokenization.MsgUniversalUpdateCollection",
      "value": {
        "standards": ["Custom-2FA"],
        "collectionApprovals": [{
          "fromListId": "Mint",
          "toListId": "All",
          "initiatedByListId": "bb1manager...",
          "approvalId": "2fa-mint",
          "tokenIds": [{ "start": "1", "end": "18446744073709551615" }],
          "transferTimes": [{ "start": "1", "end": "18446744073709551615" }],
          "ownershipTimes": [{ "start": "1", "end": "18446744073709551615" }],
          "approvalCriteria": {
            "overridesFromOutgoingApprovals": true,
            "autoDeletionOptions": { "allowPurgeIfExpired": true }
          }
        }]
      }
    },
    {
      "typeUrl": "/tokenization.MsgTransferTokens",
      "value": {
        "collectionId": "0",
        "transfers": [{
          "from": "Mint",
          "toAddresses": ["bb1recipient..."],
          "balances": [{
            "amount": "1",
            "tokenIds": [{ "start": "1", "end": "1" }],
            "ownershipTimes": [{ "start": "1706000000000", "end": "1706000300000" }]
          }]
        }]
      }
    }
  ]
}
\`\`\`

### 2FA-Specific Gotchas

- MUST set allowPurgeIfExpired: true
- Use time-dependent ownershipTimes in transfers (not forever)
- Calculate expiration timestamps correctly (milliseconds since epoch)
- Tokens automatically expire and can be purged after expiration`
  },
  {
    id: 'address-list',
    name: 'Address List',
    category: 'token-type',
    description: 'On-chain managed address list where membership = owning x1 of token ID 1',
    summary: `IMPORTANT: Call build_address_list() — NOT build_token. The tool handles all required structure automatically.

- List membership = owning x1 of token ID 1
- Manager can add (mint) and remove (burn) addresses
- No peer-to-peer transfers
- Requires TWO approvals: manager-add (minting) + manager-remove (burn to bb1qqq...s7gvmv)
- After building, proceed with audit_collection + validate_transaction as normal`,
    instructions: `## Address List Token Type

**IMPORTANT: Call build_address_list() to create this collection.** Do NOT call build_token — it does not support address lists. The build_address_list tool handles all the required structure automatically (both add and remove approvals, correct standard, correct approvalIds, correct permissions).

### Usage
\`\`\`
build_address_list({
  creatorAddress: "bb1...",
  name: "My List Name",
  description: "Description of the list",
  imageUrl: "https://..."
})
\`\`\`

This creates a token collection where list membership = owning x1 of token ID 1. The manager can add (mint) and remove (burn) addresses. No peer-to-peer transfers.

After calling build_address_list, proceed with audit_collection and validate_transaction as normal.`
  },
  {
    id: 'bb-402',
    name: 'BB-402 Token-Gated Access',
    category: 'feature',
    description: 'Token-gated access protocol where ownership of specific badges grants API/resource access',
    summary: `Protocol for token-gated access to APIs/resources using HTTP 402 Payment Required.

- Flow: client requests resource -> server returns 402 + required badge criteria -> client proves ownership -> server validates via BitBadges API
- ownershipRequirements: use $and for "must have all", $or for "must have any"
- mustOwnAmounts: { start: 1, end: 1 } = must own at least 1
- mustOwnAmounts: { start: 0, end: 0 } = must NOT own (exclusion)
- Tiered access: different token IDs = different access levels
- Time-bounded access: combine ownershipTimes with subscription tokens
- Server-side verification: BitBadgesApi.verifyOwnership() or Blockin sign-in`,
    instructions: `## BB-402 Token-Gated Access Protocol

BB-402 is a protocol for token-gated access to APIs and digital resources. It uses HTTP 402 Payment Required responses to signal that badge ownership is needed.

### How It Works

1. Client requests a protected resource
2. Server responds with HTTP 402 + required badge criteria
3. Client proves badge ownership (signs a challenge or presents proof)
4. Server validates ownership via BitBadges API and grants access

### Design Patterns

#### Pattern 1: Simple Badge Gate
Require ownership of a specific badge to access a resource.

\`\`\`json
{
  "ownershipRequirements": {
    "$and": [{
      "assets": [{
        "chain": "BitBadges",
        "collectionId": 123,
        "assetIds": [{ "start": 1, "end": 1 }],
        "mustOwnAmounts": { "start": 1, "end": 1 },
        "ownershipTimes": []
      }]
    }]
  }
}
\`\`\`

#### Pattern 2: Tiered Access
Different badge IDs = different access levels.
- Token ID 1 = Basic access
- Token ID 2 = Premium access
- Token ID 3 = Admin access

#### Pattern 3: Time-Bounded Access
Use ownershipTimes to restrict access to users who own the badge during specific periods. Combine with subscription tokens for recurring access.

#### Pattern 4: Multi-Collection Gate
Require badges from multiple collections using $and/$or logic.

### Implementation Steps

1. **Create the gate badge collection**: Use NFT, fungible, or subscription patterns
2. **Configure ownership requirements**: Define what badges grant what access
3. **Server integration**: Use BitBadges API to verify ownership:
   - \`BitBadgesApi.verifyOwnership()\` for programmatic checks
   - Blockin sign-in for session-based authentication
4. **Client integration**: Handle 402 responses, present proof of ownership

### BB-402 Gotchas

- Badge ownership checks are point-in-time — consider caching strategies
- For subscription-based access, check ownershipTimes overlap with current time
- Use $and for "must have all", $or for "must have any"
- mustOwnAmounts: { start: 0, end: 0 } means must NOT own (exclusion)
- mustOwnAmounts: { start: 1, end: 1 } means must own at least 1`
  },
  {
    id: 'burnable',
    name: 'Burnable',
    category: 'approval',
    description: 'Allow token holders to burn tokens by sending them to the burn address, permanently removing them from circulation',
    summary: `Allows holders to permanently destroy tokens by sending to burn address.

- Burn address: bb1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqs7gvmv (ETH null address in BitBadges format)
- Approval structure: fromListId: "!Mint", toListId: burn address
- overridesToIncomingApprovals: true (burn address has no user-level incoming approvals)
- approvalId: "burnable-approval" (standard ID used by frontend to detect burnability)
- All amounts/transfers set to "0" (unlimited)
- Additive: sits alongside other collection approvals
- Do NOT use with: credit tokens (increment-only), soulbound tokens, subscription tokens`,
    instructions: `## Burnable Tokens

### Concept

A burnable approval allows any token holder to permanently destroy their tokens by transferring them to the burn address. This is useful for deflationary tokens, redemption systems, or any scenario where tokens should be removable from circulation.

### Burn Address

The burn address is the ETH null address (0x0000000000000000000000000000000000000000) converted to BitBadges format:
\`bb1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqs7gvmv\`

Tokens sent to this address are effectively destroyed — no one controls the private key.

### Required Approval Structure

Add this approval to \`collectionApprovals\`:

\`\`\`json
{
  "fromListId": "!Mint",
  "toListId": "bb1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqs7gvmv",
  "initiatedByListId": "All",
  "transferTimes": [{ "start": "1", "end": "18446744073709551615" }],
  "tokenIds": [{ "start": "1", "end": "18446744073709551615" }],
  "ownershipTimes": [{ "start": "1", "end": "18446744073709551615" }],
  "approvalId": "burnable-approval",
  "uri": "",
  "customData": "",
  "version": 0,
  "approvalCriteria": {
    "predeterminedBalances": {
      "manualBalances": [],
      "incrementedBalances": {
        "startBalances": [],
        "incrementTokenIdsBy": "0",
        "incrementOwnershipTimesBy": "0",
        "allowOverrideTimestamp": false,
        "recurringOwnershipTimes": { "startTime": "0", "intervalLength": "0", "chargePeriodLength": "0" },
        "allowOverrideWithAnyValidToken": false
      },
      "orderCalculationMethod": { "useOverallNumTransfers": false, "usePerToAddressNumTransfers": false, "usePerFromAddressNumTransfers": false, "usePerInitiatedByAddressNumTransfers": false, "useMerkleChallengeLeafIndex": false, "challengeTrackerId": "" }
    },
    "approvalAmounts": { "overallApprovalAmount": "0", "perToAddressApprovalAmount": "0", "perFromAddressApprovalAmount": "0", "perInitiatedByAddressApprovalAmount": "0", "amountTrackerId": "", "resetTimeIntervals": { "startTime": "0", "intervalLength": "0" } },
    "maxNumTransfers": { "overallMaxNumTransfers": "0", "perToAddressMaxNumTransfers": "0", "perFromAddressMaxNumTransfers": "0", "perInitiatedByAddressMaxNumTransfers": "0", "amountTrackerId": "", "resetTimeIntervals": { "startTime": "0", "intervalLength": "0" } },
    "coinTransfers": [],
    "merkleChallenges": [],
    "mustOwnTokens": [],
    "overridesFromOutgoingApprovals": false,
    "overridesToIncomingApprovals": true,
    "mustPrioritize": false
  }
}
\`\`\`

### Key Fields Explained

- **fromListId: "!Mint"** — any holder (everyone except the Mint address) can burn
- **toListId: "bb1qqqqqqq..."** — destination is the burn address (a single-address list)
- **initiatedByListId: "All"** — anyone can initiate the burn (typically the holder themselves)
- **overridesToIncomingApprovals: true** — the burn address has no user-level incoming approvals, so this must override
- **approvalId: "burnable-approval"** — standard ID used by the frontend to detect burnability
- All amounts/transfers set to "0" (unlimited)

### Combining with Other Approvals

The burnable approval is additive — it sits alongside other collection approvals (mint approvals, transferable approvals, etc.). Order matters: place it after mint approvals but the system will match based on from/to addresses.

### When NOT to Use

- **Credit tokens**: These are increment-only by design; burning defeats the purpose
- **Soulbound tokens**: If tokens should be permanently bound to an address, don't add a burn approval
- **Subscription tokens**: Typically managed by the issuer, not burned by holders`
  },
  {
    id: 'multi-sig-voting',
    name: 'Multi-Sig / Voting',
    category: 'approval',
    description: 'Require weighted quorum voting from multiple parties before transfers can proceed (multi-sig, governance, etc.)',
    summary: `Enables multi-signature-like approval via votingChallenges[] in approvalCriteria.

- Each voter has an address and a weight
- quorumThreshold: percentage (0-100) of total possible weight that must vote "yes"
- Voters cast votes via MsgCastVote with yesWeight (0-100%)
- Non-voting voters count as 0% yes; threshold is % of ALL voters' total weight, not just those who voted
- Votes can be updated (re-casting overwrites previous vote)
- proposalId: unique identifier — changing it resets the vote tracker
- Vote state does not reset after quorum met — designed for one-time transfers
- Common patterns: unanimous (threshold: "100", equal weights), majority (threshold: "51"), weighted governance`,
    instructions: `## Multi-Sig / Voting Challenges

### Concept

Voting challenges enable multi-signature-like approval where multiple parties must vote before a transfer can proceed. Each voter has a configurable weight, and a quorum threshold (percentage of total weight) must be met. This is configured via the \`votingChallenges[]\` field in \`approvalCriteria\`.

### How It Works

1. An approval has \`votingChallenges\` with a list of voters, weights, and a quorum threshold
2. Voters cast votes using \`MsgCastVote\` with a \`yesWeight\` (0-100%)
3. When a transfer is attempted, the system checks if the quorum threshold is met
4. Threshold is calculated as a percentage of **total possible weight** (all voters), not just those who voted
5. Non-voting voters count as 0% yes

### Structure

\`\`\`json
{
  "votingChallenges": [
    {
      "proposalId": "proposal-1",
      "quorumThreshold": "50",
      "voters": [
        { "address": "bb1alice...", "weight": "100" },
        { "address": "bb1bob...", "weight": "200" },
        { "address": "bb1charlie...", "weight": "50" }
      ],
      "uri": "",
      "customData": ""
    }
  ]
}
\`\`\`

### Key Fields

- **proposalId**: Unique identifier for tracking votes. Changing it resets the vote tracker.
- **quorumThreshold**: Percentage (0-100) of total possible weight that must vote "yes"
- **voters**: List of voter addresses with their weights
- **yesWeight** (in MsgCastVote): Percentage (0-100%) allocated to "yes"; remainder goes to "no"

### Common Patterns

#### Multi-Sig (Unanimous)
All parties must approve. Set \`quorumThreshold: "100"\` with equal weights:
\`\`\`json
{ "quorumThreshold": "100", "voters": [
  { "address": "bb1a...", "weight": "1" },
  { "address": "bb1b...", "weight": "1" },
  { "address": "bb1c...", "weight": "1" }
]}
\`\`\`

#### Majority Vote
Require >50% approval:
\`\`\`json
{ "quorumThreshold": "51", "voters": [
  { "address": "bb1a...", "weight": "1" },
  { "address": "bb1b...", "weight": "1" },
  { "address": "bb1c...", "weight": "1" }
]}
\`\`\`

#### Weighted Governance
Different stakeholders have different voting power:
\`\`\`json
{ "quorumThreshold": "66", "voters": [
  { "address": "bb1founder...", "weight": "1000" },
  { "address": "bb1investor...", "weight": "500" },
  { "address": "bb1community...", "weight": "100" }
]}
\`\`\`

### Threshold Calculation Example

- Voter A: weight 100, votes 100% yes → contributes 100
- Voter B: weight 200, votes 50% yes → contributes 100
- Voter C: weight 50, doesn't vote → contributes 0
- Total possible weight: 350
- Total yes weight: 200
- Percentage: (200 × 100) / 350 = 57.14%
- If quorumThreshold is 50 → **satisfied**

### Important Notes

- Votes are cast via \`MsgCastVote\` — a separate transaction from the transfer itself
- Votes can be updated (re-casting overwrites the previous vote)
- Vote keys are scoped: \`collectionId-approverAddress-approvalLevel-approvalId-proposalId-voterAddress\`
- Set realistic thresholds — high thresholds with many voters may be hard to meet if voters abstain
- **Vote state does not reset** — votingChallenges are scoped to the approval and are typically used for one-time transfers (e.g., releasing funds once). Once the quorum is met, the approval remains satisfied. For more advanced recurring multi-sig solutions, you may need to get creative with other primitives (e.g., rotating proposalIds, dynamic stores, or manager-controlled approval updates).
- For full documentation, see the BitBadges docs on voting challenges`
  },
  {
    id: 'ai-criteria-gate',
    name: 'AI Criteria Gate',
    category: 'feature',
    description: 'AI-evaluated criteria gate using attestation NFTs and dynamic store for automated access decisions',
    summary: `AI agent evaluates criteria and gates access via attestation NFTs or dynamic store entries.

- Approach 1 (Attestation NFT): AI agent is sole minter of non-transferable NFTs; gate access via BB-402 / must-own-badges
  - Non-transferable: no transferable approval + locked canUpdateCollectionApprovals
  - On-chain proof, composable, but requires gas per attestation
- Approach 2 (Dynamic Store): AI agent writes to off-chain dynamic store; claims use whitelist plugin with useDynamicStore: true
  - No gas per evaluation, but off-chain and not composable on-chain
- Store AI agent address in collection.customData (JSON)`,
    instructions: `## AI Criteria Gate

An AI Criteria Gate uses an AI agent to evaluate whether users meet certain criteria, then gates access via attestation NFTs or dynamic store entries.

### Two Approaches

#### Approach 1: Attestation NFT
The AI agent mints a non-transferable NFT (attestation badge) to users who pass evaluation. Access is then gated on owning that badge.

**Setup:**
1. Create an NFT collection with the AI agent as the sole minter (initiatedByListId: agent's address)
2. Make it non-transferable (no transferable approval, locked canUpdateCollectionApprovals)
3. AI agent evaluates criteria → mints badge to qualifying users
4. Gate access using BB-402 / must-own-badges on the attestation collection

**Pros:** On-chain proof, composable, works with any badge-gated system
**Cons:** Requires transaction per attestation, gas costs

#### Approach 2: Dynamic Store
The AI agent writes qualifying addresses to an off-chain dynamic store. Claims use the whitelist plugin with useDynamicStore: true.

**Setup:**
1. Create a dynamic store via the developer portal
2. AI agent evaluates criteria → writes qualifying addresses to the store
3. Use whitelist plugin with useDynamicStore: true and the store's dynamicDataId
4. Users claim through the off-chain claim flow

**Pros:** No gas per evaluation, instant updates, flexible
**Cons:** Off-chain (relies on BitBadges infrastructure), not composable on-chain

### Combining Both

For maximum flexibility:
1. AI agent evaluates criteria
2. Writes to dynamic store for immediate access (claims)
3. Mints attestation NFT for permanent on-chain proof
4. Different resources can check either or both

### Implementation

1. Create the attestation collection and/or dynamic store
2. Configure the AI agent with evaluation criteria
3. Store the agent's address in collection.customData (JSON)
4. Wire up BB-402 or claim plugins to check ownership/store membership`
  },
  {
    id: 'verified',
    name: 'Verified Gate',
    category: 'feature',
    description: 'Gate access based on BitBadges verified credential badges (collection ID 1)',
    referenceCollectionIds: ['1'],
    summary: `Gate access based on BitBadges verified credential badges (collection ID 1).

- Collection 1 is managed by BitBadges — you cannot mint badges in it
- Different token IDs = different verification types
- On-chain gate: use mustOwnTokens in approvalCriteria with collectionId: "1"
  - Set overrideWithCurrentTime: true for current ownership verification
  - Empty ownershipTimes = any ownership time qualifies
- Off-chain gate: use must-own-badges claim plugin with collectionId: 1
- Combine with other gates using $and/$or for multi-factor verification`,
    instructions: `## Verified Gate

Gate access based on BitBadges verified credential badges. Collection ID 1 contains verification attestation badges managed by the BitBadges team.

### How It Works

BitBadges collection 1 contains verification badges. Different token IDs represent different verification types. Users who have been verified own the corresponding badge. You can gate access by requiring ownership of specific verification badges.

### On-Chain Gate (mustOwnTokens in approvalCriteria)

\`\`\`json
{
  "approvalCriteria": {
    "mustOwnTokens": [{
      "collectionId": "1",
      "amountRange": { "start": "1", "end": "18446744073709551615" },
      "tokenIds": [{ "start": "1", "end": "1" }],
      "ownershipTimes": [],
      "overrideWithCurrentTime": true
    }]
  }
}
\`\`\`

### Off-Chain Gate (must-own-badges claim plugin)

\`\`\`json
{
  "pluginId": "must-own-badges",
  "publicParams": {
    "ownershipRequirements": {
      "$and": [{
        "assets": [{
          "chain": "BitBadges",
          "collectionId": 1,
          "assetIds": [{ "start": 1, "end": 1 }],
          "mustOwnAmounts": { "start": 1, "end": 1 },
          "ownershipTimes": []
        }]
      }]
    }
  },
  "privateParams": {}
}
\`\`\`

### Verified Gate Gotchas

- Collection ID 1 is managed by BitBadges — you cannot mint badges in it
- Token IDs in collection 1 correspond to different verification types
- Use overrideWithCurrentTime: true for on-chain checks to verify current ownership
- Empty ownershipTimes means any ownership time qualifies
- Combine with other gates using $and/$or for multi-factor verification`
  },
  {
    id: 'payment-protocol',
    name: 'Payment Protocol',
    category: 'token-type',
    description: 'Invoices, escrows, bounties, and payment receipts using ListView standard and coinTransfer-based approvals',
    summary: `Build invoices, milestones, bounties, or escrow-based payment collections.

- Approach 1 (coinTransfer-based): each approval = one invoice/milestone with coinTransfers
  - Required standards: ["ListView:Milestones"] or ["ListView:Invoice Requests"] or ["ListView:Bounties"]
  - Each approval has fromListId: "Mint", coinTransfers for payment, overridesFromOutgoingApprovals: true
- Approach 2 (Escrow-based): Smart Token with IBC backing for hold-and-release
  - Use when funds must be held until conditions are met
- Lock canUpdateCollectionApprovals for immutable payment terms
- ListView is incompatible with: Subscriptions, Smart Tokens, Custom 2FA, Liquidity Pools, Tradable NFTs
- Initiator pays gas; for mint-based payments, the payer initiates`,
    instructions: `## Payment Protocol

Build invoices, milestones, bounties, or escrow-based payment collections.

### Two Approaches

#### Approach 1: coinTransfer-Based (Simple Payments)
Each approval is an invoice/milestone with coinTransfers. Uses the **ListView** display standard.

**Required:**
- Standards: ["ListView:Milestones"] or ["ListView:Invoice Requests"] or ["ListView:Bounties"]
- Each item = one collection-level approval with:
  - fromListId: "Mint" (for new tokens) or specific address (for transfers)
  - coinTransfers: payment amount and recipient
  - overridesFromOutgoingApprovals: true (if fromListId is "Mint")

**Invoice/Milestone Example:**
\`\`\`json
{
  "collectionApprovals": [
    {
      "fromListId": "Mint",
      "toListId": "All",
      "initiatedByListId": "bb1payer...",
      "approvalId": "milestone-1",
      "tokenIds": [{ "start": "1", "end": "1" }],
      "transferTimes": [{ "start": "1", "end": "18446744073709551615" }],
      "ownershipTimes": [{ "start": "1", "end": "18446744073709551615" }],
      "uri": "ipfs://milestone-1-metadata",
      "customData": "",
      "approvalCriteria": {
        "coinTransfers": [{
          "to": "bb1payee...",
          "coins": [{ "denom": "ubadge", "amount": "10000000000" }],
          "overrideFromWithApproverAddress": false,
          "overrideToWithInitiator": false
        }],
        "overridesFromOutgoingApprovals": true,
        "maxNumTransfers": {
          "overallMaxNumTransfers": "1",
          "perToAddressMaxNumTransfers": "0",
          "perFromAddressMaxNumTransfers": "0",
          "perInitiatedByAddressMaxNumTransfers": "0",
          "amountTrackerId": "milestone-1-tracker",
          "resetTimeIntervals": { "startTime": "0", "intervalLength": "0" }
        }
      }
    }
  ],
  "standards": ["ListView:Milestones"]
}
\`\`\`

#### Approach 2: Escrow-Based (Smart Token)
Use a Smart Token with IBC backing for hold-and-release escrow. Funds are deposited to the backing address and released via unbacking approval when conditions are met.

**When to use escrow vs coinTransfers:**
- coinTransfers: One-shot payment at transfer time (simpler)
- Escrow: Funds held until conditions met, refundable (more complex but safer for both parties)

### Decision Tree

1. **coinTransfers vs 1:1 backing**: coinTransfers are simpler (one-shot payment). Smart Token escrow is needed when funds must be held, escrowed, or redeemable later.
2. **Permission locking**: For agreements (invoices, escrows), lock \`canUpdateCollectionApprovals\` so terms are immutable.
3. **Who pays gas?**: The initiator pays gas. For mint-based payments, the payer initiates.
4. **Multiple currencies**: A single collection can accept different IBC denoms in different approvals.
5. **Refunds**: For coinTransfer-based payments, refunds require a separate approval. For escrow, configure return-to-depositor.
6. **Standard incompatibility**: ListView is incompatible with Subscriptions, Smart Tokens, Custom 2FA, Liquidity Pools, Tradable NFTs, and other protocol standards.`
  },
  {
    id: 'tradable',
    name: 'Tradable NFTs',
    category: 'standard',
    description: 'Tradable token standard enabling peer-to-peer transfers with the "Tradable" protocol standard tag and DefaultDisplayCurrency',
    summary: `Required standards: ["Tradable", "NFTs", "DefaultDisplayCurrency:ubadge"]

- MUST include all three standards together
- DefaultDisplayCurrency format: "DefaultDisplayCurrency:<denom>" (sets pricing denomination for orderbook)
- MUST include a free transfer approval: fromListId: "!Mint", toListId: "All", initiatedByListId: "All", approvalId: "transferable-approval"
- Enables orderbook/marketplace integration
- Typically used with NFT collections`,
    instructions: `## Tradable NFTs Configuration

When enabling trading for NFTs, follow these requirements:

### Required Structure

1. **Standards**: MUST include "Tradable", "NFTs", and "DefaultDisplayCurrency:ubadge"
   - "standards": ["Tradable", "NFTs", "DefaultDisplayCurrency:ubadge"]
   - DefaultDisplayCurrency sets the pricing denomination for orderbook display
   - Replace "ubadge" with your desired currency denom if different

2. **Free Transfer Approval**: Include a default collection approval for peer-to-peer transfers
   \`\`\`json
   {
     "fromListId": "!Mint",
     "toListId": "All",
     "initiatedByListId": "All",
     "approvalId": "transferable-approval",
     "tokenIds": [{ "start": "1", "end": "18446744073709551615" }],
     "transferTimes": [{ "start": "1", "end": "18446744073709551615" }],
     "ownershipTimes": [{ "start": "1", "end": "18446744073709551615" }]
   }
   \`\`\`

### Complete Example

\`\`\`json
{
  "updateStandards": true,
  "standards": ["Tradable", "NFTs", "DefaultDisplayCurrency:ubadge"]
}
\`\`\`

### Tradable Gotchas

- MUST include all three standards together
- DefaultDisplayCurrency format: "DefaultDisplayCurrency:denom"
- This enables orderbook/marketplace integration
- Typically used with NFT collections
- The currency denom determines how prices are displayed in marketplaces`
  },
  {
    id: 'credit-token',
    name: 'Credit Token',
    category: 'token-type',
    description: 'Increment-only, non-transferable credit token purchased with any ICS20 denom. Users pay X of a denom and receive Y tokens as credits/proof of payment. For a 1:1 backed token with on-chain transferability, use the Smart Token standard instead.',
    referenceCollectionIds: ['23'],
    summary: `Required standards: ["Credit Token"]

- Increment-only, non-transferable (soulbound) fungible token purchased with ICS20 denom
- validTokenIds: [{ "start": "1", "end": "1" }] (single token ID)
- collectionApprovals: ONLY Mint approvals (no transferable/burnable approvals)
- Lock canUpdateCollectionApprovals (empty array = frozen)
- defaultBalances: autoApproveAllIncomingTransfers: true, autoApproveSelfInitiatedOutgoingTransfers: true, autoApproveSelfInitiatedIncomingTransfers: true
- All Mint approvals: overridesFromOutgoingApprovals: true, mustPrioritize: true
- Denomination tiers: create 8-10 approval tiers (credit-1, credit-5, credit-10, etc.) for greedy decomposition
- MUST include alias path for display
- All permissions locked (empty arrays)
- Key difference from Smart Token: one-way minting only, no backing/unbacking, no transferability`,
    instructions: `## Credit Token Configuration

### Concept

A Credit Token is an increment-only, non-transferable fungible token that users purchase with an ICS20 denom (USDC, ATOM, BADGE, etc.). Tokens serve as both proof of payment and consumable credits. This is a one-way system — tokens can only be minted (incremented), never sold back, burned, or transferred between users. For a 1:1 backed token with on-chain transferability, use the Smart Token standard instead.

### Payment Flow

When a user mints credit tokens, the payment (coinTransfers) goes directly to a **payout address** specified in the approval. The tokens are NOT redeemable post-mint — they are increment-only. The payout address receives the ICS20 denom immediately upon mint; there is no escrow or redemption mechanism.

### Usage Pattern: totalUsed / totalCreditsPaidFor

Credit tokens are designed for systems that track consumption off-chain. The on-chain token balance represents \`totalCreditsPaidFor\` — the total credits ever purchased. An off-chain system tracks \`totalUsed\`. The remaining budget is simply \`balance - totalUsed\`.

**Example: BitBadges AI Builder (Collection 23, AITOKEN)**
- User purchases 10 USDC → receives 1,000,000 AITOKEN (on-chain balance = 1,000,000)
- User makes AI builder requests → backend tracks \`totalUsed\` (e.g., 250,000 tokens used)
- Remaining budget = on-chain balance (1,000,000) - totalUsed (250,000) = 750,000
- User purchases 5 more USDC → on-chain balance increments to 2,000,000
- Remaining budget = 2,000,000 - 250,000 = 1,750,000
- The balance only ever goes up (increment-only). The off-chain \`totalUsed\` only ever goes up. Budget = balance - totalUsed.

### Required Structure

1. **Standards**: MUST include "Credit Token"
   - \`"standards": ["Credit Token"]\`

2. **validTokenIds**: Single fungible token ID
   - \`"validTokenIds": [{ "start": "1", "end": "1" }]\`

3. **Non-transferable (Soulbound)**: Only mint approvals allowed
   - \`collectionApprovals\` should ONLY contain approvals with \`"fromListId": "Mint"\`
   - No transferable-approval or burnable-approval
   - Lock \`canUpdateCollectionApprovals\` (empty array = frozen)

4. **Auto-approve incoming**: defaultBalances MUST have:
   - \`"autoApproveAllIncomingTransfers": true\`
   - \`"autoApproveSelfInitiatedOutgoingTransfers": true\`
   - \`"autoApproveSelfInitiatedIncomingTransfers": true\`

5. **Mint Approvals with coinTransfers**: Each approval mints tokens in exchange for payment
   - \`"fromListId": "Mint"\`
   - \`"toListId": "All"\`
   - \`"initiatedByListId": "All"\`
   - \`"overridesFromOutgoingApprovals": true\` (REQUIRED for all Mint approvals)
   - \`"mustPrioritize": true\`
   - \`coinTransfers\`: specifies payment amount and recipient

### Conversion Rate Pattern

The conversion rate is: X base units of ICS20 denom = Y tokens minted.

For example, if 1 USDC (1,000,000 base units) = 100,000 tokens:
- \`coinTransfers.coins[0].amount\`: "1000000" (1 USDC in base units)
- \`predeterminedBalances.incrementedBalances.startBalances[0].amount\`: "100000" (tokens minted)

### Denomination Tiers

Create multiple approval tiers for bulk purchases. Each tier has a unique \`approvalId\` (\`credit-<multiplier>\`) and mints a proportional amount of tokens. The frontend uses greedy decomposition to break any purchase amount into the fewest transactions.

**Choose 8-10 tiers** that make sense for the token's use case and expected purchase sizes. Cover a wide range from small to very large. The tiers are NOT hardcoded — pick the most applicable and efficient denominations for the specific token.

Example tiers (1 USDC = 100K tokens, but adapt to your use case):
| approvalId | Payment | Tokens Minted |
|---|---|---|
| credit-1 | 1 USDC | 100,000 |
| credit-5 | 5 USDC | 500,000 |
| credit-10 | 10 USDC | 1,000,000 |
| credit-50 | 50 USDC | 5,000,000 |
| credit-100 | 100 USDC | 10,000,000 |
| credit-500 | 500 USDC | 50,000,000 |
| credit-1000 | 1,000 USDC | 100,000,000 |
| credit-10000 | 10,000 USDC | 1,000,000,000 |
| credit-100000 | 100,000 USDC | 10,000,000,000 |
| credit-1000000000 | 1B USDC | 100T tokens |

The multiplier in the approvalId (e.g., \`credit-50\`) represents the number of base payment units. Each tier's payment = multiplier × base payment amount, and tokens minted = multiplier × tokens per unit.

### Alias Path (REQUIRED)

MUST include an alias path so tokens display nicely:
\`\`\`json
"aliasPathsToAdd": [{
  "denom": "u<symbol_lowercase>",
  "conversion": {
    "sideA": { "amount": "1" },
    "sideB": [{ "amount": "1", "ownershipTimes": [{"start":"1","end":"18446744073709551615"}], "tokenIds": [{"start":"1","end":"1"}] }]
  },
  "symbol": "<SYMBOL>",
  "denomUnits": [],
  "metadata": { "uri": "", "customData": "", "image": "https://example.com/token-logo.png" }
}]
\`\`\`

### Approval Template

Each mint approval follows this structure:
\`\`\`json
{
  "toListId": "All",
  "fromListId": "Mint",
  "initiatedByListId": "All",
  "transferTimes": [{ "start": "1", "end": "18446744073709551615" }],
  "tokenIds": [{ "start": "1", "end": "1" }],
  "ownershipTimes": [{ "start": "1", "end": "18446744073709551615" }],
  "approvalId": "credit-<amount>",
  "uri": "",
  "customData": "",
  "approvalCriteria": {
    "predeterminedBalances": {
      "manualBalances": [],
      "incrementedBalances": {
        "startBalances": [{ "amount": "<tokens_to_mint>", "tokenIds": [{"start":"1","end":"1"}], "ownershipTimes": [{"start":"1","end":"18446744073709551615"}] }],
        "incrementTokenIdsBy": "0",
        "incrementOwnershipTimesBy": "0",
        "allowOverrideTimestamp": false,
        "recurringOwnershipTimes": { "startTime": "0", "intervalLength": "0", "chargePeriodLength": "0" },
        "allowOverrideWithAnyValidToken": false
      },
      "orderCalculationMethod": { "useOverallNumTransfers": true, "usePerToAddressNumTransfers": false, "usePerFromAddressNumTransfers": false, "usePerInitiatedByAddressNumTransfers": false, "useMerkleChallengeLeafIndex": false, "challengeTrackerId": "" }
    },
    "approvalAmounts": { "overallApprovalAmount": "0", "perToAddressApprovalAmount": "0", "perFromAddressApprovalAmount": "0", "perInitiatedByAddressApprovalAmount": "0", "amountTrackerId": "credit-<amount>", "resetTimeIntervals": { "startTime": "0", "intervalLength": "0" } },
    "maxNumTransfers": { "overallMaxNumTransfers": "0", "perToAddressMaxNumTransfers": "0", "perFromAddressMaxNumTransfers": "0", "perInitiatedByAddressMaxNumTransfers": "0", "amountTrackerId": "credit-<amount>", "resetTimeIntervals": { "startTime": "0", "intervalLength": "0" } },
    "coinTransfers": [{
      "to": "<payment_recipient_address>",
      "coins": [{ "amount": "<payment_base_units>", "denom": "<ics20_denom>" }],
      "overrideFromWithApproverAddress": false,
      "overrideToWithInitiator": false
    }],
    "merkleChallenges": [],
    "mustOwnTokens": [],
    "overridesFromOutgoingApprovals": true,
    "overridesToIncomingApprovals": false,
    "mustPrioritize": true
  },
  "version": 0
}
\`\`\`

### Permissions (All Locked)

All permissions should be locked (empty arrays = frozen):
\`\`\`json
"collectionPermissions": {
  "canDeleteCollection": [],
  "canArchiveCollection": [],
  "canUpdateStandards": [],
  "canUpdateCustomData": [],
  "canUpdateManager": [],
  "canUpdateCollectionMetadata": [],
  "canUpdateValidTokenIds": [],
  "canUpdateTokenMetadata": [],
  "canUpdateCollectionApprovals": [],
  "canAddMoreAliasPaths": [],
  "canAddMoreCosmosCoinWrapperPaths": []
}
\`\`\`

### Key Differences from Smart Token

- **Increment-only** — tokens can only be minted (purchased), never redeemed, burned, or decreased
- **Non-transferable** — soulbound, no peer-to-peer transfers. If users need transferability, use Smart Token instead
- **No backing/unbacking** — one-way minting only, no cosmosCoinBackedPath
- **Multiple tiers** — different approval amounts for bulk purchases via greedy decomposition
- **Credits never expire** — ownership times cover full range

### Frontend Integration

The Credit Token standard has a dedicated view page that shows:
1. User's current token balance (using the alias path for display)
2. Purchase form with DenomAmountSelectWithMax for the payment denom
3. Conversion rate display (X denom = Y tokens)
4. Multi-tier transaction decomposition for optimal gas usage`
  },
];


// ============================================================
// Helper functions
// ============================================================

export function getSkillInstructions(skillId: string): SkillInstruction | null {
  return SKILL_INSTRUCTIONS.find(s => s.id === skillId) || null;
}

export function getAllSkillInstructions(): SkillInstruction[] {
  return SKILL_INSTRUCTIONS;
}

/**
 * Get skill content as a plain string (for programmatic access).
 * Returns the full instructions text, or null if not found.
 */
export function getSkillContent(skillId: string): string | null {
  const skill = SKILL_INSTRUCTIONS.find(s => s.id === skillId);
  return skill ? skill.instructions : null;
}

/**
 * Get skill summary as a plain string (compact cheat-sheet).
 * Returns just the summary (~200-400 tokens), or null if not found.
 */
export function getSkillSummary(skillId: string): string | null {
  const skill = SKILL_INSTRUCTIONS.find(s => s.id === skillId);
  return skill ? skill.summary : null;
}

/**
 * Get skill details as a plain string (same as getSkillContent, clearer name).
 * Returns the full instructions text including JSON examples and edge cases.
 */
export function getSkillDetails(skillId: string): string | null {
  const skill = SKILL_INSTRUCTIONS.find(s => s.id === skillId);
  return skill ? skill.instructions : null;
}

/**
 * Get all skill IDs (for programmatic access).
 */
export function getAllSkillIds(): string[] {
  return SKILL_INSTRUCTIONS.map(s => s.id);
}

/**
 * Get reference collection IDs for a set of skills.
 */
export function getReferenceCollectionIdsForSkills(skillIds: string[]): string[] {
  const ids = new Set<string>();
  for (const skillId of skillIds) {
    const skill = SKILL_INSTRUCTIONS.find(s => s.id === skillId);
    if (skill?.referenceCollectionIds) {
      for (const id of skill.referenceCollectionIds) {
        ids.add(id);
      }
    }
  }
  return Array.from(ids);
}

export function getSkillsByCategory(category: SkillInstruction['category']): SkillInstruction[] {
  return SKILL_INSTRUCTIONS.filter(s => s.category === category);
}

export function formatSkillInstructionsForDisplay(): string {
  let output = '# BitBadges Builder Skills\n\n';

  const categories = ['token-type', 'standard', 'approval', 'feature', 'advanced'] as const;
  const categoryNames = {
    'token-type': 'Token Types',
    'standard': 'Standards',
    'approval': 'Approval Configuration',
    'feature': 'Features',
    'advanced': 'Advanced Configuration'
  };

  for (const category of categories) {
    const skills = getSkillsByCategory(category);
    if (skills.length > 0) {
      output += `# ${categoryNames[category]}\n\n`;
      for (const skill of skills) {
        output += `## ${skill.name}\n\n`;
        output += `${skill.description}\n\n`;
        output += `${skill.instructions}\n\n`;
        output += '---\n\n';
      }
    }
  }

  return output;
}
