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
    description: 'IBC-backed smart token with 1:1 backing and two required approvals (backing + unbacking)',
    summary: `Required standards: ["Smart Token"]

- MUST include cosmosCoinBackedPath in invariants with conversion sideA/sideB
- MUST configure at least one alias path (decimals must match IBC denom decimals)
- MUST create TWO required collection approvals (backing + unbacking). Transferable approval is COMMON but OPTIONAL:
  1. Backing approval (REQUIRED): fromListId = backing address, allowBackedMinting: true, mustPrioritize: true
  2. Transferable approval (OPTIONAL — include for wrapped assets, omit for vaults/escrows): fromListId = "!Mint", toListId = "All"
  3. Unbacking approval (REQUIRED): toListId = backing address, allowBackedMinting: true, mustPrioritize: true
- DO NOT use fromListId: "Mint" — tokens are created via IBC backing, not traditional minting
- Backing addresses are protocol-controlled with auto-set approvals — overridesFromOutgoingApprovals is irrelevant for backing/unbacking (leave unset or false)
- noForcefulPostMintTransfers invariant should be TRUE — smart tokens do NOT need forceful transfer overrides
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

### Approval System

Smart Tokens require TWO approvals (backing + unbacking). A third transferable approval is common for wrapped assets but optional for vaults/escrows:

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
    "mustPrioritize": true,
    "allowBackedMinting": true
  }
}
\`\`\`
Note: Backing addresses are protocol-controlled with auto-set approvals. overridesFromOutgoingApprovals is irrelevant and can be omitted.

#### 2. Transferable Approval (OPTIONAL — for peer-to-peer transfers)
This approval allows tokens to be transferred between users (non-backing addresses). Include for wrapped assets where holders need to trade/transfer. Omit for simple deposit/withdraw vaults or escrows where tokens should not move between users.

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

### Optional: DEX Tradability (Liquidity Pools)

Most smart tokens are NOT tradable on DEX — only add this if the user explicitly requests trading/DEX functionality:
- Add "Liquidity Pools" to standards
- Set invariants.disablePoolCreation to **false** (override the safe default)
- MUST have at least one alias path configured
- MUST have a transferable approval (peer-to-peer transfers required for trading)

### IBC Backed Minting Rules

- **Backing/unbacking approvals**: Backing addresses are protocol-controlled with auto-set approvals — overridesFromOutgoingApprovals is **irrelevant** (leave unset or false). noForcefulPostMintTransfers should be TRUE.
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

### Optional: Unbacking Withdraw Limits

Add approvalAmounts to the unbacking approval to enforce daily or total withdraw limits:

\`\`\`json
{
  "approvalCriteria": {
    "mustPrioritize": true,
    "allowBackedMinting": true,
    "overridesFromOutgoingApprovals": false,
    "approvalAmounts": {
      "overallApprovalAmount": "0",
      "perFromAddressApprovalAmount": "1000000",
      "perToAddressApprovalAmount": "0",
      "perInitiatedByAddressApprovalAmount": "0",
      "amountTrackerId": "daily-withdraw-limit",
      "resetTimeIntervals": { "startTime": "0", "intervalLength": "86400000" }
    }
  }
}
\`\`\`

- **Daily limit**: Use perFromAddressApprovalAmount with resetTimeIntervals.intervalLength: "86400000" (24 hours in ms)
- **Total limit**: Use overallApprovalAmount with intervalLength: "0" (no reset)
- amountTrackerId must be unique per approval

### Optional: 2FA on Unbacking

Require ownership of a 2FA token to withdraw. Add mustOwnTokens to the unbacking approval:

\`\`\`json
{
  "approvalCriteria": {
    "mustPrioritize": true,
    "allowBackedMinting": true,
    "overridesFromOutgoingApprovals": false,
    "mustOwnTokens": [{
      "collectionId": "74",
      "amountRange": { "start": "1", "end": "18446744073709551615" },
      "ownershipTimes": [{ "start": "1", "end": "18446744073709551615" }],
      "tokenIds": [{ "start": "1", "end": "18446744073709551615" }],
      "overrideWithCurrentTime": true,
      "mustSatisfyForAllAssets": false,
      "ownershipCheckParty": "initiator"
    }]
  }
}
\`\`\`

- collectionId: the 2FA collection ID
- overrideWithCurrentTime: true ensures the check uses the current time (important for expiring 2FA tokens)
- ownershipCheckParty: "initiator" checks the person initiating the withdrawal

### Metadata Guidance

- Collection metadata, token metadata, alias path metadata, and denomUnit metadata should all have descriptive names/descriptions and images
- Do NOT use lazy placeholder names like "Backing Approval" — write real user-facing descriptions explaining what each approval does

### Key Rules Summary

1. **NO fromListId: "Mint" approvals**: Tokens are created via IBC backing, not traditional minting
2. **Use allowBackedMinting: true** in both backing and unbacking approvals
3. **Use mustPrioritize: true** (required for IBC backed operations)
4. **Backing approval**: overridesFromOutgoingApprovals: true is RECOMMENDED (backing addresses auto-set their approvals, so it works either way, but true is good practice). **Unbacking approval**: MUST be false (sender is a regular user)
5. **Unbacking fromListId**: Use \`!Mint:backingAddress\` syntax — excludes both Mint and backing address so only regular holders can send tokens back
6. **MUST create backing + unbacking approvals**. Transferable approval is common but optional (omit for vaults/escrows)
7. **MUST configure alias path** with matching decimals
8. The backing address is deterministic — use the one from generate_backing_address tool

## Common Mistakes

- DON'T use fromListId: "Mint" — smart tokens are created via IBC backing, not traditional minting. Use the backing address as fromListId instead.
- DON'T forget mustPrioritize: true on backing and unbacking approvals — without it, the chain cannot match the approval and the transfer fails.
- DON'T assume all three approvals are required — the transferable approval is optional. Omit it for vaults or escrows where tokens should not move between users.
- DON'T use "All" as fromListId or toListId for backing/unbacking operations — use the exact deterministic backing address from generate_backing_address.
- DON'T use number types for amounts or IDs — all values must be strings ("1" not 1, "18446744073709551615" not Number.MAX_SAFE_INTEGER).
- DON'T forget to configure an alias path — smart tokens will not function without one, and the alias decimals must match the IBC denom decimals.`
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
- **autoApproveAllIncomingTransfers**: Must be true in defaultBalances for public-mint collections

## Common Mistakes

- DON'T use numbers instead of strings for amounts — use "1000" not 1000. All numeric values in BitBadges JSON must be string-encoded.
- DON'T forget overridesFromOutgoingApprovals: true on Mint approvals — without it, the Mint address cannot send tokens and minting silently fails.
- DON'T forget autoApproveAllIncomingTransfers: true in defaultBalances for public-mint collections — otherwise recipients cannot receive minted tokens.
- DON'T forget to add prioritizedApprovals in MsgTransferTokens — even if empty ([]), this field must be present or the transfer fails.
- DON'T use predeterminedBalances and approvalAmounts together — they are incompatible. Use one or the other.
- DON'T set multiple methods to true in orderCalculationMethod — exactly ONE must be true (default: useOverallNumTransfers).`
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

### Supply Tracking with approvalAmounts

Fungible tokens use approvalAmounts (NOT predeterminedBalances) to track minting supply:

\`\`\`json
{
  "approvalCriteria": {
    "overridesFromOutgoingApprovals": true,
    "approvalAmounts": {
      "overallApprovalAmount": "1000000",
      "perInitiatedByAddressApprovalAmount": "1000",
      "perToAddressApprovalAmount": "0",
      "perFromAddressApprovalAmount": "0",
      "amountTrackerId": "mint-tracker",
      "resetTimeIntervals": { "startTime": "0", "intervalLength": "0" }
    }
  }
}
\`\`\`

- overallApprovalAmount: total supply cap (use "0" for unlimited)
- perInitiatedByAddressApprovalAmount: max per user (use "0" for unlimited)
- IMPORTANT: predeterminedBalances and approvalAmounts are INCOMPATIBLE — fungible tokens use approvalAmounts, NOT predeterminedBalances

### Pattern-Specific Gotchas

- All tokens share the same token ID (1), making them interchangeable
- Amount field in transfers determines quantity (e.g., "amount": "100" means 100 tokens)
- Ownership times are typically forever: [{ "start": "1", "end": "18446744073709551615" }]

## Common Mistakes

- DON'T use predeterminedBalances for fungible tokens — use approvalAmounts instead. They are incompatible.
- DON'T use numbers instead of strings for amounts — use "1000" not 1000. All numeric values must be string-encoded.
- DON'T forget autoApproveAllIncomingTransfers: true in defaultBalances — without it, recipients cannot receive tokens on public-mint collections.
- DON'T forget overridesFromOutgoingApprovals: true on Mint approvals — required for all fromListId: "Mint" approvals.
- DON'T use multiple token IDs — fungible tokens must use exactly one token ID [{ "start": "1", "end": "1" }].

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
- For tradable NFTs: ["NFTs", "NFTMarketplace", "NFTPricingDenom:ubadge"]

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
   - For tradable NFTs: "standards": ["NFTs", "NFTMarketplace", "NFTPricingDenom:ubadge"]

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

### Sequential Minting with predeterminedBalances

For NFTs, use predeterminedBalances with incrementTokenIdsBy: "1" to mint tokens sequentially (token 1, then 2, then 3, etc.):

\`\`\`json
{
  "approvalCriteria": {
    "overridesFromOutgoingApprovals": true,
    "predeterminedBalances": {
      "manualBalances": [],
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
      }
    },
    "maxNumTransfers": {
      "overallMaxNumTransfers": "100",
      "perInitiatedByAddressMaxNumTransfers": "1",
      "perToAddressMaxNumTransfers": "0",
      "perFromAddressMaxNumTransfers": "0",
      "amountTrackerId": "nft-mint-tracker",
      "resetTimeIntervals": { "startTime": "0", "intervalLength": "0" }
    }
  }
}
\`\`\`

Key: incrementTokenIdsBy: "1" means each mint gets the next sequential token ID. Use maxNumTransfers to cap total mints and per-user mints.

IMPORTANT: predeterminedBalances and approvalAmounts are INCOMPATIBLE — use one or the other. NFTs use predeterminedBalances (not approvalAmounts).

### NFT-Specific Gotchas

- Each token ID is unique and represents a distinct NFT
- Amount in transfers is typically "1" (one NFT per transfer)
- Ownership times are usually forever for NFTs
- Mint approvals MUST have overridesFromOutgoingApprovals: true
- Use {id} in metadata URIs for per-token metadata

## Common Mistakes

- DON'T reuse token IDs across editions without understanding ownership times — each token ID is unique and represents a distinct NFT.
- DON'T forget tokenIds in canUpdateTokenMetadata permission structure — the permission must specify which token ID ranges it covers.
- DON'T use {id} in metadata name, description, or image fields — the {id} placeholder only works in the URI string itself (e.g. "ipfs://abc/{id}").
- DON'T forget overridesFromOutgoingApprovals: true on Mint approvals — required for all minting operations.
- DON'T use custom list IDs — only reserved IDs are valid: "All", "Mint", "!Mint", "AllWithoutMint", or direct bb1... addresses.`
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

2. **Invariants**: MUST set noCustomOwnershipTimes to FALSE
   - Subscriptions use time-dependent ownership — this invariant MUST be false or subscriptions cannot function.
   - "invariants": { "noCustomOwnershipTimes": false, ... }

3. **validTokenIds**: MUST be exactly one token ID (per tier)
   - "validTokenIds": [{ "start": "1", "end": "1" }]

4. **Subscription Faucet Approval Requirements**:
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
- **CRITICAL MUTUAL EXCLUSIVITY**: The chain enforces that ONLY ONE of \`durationFromTimestamp\`, \`incrementOwnershipTimesBy\`, or \`recurringOwnershipTimes\` can be non-zero. For subscriptions, use \`durationFromTimestamp\` and keep \`recurringOwnershipTimes\` as ALL ZEROS: \`{ "startTime": "0", "intervalLength": "0", "chargePeriodLength": "0" }\`. DO NOT set non-zero values in \`recurringOwnershipTimes\` — the template already has the correct structure.

## Common Mistakes

- DON'T set recurringOwnershipTimes to non-zero values — it is mutually exclusive with durationFromTimestamp. Keep all fields as "0".
- DON'T forget durationFromTimestamp must be non-zero — this is the subscription duration in milliseconds (e.g. "2592000000" for 30 days).
- DON'T forget allowOverrideTimestamp: true — subscriptions need this so each mint gets its own start timestamp.
- DON'T use multiple token IDs — subscriptions must use exactly one token ID [{ "start": "1", "end": "1" }].
- DON'T set coinTransfers override flags to true — for standard subscription payments, both overrideFromWithApproverAddress and overrideToWithInitiator must be false.
- DON'T set noCustomOwnershipTimes: true in invariants — subscriptions require noCustomOwnershipTimes: false (or omit the invariant) because each subscription period mints a new ownershipTime window.`
  },
  {
    id: 'immutability',
    name: 'Transferability & Update Rules',
    category: 'advanced',
    description: 'Lock collection permissions to make properties permanently immutable or permanently permitted',
    summary: `Controls whether collection properties can be changed after creation.

- Two states: FROZEN (permanentlyForbiddenTimes: FOREVER) or NEUTRAL (empty [])
- NEUTRAL [] = manager can update now AND can freeze it later. Use this for editable fields.
- FROZEN = permanent and irreversible. Use for fields that should never change.
- AVOID permanentlyPermittedTimes — it permanently prevents locking. Almost never needed.
- canUpdateCollectionApprovals: controls transfer rule mutability
  - SECURITY: If manager can update Mint approvals, they can mint unlimited tokens
  - Default to frozen unless user requests updatable
- List IDs in permissions: ONLY use reserved IDs ("All", "Mint", "!Mint", direct "bb1..." addresses)
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

### Permission Presets

Three common permission configurations:

**1. Fully Immutable** — Everything frozen. Nothing can change after creation.
- ALL permissions set to permanentlyForbiddenTimes: FOREVER
- Use when: the collection should never change

**2. Manager Controlled** — Manager can change everything except delete.
- canDeleteCollection: frozen
- Everything else: NEUTRAL [] (editable now, can be frozen later)
- Use when: the manager needs full control (issuer-controlled tokens, evolving collections)

**3. Locked Approvals (recommended default)** — Approvals and supply frozen, metadata editable.
- canDeleteCollection: frozen
- canUpdateStandards: frozen
- canUpdateManager: frozen
- canUpdateValidTokenIds: frozen
- canUpdateCollectionApprovals: frozen
- canUpdateCollectionMetadata: NEUTRAL []
- canUpdateTokenMetadata: NEUTRAL []
- canArchiveCollection: NEUTRAL []
- canUpdateCustomData: NEUTRAL []
- Use when: supply and rules should be immutable but metadata needs updates

**Understanding permission states:**
- Empty array [] = NEUTRAL (manager can update now AND can lock it later — preserves maximum flexibility)
- permanentlyForbiddenTimes: FOREVER = FROZEN (can never be changed — permanent and irreversible)
- permanentlyPermittedTimes: FOREVER = PERMANENTLY ALLOWED (can never be frozen — almost never needed)

**IMPORTANT**: For editable fields, ALWAYS use NEUTRAL (empty []) instead of permanentlyPermittedTimes. Neutral gives the same current behavior (manager can update) but preserves the option to freeze it later. Only use permanentlyPermittedTimes if the user explicitly requests a guarantee that a field can never be locked.

### Security Considerations

- **Mint Transfer Rules**: If canUpdateCollectionApprovals is allowed for Mint, the manager could mint unlimited tokens
- **Post-Mint Transfer Rules**: If post-mint transfer rules can be updated, the manager could change transferability
- **Best Practice**: Default to locked (frozen) transfer rules unless user explicitly requests updatable rules
- Only allow updates for dynamic collections where the user explicitly requests flexibility

## Common Mistakes

- DON'T use custom list IDs in permissions — only reserved IDs: "All", "Mint", "!Mint", or direct bb1... addresses.
- DON'T leave both permanentlyPermittedTimes and permanentlyForbiddenTimes as empty arrays in a permission entry — this is redundant. Replace the entire entry with an empty array [].
- DON'T forget that unfrozen Mint approval permissions means the manager can mint unlimited tokens — freeze canUpdateCollectionApprovals for Mint if supply should be fixed.
- DON'T confuse empty permission array [] (neutral/unset) with a frozen permission — empty means the field is still updatable.`
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
    summary: `On-chain address list. Use per-field tools: set_standards(["Address List"]), add_approval (manager-add + manager-remove), set_permissions, set_invariants.

- List membership = owning x1 of token ID 1
- Manager can add (mint) and remove (burn) addresses
- No peer-to-peer transfers
- Requires TWO approvals: manager-add (minting) + manager-remove (burn to bb1qqq...s7gvmv)
- After building, proceed with audit_collection + validate_transaction as normal`,
    instructions: `## Address List Token Type

Use per-field tools to create this collection. It requires:
1. set_standards(["Address List"])
2. set_valid_token_ids([{ start: "1", end: "1" }])
3. add_approval — manager-add: fromListId "Mint", toListId "All", initiatedByListId = manager address, overridesFromOutgoingApprovals: true, overridesToIncomingApprovals: true
4. add_approval — manager-remove: fromListId "!Mint", toListId burn address (bb1qqq...s7gvmv), initiatedByListId = manager address, overridesFromOutgoingApprovals: true, overridesToIncomingApprovals: true
5. set_permissions — lock canDeleteCollection, canUpdateStandards, canUpdateValidTokenIds
6. set_invariants — noCustomOwnershipTimes: true, disablePoolCreation: true

This creates a token collection where list membership = owning x1 of token ID 1. The manager can add (mint) and remove (burn) addresses. No peer-to-peer transfers.

After building, proceed with audit_collection and validate_transaction as normal.`
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
  "version": "0",
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
- v29: resetAfterExecution (bool) — automatically resets all votes after quorum is met and transfer executes, enabling recurring multi-sig
- v29: delayAfterQuorum (Uint, ms) — enforces a waiting period after quorum before the transfer can execute (e.g., timelock)
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
      "resetAfterExecution": false,
      "delayAfterQuorum": "0",
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
- **resetAfterExecution** (v29): If true, all votes are automatically reset after the quorum is met and the transfer executes. Enables recurring multi-sig without rotating proposalIds.
- **delayAfterQuorum** (v29): Delay in milliseconds after quorum is reached before the transfer can execute. Acts as a timelock — gives voters time to change their vote or raise objections.

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
- **Vote reset behavior** — By default, vote state does not reset after quorum is met (one-time transfers). With v29's \`resetAfterExecution: true\`, votes are automatically cleared after a successful transfer, enabling recurring multi-sig workflows without rotating proposalIds. Use \`delayAfterQuorum\` to add a timelock between quorum and execution.
- For full documentation, see the BitBadges docs on voting challenges`
  },
  {
    id: 'payment-protocol',
    name: 'Payment Protocol',
    category: 'token-type',
    description: 'Invoices, escrows, bounties, milestones, and multi-party agreements using coinTransfer-based approvals or IBC-backed smart token escrow',
    summary: `Build invoices, milestones, bounties, escrow agreements, or any payment flow.

Two approaches:
- **Approach 1 (coinTransfer-based)**: Simple one-shot payments. Each approval = one invoice/milestone with coinTransfers.
  - Standards: ["ListView:Milestones"] or ["ListView:Invoice Requests"] or ["ListView:Bounties"]
  - Each approval: fromListId "Mint", coinTransfers for payment, overridesFromOutgoingApprovals: true
  - ListView incompatible with: Subscriptions, Smart Tokens, Custom 2FA, Liquidity Pools, Tradable NFTs
- **Approach 2 (Escrow)**: Funds held in IBC-backed smart token until conditions are met.
  - Standards: ["Smart Token"]
  - USDC/ATOM backed 1:1 into single token ID. Approvals control deposit, release, refund, dispute, timeout.
  - Typically 6-12+ approvals modeling the full lifecycle of a multi-party agreement.
  - All permissions permanently locked — no one can change rules after deployment.

Key design: each approval = one conditional branch. Not all get used — they define what CAN happen.
- Lock canUpdateCollectionApprovals for immutable terms
- Initiator pays gas; for mint-based, the payer initiates`,
    instructions: `## Payment Protocol

Build invoices, milestones, bounties, escrow agreements, or any payment flow.

### Which approach to use

**Default to Approach 2 (Smart Token Escrow)** unless the request is clearly a simple one-shot payment with no hold/release/refund logic. Smart token escrow is the superset — it can do everything coinTransfers can, plus escrow, conditional release, refunds, multi-party deposits, and dispute resolution. When in doubt, use Approach 2.

Use Approach 1 only for simple scenarios like: "create an invoice for 10 BADGE" or "milestone list where payer pays on completion" — where funds move immediately at transfer time with no hold period.

### Approach 1: coinTransfer-Based (Simple Payments)

Each approval is an invoice/milestone with coinTransfers. Uses the **ListView** display standard. Only for simple one-shot payments — no escrow, no hold-and-release, no refunds.

**Required:**
- Standards: ["ListView:Milestones"] or ["ListView:Invoice Requests"] or ["ListView:Bounties"]
- Each item = one collection-level approval with:
  - fromListId: "Mint" (for new tokens) or specific address (for transfers)
  - coinTransfers: payment amount and recipient
  - overridesFromOutgoingApprovals: true (if fromListId is "Mint")

**Invoice/Milestone Example:**
\`\`\`json
{
  "collectionApprovals": [{
    "fromListId": "Mint",
    "toListId": "All",
    "initiatedByListId": "bb1payer...",
    "approvalId": "milestone-1",
    "tokenIds": [{ "start": "1", "end": "1" }],
    "transferTimes": [{ "start": "1", "end": "18446744073709551615" }],
    "ownershipTimes": [{ "start": "1", "end": "18446744073709551615" }],
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
        "amountTrackerId": "milestone-1-tracker",
        "resetTimeIntervals": { "startTime": "0", "intervalLength": "0" }
      }
    }
  }],
  "standards": ["ListView:Milestones"]
}
\`\`\`

**ListView incompatibility**: ListView is incompatible with Subscriptions, Smart Tokens, Custom 2FA, Liquidity Pools, Tradable NFTs.

### Approach 2: Escrow (Smart Token)

Use a USDC/ATOM-backed smart token for hold-and-release escrow. Funds are deposited (backed) and released via approval-controlled transfers, then withdrawn (unbacked) for the underlying ICS20 coins.

**When to use escrow vs coinTransfers:**
- coinTransfers: One-shot payment at transfer time (simpler)
- Escrow: Funds held until conditions met, refundable, multi-party (more complex but trustless)

**Architecture: Three Phases**
\`\`\`
PHASE 1 — DEPOSITS: Parties back ICS20 coins into the smart token (backing approvals)
PHASE 2 — RESOLUTION: Approvals control who can move tokens to whom, gated by conditions
PHASE 3 — WITHDRAWAL: Winners unback tokens to receive ICS20 coins
\`\`\`

**Required structure:**
- Standards: ["Smart Token"]
- Invariants: cosmosCoinBackedPath with 1:1 conversion
- Alias path for display
- validTokenIds: [{ "start": "1", "end": "1" }] (single token, amount-capped approvals for logical buckets)
- ALL permissions permanently locked

**Escrow approval categories:**

1. **Backing approvals (deposits)** — each depositing party gets a separate backing approval with amount caps
\`\`\`json
{
  "fromListId": "bb1backingAddress...",
  "toListId": "bb1posterAddress...",
  "initiatedByListId": "bb1posterAddress...",
  "approvalId": "poster-backing",
  "approvalCriteria": {
    "overridesFromOutgoingApprovals": true,
    "mustPrioritize": true,
    "allowBackedMinting": true,
    "maxNumTransfers": { "overallMaxNumTransfers": "1", "amountTrackerId": "poster-backing-tracker", "resetTimeIntervals": { "startTime": "0", "intervalLength": "0" } }
  }
}
\`\`\`

2. **Release approvals (payment paths)** — control how funds move. Gate with:
   - Simple sign-off: initiatedByListId = poster address
   - Verifier-gated: votingChallenges with quorum threshold
   - mustOwnBadges: require deposit verification or credentials
   - approvalAmounts: cap how much each approval can move

3. **Timeout approvals (fallbacks)** — use transferTimes to gate when fallbacks activate
\`\`\`json
{
  "approvalId": "timeout-release",
  "transferTimes": [{ "start": "DEADLINE_MS", "end": "18446744073709551615" }],
  "approvalCriteria": { "overridesFromOutgoingApprovals": true }
}
\`\`\`
DEADLINE_MS = creation timestamp + timeout hours * 3600000

4. **Verifier fee approvals** — flat fee regardless of decision (neutral incentive). Two approvals: one gated by approve vote, one by deny vote.

5. **Deposit return/forfeit** — worker reclaims on success, poster takes on timeout. Natural mutex via balance depletion.

6. **Unbacking approval** — standard smart token unbacking. Anyone holding tokens can burn for ICS20 coins.

### Multi-Approval Lifecycle Design

Payment protocols typically have **6-12+ approvals** modeling every possible flow. Not all get used in a single transaction — they define the complete lifecycle of what CAN happen.

**Example: Freelancer escrow with 8 approvals**
1. \`poster-deposit\` — poster backs USDC into escrow
2. \`worker-deposit\` — worker deposits a bond (optional)
3. \`release-on-completion\` — poster releases funds to worker
4. \`timeout-refund\` — poster reclaims if worker ghosts (time-gated)
5. \`dispute-resolution\` — arbitrator releases funds (vote-gated)
6. \`worker-bond-return\` — worker reclaims bond on success
7. \`worker-bond-forfeit\` — poster takes bond on timeout
8. \`penalty-fee\` — arbitrator fee on dispute

Happy path uses #1, #3, #6. Dispute uses #1, #2, #5, #7, #8. Timeout uses #1, #4. The approvals define all possibilities.

**Common patterns:**
- **Pattern A — Simple Trust**: poster-backing + poster-release + timeout-release + unbacking (4 approvals)
- **Pattern B — Verified Third-Party**: + approve-release + deny-refund + verifier-fees (7+ approvals)
- **Pattern C — Mutual Deposit + Vote**: both parties deposit, 2-of-3 vote gates release (8+ approvals)
- **Pattern D — Milestones**: poster backs total budget, separate release approval per milestone (N+3 approvals)
- **Pattern E — Bounty**: poster backs bounty, award approval with toListId "All" + overallMaxNumTransfers "1" (4 approvals)

### How conditional branching works

All approvals are effectively **OR logic** — any approval can be satisfied as long as its criteria match. The chain doesn't enforce "if A then B" directly. To implement conditional flows, get creative with criteria composition:

- **Balance depletion as mutex**: approve-release and deny-refund target the same tokens. Once one fires, balance depletes and the other can't execute. Natural mutual exclusion.
- **mustOwnTokens for state gating**: mint soulbound tokens (from this or another collection) to represent state transitions, then require them via mustOwnTokens on downstream approvals. E.g., mint a "work-completed" badge, then the release approval requires holding it. Use collectionId "0" to self-reference this collection — the chain resolves it at runtime, avoiding the need to hardcode the collection ID.
- **transferTimes for temporal gating**: only allow certain approvals after a deadline passes.
- **votingChallenges for human decisions**: gate approvals behind explicit votes from designated parties.
- **Amount caps for partial flows**: use approvalAmounts to limit how much each branch can move, preventing over-claiming.

The primitives (mustOwnTokens, transferTimes, votingChallenges, amount caps, balance depletion) combine to model complex conditional logic even though each approval is independently satisfiable.

### Decision Tree

1. **Default to Smart Token Escrow (Approach 2)** unless clearly a simple one-shot payment. Escrow handles everything — payments, holds, refunds, disputes, multi-party flows. Only use coinTransfers (Approach 1) for trivially simple invoices with no hold period.
2. **Permission locking**: For agreements, lock \`canUpdateCollectionApprovals\` so terms are immutable.
3. **Who pays gas?**: The initiator pays gas. For mint-based, the payer initiates.
4. **Multiple currencies**: A single collection can accept different IBC denoms in different approvals.
5. **Refunds**: For coinTransfer-based, refunds require a separate approval. For escrow, use timeout-refund approvals.
6. **Timeouts**: Every escrow path MUST have a timeout fallback — without them, funds can be locked forever.

## Common Mistakes

- DON'T use multiple token IDs for different "buckets" in escrow — use a single token ID with amount-capped approvals instead.
- DON'T forget timeout fallbacks on every path — funds can be locked forever if a party ghosts.
- DON'T make verifier fee conditional on outcome — use flat fee with two vote-gated fee approvals for neutral incentives.
- DON'T forget to lock ALL permissions for escrow — any unlocked permission lets someone change the rules.
- DON'T use the same amountTrackerId across multiple approvals unless you want them to share a counter.
- DON'T forget mustOwnBadges for deposit verification — this is how you on-chain gate releases on deposits.`
  },
  {
    id: 'tradable',
    name: 'Tradable NFTs',
    category: 'standard',
    description: 'NFT marketplace standard enabling peer-to-peer transfers with the "NFTMarketplace" standard tag and NFTPricingDenom',
    summary: `Required standards: ["NFTMarketplace", "NFTs", "NFTPricingDenom:ubadge"]

- MUST include all three standards together
- NFTPricingDenom format: "NFTPricingDenom:<denom>" (sets pricing denomination for orderbook)
- MUST include a free transfer approval: fromListId: "!Mint", toListId: "All", initiatedByListId: "All", approvalId: "transferable-approval"
- Enables orderbook/marketplace integration
- Typically used with NFT collections
- Note: Legacy names "Tradable" and "DefaultDisplayCurrency" are still accepted for existing collections`,
    instructions: `## Tradable NFTs Configuration

When enabling trading for NFTs, follow these requirements:

### Required Structure

1. **Standards**: MUST include "NFTMarketplace", "NFTs", and "NFTPricingDenom:ubadge"
   - "standards": ["NFTMarketplace", "NFTs", "NFTPricingDenom:ubadge"]
   - NFTPricingDenom sets the pricing denomination for orderbook display
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
  "standards": ["NFTMarketplace", "NFTs", "NFTPricingDenom:ubadge"]
}
\`\`\`

### Tradable Gotchas

- MUST include all three standards together
- NFTPricingDenom format: "NFTPricingDenom:denom"
- This enables orderbook/marketplace integration
- Typically used with NFT collections
- The currency denom determines how prices are displayed in marketplaces
- Legacy names "Tradable" and "DefaultDisplayCurrency" still work for existing collections`
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
4. Multi-tier transaction decomposition for optimal gas usage

## Common Mistakes

- DON'T add transferable or burnable approvals — credit tokens are increment-only and non-transferable (soulbound). Only Mint approvals are allowed.
- DON'T forget mustPrioritize: true on all credit token Mint approvals — required for correct tier matching.
- DON'T forget the alias path — credit tokens will not display properly without one.
- DON'T use numbers instead of strings for amounts — all values must be string-encoded ("100000" not 100000).
- DON'T confuse credit tokens with smart tokens — credit tokens are one-way minting only with no backing/unbacking or transferability.`
  },
  // escrow-pact removed — functionality merged into payment-protocol
  {
    id: 'auto-mint',
    name: 'Auto-Mint',
    category: 'feature',
    description: 'Mint and distribute tokens to recipients at collection creation time using MsgTransferTokens',
    summary: `Post-creation minting — adds MsgTransferTokens messages to the transaction so tokens are distributed immediately after collection creation.

- Transaction can contain MsgUniversalUpdateCollection PLUS one or more MsgTransferTokens messages
- All transfer messages use collectionId: "0" to reference the just-created collection
- prioritizedApprovals MUST always be specified (use [] if none needed)
- from: "Mint" for minting new tokens, bb1... address for peer-to-peer transfers
- The signing user (creator) is the initiator — collection must have an approval allowing this
- All numbers as strings — "1" not 1
- Prefer predeterminedBalances with x0 increments over maxNumTransfers for better frontend UX

When to use:
- User asks to mint tokens to themselves or others at creation time
- Initial distribution or pre-allocation of tokens
- Manager-only collections where the manager should receive all tokens immediately

When NOT to use:
- Public mint collections (users mint later via approval)
- Subscription collections (users mint on subscribe)
- Smart tokens (users deposit IBC coins to mint)
- Any collection where minting happens post-creation through approvals`,
    instructions: `## Auto-Mint — Post-Creation Transfers

A transaction can contain the collection creation message (MsgUniversalUpdateCollection) PLUS one or more MsgTransferTokens messages. All use collectionId: "0" to reference the just-created collection.

### MsgTransferTokens Structure

\`\`\`json
{
  "typeUrl": "/tokenization.MsgTransferTokens",
  "value": {
    "creator": "bb1...",
    "collectionId": "0",
    "transfers": [{
      "from": "Mint",
      "toAddresses": ["bb1recipientaddress..."],
      "balances": [{
        "amount": "1",
        "tokenIds": [{ "start": "1", "end": "1" }],
        "ownershipTimes": [{ "start": "1", "end": "18446744073709551615" }]
      }],
      "prioritizedApprovals": [{
        "approvalId": "the-mint-approval-id",
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

### When to add a transfer message
- User asks to mint tokens to themselves or others at creation time
- User wants initial distribution or pre-allocation of tokens
- Manager-only collections where the manager should receive all tokens immediately
- Any scenario where tokens should exist in wallets right after collection creation

### When NOT to add a transfer message
- Public mint collections (users mint later via the approval)
- Subscription collections (users mint on subscribe)
- Smart tokens (users deposit IBC coins to mint)
- Any collection where minting happens post-creation through approvals

### Critical transfer rules
1. **prioritizedApprovals MUST be specified** — even if empty []. Match the approvalId to one of the collection's collectionApprovals.
2. **from: "Mint"** for minting new tokens. Use a bb1... address for peer-to-peer transfers.
3. **The signing user (creator) is the initiator** — the collection must have an approval that allows this address as initiatedBy.
4. **collectionId: "0"** is auto-set — it references the collection created by message[0] in the same transaction.
5. **All numbers as strings** — "1" not 1.
6. **Prefer predeterminedBalances for one-time or fixed-use approvals** — Use incrementedBalances with x0 increments (incrementTokenIdsBy: "0", incrementOwnershipTimesBy: "0") instead of relying solely on maxNumTransfers. The frontend auto-detects predeterminedBalances and shows users the exact tokens they will receive, providing much better UX. Avoid manualBalances; incrementedBalances with x0 increments is preferred.

### Time-Dependent Ownership

For expiring tokens, calculate timestamps:
- Current time: use get_current_timestamp tool (milliseconds since epoch)
- Example: 5 minutes from now = current timestamp + (5 * 60 * 1000)

\`\`\`json
"ownershipTimes": [{
  "start": "1706000000000",
  "end": "1706000300000"
}]
\`\`\`

### Session-based patch operations
- add_transfer: { op: "add_transfer", transfer: { transfers: [...] } } — appends a MsgTransferTokens to the transaction
- remove_transfer: { op: "remove_transfer", index: 0 } — removes transfer message by index (0-based among transfer messages)
- update_transfer: { op: "update_transfer", index: 0, changes: {...} } — deep-merges changes into the transfer message

### Common mistakes
- DON'T forget to add prioritizedApprovals in MsgTransferTokens — even if empty ([]), this field must be present or the transfer fails.
- DON'T forget that the collection must have a mint approval that allows the creator as initiatedBy.
- DON'T add transfer messages for subscription, smart token, or public mint collections — minting happens post-creation through approvals.`
  },
  {
    id: 'address-list',
    name: 'Address List',
    category: 'token-type',
    description: 'On-chain address list where membership = owning x1 of token ID 1. Manager can add/remove addresses.',
    summary: `Required standards: ["Address List"]

- validTokenIds: MUST be exactly [{ "start": "1", "end": "1" }]
- TWO collection approvals required with EXACT approvalIds (frontend depends on these):
  1. "manager-add": fromListId "Mint", toListId "All", initiatedByListId = creator. Mints token to add address.
  2. "manager-remove": fromListId "All", toListId burn address (bb1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqs7gvmv), initiatedByListId = creator. Burns token to remove address.
- BOTH approvals MUST have overridesFromOutgoingApprovals: true
- NO peer-to-peer transfer approval — only manager can modify the list
- Standard is "Address List" (NOT "Non-Transferable")
- Use per-field tools (set_standards, add_approval, set_permissions, set_invariants)`,
    instructions: `## Address List Configuration

An address list collection represents membership as token ownership: owning x1 of token ID 1 = being on the list. The manager controls membership by minting (adding) and burning (removing) tokens.

### CRITICAL: Exact Approval IDs Required

The frontend identifies address list approvals by their EXACT approvalIds. Using different IDs will break the UI.

- Approval 1: approvalId MUST be **"manager-add"**
- Approval 2: approvalId MUST be **"manager-remove"**

### Required Structure

1. **Standards**: ["Address List"] (NOT "Non-Transferable")
2. **validTokenIds**: [{ "start": "1", "end": "1" }]
3. **Burn address**: bb1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqs7gvmv (ETH null address in bb1 format)

### Manager-Add Approval (mint to add)

\`\`\`json
{
  "fromListId": "Mint",
  "toListId": "All",
  "initiatedByListId": "bb1creator...",
  "transferTimes": [{ "start": "1", "end": "18446744073709551615" }],
  "tokenIds": [{ "start": "1", "end": "1" }],
  "ownershipTimes": [{ "start": "1", "end": "18446744073709551615" }],
  "uri": "ipfs://METADATA_APPROVAL_manager-add",
  "customData": "",
  "approvalId": "manager-add",
  "approvalCriteria": {
    "overridesFromOutgoingApprovals": true
  },
  "version": "0"
}
\`\`\`

### Manager-Remove Approval (forceful burn to remove)

\`\`\`json
{
  "fromListId": "All",
  "toListId": "bb1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqs7gvmv",
  "initiatedByListId": "bb1creator...",
  "transferTimes": [{ "start": "1", "end": "18446744073709551615" }],
  "tokenIds": [{ "start": "1", "end": "1" }],
  "ownershipTimes": [{ "start": "1", "end": "18446744073709551615" }],
  "uri": "ipfs://METADATA_APPROVAL_manager-remove",
  "customData": "",
  "approvalId": "manager-remove",
  "approvalCriteria": {
    "overridesFromOutgoingApprovals": true
  },
  "version": "0"
}
\`\`\`

### Default Balances

\`\`\`json
{
  "balances": [],
  "outgoingApprovals": [],
  "incomingApprovals": [],
  "autoApproveAllIncomingTransfers": true,
  "autoApproveSelfInitiatedOutgoingTransfers": true,
  "autoApproveSelfInitiatedIncomingTransfers": true,
  "userPermissions": {}
}
\`\`\`

### Permissions

Lock approvals and token IDs:
- canUpdateCollectionApprovals: frozen
- canUpdateValidTokenIds: frozen
- canUpdateManager: frozen (typically)

## Common Mistakes

- DON'T use approvalId other than "manager-add" and "manager-remove" — the frontend depends on these exact strings.
- DON'T use standard "Non-Transferable" — address lists use "Address List".
- DON'T add a peer-to-peer transfer approval — only the manager should modify the list.
- DON'T forget overridesFromOutgoingApprovals: true on BOTH approvals.`
  },
  {
    id: 'quest',
    name: 'Quest',
    category: 'token-type',
    description: 'Quest/reward collection — users complete criteria and claim a badge + coin payout',
    summary: `Required standards: ["Quests"]

- Single token only: validTokenIds = [{start: "1", end: "1"}]
- Quest approval MUST be properly gated — typically via an off-chain claim (merkle challenge with claimConfig), but can also use on-chain criteria (mustOwnTokens, dynamicStoreChallenges, evmQueryChallenges, votingChallenges)
- Coin transfers with overrideFromWithApproverAddress: true + overrideToWithInitiator: true
- predeterminedBalances: amount 1, no increments, no recurring, no duration
- Escrow funded upfront via set_mint_escrow_coins (rewardAmount * maxClaims)
- invariants.noCustomOwnershipTimes: true
- Permissions: use "locked-approvals" preset (recommended)
- Default balances: empty balances, all auto-approve flags true`,
    instructions: `## Quest Configuration

### Mental Model

A quest collection rewards users for completing criteria. Users receive a quest badge (token 1) + coin payout.

The quest approval MUST be properly gated so that only eligible users can claim. Gating options:
- **Off-chain claim (most common)**: A merkle challenge with claimConfig containing plugins (password, codes, whitelist, etc.). The claim is verified off-chain by BitBadges, and a merkle proof is issued for on-chain redemption.
- **On-chain criteria**: mustOwnTokens (require holding specific tokens/badges), dynamicStoreChallenges, evmQueryChallenges, votingChallenges — these are checked directly on-chain during the transfer.
- **Both**: Combine off-chain claims with on-chain criteria for layered verification.

Choose the gating approach based on the user's request. If they mention passwords, codes, or whitelists, use an off-chain claim. If they mention token ownership or on-chain conditions, use the corresponding on-chain criteria.

### Build Steps (call ALL in parallel in one round)

1. \`set_standards\` → \`["Quests"]\`
2. \`set_valid_token_ids\` → \`[{ "start": "1", "end": "1" }]\`
3. \`set_invariants\` → \`{ "noCustomOwnershipTimes": true }\`
4. \`set_permissions\` → \`{ "preset": "locked-approvals" }\`
5. \`set_default_balances\` → empty balances, all auto-approve true
6. \`set_collection_metadata\` / \`set_token_metadata\` — descriptive content
7. \`add_approval\` — the quest approval (see exact structure below)
8. **\`set_mint_escrow_coins\`** — REQUIRED for coin rewards. Amount = rewardPerClaim × maxClaims.

### Quest Approval (add_approval)

Use approvalId \`"quest-approval"\`. The EXACT approvalCriteria structure:

\`\`\`json
{
  "approvalId": "quest-approval",
  "fromListId": "Mint",
  "toListId": "All",
  "initiatedByListId": "All",
  "tokenIds": [{"start":"1","end":"1"}],
  "approvalCriteria": {
    "overridesFromOutgoingApprovals": true,
    "maxNumTransfers": {
      "overallMaxNumTransfers": "<maxClaims>"
    },
    "predeterminedBalances": {
      "manualBalances": [],
      "incrementedBalances": {
        "startBalances": [{ "amount": "1", "tokenIds": [{"start":"1","end":"1"}], "ownershipTimes": [{"start":"1","end":"18446744073709551615"}] }],
        "incrementTokenIdsBy": "0",
        "incrementOwnershipTimesBy": "0",
        "durationFromTimestamp": "0",
        "allowOverrideTimestamp": false,
        "recurringOwnershipTimes": { "startTime": "0", "intervalLength": "0", "chargePeriodLength": "0" }
      },
      "orderCalculationMethod": {
        "useOverallNumTransfers": true,
        "usePerToAddressNumTransfers": false,
        "usePerFromAddressNumTransfers": false,
        "usePerInitiatedByAddressNumTransfers": false,
        "useMerkleChallengeLeafIndex": false,
        "challengeTrackerId": ""
      }
    },
    "coinTransfers": [{
      "to": "",
      "overrideFromWithApproverAddress": true,
      "overrideToWithInitiator": true,
      "coins": [{ "amount": "<rewardAmount>", "denom": "<rewardDenom>" }]
    }]
  }
}
\`\`\`

**Gating** — add ONE OR MORE of these to approvalCriteria based on the user's request:
- **Off-chain claim**: \`"merkleChallenges": [{ "root": "", "expectedProofLength": "0", "maxUsesPerLeaf": "1", "uri": "", "customData": "", "useCreatorAddressAsLeaf": false, "claimConfig": { "approach": "in-site", "label": "...", "plugins": [...] } }]\`
- **Token ownership**: \`"mustOwnTokens": [{ "collectionId": "...", "amountRange": {"start":"1","end":"18446744073709551615"}, ... }]\` — Use collectionId "0" to self-reference this collection (e.g., require holding token 1 from this quest collection itself).
- **Dynamic store**: \`"dynamicStoreChallenges": [...]\`
- **EVM query**: \`"evmQueryChallenges": [...]\`

Off-chain claims are the most common for quests (passwords, codes, whitelists). On-chain criteria can be combined with or used instead of claims.

### Escrow Funding (REQUIRED)

Call \`set_mint_escrow_coins\` in the SAME round as the other tools. Example for 10 ATOM reward × 50 claims:
\`\`\`
set_mint_escrow_coins({ coins: [{ denom: "ibc/A4DB...", amount: "500000000" }] })
\`\`\`
Without this, the escrow has no funds and claims will fail.

### Common Mistakes

- DON'T add extra fields to coinTransfers — the ONLY fields are: to, overrideFromWithApproverAddress, overrideToWithInitiator, coins. NO startTime, NO other fields.
- DON'T omit \`manualBalances: []\` in predeterminedBalances — SDK crashes without it
- DON'T omit fields in orderCalculationMethod — include ALL boolean fields
- DON'T forget \`set_mint_escrow_coins\` — without it, the escrow is empty and rewards can't be paid
- DON'T set maxUsesPerLeaf to anything other than "1" — each user claims once
- DON'T set allowOverrideTimestamp: true — quests require false
- DON'T set useCreatorAddressAsLeaf: true — quests require false`
  },
  {
    id: 'prediction-market',
    name: 'Prediction Market',
    category: 'token-type',
    description: 'Binary prediction market with YES/NO outcome tokens, liquidity pool trading, and vote-based settlement',
    summary: `Required standards: ["Prediction Market"]

- Binary prediction market: "Will X happen by Y?" Users deposit USDC to mint paired YES+NO tokens. Trade YES↔NO on a liquidity pool. Verifier settles by voting. Winner redeems 1:1.
- Token ID 1 = YES, Token ID 2 = NO (via alias paths with 6 decimals)
- mintEscrowAddress holds all deposited USDC
- All permissions frozen after creation
- 7 approvals: paired mint, freely transferable, pre-settlement redeem, yes-wins, no-wins, push-yes, push-no
- Alias paths for YES (token 1) and NO (token 2) with 6 decimals
- Settlement via votingChallenges with 1-of-1 multisig verifier
- Liquidity pool: MsgCreateBalancerPool with badgeslp:collectionId:uyes and badgeslp:collectionId:uno, equal weights
- DON'T use Smart Token standard — this uses mintEscrowAddress, not invariant paths
- DON'T forget votingChallenges on settlement approvals
- DON'T set maxNumTransfers on mint/redeem (should be unlimited = 0)
- DON'T forget to freeze all permissions
- DON'T forget predeterminedBalances with BOTH token IDs in paired mint/redeem
- DON'T set overrideFromWithApproverAddress on the deposit coinTransfer (filler pays, not escrow)`,
    instructions: `## Prediction Market Configuration

### Mental Model

Binary prediction market: "Will X happen by Y?" Users deposit USDC to mint paired YES+NO tokens. Trade YES↔NO on a liquidity pool. Verifier settles by voting. Winner redeems 1:1.

### Collection Structure

- Token ID 1 = YES, Token ID 2 = NO (via alias paths with 6 decimals)
- Standard: 'Prediction Market'
- mintEscrowAddress holds all deposited USDC
- All permissions frozen after creation

### Alias Paths

Two alias paths are REQUIRED — one for YES (token 1) and one for NO (token 2):

\`\`\`json
[
  {
    "denom": "uyes",
    "symbol": "uyes",
    "conversion": {
      "sideA": { "amount": "1" },
      "sideB": [{ "amount": "1", "tokenIds": [{ "start": "1", "end": "1" }], "ownershipTimes": [{ "start": "1", "end": "18446744073709551615" }] }]
    },
    "denomUnits": [{ "symbol": "YES", "decimals": "6", "isDefaultDisplay": true }]
  },
  {
    "denom": "uno",
    "symbol": "uno",
    "conversion": {
      "sideA": { "amount": "1" },
      "sideB": [{ "amount": "1", "tokenIds": [{ "start": "2", "end": "2" }], "ownershipTimes": [{ "start": "1", "end": "18446744073709551615" }] }]
    },
    "denomUnits": [{ "symbol": "NO", "decimals": "6", "isDefaultDisplay": true }]
  }
]
\`\`\`

### 7 Approvals

**CRITICAL: All amounts in startBalances must be in BASE units (micro-units). Since YES/NO tokens have 6 decimals, 1 display token = 1,000,000 base units. Use "1000000" (not "1") for startBalance amounts when minting 1 display-YES + 1 display-NO per deposit.**

#### 1. Paired Mint (deposit 1 USDC → receive 1 YES + 1 NO)

\`\`\`json
{
  "approvalId": "paired-mint",
  "fromListId": "Mint",
  "toListId": "All",
  "initiatedByListId": "All",
  "tokenIds": [{ "start": "1", "end": "2" }],
  "approvalCriteria": {
    "overridesFromOutgoingApprovals": true,
    "predeterminedBalances": {
      "manualBalances": [],
      "incrementedBalances": {
        "startBalances": [
          { "amount": "1", "tokenIds": [{ "start": "1", "end": "1" }], "ownershipTimes": [{ "start": "1", "end": "18446744073709551615" }] },
          { "amount": "1", "tokenIds": [{ "start": "2", "end": "2" }], "ownershipTimes": [{ "start": "1", "end": "18446744073709551615" }] }
        ],
        "incrementTokenIdsBy": "0",
        "incrementOwnershipTimesBy": "0",
        "durationFromTimestamp": "0",
        "allowOverrideTimestamp": false,
        "recurringOwnershipTimes": { "startTime": "0", "intervalLength": "0", "chargePeriodLength": "0" }
      },
      "orderCalculationMethod": {
        "useOverallNumTransfers": true,
        "usePerToAddressNumTransfers": false,
        "usePerFromAddressNumTransfers": false,
        "usePerInitiatedByAddressNumTransfers": false,
        "useMerkleChallengeLeafIndex": false,
        "challengeTrackerId": ""
      }
    },
    "coinTransfers": [{
      "to": "Mint",
      "overrideFromWithApproverAddress": false,
      "overrideToWithInitiator": false,
      "coins": [{ "amount": "1000000", "denom": "<USDC_IBC_DENOM>" }]
    }]
  }
}
\`\`\`

> **CRITICAL:** The \`to\` field MUST be \`"Mint"\`. The chain auto-resolves \`"Mint"\` to the collection's \`mintEscrowAddress\` at execution time for collection-level approvals. This ensures deposited USDC goes to the escrow (not the creator's wallet) and is available for redemption payouts.
>
> DO NOT use the creator's address or any hardcoded address — use \`"Mint"\` which auto-resolves to the escrow.

Note: The deposit coinTransfer uses \`to: "Mint"\` with no overrides: initiator pays USDC → escrow (auto-resolved). The payout coinTransfers use \`to: ""\` with \`overrideFromWithApproverAddress: true\` (escrow pays) + \`overrideToWithInitiator: true\` (redeemer receives).

#### 2. Freely Transferable (allows transfers between users, pools, DEX)

\`\`\`json
{
  "approvalId": "transferable",
  "fromListId": "!Mint",
  "toListId": "All",
  "initiatedByListId": "All",
  "tokenIds": [{ "start": "1", "end": "2" }],
  "approvalCriteria": {
    "overridesFromOutgoingApprovals": false,
    "overridesToIncomingApprovals": false,
    "mustPrioritize": false
  }
}
\`\`\`

> This approval has NO coinTransfers, NO votingChallenges, and mustPrioritize: false. It allows auto-scanning so tokens can be freely transferred to pool addresses and between users.

#### 3. Pre-Settlement Redeem (burn 1 YES + 1 NO → 1 USDC from escrow)

\`\`\`json
{
  "approvalId": "pre-settlement-redeem",
  "fromListId": "!Mint",
  "toListId": "<BURN_ADDRESS>",
  "initiatedByListId": "All",
  "tokenIds": [{ "start": "1", "end": "2" }],
  "approvalCriteria": {
    "predeterminedBalances": {
      "manualBalances": [],
      "incrementedBalances": {
        "startBalances": [
          { "amount": "1", "tokenIds": [{ "start": "1", "end": "1" }], "ownershipTimes": [{ "start": "1", "end": "18446744073709551615" }] },
          { "amount": "1", "tokenIds": [{ "start": "2", "end": "2" }], "ownershipTimes": [{ "start": "1", "end": "18446744073709551615" }] }
        ],
        "incrementTokenIdsBy": "0",
        "incrementOwnershipTimesBy": "0",
        "durationFromTimestamp": "0",
        "allowOverrideTimestamp": false,
        "recurringOwnershipTimes": { "startTime": "0", "intervalLength": "0", "chargePeriodLength": "0" }
      },
      "orderCalculationMethod": {
        "useOverallNumTransfers": true,
        "usePerToAddressNumTransfers": false,
        "usePerFromAddressNumTransfers": false,
        "usePerInitiatedByAddressNumTransfers": false,
        "useMerkleChallengeLeafIndex": false,
        "challengeTrackerId": ""
      }
    },
    "coinTransfers": [{
      "to": "",
      "overrideFromWithApproverAddress": true,
      "overrideToWithInitiator": true,
      "coins": [{ "amount": "1000000", "denom": "<USDC_IBC_DENOM>" }]
    }],
    "maxNumTransfers": {
      "overallMaxNumTransfers": "18446744073709551615",
      "perFromAddressMaxNumTransfers": "0",
      "perToAddressMaxNumTransfers": "0",
      "perInitiatedByAddressMaxNumTransfers": "0",
      "amountTrackerId": "pre-settlement-redeem",
      "resetTimeIntervals": { "startTime": "0", "intervalLength": "0" }
    }
  }
}
\`\`\`

#### 4. YES Wins (burn YES → 1 USDC)

\`\`\`json
{
  "approvalId": "yes-wins",
  "fromListId": "!Mint",
  "toListId": "<BURN_ADDRESS>",
  "initiatedByListId": "All",
  "tokenIds": [{ "start": "1", "end": "1" }],
  "approvalCriteria": {
    "predeterminedBalances": {
      "manualBalances": [],
      "incrementedBalances": {
        "startBalances": [
          { "amount": "1", "tokenIds": [{ "start": "1", "end": "1" }], "ownershipTimes": [{ "start": "1", "end": "18446744073709551615" }] }
        ],
        "incrementTokenIdsBy": "0",
        "incrementOwnershipTimesBy": "0",
        "durationFromTimestamp": "0",
        "allowOverrideTimestamp": false,
        "recurringOwnershipTimes": { "startTime": "0", "intervalLength": "0", "chargePeriodLength": "0" }
      },
      "orderCalculationMethod": {
        "useOverallNumTransfers": true,
        "usePerToAddressNumTransfers": false,
        "usePerFromAddressNumTransfers": false,
        "usePerInitiatedByAddressNumTransfers": false,
        "useMerkleChallengeLeafIndex": false,
        "challengeTrackerId": ""
      }
    },
    "coinTransfers": [{
      "to": "",
      "overrideFromWithApproverAddress": true,
      "overrideToWithInitiator": true,
      "coins": [{ "amount": "1000000", "denom": "<USDC_IBC_DENOM>" }]
    }],
    "maxNumTransfers": {
      "overallMaxNumTransfers": "18446744073709551615",
      "perFromAddressMaxNumTransfers": "0",
      "perToAddressMaxNumTransfers": "0",
      "perInitiatedByAddressMaxNumTransfers": "0",
      "amountTrackerId": "yes-wins",
      "resetTimeIntervals": { "startTime": "0", "intervalLength": "0" }
    },
    "votingChallenges": [{
      "proposalId": "yes-wins-proposal",
      "quorumThreshold": "100",
      "voters": [{ "address": "<VERIFIER_ADDRESS>", "weight": "1" }]
    }]
  }
}
\`\`\`

#### 5. NO Wins (burn NO → 1 USDC)

Same as YES Wins but with token ID 2, separate proposalId, and separate amountTrackerId:

\`\`\`json
{
  "approvalId": "no-wins",
  "fromListId": "!Mint",
  "toListId": "<BURN_ADDRESS>",
  "initiatedByListId": "All",
  "tokenIds": [{ "start": "2", "end": "2" }],
  "approvalCriteria": {
    "predeterminedBalances": {
      "manualBalances": [],
      "incrementedBalances": {
        "startBalances": [
          { "amount": "1", "tokenIds": [{ "start": "2", "end": "2" }], "ownershipTimes": [{ "start": "1", "end": "18446744073709551615" }] }
        ],
        "incrementTokenIdsBy": "0",
        "incrementOwnershipTimesBy": "0",
        "durationFromTimestamp": "0",
        "allowOverrideTimestamp": false,
        "recurringOwnershipTimes": { "startTime": "0", "intervalLength": "0", "chargePeriodLength": "0" }
      },
      "orderCalculationMethod": {
        "useOverallNumTransfers": true,
        "usePerToAddressNumTransfers": false,
        "usePerFromAddressNumTransfers": false,
        "usePerInitiatedByAddressNumTransfers": false,
        "useMerkleChallengeLeafIndex": false,
        "challengeTrackerId": ""
      }
    },
    "coinTransfers": [{
      "to": "",
      "overrideFromWithApproverAddress": true,
      "overrideToWithInitiator": true,
      "coins": [{ "amount": "1000000", "denom": "<USDC_IBC_DENOM>" }]
    }],
    "maxNumTransfers": {
      "overallMaxNumTransfers": "18446744073709551615",
      "perFromAddressMaxNumTransfers": "0",
      "perToAddressMaxNumTransfers": "0",
      "perInitiatedByAddressMaxNumTransfers": "0",
      "amountTrackerId": "no-wins",
      "resetTimeIntervals": { "startTime": "0", "intervalLength": "0" }
    },
    "votingChallenges": [{
      "proposalId": "no-wins-proposal",
      "quorumThreshold": "100",
      "voters": [{ "address": "<VERIFIER_ADDRESS>", "weight": "1" }]
    }]
  }
}
\`\`\`

#### 6. Push YES (burn YES → 0.5 USDC — fallback if market is indeterminate)

\`\`\`json
{
  "approvalId": "push-yes",
  "fromListId": "!Mint",
  "toListId": "<BURN_ADDRESS>",
  "initiatedByListId": "All",
  "tokenIds": [{ "start": "1", "end": "1" }],
  "approvalCriteria": {
    "predeterminedBalances": {
      "manualBalances": [],
      "incrementedBalances": {
        "startBalances": [
          { "amount": "1", "tokenIds": [{ "start": "1", "end": "1" }], "ownershipTimes": [{ "start": "1", "end": "18446744073709551615" }] }
        ],
        "incrementTokenIdsBy": "0",
        "incrementOwnershipTimesBy": "0",
        "durationFromTimestamp": "0",
        "allowOverrideTimestamp": false,
        "recurringOwnershipTimes": { "startTime": "0", "intervalLength": "0", "chargePeriodLength": "0" }
      },
      "orderCalculationMethod": {
        "useOverallNumTransfers": true,
        "usePerToAddressNumTransfers": false,
        "usePerFromAddressNumTransfers": false,
        "usePerInitiatedByAddressNumTransfers": false,
        "useMerkleChallengeLeafIndex": false,
        "challengeTrackerId": ""
      }
    },
    "coinTransfers": [{
      "to": "",
      "overrideFromWithApproverAddress": true,
      "overrideToWithInitiator": true,
      "coins": [{ "amount": "500000", "denom": "<USDC_IBC_DENOM>" }]
    }],
    "maxNumTransfers": {
      "overallMaxNumTransfers": "18446744073709551615",
      "perFromAddressMaxNumTransfers": "0",
      "perToAddressMaxNumTransfers": "0",
      "perInitiatedByAddressMaxNumTransfers": "0",
      "amountTrackerId": "push-yes",
      "resetTimeIntervals": { "startTime": "0", "intervalLength": "0" }
    },
    "votingChallenges": [{
      "proposalId": "push-yes-proposal",
      "quorumThreshold": "100",
      "voters": [{ "address": "<VERIFIER_ADDRESS>", "weight": "1" }]
    }]
  }
}
\`\`\`

#### 7. Push NO (burn NO → 0.5 USDC — fallback if market is indeterminate)

Same as Push YES but with token ID 2 and a separate proposalId:

\`\`\`json
{
  "approvalId": "push-no",
  "fromListId": "!Mint",
  "toListId": "<BURN_ADDRESS>",
  "initiatedByListId": "All",
  "tokenIds": [{ "start": "2", "end": "2" }],
  "approvalCriteria": {
    "predeterminedBalances": {
      "manualBalances": [],
      "incrementedBalances": {
        "startBalances": [
          { "amount": "1", "tokenIds": [{ "start": "2", "end": "2" }], "ownershipTimes": [{ "start": "1", "end": "18446744073709551615" }] }
        ],
        "incrementTokenIdsBy": "0",
        "incrementOwnershipTimesBy": "0",
        "durationFromTimestamp": "0",
        "allowOverrideTimestamp": false,
        "recurringOwnershipTimes": { "startTime": "0", "intervalLength": "0", "chargePeriodLength": "0" }
      },
      "orderCalculationMethod": {
        "useOverallNumTransfers": true,
        "usePerToAddressNumTransfers": false,
        "usePerFromAddressNumTransfers": false,
        "usePerInitiatedByAddressNumTransfers": false,
        "useMerkleChallengeLeafIndex": false,
        "challengeTrackerId": ""
      }
    },
    "coinTransfers": [{
      "to": "",
      "overrideFromWithApproverAddress": true,
      "overrideToWithInitiator": true,
      "coins": [{ "amount": "500000", "denom": "<USDC_IBC_DENOM>" }]
    }],
    "maxNumTransfers": {
      "overallMaxNumTransfers": "18446744073709551615",
      "perFromAddressMaxNumTransfers": "0",
      "perToAddressMaxNumTransfers": "0",
      "perInitiatedByAddressMaxNumTransfers": "0",
      "amountTrackerId": "push-no",
      "resetTimeIntervals": { "startTime": "0", "intervalLength": "0" }
    },
    "votingChallenges": [{
      "proposalId": "push-no-proposal",
      "quorumThreshold": "100",
      "voters": [{ "address": "<VERIFIER_ADDRESS>", "weight": "1" }]
    }]
  }
}
\`\`\`

### Settlement Flow

1. Verifier sends MsgCastVote with 100% yes on the proposalId of the winning approval
2. Once quorum reached, that approval becomes active for transfers
3. Holders burn winning token to receive USDC from escrow

### Liquidity Pool

After creating the collection and minting initial pairs:
- Create pool: MsgCreateBalancerPool with badgeslp:collectionId:uyes and badgeslp:collectionId:uno, equal weights
- Market price discovery: YES_price = NO_reserve / (YES_reserve + NO_reserve)

### Steps for AI Builder

1. Use per-field tools to initialize the collection (set_standards, set_valid_token_ids, etc.)
2. \`set_token_metadata\` for YES (token 1) and NO (token 2)
3. \`set_invariants\` with \`{ "noCustomOwnershipTimes": true, "disablePoolCreation": false }\` — MUST set disablePoolCreation to false
4. Add 7 approvals via \`add_approval\`:
   - \`paired-mint\`: Mint → All (deposit USDC, receive YES+NO). coinTransfer \`to\` MUST be \`"Mint"\` — the chain auto-resolves this to the collection's mintEscrowAddress at execution time. No overrides on deposit.
   - \`transferable\`: !Mint → All (free transfers between users/pools, NO coinTransfers, NO mustPrioritize, overridesFromOutgoingApprovals: false, overridesToIncomingApprovals: false)
   - \`pre-settlement-redeem\`: !Mint → burn (redeem pair for USDC). coinTransfer \`to: ""\` with \`overrideFromWithApproverAddress: true\` + \`overrideToWithInitiator: true\` (escrow pays redeemer).
   - \`yes-wins\`, \`no-wins\`, \`push-yes\`, \`push-no\`: settlement (vote-gated). Same payout pattern: \`to: ""\` with both overrides true.
5. \`set_mint_escrow_coins\` — NOT needed upfront (coins come from deposits)
6. Add alias paths via \`add_alias_path\` for YES and NO
7. \`set_permissions\` with preset \`"fully-immutable"\` to freeze everything (NOT "locked-approvals" — that leaves some permissions neutral)
7. After collection creation: mint initial pairs + create pool

### Common Mistakes

- DON'T forget both alias paths (uyes and uno)
- DON'T set the alias denom/symbol the same as the denomUnit symbol — the chain rejects duplicate denom unit symbols. Use base denoms like "uyes"/"uno" with display denomUnits "YES"/"NO" (6 decimals)
- DON'T use Smart Token standard — this uses mintEscrowAddress, not invariant paths
- DON'T forget votingChallenges on settlement approvals
- DON'T set maxNumTransfers on the paired mint approval (deposits should be unlimited = 0)
- DO set maxNumTransfers.overallMaxNumTransfers to "18446744073709551615" (max uint64) on ALL approvals that use overrideFromWithApproverAddress: true (redeem + settlement). The chain REQUIRES a non-zero maxNumTransfers when overrideFromWithApproverAddress is true. Use max uint64 for effectively unlimited.
- DON'T disable overrideFromWithApproverAddress to work around maxNumTransfers errors — that breaks payout routing. Always keep overrideFromWithApproverAddress: true on redemption/settlement approvals and set maxNumTransfers to max uint64.
- DON'T forget to freeze all permissions
- DON'T forget predeterminedBalances with BOTH token IDs in paired mint/redeem
- DON'T set overrideFromWithApproverAddress on the deposit coinTransfer (filler pays, not escrow)
- DON'T leave the "to" field empty on the paired mint coinTransfer — use \`"Mint"\` which auto-resolves to the collection's mintEscrowAddress at execution time.
- DON'T use the creator's address or any hardcoded address as "to" on the deposit — use \`"Mint"\` for auto-routing to escrow.
- DON'T hardcode the creator address as the coinTransfer "to" on redemption/settlement — use overrideToWithInitiator: true so the person redeeming receives the payout
- DON'T use "1" for startBalance amounts — YES/NO tokens have 6 decimals, so 1 display token = 1,000,000 base units. Use "1000000" for each startBalance amount.
- DON'T use \`set_permissions\` preset "locked-approvals" — use "fully-immutable" to freeze ALL permissions including validTokenIds
- DON'T use lowercase "prediction-market" as the standard — the correct name is "Prediction Market" (title case with space)
- DON'T set invariants.disablePoolCreation to true — prediction markets REQUIRE liquidity pools for YES/NO trading. Set it to false.`
  },
  {
    id: 'bounty',
    name: 'Bounty',
    category: 'token-type',
    description: 'Escrow-based bounty with verifier arbitration. Submitter escrows coins, verifier accepts (pays recipient) or denies (refunds submitter). Expires if no decision.',
    summary: `Required standards: ["Bounty"]

- 1 token ID (vehicle for approval engine — minted directly to burn)
- 3 collection-level approvals: accept, deny, expire
- Each approval: Mint → burn 1x token ID 1, triggers coinTransfer as side effect
- Verifier decides outcome via MsgCastVote
- Escrow pre-funded at creation via mintEscrowCoinsToTransfer
- Fixed bounty amount, no amount scaling
- All approvals maxNumTransfers = 1 (one-shot)
- All permissions frozen after creation
- Expiration enforced via transferTimes windows`,
    instructions: `# Bounty Standard

## Mental Model

A bounty is an escrow-based agreement between three parties:
- **Submitter**: Creates the bounty, deposits funds into escrow
- **Recipient**: Receives the payout if the verifier accepts
- **Verifier**: Decides whether to accept or deny the bounty

The escrow is funded upfront at collection creation via \`mintEscrowCoinsToTransfer\`. Each resolution path (accept/deny/expire) is a single approval that mints 1x token ID 1 from Mint → burn address. The token is just a vehicle — the real action is the coinTransfer side effect that pays out from escrow. The verifier votes to unlock accept or deny. If no vote before expiration, anyone can trigger expire to refund the submitter.

## Token Structure

- Token ID 1 = Bounty token (vehicle for approval engine)
- validTokenIds: [{ start: "1", end: "1" }]
- 1 alias path: \`ubounty\` → token ID 1, symbol BOUNTY, 1 decimal, 1:1 conversion

## 3 Required Approvals

All 3 approvals share the same structure: Mint → burn address, 1x token ID 1. The token is just a vehicle to trigger the approval engine's coinTransfer. Each approval has maxNumTransfers = 1 (one-shot).

### 1. Accept (bounty-accept-*)
Verifier votes accept → mint-to-burn → coins to recipient.

Key fields:
- fromListId: "Mint"
- toListId: burn address (bb1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqs7gvmv)
- initiatedByListId: "All"
- coinTransfers: [{ to: recipientAddress, overrideFromWithApproverAddress: true, overrideToWithInitiator: false, coins: [{ denom, amount: depositAmount }] }]
- predeterminedBalances.incrementedBalances:
  - startBalances: [{ amount: "1", tokenIds: [{ start: "1", end: "1" }], ownershipTimes: fullRange }]
  - allowAmountScaling: false, maxScalingMultiplier: "0"
- votingChallenges: [{ proposalId: "bounty-accept-*", quorumThreshold: "100", voters: [{ address: verifierAddress, weight: "1" }] }]
- transferTimes: [{ start: "1", end: expirationTimestamp }]
- maxNumTransfers.overallMaxNumTransfers: "1"
- overridesFromOutgoingApprovals: true
- overridesToIncomingApprovals: true

### 2. Deny (bounty-deny-*)
Verifier votes deny → mint-to-burn → coins to submitter.

Same as Accept but:
- coinTransfers.to: submitterAddress (refund)
- votingChallenges proposalId: "bounty-deny-*"

### 3. Expire (bounty-expire-*)
After expiration → mint-to-burn → coins to submitter. No verifier vote needed.

Same as Deny but:
- NO votingChallenges (time-gated only)
- transferTimes: [{ start: expirationTimestamp + 1, end: "18446744073709551615" }]

## Settlement Flow

1. Verifier sends MsgCastVote to unlock accept or deny:
   - collection_id: collectionId
   - approval_level: "collection"
   - approval_id: accept or deny approval ID
   - proposal_id: matching proposal ID
   - yes_weight: "100"

2. After vote, anyone triggers the payout:
   - MsgTransferTokens from Mint to burn address (1x token ID 1)
   - prioritizedApprovals: [{ approvalId, approvalLevel: "collection" }]
   - Coin transfer executes automatically (escrow → recipient or submitter)

3. For expiration (no vote needed):
   - After expirationTimestamp, anyone can call MsgTransferTokens with the expire approval
   - Coins return to submitter automatically

## Key Differences from Prediction Markets

- Token is just a vehicle (minted directly to burn) — nobody holds it
- 3 approvals, not 7 (no separate mint/redeem/transfer/push)
- Escrow pre-funded at creation (mintEscrowCoinsToTransfer)
- Fixed amount, no allowAmountScaling
- Fixed payout addresses (hardcoded in coinTransfers.to), NOT overrideToWithInitiator
- All approvals maxNumTransfers = 1 (one-shot)
- Expiration via transferTimes windowing (accept/deny before, expire after)

## Creation Flow (Tool Calls)

1. Use per-field tools to initialize the collection
2. \`set_valid_token_ids\` — set [{ start: "1", end: "1" }]
3. \`set_standards\` — set ["Bounty"]
4. \`set_invariants\` — set { noCustomOwnershipTimes: true, disablePoolCreation: true }
5. \`set_mint_escrow_coins\` — fund escrow with bounty amount
6. \`add_approval\` x3 — add accept, deny, expire approvals
7. \`add_alias_path\` — ubounty alias (symbol BOUNTY, 1 decimal, 1:1 token ID 1)
8. \`set_permissions\` — freeze all permissions
9. \`set_collection_metadata\` — name, description, image
10. \`set_token_metadata\` — token 1 metadata
11. \`validate_transaction\` — verify structure
12. \`simulate_transaction\` — dry run

## Permissions

All permissions MUST be frozen (permanentlyForbiddenTimes: fullRange):
- canDeleteCollection
- canArchiveCollection
- canUpdateStandards
- canUpdateCustomData
- canUpdateManager
- canUpdateCollectionMetadata
- canUpdateValidTokenIds
- canUpdateTokenMetadata
- canUpdateCollectionApprovals
- canAddMoreAliasPaths
- canAddMoreCosmosCoinWrapperPaths

### Common Mistakes

- DON'T use allowAmountScaling — bounty amount is fixed at creation time
- DON'T use overrideToWithInitiator — use hardcoded addresses in coinTransfers.to
- DON'T set maxNumTransfers > 1 — each approval is one-shot
- DON'T use fromListId "!Mint" — all 3 approvals mint from "Mint" to burn address
- DON'T omit manualBalances: [] in predeterminedBalances
- DON'T omit fields in orderCalculationMethod — include ALL boolean fields
- DON'T make expiration transferTimes overlap with accept/deny transferTimes
- DON'T forget set_mint_escrow_coins — without it, the escrow is empty and payouts fail

### Advanced: Self-Referencing with mustOwnTokens

For bounties that require the verifier or submitter to hold a token from THIS collection (e.g., a reputation badge), use collectionId "0" in mustOwnTokens. The chain resolves "0" to the current collection ID at runtime, which is especially useful at creation time when the real ID is not yet known.`
  },
  {
    id: 'crowdfund',
    name: 'Crowdfund',
    category: 'token-type',
    description: 'On-chain crowdfunding with goal tracking via mustOwnTokens. Contributors deposit funds, receive refund tokens. Crowdfunder withdraws if goal met, contributors refund if not.',
    summary: `Required standards: ["Crowdfund"]

- 2 token IDs: Token 1 = Refund token (contributor holds), Token 2 = Progress token (crowdfunder accumulates)
- 4 collection-level approvals: deposit-refund, deposit-progress, success (withdraw), refund
- Contributors deposit coins → receive Token 1 (refund token). Paired approval mints Token 2 to crowdfunder (progress tracking).
- Success: crowdfunder withdraws if mustOwnTokens confirms they hold >= goal of Token 2 (collectionId: 0 = self-reference)
- Refund: after deadline, contributors burn Token 1 → escrow pays them back (only if goal NOT met via mustOwnTokens check)
- allowAmountScaling: true on ALL 4 approvals (contributors choose deposit size, everything scales proportionally)
- maxScalingMultiplier: MAX_UINT for unrestricted scaling
- Deposit coinTransfer.to = "Mint" (auto-resolves to escrow)
- requireToEqualsInitiatedBy: true on deposit-refund (contributor receives their own refund token)
- All permissions frozen after creation
- DON'T use votingChallenges — goal tracking is via mustOwnTokens, not voting
- DON'T forget allowAmountScaling on ALL 4 approvals
- DON'T set overrideFromWithApproverAddress on deposit (contributor pays, not escrow)
- DO set overrideFromWithApproverAddress: true on success and refund (escrow pays out)
- DO set overrideToWithInitiator: true on refund (contributor receives their own refund)
- DO use collectionId: "0" in mustOwnTokens for self-reference`,
    instructions: `## Crowdfund Configuration

### Mental Model

On-chain crowdfunding with automatic goal tracking. Contributors deposit coins and receive refund tokens. A progress token tracks total raised. If the goal is met, the crowdfunder withdraws all funds. If not, contributors burn their refund tokens to get deposits back.

### Collection Structure

- Token ID 1 = Refund token (contributor holds — burn to refund)
- Token ID 2 = Progress token (crowdfunder accumulates — tracks total raised)
- Standard: "Crowdfund"
- validTokenIds: [{ start: "1", end: "2" }]
- invariants: { noCustomOwnershipTimes: true }
- All permissions frozen after creation

### 4 Required Approvals

#### 1. Deposit-Refund (contributor pays coins → receives Token 1)

\`\`\`json
{
  "approvalId": "deposit-refund",
  "fromListId": "Mint",
  "toListId": "All",
  "initiatedByListId": "All",
  "tokenIds": [{ "start": "1", "end": "1" }],
  "transferTimes": [{ "start": "1", "end": "<DEADLINE_TIMESTAMP>" }],
  "approvalCriteria": {
    "overridesFromOutgoingApprovals": true,
    "overridesToIncomingApprovals": true,
    "requireToEqualsInitiatedBy": true,
    "coinTransfers": [{
      "to": "Mint",
      "overrideFromWithApproverAddress": false,
      "overrideToWithInitiator": false,
      "coins": [{ "amount": "1", "denom": "<DEPOSIT_DENOM>" }]
    }],
    "predeterminedBalances": {
      "incrementedBalances": {
        "startBalances": [{ "amount": "1", "tokenIds": [{ "start": "1", "end": "1" }], "ownershipTimes": [{ "start": "1", "end": "18446744073709551615" }] }],
        "allowAmountScaling": true,
        "maxScalingMultiplier": "18446744073709551615",
        "incrementTokenIdsBy": "0",
        "incrementOwnershipTimesBy": "0",
        "durationFromTimestamp": "0",
        "allowOverrideTimestamp": false
      },
      "orderCalculationMethod": { "useOverallNumTransfers": true }
    },
    "maxNumTransfers": { "overallMaxNumTransfers": "0" }
  }
}
\`\`\`

> **CRITICAL:** \`requireToEqualsInitiatedBy: true\` ensures the contributor receives their own refund token. \`allowAmountScaling: true\` lets contributors choose their deposit size — the coin payment and token amount scale together.

#### 2. Deposit-Progress (paired: mints Token 2 to crowdfunder, no coinTransfer)

\`\`\`json
{
  "approvalId": "deposit-progress",
  "fromListId": "Mint",
  "toListId": "<CROWDFUNDER_ADDRESS>",
  "initiatedByListId": "All",
  "tokenIds": [{ "start": "2", "end": "2" }],
  "transferTimes": [{ "start": "1", "end": "<DEADLINE_TIMESTAMP>" }],
  "approvalCriteria": {
    "overridesFromOutgoingApprovals": true,
    "overridesToIncomingApprovals": true,
    "coinTransfers": [],
    "predeterminedBalances": {
      "incrementedBalances": {
        "startBalances": [{ "amount": "1", "tokenIds": [{ "start": "2", "end": "2" }], "ownershipTimes": [{ "start": "1", "end": "18446744073709551615" }] }],
        "allowAmountScaling": true,
        "maxScalingMultiplier": "18446744073709551615",
        "incrementTokenIdsBy": "0",
        "incrementOwnershipTimesBy": "0",
        "durationFromTimestamp": "0",
        "allowOverrideTimestamp": false
      },
      "orderCalculationMethod": { "useOverallNumTransfers": true }
    },
    "maxNumTransfers": { "overallMaxNumTransfers": "0" }
  }
}
\`\`\`

> **toListId** is the crowdfunder's specific address (not "All"). No coinTransfer — this is the paired counterpart to deposit-refund.

#### 3. Success / Withdraw (crowdfunder withdraws if goal met)

\`\`\`json
{
  "approvalId": "success-withdraw",
  "fromListId": "Mint",
  "toListId": "<BURN_ADDRESS>",
  "initiatedByListId": "<CROWDFUNDER_ADDRESS>",
  "tokenIds": [{ "start": "1", "end": "1" }],
  "transferTimes": [{ "start": "<DEADLINE + 1>", "end": "18446744073709551615" }],
  "approvalCriteria": {
    "overridesFromOutgoingApprovals": true,
    "overridesToIncomingApprovals": true,
    "coinTransfers": [{
      "to": "<CROWDFUNDER_ADDRESS>",
      "overrideFromWithApproverAddress": true,
      "overrideToWithInitiator": false,
      "coins": [{ "amount": "1", "denom": "<DEPOSIT_DENOM>" }]
    }],
    "mustOwnTokens": [{
      "collectionId": "0",
      "tokenIds": [{ "start": "2", "end": "2" }],
      "amountRange": { "start": "<GOAL_AMOUNT>", "end": "18446744073709551615" },
      "ownershipCheckParty": "<CROWDFUNDER_ADDRESS>"
    }],
    "predeterminedBalances": {
      "incrementedBalances": {
        "startBalances": [{ "amount": "1", "tokenIds": [{ "start": "1", "end": "1" }], "ownershipTimes": [{ "start": "1", "end": "18446744073709551615" }] }],
        "allowAmountScaling": true,
        "maxScalingMultiplier": "18446744073709551615",
        "incrementTokenIdsBy": "0",
        "incrementOwnershipTimesBy": "0",
        "durationFromTimestamp": "0",
        "allowOverrideTimestamp": false
      },
      "orderCalculationMethod": { "useOverallNumTransfers": true }
    },
    "maxNumTransfers": { "overallMaxNumTransfers": "1" }
  }
}
\`\`\`

> **mustOwnTokens with collectionId: "0"** = self-reference. Checks that the crowdfunder owns >= goal amount of Token 2 (progress token). Only available after deadline.

#### 4. Refund (contributor burns Token 1 → gets deposit back, only if goal NOT met)

\`\`\`json
{
  "approvalId": "refund",
  "fromListId": "!Mint",
  "toListId": "<BURN_ADDRESS>",
  "initiatedByListId": "All",
  "tokenIds": [{ "start": "1", "end": "1" }],
  "transferTimes": [{ "start": "<DEADLINE + 1>", "end": "18446744073709551615" }],
  "approvalCriteria": {
    "overridesFromOutgoingApprovals": true,
    "overridesToIncomingApprovals": true,
    "coinTransfers": [{
      "to": "",
      "overrideFromWithApproverAddress": true,
      "overrideToWithInitiator": true,
      "coins": [{ "amount": "1", "denom": "<DEPOSIT_DENOM>" }]
    }],
    "mustOwnTokens": [{
      "collectionId": "0",
      "tokenIds": [{ "start": "2", "end": "2" }],
      "amountRange": { "start": "0", "end": "<GOAL_AMOUNT - 1>" },
      "ownershipCheckParty": "<CROWDFUNDER_ADDRESS>"
    }],
    "predeterminedBalances": {
      "incrementedBalances": {
        "startBalances": [{ "amount": "1", "tokenIds": [{ "start": "1", "end": "1" }], "ownershipTimes": [{ "start": "1", "end": "18446744073709551615" }] }],
        "allowAmountScaling": true,
        "maxScalingMultiplier": "18446744073709551615",
        "incrementTokenIdsBy": "0",
        "incrementOwnershipTimesBy": "0",
        "durationFromTimestamp": "0",
        "allowOverrideTimestamp": false
      },
      "orderCalculationMethod": { "useOverallNumTransfers": true }
    },
    "maxNumTransfers": {
      "overallMaxNumTransfers": "18446744073709551615"
    }
  }
}
\`\`\`

> Refund uses overrideFromWithApproverAddress: true (escrow pays) + overrideToWithInitiator: true (contributor receives). mustOwnTokens checks crowdfunder has LESS than goal of Token 2 (amountRange.end = goal - 1). allowAmountScaling: true so refund scales with deposit size. maxNumTransfers = MAX_UINT (needs non-zero with overrideFromWithApproverAddress).

### Creation Flow (Tool Calls)

1. \\\`set_valid_token_ids\\\` — set [{ start: "1", end: "2" }]
2. \\\`set_standards\\\` — set ["Crowdfund"]
3. \\\`set_invariants\\\` — set { noCustomOwnershipTimes: true }
4. \\\`add_approval\\\` x4 — deposit-refund, deposit-progress, success, refund
5. \\\`set_collection_metadata\\\` — name, description, image
6. \\\`set_token_metadata\\\` x2 — Token 1 (Refund), Token 2 (Progress)
7. \\\`set_permissions\\\` — preset "fully-immutable"
8. \\\`validate_transaction\\\` — verify structure
9. \\\`simulate_transaction\\\` — dry run

### Common Mistakes

- DON'T forget allowAmountScaling: true on ALL 4 approvals — without it, all deposits are fixed at 1 base unit
- DON'T use votingChallenges — goal tracking uses mustOwnTokens, not voting
- DON'T forget maxScalingMultiplier: MAX_UINT — without it, scaling is capped at 0 (no scaling)
- DON'T set overrideFromWithApproverAddress on deposit-refund or deposit-progress (contributor pays, not escrow)
- DON'T forget requireToEqualsInitiatedBy: true on deposit-refund
- DON'T forget the paired deposit-progress approval — it tracks total raised
- DON'T set collectionId to the actual collection ID in mustOwnTokens — use "0" for self-reference
- DON'T forget that success transferTimes must start AFTER the deadline (deadline + 1)
- DON'T forget that refund mustOwnTokens amountRange.end = goal - 1 (strictly less than goal)
- DON'T set maxNumTransfers = 0 on refund approval — overrideFromWithApproverAddress requires non-zero`
  },
  {
    id: 'auction',
    name: 'Auction',
    category: 'token-type',
    description: 'Single-item auction with intent-based bidding. Seller mints NFT directly to the winning bidder during the accept window.',
    summary: `Required standards: ["Auction"]

- 1 token ID (the auctioned item)
- 2 collection-level approvals: mint-to-winner (combines mint + accept), burn (cleanup)
- Mint-to-winner: seller mints NFT directly to winning bidder during accept window (bidDeadline → bidDeadline + acceptWindow)
- No separate mint-at-creation step — token doesn't exist until seller accepts a bid
- Burn: anyone can burn token to burn address (permanent cleanup)
- Bidding via user-level outgoing approval intents (not collection approvals)
- Bids must have transferTimes valid through end of accept window (not just bid deadline)
- initiatedByListId on mint-to-winner = seller address (only seller can accept)
- maxNumTransfers = 1 on all approvals (one-shot)
- overridesToIncomingApprovals: false on mint-to-winner (bidder's incoming approval handles payment)
- All permissions frozen after creation
- DON'T use coinTransfers on collection approvals — payment happens via intent matching
- DON'T set initiatedByListId to "All" on mint-to-winner — must be seller
- DON'T set transferTimes to forever — must be bounded to accept window
- DO use autoDeletionOptions.afterOneUse: true on mint-to-winner`,
    instructions: `## Auction Configuration

### Mental Model

A single-item auction where the seller creates a collection, bidders place intent-based bids, and the seller mints the NFT directly to the winning bidder during the accept window. There is no separate mint-then-transfer flow — mint + accept happen in one action. The collection has NO coinTransfers — payment is handled entirely through the bidder's user-level approval (intent matching).

### Collection Structure

- Token ID 1 = The auctioned item
- Standard: "Auction"
- validTokenIds: [{ start: "1", end: "1" }]
- invariants: { noCustomOwnershipTimes: true }
- All permissions frozen after creation

### Bidding Mechanism

Bidders set user-level outgoing approvals on their own accounts that say "I will pay X coins for token 1 from this collection." The seller then accepts the best bid by minting the token directly to the winning bidder during the accept window. The bidder's outgoing approval handles the coin payment side via intent matching.

Bids must have transferTimes that stay valid through the END of the accept window (not just the bid deadline), so the seller can match them during the entire accept period.

### 2 Approvals

#### 1. Mint-to-Winner (seller mints NFT directly to winning bidder during accept window)

\\\`\\\`\\\`json
{
  "approvalId": "auction-mint-to-winner",
  "fromListId": "Mint",
  "toListId": "All",
  "initiatedByListId": "<SELLER_ADDRESS>",
  "tokenIds": [{ "start": "1", "end": "1" }],
  "transferTimes": [{ "start": "<BID_DEADLINE>", "end": "<BID_DEADLINE + ACCEPT_WINDOW>" }],
  "approvalCriteria": {
    "overridesFromOutgoingApprovals": true,
    "overridesToIncomingApprovals": false,
    "coinTransfers": [],
    "predeterminedBalances": {
      "incrementedBalances": {
        "startBalances": [{ "amount": "1", "tokenIds": [{ "start": "1", "end": "1" }], "ownershipTimes": [{ "start": "1", "end": "18446744073709551615" }] }]
      },
      "orderCalculationMethod": { "useOverallNumTransfers": true }
    },
    "maxNumTransfers": { "overallMaxNumTransfers": "1" },
    "autoDeletionOptions": { "afterOneUse": true, "afterOverallMaxNumTransfers": true }
  }
}
\\\`\\\`\\\`

> **CRITICAL:** \\\`overridesToIncomingApprovals: false\\\` — the bidder's incoming approval (intent) must be checked so the coin payment side executes. \\\`transferTimes\\\` are bounded to the accept window only — the seller cannot mint before the bid deadline. \\\`toListId: "All"\\\` allows minting to any address (the winning bidder).

#### 2. Burn (cleanup — anyone can burn the token)

\\\`\\\`\\\`json
{
  "approvalId": "auction-burn",
  "fromListId": "!Mint",
  "toListId": "<BURN_ADDRESS>",
  "initiatedByListId": "All",
  "tokenIds": [{ "start": "1", "end": "1" }],
  "transferTimes": [{ "start": "1", "end": "18446744073709551615" }],
  "approvalCriteria": {
    "overridesFromOutgoingApprovals": true,
    "overridesToIncomingApprovals": true,
    "coinTransfers": [],
    "maxNumTransfers": { "overallMaxNumTransfers": "1" },
    "autoDeletionOptions": { "afterOneUse": true, "afterOverallMaxNumTransfers": true }
  }
}
\\\`\\\`\\\`

### Auction Flow

1. **Create**: Seller creates auction collection with 2 approvals. No token is minted yet.
2. **Bid**: Bidders place intent-based bids (user-level outgoing approvals with coin payment offers). Bids must have transferTimes valid through end of accept window.
3. **Accept**: After bid deadline, seller mints token 1 directly to the winning bidder's address. The bidder's outgoing approval triggers coin payment via intent matching. One action: mint + payment.
4. **Cleanup**: If unsold, burn approval allows cleanup.

### Creation Flow (Tool Calls)

1. \\\`set_valid_token_ids\\\` — set [{ start: "1", end: "1" }]
2. \\\`set_standards\\\` — set ["Auction"]
3. \\\`set_invariants\\\` — set { noCustomOwnershipTimes: true }
4. \\\`add_approval\\\` x2 — mint-to-winner, burn
5. \\\`set_collection_metadata\\\` — auction title, description, image
6. \\\`set_token_metadata\\\` — token 1 metadata (the item being auctioned)
7. \\\`set_permissions\\\` — preset "fully-immutable"
8. \\\`validate_transaction\\\` — verify structure
9. \\\`simulate_transaction\\\` — dry run

### Common Mistakes

- DON'T add coinTransfers to collection approvals — payment flows through intent matching, not collection-level coin transfers
- DON'T set initiatedByListId to "All" on mint-to-winner — only the seller can accept bids
- DON'T set transferTimes to forever — MUST be bounded to accept window (bidDeadline → bidDeadline + acceptWindow)
- DON'T set overridesToIncomingApprovals to true on mint-to-winner — must be false so the bidder's incoming approval (payment intent) is checked
- DON'T create a separate mint-to-seller approval — the token should not exist until the seller accepts a bid
- DON'T forget autoDeletionOptions on mint-to-winner — without afterOneUse: true, the seller could mint to multiple bidders
- DON'T forget that bids must have transferTimes valid through the END of the accept window, not just the bid deadline`
  },
  {
    id: 'product-catalog',
    name: 'Products',
    category: 'token-type',
    description: 'Multi-product storefront with per-product pricing, supply limits, and optional burn-on-purchase. Each product is a separate token ID.',
    summary: `Required standards: ["Products"]

- N token IDs (one per product), starting at 1
- N+1 approvals: 1 purchase approval per product + 1 optional burn approval
- Each purchase approval: fromListId="Mint", toListId="All" (or burn address if burn-on-purchase), 1 coinTransfer paying the store address
- Payment goes directly to store address (NOT to escrow) — overrideFromWithApproverAddress: false
- Each product has independent price, supply limit (maxNumTransfers), and burn-on-purchase toggle
- predeterminedBalances.startBalances: 1x of that product's token ID
- Optional burn approval: !Mint → burn address, no coinTransfers
- invariants: { noCustomOwnershipTimes: true }
- All permissions frozen after creation
- DON'T use overrideFromWithApproverAddress — payment goes directly to store, not from escrow
- DON'T use allowAmountScaling — fixed price per item
- DON'T use votingChallenges, merkleChallenges, or mustOwnTokens
- DO use unique approvalId per product (e.g. "product-purchase-1", "product-purchase-2")
- DO set maxNumTransfers to supply limit (0 = unlimited)`,
    instructions: `## Products Configuration

### Mental Model

A multi-product storefront where each product is a separate token ID. Buyers pay coins to mint a product token. Each product has its own price, supply limit, and optional burn-on-purchase setting. Payment goes directly to the store owner's address (not escrow).

### Collection Structure

- Token IDs 1..N (one per product)
- Standard: "Products"
- validTokenIds: [{ start: "1", end: "<NUM_PRODUCTS>" }]
- invariants: { noCustomOwnershipTimes: true }
- All permissions frozen after creation

### Approval Structure

Each product gets its own purchase approval. There's also an optional global burn approval.

#### Purchase Approval (per product)

\`\`\`json
{
  "approvalId": "product-purchase-1",
  "fromListId": "Mint",
  "toListId": "All",
  "initiatedByListId": "All",
  "tokenIds": [{ "start": "1", "end": "1" }],
  "transferTimes": [{ "start": "1", "end": "18446744073709551615" }],
  "approvalCriteria": {
    "overridesFromOutgoingApprovals": true,
    "overridesToIncomingApprovals": true,
    "coinTransfers": [{
      "to": "<STORE_ADDRESS>",
      "overrideFromWithApproverAddress": false,
      "overrideToWithInitiator": false,
      "coins": [{ "amount": "<PRICE>", "denom": "<DENOM>" }]
    }],
    "predeterminedBalances": {
      "incrementedBalances": {
        "startBalances": [{ "amount": "1", "tokenIds": [{ "start": "1", "end": "1" }], "ownershipTimes": [{ "start": "1", "end": "18446744073709551615" }] }],
        "incrementTokenIdsBy": "0",
        "incrementOwnershipTimesBy": "0",
        "durationFromTimestamp": "0",
        "allowOverrideTimestamp": false,
        "allowAmountScaling": false,
        "maxScalingMultiplier": "0"
      },
      "orderCalculationMethod": { "useOverallNumTransfers": true }
    },
    "maxNumTransfers": { "overallMaxNumTransfers": "<SUPPLY_LIMIT_OR_0>" }
  }
}
\`\`\`

> For burn-on-purchase products, set toListId to the burn address instead of "All". The buyer never holds the token — it's minted directly to burn, and the purchase receipt is the transaction itself.

#### Burn Approval (optional, for all products)

\`\`\`json
{
  "approvalId": "product-burn",
  "fromListId": "!Mint",
  "toListId": "<BURN_ADDRESS>",
  "initiatedByListId": "All",
  "tokenIds": [{ "start": "1", "end": "<NUM_PRODUCTS>" }],
  "transferTimes": [{ "start": "1", "end": "18446744073709551615" }],
  "approvalCriteria": {
    "overridesFromOutgoingApprovals": true,
    "overridesToIncomingApprovals": true,
    "coinTransfers": [],
    "maxNumTransfers": { "overallMaxNumTransfers": "0" }
  }
}
\`\`\`

### Creation Flow (Tool Calls)

1. \\\`set_valid_token_ids\\\` — set [{ start: "1", end: "<NUM_PRODUCTS>" }]
2. \\\`set_standards\\\` — set ["Products"]
3. \\\`set_invariants\\\` — set { noCustomOwnershipTimes: true }
4. \\\`add_approval\\\` xN — one purchase approval per product
5. \\\`add_approval\\\` — optional burn approval
6. \\\`set_collection_metadata\\\` — store name, description, image
7. \\\`set_token_metadata\\\` xN — metadata for each product
8. \\\`set_permissions\\\` — preset "fully-immutable"
9. \\\`validate_transaction\\\` — verify structure
10. \\\`simulate_transaction\\\` — dry run

### Common Mistakes

- DON'T use overrideFromWithApproverAddress on purchase approvals — payment goes directly to the store address, not from escrow
- DON'T use allowAmountScaling — each purchase is exactly 1 item at fixed price
- DON'T use a single approval for multiple products — each product needs its own approval with its own tokenIds, price, and supply limit
- DON'T forget unique approvalIds — duplicate IDs will cause the chain to reject the transaction
- DON'T set maxNumTransfers > 0 on the burn approval — burns should be unlimited
- DON'T use votingChallenges, merkleChallenges, or mustOwnTokens — purchases are open to all
- DON'T forget to set toListId to burn address for burn-on-purchase products`
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
