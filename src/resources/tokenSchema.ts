/**
 * Token Builder Schema Resource
 * Annotated schema for universal token building.
 * Replaces scattered rules across master prompt + 11 skills.
 *
 * 3 Layers:
 *   1. Design Planner — 8 axes the AI picks from
 *   2. Annotated Field Reference — every MsgUniversalUpdateCollection field
 *   3. Validation Checklist — self-check before returning
 */

export const tokenSchemaResourceInfo = {
  uri: 'bitbadges://schema/token-builder',
  name: 'Token Builder Schema',
  description: 'Annotated schema for collection building: design axes, field reference, approval patterns, permission presets, and validation checklist',
  mimeType: 'text/markdown'
};

export function getTokenSchemaContent(): string {
  return TOKEN_BUILDER_SCHEMA;
}

const TOKEN_BUILDER_SCHEMA = `# Token Builder Schema

## Layer 1: Design Planner

Pick ONE option per axis. Defaults shown with \`*\`.

### 1. Supply Model
| Option | validTokenIds | maxSupplyPerId | Notes |
|--------|--------------|----------------|-------|
| \`single-fungible\` * | [{start:"1",end:"1"}] | "0" (unlimited) or totalSupply | Single token ID, variable amount per holder |
| \`fixed-nft\` | [{start:"1",end:COUNT}] | "1" | Each token ID unique, 1 per holder |
| \`multi-edition\` | [{start:"1",end:COUNT}] | EDITION_SIZE | Multiple copies per token ID |

### 2. Minting Mechanism
| Option | Approval Pattern | Key Fields |
|--------|-----------------|------------|
| \`public\` * | fromListId:"Mint", toListId:"All", initiatedByListId:"All" | overridesFromOutgoingApprovals:true, optional coinTransfers/limits |
| \`manager-only\` | fromListId:"Mint", initiatedByListId:MANAGER_LIST | overridesFromOutgoingApprovals:true |
| \`ibc-backed\` | TWO approvals: backing + unbacking | mustPrioritize:true, allowBackedMinting:true, NO overridesFromOutgoingApprovals |
| \`none\` | No mint approval | Pre-minted via defaultBalances or no minting |

### 3. Transferability
| Option | Transfer Approval | Notes |
|--------|------------------|-------|
| \`free\` * | fromListId:"!Mint", toListId:"All", approvalCriteria:{} | Open peer-to-peer |
| \`non-transferable\` | NONE | Soulbound — no transfer approval at all |
| \`restricted\` | fromListId:"!Mint" with limits | approvalAmounts/maxNumTransfers on transfers |

### 4. Time Behavior
| Option | Effect |
|--------|--------|
| \`permanent\` * | ownershipTimes: FOREVER_TIMES everywhere |
| \`expiring\` | ownershipTimes: [{start:NOW, end:NOW+durationMs}] on mint approval |
| \`subscription\` | Recurring via recurringOwnershipTimes on predeterminedBalances |

### 5. Permissions Preset
| Preset | Behavior |
|--------|----------|
| \`immutable\` | ALL permissions forbidden forever |
| \`locked-approvals\` * | Approvals frozen, metadata editable |
| \`manager-controlled\` | Most actions allowed (except delete, manager change, standards) |

### 6. Trading
| Option | Effect |
|--------|--------|
| \`none\` * | disablePoolCreation:true, no alias path |
| \`swappable\` | disablePoolCreation:false, alias path added, standards+=["Liquidity Pools"] |
| \`tradable\` | standards+=["NFTMarketplace","NFTPricingDenom:DENOM"] |

### 7. Access Control (composable — multiple can apply)
| Option | Where Applied |
|--------|--------------|
| \`mustOwnTokens\` | approvalCriteria.mustOwnTokens on mint/transfer approval |
| \`dynamicStoreChallenges\` | approvalCriteria.zkProofs with dynamicStore provider |
| \`evmQueryChallenges\` | approvalCriteria.zkProofs with evm provider |

---

## Layer 2: MsgUniversalUpdateCollection Field Reference

All string numbers are uint64 strings. FOREVER_TIMES = [{start:"1",end:"18446744073709551615"}].

### Top-Level Fields
| Field | Type | Notes |
|-------|------|-------|
| creator | string | @rule MUST be bb1... address. @gotcha Cosmos bech32 only, not 0x |
| collectionId | string | @rule "0" for new collections, existing ID for updates |

### Token Identity
| Field | Type | Notes |
|-------|------|-------|
| updateValidTokenIds | boolean | @default true for new collections |
| validTokenIds | UintRange[] | @pattern single-fungible: [{start:"1",end:"1"}], NFT: [{start:"1",end:COUNT}] |

### Metadata
| Field | Type | Notes |
|-------|------|-------|
| updateCollectionMetadata | boolean | @default true |
| collectionMetadata | {uri,customData} | @pattern Use "ipfs://METADATA_COLLECTION" placeholder |
| updateTokenMetadata | boolean | @default true |
| tokenMetadata | [{uri,customData,tokenIds}] | @pattern NFT: use "ipfs://METADATA_TOKEN_{id}" with {id} placeholder in URI only (not in names/descriptions). Fungible: single URI |
| updateCustomData | boolean | @default true |
| customData | string | @pattern JSON string for app-specific data (e.g. AI agent address) |

### Manager
| Field | Type | Notes |
|-------|------|-------|
| updateManager | boolean | @default true |
| manager | string | @rule Same as creator for new collections |

### Permissions
| Field | Type | Notes |
|-------|------|-------|
| updateCollectionPermissions | boolean | @default true |
| collectionPermissions | object | See Permission Presets below |

### Approvals
| Field | Type | Notes |
|-------|------|-------|
| updateCollectionApprovals | boolean | @default true |
| collectionApprovals | Approval[] | See Approval Patterns below |

### Default Balances
| Field | Type | Notes |
|-------|------|-------|
| defaultBalances.balances | Balance[] | @default [] (empty — tokens minted via approvals) |
| defaultBalances.outgoingApprovals | [] | @default [] |
| defaultBalances.incomingApprovals | [] | @default [] |
| defaultBalances.autoApproveAllIncomingTransfers | boolean | @rule MUST be true for public-mint collections. @gotcha Missing this = mint fails silently |
| defaultBalances.autoApproveSelfInitiatedOutgoingTransfers | boolean | @default true |
| defaultBalances.autoApproveSelfInitiatedIncomingTransfers | boolean | @default true |
| defaultBalances.userPermissions | object | @default All empty arrays (no user-level permission restrictions) |

### Standards
| Field | Type | Notes |
|-------|------|-------|
| updateStandards | boolean | @default true |
| standards | string[] | @pattern "Fungible Tokens", "NFTs", "Smart Token", "Liquidity Pools", "NFTMarketplace", "NFTPricingDenom:DENOM", "Non-Transferable", "Custom-2FA", "AI Agent Stablecoin", "AI Agent Vault". Legacy aliases: "Tradable" (use "NFTMarketplace"), "DefaultDisplayCurrency:DENOM" (use "NFTPricingDenom:DENOM") |

### Invariants
| Field | Type | Notes |
|-------|------|-------|
| invariants.noCustomOwnershipTimes | boolean | @default true for fungible, false for smart tokens |
| invariants.maxSupplyPerId | string | @rule "0"=unlimited, "1"=NFT (unique), N=edition size |
| invariants.noForcefulPostMintTransfers | boolean | @default true |
| invariants.disablePoolCreation | boolean | @default true. Set false only if swappable |
| invariants.cosmosCoinBackedPath | object\|null | @rule REQUIRED for ibc-backed minting. null otherwise |

### Alias Paths
| Field | Type | Notes |
|-------|------|-------|
| aliasPathsToAdd | AliasPath[] | @rule Required if swappable OR ibc-backed. Empty otherwise |

### Other
| Field | Type | Notes |
|-------|------|-------|
| updateIsArchived | boolean | @default false |
| isArchived | boolean | @default false |
| mintEscrowCoinsToTransfer | [] | @default [] |
| cosmosCoinWrapperPathsToAdd | [] | @default [] |

---

## Approval Patterns

### Public Mint
\`\`\`
fromListId: "Mint"
toListId: "All"
initiatedByListId: "All"
approvalId: "public-mint"
approvalCriteria:
  overridesFromOutgoingApprovals: true          @rule REQUIRED for all mint approvals
  coinTransfers?: [{to, coins:[{denom,amount}]}]  @pattern price>0
  approvalAmounts?: {overallApprovalAmount, perInitiatedByAddressApprovalAmount, amountTrackerId, ...}  @pattern supply cap or per-user limit
  maxNumTransfers?: {...}                       @pattern NFT sequential allocation
  predeterminedBalances?: {incrementedBalances:{...}}  @pattern NFT: auto-increment token IDs
  mustOwnTokens?: [...]                        @pattern access gating
\`\`\`

### IBC Backing (deposit)
\`\`\`
fromListId: BACKING_ADDRESS
toListId: "!" + BACKING_ADDRESS
approvalId: "smart-token-backing"
approvalCriteria:
  mustPrioritize: true                          @rule REQUIRED
  allowBackedMinting: true                      @rule REQUIRED
  @gotcha Do NOT set overridesFromOutgoingApprovals on backing/unbacking
\`\`\`

### IBC Unbacking (withdraw)
\`\`\`
fromListId: "!Mint:" + BACKING_ADDRESS
toListId: BACKING_ADDRESS
approvalId: "smart-token-unbacking"
approvalCriteria:
  mustPrioritize: true                          @rule REQUIRED
  allowBackedMinting: true                      @rule REQUIRED
  approvalAmounts?: {...}                       @pattern withdrawal limits
  mustOwnTokens?: [...]                        @pattern 2FA gating
\`\`\`

### Free Transfer
\`\`\`
fromListId: "!Mint"
toListId: "All"
initiatedByListId: "All"
approvalId: "free-transfer"
approvalCriteria: {}                            @rule Empty = no restrictions
\`\`\`

### Subscription Mint
\`\`\`
fromListId: "Mint"
toListId: "All"
approvalId: "subscription-mint"
approvalCriteria:
  overridesFromOutgoingApprovals: true          @rule REQUIRED
  coinTransfers: [{to, coins:[{denom,amount}],
    overrideFromWithApproverAddress: false,      @gotcha MUST be false for subscriptions
    overrideToWithInitiator: false}]             @gotcha MUST be false for subscriptions
  predeterminedBalances:
    incrementedBalances:
      startBalances: [{amount:"1", tokenIds:[{start:"1",end:"1"}], ownershipTimes:FOREVER}]
      incrementTokenIdsBy: "0"                  @rule "0" for subscriptions (not "1" like NFTs)
      incrementOwnershipTimesBy: "0"
      durationFromTimestamp: DURATION_MS         @rule MUST be non-zero (subscription period in ms)
      allowOverrideTimestamp: true               @rule MUST be true for subscriptions
      recurringOwnershipTimes: {startTime:"0", intervalLength:"0", chargePeriodLength:"0"}
    orderCalculationMethod:
      useOverallNumTransfers: true              @rule Exactly ONE method must be true
  requireFromEqualsInitiatedBy: false
  requireToEqualsInitiatedBy: false
  overridesToIncomingApprovals: false
  merkleChallenges: []

@gotcha Standards MUST include "Subscriptions"
@gotcha invariants.noCustomOwnershipTimes MUST be false
@gotcha validTokenIds MUST be exactly [{start:"1",end:"1"}]

Duration constants (ms):
  Daily: "86400000", Weekly: "604800000", Monthly: "2592000000", Annual: "31536000000"
\`\`\`

### NFT Predetermined Balances
\`\`\`
predeterminedBalances:
  incrementedBalances:
    startBalances: [{amount:"1", tokenIds:[{start:"1",end:"1"}], ownershipTimes:FOREVER}]
    incrementTokenIdsBy: "1"
    incrementOwnershipTimesBy: "0"
  orderCalculationMethod:
    useOverallNumTransfers: true                @rule MUST be true for sequential NFT minting
maxNumTransfers:
  overallMaxNumTransfers: TOTAL_SUPPLY          @rule Caps total mints
  perInitiatedByAddressMaxNumTransfers: MAX_PER_USER or "0"
\`\`\`

### Amount Scaling (Pay-Per-Token / Variable Quantity)
\`\`\`
predeterminedBalances:
  incrementedBalances:
    startBalances: [{amount:"1", tokenIds:[{start:"1",end:"1"}], ownershipTimes:FOREVER}]
    incrementTokenIdsBy: "0"                    @rule MUST be "0" when allowAmountScaling is true
    incrementOwnershipTimesBy: "0"              @rule MUST be "0" when allowAmountScaling is true
    durationFromTimestamp: "0"                  @rule MUST be "0" when allowAmountScaling is true
    allowOverrideTimestamp: false               @rule MUST be false when allowAmountScaling is true
    allowOverrideWithAnyValidToken: false       @rule MUST be false when allowAmountScaling is true
    allowAmountScaling: true                    @rule Enables proportional transfers (any integer multiple)
    maxScalingMultiplier: "1000000000000"     @rule MUST be > 0 when scaling is on (caps multiplier per transfer; use large value for micro-unit bases)
  orderCalculationMethod:
    useOverallNumTransfers: true
coinTransfers: [{to: RECIPIENT, coins: [{amount: PRICE_PER_UNIT, denom: "ubadge"}]}]
                                                @note coinTransfers scale by the same multiplier automatically

@pattern Pay-per-token: user transfers N tokens, pays N * PRICE_PER_UNIT
@pattern Prediction market deposit: N USDC -> N YES + N NO tokens (single tx)
@pattern Credit token purchase: buy N credits for N * price (single tx)
\`\`\`

---

## Permission Presets

### Fully Immutable
All 11 permission keys set to permanentlyForbiddenTimes: FOREVER_TIMES.
Token-scoped permissions (canUpdateValidTokenIds, canUpdateTokenMetadata) include tokenIds range.
Approval permission (canUpdateCollectionApprovals) includes all list/time/token scoping.

### Locked Approvals (default)
- FORBIDDEN: canDeleteCollection, canUpdateStandards, canUpdateManager, canUpdateCollectionApprovals, canUpdateValidTokenIds, canAddMoreAliasPaths, canAddMoreCosmosCoinWrapperPaths
- ALLOWED: canArchiveCollection, canUpdateCustomData, canUpdateCollectionMetadata, canUpdateTokenMetadata

### Manager Controlled
- FORBIDDEN: canDeleteCollection, canUpdateStandards, canUpdateManager
- ALLOWED: everything else

---

## Alias Path Structure
\`\`\`
{
  denom: LOWERCASE_SYMBOL,          @rule Must be lowercase
  symbol: LOWERCASE_SYMBOL,
  conversion: {
    sideA: { amount: "1" },          @rule 1:1 ratio for smart tokens
    sideB: [{ amount: "1", tokenIds: [{start:"1",end:"1"}], ownershipTimes: FOREVER }]
  },
  denomUnits: [{
    decimals: DECIMALS_STRING,       @gotcha Must match IBC denom decimals
    symbol: DISPLAY_SYMBOL,
    isDefaultDisplay: true,
    metadata: { uri, customData }    @gotcha MUST have metadata on BOTH denomUnits AND base
  }],
  metadata: { uri, customData }
}
\`\`\`

---

## Layer 3: Validation Checklist

Before returning, verify:
1. creator starts with "bb1"
2. collectionId is "0" for new collections
3. Every mint approval has overridesFromOutgoingApprovals:true
4. IBC backing/unbacking have mustPrioritize:true AND allowBackedMinting:true
5. IBC backing/unbacking do NOT have overridesFromOutgoingApprovals
6. defaultBalances.autoApproveAllIncomingTransfers is true (for public mint)
7. If non-transferable: no transfer approval exists
8. If NFT: maxSupplyPerId is "1", predeterminedBalances uses incrementedBalances
9. If swappable: disablePoolCreation is false, alias path exists
10. If ibc-backed: cosmosCoinBackedPath is set in invariants
11. All UintRange start <= end
12. All amount strings are valid uint64 (no negatives, no decimals)
13. tokenIds in approvals match validTokenIds range
14. Permission preset matches intended mutability level
15. standards array includes all applicable standards
`;
