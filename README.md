# BitBadges Builder MCP Server

MCP (Model Context Protocol) server for building, auditing, and explaining BitBadges collections via AI. Works with Claude Desktop, Claude Code, Cursor, and any MCP-compatible client.

## Quick Start

### 1. Install via npm

```bash
npm install -g bitbadges-builder-mcp
```

Or use npx (no install needed):
```bash
npx bitbadges-builder-mcp
```

### 2. Configure Your MCP Client

**Claude Desktop** (`~/.config/claude/config.json`):
```json
{
  "mcpServers": {
    "bitbadges-builder": {
      "command": "npx",
      "args": ["bitbadges-builder-mcp"],
      "env": {
        "BITBADGES_API_KEY": "your-api-key-here",
        "BITBADGES_MNEMONIC": "your mnemonic for signing (optional)"
      }
    }
  }
}
```

**Claude Code** (`.mcp.json` in project root):
```json
{
  "mcpServers": {
    "bitbadges-builder": {
      "command": "npx",
      "args": ["bitbadges-builder-mcp"],
      "env": {
        "BITBADGES_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

**Cursor** (Settings > MCP Servers > Add):
```json
{
  "command": "npx",
  "args": ["bitbadges-builder-mcp"],
  "env": {
    "BITBADGES_API_KEY": "your-api-key-here"
  }
}
```

### 3. Get an API Key

Get your free API key at: **https://bitbadges.io/developer**

The API key enables query tools (`query_collection`, `query_balance`, `simulate_transaction`, `verify_ownership`, `search`). Builder tools work without an API key.

### 4. Start Building

> "Create a 1000-supply NFT collection with 5 BADGE mint price"

> "Build a USDC stablecoin vault with 100/day withdraw limit"

> "Explain collection 123 to me"

> "Audit this collection for security risks"

## Related Tools

| Tool | Install | Description |
|------|---------|-------------|
| **BitBadges MCP** (this) | `npm i -g bitbadges-builder-mcp` | AI-powered collection builder, auditor, and explainer |
| **BitBadges SDK** | `npm i bitbadgesjs-sdk` | TypeScript SDK for API, signing, address conversion |
| **BitBadges API** | https://bitbadges.io/developer | REST API for querying collections, balances, ownership |
| **BitBadges Docs** | https://docs.bitbadges.io | Full documentation |
| **BitBadges Explorer** | https://explorer.bitbadges.io | On-chain explorer |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `BITBADGES_API_KEY` | For query tools | API key from https://bitbadges.io/developer |
| `BITBADGES_MNEMONIC` | For signing | BIP-39 mnemonic for `sign_and_broadcast` tool |
| `BITBADGES_PRIVATE_KEY` | For signing | Alternative to mnemonic (hex private key) |

**Security**: Mnemonics and private keys are used locally only. They are never sent to BitBadges servers. The MCP server runs on your machine.

## Available Tools (32)

### Collection Builders

| Tool | Description |
|------|-------------|
| `build_smart_token` | Build IBC-backed smart token (stablecoin, wrapped asset) |
| `build_fungible_token` | Build ERC-20 style fungible token |
| `build_nft_collection` | Build NFT collection with minting config |

### Collection Analysis

| Tool | Description |
|------|-------------|
| `audit_collection` | Audit for security risks, design flaws, supply inflation vectors |
| `explain_collection` | Human-readable markdown report with Q&A support |
| `analyze_collection` | Structured analysis of on-chain collection (requires API key) |

### Component Builders

| Tool | Description |
|------|-------------|
| `generate_backing_address` | Compute IBC backing address from denom |
| `generate_approval` | Build approval structures by type |
| `generate_permissions` | Build permission presets |
| `generate_alias_path` | Build alias path for liquidity pools |

### Dynamic Stores

| Tool | Description |
|------|-------------|
| `build_dynamic_store` | Create/update/delete on-chain allowlists and blocklists |
| `query_dynamic_store` | Query dynamic store values and metadata |

### Transfer Tools

| Tool | Description |
|------|-------------|
| `build_transfer` | Build MsgTransferTokens with auto-queried approval matching |

### Query Tools (Require API Key)

| Tool | Description |
|------|-------------|
| `query_collection` | Fetch collection details |
| `query_balance` | Check token balance for an address |
| `simulate_transaction` | Dry-run transaction for validity and gas estimation |
| `verify_ownership` | Verify if address meets AND/OR/NOT ownership requirements |
| `search` | Search collections, accounts, and tokens |

### Signing & Broadcasting

| Tool | Description |
|------|-------------|
| `sign_and_broadcast` | Sign with mnemonic/private key and broadcast |
| `broadcast` | Broadcast a pre-signed transaction |
| `publish_to_bitbadges` | Publish transaction and get import link |

### Utilities

| Tool | Description |
|------|-------------|
| `validate_transaction` | Validate JSON against critical rules |
| `convert_address` | Convert between ETH (0x) and BitBadges (bb1) formats |
| `validate_address` | Check if address is valid and detect chain type |
| `lookup_token_info` | Get token symbol, denom, decimals, backing address |
| `get_current_timestamp` | Get current time for time-dependent configs |
| `fetch_docs` | Fetch live documentation from docs.bitbadges.io |

### Knowledge Base

| Tool | Description |
|------|-------------|
| `get_skill_instructions` | Get detailed instructions for a specific skill |
| `get_master_prompt` | Get complete builder rules and critical rules |
| `search_knowledge_base` | Search embedded docs, learnings, recipes, error patterns |
| `diagnose_error` | Diagnose transaction errors and suggest fixes |
| `add_learning` | Add new gotchas/tips to persistent knowledge base |

## Skills (31)

Skills are detailed instruction sets the AI loads on-demand via `get_skill_instructions(skillId)`:

### Token Types
`nft-collection`, `fungible-token`, `smart-token`, `subscription`

### Approval Configuration
`public-mint`, `minting`, `ibc-backed-minting`, `post-mint-transferability`, `forceful-overrides`, `custom-2fa`, `avoid-manual-balances`, `time-dependent-balances`, `mint-escrow`

### Features
`bb-402`, `ai-criteria-gate`, `dynamic-stores`, `collection-recipes`, `tradable`, `liquidity-pools`, `alias-path`, `cosmos-coin-wrapper`, `immutability`, `evm-query-challenges`

### Advanced
`permissions`, `collection-audit`, `explain-collection`, `update-collection`, `evm-precompiles`, `address-and-signing`, `ibc-and-hooks`, `bitbadges-api`

## Build -> Audit -> Deploy Pipeline

The MCP enforces a mandatory pipeline for new collections:

```
1. Build    -> build_nft_collection / build_fungible_token / build_smart_token
2. Audit    -> audit_collection (catch security issues)
3. Explain  -> explain_collection (show user what they built)
4. Validate -> validate_transaction (check JSON format)
5. Simulate -> simulate_transaction (dry-run on chain)
6. Deploy   -> sign_and_broadcast
```

## Examples

### Create Smart Token (USDC Stablecoin)

```typescript
const result = await build_smart_token({
  ibcDenom: "USDC",
  creatorAddress: "bb1...",
  name: "Wrapped USDC",
  symbol: "wUSDC",
  dailyWithdrawLimit: "100000000", // 100 USDC
  swappable: true
});
```

### Create NFT Collection

```typescript
const result = await build_nft_collection({
  creatorAddress: "bb1...",
  name: "My NFT Collection",
  totalSupply: "1000",
  mintPrice: "5000000000", // 5 BADGE
  mintPriceDenom: "ubadge",
  tradable: true
});
```

### Audit a Collection

```typescript
const audit = await audit_collection({
  collection: result.transaction,
  context: "NFT art collection"
});
// Returns: { findings: [...], summary: { critical: 0, warning: 2, ... } }
```

### Explain a Collection

```typescript
const explanation = await explain_collection({
  collection: result.transaction,
  audience: "user"
});
// Returns: human-readable markdown report

// Or ask a specific question:
const answer = await explain_collection({
  collection: result.transaction,
  question: "can the manager freeze my tokens?"
});
```

## Supported Tokens

| Symbol | IBC Denom | Decimals |
|--------|-----------|----------|
| BADGE | ubadge (Cosmos) / abadge (EVM) | 9 / 18 |
| USDC | ibc/F082B65... | 6 |
| ATOM | ibc/A4DB47... | 6 |
| OSMO | ibc/ED07A3... | 6 |

## Local Development

```bash
git clone https://github.com/bitbadges/bitbadges-builder-mcp.git
cd bitbadges-builder-mcp
npm install
npm run build
npm run dev    # Run with tsx (hot reload)
npm test       # Run tests
```

## License

MIT
