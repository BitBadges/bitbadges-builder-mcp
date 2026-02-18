# BitBadges Builder MCP Server

MCP server for building BitBadges collections via natural language.

## Overview

This MCP server enables natural language collection creation for BitBadges. Users can describe what they want to build, and the server generates valid transaction JSON.

**Example:**
> "Create a 1:1 backed USDC stablecoin with 100 USDC/day spend limit"

## Installation

```bash
npm install
npm run build
```

## Usage

### With Claude Desktop

Add to your Claude Desktop config (`~/.config/claude/config.json` or similar):

```json
{
  "mcpServers": {
    "bitbadges-builder": {
      "command": "node",
      "args": ["/path/to/bitbadges-builder-mcp/dist/index.js"]
    }
  }
}
```

### Development

```bash
npm run dev    # Run with tsx
npm run build  # Compile TypeScript
npm test       # Run tests
```

## Available Tools

### High-Level Builders

| Tool | Description |
|------|-------------|
| `build_smart_token` | Build IBC-backed smart token (stablecoin, wrapped asset) |
| `build_fungible_token` | Build ERC-20 style fungible token |
| `build_nft_collection` | Build NFT collection with minting config |

### Component Builders

| Tool | Description |
|------|-------------|
| `generate_backing_address` | Compute IBC backing address from denom |
| `generate_approval` | Build approval structures by type |
| `generate_permissions` | Build permission presets |
| `generate_alias_path` | Build alias path for liquidity pools |

### Utilities

| Tool | Description |
|------|-------------|
| `lookup_token_info` | Get token symbol, denom, decimals, backing address |
| `validate_transaction` | Validate JSON against critical rules |
| `get_current_timestamp` | Get current time for time-dependent configs |
| `get_skill_instructions` | Get instructions for specific skill |
| `get_master_prompt` | Get complete builder rules |

## MCP Resources

| URI | Content |
|-----|---------|
| `bitbadges://tokens/registry` | IBC denoms, symbols, decimals, backing addresses |
| `bitbadges://rules/critical` | Critical rules for transaction building |
| `bitbadges://skills/all` | All skill instructions |

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

### Create Fungible Token

```typescript
const result = await build_fungible_token({
  creatorAddress: "bb1...",
  name: "My Token",
  symbol: "MTK",
  totalSupply: "1000000",
  swappable: true
});
```

## Supported Tokens

| Symbol | IBC Denom | Decimals |
|--------|-----------|----------|
| USDC | ibc/F082B65... | 6 |
| ATOM | ibc/A4DB47... | 6 |
| OSMO | ibc/ED07A3... | 6 |
| BADGE | ubadge | 9 |

## Critical Rules

1. **All numbers as strings**: `"1"` not `1`
2. **UintRange format**: `{ "start": "string", "end": "string" }`
3. **Mint approvals**: Must have `overridesFromOutgoingApprovals: true`
4. **Smart Token backing**: Must NOT have `overridesFromOutgoingApprovals: true`
5. **tokenMetadata**: Must include `tokenIds` field
6. **List IDs**: Only use `All`, `Mint`, `!Mint`, `bb1...` addresses

## Companion Skill

A Claude Code skill is included in `companion-skill/SKILL.md` for integration with Claude Code.

## License

MIT
