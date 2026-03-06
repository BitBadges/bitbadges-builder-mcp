/**
 * Learnings Resource
 * Persistent knowledge base of gotchas, tips, and discoveries
 * This is the "learn as you go" system — agents add entries via add_learning tool
 */

export interface LearningEntry {
  topic: string;
  title: string;
  content: string;
  severity: 'critical' | 'important' | 'tip';
  timestamp: string;
}

/**
 * In-memory learnings store — seeded with known gotchas
 * New entries are added at runtime via addLearningEntry()
 */
const LEARNINGS: LearningEntry[] = [
  // Approvals
  {
    topic: 'approvals',
    title: 'prioritizedApprovals MUST be specified in MsgTransferTokens',
    content: 'Even if empty ([]), the prioritizedApprovals field must be present in every transfer. Missing it causes silent failures or unexpected approval matching.',
    severity: 'critical',
    timestamp: '2026-01-15T00:00:00Z'
  },
  {
    topic: 'approvals',
    title: 'Mint approvals require overridesFromOutgoingApprovals: true',
    content: 'Any approval with fromListId: "Mint" MUST have approvalCriteria.overridesFromOutgoingApprovals: true. Without this, the Mint address cannot send tokens.',
    severity: 'critical',
    timestamp: '2026-01-15T00:00:00Z'
  },
  {
    topic: 'approvals',
    title: 'autoApproveAllIncomingTransfers needed for public mint',
    content: 'When creating public-mint collections, set autoApproveAllIncomingTransfers: true in defaultBalances. Otherwise recipients cannot receive minted tokens. The MCP NFT builder does NOT set this automatically.',
    severity: 'critical',
    timestamp: '2026-02-10T00:00:00Z'
  },
  {
    topic: 'approvals',
    title: 'Backing address approvals must NOT have overridesFromOutgoingApprovals',
    content: 'Smart token backing/unbacking approvals should NOT set overridesFromOutgoingApprovals: true. The backing address is a special system address.',
    severity: 'important',
    timestamp: '2026-02-10T00:00:00Z'
  },

  // Signing
  {
    topic: 'signing',
    title: 'GenericCosmosAdapter uses Cosmos derivation path',
    content: 'GenericCosmosAdapter.fromMnemonic/fromPrivateKey uses ripemd160/sha256 (standard Cosmos derivation), NOT keccak256 (Ethereum). The chain uses cosmos.crypto.secp256k1.PubKey with keccak256 for sign digest (Ethermint-style).',
    severity: 'important',
    timestamp: '2026-02-20T00:00:00Z'
  },
  {
    topic: 'signing',
    title: 'convertToBitBadgesAddress is byte-level, not pubkey derivation',
    content: 'convertToBitBadgesAddress() does byte-level 0x↔bb1 bech32 conversion. It does NOT derive an address from a public key. For pubkey→address, use cosmosAddressFromPublicKey().',
    severity: 'important',
    timestamp: '2026-02-20T00:00:00Z'
  },
  {
    topic: 'signing',
    title: 'Account sequence mismatch on rapid transactions',
    content: 'When sending multiple transactions quickly, you may get "account sequence mismatch". Wait for each tx to be confirmed before sending the next, or manually increment the sequence number.',
    severity: 'important',
    timestamp: '2026-01-20T00:00:00Z'
  },

  // Smart Tokens
  {
    topic: 'smart-tokens',
    title: 'Smart tokens mint from backing address, not Mint',
    content: 'Unlike regular tokens that use fromListId: "Mint", smart tokens mint from the deterministic backing address. The backing approval fromListId should be "bb1backingaddress..." not "Mint".',
    severity: 'critical',
    timestamp: '2026-02-10T00:00:00Z'
  },
  {
    topic: 'smart-tokens',
    title: 'Both backing and unbacking approvals needed',
    content: 'Smart tokens need two approvals: (1) backing: from backing address to users (mustPrioritize: true, allowBackedMinting: true), (2) unbacking: from users to backing address (same flags). Missing either breaks deposits or withdrawals.',
    severity: 'critical',
    timestamp: '2026-02-10T00:00:00Z'
  },

  // SDK
  {
    topic: 'sdk',
    title: 'All numbers must be strings in transaction JSON',
    content: 'BitBadges uses string-encoded uint64 values everywhere. Using number types instead of strings causes serialization failures. Always use "100" not 100.',
    severity: 'critical',
    timestamp: '2026-01-10T00:00:00Z'
  },
  {
    topic: 'sdk',
    title: 'UintRange requires both start and end as strings',
    content: 'UintRange objects must have both "start" and "end" fields as string-encoded numbers. Missing either field or using numbers causes validation failures.',
    severity: 'important',
    timestamp: '2026-01-10T00:00:00Z'
  },

  // EVM
  {
    topic: 'evm',
    title: 'EVM precompiles use uint64 not uint256',
    content: 'BitBadges EVM precompile functions use uint64 for token IDs and amounts, NOT uint256 like standard ERC contracts. This causes silent truncation if you pass large values.',
    severity: 'important',
    timestamp: '2026-02-27T00:00:00Z'
  },
  {
    topic: 'evm',
    title: 'RPC URL confusion between EVM and Cosmos',
    content: 'The Cosmos RPC (rpc.bitbadges.io) and EVM RPC (evm.bitbadges.io) are different. Use evm.bitbadges.io for ethers/web3 calls and rpc.bitbadges.io for Cosmos/CometBFT calls.',
    severity: 'important',
    timestamp: '2026-02-27T00:00:00Z'
  },
  {
    topic: 'evm',
    title: 'x/precisebank: BADGE is 9 decimals in Cosmos, 18 in EVM',
    content: 'BADGE has three denoms: BADGE (display), ubadge (9 decimals, Cosmos base), abadge (18 decimals / 0 = EVM base). In Solidity, address.balance returns abadge (18 decimals like wei). SendManager precompile uses ubadge in JSON amounts. MetaMask shows 18-decimal native balance. x/precisebank handles fractional ubadge conversion. IBC tokens do NOT have precisebank.',
    severity: 'critical',
    timestamp: '2026-03-06T00:00:00Z'
  },
  {
    topic: 'evm',
    title: 'block.timestamp is seconds, BitBadges uses milliseconds',
    content: 'Solidity block.timestamp is in seconds. BitBadges ownershipTimes and transferTimes are in milliseconds. Multiply by 1000 when passing block.timestamp to precompile calls: block.timestamp * 1000.',
    severity: 'critical',
    timestamp: '2026-03-06T00:00:00Z'
  },
  {
    topic: 'evm',
    title: 'Precompile msg.sender is auto-set as creator',
    content: 'Never include the creator field in JSON passed to precompiles. The precompile automatically uses msg.sender as the transaction creator. Including it causes field conflicts.',
    severity: 'important',
    timestamp: '2026-03-06T00:00:00Z'
  },
  {
    topic: 'evm',
    title: 'Dynamic store JSON uses "address" not "userAddress"',
    content: 'When calling setDynamicStoreValue or getDynamicStoreValue via precompile, use the field name "address" in the JSON, not "userAddress". Wrong field causes "address cannot be empty" error.',
    severity: 'important',
    timestamp: '2026-03-06T00:00:00Z'
  },
  {
    topic: 'evm',
    title: 'executeMultiple batches tokenization precompile calls',
    content: 'Use ITokenizationPrecompile.executeMultiple(MessageInput[]) to batch multiple tokenization operations in one EVM transaction. Each MessageInput has messageType (e.g., "transferTokens") and msgJson. Only works for tokenization precompile — cannot batch cross-precompile.',
    severity: 'tip',
    timestamp: '2026-03-06T00:00:00Z'
  },

  // Signing
  {
    topic: 'signing',
    title: 'Coin type 60 for ALL BitBadges wallets',
    content: 'BitBadges uses coin type 60 (Ethereum derivation path m/44\'/60\'/...) for all wallets including Keplr. This means the same mnemonic produces the same key material regardless of Cosmos vs EVM wallet.',
    severity: 'important',
    timestamp: '2026-03-06T00:00:00Z'
  },
  {
    topic: 'signing',
    title: 'convertToBitBadgesAddress is NOT derivation',
    content: 'convertToBitBadgesAddress() re-encodes bytes between 0x and bb1 formats. It does NOT derive addresses from public keys. For key-to-address derivation, use cosmosAddressFromPublicKey(compressedPubKeyHex, "bb").',
    severity: 'critical',
    timestamp: '2026-03-06T00:00:00Z'
  },

  // Frontend
  {
    topic: 'frontend',
    title: 'Always use AddressSelect for address inputs',
    content: 'Never use text boxes for address inputs. Always use the AddressSelect component which handles validation, format conversion, and display.',
    severity: 'important',
    timestamp: '2026-02-15T00:00:00Z'
  },
  {
    topic: 'frontend',
    title: 'Use CoinDisplay for all amount displays',
    content: 'Never show raw base units (ubadge). Always use CoinDisplay or DenomAmountSelectWithConversion components which handle denomination conversion and display formatting.',
    severity: 'important',
    timestamp: '2026-02-15T00:00:00Z'
  }
];

export const learningsResourceInfo = {
  uri: 'bitbadges://learnings/all',
  name: 'Learnings & Gotchas',
  description: 'Known gotchas, tips, and discoveries from building with BitBadges',
  mimeType: 'text/markdown'
};

/**
 * Add a new learning entry (called by add_learning tool)
 */
export function addLearningEntry(entry: LearningEntry): void {
  // Check for duplicates by title
  const exists = LEARNINGS.some(l => l.title.toLowerCase() === entry.title.toLowerCase());
  if (!exists) {
    LEARNINGS.push(entry);
  }
}

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
