/**
 * Skill Instructions Resource
 * Detailed skill-specific guidance for different collection types
 * Ported from frontend skill files with complete instructions
 */

export interface SkillInstruction {
  id: string;
  name: string;
  description: string;
  category: 'token-type' | 'standard' | 'approval' | 'feature';
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

### Two-Fold Approval System

Smart Tokens require TWO separate approvals:

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
  "uri": "ipfs://METADATA_APPROVAL_backing",
  "customData": "",
  "approvalCriteria": {
    "mustPrioritize": true,
    "allowBackedMinting": true
  },
  "version": "0"
}
\`\`\`

#### 2. Unbacking Approval (for unbacking tokens)
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

### Key Rules

1. **NO fromListId: "Mint" approvals**: Tokens are created via IBC backing, not traditional minting
   - Do NOT create approvals with fromListId: "Mint"
   - Use the backing address for backing approval (fromListId)
   - Use "!Mint:[backing_address]" for unbacking approval (fromListId)

2. **Use allowBackedMinting: true**: In both approvals

3. **Use mustPrioritize: true**: Required for IBC backed operations

4. **DO NOT use overridesFromOutgoingApprovals: true**: When fromListId is a backing address
   - Set to false (or omit) for both approvals

5. **Backing Address**: Generated deterministically from the IBC denom
   - Use the lookup_token_info or generate_backing_address tools

6. **Alias Path Requirements**:
   - MUST configure at least one alias path
   - The alias path's default display decimals MUST match the IBC denom's decimals
   - Metadata MUST be added to BOTH base alias path AND each denomUnit

### Smart Token Gotchas

- NEVER use fromListId: "Mint" for Smart Token approvals
- MUST create TWO approvals: one for backing, one for unbacking
- MUST use allowBackedMinting: true in both approvals
- MUST use mustPrioritize: true in both approvals
- DO NOT use overridesFromOutgoingApprovals: true for backing addresses
- MUST configure alias path with matching decimals
- Approval metadata must have empty image ("")`
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

### Required Structure

1. **Standards**: Include "Subscriptions"
   \`\`\`json
   "standards": ["Subscriptions"]
   \`\`\`

2. **Time-Dependent Balances**: Use predeterminedBalances with incrementedBalances

3. **Payment**: Use coinTransfers in approvalCriteria

### Subscription Approval Structure

\`\`\`json
{
  "collectionApprovals": [{
    "fromListId": "Mint",
    "toListId": "All",
    "initiatedByListId": "All",
    "approvalId": "monthly-subscription",
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
          "startBalances": [{
            "amount": "1",
            "tokenIds": [{ "start": "1", "end": "1" }],
            "ownershipTimes": [{
              "start": "1",
              "end": "2592000000"  // 30 days in milliseconds
            }]
          }],
          "incrementTokenIdsBy": "0",
          "incrementOwnershipTimesBy": "0",
          "durationFromTimestamp": "2592000000",  // 30 days
          "allowOverrideTimestamp": true,
          "recurringOwnershipTimes": {
            "startTime": "0",
            "intervalLength": "2592000000",  // 30 days
            "chargePeriodLength": "2592000000"  // 30 days
          },
          "allowOverrideWithAnyValidToken": false
        },
        "orderCalculationMethod": {
          "useOverallNumTransfers": false,
          "usePerToAddressNumTransfers": false,
          "usePerFromAddressNumTransfers": false,
          "usePerInitiatedByAddressNumTransfers": false,
          "useMerkleChallengeLeafIndex": false,
          "challengeTrackerId": ""
        },
        "manualBalances": []
      }
    }
  }]
}
\`\`\`

### Time Calculations

- 1 day: 86400000 ms
- 1 week: 604800000 ms
- 30 days: 2592000000 ms
- 1 year: 31536000000 ms

### Key Points

- ownershipTimes define subscription validity period
- Use recurringOwnershipTimes for auto-renewal capability
- Payment recipient in coinTransfers
- durationFromTimestamp sets subscription length from mint time`
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

For soulbound tokens, simply don't include any post-mint transfer approvals.
Only include Mint approvals (fromListId: "Mint").

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
- Uses overall transfer count for ordering
- Keeps manualBalances empty`
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

  const categories = ['token-type', 'standard', 'approval', 'feature'] as const;
  const categoryNames = {
    'token-type': 'Token Types',
    'standard': 'Standards',
    'approval': 'Approval Configuration',
    'feature': 'Features'
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
