/**
 * Error Patterns Resource
 * Maps common error messages to diagnoses and fixes
 */

export interface ErrorPattern {
  name: string;
  category: string;
  triggers: string[];
  explanation: string;
  fix: string;
  example?: string;
}

export const ERROR_PATTERNS: ErrorPattern[] = [
  // Auto-scan / approval matching errors
  {
    name: 'Auto-scan failed — must explicitly prioritize approvals',
    category: 'transfer',
    triggers: ['auto-scan', 'auto scan', 'explicitly prioritize', 'no valid approval', 'approval scan failed', 'could not find matching approval', 'no matching approval'],
    explanation: 'The chain could not automatically find a matching approval for your transfer. This happens when: (1) prioritizedApprovals is missing or empty and the chain cannot auto-match, (2) the transfer parameters don\'t match any collection-level approval, or (3) multiple approvals could match and the chain requires explicit selection. Smart token backing/unbacking approvals with mustPrioritize: true ALWAYS require explicit prioritizedApprovals.',
    fix: 'Use analyze_collection to inspect the collection\'s approvals, then set prioritizedApprovals explicitly in your transfer: [{ "approvalId": "the-approval-id", "approvalLevel": "collection", "approverAddress": "" }]. For smart tokens, you MUST specify the backing or unbacking approval ID. Use build_transfer to auto-generate the correct transaction.',
    example: '{ "prioritizedApprovals": [{ "approvalId": "public-mint", "approvalLevel": "collection", "approverAddress": "" }], "onlyCheckPrioritizedApprovals": false }'
  },

  // Transaction structure errors
  {
    name: 'Numbers not strings',
    category: 'serialization',
    triggers: ['invalid type', 'expected string', 'number where string', 'cannot unmarshal number', 'json: cannot unmarshal'],
    explanation: 'BitBadges requires all numeric values (amounts, token IDs, timestamps) to be string-encoded. Using JavaScript numbers causes serialization failures.',
    fix: 'Change all numeric values to strings: amount: "100" not amount: 100. Use validate_transaction to check.',
    example: '{ "amount": "100", "start": "1", "end": "18446744073709551615" }'
  },
  {
    name: 'Missing prioritizedApprovals',
    category: 'transfer',
    triggers: ['prioritizedApprovals', 'approval not found', 'no matching approval', 'transfer failed'],
    explanation: 'MsgTransferTokens requires prioritizedApprovals to be explicitly specified in every transfer, even if empty.',
    fix: 'Add prioritizedApprovals: [] to each transfer object. For smart token operations, specify the exact approval: [{ approvalId: "smart-token-backing", approvalLevel: "collection", approverAddress: "" }]',
    example: '{ "prioritizedApprovals": [], "onlyCheckPrioritizedApprovals": false }'
  },
  {
    name: 'Missing overridesFromOutgoingApprovals on Mint',
    category: 'approval',
    triggers: ['mint', 'outgoing', 'override', 'cannot transfer from Mint', 'Mint address'],
    explanation: 'Approvals with fromListId: "Mint" must have overridesFromOutgoingApprovals: true. The Mint address has no outgoing approvals by default, so this override is required.',
    fix: 'Add to approvalCriteria: { overridesFromOutgoingApprovals: true }',
  },
  {
    name: 'Account sequence mismatch',
    category: 'signing',
    triggers: ['account sequence mismatch', 'sequence', 'expected sequence', 'wrong sequence'],
    explanation: 'The transaction nonce (sequence) doesn\'t match what the chain expects. This happens when sending multiple transactions quickly or after a failed transaction.',
    fix: 'Wait for the previous transaction to be confirmed before sending the next one. Or query the account to get the current sequence: GET /cosmos/auth/v1beta1/accounts/{address}',
  },
  {
    name: 'Insufficient gas',
    category: 'signing',
    triggers: ['out of gas', 'insufficient gas', 'gas wanted', 'gas limit'],
    explanation: 'The gas limit in the fee is too low for this transaction. Complex transactions (many approvals, metadata) need more gas.',
    fix: 'Increase the gas limit. Default 500000 works for simple transactions. Use 1000000+ for complex ones. Use simulate_transaction to estimate gas.',
  },
  {
    name: 'Insufficient funds',
    category: 'signing',
    triggers: ['insufficient funds', 'insufficient balance', 'not enough', 'ubadge'],
    explanation: 'The sending account doesn\'t have enough BADGE tokens for gas fees or coin transfers.',
    fix: 'Fund the account with BADGE tokens. On testnet, use the faucet. On mainnet, acquire BADGE from a DEX or the BitBadges app.',
  },
  {
    name: 'Invalid address format',
    category: 'address',
    triggers: ['invalid address', 'bech32', 'decoding bech32', 'invalid prefix', 'checksum', 'address format'],
    explanation: 'BitBadges addresses must be bb1-prefixed bech32 addresses. Ethereum 0x addresses need to be converted first.',
    fix: 'Use convert_address or ethToCosmos() to convert 0x addresses to bb1 format before using them in transactions.',
    example: 'const bb1Addr = ethToCosmos("0x1234...");'
  },
  {
    name: 'Collection not found',
    category: 'query',
    triggers: ['collection not found', 'collection does not exist', 'invalid collection', 'unknown collection'],
    explanation: 'The collection ID doesn\'t exist on the chain. For new collections, use collectionId: "0" which auto-assigns.',
    fix: 'Check the collection ID. For creating new collections, use collectionId: "0". For existing collections, verify the ID via search or query_collection.',
  },
  {
    name: 'Missing autoApproveAllIncomingTransfers',
    category: 'approval',
    triggers: ['incoming', 'cannot receive', 'recipient', 'autoApprove', 'incoming transfer not approved'],
    explanation: 'The recipient hasn\'t approved incoming transfers. For public-mint collections, defaultBalances must include autoApproveAllIncomingTransfers: true.',
    fix: 'In your MsgUniversalUpdateCollection, add to defaultBalances: { autoApproveAllIncomingTransfers: true }. This allows all users to receive tokens by default.',
  },
  {
    name: 'Smart token backing address mismatch',
    category: 'smart-token',
    triggers: ['backing address', 'backed minting', 'ibc denom', 'cosmosCoinBackedPath', 'backing mismatch'],
    explanation: 'The backing address in approvals doesn\'t match the deterministic address computed from the IBC denom. Backing addresses are computed via SHA256 hash of the denom.',
    fix: 'Use generate_backing_address or lookup_token_info to get the correct backing address for your IBC denom. Use this exact address in your approval fromListId/toListId.',
  },
  {
    name: 'UintRange format error',
    category: 'serialization',
    triggers: ['UintRange', 'start', 'end', 'range', 'missing start', 'missing end'],
    explanation: 'UintRange objects require both "start" and "end" fields as string numbers. For "all time" or "all IDs", use start: "1" and end: "18446744073709551615" (max uint64).',
    fix: 'Ensure all range objects have both start and end as strings: { "start": "1", "end": "18446744073709551615" }',
    example: '{ "start": "1", "end": "18446744073709551615" }  // max range'
  },
  {
    name: 'Token metadata missing tokenIds',
    category: 'metadata',
    triggers: ['tokenMetadata', 'tokenIds', 'metadata missing', 'metadata token'],
    explanation: 'Each tokenMetadata entry must include a tokenIds array specifying which tokens it applies to.',
    fix: 'Add tokenIds to each tokenMetadata entry: { uri: "...", customData: "", tokenIds: [{ start: "1", end: "100" }] }',
  },
  {
    name: 'Permission already frozen',
    category: 'permissions',
    triggers: ['permission', 'frozen', 'forbidden', 'permanently', 'cannot update', 'locked'],
    explanation: 'A permission has been permanently forbidden and cannot be changed. Once locked via permanentlyForbiddenTimes covering all time, it\'s irreversible.',
    fix: 'This is by design — locked permissions are immutable. Check the collection\'s permissions before attempting updates. Use query_collection to see current permission state.',
  },
  {
    name: 'EVM RPC vs Cosmos RPC confusion',
    category: 'evm',
    triggers: ['rpc', 'evm', 'ethers', 'web3', 'provider', 'jsonrpc', 'method not found'],
    explanation: 'BitBadges has separate RPC endpoints for EVM (evm.bitbadges.io) and Cosmos (rpc.bitbadges.io). Using the wrong one causes method-not-found errors.',
    fix: 'Use evm.bitbadges.io for ethers.js/web3.js calls. Use rpc.bitbadges.io for Cosmos/CometBFT calls. Use lcd.bitbadges.io for REST API calls.',
  },
  {
    name: 'EVM uint64 vs uint256',
    category: 'evm',
    triggers: ['uint64', 'uint256', 'overflow', 'truncat', 'precompile', 'range at index', 'greater than max'],
    explanation: 'BitBadges EVM precompiles use uint64 for token IDs, amounts, and timestamps — not uint256. Using type(uint256).max causes "range at index 0 has end X greater than max 18446744073709551615".',
    fix: 'Use type(uint64).max (18446744073709551615) for "forever" ranges, not type(uint256).max. Import MAX_UINT64 / FOREVER from TokenizationHelpers.sol.',
    example: 'string memory ownershipTimesJson = TokenizationJSONHelpers.uintRangeToJson(1, type(uint64).max);'
  },
  {
    name: 'EVM execution reverted from precompile',
    category: 'evm',
    triggers: ['execution reverted', 'revert', 'precompile error', 'evm error'],
    explanation: 'A precompile call reverted. The underlying Cosmos module returned an error which gets wrapped in an EVM revert. Common causes: invalid JSON, missing required fields, permission denied, insufficient balance, approval not found.',
    fix: 'Check the revert reason string — it contains the Cosmos error message. Common fixes: (1) verify JSON format matches protobuf schema, (2) check msg.sender has permission (is creator/manager), (3) verify the collection/store exists, (4) check approval criteria are met. Use simulate_transaction first to catch errors.',
  },
  {
    name: 'Dynamic store "address cannot be empty" from EVM',
    category: 'evm',
    triggers: ['address cannot be empty', 'dynamic store', 'setDynamicStoreValue', 'getDynamicStoreValue'],
    explanation: 'The JSON field name for the address is wrong. Dynamic store operations use "address" not "userAddress" in the JSON parameter.',
    fix: 'Use "address" field in JSON: {"storeId":"123","address":"0x742d...","value":true}. The TokenizationJSONHelpers.setDynamicStoreValueJSON() handles this correctly.',
  },
  {
    name: 'EVM contract size limit exceeded',
    category: 'evm',
    triggers: ['contract code size', 'exceeds maximum', 'code size limit', 'stack too deep', 'spurious dragon'],
    explanation: 'The deployed contract bytecode exceeds the EVM limit (24KB). Complex contracts that use many helper libraries can hit this.',
    fix: 'Split your contract into multiple smaller contracts. The BitBadges test contracts demonstrate this pattern: PrecompileTestContract, PrecompileDynamicStoreTestContract, PrecompileCollectionTestContract, PrecompileTransferTestContract. Use libraries and delegate calls to reduce individual contract size.',
  },
  {
    name: 'EVM timestamp seconds vs milliseconds',
    category: 'evm',
    triggers: ['timestamp', 'millisecond', 'ownership time', 'block.timestamp', 'time range'],
    explanation: 'BitBadges uses milliseconds internally for all timestamps (ownershipTimes, transferTimes). Solidity block.timestamp is in seconds. Passing block.timestamp directly produces times in the distant past from BitBadges perspective.',
    fix: 'Multiply block.timestamp by 1000 when passing to BitBadges precompiles: block.timestamp * 1000. When reading BitBadges timestamps, divide by 1000 for Solidity comparison.',
  },
  {
    name: 'BADGE decimal mismatch between Cosmos and EVM (x/precisebank)',
    category: 'evm',
    triggers: ['decimal', 'abadge', 'ubadge', 'precisebank', 'wrong amount', 'balance mismatch', '18 decimal', '9 decimal', 'wei'],
    explanation: 'BADGE uses different decimal representations: ubadge (9 decimals) in Cosmos SDK and abadge (18 decimals, like wei) in EVM. address(this).balance in Solidity returns abadge. SendManager precompile JSON uses ubadge amounts. Mixing these up causes amount mismatches.',
    fix: 'In Cosmos (API, gas, IBC): use ubadge (9 decimals). In Solidity native balance: abadge (18 decimals). SendManager.send() JSON: ubadge amounts. To convert: 1 ubadge = 1e9 abadge. x/precisebank handles sub-ubadge fractions automatically.',
  },
  {
    name: 'Wrong precompile address',
    category: 'evm',
    triggers: ['wrong precompile', 'invalid address', 'not a precompile', 'call to non-contract'],
    explanation: 'Calling the wrong precompile address or a non-precompile address. Tokenization is 0x1001, GAMM is 0x1002, SendManager is 0x1003, Staking is 0x0800, Distribution is 0x0801.',
    fix: 'Use the correct precompile addresses: Tokenization (0x0000...1001), GAMM (0x0000...1002), SendManager (0x0000...1003). Import from ITokenizationPrecompile.sol / IGammPrecompile.sol / ISendManagerPrecompile.sol.',
  },

  // Mutual exclusivity errors
  {
    name: 'predeterminedBalances + approvalAmounts conflict',
    category: 'approvals',
    triggers: ['predetermined', 'approvalAmounts', 'mutually exclusive', 'incompatible'],
    explanation: 'An approval has both predeterminedBalances and approvalAmounts set. These are mutually exclusive — use predeterminedBalances for sequential/incremented minting (subscriptions, NFTs) or approvalAmounts for flat supply caps (fungible tokens).',
    fix: 'Remove either predeterminedBalances or approvalAmounts from the approval. For sequential minting use predeterminedBalances only. For flat supply caps use approvalAmounts only.',
  },
  {
    name: 'durationFromTimestamp + recurringOwnershipTimes conflict',
    category: 'approvals',
    triggers: ['durationFromTimestamp', 'recurringOwnershipTimes', 'mutually exclusive'],
    explanation: 'An approval has both durationFromTimestamp (non-zero) and recurringOwnershipTimes (non-zero fields). These are mutually exclusive time-bounding approaches.',
    fix: 'Set recurringOwnershipTimes to all zeros ({ startTime: "0", intervalLength: "0", chargePeriodLength: "0" }) when using durationFromTimestamp, or set durationFromTimestamp to "0" when using recurringOwnershipTimes.',
  },
  {
    name: 'SDK constructor crash',
    category: 'validation',
    triggers: ['Cannot read properties of undefined', 'Expected array', 'is not a function', 'map', 'constructor'],
    explanation: 'The SDK MsgUniversalUpdateCollection constructor crashed because a required nested field is missing or has the wrong type. Common culprits: missing resetTimeIntervals, missing orderCalculationMethod, arrays expected but got undefined.',
    fix: 'Ensure all nested objects have required sub-fields. Common fixes: add resetTimeIntervals: { startTime: "0", intervalLength: "0" } to maxNumTransfers/approvalAmounts, add orderCalculationMethod with exactly one true field to predeterminedBalances.',
  },
  {
    name: 'Denom not in allowed denoms list',
    category: 'transfer',
    triggers: ['is not in the allowed denoms list', 'allowed denoms', 'denom not allowed', 'allowedDenoms'],
    explanation: 'The coin denom used in a coinTransfer is not on the chain\'s AllowedDenoms list. The chain enforces an allowlist for coin transfers — if the list is non-empty, every denom must either appear on it or use the "badgeslp:" prefix (liquidity pool shares).',
    fix: 'Check the chain\'s allowed denoms list and use only approved denoms. Common allowed denoms include "ubadge" and standard IBC denoms (ibc/...). If you need a custom denom, it must be added to the chain\'s AllowedDenoms parameter via governance. Liquidity pool shares (badgeslp:*) are always allowed.',
  },
  {
    name: 'Duplicate approvalId',
    category: 'approvals',
    triggers: ['duplicate', 'approvalId', 'already exists', 'unique'],
    explanation: 'Two or more approvals share the same approvalId. Each approval must have a unique ID. Use the generate_unique_id tool to create collision-free IDs for new approvals.',
    fix: 'Call generate_unique_id with a descriptive prefix for each new approval. For existing approvals being updated, preserve the original ID.',
  }
];

export const errorPatternsResourceInfo = {
  uri: 'bitbadges://errors/patterns',
  name: 'Error Patterns',
  description: 'Common error messages mapped to diagnoses and fixes',
  mimeType: 'text/markdown'
};

/**
 * Get all error patterns as markdown
 */
export function getErrorPatternsContent(): string {
  let content = '# BitBadges Error Patterns\n\n';
  content += 'Common errors and how to fix them.\n\n';

  const byCategory: Record<string, ErrorPattern[]> = {};
  for (const pattern of ERROR_PATTERNS) {
    if (!byCategory[pattern.category]) {
      byCategory[pattern.category] = [];
    }
    byCategory[pattern.category].push(pattern);
  }

  for (const [category, patterns] of Object.entries(byCategory)) {
    content += `## ${category.charAt(0).toUpperCase() + category.slice(1)}\n\n`;
    for (const pattern of patterns) {
      content += `### ${pattern.name}\n\n`;
      content += `**Triggers:** ${pattern.triggers.join(', ')}\n\n`;
      content += `${pattern.explanation}\n\n`;
      content += `**Fix:** ${pattern.fix}\n\n`;
      if (pattern.example) {
        content += `**Example:** \`${pattern.example}\`\n\n`;
      }
    }
  }

  return content;
}
