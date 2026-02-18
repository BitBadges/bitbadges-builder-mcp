/**
 * Examples Documentation Resource
 * Full transaction examples for common use cases
 */

export interface ExamplesDocsResource {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

export const examplesDocsResourceInfo: ExamplesDocsResource = {
  uri: 'bitbadges://docs/examples',
  name: 'Full Examples',
  description: 'Complete transaction JSON examples for NFT collections, fungible tokens, and Smart Tokens',
  mimeType: 'text/markdown'
};

/**
 * Embedded examples documentation content
 */
export const EXAMPLES_DOCS_CONTENT = {
  overview: `# BitBadges Transaction Examples

Complete, working transaction JSON examples for common use cases.

## Use Cases Covered

1. **NFT Collection** - Create 100 unique NFTs with public mint
2. **Fungible Token** - Create a token with unlimited supply
3. **Smart Token** - IBC-backed token (e.g., wrapped USDC)
4. **Mint Approval Patterns** - Payment, limits, whitelist`,

  nftCollection: `## NFT Collection Example

Create a collection of 100 unique NFTs with a public mint approval.

\`\`\`json
{
  "messages": [
    {
      "typeUrl": "/tokenization.MsgUniversalUpdateCollection",
      "value": {
        "creator": "bb1creator...",
        "collectionId": "0",
        "updateValidTokenIds": true,
        "validTokenIds": [{ "start": "1", "end": "100" }],
        "updateCollectionPermissions": true,
        "collectionPermissions": {
          "canDeleteCollection": [{
            "permanentlyPermittedTimes": [],
            "permanentlyForbiddenTimes": [{ "start": "1", "end": "18446744073709551615" }]
          }],
          "canArchiveCollection": [],
          "canUpdateStandards": [],
          "canUpdateCustomData": [],
          "canUpdateManager": [],
          "canUpdateCollectionMetadata": [],
          "canUpdateValidTokenIds": [{
            "tokenIds": [{ "start": "1", "end": "18446744073709551615" }],
            "permanentlyPermittedTimes": [],
            "permanentlyForbiddenTimes": [{ "start": "1", "end": "18446744073709551615" }]
          }],
          "canUpdateTokenMetadata": [],
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
          "canAddMoreAliasPaths": [],
          "canAddMoreCosmosCoinWrapperPaths": []
        },
        "updateManager": true,
        "manager": "bb1creator...",
        "updateCollectionMetadata": true,
        "collectionMetadata": {
          "uri": "ipfs://METADATA_COLLECTION",
          "customData": ""
        },
        "updateTokenMetadata": true,
        "tokenMetadata": [{
          "uri": "ipfs://METADATA_TOKEN_{id}",
          "customData": "",
          "tokenIds": [{ "start": "1", "end": "100" }]
        }],
        "updateCustomData": true,
        "customData": "",
        "updateCollectionApprovals": true,
        "collectionApprovals": [
          {
            "fromListId": "Mint",
            "toListId": "All",
            "initiatedByListId": "All",
            "transferTimes": [{ "start": "1", "end": "18446744073709551615" }],
            "tokenIds": [{ "start": "1", "end": "100" }],
            "ownershipTimes": [{ "start": "1", "end": "18446744073709551615" }],
            "uri": "ipfs://METADATA_APPROVAL_mint",
            "customData": "",
            "approvalId": "public-mint",
            "approvalCriteria": {
              "overridesFromOutgoingApprovals": true,
              "maxNumTransfers": {
                "perInitiatedByAddressMaxNumTransfers": "1"
              },
              "coinTransfers": [{
                "to": "bb1creator...",
                "coins": [{ "denom": "ubadge", "amount": "5000000000" }]
              }]
            },
            "version": "0"
          }
        ],
        "updateStandards": true,
        "standards": [],
        "updateIsArchived": false,
        "isArchived": false,
        "mintEscrowCoinsToTransfer": [],
        "invariants": {
          "noCustomOwnershipTimes": true,
          "maxSupplyPerId": "1",
          "noForcefulPostMintTransfers": true,
          "disablePoolCreation": true,
          "cosmosCoinBackedPath": null
        },
        "aliasPathsToAdd": [],
        "cosmosCoinWrapperPathsToAdd": []
      }
    }
  ],
  "memo": "",
  "fee": {
    "amount": [{ "denom": "ubadge", "amount": "5000" }],
    "gas": "500000"
  },
  "metadataPlaceholders": {
    "ipfs://METADATA_COLLECTION": {
      "name": "My NFT Collection",
      "description": "A collection of 100 unique NFTs.",
      "image": "ipfs://QmCollectionImage..."
    },
    "ipfs://METADATA_TOKEN_{id}": {
      "name": "NFT #{id}",
      "description": "Unique NFT from the collection.",
      "image": "ipfs://QmTokenImage..."
    },
    "ipfs://METADATA_APPROVAL_mint": {
      "name": "Public Mint",
      "description": "Allows anyone to mint one NFT for 5 BADGE.",
      "image": ""
    }
  }
}
\`\`\``,

  fungibleToken: `## Fungible Token Example

Create a fungible token with unlimited supply.

\`\`\`json
{
  "messages": [
    {
      "typeUrl": "/tokenization.MsgUniversalUpdateCollection",
      "value": {
        "creator": "bb1creator...",
        "collectionId": "0",
        "updateValidTokenIds": true,
        "validTokenIds": [{ "start": "1", "end": "1" }],
        "updateCollectionPermissions": true,
        "collectionPermissions": {
          "canDeleteCollection": [{
            "permanentlyPermittedTimes": [],
            "permanentlyForbiddenTimes": [{ "start": "1", "end": "18446744073709551615" }]
          }],
          "canArchiveCollection": [],
          "canUpdateStandards": [],
          "canUpdateCustomData": [],
          "canUpdateManager": [],
          "canUpdateCollectionMetadata": [],
          "canUpdateValidTokenIds": [{
            "tokenIds": [{ "start": "1", "end": "18446744073709551615" }],
            "permanentlyPermittedTimes": [],
            "permanentlyForbiddenTimes": [{ "start": "1", "end": "18446744073709551615" }]
          }],
          "canUpdateTokenMetadata": [],
          "canUpdateCollectionApprovals": [],
          "canAddMoreAliasPaths": [],
          "canAddMoreCosmosCoinWrapperPaths": []
        },
        "updateManager": true,
        "manager": "bb1creator...",
        "updateCollectionMetadata": true,
        "collectionMetadata": {
          "uri": "ipfs://METADATA_COLLECTION",
          "customData": ""
        },
        "updateTokenMetadata": true,
        "tokenMetadata": [{
          "uri": "ipfs://METADATA_TOKEN",
          "customData": "",
          "tokenIds": [{ "start": "1", "end": "1" }]
        }],
        "updateCustomData": true,
        "customData": "",
        "updateCollectionApprovals": true,
        "collectionApprovals": [
          {
            "fromListId": "Mint",
            "toListId": "All",
            "initiatedByListId": "All",
            "transferTimes": [{ "start": "1", "end": "18446744073709551615" }],
            "tokenIds": [{ "start": "1", "end": "1" }],
            "ownershipTimes": [{ "start": "1", "end": "18446744073709551615" }],
            "uri": "ipfs://METADATA_APPROVAL_mint",
            "customData": "",
            "approvalId": "public-mint",
            "approvalCriteria": {
              "overridesFromOutgoingApprovals": true
            },
            "version": "0"
          },
          {
            "fromListId": "!Mint",
            "toListId": "!Mint",
            "initiatedByListId": "All",
            "transferTimes": [{ "start": "1", "end": "18446744073709551615" }],
            "tokenIds": [{ "start": "1", "end": "1" }],
            "ownershipTimes": [{ "start": "1", "end": "18446744073709551615" }],
            "uri": "ipfs://METADATA_APPROVAL_transfer",
            "customData": "",
            "approvalId": "free-transfer",
            "approvalCriteria": {},
            "version": "0"
          }
        ],
        "updateStandards": true,
        "standards": [],
        "updateIsArchived": false,
        "isArchived": false,
        "mintEscrowCoinsToTransfer": [],
        "invariants": {
          "noCustomOwnershipTimes": true,
          "maxSupplyPerId": "0",
          "noForcefulPostMintTransfers": false,
          "disablePoolCreation": false,
          "cosmosCoinBackedPath": null
        },
        "aliasPathsToAdd": [],
        "cosmosCoinWrapperPathsToAdd": []
      }
    }
  ],
  "memo": "",
  "fee": {
    "amount": [{ "denom": "ubadge", "amount": "5000" }],
    "gas": "500000"
  },
  "metadataPlaceholders": {
    "ipfs://METADATA_COLLECTION": {
      "name": "My Token",
      "description": "A fungible token with unlimited supply.",
      "image": "ipfs://QmTokenImage..."
    },
    "ipfs://METADATA_TOKEN": {
      "name": "MY",
      "description": "The MY token unit.",
      "image": "ipfs://QmTokenImage..."
    },
    "ipfs://METADATA_APPROVAL_mint": {
      "name": "Public Mint",
      "description": "Allows anyone to mint tokens freely.",
      "image": ""
    },
    "ipfs://METADATA_APPROVAL_transfer": {
      "name": "Free Transfer",
      "description": "Allows free transfer between users.",
      "image": ""
    }
  }
}
\`\`\``,

  smartToken: `## Smart Token Example (IBC-Backed)

Create a wrapped token backed 1:1 by IBC assets (e.g., USDC).

\`\`\`json
{
  "messages": [
    {
      "typeUrl": "/tokenization.MsgUniversalUpdateCollection",
      "value": {
        "creator": "bb1creator...",
        "collectionId": "0",
        "updateValidTokenIds": true,
        "validTokenIds": [{ "start": "1", "end": "1" }],
        "updateCollectionPermissions": true,
        "collectionPermissions": {
          "canDeleteCollection": [{
            "permanentlyPermittedTimes": [],
            "permanentlyForbiddenTimes": [{ "start": "1", "end": "18446744073709551615" }]
          }],
          "canArchiveCollection": [],
          "canUpdateStandards": [],
          "canUpdateCustomData": [],
          "canUpdateManager": [],
          "canUpdateCollectionMetadata": [],
          "canUpdateValidTokenIds": [{
            "tokenIds": [{ "start": "1", "end": "18446744073709551615" }],
            "permanentlyPermittedTimes": [],
            "permanentlyForbiddenTimes": [{ "start": "1", "end": "18446744073709551615" }]
          }],
          "canUpdateTokenMetadata": [],
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
          "canAddMoreAliasPaths": [],
          "canAddMoreCosmosCoinWrapperPaths": []
        },
        "updateManager": true,
        "manager": "bb1creator...",
        "updateCollectionMetadata": true,
        "collectionMetadata": {
          "uri": "ipfs://METADATA_COLLECTION",
          "customData": ""
        },
        "updateTokenMetadata": true,
        "tokenMetadata": [{
          "uri": "ipfs://METADATA_TOKEN",
          "customData": "",
          "tokenIds": [{ "start": "1", "end": "1" }]
        }],
        "updateCustomData": true,
        "customData": "",
        "updateCollectionApprovals": true,
        "collectionApprovals": [
          {
            "fromListId": "bb1backingaddress...",
            "toListId": "!bb1backingaddress...",
            "initiatedByListId": "All",
            "transferTimes": [{ "start": "1", "end": "18446744073709551615" }],
            "tokenIds": [{ "start": "1", "end": "1" }],
            "ownershipTimes": [{ "start": "1", "end": "18446744073709551615" }],
            "uri": "ipfs://METADATA_APPROVAL_backing",
            "customData": "",
            "approvalId": "smart-token-backing",
            "approvalCriteria": {
              "mustPrioritize": true,
              "allowBackedMinting": true
            },
            "version": "0"
          },
          {
            "fromListId": "!Mint:bb1backingaddress...",
            "toListId": "bb1backingaddress...",
            "initiatedByListId": "All",
            "transferTimes": [{ "start": "1", "end": "18446744073709551615" }],
            "tokenIds": [{ "start": "1", "end": "1" }],
            "ownershipTimes": [{ "start": "1", "end": "18446744073709551615" }],
            "uri": "ipfs://METADATA_APPROVAL_unbacking",
            "customData": "",
            "approvalId": "smart-token-unbacking",
            "approvalCriteria": {
              "mustPrioritize": true,
              "allowBackedMinting": true
            },
            "version": "0"
          },
          {
            "fromListId": "!Mint:bb1backingaddress...",
            "toListId": "!Mint:bb1backingaddress...",
            "initiatedByListId": "All",
            "transferTimes": [{ "start": "1", "end": "18446744073709551615" }],
            "tokenIds": [{ "start": "1", "end": "1" }],
            "ownershipTimes": [{ "start": "1", "end": "18446744073709551615" }],
            "uri": "ipfs://METADATA_APPROVAL_transfer",
            "customData": "",
            "approvalId": "free-transfer",
            "approvalCriteria": {},
            "version": "0"
          }
        ],
        "updateStandards": true,
        "standards": ["Smart Token"],
        "updateIsArchived": false,
        "isArchived": false,
        "mintEscrowCoinsToTransfer": [],
        "invariants": {
          "noCustomOwnershipTimes": true,
          "maxSupplyPerId": "0",
          "noForcefulPostMintTransfers": true,
          "disablePoolCreation": false,
          "cosmosCoinBackedPath": {
            "ibcDenom": "ibc/F082B65C88E4B6D5EF1DB243CDA1D331D002759E938A0F5CD3FFDC5D53B3E349",
            "backingAddress": "bb1backingaddress..."
          }
        },
        "aliasPathsToAdd": [{
          "denom": "uwusdc",
          "symbol": "uwusdc",
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
            "symbol": "wUSDC",
            "isDefaultDisplay": true,
            "metadata": { "uri": "ipfs://METADATA_ALIAS", "customData": "" }
          }],
          "metadata": { "uri": "ipfs://METADATA_ALIAS", "customData": "" }
        }],
        "cosmosCoinWrapperPathsToAdd": []
      }
    }
  ],
  "memo": "",
  "fee": {
    "amount": [{ "denom": "ubadge", "amount": "5000" }],
    "gas": "500000"
  }
}
\`\`\`

### Smart Token Key Points

1. **Two approvals needed**: Backing (from backing address) and unbacking (to backing address)
2. **No fromListId: "Mint"**: Smart tokens mint from the backing address, not Mint
3. **mustPrioritize: true** and **allowBackedMinting: true** required
4. **NO overridesFromOutgoingApprovals: true** for backing addresses
5. **cosmosCoinBackedPath** must be set in invariants
6. **aliasPathsToAdd** for liquidity pool compatibility`,

  approvalPatterns: `## Approval Pattern Examples

### Payment Required

\`\`\`json
{
  "approvalCriteria": {
    "overridesFromOutgoingApprovals": true,
    "coinTransfers": [{
      "to": "bb1recipient...",
      "coins": [{ "denom": "ubadge", "amount": "5000000000" }]
    }]
  }
}
\`\`\`

### Per-User Limit

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

### Total Supply Cap

\`\`\`json
{
  "approvalCriteria": {
    "overridesFromOutgoingApprovals": true,
    "approvalAmounts": {
      "overallApprovalAmount": "1000",
      "amountTrackerId": "total-supply"
    }
  }
}
\`\`\`

### Require Token Ownership

\`\`\`json
{
  "approvalCriteria": {
    "overridesFromOutgoingApprovals": true,
    "mustOwnTokens": [{
      "collectionId": "123",
      "tokenIds": [{ "start": "1", "end": "1" }],
      "ownershipTimes": [{ "start": "1", "end": "18446744073709551615" }],
      "amountRange": { "start": "1", "end": "18446744073709551615" },
      "overrideWithCurrentTime": true,
      "mustSatisfyForAllAssets": false,
      "ownershipCheckParty": "initiator"
    }]
  }
}
\`\`\`

### Auto-Delete After One Use

\`\`\`json
{
  "approvalCriteria": {
    "overridesFromOutgoingApprovals": true,
    "autoDeletionOptions": {
      "afterOneUse": true
    }
  }
}
\`\`\``
};

/**
 * Get the complete examples documentation as a single string
 */
export function getExamplesDocsContent(): string {
  return Object.values(EXAMPLES_DOCS_CONTENT).join('\n\n');
}

/**
 * Get a specific section of the examples documentation
 */
export function getExamplesDocsSection(section: keyof typeof EXAMPLES_DOCS_CONTENT): string {
  return EXAMPLES_DOCS_CONTENT[section];
}
