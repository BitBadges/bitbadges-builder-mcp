/**
 * Skill Instructions Resource
 * Detailed skill-specific guidance for different collection types
 * Ported from frontend skill files with complete instructions
 */

export interface SkillInstruction {
  id: string;
  name: string;
  description: string;
  category: 'token-type' | 'standard' | 'approval' | 'feature' | 'advanced';
  instructions: string;
}

export const SKILL_INSTRUCTIONS: SkillInstruction[] = [
  {
    id: 'smart-token',
    name: 'Smart Token',
    category: 'token-type',
    description: 'IBC-backed smart token with 1:1 backing and two-fold approval system',
    instructions: `## Smart Token Configuration

When creating a Smart Token collection, you MUST follow these requirements:

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
   - Metadata MUST be added to BOTH base alias path AND all denomUnits

### Three-Approval System

Smart Tokens require THREE default approvals (backing, transferable, unbacking):

#### 1. Backing Approval (for depositing/backing tokens)
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
  "uri": "ipfs://METADATA_APPROVAL_backing",
  "customData": "",
  "approvalCriteria": {
    "mustPrioritize": true,
    "allowBackedMinting": true
  },
  "version": "0"
}
\`\`\`

#### 2. Transferable Approval (for peer-to-peer transfers)
This approval allows tokens to be transferred between users. Included by default.

\`\`\`json
{
  "fromListId": "!Mint",
  "toListId": "All",
  "initiatedByListId": "All",
  "approvalId": "transferable-approval",
  "tokenIds": [{ "start": "1", "end": "18446744073709551615" }],
  "transferTimes": [{ "start": "1", "end": "18446744073709551615" }],
  "ownershipTimes": [{ "start": "1", "end": "18446744073709551615" }],
  "version": "0"
}
\`\`\`

#### 3. Unbacking Approval (for withdrawing/unbacking tokens)
This approval allows tokens to be sent TO the IBC backing address (unbacking the tokens).

\`\`\`json
{
  "fromListId": "!Mint:bb1backingaddress...",
  "toListId": "bb1backingaddress...",
  "initiatedByListId": "All",
  "approvalId": "smart-token-unbacking",
  "tokenIds": [{ "start": "1", "end": "1" }],
  "transferTimes": [{ "start": "1", "end": "18446744073709551615" }],
  "ownershipTimes": [{ "start": "1", "end": "18446744073709551615" }],
  "uri": "ipfs://METADATA_APPROVAL_unbacking",
  "customData": "",
  "approvalCriteria": {
    "mustPrioritize": true,
    "allowBackedMinting": true
  },
  "version": "0"
}
\`\`\`

### Deposit/Withdraw Transfer Messages

Because backing/unbacking approvals use \`mustPrioritize: true\`, you MUST set \`onlyCheckPrioritizedCollectionApprovals: true\` and specify the approval in \`prioritizedCollectionApprovals\` when constructing the MsgTransferTokens.

#### Withdraw (Unback) Example
\`\`\`json
{
  "typeUrl": "/tokenization.MsgTransferTokens",
  "value": {
    "creator": "bb1youraddress...",
    "collectionId": "123",
    "transfers": [{
      "from": "bb1youraddress...",
      "toAddresses": ["bb1backingaddress..."],
      "balances": [{
        "amount": "1000000",
        "tokenIds": [{ "start": "1", "end": "1" }],
        "ownershipTimes": [{ "start": "1", "end": "18446744073709551615" }]
      }],
      "prioritizedCollectionApprovals": [{
        "approvalId": "smart-token-unbacking",
        "approvalLevel": "collection",
        "approverAddress": "",
        "version": "0"
      }],
      "onlyCheckPrioritizedCollectionApprovals": true,
      "onlyCheckPrioritizedIncomingApprovals": false,
      "onlyCheckPrioritizedOutgoingApprovals": false,
      "memo": ""
    }]
  }
}
\`\`\`

#### Deposit (Back) Example
\`\`\`json
{
  "typeUrl": "/tokenization.MsgTransferTokens",
  "value": {
    "creator": "bb1youraddress...",
    "collectionId": "123",
    "transfers": [{
      "from": "bb1backingaddress...",
      "toAddresses": ["bb1youraddress..."],
      "balances": [{
        "amount": "1000000",
        "tokenIds": [{ "start": "1", "end": "1" }],
        "ownershipTimes": [{ "start": "1", "end": "18446744073709551615" }]
      }],
      "prioritizedCollectionApprovals": [{
        "approvalId": "smart-token-backing",
        "approvalLevel": "collection",
        "approverAddress": "",
        "version": "0"
      }],
      "onlyCheckPrioritizedCollectionApprovals": true,
      "onlyCheckPrioritizedIncomingApprovals": false,
      "onlyCheckPrioritizedOutgoingApprovals": false,
      "memo": ""
    }]
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

This ensures all approval checks pass while still enabling deposits/withdrawals on behalf of others.

### Optional: AI Agent Vault Standard

Add "AI Agent Vault" to the standards array to enable an AI Prompt tab in the frontend. This is **display-only** and has no impact on on-chain logic. The AI Prompt tab generates ready-to-use instructions for AI agents to interact with the vault.

\`\`\`json
"standards": ["Smart Token", "AI Agent Vault"]
\`\`\`

### Key Rules

1. **NO fromListId: "Mint" approvals**: Tokens are created via IBC backing, not traditional minting
   - Do NOT create approvals with fromListId: "Mint"
   - Use the backing address for backing approval (fromListId)
   - Use "!Mint:[backing_address]" for unbacking approval (fromListId)

2. **Use allowBackedMinting: true**: In both backing and unbacking approvals

3. **Use mustPrioritize: true**: Required for IBC backed operations

4. **DO NOT use overridesFromOutgoingApprovals: true**: When fromListId is a backing address
   - Set to false (or omit) for both backing and unbacking approvals

5. **Backing Address**: Generated deterministically from the IBC denom
   - Use the lookup_token_info or generate_backing_address tools

6. **Alias Path Requirements**:
   - MUST configure at least one alias path
   - The alias path's default display decimals MUST match the IBC denom's decimals
   - Metadata MUST be added to BOTH base alias path AND each denomUnit

### Smart Token Gotchas

- NEVER use fromListId: "Mint" for Smart Token approvals
- MUST create THREE default approvals: backing, transferable, and unbacking
- MUST use allowBackedMinting: true in both backing and unbacking approvals
- MUST use mustPrioritize: true in both backing and unbacking approvals
- DO NOT use overridesFromOutgoingApprovals: true for backing addresses
- MUST configure alias path with matching decimals
- Approval metadata must have empty image ("")
- For deposit/withdraw to other addresses, use multi-msg transactions (deposit to self then transfer, or withdraw to self then MsgSend)
- "AI Agent Vault" standard is display-only — does not affect on-chain logic`
  },
  {
    id: 'minting',
    name: 'Minting Configuration',
    category: 'approval',
    description: 'Configure minting approvals with payments, incremented IDs, auto-deletions, and transfer limits',
    instructions: `## Minting Configuration

When configuring minting approvals, you create collection approvals with fromListId: "Mint" that allow tokens to be minted from the Mint address.

### Core Structure

All minting approvals MUST have:
- **fromListId**: "Mint" (required for all minting operations)
- **overridesFromOutgoingApprovals**: true (REQUIRED)
- **toListId**: Typically "All" or specific address list
- **initiatedByListId**: Who can initiate the mint (typically "All" for public mints)

### Key Features

#### 1. Payments Per Mint

Use \`coinTransfers\` in approvalCriteria to require payment:

\`\`\`json
{
  "approvalCriteria": {
    "overridesFromOutgoingApprovals": true,
    "coinTransfers": [{
      "to": "bb1creator...",
      "coins": [{ "denom": "ubadge", "amount": "5000000000" }],
      "overrideFromWithApproverAddress": false,
      "overrideToWithInitiator": false
    }]
  }
}
\`\`\`

#### 2. Incremented Token IDs

Use \`predeterminedBalances.incrementedBalances\` to automatically increment token IDs:

\`\`\`json
{
  "approvalCriteria": {
    "overridesFromOutgoingApprovals": true,
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
        "recurringOwnershipTimes": {
          "startTime": "0",
          "intervalLength": "0",
          "chargePeriodLength": "0"
        },
        "allowOverrideWithAnyValidToken": false
      },
      "orderCalculationMethod": {
        "useOverallNumTransfers": true,  // CRITICAL: Exactly ONE must be true
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
- When using \`predeterminedBalances\`, \`orderCalculationMethod\` MUST have exactly ONE method set to \`true\`
- The increment is calculated based on this method - \`useOverallNumTransfers: true\` makes minting sequential (order 0 → 1 → 2)
- Default: \`useOverallNumTransfers: true\`

#### 3. Auto-Deletions

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

#### 4. Transfer Limits (Max Num Transfers)

Use \`maxNumTransfers\` to limit minting:

\`\`\`json
{
  "approvalCriteria": {
    "maxNumTransfers": {
      "overallMaxNumTransfers": "100",
      "perInitiatedByAddressMaxNumTransfers": "1",
      "perToAddressMaxNumTransfers": "0",
      "perFromAddressMaxNumTransfers": "0",
      "amountTrackerId": "mint-tracker-id",
      "resetTimeIntervals": {
        "startTime": "0",
        "intervalLength": "0"
      }
    }
  }
}
\`\`\`

### Minting Gotchas

- **MUST have overridesFromOutgoingApprovals: true** (required for all Mint approvals)
- **coinTransfers override flags**: Should be false for standard mint payments
- **predeterminedBalances vs approvalAmounts**: These are incompatible - use one or the other
- **incrementTokenIdsBy**: Use "1" to increment token IDs sequentially
- **orderCalculationMethod**: MUST have exactly ONE method set to true (default: useOverallNumTransfers). Determines order for increments.
- **amountTrackerId**: Required when using maxNumTransfers or approvalAmounts`
  },
  {
    id: 'liquidity-pools',
    name: 'Liquidity Pools',
    category: 'standard',
    description: 'Enable liquidity pools and DEX trading for the collection',
    instructions: `## Liquidity Pools Configuration

When enabling liquidity pools for a collection, follow these requirements:

### Required Structure

1. **Standards**: MUST include "Liquidity Pools"
   - "standards": ["Liquidity Pools"]

2. **Invariants**: MUST set disablePoolCreation to false
   \`\`\`json
   {
     "invariants": {
       "disablePoolCreation": false
     }
   }
   \`\`\`

3. **Alias Paths**: MUST configure at least one alias path
   - This is REQUIRED for liquidity pools to function
   \`\`\`json
   {
     "aliasPathsToAdd": [{
       "denom": "uvatom",
       "symbol": "uvatom",
       "conversion": {
         "sideA": { "amount": "1" },
         "sideB": [{
           "amount": "1",
           "tokenIds": [{ "start": "1", "end": "1" }],
           "ownershipTimes": [{ "start": "1", "end": "18446744073709551615" }]
         }]
       },
       "denomUnits": [{
         "decimals": "6",
         "symbol": "vATOM",
         "isDefaultDisplay": true,
         "metadata": { "uri": "ipfs://METADATA_ALIAS_PATH", "customData": "" }
       }],
       "metadata": { "uri": "ipfs://METADATA_ALIAS_PATH", "customData": "" }
     }]
   }
   \`\`\`

### Complete Example

\`\`\`json
{
  "updateStandards": true,
  "standards": ["Liquidity Pools"],
  "invariants": {
    "noCustomOwnershipTimes": false,
    "maxSupplyPerId": "0",
    "noForcefulPostMintTransfers": false,
    "disablePoolCreation": false,
    "cosmosCoinBackedPath": null
  },
  "aliasPathsToAdd": [{
    "denom": "uvatom",
    "symbol": "uvatom",
    "conversion": {
      "sideA": { "amount": "1" },
      "sideB": [{
        "amount": "1",
        "tokenIds": [{ "start": "1", "end": "1" }],
        "ownershipTimes": [{ "start": "1", "end": "18446744073709551615" }]
      }]
    },
    "denomUnits": [{
      "decimals": "6",
      "symbol": "vATOM",
      "isDefaultDisplay": true,
      "metadata": { "uri": "ipfs://METADATA_ALIAS_PATH", "customData": "" }
    }],
    "metadata": { "uri": "ipfs://METADATA_ALIAS_PATH", "customData": "" }
  }]
}
\`\`\`

### Liquidity Pools Gotchas

- disablePoolCreation MUST be false (not true)
- MUST configure at least one alias path (required for liquidity pools)
- MUST add metadata to BOTH base alias path AND all denomUnits
- This enables decentralized exchange (DEX) trading interfaces`
  },
  {
    id: 'fungible-token',
    name: 'Fungible Token',
    category: 'token-type',
    description: 'ERC-20 style fungible token where all tokens are interchangeable',
    instructions: `## Fungible Token Configuration

Fungible tokens where all tokens of the same ID are interchangeable.

### Required Structure

1. **validTokenIds**: Usually just token ID 1 (single fungible token)
   \`\`\`json
   "validTokenIds": [{ "start": "1", "end": "1" }]
   \`\`\`

2. **Standards**: Include "Fungible Tokens"
   \`\`\`json
   "standards": ["Fungible Tokens"]
   \`\`\`

3. **Minting**: Use fromListId: "Mint" with overridesFromOutgoingApprovals: true

### Token IDs vs Supply

**CRITICAL**: For fungible tokens:
- Use 1 token ID with unlimited supply (maxSupplyPerId: "0")
- NOT many token IDs with 1 supply each

Example for 1,000,000 fungible tokens:
- validTokenIds: [{ "start": "1", "end": "1" }] (single ID)
- The supply is controlled by minting approvals, not token ID range

### Optional: Liquidity Pools

If swappable, add:
- "Liquidity Pools" to standards
- disablePoolCreation: false in invariants
- Alias path with symbol and decimals

### Complete Example

\`\`\`json
{
  "typeUrl": "/tokenization.MsgUniversalUpdateCollection",
  "value": {
    "creator": "bb1...",
    "collectionId": "0",
    "updateValidTokenIds": true,
    "validTokenIds": [{ "start": "1", "end": "1" }],
    "updateStandards": true,
    "standards": ["Fungible Tokens"],
    "invariants": {
      "noCustomOwnershipTimes": false,
      "maxSupplyPerId": "0",
      "noForcefulPostMintTransfers": false,
      "disablePoolCreation": true,
      "cosmosCoinBackedPath": null
    },
    "updateCollectionApprovals": true,
    "collectionApprovals": [{
      "fromListId": "Mint",
      "toListId": "All",
      "initiatedByListId": "All",
      "approvalId": "public-mint",
      "approvalCriteria": {
        "overridesFromOutgoingApprovals": true
      }
    }]
  }
}
\`\`\``
  },
  {
    id: 'nft-collection',
    name: 'NFT Collection',
    category: 'token-type',
    description: 'Non-fungible token collection where each token ID is unique',
    instructions: `## NFT Collection Configuration

Each token ID is unique with supply of 1.

### Required Structure

1. **validTokenIds**: Range of unique IDs
   \`\`\`json
   "validTokenIds": [{ "start": "1", "end": "1000" }]
   \`\`\`

2. **Standards**: Include "NFTs"
   \`\`\`json
   "standards": ["NFTs"]
   \`\`\`

3. **Token Metadata**: Each token needs unique metadata or use {id} placeholder
   \`\`\`json
   "tokenMetadata": [{
     "uri": "ipfs://QmHash/{id}",
     "customData": "",
     "tokenIds": [{ "start": "1", "end": "1000" }]
   }]
   \`\`\`

### Token IDs vs Supply

**CRITICAL**: For NFT collections:
- Use many token IDs with supply of 1 each
- NOT 1 token ID with high supply

Example for 1,000 NFTs:
- validTokenIds: [{ "start": "1", "end": "1000" }] (1000 unique IDs)
- Each ID has supply of 1

### Optional: Tradable

If marketplace trading enabled, add:
- "Tradable" to standards
- "NFTs" to standards
- "DefaultDisplayCurrency:[denom]" to standards (e.g., "DefaultDisplayCurrency:ubadge")

\`\`\`json
"standards": ["Tradable", "NFTs", "DefaultDisplayCurrency:ubadge"]
\`\`\`

### {id} Placeholder for Metadata

Use {id} in metadata URIs to create unique metadata per token:
- URI: \`ipfs://QmHash/{id}\`
- Resolves to: \`ipfs://QmHash/1\`, \`ipfs://QmHash/2\`, etc.`
  },
  {
    id: 'subscription',
    name: 'Subscription',
    category: 'token-type',
    description: 'Recurring payment subscription with time-based ownership',
    instructions: `## Subscription Configuration

Time-based subscriptions with recurring payments.

### Required Structure (ALL MUST BE FOLLOWED)

1. **Standards**: MUST include "Subscriptions"
   \`\`\`json
   "standards": ["Subscriptions"]
   \`\`\`

2. **validTokenIds**: MUST be exactly one token ID
   \`\`\`json
   "validTokenIds": [{ "start": "1", "end": "1" }]
   \`\`\`

3. **Subscription Faucet Approval Requirements** (ALL MANDATORY):
   - fromListId: MUST be "Mint"
   - tokenIds: MUST be exactly 1 token: [{ "start": "1", "end": "1" }]
   - coinTransfers: MUST have at least 1 entry with NO override flags
     - overrideFromWithApproverAddress: MUST be false
     - overrideToWithInitiator: MUST be false
   - predeterminedBalances.incrementedBalances:
     - startBalances: MUST have 1 entry with amount: "1", tokenIds matching approval tokenIds
     - durationFromTimestamp: MUST be non-zero (subscription duration in milliseconds)
     - allowOverrideTimestamp: MUST be true
     - incrementTokenIdsBy: "0"
     - incrementOwnershipTimesBy: "0"
     - recurringOwnershipTimes: all fields "0"
   - orderCalculationMethod: MUST have EXACTLY ONE method set to true (default: useOverallNumTransfers: true)
   - requireFromEqualsInitiatedBy: false
   - requireToEqualsInitiatedBy: false
   - overridesToIncomingApprovals: false
   - merkleChallenges: []
   - overridesFromOutgoingApprovals: true (REQUIRED for Mint approvals)

### Subscription Approval Structure

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
    "uri": "ipfs://...",
    "customData": "",
    "approvalCriteria": {
      "coinTransfers": [{
        "to": "bb1creator...",
        "coins": [{ "denom": "ubadge", "amount": "5000000000" }],
        "overrideFromWithApproverAddress": false,
        "overrideToWithInitiator": false
      }],
      "predeterminedBalances": {
        "incrementedBalances": {
          "startBalances": [{
            "amount": "1",
            "tokenIds": [{ "start": "1", "end": "1" }],
            "ownershipTimes": [{ "start": "1", "end": "18446744073709551615" }]
          }],
          "incrementTokenIdsBy": "0",
          "incrementOwnershipTimesBy": "0",
          "durationFromTimestamp": "2592000000",
          "allowOverrideTimestamp": true,
          "recurringOwnershipTimes": {
            "startTime": "0",
            "intervalLength": "0",
            "chargePeriodLength": "0"
          },
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
      "requireFromEqualsInitiatedBy": false,
      "requireToEqualsInitiatedBy": false,
      "overridesToIncomingApprovals": false,
      "overridesFromOutgoingApprovals": true,
      "merkleChallenges": []
    },
    "version": "0"
  }]
}
\`\`\`

### Duration Constants (in milliseconds)

- Daily: "86400000" (24 hours)
- Weekly: "604800000" (7 days)
- Monthly: "2592000000" (30 days)
- Annual: "31536000000" (365 days)

### Subscription-Specific Gotchas (CRITICAL)

- MUST have exactly 1 token ID (validTokenIds: [{ "start": "1", "end": "1" }])
- coinTransfers override flags MUST be false (NOT true)
- durationFromTimestamp MUST be non-zero (this is the subscription duration)
- allowOverrideTimestamp MUST be true
- orderCalculationMethod MUST have EXACTLY ONE method set to true
- recurringOwnershipTimes should have all fields "0" for standard subscriptions`
  },
  {
    id: 'tradable',
    name: 'Tradable',
    category: 'standard',
    description: 'Enable orderbook/marketplace trading for NFT collections',
    instructions: `## Tradable Configuration

Enable orderbook and marketplace trading for NFT collections.

### Required Structure

MUST include all three standards together:
\`\`\`json
"standards": ["Tradable", "NFTs", "DefaultDisplayCurrency:ubadge"]
\`\`\`

### DefaultDisplayCurrency Format

- Format: "DefaultDisplayCurrency:[denom]"
- Examples:
  - "DefaultDisplayCurrency:ubadge" - Prices in BADGE
  - "DefaultDisplayCurrency:ibc/F082B65..." - Prices in USDC

### Currency Options

| Token | Denom |
|-------|-------|
| BADGE | ubadge |
| USDC | ibc/F082B65C88E4B6D5EF1DB243CDA1D331D002759E938A0F5CD3FFDC5D53B3E349 |
| ATOM | ibc/A4DB47A9D3CF9A068D454513891B526702455D3EF08FB9EB558C561F9DC2B701 |

### Complete Example

\`\`\`json
{
  "updateStandards": true,
  "standards": ["Tradable", "NFTs", "DefaultDisplayCurrency:ubadge"]
}
\`\`\`

### Important Notes

- MUST include all three standards together
- The currency denom determines how prices are displayed in marketplaces
- Typically used with NFT collections`
  },
  {
    id: 'post-mint-transferability',
    name: 'Post-Mint Transferability',
    category: 'approval',
    description: 'Configure post-mint transfer rules and permissions',
    instructions: `## Post-Mint Transferability

Configure how tokens can be transferred after minting.

### Allow All Transfers (Default Open)

\`\`\`json
{
  "collectionApprovals": [{
    "fromListId": "!Mint",
    "toListId": "All",
    "initiatedByListId": "All",
    "approvalId": "post-mint-transfers",
    "tokenIds": [{ "start": "1", "end": "18446744073709551615" }],
    "transferTimes": [{ "start": "1", "end": "18446744073709551615" }],
    "ownershipTimes": [{ "start": "1", "end": "18446744073709551615" }],
    "approvalCriteria": {}
  }]
}
\`\`\`

### Non-Transferable (Soulbound)

For soulbound tokens, you have two options:
1. **Simply omit post-mint transfer approvals** - Only include Mint approvals (fromListId: "Mint")
2. **Use maxNumTransfers with 0** - Create approval with overallMaxNumTransfers: "0"

\`\`\`json
{
  "collectionApprovals": [{
    "fromListId": "!Mint",
    "toListId": "All",
    "initiatedByListId": "All",
    "approvalId": "no-transfers",
    "approvalCriteria": {
      "maxNumTransfers": {
        "overallMaxNumTransfers": "0"
      }
    }
  }]
}
\`\`\`

### Manager-Only Transfers

\`\`\`json
{
  "collectionApprovals": [{
    "fromListId": "!Mint",
    "toListId": "All",
    "initiatedByListId": "bb1manager...",
    "approvalId": "manager-transfers",
    "approvalCriteria": {}
  }]
}
\`\`\`

### Key Points

- fromListId: "!Mint" means "from everyone except Mint" (post-mint transfers)
- Do NOT use overridesFromOutgoingApprovals: true for post-mint transfers
- Respects user outgoing approvals by default
- Use noForcefulPostMintTransfers: true in invariants to guarantee no forced transfers`
  },
  {
    id: 'immutability',
    name: 'Immutability',
    category: 'feature',
    description: 'Lock collection permissions to make it immutable',
    instructions: `## Immutability Configuration

Lock collection permissions to prevent future changes.

### Fully Immutable (All Permissions Frozen)

\`\`\`json
{
  "collectionPermissions": {
    "canDeleteCollection": [{
      "permanentlyPermittedTimes": [],
      "permanentlyForbiddenTimes": [{ "start": "1", "end": "18446744073709551615" }]
    }],
    "canArchiveCollection": [{
      "permanentlyPermittedTimes": [],
      "permanentlyForbiddenTimes": [{ "start": "1", "end": "18446744073709551615" }]
    }],
    "canUpdateStandards": [{
      "permanentlyPermittedTimes": [],
      "permanentlyForbiddenTimes": [{ "start": "1", "end": "18446744073709551615" }]
    }],
    "canUpdateCustomData": [{
      "permanentlyPermittedTimes": [],
      "permanentlyForbiddenTimes": [{ "start": "1", "end": "18446744073709551615" }]
    }],
    "canUpdateManager": [{
      "permanentlyPermittedTimes": [],
      "permanentlyForbiddenTimes": [{ "start": "1", "end": "18446744073709551615" }]
    }],
    "canUpdateCollectionMetadata": [{
      "permanentlyPermittedTimes": [],
      "permanentlyForbiddenTimes": [{ "start": "1", "end": "18446744073709551615" }]
    }],
    "canUpdateValidTokenIds": [{
      "tokenIds": [{ "start": "1", "end": "18446744073709551615" }],
      "permanentlyPermittedTimes": [],
      "permanentlyForbiddenTimes": [{ "start": "1", "end": "18446744073709551615" }]
    }],
    "canUpdateTokenMetadata": [{
      "tokenIds": [{ "start": "1", "end": "18446744073709551615" }],
      "permanentlyPermittedTimes": [],
      "permanentlyForbiddenTimes": [{ "start": "1", "end": "18446744073709551615" }]
    }],
    "canUpdateCollectionApprovals": [{
      "fromListId": "All",
      "toListId": "All",
      "initiatedByListId": "All",
      "transferTimes": [{ "start": "1", "end": "18446744073709551615" }],
      "tokenIds": [{ "start": "1", "end": "18446744073709551615" }],
      "ownershipTimes": [{ "start": "1", "end": "18446744073709551615" }],
      "approvalId": "All",
      "permanentlyPermittedTimes": [],
      "permanentlyForbiddenTimes": [{ "start": "1", "end": "18446744073709551615" }]
    }],
    "canAddMoreAliasPaths": [{
      "permanentlyPermittedTimes": [],
      "permanentlyForbiddenTimes": [{ "start": "1", "end": "18446744073709551615" }]
    }],
    "canAddMoreCosmosCoinWrapperPaths": [{
      "permanentlyPermittedTimes": [],
      "permanentlyForbiddenTimes": [{ "start": "1", "end": "18446744073709551615" }]
    }]
  }
}
\`\`\`

### Permission Values

| State | Description | permanentlyPermittedTimes | permanentlyForbiddenTimes |
|-------|-------------|---------------------------|---------------------------|
| Frozen | Cannot change | [] | [forever] |
| Allowed | Can always change | [forever] | [] |
| Neutral | Updateable for now | [] | [] |

### Security Note

**canUpdateCollectionApprovals should be frozen** for most collections, especially those with Mint approvals:
- If manager can update approvals, they can create new mint approvals
- This allows unlimited minting
- Freeze this permission for production collections`
  },
  {
    id: 'mint-escrow',
    name: 'Mint Escrow',
    category: 'feature',
    description: 'Fund escrow with coins for distribution during minting',
    instructions: `## Mint Escrow Configuration

Fund the collection's Mint escrow with coins that can be distributed during minting.

### Structure

\`\`\`json
{
  "mintEscrowCoinsToTransfer": [
    { "denom": "ubadge", "amount": "1000000000000" }
  ]
}
\`\`\`

### Usage with coinTransfers

When you fund the escrow, minting approvals can release those coins:

\`\`\`json
{
  "approvalCriteria": {
    "coinTransfers": [{
      "to": "bb1recipient...",
      "coins": [{ "denom": "ubadge", "amount": "1000000000" }],
      "overrideFromWithApproverAddress": true,
      "overrideToWithInitiator": true
    }]
  }
}
\`\`\`

### Key Points

- overrideFromWithApproverAddress: true - Takes coins from Mint escrow
- overrideToWithInitiator: true - Sends coins to person initiating the mint
- Can be used for rewards, refunds, or incentive distributions
- Escrow is funded during collection creation`
  },
  {
    id: 'custom-2fa',
    name: 'Custom 2FA',
    category: 'token-type',
    description: 'Time-expiring 2FA token collection for authentication',
    instructions: `## Custom-2FA Configuration

When creating a Custom-2FA collection, follow these requirements:

### Required Structure

1. **Standards**: MUST include "Custom-2FA"
   \`\`\`json
   "standards": ["Custom-2FA"]
   \`\`\`

2. **Approval Requirements**:
   - autoDeletionOptions.allowPurgeIfExpired: MUST be true
   - This allows expired tokens to be automatically purged

3. **Time-Dependent Ownership**: Use time-dependent ownershipTimes in MsgTransferTokens
   - Calculate timestamps: current time + expiration duration
   - Example: 5 minutes = Date.now() + (5 * 60 * 1000)
   - Timestamps are in milliseconds since Unix epoch

### Complete Example

\`\`\`json
{
  "messages": [
    {
      "typeUrl": "/tokenization.MsgUniversalUpdateCollection",
      "value": {
        "creator": "bb1...",
        "collectionId": "0",
        "updateStandards": true,
        "standards": ["Custom-2FA"],
        "updateCollectionApprovals": true,
        "collectionApprovals": [{
          "fromListId": "Mint",
          "toListId": "All",
          "initiatedByListId": "bb1manager...",
          "approvalId": "2fa-mint",
          "tokenIds": [{ "start": "1", "end": "18446744073709551615" }],
          "transferTimes": [{ "start": "1", "end": "18446744073709551615" }],
          "ownershipTimes": [{ "start": "1", "end": "18446744073709551615" }],
          "uri": "ipfs://...",
          "customData": "",
          "approvalCriteria": {
            "overridesFromOutgoingApprovals": true,
            "autoDeletionOptions": {
              "allowPurgeIfExpired": true
            }
          },
          "version": "0"
        }]
      }
    },
    {
      "typeUrl": "/tokenization.MsgTransferTokens",
      "value": {
        "creator": "bb1...",
        "collectionId": "0",
        "transfers": [{
          "from": "Mint",
          "toAddresses": ["bb1recipient..."],
          "balances": [{
            "amount": "1",
            "tokenIds": [{ "start": "1", "end": "1" }],
            "ownershipTimes": [{
              "start": "1706000000000",
              "end": "1706000300000"
            }]
          }],
          "prioritizedApprovals": [{
            "approvalId": "2fa-mint",
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
  ]
}
\`\`\`

### Time Calculations

- 5 minutes: 300000 ms
- 15 minutes: 900000 ms
- 1 hour: 3600000 ms
- 24 hours: 86400000 ms

### 2FA-Specific Gotchas (CRITICAL)

- MUST set allowPurgeIfExpired: true in autoDeletionOptions
- Use time-dependent ownershipTimes in transfers (NOT forever)
- Calculate expiration timestamps correctly (milliseconds since Unix epoch)
- Tokens automatically expire and can be purged after expiration
- Manager-only minting is typical for 2FA (initiatedByListId: "bb1manager...")`
  },
  {
    id: 'time-dependent-balances',
    name: 'Time-Dependent Balances',
    category: 'approval',
    description: 'Configure time-dependent ownership and expiring tokens',
    instructions: `## Time-Dependent Balances Configuration

Configure tokens that automatically expire after a specific time period.

### Structure

\`\`\`json
{
  "predeterminedBalances": {
    "incrementedBalances": {
      "startBalances": [{
        "amount": "1",
        "tokenIds": [{ "start": "1", "end": "1" }],
        "ownershipTimes": [{ "start": "1706000000000", "end": "1706002592000" }]
      }],
      "incrementTokenIdsBy": "0",
      "incrementOwnershipTimesBy": "0",
      "durationFromTimestamp": "3600000",
      "allowOverrideTimestamp": true,
      "recurringOwnershipTimes": {
        "startTime": "0",
        "intervalLength": "0",
        "chargePeriodLength": "0"
      },
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
\`\`\`

### Time Calculations (milliseconds)

- 5 minutes: 300000
- 1 hour: 3600000
- 1 day: 86400000
- 1 week: 604800000
- 30 days: 2592000000
- 1 year: 31536000000

### Key Rules

- durationFromTimestamp: Duration in ms (not an absolute timestamp)
- allowOverrideTimestamp: Typically true
- orderCalculationMethod: MUST have exactly ONE method set to true
- For recurring subscriptions, use the Subscriptions standard instead`
  },
  {
    id: 'forceful-overrides',
    name: 'Forceful Overrides',
    category: 'approval',
    description: 'Configure approvals that override sender/recipient checks',
    instructions: `## Forceful Overrides Configuration

### overridesFromOutgoingApprovals

**MUST be true for:**
- Mint approvals (fromListId: "Mint") - REQUIRED

**MUST be false for:**
- IBC backing addresses (Smart Tokens)
- Post-mint transfers when noForcefulPostMintTransfers: true

### overridesToIncomingApprovals

Almost always false. Use true only to force tokens to recipients without their approval.

### Critical Rules

- Mint approvals: overridesFromOutgoingApprovals MUST be true
- Backing addresses: overridesFromOutgoingApprovals MUST be false
- Check noForcefulPostMintTransfers invariant before using overrides for post-mint`
  },
  {
    id: 'ibc-backed-minting',
    name: 'IBC Backed Minting',
    category: 'advanced',
    description: 'Configure IBC-backed token minting for vaults and Smart Tokens',
    instructions: `## IBC Backed Minting Configuration

### Key Rules (CRITICAL)

1. DO NOT use overridesFromOutgoingApprovals: true when fromListId is a backing address
2. Use allowBackedMinting: true for IBC backed operations
3. Use mustPrioritize: true (required)
4. Backing Address: Use backing address as fromListId (NOT "Mint")

### Approval Pattern

\`\`\`json
{
  "fromListId": "bb1backingaddress...",
  "toListId": "All",
  "approvalCriteria": {
    "allowBackedMinting": true,
    "mustPrioritize": true,
    "overridesFromOutgoingApprovals": false
  }
}
\`\`\`

### Default Approvals

Smart Tokens include THREE default approvals: backing, transferable (fromListId: "!Mint", toListId: "All", approvalId: "transferable-approval"), and unbacking. The transferable approval enables peer-to-peer transfers between users.

### Transfer Messages for Deposit/Withdraw

When constructing MsgTransferTokens for deposit or withdraw, you MUST set \`onlyCheckPrioritizedCollectionApprovals: true\` and include the backing/unbacking approval in \`prioritizedCollectionApprovals\` with the correct \`approvalId\`, \`approvalLevel: "collection"\`, \`approverAddress: ""\`, and \`version\`.

### Multi-Message Deposit/Withdraw

To deposit to or withdraw for another address, use multi-msg transactions:
- **Deposit to other**: MsgTransferTokens (deposit to self) + MsgTransferTokens (transfer to target)
- **Withdraw for other**: MsgTransferTokens (withdraw to self) + MsgSend (send IBC coins to target)

### Gotchas

- NEVER use fromListId: "Mint" for IBC backed operations
- MUST use allowBackedMinting: true
- MUST use mustPrioritize: true
- MUST set onlyCheckPrioritizedCollectionApprovals: true and specify the approval in prioritizedCollectionApprovals when transferring
- DO NOT use overridesFromOutgoingApprovals: true with backing addresses
- For deposit/withdraw to other addresses, use multi-msg transactions`
  },
  {
    id: 'public-mint',
    name: 'Public Mint with Payment',
    category: 'approval',
    description: 'Enable public minting with payment requirement',
    instructions: `## Public Mint with Payment

\`\`\`json
{
  "fromListId": "Mint",
  "toListId": "All",
  "initiatedByListId": "All",
  "approvalId": "public-mint",
  "approvalCriteria": {
    "overridesFromOutgoingApprovals": true,
    "coinTransfers": [{
      "to": "bb1creator...",
      "coins": [{ "denom": "ubadge", "amount": "5000000000" }],
      "overrideFromWithApproverAddress": false,
      "overrideToWithInitiator": false
    }],
    "maxNumTransfers": {
      "perInitiatedByAddressMaxNumTransfers": "1"
    }
  }
}
\`\`\`

### Gotchas

- MUST have overridesFromOutgoingApprovals: true
- coinTransfers override flags should be false
- Use perInitiatedByAddressMaxNumTransfers to limit mints per user`
  },
  {
    id: 'cosmos-coin-wrapper',
    name: 'Cosmos Coin Wrapper',
    category: 'advanced',
    description: 'Configure Cosmos SDK coin wrapping functionality',
    instructions: `## Cosmos Coin Wrapper Configuration

### Key Rules

1. Use allowSpecialWrapping: true for Cosmos wrapper operations
2. Wrapper Address: Generated deterministically from denom
3. Denom: Auto-generated from symbol (lowercase)

### Wrapper Path Structure

\`\`\`json
{
  "cosmosCoinWrapperPathsToAdd": [{
    "denom": "uatom",
    "symbol": "uatom",
    "conversion": {
      "sideA": { "amount": "1" },
      "sideB": [{
        "amount": "1",
        "tokenIds": [{ "start": "1", "end": "1" }],
        "ownershipTimes": [{ "start": "1", "end": "18446744073709551615" }]
      }]
    },
    "denomUnits": [{
      "decimals": "6",
      "symbol": "ATOM",
      "isDefaultDisplay": true,
      "metadata": { "uri": "ipfs://...", "customData": "" }
    }],
    "metadata": { "uri": "ipfs://...", "customData": "" }
  }]
}
\`\`\`

### Important Notes

- CRITICAL: Add metadata to BOTH base wrapper path AND all denomUnits
- MUST use allowSpecialWrapping: true
- Often requires mustPrioritize: true
- Currently only supports static (1:1) conversions`
  },
  {
    id: 'alias-path',
    name: 'Alias Path Configuration',
    category: 'advanced',
    description: 'Configure custom display denominations and alias paths',
    instructions: `## Alias Path Configuration

### Structure

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
    "metadata": { "uri": "ipfs://...", "customData": "" }
  }]
}
\`\`\`

### Rules

- symbol: Base unit symbol (e.g., "uvatom")
- denomUnits: Display units with decimals > 0 ONLY
- Base decimals (0) is implicit - do NOT include in denomUnits
- CRITICAL: Metadata MUST be added to BOTH the base alias path AND all denomUnits`
  },
  {
    id: 'avoid-manual-balances',
    name: 'Avoid Manual Balances',
    category: 'feature',
    description: 'Guidance on when to use incrementedBalances vs manualBalances',
    instructions: `## Avoid Manual Balances

### When to Use incrementedBalances vs manualBalances

**Use incrementedBalances (PREFERRED):**
- Sequential token ID minting (1, 2, 3, ...)
- Time-based subscriptions
- Dynamic token distribution

**Use manualBalances (RARE):**
- Only when you need to specify exact, non-sequential token IDs
- Complex airdrop scenarios with specific ID assignments
- Generally avoid this approach

### Why Avoid manualBalances

- Creates large JSON payloads
- Less flexible
- Harder to maintain
- Not scalable for large collections

### Correct Pattern with incrementedBalances

\`\`\`json
{
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
      "recurringOwnershipTimes": {
        "startTime": "0",
        "intervalLength": "0",
        "chargePeriodLength": "0"
      },
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
\`\`\`

This pattern:
- Starts at token ID 1
- Increments by 1 for each mint
- Uses overall transfer count for ordering (order 0 → 1 → 2)
- Keeps manualBalances empty

### CRITICAL: orderCalculationMethod Rule

When using predeterminedBalances, the orderCalculationMethod MUST have **exactly ONE** method set to true. The increment is calculated based on this:
- useOverallNumTransfers: true → Sequential from order 0 to 1 to 2 (most common)
- usePerToAddressNumTransfers: true → Sequential per recipient
- usePerFromAddressNumTransfers: true → Sequential per sender
- usePerInitiatedByAddressNumTransfers: true → Sequential per initiator

You CANNOT have zero methods true, and you CANNOT have multiple methods true.`
  },
  {
    id: 'evm-query-challenges',
    name: 'EVM Query Challenges',
    category: 'advanced',
    description: 'Validate transfers by calling read-only EVM smart contracts (v25+)',
    instructions: `## EVM Query Challenges Configuration (v25+)

EVM Query Challenges allow you to validate transfers by making read-only calls to EVM smart contracts deployed on the BitBadges chain. This enables powerful use cases like requiring holders of external tokens, checking on-chain state, or validating complex conditions.

### Two Contexts

1. **In ApprovalCriteria**: Checked for EACH transfer that matches the approval
2. **In CollectionInvariants**: Checked ONCE after ALL transfers in a message complete

### Structure

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

### Fields Reference

| Field | Required | Description |
|-------|----------|-------------|
| contractAddress | Yes | EVM contract address (0x format or bb1 bech32) |
| calldata | Yes | ABI-encoded function call (hex with 0x prefix). Supports placeholders. |
| expectedResult | No | Expected return value (hex). If empty, any non-error result passes. |
| comparisonOperator | No | How to compare: "eq" (default), "ne", "gt", "gte", "lt", "lte" |
| gasLimit | No | Gas limit as string. Default: "100000", Max: "500000" |
| uri | No | Metadata URI |
| customData | No | Arbitrary custom data |

### Calldata Placeholders

Placeholders are replaced at runtime with 32-byte padded hex addresses:

| Placeholder | Context | Description |
|-------------|---------|-------------|
| \`$initiator\` | Both | Transaction initiator |
| \`$sender\` | Both | Token sender |
| \`$recipient\` | Both | Token recipient |
| \`$collectionId\` | Both | Collection ID as uint256 |
| \`$recipients\` | Invariants only | ALL recipients concatenated |

### Comparison Operators

| Operator | Description |
|----------|-------------|
| eq | Equal (default) |
| ne | Not equal |
| gt | Greater than (numeric) |
| gte | Greater than or equal (numeric) |
| lt | Less than (numeric) |
| lte | Less than or equal (numeric) |

### Example: Require ERC-20 Balance in Approval

\`\`\`json
{
  "fromListId": "Mint",
  "toListId": "All",
  "initiatedByListId": "All",
  "approvalId": "erc20-gated-mint",
  "tokenIds": [{ "start": "1", "end": "1" }],
  "transferTimes": [{ "start": "1", "end": "18446744073709551615" }],
  "ownershipTimes": [{ "start": "1", "end": "18446744073709551615" }],
  "uri": "ipfs://...",
  "customData": "",
  "approvalCriteria": {
    "overridesFromOutgoingApprovals": true,
    "evmQueryChallenges": [{
      "contractAddress": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      "calldata": "0x70a08231$initiator",
      "expectedResult": "0x00000000000000000000000000000000000000000000000000000000000f4240",
      "comparisonOperator": "gte",
      "gasLimit": "100000"
    }]
  },
  "version": "0"
}
\`\`\`

This requires initiator to have at least 1,000,000 units (0xf4240) of the ERC-20 token to mint.

### Example: Post-Transfer Invariant

\`\`\`json
{
  "invariants": {
    "evmQueryChallenges": [{
      "contractAddress": "0x1234567890abcdef1234567890abcdef12345678",
      "calldata": "0x12345678$sender$collectionId",
      "expectedResult": "0x0000000000000000000000000000000000000000000000000000000000000001",
      "comparisonOperator": "eq",
      "gasLimit": "200000"
    }],
    "noCustomOwnershipTimes": false,
    "maxSupplyPerId": "0",
    "noForcefulPostMintTransfers": false,
    "disablePoolCreation": true,
    "cosmosCoinBackedPath": null
  }
}
\`\`\`

This checks the invariant ONCE after ALL transfers complete.

### Building Calldata

1. **Get function selector**: First 4 bytes of keccak256(function signature)
   - \`balanceOf(address)\` → \`0x70a08231\`
   - \`ownerOf(uint256)\` → \`0x6352211e\`
   - \`isApprovedForAll(address,address)\` → \`0xe985e9c5\`

2. **Append parameters**: Use placeholders or hex-encoded values
   - \`0x70a08231$initiator\` - balanceOf(initiator)
   - \`0xe985e9c5$sender$recipient\` - isApprovedForAll(sender, recipient)

3. **Common return values**:
   - Boolean true: \`0x0000000000000000000000000000000000000000000000000000000000000001\`
   - Boolean false: \`0x0000000000000000000000000000000000000000000000000000000000000000\`

### Gas Limits

- Default per-challenge: 100,000
- Maximum per-challenge: 500,000
- Maximum total across all challenges: 1,000,000 (DoS protection)

### Key Gotchas

- contractAddress can be 0x format or bb1 bech32
- calldata must include 0x prefix
- expectedResult must include 0x prefix (if provided)
- gasLimit is a string (like all numbers in BitBadges)
- Multiple challenges are ANDed together (all must pass)
- For invariants, $recipients gives ALL recipients concatenated`
  },
  {
    id: 'bb-402',
    name: 'BB-402 Token-Gated Access',
    category: 'feature',
    description: 'BB-402 protocol for gating API/resource access behind on-chain token ownership',
    instructions: `## BB-402: Token-Gated Access Protocol

BB-402 is an HTTP protocol that gates API access behind on-chain token ownership. It uses HTTP 402 responses to communicate ownership requirements, challenge-response signing for identity verification, and on-chain balance checks for authorization.

For the full specification, see the BB-402 spec in the docs.

### Protocol Flow

\`\`\`
1. Client → GET /api/resource
2. Server → 402 { version: "1", ownershipRequirements: {...}, message: "..." }
3. Client signs message with wallet, resubmits with X-BB-Proof header
4. Server verifies signature, checks on-chain ownership
5. Server → 200 (access granted), 403 (valid identity but missing tokens), or 402 (invalid/expired proof)
\`\`\`

The 402 vs 403 distinction matters for agents: 403 means "your identity is confirmed, go acquire tokens" while 402 means "start the auth flow over."

### 402 Response Body

| Field | Type | Description |
|-------|------|-------------|
| \`version\` | string | Protocol version. Currently \`"1"\`. |
| \`ownershipRequirements\` | AccessCondition | What tokens the caller must own. |
| \`message\` | string | Server-defined string the caller must sign (nonce, SIWE, JWT, etc.). |

### X-BB-Proof Header

Base64-encoded JSON with fields: \`address\`, \`chain\` (\`"BitBadges"\`, \`"Ethereum"\`, \`"Solana"\`), \`message\`, \`signature\`, and optionally \`publicKey\`.

### Ownership Requirements (AccessCondition)

A recursive type supporting boolean combinators:

\`\`\`
AccessCondition = { "$and": AccessCondition[] }
                | { "$or":  AccessCondition[] }
                | TokenCheck
\`\`\`

A \`TokenCheck\` contains \`tokens\` (array of \`TokenRequirement\`) and optional \`options.numMatchesForVerification\`.

Each \`TokenRequirement\` specifies:
- \`chain\`: \`"BitBadges"\`, \`"Ethereum"\`, \`"Polygon"\`, \`"Solana"\`
- \`collectionId\`: Collection or contract identifier
- \`tokenIds\`: Token ID ranges (\`{ start, end }\` inclusive)
- \`ownershipTimes\`: Optional time ranges (BitBadges-specific; omit for other chains)
- \`mustOwnAmounts\`: Quantity range. \`{1, 1}\` = must own exactly 1. \`{0, 0}\` = must NOT own (blocklist).

Example compound condition ("subscribed AND not banned"):

\`\`\`json
{
  "$and": [
    { "tokens": [{ "chain": "BitBadges", "collectionId": "100", "tokenIds": [{"start":"1","end":"1"}], "mustOwnAmounts": {"start":"1","end":"1"} }] },
    { "tokens": [{ "chain": "BitBadges", "collectionId": "999", "tokenIds": [{"start":"1","end":"1"}], "mustOwnAmounts": {"start":"0","end":"0"} }] }
  ]
}
\`\`\`

### Server Verification Steps

1. **Decode** proof header (base64 → JSON)
2. **Validate message** — confirm it was server-issued (nonce check, expiry, etc.)
3. **Verify signature** using the chain's signing scheme
4. **Resolve address** to canonical format for ownership lookup
5. **Check ownership** against \`ownershipRequirements\` (evaluate AccessCondition tree recursively)
6. **Return** appropriate status code

### Ownership Checking

Use the BitBadges SDK or MCP tools — do NOT raw-fetch the indexer:

- **SDK**: \`BitBadgesApi.getBalanceByAddress(collectionId, address)\` returns balance docs
- **MCP**: \`verify_ownership\` tool handles full AND/OR/NOT AccessCondition evaluation
- **MCP**: \`query_balance\` tool for simple single-collection checks

### Security Considerations

- HTTPS only — proof headers can be replayed over plaintext
- Nonces should expire (30-60s recommended)
- Rate-limit the 402 endpoint to prevent nonce exhaustion
- Re-verify ownership for high-value operations (on-chain state can change between verification and delivery)
- Agents should treat signed proofs as sensitive credentials

### Use Cases

BB-402 is not limited to payments. Token ownership can represent:
- **Payment receipts**: Soulbound token costing X to mint = verifiable on-chain receipt
- **Subscriptions**: Time-bounded ownership checked at request time
- **Tiered access**: Different token ID ranges = different tiers
- **Reputation**: Non-transferable tokens from prior services
- **Prepaid credits**: Fungible token balance decremented over time
- **Blocklists**: \`mustOwnAmounts: {0, 0}\` = must NOT own
- **Compound conditions**: AND/OR nesting for complex access rules
- **Cross-chain**: Tokens on BitBadges, Ethereum, Polygon, or Solana in a single condition

### Choosing a Token Design for BB-402

The token you create IS the access policy. Different use cases call for different designs. Use this guide to pick the right one.

#### One-Time Payment (API Key Equivalent)

**Use case**: User pays once, gets permanent access. Like buying software.

**Token design**: Soulbound NFT with payment-gated mint.
- Unique token ID per user (NFT, maxSupplyPerId: "1") OR single fungible token ID
- Mint approval with coinTransfers (e.g., 10 USDC to your address)
- Non-transferable: no transfer approval at collection level + lock canUpdateCollectionApprovals
- maxNumTransfers.perInitiatedByAddressMaxNumTransfers: "1" (one mint per address)

**Why soulbound**: Prevents resale. The buyer IS the user. No replay — once minted, the token is bound to their address.

**BB-402 check**: \`mustOwnAmounts: { start: "1", end: "1" }\` on the collection.

#### Subscription (Recurring Access)

**Use case**: Monthly/yearly access that expires. Like SaaS billing.

**Token design**: Use the "Subscriptions" standard.
- standards: ["Subscriptions"]
- Single token ID with time-bounded ownership via predeterminedBalances
- Mint approval with coinTransfers for the subscription fee
- durationFromTimestamp controls subscription length (e.g., 2592000000 = 30 days in ms)
- Users re-mint to renew (each mint extends ownership time window)

**BB-402 check**: Include \`ownershipTimes\` with \`overrideWithCurrentTime: true\` — this checks ownership AT REQUEST TIME, so expired subscriptions automatically fail.

**Replay protection**: Built-in. Ownership times expire. No action needed to revoke — time handles it.

#### Tiered Access (Bronze/Silver/Gold)

**Use case**: Different access levels at different prices.

**Token design**: NFT collection with token ID ranges as tiers.
- Token IDs 1-100 = Bronze, 101-200 = Silver, 201-300 = Gold
- Separate mint approvals per tier with different coinTransfers amounts
- Each tier approval has its own approvalId

**BB-402 check**: Use \`$or\` with different token ID ranges:
\`\`\`json
{ "$or": [
  { "tokens": [{ "collectionId": "X", "tokenIds": [{"start":"201","end":"300"}] }] },
  { "tokens": [{ "collectionId": "X", "tokenIds": [{"start":"101","end":"200"}] }] },
  { "tokens": [{ "collectionId": "X", "tokenIds": [{"start":"1","end":"100"}] }] }
]}
\`\`\`
Server checks which tier matched to determine access level.

#### Prepaid Credits (Usage-Based)

**Use case**: Buy N credits, each API call consumes one. Like pay-per-use.

**Token design**: Fungible token with high supply per user.
- Single token ID, maxSupplyPerId: "0" (unlimited)
- Mint approval with coinTransfers scaled to credit cost
- Transferable (so credits can be gifted/traded) OR soulbound

**BB-402 check**: \`mustOwnAmounts: { start: "1", end: "MAX" }\` — must own at least 1.

**Credit consumption**: Server-side burn via MsgTransferTokens (send user's tokens to a burn address) after each use. Requires the user to grant an outgoing approval to the server address, OR use a claim-based approach.

**Alternative**: Skip on-chain burns entirely. Track usage off-chain, just require minimum balance as deposit/collateral.

#### Revocable Access (Admin-Controlled)

**Use case**: Admin can revoke access at any time. Like enterprise licenses.

**Token design**: Fungible or NFT with manager-controlled approvals.
- Manager retains canUpdateCollectionApprovals (NOT locked)
- Manager can add/remove mint approvals or forcefully transfer tokens
- Set noForcefulPostMintTransfers: false in invariants (allows forced transfers)
- Manager can create a "revoke" approval to pull tokens back

**BB-402 check**: Standard ownership check. Revocation = manager moves token away from user.

**Tradeoff**: Users must trust the manager. Less decentralized but necessary for compliance/enterprise.

#### Non-Transferable Pass (Soulbound)

**Use case**: Reputation, credentials, certifications. Must NOT be resellable.

**Token design**: NFT with no transfer approvals.
- Only a mint approval (fromListId: "Mint")
- NO approval with fromListId: "!Mint" or "All" (no user-to-user transfers)
- Lock canUpdateCollectionApprovals to prevent adding transfer approvals later

**Replay/transfer protection**: Guaranteed by the protocol. No transfer approval = cannot move. Period.

#### Transferable Pass (Marketplace-Friendly)

**Use case**: Event tickets, memberships that can be resold.

**Token design**: NFT with transfer approval.
- Mint approval for initial distribution
- Transfer approval: fromListId: "!Mint", toListId: "!Mint", initiatedByListId: "All"
- Optional: coinTransfers on the transfer approval = royalty on every transfer

**BB-402 check**: Standard ownership check. The current holder gets access regardless of how they got the token.

**Replay risk**: If someone transfers away their token, they lose access immediately (next BB-402 check fails). This is a feature, not a bug.

#### Blocklist / Banlist

**Use case**: Block specific addresses from your API.

**Token design**: Soulbound "ban token." Manager mints it to banned addresses.
- Manager-only mint: initiatedByListId set to manager address
- Non-transferable

**BB-402 check**: \`mustOwnAmounts: { start: "0", end: "0" }\` — must NOT own. Combine with access token via \`$and\`.

### Quick Decision Matrix

| Use Case | Token Type | Transferable? | Expiring? | Revocable? | Standard |
|----------|-----------|--------------|-----------|------------|----------|
| One-time payment | Soulbound NFT | No | No | No | - |
| Subscription | Subscription token | No | Yes (auto) | No (expires) | Subscriptions |
| Tiered access | NFT (ID ranges) | Optional | Optional | Optional | - |
| Prepaid credits | Fungible | Optional | No | Via burn | - |
| Revocable license | NFT/Fungible | No | No | Yes (manager) | - |
| Reputation/credential | Soulbound NFT | No | No | No | - |
| Resellable ticket | NFT | Yes | Optional | No | - |
| Banlist | Soulbound NFT | No | No | Yes (manager) | - |

### Anti-Replay and Security by Token Type

- **Soulbound tokens**: No replay risk. Token is bound to address, cannot be transferred to another account.
- **Transferable tokens**: Current holder = authorized user. Transfer = revoke old + grant new. Check ownership on every request.
- **Subscriptions**: Time-based expiry. Use \`overrideWithCurrentTime: true\` in ownership check. No need to revoke — it just expires.
- **Signed proofs**: Always use short-lived nonces (30-60s). A signed proof only proves ownership AT SIGNING TIME — re-verify for sensitive operations.
- **Token ID uniqueness**: For NFTs (maxSupplyPerId: "1"), each token ID can only exist once. If you need to distinguish "which specific token" a user holds, check specific ID ranges.`
  },
  {
    id: 'ai-criteria-gate',
    name: 'AI Agent as Criteria Gate',
    category: 'feature',
    description: 'Use an AI agent to verify off-chain criteria and create on-chain primitives (tokens or dynamic store entries) that other on-chain systems can reference',
    instructions: `## AI Agent as Criteria Gate

### The Pattern

AI agents are great at verifying things that can't be checked on-chain: KYC documents, social proof, reputation scores, content moderation, custom business logic. The pattern is:

1. **AI verifies off-chain** — do whatever checks you need, however you want
2. **AI creates on-chain attestation** — mint a token or add to a dynamic store
3. **On-chain systems reference it** — BB-402, approvals (mustOwnTokens), claims, anything

This turns any off-chain verification into a reusable on-chain primitive.

### Option A: Mint an NFT Attestation

Best for: permanent attestations, user-visible credentials, when you want the user to "hold" the proof.

**Setup (one-time):**
1. Create a soulbound NFT collection where only the AI agent can mint
   - Manager = AI agent's address
   - Mint approval: initiatedByListId = agent address (only agent can trigger mints)
   - No transfer approval (soulbound)
   - Lock canUpdateCollectionApprovals (immutable rules)
2. Give the agent a funded wallet (for gas)

**Per-user flow:**
\`\`\`
1. User requests verification, provides their bb1 address
2. AI agent performs off-chain check (KYC, social, reputation, etc.)
3. If passed:
   → build_transfer(collectionId, "Mint", userAddress, intent: "mint")
   → sign_and_broadcast(transaction)
4. User now holds an NFT = on-chain proof
\`\`\`

**Using the attestation:**
- BB-402: require ownership of the attestation collection
- Approval gate: mustOwnTokens referencing the attestation collection
- Claims: use token ownership plugin
- Any smart contract: check balance via EVM precompile

**Token ID strategies:**
- Single token ID (fungible-style): all attestations are equal
- Unique token ID per user: can revoke individually (agent transfers it away)
- Token ID ranges for tiers: IDs 1-100 = basic, 101-200 = premium

### Option B: Dynamic Store Entry

Best for: ephemeral/changing allowlists, when you don't need user-visible tokens, simpler setup.

**Setup (one-time):**
1. Create a claim with a dynamic store in the BitBadges developer portal
2. Note the claim ID and store ID
3. Get an API key for the agent

**Per-user flow:**
\`\`\`
1. User requests verification, provides their bb1/0x address
2. AI agent performs off-chain check
3. If passed:
   → POST to BitBadges claims API to add address to the dynamic store
   → The store now contains the user's address
4. Address is on the allowlist
\`\`\`

**Using the dynamic store:**
- Claims: dynamic store plugin checks if address is in the store
- Can be combined with other claim plugins (time limits, usage caps, etc.)
- Agent can also REMOVE addresses (revocation)

**API call to add to store:**
\`\`\`typescript
// Add address to dynamic store
await fetch('https://api.bitbadges.io/api/v0/claims/dynamic-store', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': process.env.BITBADGES_API_KEY
  },
  body: JSON.stringify({
    claimId: 'your-claim-id',
    storeId: 'your-store-id',
    action: 'add',
    values: ['bb1useraddress...']
  })
});
\`\`\`

### Option A vs Option B

| Aspect | NFT Attestation | Dynamic Store |
|--------|----------------|---------------|
| User sees it | Yes (in wallet) | No |
| On-chain proof | Yes (verifiable by anyone) | Through claims only |
| Gas cost | Per-mint transaction | Free (API call) |
| Revocation | Agent forcefully transfers (if allowed) | Agent removes from store |
| Works with BB-402 | Yes (ownership check) | Through claims |
| Works with mustOwnTokens | Yes | No |
| Setup complexity | Create collection + fund agent | Create claim + API key |
| Scalability | Gas per attestation | Unlimited (API) |

### Combining Both

The most powerful pattern: use dynamic stores for the fast/cheap allowlist, then optionally mint tokens for permanent on-chain proof.

\`\`\`
1. AI verifies user → adds to dynamic store (instant, free)
2. User can claim through the claim (dynamic store = eligibility)
3. Claim reward = mint an NFT attestation (on-chain proof)
\`\`\`

This gives you: fast verification (dynamic store), user-visible proof (NFT), and the claim system handles the minting logic.

### Security Considerations

- **Agent wallet security**: The minting agent holds a funded wallet. Protect the mnemonic/private key.
- **Rate limiting**: Limit how fast the agent can mint to prevent abuse if compromised.
- **Revocation**: If using soulbound NFTs, plan your revocation strategy upfront. Once minted, you need noForcefulPostMintTransfers: false to allow the agent to reclaim tokens.
- **Double-verification**: The on-chain token proves the AI SAID yes. It doesn't re-check the criteria. If criteria can change (e.g., reputation drops), use time-bounded ownership or periodic re-verification.
- **Multi-agent**: Multiple AI agents can share a collection — set initiatedByListId to a colon-separated list of agent addresses.`
  },
  {
    id: 'bitbadges-api',
    name: 'BitBadges API & SDK',
    category: 'feature',
    description: 'Complete guide to interacting with BitBadges programmatically — SDK, API, MCP tools, and when to use each',
    instructions: `## BitBadges API & SDK — Complete Integration Guide

### Three Ways to Interact

| Method | Best For | Setup |
|--------|----------|-------|
| **MCP Tools** | AI agents (Claude, etc.) | Add MCP server to your agent config |
| **SDK (bitbadgesjs-sdk)** | TypeScript/Node apps, bots, servers | \`npm install bitbadgesjs-sdk\` |
| **Direct HTTP** | Any language, lightweight scripts | Just HTTP requests + API key |

Use MCP tools when available — they handle validation, address conversion, and critical rules automatically. Fall back to SDK for custom logic. Use direct HTTP only when SDK isn't an option.

### API Key

Required for all methods. Get one at https://bitbadges.io/developer → API Keys tab.

Free tier: 10,000 requests/day. Paid tiers available at https://bitbadges.io/pricing.

### Reference Links

| Resource | URL |
|----------|-----|
| **OpenAPI Spec** | https://raw.githubusercontent.com/bitbadges/bitbadgesjs/main/packages/bitbadgesjs-sdk/openapi-hosted/openapi.json |
| **SDK TypeDoc** | https://bitbadges.github.io/bitbadgesjs/ |
| **SDK GitHub** | https://github.com/bitbadges/bitbadgesjs |
| **API Docs** | https://docs.bitbadges.io/for-developers/bitbadges-api/api |
| **Mainnet API** | https://api.bitbadges.io |
| **Testnet API** | https://api.bitbadges.io/testnet |
| **RPC (Cosmos)** | https://rpc.bitbadges.io |
| **RPC (EVM)** | https://evm.bitbadges.io |
| **LCD** | https://lcd.bitbadges.io |
| **Explorer** | https://explorer.bitbadges.io/BitBadges%20Mainnet |

### SDK Setup

\`\`\`typescript
import { BitBadgesAPI, BigIntify } from 'bitbadgesjs-sdk';

const api = new BitBadgesAPI({
  apiKey: process.env.BITBADGES_API_KEY,
  convertFunction: BigIntify,  // BigIntify | Numberify | Stringify
  apiUrl: 'https://api.bitbadges.io'
});
\`\`\`

### Key SDK Methods

#### Collections
\`\`\`typescript
// Get collection details (approvals, permissions, metadata, balances)
const res = await api.getCollections({
  collectionsToFetch: [{
    collectionId: '123',
    metadataToFetch: { uris: [] },
    fetchTotalAndMintBalances: true
  }]
});
const collection = res.collections[0];
// collection.collectionApprovals, collection.collectionPermissions, etc.
\`\`\`

#### Balances
\`\`\`typescript
// Check what tokens an address owns
const balance = await api.getBalanceByAddress('123', 'bb1...');
// balance.balances = [{ amount, tokenIds, ownershipTimes }]
\`\`\`

#### Ownership Verification
\`\`\`typescript
// AND/OR/NOT ownership logic — use for BB-402
const result = await api.verifyOwnershipRequirements({
  address: 'bb1...',
  assetOwnershipRequirements: {
    $and: [{
      assets: [{
        collectionId: '123',
        tokenIds: [{ start: '1', end: '1' }],
        ownershipTimes: [{ start: '1', end: '18446744073709551615' }],
        amountRange: { start: '1', end: '18446744073709551615' }
      }]
    }]
  }
});
// result.verified = true/false
\`\`\`

#### Search
\`\`\`typescript
const results = await api.getSearchResults({ searchValue: 'my token' });
// results.collections, results.accounts
\`\`\`

#### Accounts
\`\`\`typescript
const account = await api.getAccounts({
  accountsToFetch: [{ address: 'bb1...', fetchBalance: true }]
});
\`\`\`

#### Simulation
\`\`\`typescript
// Dry-run a transaction before broadcasting
const sim = await api.simulateTx({
  txs: [{
    context: { address: 'bb1...', chain: 'eth' },
    messages: [/* your messages */],
    fee: { amount: [{ denom: 'ubadge', amount: '5000' }], gas: '500000' }
  }]
});
// sim.results[0].gasUsed, sim.results[0].error
\`\`\`

#### Broadcasting
\`\`\`typescript
const result = await api.broadcastTx({
  txBytes: signedTxBytes,
  mode: 'BROADCAST_MODE_SYNC'
});
\`\`\`

### MCP Tool Equivalents

Every key SDK method has an MCP tool counterpart:

| SDK Method | MCP Tool | Extra Value |
|-----------|----------|-------------|
| \`getCollections\` | \`query_collection\` | — |
| \`getBalanceByAddress\` | \`query_balance\` | — |
| \`verifyOwnershipRequirements\` | \`verify_ownership\` | — |
| \`simulateTx\` | \`simulate_transaction\` | — |
| \`broadcastTx\` | \`broadcast\` | — |
| — | \`analyze_collection\` | Parses approvals into human-readable analysis |
| — | \`build_transfer\` | Auto-generates correct MsgTransferTokens |
| — | \`search_knowledge_base\` | Searches all embedded docs + learnings |
| — | \`diagnose_error\` | Maps error messages to fixes |
| \`getSearchResults\` | \`search\` | — |

### Address Conversion

\`\`\`typescript
import { ethToCosmos, cosmosToEth } from 'bitbadgesjs-sdk';

const bb1 = ethToCosmos('0x1234...');   // → bb1...
const eth = cosmosToEth('bb1...');       // → 0x...
\`\`\`

Or via MCP: \`convert_address({ address: "0x1234..." })\`

### Pagination

API uses bookmark-based pagination:
\`\`\`typescript
let bookmark = '';
do {
  const res = await api.getCollections({ collectionsToFetch: [...], bookmark });
  // process res.collections
  bookmark = res.bookmark;
} while (res.hasMore);
\`\`\`

### Number Handling

All numbers in BitBadges are string-encoded uint64. The SDK \`convertFunction\` controls how they're deserialized:
- \`BigIntify\`: Numbers become \`bigint\` — **recommended** for precision
- \`Numberify\`: Numbers become JS \`number\` — may lose precision on large values
- \`Stringify\`: Numbers stay as \`string\` — safest for serialization

When building transaction JSON, always use strings: \`"amount": "100"\` not \`"amount": 100\`.

### Direct HTTP (No SDK)

\`\`\`bash
# Get collection
curl -X POST https://api.bitbadges.io/api/v0/collections \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_KEY" \\
  -d '{"collectionsToFetch": [{"collectionId": "123"}]}'

# Check balance
curl -X POST https://api.bitbadges.io/api/v0/collections/123/balance/bb1... \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_KEY" \\
  -d '{}'
\`\`\`

### When to Use What

- **Building collections/tokens**: MCP builders (\`build_smart_token\`, \`build_fungible_token\`, etc.)
- **Querying data**: MCP \`query_collection\`, \`query_balance\`, or SDK equivalents
- **Understanding a collection**: MCP \`analyze_collection\` (parses approvals for you)
- **Building transfers**: MCP \`build_transfer\` (handles prioritizedApprovals automatically)
- **Verifying ownership**: MCP \`verify_ownership\` or SDK \`verifyOwnershipRequirements\`
- **Custom logic**: SDK directly — full type safety, all endpoints available
- **Non-TypeScript**: Direct HTTP with OpenAPI spec as reference`
  },
  {
    id: 'dynamic-stores',
    name: 'Dynamic Stores',
    category: 'feature',
    description: 'On-chain boolean address maps for allowlists, blocklists, and criteria gating — managed by the creator via transactions',
    instructions: `## Dynamic Stores — On-Chain Address Maps

### What Are Dynamic Stores?

A dynamic store is an **on-chain boolean map** from addresses to true/false. The creator (your address) controls all entries. Think of it as a programmable allowlist or blocklist that lives on-chain and can be referenced by other on-chain systems.

Key properties:
- **storeId**: Auto-assigned on creation — note it from the transaction response
- **creator**: Only the creator can set values, update, or delete
- **defaultValue**: What uninitialized addresses return (false = allowlist pattern, true = blocklist pattern)
- **globalEnabled**: Kill switch — set to false to disable the entire store
- **uri / customData**: Optional metadata fields

### When to Use Dynamic Stores

| Use Case | Pattern | defaultValue |
|----------|---------|-------------|
| **Allowlist** (only approved addresses) | Add approved addresses as true | false |
| **Blocklist** (block specific addresses) | Add blocked addresses as false | true |
| **KYC gate** | AI/bot verifies KYC → sets address to true | false |
| **Reputation gate** | Check reputation score → set true if passes | false |
| **Role-based access** | One store per role, add members | false |
| **Emergency halt list** | Compromised addresses set to false | true |

### Dynamic Stores vs Minting Tokens

Both can represent "this address is approved." Choose based on your needs:

| Aspect | Dynamic Store | Mint Token/NFT |
|--------|--------------|----------------|
| **Cost** | Gas per setValue tx | Gas per mint tx |
| **Revocation** | Instant — set to false | Requires burn or forceful transfer |
| **Visibility** | Not visible in user's portfolio | Shows in user's badge collection |
| **On-chain reference** | \`dynamicStoreChallenges\` in approvals | \`mustOwnTokens\` in approvals |
| **User awareness** | Silent — user may not know they're listed | Visible — user sees the badge |
| **Transferability** | N/A — tied to address | Can be soulbound or transferable |

**Rule of thumb**: Use dynamic stores for backend/operational lists. Use tokens when the user should see and potentially show off their status.

### MCP Tools

#### Build transactions:
\`\`\`
build_dynamic_store(action: "create", creator: "bb1...", defaultValue: false)
build_dynamic_store(action: "set_value", creator: "bb1...", storeId: "123", address: "bb1abc...", value: true)
build_dynamic_store(action: "batch_set_values", creator: "bb1...", storeId: "123", entries: [{address: "bb1abc...", value: true}, ...])
build_dynamic_store(action: "update", creator: "bb1...", storeId: "123", globalEnabled: false)  // kill switch
build_dynamic_store(action: "delete", creator: "bb1...", storeId: "123")
\`\`\`

#### Query data:
\`\`\`
query_dynamic_store(action: "get_store", storeId: "123")
query_dynamic_store(action: "get_value", storeId: "123", address: "bb1abc...")
query_dynamic_store(action: "list_values", storeId: "123")
query_dynamic_store(action: "list_by_creator", address: "bb1...")
\`\`\`

### Using Dynamic Stores in Approvals

Reference a dynamic store in any approval's \`dynamicStoreChallenges\`:

\`\`\`json
{
  "collectionApprovals": [{
    "approvalId": "kyc-gated-transfer",
    "fromListId": "AllWithoutMint",
    "toListId": "AllWithoutMint",
    "initiatedByListId": "AllWithoutMint",
    "transferTimes": [{"start": "1", "end": "18446744073709551615"}],
    "badgeIds": [{"start": "1", "end": "18446744073709551615"}],
    "ownershipTimes": [{"start": "1", "end": "18446744073709551615"}],
    "approvalCriteria": {
      "dynamicStoreChallenges": [{
        "storeId": "123",
        "ownershipCheckParty": "recipient"
      }]
    }
  }]
}
\`\`\`

This means: the transfer is only approved if the **recipient** has \`value: true\` in store 123. Combined with \`defaultValue: false\`, only addresses you've explicitly set to true can receive tokens.

\`ownershipCheckParty\` options:
- **"initiator"** — the address that signed the transaction
- **"sender"** — the from address
- **"recipient"** — the to address

### AI Agent Workflow

The most common pattern for AI agents:

\`\`\`
1. Create a dynamic store:
   → build_dynamic_store(action: "create", creator: agentAddress, defaultValue: false)
   → sign_and_broadcast → note storeId

2. For each user that passes your off-chain checks:
   → build_dynamic_store(action: "set_value", storeId, address: userAddress, value: true)
   → sign_and_broadcast

3. Reference the store in token approvals:
   → dynamicStoreChallenges: [{ storeId, ownershipCheckParty: "recipient" }]
   → Now only approved addresses can receive/transfer

4. To revoke:
   → build_dynamic_store(action: "set_value", storeId, address: userAddress, value: false)

5. Emergency halt:
   → build_dynamic_store(action: "update", storeId, globalEnabled: false)
   → All checks against this store now fail
\`\`\`

### Combining with Other Criteria

Dynamic store checks can be combined with other approval criteria in the same approval:
- \`mustOwnTokens\` + \`dynamicStoreChallenges\` = must own a specific token AND be in the store
- \`coinTransfers\` + \`dynamicStoreChallenges\` = must pay AND be in the store
- Multiple \`dynamicStoreChallenges\` entries = must be in ALL referenced stores`
  },
  {
    id: 'evm-precompiles',
    name: 'EVM & Precompiles',
    category: 'advanced',
    description: 'Complete guide to EVM development on BitBadges — precompile addresses, Solidity helper libraries, writing contracts that interact with the chain, EVMQueryChallenges, and critical gotchas',
    instructions: `## EVM Development on BitBadges

BitBadges is a Cosmos SDK chain with full EVM compatibility. All chain functionality (tokenization, dynamic stores, swaps, staking) is accessible from Solidity via **precompile contracts** at fixed addresses.

### Architecture

\`\`\`
Solidity Contract → calls precompile at fixed address → JSON string parameter → Cosmos module executes → result returned
\`\`\`

All custom BitBadges precompiles use **JSON string encoding** — you pass a single \`string calldata msgJson\` matching the protobuf JSON format. The caller (\`msg.sender\`) is automatically set as the transaction creator.

### Precompile Addresses

| Precompile | Address | Purpose |
|------------|---------|---------|
| **Tokenization** | \`0x0000000000000000000000000000000000001001\` | Collections, transfers, approvals, dynamic stores, metadata, voting |
| **GAMM** | \`0x0000000000000000000000000000000000001002\` | Liquidity pools: create, join, exit, swap |
| **SendManager** | \`0x0000000000000000000000000000000000001003\` | Native Cosmos coin transfers (ubadge, IBC denoms) |
| **Staking** | \`0x0000000000000000000000000000000000000800\` | Delegate, undelegate, redelegate (typed ABI params) |
| **Distribution** | \`0x0000000000000000000000000000000000000801\` | Withdraw rewards, claim (typed ABI params) |
| **ICS20** | \`0x0000000000000000000000000000000000000802\` | IBC transfers |
| **Bech32** | \`0x0000000000000000000000000000000000000400\` | Address format conversion |

### Tokenization Precompile — Key Functions

#### Transaction Functions (return types shown)
\`\`\`solidity
// Collections
createCollection(string calldata msgJson) → uint256 newCollectionId
updateCollection(string calldata msgJson) → uint256 resultCollectionId
universalUpdateCollection(string calldata msgJson) → uint256 resultCollectionId
deleteCollection(string calldata msgJson) → bool success

// Transfers
transferTokens(string calldata msgJson) → bool success

// Approvals
setIncomingApproval(string calldata msgJson) → bool success
setOutgoingApproval(string calldata msgJson) → bool success
setCollectionApprovals(string calldata msgJson) → uint256 resultCollectionId
deleteIncomingApproval(string calldata msgJson) → bool success
deleteOutgoingApproval(string calldata msgJson) → bool success
purgeApprovals(string calldata msgJson) → uint256 numPurged

// Dynamic Stores
createDynamicStore(string calldata msgJson) → uint256 storeId
updateDynamicStore(string calldata msgJson) → bool success
deleteDynamicStore(string calldata msgJson) → bool success
setDynamicStoreValue(string calldata msgJson) → bool success

// Metadata
setCollectionMetadata(string calldata msgJson) → uint256 resultCollectionId
setTokenMetadata(string calldata msgJson) → uint256 resultCollectionId
setStandards(string calldata msgJson) → uint256 resultCollectionId
setCustomData(string calldata msgJson) → uint256 resultCollectionId

// Batch
executeMultiple(MessageInput[] calldata messages) → (bool success, bytes[] memory results)

// Address Lists
createAddressLists(string calldata msgJson) → bool success

// Voting
castVote(string calldata msgJson) → bool success
\`\`\`

#### Query Functions (view)
\`\`\`solidity
getCollection(string calldata msgJson) → bytes memory
getBalance(string calldata msgJson) → bytes memory
getBalanceAmount(string calldata msgJson) → uint256   // Direct amount lookup
getTotalSupply(string calldata msgJson) → uint256     // Direct supply lookup
getCollectionStats(string calldata msgJson) → bytes memory
getAddressList(string calldata msgJson) → bytes memory
getDynamicStore(string calldata msgJson) → bytes memory
getDynamicStoreValue(string calldata msgJson) → bytes memory
getApprovalTracker(string calldata msgJson) → bytes memory
getWrappableBalances(string calldata msgJson) → uint256

// Address conversion
convertEvmAddressToBech32(address evmAddress) → string memory
convertBech32ToEvmAddress(string calldata bech32Address) → address

// Range utilities
rangeContains(uint256 start, uint256 end, uint256 value) → bool
rangesOverlap(uint256 start1, uint256 end1, uint256 start2, uint256 end2) → bool
getBalanceForIdAndTime(string calldata balancesJson, uint256 tokenId, uint256 time) → uint256
\`\`\`

### Solidity Helper Libraries

Import these from the BitBadges contracts package:

#### TokenizationHelpers — Constants and struct creators
\`\`\`solidity
import "./libraries/TokenizationHelpers.sol";

// CRITICAL CONSTANTS
uint64 constant MAX_UINT64 = type(uint64).max;  // 18446744073709551615
uint64 constant FOREVER = type(uint64).max;
uint64 constant MAX_ID = type(uint64).max;
uint64 constant MIN_ID = 1;

// Convenience creators
createUintRange(start, end) → UintRange
createFullOwnershipTimeRange() → UintRange  // {1, FOREVER}
createSingleTokenIdRange(tokenId) → UintRange
createBalance(amount, ownershipTimes, tokenIds) → Balance
createCollectionMetadataFromURI(uri) → CollectionMetadata
createTokenMetadataFromURI(uri, tokenIds) → TokenMetadata
createEmptyCollectionPermissions() → CollectionPermissions
createAlwaysPermittedActionPermission() → ActionPermission
addressToCosmosString(addr) → string  // 0x → bb1
\`\`\`

#### TokenizationJSONHelpers — Build JSON strings for precompile calls
\`\`\`solidity
import "./libraries/TokenizationJSONHelpers.sol";

transferTokensJSON(collectionId, toAddresses, amount, tokenIdsJson, ownershipTimesJson) → string
getCollectionJSON(collectionId) → string
getBalanceJSON(collectionId, userAddress) → string
getBalanceAmountJSON(collectionId, userAddress, tokenId, ownershipTime) → string
getTotalSupplyJSON(collectionId, tokenId, ownershipTime) → string
createDynamicStoreJSON(defaultValue, uri, customData) → string
setDynamicStoreValueJSON(storeId, address_, value) → string
getDynamicStoreValueJSON(storeId, userAddress) → string
uintRangeToJson(start, end) → string  // e.g., '[{"start":"1","end":"18446744073709551615"}]'
uintToString(value) → string
addressToString(addr) → string
\`\`\`

#### TokenizationWrappers — High-level wrappers (handle JSON internally)
\`\`\`solidity
import "./libraries/TokenizationWrappers.sol";

transferTokens(precompile, collectionId, toAddresses, amount, tokenIds, ownershipTimes) → bool
transferSingleToken(precompile, collectionId, to, amount, tokenId) → bool
createDynamicStore(precompile, defaultValue, uri, customData) → uint256 storeId
setDynamicStoreValue(precompile, storeId, address_, value) → bool
updateDynamicStore(precompile, storeId, defaultValue, globalEnabled, uri, customData) → bool
deleteDynamicStore(precompile, storeId) → bool
\`\`\`

#### TokenizationBuilders — Fluent builder pattern for collections
\`\`\`solidity
import "./libraries/TokenizationBuilders.sol";

CollectionBuilder memory builder = TokenizationBuilders.newCollection()
  .withValidTokenIdRange(1, 1000)
  .withManager(addressToCosmosString(address(this)))
  .withMetadataFromStrings("ipfs://...", "")
  .withDefaultBalancesFromFlags(false, false, true)  // autoApproveAllIncoming
  .withStandards(["My Standard"]);
\`\`\`

### Minimal Contract Example

\`\`\`solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./interfaces/ITokenizationPrecompile.sol";
import "./libraries/TokenizationJSONHelpers.sol";
import "./libraries/TokenizationHelpers.sol";

contract MyToken {
    ITokenizationPrecompile constant TOKENIZATION =
        ITokenizationPrecompile(0x0000000000000000000000000000000000001001);

    uint256 public collectionId;
    uint256 public kycStoreId;

    constructor() {
        // Create a KYC dynamic store (allowlist pattern)
        kycStoreId = TOKENIZATION.createDynamicStore(
            TokenizationJSONHelpers.createDynamicStoreJSON(false, "", "")
        );

        // Create a collection (contract is manager)
        // ... build collection JSON and call TOKENIZATION.createCollection(json)
    }

    function verifyAndMint(address user) external {
        // Check KYC status
        bytes memory result = TOKENIZATION.getDynamicStoreValue(
            TokenizationJSONHelpers.getDynamicStoreValueJSON(kycStoreId, user)
        );
        // ... decode and check result

        // Transfer tokens to user
        address[] memory recipients = new address[](1);
        recipients[0] = user;
        string memory tokenIds = TokenizationJSONHelpers.uintRangeToJson(1, 1);
        string memory ownershipTimes = TokenizationJSONHelpers.uintRangeToJson(1, type(uint64).max);

        TOKENIZATION.transferTokens(
            TokenizationJSONHelpers.transferTokensJSON(
                collectionId, recipients, 1, tokenIds, ownershipTimes
            )
        );
    }
}
\`\`\`

### EVMQueryChallenges — On-Chain EVM Contract Calls as Approval Criteria

You can require that a read-only EVM contract call returns a specific value as a condition for transfer approval.

\`\`\`solidity
// Helper to create EVM query challenges
createEVMQueryChallenge(contractAddress, callData, expectedResult, comparisonOperator, gasLimit)
createEVMQueryChallengeEq(contractAddress, callData, expectedResult)    // shorthand for eq
createEVMQueryChallengeGte(contractAddress, callData, minValue)         // shorthand for gte
\`\`\`

**Placeholders** (replaced at execution time):
- \`$initiator\` — address that signed the transaction
- \`$sender\` — from address of the transfer
- \`$recipient\` — to address of the transfer
- \`$collectionId\` — the collection being transferred
- \`$recipients\` — comma-separated recipients (batch transfers, invariants only)

**Comparison operators**: \`eq\`, \`ne\`, \`gt\`, \`gte\`, \`lt\`, \`lte\`

**Two placement options:**
1. **In ApprovalCriteria** → checked for EACH individual transfer
2. **In CollectionInvariants** → checked ONCE after ALL transfers in a message

Example: require that a custom ERC-20 balance check passes before allowing transfer:
\`\`\`json
{
  "approvalCriteria": {
    "evmQueryChallenges": [{
      "contractAddress": "0xYourContract",
      "calldata": "0x70a08231$recipient",
      "expectedResult": "0x0000000000000000000000000000000000000000000000000000000000000001",
      "comparisonOperator": "gte",
      "gasLimit": "100000"
    }]
  }
}
\`\`\`

### GAMM Precompile — Liquidity Pools

\`\`\`solidity
IGammPrecompile constant GAMM = IGammPrecompile(0x0000000000000000000000000000000000001002);

createPool(string memory msgJson) → uint256 poolId
joinPool(string memory msgJson) → (uint256 shareOutAmount, Coin[] memory tokenIn)
exitPool(string memory msgJson) → Coin[] memory tokenOut
swapExactAmountIn(string memory msgJson) → uint256 tokenOutAmount
\`\`\`

### SendManager Precompile — Native Coin Transfers

\`\`\`solidity
ISendManagerPrecompile constant SEND = ISendManagerPrecompile(0x0000000000000000000000000000000000001003);

// Send native Cosmos coins from Solidity
send(string memory msgJson) → bool success
// JSON: {"to_address":"bb1...","amount":[{"denom":"ubadge","amount":"1000000000"}]}
\`\`\`

### Staking & Distribution — Typed ABI (NOT JSON)

These use standard ABI parameters instead of JSON strings:
\`\`\`solidity
// Staking (0x0800) — typed params
delegate(address validatorAddress, string calldata denom, uint256 amount)
undelegate(address validatorAddress, string calldata denom, uint256 amount)
redelegate(address srcValidator, address dstValidator, string calldata denom, uint256 amount)

// Distribution (0x0801) — typed params
withdrawDelegatorReward(address validatorAddress)
claimRewards(address delegatorAddress, uint32 maxRetrieve)
\`\`\`

### Example Contracts (in bitbadgeschain/contracts/examples/)

| Contract | Pattern | Key Techniques |
|----------|---------|----------------|
| **CarbonCreditToken** | Vintage-tracked carbon credits | Multiple dynamic stores (buyers/sellers/retired), time-bounded ownership, retirement sink |
| **RealEstateSecurityToken** | Tokenized real estate | KYC + accredited + frozen registries, pausable, recovery mechanism |
| **PrivateEquityToken** | PE fund interests | Lock-up periods, ownership limits (25% max), capital calls, Reg D 506(c) |
| **TwoFactorSecurityToken** | 2FA-protected token | Dual collection (main + session tokens), nonce-based token IDs, time-limited validity |

### x/precisebank — BADGE Decimal Handling

**BADGE has DIFFERENT decimal representations in Cosmos vs EVM.**

| Denom | Decimals | Context |
|-------|----------|---------|
| **BADGE** | Display | 1 BADGE = 10^9 ubadge = 10^18 abadge |
| **ubadge** | 9 (Cosmos base) | Gas, bank sends, IBC, coinTransfers in approvals |
| **abadge** | 0 (EVM base) | Solidity msg.value, address.balance, MetaMask native display |

The \`x/precisebank\` module bridges this gap:
- **In Solidity**: \`address(this).balance\` returns abadge (18 decimals, like wei)
- **SendManager precompile**: amounts are in \`ubadge\` (Cosmos format, NOT abadge)
- **MetaMask**: shows native balance in 18-decimal format
- **Cosmos SDK/API**: all amounts in \`ubadge\` (9 decimals)

\`\`\`solidity
// In Solidity:
// 1 BADGE = 1e18 abadge (native EVM balance)
// But SendManager.send() uses ubadge amounts in JSON:
// {"to_address":"bb1...","amount":[{"denom":"ubadge","amount":"1000000000"}]}  // = 1 BADGE
\`\`\`

**IBC tokens** (USDC, ATOM, OSMO) do NOT have precisebank — they use standard Cosmos decimals only.

### Critical Gotchas

1. **uint64, NOT uint256**: All ranges (tokenIds, ownershipTimes, timestamps) use \`uint64\` internally.
   - Use \`type(uint64).max\` for "forever" — \`type(uint256).max\` causes "range overflow" errors
   - Constants: \`MAX_UINT64 = 18446744073709551615\`, \`FOREVER = MAX_UINT64\`

2. **Time is in milliseconds**: BitBadges uses ms internally. In Solidity, \`block.timestamp\` is seconds.
   - Multiply: \`block.timestamp * 1000\` when passing to BitBadges precompiles

3. **RPC endpoints are separate**:
   - EVM JSON-RPC: \`evm.bitbadges.io\` (mainnet) / \`evm-rpc-testnet.bitbadges.io\` (testnet)
   - Cosmos RPC: \`rpc.bitbadges.io\` (mainnet) / \`rpc-testnet.bitbadges.io\` (testnet)
   - Using wrong endpoint → "Method not found"

4. **msg.sender is auto-set**: Never include \`creator\` in your JSON — precompile sets it from \`msg.sender\`

5. **Dynamic Store JSON field names**: Use \`"address"\` not \`"userAddress"\`. Wrong field → "address cannot be empty"

6. **Contract size limits**: Split large contracts into multiple (see test contracts pattern)

7. **executeMultiple for batching**: Multiple tokenization calls in one tx:
   \`\`\`solidity
   MessageInput[] memory msgs = new MessageInput[](2);
   msgs[0] = MessageInput("transferTokens", transferJson1);
   msgs[1] = MessageInput("setDynamicStoreValue", storeJson);
   TOKENIZATION.executeMultiple(msgs);
   \`\`\`

8. **Chain IDs**: Mainnet EVM = 50024, Testnet EVM = 50025

### SDK Precompile Support (TypeScript)

The SDK can convert any message to a precompile call:
\`\`\`typescript
import { convertMessageToPrecompileCall } from 'bitbadgesjs-sdk';

const result = convertMessageToPrecompileCall(sdkMessage, evmAddress);
// result.precompileAddress = "0x1001"
// result.data = "0x..."  (encoded function call)
// result.functionName = "createCollection"
\`\`\``
  },
  {
    id: 'address-and-signing',
    name: 'Address Model & Signing',
    category: 'advanced',
    description: 'Complete guide to the BitBadges dual address model (0x/bb1), coin types, signing paths (Cosmos vs EVM), wallet adapters, and when to use each',
    instructions: `## BitBadges Address Model & Signing

### Dual Address Model

BitBadges supports **both** EVM (0x) and Cosmos (bb1) addresses. They represent the **same 20 bytes** — conversion is byte-level, not cryptographic.

\`\`\`
0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb  ←→  bb1wskt0xvvdfq5e2f2w7zy7lnc02a7q6lr...
Same bytes, different encoding (hex vs bech32)
\`\`\`

**Address Detection** is by prefix:
- \`0x...\` → EVM address
- \`bb1...\` → Cosmos (BitBadges) address

**Conversion Functions** (SDK):
\`\`\`typescript
import { convertToBitBadgesAddress, convertToEthAddress, getChainForAddress, isAddressValid } from 'bitbadgesjs-sdk';

convertToBitBadgesAddress("0x742d...") // → "bb1..."
convertToEthAddress("bb1wsk...")       // → "0x742d..."
getChainForAddress("0x742d...")        // → SupportedChain.ETH
getChainForAddress("bb1wsk...")        // → SupportedChain.COSMOS
isAddressValid("0x742d...")            // → true
\`\`\`

**MCP Tools**:
\`\`\`
convert_address(address: "0x742d...", toFormat: "bb1")
validate_address(address: "bb1...")
\`\`\`

### Address Derivation (from keys)

**EVM wallets** (MetaMask): \`keccak256(uncompressedPubKey)[12:]\` → 20-byte address → 0x prefix

**Cosmos wallets** (Keplr): \`ripemd160(sha256(compressedPubKey))\` → 20-byte address → bech32 "bb" prefix

**Important**: BitBadges uses **coin type 60** (Ethereum derivation path m/44'/60'/...) for ALL wallets, including Keplr. This means the same mnemonic produces the same key material regardless of wallet.

\`\`\`typescript
import { cosmosAddressFromPublicKey } from 'bitbadgesjs-sdk';

// Derive bb1 address from compressed secp256k1 public key
const bbAddress = cosmosAddressFromPublicKey(compressedPubKeyHex, 'bb');
\`\`\`

**CRITICAL**: \`convertToBitBadgesAddress()\` does NOT derive from public keys — it just re-encodes bytes. Use \`cosmosAddressFromPublicKey()\` for derivation.

### Two Signing Paths

| Aspect | Cosmos Path | EVM Path |
|--------|-------------|----------|
| **Adapter** | GenericCosmosAdapter | GenericEvmAdapter |
| **Wallets** | Keplr, Leap, Cosmostation, mnemonic, private key | MetaMask, any EIP-1193 provider |
| **Signing** | SignDirect (protobuf SignDoc) | eth_sendTransaction to precompile |
| **Account Info** | Needs accountNumber + sequence from chain | Handled by MetaMask (nonce management) |
| **Gas Estimation** | Simulation supported | Fixed gas limit (2M default) |
| **Message Format** | Proto messages in tx body | JSON string to precompile address |
| **Broadcast** | Via BitBadges API (/api/v0/broadcast) | Via MetaMask → EVM RPC |

### Cosmos Signing (GenericCosmosAdapter)

#### Browser Wallets (Keplr/Leap)
\`\`\`typescript
import { GenericCosmosAdapter, BitBadgesSigningClient } from 'bitbadgesjs-sdk';

// Connect to Keplr
const adapter = await GenericCosmosAdapter.fromKeplr('bitbadges-1');
// Or: fromLeap('bitbadges-1'), fromCosmostation('bitbadges-1')

const client = new BitBadgesSigningClient({
  adapter,
  network: 'mainnet'  // 'mainnet' | 'testnet' | 'local'
});

const result = await client.signAndBroadcast(messages, { memo: '' });
console.log(result.txHash);
\`\`\`

#### Server-Side (Mnemonic / Private Key)
\`\`\`typescript
// From mnemonic — uses Cosmos derivation (ripemd160/sha256)
const adapter = await GenericCosmosAdapter.fromMnemonic(
  'your twelve word mnemonic phrase ...',
  'bitbadges-1',  // chainId
  'bb'            // prefix
);

// From private key (hex)
const adapter = await GenericCosmosAdapter.fromPrivateKey(
  'abc123...privateKeyHex',
  'bitbadges-1'
);

const client = new BitBadgesSigningClient({ adapter, network: 'mainnet' });
const result = await client.signAndBroadcast(messages);
\`\`\`

**MCP Tool**: \`sign_and_broadcast\` uses Cosmos path internally:
\`\`\`
sign_and_broadcast(transaction: {...}, signingMethod: "mnemonic", credential: "your mnemonic...")
\`\`\`

### EVM Signing (GenericEvmAdapter)

#### Browser (MetaMask / EIP-1193)
\`\`\`typescript
import { GenericEvmAdapter, BitBadgesSigningClient } from 'bitbadgesjs-sdk';

// From MetaMask (window.ethereum)
const adapter = await GenericEvmAdapter.fromBrowserWallet({
  expectedChainId: 50024  // mainnet
});

// From ethers.js signer
const adapter = await GenericEvmAdapter.fromSigner(ethersSigner, {
  expectedChainId: 50024
});

// From any EIP-1193 provider
const adapter = await GenericEvmAdapter.fromProvider(provider);

const client = new BitBadgesSigningClient({ adapter, network: 'mainnet' });
const result = await client.signAndBroadcast(messages);
// → MetaMask popup asks user to confirm the precompile transaction
\`\`\`

#### How It Works Internally
1. SDK converts messages → precompile function calls via \`convertMessageToPrecompileCall()\`
2. If multiple tokenization messages → batched via \`executeMultiple\` on the tokenization precompile
3. Creates \`EvmTransaction\`: \`{ to: precompileAddress, data: encodedCall, value: "0" }\`
4. Sends via MetaMask's \`eth_sendTransaction\` → user confirms → EVM RPC processes it

### BitBadgesSigningClient — Unified Interface

The signing client handles both paths transparently:

\`\`\`typescript
const client = new BitBadgesSigningClient({
  adapter,           // GenericCosmosAdapter or GenericEvmAdapter
  network: 'mainnet',
  apiKey: 'your-key',            // Optional, for simulation
  gasMultiplier: 1.3,            // Cosmos only (default)
  defaultGasLimit: 400000,       // Cosmos default
  evmPrecompileGasLimit: 2000000 // EVM default
});

// These work the same regardless of adapter type:
const accountInfo = await client.getAccountInfo();
const simResult = await client.simulate(messages);
const broadcastResult = await client.signAndBroadcast(messages, { memo: 'hello' });
\`\`\`

**Network Constants:**
| Network | Cosmos Chain ID | EVM Chain ID | API URL |
|---------|----------------|-------------|---------|
| Mainnet | bitbadges-1 | 50024 | https://api.bitbadges.io |
| Testnet | bitbadges-2 | 50025 | https://api.bitbadges.io/testnet |
| Local | bitbadges-1 | 90123 | http://localhost:3001 |

### When to Use Which Path

| Scenario | Use | Why |
|----------|-----|-----|
| **AI agent / bot** | Cosmos (fromMnemonic) | Server-side, no browser needed |
| **User has MetaMask** | EVM (fromBrowserWallet) | Native MetaMask experience |
| **User has Keplr** | Cosmos (fromKeplr) | Native Cosmos wallet experience |
| **MCP sign_and_broadcast** | Cosmos (automatic) | Uses mnemonic/privateKey internally |
| **Smart contract calling precompile** | EVM (direct) | Contract is already in EVM |
| **Frontend supporting both** | Detect by wallet | Check which wallet user connected |

### Signing Internals

**Cosmos Path (under the hood):**
1. Fetch accountNumber + sequence from chain
2. Build proto messages → SignDoc (bodyBytes + authInfoBytes)
3. Hash with keccak256 (Ethermint-style, NOT sha256)
4. Sign with secp256k1 (same curve as Ethereum)
5. Public key type: \`cosmos.crypto.secp256k1.PubKey\` (NOT \`ethermint.crypto.v1.ethsecp256k1.PubKey\`)
6. Broadcast via BitBadges API

**EVM Path (under the hood):**
1. Convert messages → precompile call (JSON encoding)
2. If multiple tokenization msgs → batch with executeMultiple
3. Send \`{ to: 0x1001, data: encoded }\` via eth_sendTransaction
4. MetaMask manages nonce, gas price, signing
5. EVM RPC processes the transaction

### Common Mistakes

1. **Mixing up conversion vs derivation**: \`convertToBitBadgesAddress(0x...)\` ≠ \`cosmosAddressFromPublicKey(pubkey)\`. The first re-encodes bytes; the second derives from a key.

2. **Wrong chain ID**: MetaMask needs EVM chain ID (50024), Keplr needs Cosmos chain ID ("bitbadges-1").

3. **Assuming EVM adapter supports signDirect**: It doesn't. EVM adapters only support \`sendEvmTransaction\`. The signing client handles routing.

4. **Sequence mismatch on Cosmos path**: If you send multiple txs rapidly, sequence can get stale. The client auto-retries (up to 3 times by default).

5. **No simulation for EVM path**: Gas estimation via simulation only works for Cosmos path. EVM uses a fixed gas limit (2M default).`
  },
  {
    id: 'permissions',
    name: 'Permissions Design',
    category: 'advanced',
    description: 'Complete guide to designing permission schemes — what to lock, what to leave open, time-windowed permissions, the commitment pattern, and use-case-specific recipes',
    instructions: `## Permissions Design Guide

Permissions control what the **manager** (collection creator) can change after deployment. They are the most important trust signal in a collection — they tell users "here's what CAN and CANNOT change."

### Core Concept: Three States

Every permission exists in one of three states:

| State | Meaning | Can Change Later? | JSON |
|-------|---------|-------------------|------|
| **Forbidden** | Permanently locked — cannot ever be executed | No (irreversible) | \`[{ permanentlyPermittedTimes: [], permanentlyForbiddenTimes: [FOREVER] }]\` |
| **Permitted** | Permanently allowed — can always be executed | No (irreversible) | \`[{ permanentlyPermittedTimes: [FOREVER], permanentlyForbiddenTimes: [] }]\` |
| **Neutral** | Currently allowed, but can be changed to permitted or forbidden later | Yes | \`[]\` (empty array) |

**CRITICAL**: Once a permission is set to Permitted or Forbidden for a time range, it can NEVER be changed for that range. This is enforced on-chain. Neutral (\`[]\`) is the only flexible state.

### The 11 Collection Permissions

#### Simple Permissions (ActionPermission — time only)
| Permission | Controls | Default Recommendation |
|-----------|---------|----------------------|
| \`canDeleteCollection\` | Can the collection be deleted entirely | **Forbidden** (almost always) |
| \`canArchiveCollection\` | Can it be marked as archived | Neutral or Permitted |
| \`canUpdateStandards\` | Can protocol standards list change | Forbidden (usually set once) |
| \`canUpdateCustomData\` | Can customData JSON change | Depends on use case |
| \`canUpdateManager\` | Can the manager address change | Forbidden (prevents takeover) |
| \`canUpdateCollectionMetadata\` | Can name/description/image change | Permitted (cosmetic) |
| \`canAddMoreAliasPaths\` | Can new alias paths be added | Forbidden (for smart tokens) |
| \`canAddMoreCosmosCoinWrapperPaths\` | Can new IBC backing paths be added | Forbidden (for smart tokens) |

#### Token ID Permissions (TokenIdsActionPermission — time + token ranges)
| Permission | Controls | Default Recommendation |
|-----------|---------|----------------------|
| \`canUpdateValidTokenIds\` | Can new token IDs be created | **Forbidden** (prevents supply inflation) |
| \`canUpdateTokenMetadata\` | Can per-token metadata change | Depends (art = forbidden, dynamic = permitted) |

#### Approval Permissions (CollectionApprovalPermission — most complex)
| Permission | Controls | Default Recommendation |
|-----------|---------|----------------------|
| \`canUpdateCollectionApprovals\` | Can transfer rules change | **Forbidden** for mint approvals (prevents inflation) |

### MCP Tool: generate_permissions

\`\`\`
generate_permissions(preset: "fully-immutable")      // Everything locked
generate_permissions(preset: "manager-controlled")    // Everything open (except delete)
generate_permissions(preset: "token-locked")          // Tokens locked, metadata editable
generate_permissions(preset: "custom", customPermissions: {
  canDeleteCollection: "forbidden",
  canUpdateCollectionMetadata: "allowed",
  canUpdateCollectionApprovals: "forbidden",
  canUpdateManager: "forbidden",
  // ... etc
})
\`\`\`

### Use-Case Permission Recipes

#### 1. Immutable NFT Collection (Art, PFPs)
Users trust that nothing changes after mint.
\`\`\`
canDeleteCollection: forbidden
canArchiveCollection: forbidden
canUpdateStandards: forbidden
canUpdateCustomData: forbidden
canUpdateManager: forbidden
canUpdateCollectionMetadata: forbidden      // Even name/image frozen
canUpdateValidTokenIds: forbidden           // No new tokens ever
canUpdateTokenMetadata: forbidden           // Art is permanent
canUpdateCollectionApprovals: forbidden     // Transfer rules frozen
canAddMoreAliasPaths: forbidden
canAddMoreCosmosCoinWrapperPaths: forbidden
→ Use preset: "fully-immutable"
\`\`\`

#### 2. Managed Compliance Token (RWA, Security Tokens)
Issuer needs to update compliance rules but supply is fixed.
\`\`\`
canDeleteCollection: forbidden
canArchiveCollection: permitted             // Can archive if needed
canUpdateStandards: forbidden               // Standards set at launch
canUpdateCustomData: permitted              // Store compliance metadata
canUpdateManager: forbidden                 // Prevent hostile takeover
canUpdateCollectionMetadata: permitted      // Update descriptions
canUpdateValidTokenIds: forbidden           // Fixed supply
canUpdateTokenMetadata: permitted           // Update compliance docs per token
canUpdateCollectionApprovals: permitted     // KEY: Can update transfer restrictions
canAddMoreAliasPaths: forbidden
canAddMoreCosmosCoinWrapperPaths: forbidden
\`\`\`
**Why approvals must be permitted**: Compliance rules change — new KYC requirements, jurisdiction restrictions, freeze orders. The manager needs to update who can transfer.

#### 3. Growing NFT Collection (New tokens added over time)
Creator releases tokens in batches.
\`\`\`
canDeleteCollection: forbidden
canArchiveCollection: neutral               // Decide later
canUpdateStandards: forbidden
canUpdateCustomData: permitted
canUpdateManager: forbidden
canUpdateCollectionMetadata: permitted      // Update collection info
canUpdateValidTokenIds: permitted           // KEY: Can add new token IDs
canUpdateTokenMetadata: permitted           // New tokens need metadata
canUpdateCollectionApprovals: forbidden     // Mint rules frozen at launch
canAddMoreAliasPaths: forbidden
canAddMoreCosmosCoinWrapperPaths: forbidden
\`\`\`

#### 4. Smart Token / Stablecoin
Backing path is immutable, but metadata can update.
\`\`\`
canDeleteCollection: forbidden
canArchiveCollection: forbidden
canUpdateStandards: forbidden
canUpdateCustomData: permitted
canUpdateManager: forbidden
canUpdateCollectionMetadata: permitted
canUpdateValidTokenIds: forbidden           // Single token ID
canUpdateTokenMetadata: forbidden           // Stable display
canUpdateCollectionApprovals: forbidden     // Backing/unbacking rules frozen
canAddMoreAliasPaths: forbidden             // KEY: No new alias paths
canAddMoreCosmosCoinWrapperPaths: forbidden // KEY: No new backing paths
\`\`\`

#### 5. Subscription Token
Subscriptions may need price/duration updates.
\`\`\`
canDeleteCollection: forbidden
canArchiveCollection: permitted
canUpdateStandards: forbidden
canUpdateCustomData: permitted
canUpdateManager: forbidden
canUpdateCollectionMetadata: permitted
canUpdateValidTokenIds: forbidden
canUpdateTokenMetadata: permitted           // Update subscription description
canUpdateCollectionApprovals: permitted     // KEY: Update pricing, limits
canAddMoreAliasPaths: forbidden
canAddMoreCosmosCoinWrapperPaths: forbidden
\`\`\`

#### 6. AI Agent Attestation Collection
AI mints tokens to verified users. Rules should be locked.
\`\`\`
canDeleteCollection: forbidden
canArchiveCollection: forbidden
canUpdateStandards: forbidden
canUpdateCustomData: permitted              // Agent can store config
canUpdateManager: forbidden                 // Agent address is permanent
canUpdateCollectionMetadata: permitted
canUpdateValidTokenIds: forbidden
canUpdateTokenMetadata: forbidden           // Attestation metadata is permanent
canUpdateCollectionApprovals: forbidden     // Mint rules frozen
canAddMoreAliasPaths: forbidden
canAddMoreCosmosCoinWrapperPaths: forbidden
\`\`\`

### Advanced: Scoped Approval Permissions

\`canUpdateCollectionApprovals\` is the most powerful permission because it's scoped. You can lock SOME approvals while leaving others updatable.

**approvalId field values:**
- \`"All"\` — matches all approvals
- \`"specific-id"\` — matches only that approval
- Combine with fromListId, toListId, etc. for surgical control

**Example: Lock mint approval, allow transfer approval updates**
\`\`\`json
{
  "canUpdateCollectionApprovals": [
    {
      "fromListId": "Mint",
      "toListId": "All",
      "initiatedByListId": "All",
      "transferTimes": [{"start": "1", "end": "18446744073709551615"}],
      "tokenIds": [{"start": "1", "end": "18446744073709551615"}],
      "ownershipTimes": [{"start": "1", "end": "18446744073709551615"}],
      "approvalId": "All",
      "permanentlyPermittedTimes": [],
      "permanentlyForbiddenTimes": [{"start": "1", "end": "18446744073709551615"}]
    },
    {
      "fromListId": "AllWithoutMint",
      "toListId": "AllWithoutMint",
      "initiatedByListId": "All",
      "transferTimes": [{"start": "1", "end": "18446744073709551615"}],
      "tokenIds": [{"start": "1", "end": "18446744073709551615"}],
      "ownershipTimes": [{"start": "1", "end": "18446744073709551615"}],
      "approvalId": "All",
      "permanentlyPermittedTimes": [{"start": "1", "end": "18446744073709551615"}],
      "permanentlyForbiddenTimes": []
    }
  ]
}
\`\`\`
This locks all mint-related approvals but allows the manager to update non-mint transfer approvals. This is the **recommended pattern for compliance tokens** — supply is fixed but transfer rules can evolve.

### Advanced: Time-Windowed Permissions

You can create permissions that are only active during specific time windows:

\`\`\`json
{
  "canUpdateCollectionMetadata": [{
    "permanentlyPermittedTimes": [{"start": "1", "end": "1735689600000"}],
    "permanentlyForbiddenTimes": [{"start": "1735689600001", "end": "18446744073709551615"}]
  }]
}
\`\`\`
This allows metadata updates until Jan 1 2025, then locks it permanently. Useful for: launch periods, migration windows, seasonal updates.

### The Commitment Pattern

Permissions are BitBadges' answer to "how do I trust this collection?"

**For users**: Check permissions before interacting. If \`canUpdateCollectionApprovals\` is forbidden, transfer rules can never change. If \`canUpdateValidTokenIds\` is forbidden, no new tokens can be created (no inflation).

**For creators**: Lock permissions to signal trust. The more you lock, the more users trust your collection. Start with what you need open, and progressively lock as the collection matures.

**Progressive locking strategy**:
1. Launch with permissions neutral (\`[]\`)
2. Configure and test the collection
3. Lock permissions one by one as you're confident they're correct
4. Each lock is a permanent commitment — this builds trust over time

### User-Level Permissions

Users also have permissions on their own balances:

| Permission | Controls |
|-----------|---------|
| \`canUpdateOutgoingApprovals\` | Can user change who they approve to send their tokens |
| \`canUpdateIncomingApprovals\` | Can user change who they approve to send tokens to them |
| \`canUpdateAutoApproveSelfInitiatedOutgoingTransfers\` | Can user toggle auto-approve for self-initiated outgoing |
| \`canUpdateAutoApproveSelfInitiatedIncomingTransfers\` | Can user toggle auto-approve for self-initiated incoming |
| \`canUpdateAutoApproveAllIncomingTransfers\` | Can user toggle auto-approve for all incoming |

These are set in \`defaultBalances.userPermissions\` and apply to every address.

### Common Mistakes

1. **Leaving canUpdateCollectionApprovals permitted for mint-from approvals**: This means the manager can create new mint approvals at any time = unlimited inflation. Always lock mint approval permissions.

2. **Forgetting canUpdateValidTokenIds**: If permitted, manager can add new token IDs = supply inflation even if mint approvals are locked (because new token IDs mean new supply ranges).

3. **Locking everything on day 1**: If you lock \`canUpdateCollectionMetadata\` and have a typo in the name, it's permanent. Use the progressive locking strategy.

4. **Not including tokenIds in TokenIdsActionPermission**: \`canUpdateValidTokenIds\` and \`canUpdateTokenMetadata\` REQUIRE the \`tokenIds\` field. Missing it causes validation errors.

5. **Empty array vs object with empty arrays**: Neutral = \`[]\` (empty array). Don't use \`[{ permanentlyPermittedTimes: [], permanentlyForbiddenTimes: [] }]\` — that's treated differently than \`[]\`.

6. **First-match policy**: Permission arrays are evaluated in order. Only the FIRST matching entry applies. Put more specific rules before general ones.`
  },
  {
    id: 'collection-audit',
    name: 'Collection Audit',
    category: 'advanced',
    description: 'Comprehensive audit checklist for BitBadges collections — identifies security risks, design flaws, centralization concerns, supply inflation vectors, forceful transfer risks, and common bugs. Use audit_collection tool after every build.',
    instructions: `## Collection Audit Guide

**MANDATORY WORKFLOW**: After generating any collection with build_nft_collection, build_fungible_token, or build_smart_token, ALWAYS run \`audit_collection\` on the result before presenting to the user. Print all findings.

### Quick Start
\`\`\`
Step 1: Build → build_nft_collection / build_fungible_token / build_smart_token
Step 2: Audit → audit_collection(collection: result.transaction, context: "nft art collection")
Step 3: Fix   → Address any critical/warning findings
Step 4: Re-audit → Verify fixes resolved the issues
Step 5: Deploy → validate_transaction → simulate_transaction → sign_and_broadcast
\`\`\`

### What the Audit Checks

The \`audit_collection\` tool performs 9 categories of checks:

#### 1. Manager & Centralization
- Who is the manager? Can the manager address be changed?
- Which permissions are NEUTRAL (undecided) vs locked?
- How much control does the manager retain post-deployment?

**Key risk**: A manager with PERMITTED or NEUTRAL \`canUpdateCollectionApprovals\` can change ANY transfer rule at any time, including adding unlimited mint approvals.

#### 2. Supply Control & Inflation
- Can new token IDs be created? (\`canUpdateValidTokenIds\`)
- Is there a per-ID supply cap? (\`maxSupplyPerId\` invariant)
- Can mint approvals be modified? (scoped \`canUpdateCollectionApprovals\`)

**Supply inflation vectors** (must ALL be blocked for fixed supply):
| Vector | Permission to Lock |
|--------|-------------------|
| Add new token IDs | \`canUpdateValidTokenIds\` → FORBIDDEN |
| Add/modify mint approvals | \`canUpdateCollectionApprovals\` → FORBIDDEN (for fromListId: "Mint") |
| Unlimited existing mint approval | Add \`approvalAmounts\` or \`maxNumTransfers\` to cap |

#### 3. Approval Analysis
For each approval, the audit checks:
- **Mint approvals**: Must have \`overridesFromOutgoingApprovals: true\`
- **Unlimited mints**: Missing \`approvalAmounts\`, \`maxNumTransfers\`, AND \`predeterminedBalances\` = infinite supply
- **Backing approvals**: Must have \`mustPrioritize: true\`, must NOT have \`overridesFromOutgoingApprovals\`
- **Public mints**: \`initiatedByListId: "All"\` + \`toListId: "All"\` = anyone can mint

#### 4. Special Address Combinations
Certain from/to combinations are red flags:

| From | To | Risk |
|------|----|------|
| Mint | Mint | No-op: tokens created and immediately burned |
| All | * (with All initiator) | Forceful seizure: anyone can move anyone's tokens |
| * | Mint (no backing) | Burn mechanism: tokens sent to Mint are destroyed |
| Backing addr | Backing addr | Self-transfer on backing address (no-op) |

#### 5. Transferability & Revokability
- **noForcefulPostMintTransfers invariant**: If false, approvals with \`fromListId: "All"\` + \`initiatedByListId: "All"\` allow forceful seizure
- **No transfer approval** = soulbound (non-transferable) — intentional or bug?
- **requireToEqualsInitiatedBy**: Prevents third-party-initiated transfers

**Forceful revocation pattern** (DANGEROUS unless intentional):
\`\`\`
fromListId: "All"           // From anyone
toListId: "some-address"    // To a specific address (e.g., manager)
initiatedByListId: "All"    // Anyone can trigger
→ This lets ANYONE move tokens from ANY holder to the target address
\`\`\`

#### 6. Invariants
- \`noCustomOwnershipTimes\`: Should be true for most collections (simpler model)
- \`maxSupplyPerId\`: "1" for NFTs, appropriate cap for fungibles, "0" = unlimited
- \`noForcefulPostMintTransfers\`: Should be true unless forceful transfers are intentional
- \`disablePoolCreation\`: Should be true unless liquidity pools are intended
- \`cosmosCoinBackedPath\`: Must match backing address in approvals for smart tokens

#### 7. Metadata & Standards
- Placeholder URIs (\`ipfs://METADATA_*\`) need real IPFS uploads before deploy
- Approval metadata image MUST be empty string ("")
- Token metadata entries MUST include \`tokenIds\` array
- Standards consistency: "NFTs" needs \`maxSupplyPerId: "1"\`, "Fungible Tokens" needs single token ID

#### 8. Serialization
- ALL numeric values must be strings: \`"100"\` not \`100\`
- UintRange requires both \`start\` and \`end\` as strings
- This catches the #1 most common BitBadges bug

#### 9. Default Balances
- \`autoApproveAllIncomingTransfers: true\` needed for any collection with mint approvals
- Without this, recipients CANNOT receive minted tokens (silent failure)

### Risk Matrix by Collection Type

| Collection Type | Must Lock | Should Lock | Can Leave Open |
|----------------|-----------|-------------|----------------|
| **Immutable NFT** | All 11 permissions | — | — |
| **Art NFT** | delete, standards, validTokenIds, approvals, manager | tokenMetadata | collectionMetadata, customData |
| **Fungible Token** | delete, validTokenIds, approvals, manager | standards | metadata, customData |
| **Smart Token** | delete, approvals, aliasPaths, wrapperPaths, manager | validTokenIds, standards | metadata, customData |
| **Subscription** | delete, validTokenIds, manager | standards | approvals (pricing), metadata |
| **Compliance/RWA** | delete, validTokenIds, manager | standards | approvals (rules), metadata, customData |
| **AI Attestation** | delete, validTokenIds, approvals, manager | tokenMetadata | customData, collectionMetadata |

### Common Design Flaws

1. **"Fixed supply" with unlocked mint approvals**: Locking \`canUpdateValidTokenIds\` is NOT enough. If \`canUpdateCollectionApprovals\` is open, the manager can add new mint approvals for existing token IDs.

2. **Soulbound but missing transfer approval on purpose**: If non-transferable is intentional, document it in standards. If accidental, add a \`free-transfer\` approval.

3. **Manager can update approvals + has mint approval = infinite mint**: The combination of PERMITTED/NEUTRAL \`canUpdateCollectionApprovals\` + existing mint approval means the manager can remove supply caps at any time.

4. **Missing autoApproveAllIncomingTransfers**: The single most common deployment bug. Collection deploys successfully but nobody can receive tokens.

5. **Backing approval with overridesFromOutgoingApprovals**: Backing addresses are system addresses — they don't have outgoing approval settings. Adding this flag can cause unexpected behavior.

6. **Forceful transfer approval without noForcefulPostMintTransfers**: If the invariant isn't set, a \`fromListId: "All"\` approval allows token seizure.

7. **No supply cap on fungible mint**: Fungible tokens with \`totalSupply: "0"\` and no \`approvalAmounts.overallApprovalAmount\` have effectively infinite supply.

8. **Approval ID collisions**: Two approvals with the same \`approvalId\` cause tracking conflicts. Each approval must have a unique ID.

### Presenting Audit Results

When showing audit results to users, format as:

\`\`\`
## Collection Audit Results

**Verdict**: [CRITICAL / WARNING / PASS]

### Critical Issues (must fix)
- [finding title]: [detail] → [recommendation]

### Warnings (should review)
- [finding title]: [detail] → [recommendation]

### Info (for awareness)
- [finding title]: [detail]

### Permission Summary
| Permission | State |
|-----------|-------|
| canDeleteCollection | FORBIDDEN |
| ... | ... |

### Approval Summary
- public-mint: Mint -> All (by All) [overrides-outgoing, predetermined]
- free-transfer: !Mint -> All (by All)
\`\`\`

Always explain findings in plain language. For each critical/warning finding, explain:
1. What the risk is in user terms (not just technical)
2. Whether it might be intentional for their use case
3. Exactly how to fix it`
  },
  {
    id: 'explain-collection',
    name: 'Explain Collection',
    category: 'advanced',
    description: 'Generate human-readable explanations of any BitBadges collection. Answer user questions about what a collection does, how to interact with it, what the manager can change, and what the risks are.',
    instructions: `## Explain Collection Guide

Use the \`explain_collection\` tool to generate plain-language reports for any collection.

### Tool Usage

\`\`\`
// Full report
explain_collection(collection: txOrQueryResult, audience: "user")

// Answer a specific question
explain_collection(collection: txOrQueryResult, question: "can the manager freeze my tokens?")

// Developer-focused report (includes approval IDs, flags, custom data)
explain_collection(collection: txOrQueryResult, audience: "developer")

// Auditor-focused report (includes scoped permission details)
explain_collection(collection: txOrQueryResult, audience: "auditor")
\`\`\`

### Input Formats

The tool accepts any of these formats — it auto-detects the structure:

1. **Build result**: \`{ transaction: { messages: [...] } }\` — directly from build_nft_collection etc.
2. **Raw message**: \`{ typeUrl: "...", value: {...} }\` — a single MsgUniversalUpdateCollection
3. **On-chain query**: The result from query_collection — handles timeline fields (collectionMetadataTimeline, managerTimeline, etc.) and validBadgeIds

### What the Report Covers

The full report has 6 sections:

1. **Overview**: Collection type, token count, max supply, standards, plain-language description
2. **How to Get Tokens**: Every mint/deposit approval explained with costs, limits, and requirements
3. **Transferability**: Transfer approvals, fees, forceful transfer warnings, soulbound detection
4. **Permissions (What Can the Manager Change?)**: All 11 permissions in a table with plain-language meanings, trust score
5. **Safety Guarantees**: On-chain invariants (supply caps, no forceful transfers, etc.)
6. **Risk Summary**: Trust signals and risk flags with severity levels

### Answering Questions

When a user asks a question about a collection, pass it as the \`question\` parameter. The tool handles common question types:

| Question Keywords | Maps To |
|-------------------|---------|
| supply, inflation, fixed, how many | Supply analysis |
| transfer, send, move, tradeable | Transferability section |
| mint, get, obtain, buy, acquire | How to get tokens |
| manager, admin, control, owner | Permissions table |
| freeze, seize, revoke, confiscate | Forceful transfer analysis |
| permission, immutable, locked, trust | Permissions + trust summary |
| risk, safe, secure, rug, scam | Risk summary |

### When to Use

- **After building a collection**: Run explain_collection to show the user what they built in plain English
- **When a user asks "what does this collection do?"**: Pass the on-chain data
- **When evaluating a collection before interacting**: Generate a report before minting/depositing
- **BB-402 context**: When a 402 response requires ownership, explain the collection so the user understands what they need

### Workflow: Explain → Audit → Deploy

For new collections, combine explain_collection with audit_collection:

\`\`\`
1. Build → build_nft_collection(...)
2. Explain → explain_collection(result.transaction, audience: "user")
   → Show the user what they built
3. Audit → audit_collection(result.transaction, context: "nft art")
   → Show any issues
4. Fix → Address findings
5. Deploy → validate → simulate → sign_and_broadcast
\`\`\`

### Audience Modes

- **"user"** (default): Non-technical language, focuses on "what can happen to my tokens?"
- **"developer"**: Adds approval IDs, flags, custom data, technical details
- **"auditor"**: Adds scoped permission breakdown, raw approval analysis

### Tips for Presenting Results

1. Always lead with the collection type and purpose
2. For permission tables, highlight anything that's OPEN or UNDECIDED
3. For risks, explain in terms of "what could happen to your tokens"
4. If the trust score is low (< 5 permissions locked), explicitly warn the user
5. For questions, give a direct yes/no first, then explain why`
  },
  {
    id: 'update-collection',
    name: 'Update Existing Collection',
    category: 'advanced',
    description: 'How to update an existing collection — which fields need update flags, what permissions allow, partial updates, and common update patterns',
    instructions: `## Updating an Existing Collection

Creating and updating both use \`MsgUniversalUpdateCollection\`. The difference:
- **Create**: \`collectionId: "0"\` (auto-assigns new ID)
- **Update**: \`collectionId: "123"\` (the actual collection ID)

### The Update Flag Pattern

Every updatable field has a corresponding \`update*: true\` flag. **Only fields with their flag set to \`true\` are changed.** Fields with \`false\` (or omitted) are LEFT UNCHANGED.

| Field | Update Flag | What It Changes |
|-------|-------------|-----------------|
| \`validTokenIds\` | \`updateValidTokenIds\` | Which token IDs exist |
| \`collectionPermissions\` | \`updateCollectionPermissions\` | Permission locks |
| \`manager\` | \`updateManager\` | Manager address |
| \`collectionMetadata\` | \`updateCollectionMetadata\` | Name, description, image |
| \`tokenMetadata\` | \`updateTokenMetadata\` | Per-token metadata |
| \`customData\` | \`updateCustomData\` | Custom JSON data |
| \`collectionApprovals\` | \`updateCollectionApprovals\` | Transfer/mint rules |
| \`standards\` | \`updateStandards\` | Protocol standards list |
| \`isArchived\` | \`updateIsArchived\` | Archived status |

**CRITICAL**: When you set \`updateCollectionApprovals: true\`, the NEW approvals array COMPLETELY REPLACES the old one. There is no "append" — you must include ALL approvals you want to keep plus any new ones.

Same for \`updateCollectionPermissions\` — the new permissions object replaces the old one entirely.

### Permission Checks

Before updating, the chain checks if the corresponding permission ALLOWS the update:

| Update Flag | Permission Checked |
|-------------|-------------------|
| \`updateValidTokenIds\` | \`canUpdateValidTokenIds\` |
| \`updateCollectionPermissions\` | (always allowed — permissions can only be made MORE restrictive) |
| \`updateManager\` | \`canUpdateManager\` |
| \`updateCollectionMetadata\` | \`canUpdateCollectionMetadata\` |
| \`updateTokenMetadata\` | \`canUpdateTokenMetadata\` |
| \`updateCustomData\` | \`canUpdateCustomData\` |
| \`updateCollectionApprovals\` | \`canUpdateCollectionApprovals\` |
| \`updateStandards\` | \`canUpdateStandards\` |
| \`updateIsArchived\` | \`canArchiveCollection\` |

If the permission is FORBIDDEN, the update will be rejected on-chain.

**Special rule for permissions**: You can always update permissions to be MORE restrictive (e.g., neutral → forbidden). You CANNOT make permissions LESS restrictive (e.g., forbidden → permitted is impossible).

### Common Update Patterns

#### 1. Update Collection Metadata (name/description/image)
\`\`\`json
{
  "typeUrl": "/tokenization.MsgUniversalUpdateCollection",
  "value": {
    "creator": "bb1manager...",
    "collectionId": "123",
    "updateCollectionMetadata": true,
    "collectionMetadata": { "uri": "ipfs://NEW_METADATA_URI", "customData": "" },
    "updateValidTokenIds": false,
    "updateCollectionPermissions": false,
    "updateManager": false,
    "updateTokenMetadata": false,
    "updateCustomData": false,
    "updateCollectionApprovals": false,
    "updateStandards": false,
    "updateIsArchived": false,
    "mintEscrowCoinsToTransfer": [],
    "invariants": {},
    "aliasPathsToAdd": [],
    "cosmosCoinWrapperPathsToAdd": []
  }
}
\`\`\`

#### 2. Lock Permissions (Progressive Locking)
\`\`\`json
{
  "creator": "bb1manager...",
  "collectionId": "123",
  "updateCollectionPermissions": true,
  "collectionPermissions": {
    "canUpdateCollectionMetadata": [{
      "permanentlyPermittedTimes": [],
      "permanentlyForbiddenTimes": [{"start": "1", "end": "18446744073709551615"}]
    }]
  }
}
\`\`\`
Note: You only need to include the permissions you want to CHANGE. Omitted permissions stay as-is (because the chain merges permission updates — permissions can only become more restrictive).

Actually — **CORRECTION**: permissions are REPLACED entirely. You must re-include ALL permissions, not just changed ones. Query the collection first to get current permissions, modify what you need, and send the full set.

#### 3. Add a New Approval (e.g., add transfer approval to soulbound collection)
\`\`\`
Step 1: query_collection(collectionId) → get current approvals
Step 2: Append new approval to the existing array
Step 3: Send update with updateCollectionApprovals: true and the FULL approvals array
\`\`\`

#### 4. Archive a Collection
\`\`\`json
{
  "creator": "bb1manager...",
  "collectionId": "123",
  "updateIsArchived": true,
  "isArchived": true
}
\`\`\`

### MCP Workflow for Updates

\`\`\`
Step 1: query_collection(collectionId) → get current state
Step 2: Identify what to change
Step 3: Build the update message (only set update flags for changed fields)
Step 4: For approval/permission changes, include the FULL replacement array
Step 5: audit_collection(updatedCollection) → check for issues
Step 6: validate_transaction → simulate_transaction → sign_and_broadcast
\`\`\`

### Smart Token Update Restrictions

Collections with \`cosmosCoinBackedPath\` have an automatic restriction: the chain prepends a permission entry that FORBIDS all Mint-address approvals. This means:
- You cannot add traditional mint approvals to smart token collections
- All token creation must go through the backing address approval
- This is enforced by \`ensureMintForbiddenPermission()\` in the keeper

### Common Mistakes

1. **Forgetting that approvals REPLACE, not append**: If you set \`updateCollectionApprovals: true\` with only 1 approval, all other existing approvals are DELETED.

2. **Trying to update a FORBIDDEN field**: If \`canUpdateCollectionMetadata\` is FORBIDDEN, any update with \`updateCollectionMetadata: true\` will fail. Query permissions first.

3. **Not including all update flags**: Even flags set to \`false\` should be included for clarity. Omitted flags default to \`false\`.

4. **Trying to relax permissions**: You cannot change FORBIDDEN → PERMITTED or FORBIDDEN → NEUTRAL. Permissions only ratchet toward more restrictive.

5. **Updating wrong collection ID**: Double-check the collection ID. There's no undo for updates.`
  },
  {
    id: 'collection-recipes',
    name: 'Collection Design Recipes',
    category: 'feature',
    description: 'Architecture decision guide — which collection type, approvals, and permissions to use for common use cases like loyalty programs, access passes, memberships, wrapped assets, and more',
    instructions: `## Collection Design Recipes

When a user describes what they want to build, use this guide to choose the right architecture.

### Decision Matrix

| Use Case | Collection Type | Token IDs | Supply | Transferable | Key Approvals | Key Permissions |
|----------|----------------|-----------|--------|-------------|---------------|-----------------|
| **Art/PFP NFTs** | NFT | Many (1 per artwork) | 1 per ID | Yes | public-mint + free-transfer | All locked |
| **Event Tickets** | NFT | 1 per event seat | 1 per ID | Optional | manager-mint or public-mint | Lock mint approvals |
| **Loyalty Points** | Fungible | 1 | Unlimited | Optional | manager-mint | Manager controls approvals |
| **Access Pass** | NFT or Fungible | 1 | 1 per user | No (soulbound) | manager-mint | Lock everything |
| **Membership** | Subscription | 1 | Unlimited | No | subscription-mint | Pricing can update |
| **Wrapped Asset** | Smart Token | 1 | Unlimited (1:1 backed) | Yes | backing + unbacking | Lock all |
| **Governance Token** | Fungible | 1 | Fixed cap | Yes | public-mint + free-transfer | Lock supply |
| **Achievement Badges** | NFT | Many (1 per achievement) | 1 per ID | No (soulbound) | manager-mint per badge | Lock mint approvals |
| **Gift Cards** | Fungible | 1 | Mint-on-demand | Yes | manager-mint + free-transfer | Manager controls mint |
| **Paywall Token** | NFT or Fungible | 1 | Unlimited | No (soulbound) | public-mint (paid) | Lock approvals |
| **Allowlist/Blocklist** | Dynamic Store | N/A | N/A | N/A | N/A | N/A |
| **AI Agent Vault** | Smart Token | 1 | Unlimited (backed) | No | backing + unbacking | Lock all, AI in customData |

### Recipe Details

#### Art/PFP NFTs
\`\`\`
Tool: build_nft_collection
Standards: ["NFTs", "Tradable", "DefaultDisplayCurrency:ubadge"]
Invariants: maxSupplyPerId: "1", noForcefulPostMintTransfers: true
Approvals: public-mint (with predeterminedBalances for sequential), free-transfer
Permissions: Everything FORBIDDEN except collectionMetadata (if you want to update description)
\`\`\`

#### Event Tickets
\`\`\`
Tool: build_nft_collection (not tradable)
Standards: ["NFTs"]
Invariants: maxSupplyPerId: "1"
Approvals: manager-mint only (initiatedByListId: manager address), optionally free-transfer
Permissions: Lock mint approvals, optionally lock transfers
Tip: Use mustOwnTokens to gate entry — verify_ownership at the door
\`\`\`

#### Loyalty Points (Earn & Burn)
\`\`\`
Tool: build_fungible_token (totalSupply: "0" for unlimited)
Standards: ["Fungible Tokens"]
Approvals: manager-mint (only manager can award points), optionally free-transfer
Permissions: Manager controls approvals (can adjust earning rules), lock delete/manager
Tip: Use coinTransfers in a burn approval to let users redeem points for rewards
\`\`\`

#### Access Pass / Paywall Token (BB-402 Gating)
\`\`\`
Tool: build_fungible_token or build_nft_collection
Standards: ["Fungible Tokens"] or ["NFTs"]
Approvals: public-mint (with coinTransfers for paid access), NO transfer approval (soulbound)
Permissions: Lock everything — immutable access rules
Tip: Use with BB-402 protocol for HTTP token gating. get_skill_instructions("bb-402")
\`\`\`

#### Membership / Subscription
\`\`\`
Tool: Manual build with get_skill_instructions("subscription")
Standards: ["Subscriptions"]
Token IDs: Just 1 (start: "1", end: "1")
Approvals: Subscription approval with recurringOwnershipTimes for renewal
Permissions: Leave approvals PERMITTED if pricing may change
Tip: predeterminedBalances with chargePeriodLength for auto-renewal
\`\`\`

#### Wrapped Asset / Stablecoin
\`\`\`
Tool: build_smart_token
Standards: ["Smart Token", "Fungible Tokens"]
Approvals: backing (deposit) + unbacking (withdrawal) — both with mustPrioritize + allowBackedMinting
Permissions: Lock everything for trustless vault
Invariants: cosmosCoinBackedPath with IBC denom, noForcefulPostMintTransfers: true
Tip: Add dailyWithdrawLimit for risk management
\`\`\`

#### Governance Token (Fixed Supply)
\`\`\`
Tool: build_fungible_token (totalSupply: "1000000", transferable: true, swappable: true)
Standards: ["Fungible Tokens", "Liquidity Pools"]
Approvals: public-mint (with overallApprovalAmount = totalSupply), free-transfer
Permissions: Lock EVERYTHING — supply must be provably fixed
Invariants: maxSupplyPerId: totalSupply
Tip: Use mustOwnTokens in other collections to gate governance actions
\`\`\`

#### Achievement Badges (Soulbound NFTs)
\`\`\`
Tool: build_nft_collection (no tradable flag)
Standards: ["NFTs"]
Approvals: manager-mint only (initiatedByListId: manager address), NO transfer approval
Permissions: Lock everything
Tip: Use dynamic stores to track who qualifies, then mint via AI agent or backend
\`\`\`

#### AI Agent Attestation
\`\`\`
Tool: build_nft_collection or build_fungible_token
Standards: ["NFTs"] or ["Fungible Tokens"]
Approvals: manager-mint (initiatedByListId: agent's bb1 address)
Permissions: Lock everything — agent address is permanent
customData: JSON with agent config, criteria description
Tip: get_skill_instructions("ai-criteria-gate") for full pattern
\`\`\`

### Quick Reference: Which Builder Tool?

| If they say... | Use |
|---------------|-----|
| NFT, art, PFP, collectible, badge, ticket, achievement | \`build_nft_collection\` |
| token, points, coin, currency, fungible, ERC-20 | \`build_fungible_token\` |
| stablecoin, wrapped, vault, backed, deposit/withdraw | \`build_smart_token\` |
| subscription, membership, recurring, renewal | Manual build with \`get_skill_instructions("subscription")\` |
| allowlist, blocklist, KYC list, whitelist | \`build_dynamic_store\` (not a collection) |
| paywall, access, gate, BB-402 | \`build_fungible_token\` or \`build_nft_collection\` + BB-402 |

### After Choosing Architecture

Always follow the full pipeline:
1. **Build** → appropriate builder tool
2. **Audit** → \`audit_collection\` (catch supply/permission issues)
3. **Explain** → \`explain_collection\` (show user what they built)
4. **Validate** → \`validate_transaction\`
5. **Simulate** → \`simulate_transaction\`
6. **Deploy** → \`sign_and_broadcast\``
  },
  {
    id: 'ibc-and-hooks',
    name: 'IBC & Custom Hooks',
    category: 'advanced',
    description: 'Brief guide to IBC on BitBadges — how IBC tokens arrive, custom hooks, Interchain Queries (ICQ), and how smart tokens interact with IBC. Defers to Cosmos IBC docs for protocol-level details.',
    instructions: `## IBC on BitBadges

BitBadges is a Cosmos SDK chain with full IBC (Inter-Blockchain Communication) support. This guide covers BitBadges-specific IBC behavior. For IBC protocol fundamentals, see the [Cosmos IBC docs](https://ibc.cosmos.network/main/ibc/overview).

### How IBC Tokens Arrive

Standard ICS-20 (fungible token transfer) flow:
1. User sends tokens on source chain (e.g., USDC on Noble, ATOM on Cosmos Hub)
2. Relayer picks up the packet and delivers to BitBadges
3. BitBadges IBC module creates an \`ibc/HASH\` denom representing the token
4. Tokens land in the user's Cosmos bank account (standard \`x/bank\` balance)

**IBC denoms are deterministic**: The hash is derived from the port/channel/denom path. Same path always produces the same \`ibc/HASH\`.

Common denoms on BitBadges:
- USDC: \`ibc/F082B65C88E4B6D5EF1DB243CDA1D331D002759E938A0F5CD3FFDC5D53B3E349\`
- ATOM: \`ibc/A4DB47A9D3CF9A068D454513891B526702455D3EF08FB9EB558C561F9DC2B701\`

Use \`lookup_token_info("USDC")\` to resolve symbol → IBC denom.

### Smart Tokens and IBC (NO Auto-Minting)

**Important**: When IBC tokens arrive on BitBadges, they are NOT automatically converted to smart tokens. The flow is:

1. IBC transfer delivers \`ibc/...\` tokens to user's bank account
2. User MANUALLY calls \`MsgTransferTokens\` to deposit into the smart token vault
3. The backing approval (\`allowBackedMinting: true\`) validates the 1:1 conversion
4. Collection tokens are minted to the user

To withdraw (unback):
1. User calls \`MsgTransferTokens\` sending collection tokens TO the backing address
2. The unbacking approval validates the conversion
3. \`ibc/...\` tokens are released from the backing address to the user

Use \`build_smart_token\` to set up the full backing/unbacking approval structure, or \`build_transfer\` with \`intent: "deposit"\` / \`intent: "withdraw"\`.

### Custom IBC Hooks (x/custom-hooks)

BitBadges has a custom hooks middleware that can execute logic when IBC packets arrive. This follows a similar pattern to Osmosis IBC hooks.

**How it works**:
- ICS-20 transfer packets can include hook data in the \`memo\` field
- When a packet arrives, the custom hooks middleware:
  1. Parses the memo for hook instructions
  2. Wraps the IBC transfer AND hook execution in an **atomic cached context**
  3. If EITHER fails, the entire operation rolls back
  4. If both succeed, all state changes commit together

**Hook data format** (in the ICS-20 memo field):
\`\`\`json
{
  "wasm": {
    "contract": "bb1contractaddr...",
    "msg": { ... },
    "fallback_address": "bb1fallback..."
  }
}
\`\`\`

**Key properties**:
- **Atomic**: Transfer + hook are all-or-nothing
- **Fallback**: If the hook fails, tokens can go to a fallback address instead of reverting
- **Intermediate sender**: The hook derives a sender address from the IBC channel (like Osmosis pattern)

**Use cases for hooks**:
- Swap-and-forward: Receive IBC tokens → swap on GAMM → forward result
- Auto-deposit: Receive IBC tokens → automatically deposit into smart token vault
- Cross-chain actions: Receive tokens → trigger on-chain logic

### Interchain Queries (ICQ)

The BitBadges tokenization module supports Interchain Queries over IBC — other chains can query BitBadges token ownership without trust assumptions.

**Three query types**:

| Query Type | What It Returns |
|-----------|----------------|
| \`OwnershipQuery\` | Whether a single address owns specific tokens |
| \`BulkOwnershipQuery\` | Multiple ownership checks in one packet |
| \`FullBalanceQuery\` | Complete UserBalanceStore for an address |

These enable cross-chain token gating: a contract on another Cosmos chain can verify BitBadges token ownership via IBC query packets.

### Cosmos Coin Wrapper Paths

\`cosmosCoinWrapperPaths\` let you create display wrappers around ANY Cosmos \`x/bank\` coin (not just IBC tokens). Structure:
\`\`\`json
{
  "address": "bb1wrapper...",
  "denom": "ubadge",
  "conversion": { "sideA": { "amount": "1" }, "sideB": [...] },
  "symbol": "BADGE",
  "denomUnits": [{ "decimals": "9", "symbol": "BADGE", "isDefaultDisplay": true }]
}
\`\`\`

This is different from \`cosmosCoinBackedPath\` (which is for smart token 1:1 backing). Wrapper paths provide display/trading metadata without creating a vault.

### IBC Rate Limiting

BitBadges includes \`x/ibc-rate-limit\` middleware that prevents flooding attacks on IBC channels. Tracked per denom and direction. This is transparent to users but protects the chain.

### For Further Reading

- **IBC Protocol**: [ibc.cosmos.network](https://ibc.cosmos.network/main/ibc/overview)
- **ICS-20 Token Transfers**: [cosmos.network/ibc](https://tutorials.cosmos.network/academy/3-ibc/7-token-transfer.html)
- **IBC Relayers**: [hermes.informal.systems](https://hermes.informal.systems/) or [go-relayer](https://github.com/cosmos/relayer)
- **Smart Token Setup**: \`get_skill_instructions("smart-token")\`
- **Backing Addresses**: \`generate_backing_address(ibcDenom)\``
  }
];

export function getSkillInstructions(skillId: string): SkillInstruction | null {
  return SKILL_INSTRUCTIONS.find(s => s.id === skillId) || null;
}

export function getAllSkillInstructions(): SkillInstruction[] {
  return SKILL_INSTRUCTIONS;
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
