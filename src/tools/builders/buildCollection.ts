/**
 * Tool: build_collection
 * Delegates to SDK template builders for all standard collection types.
 */
import {
  buildVault, buildSubscription, buildBounty, buildCrowdfund, buildAuction,
  buildProductCatalog, buildPredictionMarket, buildSmartAccount, buildCreditToken,
  buildCustom2FA, buildQuests, buildAddressList,
  type VaultParams, type SubscriptionParams, type BountyParams, type CrowdfundParams,
  type AuctionParams, type ProductCatalogParams, type PredictionMarketParams,
  type SmartAccountParams, type CreditTokenParams, type Custom2FAParams,
  type QuestsParams, type AddressListParams
} from 'bitbadgesjs-sdk';

const BUILDERS: Record<string, (params: any) => any> = {
  vault: buildVault,
  subscription: buildSubscription,
  bounty: buildBounty,
  crowdfund: buildCrowdfund,
  auction: buildAuction,
  'product-catalog': buildProductCatalog,
  'prediction-market': buildPredictionMarket,
  'smart-account': buildSmartAccount,
  'credit-token': buildCreditToken,
  'custom-2fa': buildCustom2FA,
  quests: buildQuests,
  'address-list': buildAddressList,
};

export const buildCollectionTool = {
  name: 'build_collection',
  description: 'Build a complete collection from a template type. Outputs MsgUniversalUpdateCollection JSON with { typeUrl, value }. Types: vault, subscription, bounty, crowdfund, auction, product-catalog, prediction-market, smart-account, credit-token, custom-2fa, quests, address-list. Pass type-specific params as JSON.',
  inputSchema: {
    type: 'object',
    properties: {
      type: {
        type: 'string',
        enum: Object.keys(BUILDERS),
        description: 'Collection template type'
      },
      params: {
        type: 'object',
        description: 'Type-specific parameters (see bitbadges-cli build <type> --help for param details)'
      }
    },
    required: ['type', 'params']
  }
};

export function handleBuildCollection(input: { type: string; params: any }): any {
  const builder = BUILDERS[input.type];
  if (!builder) {
    throw new Error(`Unknown collection type "${input.type}". Supported: ${Object.keys(BUILDERS).join(', ')}`);
  }

  const result = builder(input.params);
  return {
    transaction: result,
    type: input.type,
    nextSteps: [
      'Review the JSON output',
      'Set metadata via set_collection_metadata / set_token_metadata',
      'Validate with validate_transaction',
      'Sign and broadcast'
    ]
  };
}
