/**
 * Learnings Resource
 * Static knowledge base of gotchas, tips, and discoveries
 */

export interface LearningEntry {
  topic: string;
  title: string;
  content: string;
  severity: 'critical' | 'important' | 'tip';
}

/**
 * Static learnings — curated gotchas and tips from building with BitBadges
 */
const LEARNINGS: LearningEntry[] = [
  // Approvals
  {
    topic: 'approvals',
    title: 'prioritizedApprovals MUST be specified in MsgTransferTokens',
    content: 'Even if empty ([]), the prioritizedApprovals field must be present in every transfer. Missing it causes silent failures or unexpected approval matching.',
    severity: 'critical'
  },
  {
    topic: 'approvals',
    title: 'Mint approvals require overridesFromOutgoingApprovals: true',
    content: 'Any approval with fromListId: "Mint" MUST have approvalCriteria.overridesFromOutgoingApprovals: true. Without this, the Mint address cannot send tokens.',
    severity: 'critical'
  },
  {
    topic: 'approvals',
    title: 'autoApproveAllIncomingTransfers needed for public mint',
    content: 'When creating public-mint collections, set autoApproveAllIncomingTransfers: true in defaultBalances. Otherwise recipients cannot receive minted tokens.',
    severity: 'critical'
  },
  {
    topic: 'approvals',
    title: 'Overrides do not matter for backing or unbacking approvals',
    content: 'Both the backing address and unbacking address are protocol-controlled with auto-set approvals, so overridesFromOutgoingApprovals and overridesToIncomingApprovals on both backing and unbacking approvals are irrelevant (true or false both work). Best practice: leave unset or false, and keep noForcefulPostMintTransfers: true. Smart tokens do NOT need forceful transfer overrides.',
    severity: 'tip'
  },

  // Signing — educational (your app is responsible for signing)
  {
    topic: 'signing',
    title: 'Two separate signing flows: EVM and Cosmos',
    content: 'BitBadges supports two signing paths. EVM path: use an Ethereum wallet/signer (MetaMask, ethers.js) to call EVM precompiles via JSON-RPC. Cosmos path: use Cosmos signDirect (Keplr, CosmJS) for standard Cosmos transactions. They produce DIFFERENT addresses from the same key (ETH keccak256 vs Cosmos ripemd160/sha256). Both use coin type 60 HD path.',
    severity: 'critical'
  },
  {
    topic: 'signing',
    title: 'EVM and Cosmos simulation both supported',
    content: 'EVM path uses eth_estimateGas via JSON-RPC. Cosmos path uses the /api/v0/simulate endpoint. Both return gasUsed, gasLimit, and fee.',
    severity: 'important'
  },
  {
    topic: 'signing',
    title: 'convertToBitBadgesAddress is byte-level, not pubkey derivation',
    content: 'convertToBitBadgesAddress() does byte-level 0x↔bb1 bech32 conversion. It does NOT derive an address from a public key. For pubkey→address derivation, use cosmosAddressFromPublicKey().',
    severity: 'important'
  },
  {
    topic: 'signing',
    title: 'Account sequence mismatch on rapid transactions',
    content: 'When sending multiple transactions quickly via Cosmos path, you may get "account sequence mismatch". Implement retry logic with incrementing sequence. EVM path handles nonces automatically via the provider.',
    severity: 'important'
  },
  {
    topic: 'signing',
    title: 'Coin type 60 for ALL BitBadges wallets',
    content: 'BitBadges uses coin type 60 (Ethereum derivation path m/44\'/60\'/...) for all wallets including Keplr. This means the same mnemonic produces the same key material regardless of Cosmos vs EVM wallet.',
    severity: 'important'
  },

  // Smart Tokens
  {
    topic: 'smart-tokens',
    title: 'Smart tokens mint from backing address, not Mint',
    content: 'Unlike regular tokens that use fromListId: "Mint", smart tokens mint from the deterministic backing address. The backing approval fromListId should be "bb1backingaddress..." not "Mint".',
    severity: 'critical'
  },
  {
    topic: 'smart-tokens',
    title: 'Two approvals required, transferable is optional',
    content: 'Smart tokens REQUIRE two approvals: (1) backing: from backing address to users (mustPrioritize: true, allowBackedMinting: true, overridesFromOutgoingApprovals: true), (2) unbacking: from users to backing address (mustPrioritize: true, allowBackedMinting: true, overridesFromOutgoingApprovals: false). A third transferable approval (from regular holders to regular holders) is COMMON for wrapped assets but OPTIONAL — omit it for simple deposit/withdraw vaults or escrows where tokens should not move between users.',
    severity: 'important'
  },

  // SDK
  {
    topic: 'sdk',
    title: 'All numbers must be strings in transaction JSON',
    content: 'BitBadges uses string-encoded uint64 values everywhere. Using number types instead of strings causes serialization failures. Always use "100" not 100.',
    severity: 'critical'
  },
  {
    topic: 'sdk',
    title: 'UintRange requires both start and end as strings',
    content: 'UintRange objects must have both "start" and "end" fields as string-encoded numbers. Missing either field or using numbers causes validation failures.',
    severity: 'important'
  },

  // EVM
  {
    topic: 'evm',
    title: 'EVM precompiles use uint64 not uint256',
    content: 'BitBadges EVM precompile functions use uint64 for token IDs and amounts, NOT uint256 like standard ERC contracts. This causes silent truncation if you pass large values.',
    severity: 'important'
  },
  {
    topic: 'evm',
    title: 'RPC URL confusion between EVM and Cosmos',
    content: 'The Cosmos RPC (rpc.bitbadges.io) and EVM RPC (evm-rpc.bitbadges.io) are different endpoints. Use evm-rpc.bitbadges.io for ethers/web3 calls and rpc.bitbadges.io for Cosmos/CometBFT calls.',
    severity: 'important'
  },
  {
    topic: 'evm',
    title: 'x/precisebank: BADGE is 9 decimals in Cosmos, 18 in EVM',
    content: 'BADGE has three denoms: BADGE (display), ubadge (9 decimals, Cosmos base), abadge (18 decimals / 0 = EVM base). In Solidity, address.balance returns abadge (18 decimals like wei). SendManager precompile uses ubadge in JSON amounts. MetaMask shows 18-decimal native balance. x/precisebank handles fractional ubadge conversion. IBC tokens do NOT have precisebank.',
    severity: 'critical'
  },
  {
    topic: 'evm',
    title: 'block.timestamp is seconds, BitBadges uses milliseconds',
    content: 'Solidity block.timestamp is in seconds. BitBadges ownershipTimes and transferTimes are in milliseconds. Multiply by 1000 when passing block.timestamp to precompile calls: block.timestamp * 1000.',
    severity: 'critical'
  },
  {
    topic: 'evm',
    title: 'Precompile msg.sender is auto-set as creator',
    content: 'Never include the creator field in JSON passed to precompiles. The precompile automatically uses msg.sender as the transaction creator. Including it causes field conflicts.',
    severity: 'important'
  },
  {
    topic: 'evm',
    title: 'Dynamic store JSON uses "address" not "userAddress"',
    content: 'When calling setDynamicStoreValue or getDynamicStoreValue via precompile, use the field name "address" in the JSON, not "userAddress". Wrong field causes "address cannot be empty" error.',
    severity: 'important'
  },
  {
    topic: 'evm',
    title: 'executeMultiple batches tokenization precompile calls',
    content: 'Use ITokenizationPrecompile.executeMultiple(MessageInput[]) to batch multiple tokenization operations in one EVM transaction. Each MessageInput has messageType (e.g., "transferTokens") and msgJson. Only works for tokenization precompile — cannot batch cross-precompile.',
    severity: 'tip'
  },

  // Mutual exclusivity rules
  {
    topic: 'approvals',
    title: 'predeterminedBalances and approvalAmounts are mutually exclusive',
    content: 'An approval cannot have both predeterminedBalances (sequential/incremented minting) and approvalAmounts (flat amount limits). Use one or the other. The chain rejects transactions where both are set on the same approval.',
    severity: 'critical'
  },
  {
    topic: 'approvals',
    title: 'durationFromTimestamp and recurringOwnershipTimes are mutually exclusive',
    content: 'If durationFromTimestamp is non-zero, recurringOwnershipTimes must be all zeros (startTime, intervalLength, chargePeriodLength all "0"), and vice versa. These are two different time-bounding approaches — the chain rejects if both are active on the same approval.',
    severity: 'critical'
  },
  {
    topic: 'approvals',
    title: 'mintEscrowCoinsToTransfer limited to 1 entry',
    content: 'The chain only supports a single coin entry in mintEscrowCoinsToTransfer. If you need to escrow multiple denominations, use separate transactions or a single combined denomination.',
    severity: 'critical'
  },
  {
    topic: 'approvals',
    title: 'amountTrackerId should be unique per approval unless intentionally shared',
    content: 'Each approval should have its own amountTrackerId (defaults to the approvalId). Sharing tracker IDs across approvals means they share counters — usually a bug unless you explicitly want shared limits across multiple approval paths.',
    severity: 'tip'
  },

  // Permissions
  {
    topic: 'permissions',
    title: 'Permissions can only get MORE restrictive, never relaxed',
    content: 'Once a permission is set to FORBIDDEN (permanentlyForbiddenTimes), it can never be changed back. Permissions can only move from NEUTRAL → FORBIDDEN, never FORBIDDEN → NEUTRAL or PERMITTED. Plan permission lockdown carefully — there is no undo.',
    severity: 'critical'
  },

  // Post-creation transfers
  {
    topic: 'claims',
    title: 'Pass _expectedVersion when completing claims via API',
    content: 'When auto-completing claims via the BitBadges API, pass _expectedVersion to prevent race conditions. If the claim has been updated since you last read it, the call fails. Pass -1 to skip version checking (not recommended for production).',
    severity: 'tip'
  },
  {
    topic: 'approvals',
    title: 'altTimeChecks for business-hours restrictions',
    content: 'The altTimeChecks field on approval criteria allows denying transfers during specific UTC hours (offlineHours: 0-23) or days of week (offlineDays: 0=Sunday to 6=Saturday). Works in addition to transferTimes. Useful for compliance/RWA tokens that should only trade during business hours.',
    severity: 'tip'
  },
  {
    topic: 'transfers',
    title: 'collectionId "0" in MsgTransferTokens auto-lookups latest collection',
    content: 'When building post-creation transfer messages (e.g., auto-mint after collection creation), use collectionId "0" in MsgTransferTokens. The chain auto-resolves it to the latest collection ID created in the same transaction. This is required because the real collection ID is not known until the transaction is processed.',
    severity: 'tip'
  }
];

export const learningsResourceInfo = {
  uri: 'bitbadges://learnings/all',
  name: 'Learnings & Gotchas',
  description: 'Known gotchas, tips, and discoveries from building with BitBadges',
  mimeType: 'text/markdown'
};

/**
 * Get all learnings as markdown
 */
export function getLearningsContent(): string {
  const byTopic: Record<string, LearningEntry[]> = {};

  for (const entry of LEARNINGS) {
    if (!byTopic[entry.topic]) {
      byTopic[entry.topic] = [];
    }
    byTopic[entry.topic].push(entry);
  }

  let content = '# BitBadges Learnings & Gotchas\n\n';
  content += 'Known issues, tips, and discoveries. Severity: CRITICAL > important > tip.\n\n';

  for (const [topic, entries] of Object.entries(byTopic)) {
    content += `## ${topic.charAt(0).toUpperCase() + topic.slice(1)}\n\n`;

    // Sort by severity
    const severityOrder = { critical: 0, important: 1, tip: 2 };
    entries.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    for (const entry of entries) {
      const badge = entry.severity === 'critical' ? '[CRITICAL]' :
                    entry.severity === 'important' ? '[IMPORTANT]' : '[TIP]';
      content += `### ${badge} ${entry.title}\n\n`;
      content += `${entry.content}\n\n`;
    }
  }

  return content;
}

/**
 * Get learnings for a specific topic
 */
export function getLearningsByTopic(topic: string): LearningEntry[] {
  return LEARNINGS.filter(l => l.topic === topic);
}
