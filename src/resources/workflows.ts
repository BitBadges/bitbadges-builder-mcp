/**
 * Workflow Chains Resource
 * Step-by-step tool chains for common multi-step operations
 */

export const workflowsResourceInfo = {
  uri: 'bitbadges://workflows/all',
  name: 'Workflow Chains',
  description: 'Step-by-step tool chains for common multi-step BitBadges operations',
  mimeType: 'text/markdown'
};

const WORKFLOWS_CONTENT = {
  overview: `# BitBadges Workflow Chains

Multi-step tool sequences for common operations. Each workflow lists the exact MCP tools to call in order.`,

  bb402Acquire: `## BB-402: Acquire Tokens to Gain Access

When a server returns HTTP 402 with ownership requirements:

\`\`\`
Step 1: Parse the 402 response
  → Extract ownershipRequirements.tokens[].collectionId and tokenIds

Step 2: analyze_collection(collectionId)
  → Read the howToObtain section
  → Identify: mint approval, payment required, limits, prerequisites

Step 3: Check if you already own the token
  → query_balance(collectionId, yourAddress)
  → If balance >= required amount, skip to Step 6

Step 4: Build the transfer to obtain tokens
  → build_transfer(collectionId, "Mint", yourAddress, intent: "mint")
  → Or for smart tokens: build_transfer(collectionId, backingAddr, yourAddress, intent: "deposit")

Step 5: Sign and broadcast
  → Return transaction JSON for user to sign with their wallet and broadcast

Step 6: Retry the original request with proof
  → Sign the server's challenge message
  → Include X-BB-Proof header
  → Server verifies ownership → 200 OK
\`\`\``,

  createAndGate: `## Create a Token-Gated Resource

Set up a new collection and use it for BB-402 gating:

\`\`\`
Step 1: Choose token design
  → get_skill_instructions("bb-402") — read "Choosing a Token Design" section
  → Decide: soulbound, subscription, tiered, etc.

Step 2: Build the collection
  → Use per-field tools: set_standards, set_valid_token_ids, set_invariants, add_approval, set_permissions, set_default_balances, set_collection_metadata, set_token_metadata, add_alias_path, set_mint_escrow_coins
  → Or get_skill_instructions("subscription") for subscriptions

Step 3: Validate
  → get_transaction to retrieve the built transaction
  → validate_transaction(transactionJson)
  → Fix any issues

Step 4: Deploy
  → Return transaction JSON for user to sign with their wallet and broadcast
  → Note the collectionId from the response

Step 5: Set up BB-402 on your server
  → Define ownershipRequirements using the new collectionId
  → Implement 402 response, proof verification, ownership checking
  → Use verify_ownership tool for the check
\`\`\``,

  debugTransfer: `## Debug a Failed Transfer

When a transfer transaction fails:

\`\`\`
Step 1: Diagnose the error
  → diagnose_error(errorMessage, context)
  → Read the matched pattern and fix suggestion

Step 2: If "auto-scan failed" or "no matching approval"
  → analyze_collection(collectionId)
  → Check the approvals list — does an approval exist for your transfer type?
  → Check if the approval has mustPrioritize: true

Step 3: Rebuild with correct prioritizedApprovals
  → build_transfer(collectionId, from, to)
  → The tool auto-selects the right approval

Step 4: If payment-related error
  → Check coinTransfers requirements from analyze_collection
  → Ensure sender has sufficient balance for payment

Step 5: Validate and retry
  → validate_transaction(newTransactionJson)
  → Return transaction JSON for user to sign with their wallet and broadcast
\`\`\``,

  smartTokenVault: `## Smart Token Vault: Deposit and Withdraw

Manage an IBC-backed smart token vault:

\`\`\`
DEPOSIT (IBC asset → collection token):
  Step 1: analyze_collection(collectionId)
    → Get backing address and IBC denom from invariants.ibcBacking
  Step 2: build_transfer(collectionId, backingAddress, yourAddress, intent: "deposit")
    → Or send IBC asset directly to backing address via bank transfer
  Step 3: Return transaction for user review
WITHDRAW (collection token → IBC asset):
  Step 1: analyze_collection(collectionId)
    → Get backing address from invariants.ibcBacking
  Step 2: build_transfer(collectionId, yourAddress, backingAddress, intent: "withdraw")
    → Sets prioritizedApprovals to the unbacking approval automatically
  Step 3: Return transaction for user review    → Underlying IBC asset is released to your address

CHECK VAULT BALANCE:
  → query_balance(collectionId, yourAddress) — your vault token balance
  → query_balance(collectionId, backingAddress) — total vault reserves
\`\`\``,

  aiCriteriaGate: `## AI Agent as Criteria Gate

Use an AI agent to verify off-chain criteria, then create an on-chain primitive:

\`\`\`
Step 1: Define your off-chain criteria
  → KYC verification, social proof, reputation score, custom logic
  → The AI agent handles this verification however it wants

Step 2: For each verified user, create an on-chain attestation
  Option A — Mint an NFT to them:
    → build_transfer(collectionId, "Mint", userAddress, intent: "mint")
    → Return transaction JSON for user to sign and broadcast    → User now holds an on-chain proof of verification

  Option B — Add to a dynamic store (via claims API):
    → POST to claims API to add address to a dynamic store
    → The store acts as an on-chain allowlist

Step 3: Use the on-chain primitive everywhere
  → BB-402 ownership check against the collection or store
  → Approval mustOwnTokens referencing the collection
  → Claims plugins checking the dynamic store
  → Any on-chain logic can now reference the AI's off-chain decision
\`\`\`

See get_skill_instructions("ai-criteria-gate") for full details.`,

  exploreCollection: `## Explore an Unknown Collection

Understand what a collection does and how to interact with it:

\`\`\`
Step 1: Get the overview
  → analyze_collection(collectionId)
  → Read: type, transferability summary, standards

Step 2: Understand the approvals
  → Read the approvals array from the analysis
  → Each approval shows: type, from/to, requirements (payment, limits, ownership gates)

Step 3: Check your position
  → query_balance(collectionId, yourAddress)
  → Do you own any tokens? How many?

Step 4: Determine what you can do
  → howToObtain: lists every way to get tokens (mint, deposit, etc.)
  → howToTransfer: lists every way to move tokens (transfer, withdraw, etc.)
  → Each includes the exact prioritizedApprovals to use

Step 5: Act
  → build_transfer with the appropriate intent
  → Return transaction JSON for user to sign with their wallet and broadcast
\`\`\``,

  dynamicStoreAllowlist: `## Dynamic Store: Create and Manage an Allowlist

Set up an on-chain allowlist that gates token transfers:

\`\`\`
Step 1: Create the store
  → build_dynamic_store(action: "create", creator: yourAddress, defaultValue: false)
  → Return transaction JSON for user to sign and broadcast → note the storeId from events

Step 2: Add approved addresses
  → build_dynamic_store(action: "batch_set_values", storeId, entries: [{address, value: true}, ...])
  → return transaction for user review
Step 3: Verify entries
  → query_dynamic_store(action: "get_value", storeId, address: someAddress)
  → Confirm value is true for approved addresses

Step 4: Reference in a collection's approvals
  → When creating/updating a collection, add to approval criteria:
    dynamicStoreChallenges: [{ storeId, ownershipCheckParty: "recipient" }]
  → Now only addresses in the store can receive tokens

Step 5: Ongoing management
  → Add: build_dynamic_store(action: "set_value", storeId, address, value: true)
  → Remove: build_dynamic_store(action: "set_value", storeId, address, value: false)
  → Halt: build_dynamic_store(action: "update", storeId, globalEnabled: false)
  → Monitor: query_dynamic_store(action: "list_values", storeId)
\`\`\``,

  auditCollection: `## Audit a Collection Before Deployment

Run a security audit on any collection build before deploying:

\`\`\`
Step 1: Build the collection
  → Use per-field tools: set_standards, set_valid_token_ids, set_invariants, add_approval, set_permissions, set_default_balances, set_collection_metadata, set_token_metadata, add_alias_path, set_mint_escrow_coins
  → Use get_transaction to retrieve the built transaction

Step 2: Audit
  → audit_collection(collection: result.transaction, context: "nft art collection")
  → Review all CRITICAL findings — these MUST be fixed
  → Review all WARNING findings — decide if they're intentional

Step 3: Fix critical issues
  → Modify the transaction JSON to address findings
  → Common fixes: add overridesFromOutgoingApprovals, add supply limits,
    lock permissions, set autoApproveAllIncomingTransfers

Step 4: Re-audit
  → audit_collection(collection: fixedTransaction)
  → Verify no more CRITICAL findings

Step 5: Deploy
  → validate_transaction(transaction)
  → Return transaction JSON for user to sign with their wallet and broadcast
\`\`\`

Can also audit existing on-chain collections:
\`\`\`
Step 1: → query_collection(collectionId)
Step 2: → audit_collection(collection: queryResult, context: "description")
Step 3: → Present findings to user
\`\`\``
};

export function getWorkflowsContent(): string {
  return Object.values(WORKFLOWS_CONTENT).join('\n\n');
}
