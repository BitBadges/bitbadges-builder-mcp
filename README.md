# BitBadges Builder MCP Server

MCP (Model Context Protocol) server for building, auditing, and querying BitBadges collections via AI. Works with Claude Desktop, Claude Code, Cursor, and any MCP-compatible client.

**This MCP server does not sign or broadcast transactions.** It builds transaction JSON that your application signs and broadcasts using your own wallet/signer.

## Quick Start

### 1. Install

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
        "BITBADGES_API_KEY": "your-api-key-here"
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

The API key enables query tools (see below). Builder, validation, and knowledge tools work without an API key.

### 4. Start Building

> "Create a 1000-supply NFT collection with 5 BADGE mint price"

> "Build a USDC stablecoin vault with 100/day withdraw limit"

> "Explain collection 123 to me"

> "Audit this collection for security risks"

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `BITBADGES_API_KEY` | For query tools | API key from https://bitbadges.io/developer |

No wallet, mnemonic, or private key is needed. This server builds transaction JSON only — your app handles signing and broadcasting.

## How It Works

```
You describe what you want
    ↓
MCP builds transaction JSON (MsgUniversalUpdateCollection, MsgTransferTokens, etc.)
    ↓
audit_collection catches security issues
    ↓
validate_transaction checks JSON format
    ↓
You sign with your wallet (MetaMask, Keplr, SDK, etc.) and broadcast
```

## Available Tools

### Validation & Analysis (no API key needed)

| Tool | Description |
|------|-------------|
| `validate_transaction` | Validate transaction JSON against critical rules |
| `audit_collection` | Audit for security risks, design flaws, supply inflation vectors |
| `explain_collection` | Generate human-readable markdown explanation of a collection |

### Builders (no API key needed)

| Tool | Description |
|------|-------------|
| `build_token` | Universal token builder — any collection type from design axes |
| `build_smart_token` | IBC-backed smart token (stablecoin, wrapped asset) |
| `build_fungible_token` | ERC-20 style fungible token |
| `build_nft_collection` | NFT collection with minting config |
| `build_address_list` | On-chain address list (manager add/remove) |
| `build_claim` | Build claim JSON for the API (code-gated, password-gated, whitelist-gated, open) |

### Components (no API key needed)

| Tool | Description |
|------|-------------|
| `generate_backing_address` | Compute deterministic IBC backing address from denom |
| `generate_approval` | Build approval structures by type |
| `generate_permissions` | Build permission presets |
| `generate_alias_path` | Build alias path for liquidity pools |

### Utilities (no API key needed)

| Tool | Description |
|------|-------------|
| `convert_address` | Convert between ETH (0x) and BitBadges (bb1) formats |
| `validate_address` | Check if address is valid and detect chain type |
| `lookup_token_info` | Get token symbol, denom, decimals, backing address |
| `get_current_timestamp` | Get current time with optional offsets |

### Knowledge (no API key needed)

| Tool | Description |
|------|-------------|
| `get_skill_instructions` | Get detailed instructions for a specific skill |
| `search_knowledge_base` | Search docs, learnings, recipes, error patterns |
| `diagnose_error` | Diagnose transaction errors and suggest fixes |
| `fetch_docs` | Fetch live documentation from docs.bitbadges.io |

### Query Tools (require API key)

| Tool | Description |
|------|-------------|
| `query_collection` | Fetch collection details with field filtering |
| `query_balance` | Check token balance for an address |
| `simulate_transaction` | Dry-run transaction for validity and gas estimation |
| `verify_ownership` | Verify if address meets AND/OR/NOT ownership requirements |
| `search` | Search collections, accounts, and tokens |
| `search_plugins` | Search claim plugins or fetch by ID |
| `analyze_collection` | Query and produce structured collection analysis |
| `build_transfer` | Auto-query collection and build MsgTransferTokens |
| `build_dynamic_store` | Build dynamic store operations (create, update, set values) |
| `query_dynamic_store` | Query dynamic store values and metadata |

## Resources

The MCP server exposes these resources that clients can read for context:

| Resource URI | Description |
|-------------|-------------|
| `bitbadges://rules/critical` | Critical rules for building transactions |
| `bitbadges://tokens/registry` | Token registry (symbol, denom, decimals) |
| `bitbadges://skills/all` | All skill instructions |
| `bitbadges://docs/concepts` | Conceptual documentation |
| `bitbadges://docs/examples` | Example transactions and patterns |
| `bitbadges://recipes/all` | Code recipes and decision matrices |
| `bitbadges://learnings/all` | Known gotchas, tips, and discoveries |
| `bitbadges://errors/patterns` | Error patterns and diagnostics |
| `bitbadges://workflows/all` | Step-by-step workflow chains |
| `bitbadges://schema/token-builder` | Token builder schema reference |
| `bitbadges://docs/frontend` | Reference frontend patterns |

## Skills

Skills are detailed instruction sets loaded on-demand via `get_skill_instructions(skillId)`:

| Skill ID | Description |
|----------|-------------|
| `smart-token` | IBC-backed smart token with 1:1 backing |
| `fungible-token` | ERC-20 style fungible token |
| `nft-collection` | NFT collection design and minting |
| `subscription` | Time-dependent subscription token |
| `bb-402` | Token-gated API access (HTTP 402 pattern) |
| `ai-criteria-gate` | AI agent as criteria verifier |
| `minting` | Minting strategies (public, manager, pricing) |
| `custom-2fa` | Custom 2FA requirements |
| `immutability` | Lock permissions and immutability patterns |
| `liquidity-pools` | Swappable tokens and trading |
| `payment-protocol` | Payment and pricing mechanisms |
| `verified` | Verified credential gates |
| `tradable` | Marketplace trading configuration |
| `address-list` | On-chain address list collections |

## Supported Tokens

| Symbol | IBC Denom | Decimals |
|--------|-----------|----------|
| BADGE | ubadge (Cosmos) / abadge (EVM) | 9 / 18 |
| USDC | ibc/F082B65... | 6 |
| ATOM | ibc/A4DB47... | 6 |
| OSMO | ibc/ED07A3... | 6 |

## Signing & Broadcasting (Your Responsibility)

This MCP server returns unsigned transaction JSON. To submit on-chain:

**Browser (EVM wallet like MetaMask):**
- Call EVM precompiles using ethers.js / viem with the transaction data

**Browser (Cosmos wallet like Keplr):**
- Use Keplr's `signDirect` with the transaction's SignDoc

**Server-side (SDK):**
```typescript
import { GenericEvmAdapter, GenericCosmosAdapter } from 'bitbadgesjs-sdk';

// EVM path (recommended for server-side)
const adapter = GenericEvmAdapter.fromPrivateKey(key, 'https://evm-rpc.bitbadges.io');

// Cosmos path
const adapter = GenericCosmosAdapter.fromPrivateKey(key, 'bitbadges_50024-1');

// Sign and broadcast
const result = await adapter.signAndBroadcast(messages, fee, memo);
```

See [BitBadges SDK docs](https://docs.bitbadges.io) for full signing documentation.

## Related Tools

| Tool | Install | Description |
|------|---------|-------------|
| **BitBadges MCP** (this) | `npm i -g bitbadges-builder-mcp` | AI-powered collection builder, auditor, and explainer |
| **BitBadges SDK** | `npm i bitbadgesjs-sdk` | TypeScript SDK for API, signing, address conversion |
| **BitBadges API** | https://bitbadges.io/developer | REST API for querying collections, balances, ownership |
| **BitBadges Docs** | https://docs.bitbadges.io | Full documentation |
| **BitBadges Explorer** | https://explorer.bitbadges.io | On-chain explorer |

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
