/**
 * Frontend Development Guide Resource
 * Embedded knowledge for AI agents building BitBadges frontend features
 */

export const frontendDocsResourceInfo = {
  uri: 'bitbadges://docs/frontend',
  name: 'Frontend Development Guide',
  description: 'Component inventory, patterns, and guide for building BitBadges frontend features',
  mimeType: 'text/markdown'
};

const FRONTEND_DOCS_CONTENT = {
  overview: `# BitBadges Frontend Development Guide

The BitBadges frontend is a Next.js app (Pages Router) with Ant Design components.

## Stack
- **Framework**: Next.js (Pages Router, NOT App Router)
- **UI Library**: Ant Design (antd) — use antd components as the base
- **State**: React Context + custom hooks
- **Styling**: CSS Modules + Ant Design theme tokens
- **SDK**: \`bitbadgesjs-sdk\` for all BitBadges types and API calls

## Repository
- Source: \`bitbadges-frontend/\`
- Pages: \`src/pages/\` (Next.js Pages Router)
- Components: \`src/components/\`
- Hooks: \`src/hooks/\`
- API calls: Through \`bitbadgesjs-sdk\` BitBadgesAPI class`,

  componentRules: `## Component Rules (MUST FOLLOW)

### Address Inputs
**ALWAYS** use \`AddressSelect\` for any address input. NEVER use a raw text input.
- Handles validation, format conversion (0x ↔ bb1), and display name resolution
- Located in the components directory
- Props: \`addressOrUsername\`, \`onUserSelect\`, \`allowMintSearch\`, etc.

### Amount Displays
**ALWAYS** use \`CoinDisplay\` or \`DenomAmountSelectWithConversion\` for showing amounts.
- Never show raw base units (ubadge, uatom) to users
- CoinDisplay handles denomination conversion and formatting
- DenomAmountSelectWithConversion adds an editable input with denomination picker

### Amount Inputs
Use \`DenomAmountSelectWithConversion\` for amount inputs, not raw number inputs.
- Handles decimal conversion automatically
- Shows both base and display units

### Protocol Standards Display
The frontend has a registry of protocol standards (e.g., "Smart Token", "AI Agent Stablecoin", "Subscriptions").
- Check the standards array on collections to determine display behavior
- Standards are checked in order — first match wins
- Custom UI components exist per standard

### Collection customData
Use \`collection.customData\` (JSON string) for storing protocol-specific metadata.
- Parse with JSON.parse, store with JSON.stringify
- Used by AI Agent Stablecoins to store agent addresses
- Used by other protocols for custom configuration`,

  pageStructure: `## Page Structure

### Adding a New Page
1. Create file in \`src/pages/your-page/index.tsx\`
2. Export a default React component
3. The page is automatically routed at \`/your-page\`
4. For dynamic routes: \`src/pages/collections/[collectionId]/index.tsx\`

### Adding a New "App" Page
Apps live under \`src/pages/apps/\`:
1. Create \`src/pages/apps/your-app/index.tsx\`
2. Create components in \`src/components/apps/your-app/\`
3. Keep page-level component thin — delegate to sub-components

### Common Page Patterns
\`\`\`tsx
// Standard page with layout
export default function YourPage() {
  return (
    <div className="primary-text" style={{ padding: '24px' }}>
      <Typography.Title level={2}>Page Title</Typography.Title>
      {/* Content */}
    </div>
  );
}
\`\`\`

### Key Existing Pages
- \`/collections/[collectionId]\` — Collection detail view
- \`/account/[address]\` — User profile and balances
- \`/mint\` — Collection creation wizard
- \`/apps/ai-stablecoins\` — AI Agent Stablecoin management
- \`/developer\` — Developer portal (claims, API keys)`,

  commonPatterns: `## Common Patterns

### Fetching Collection Data
\`\`\`tsx
import { useCollection } from '../hooks/useCollection';

function MyComponent({ collectionId }: { collectionId: string }) {
  const collection = useCollection(collectionId);
  if (!collection) return <Spin />;
  // Use collection.collectionApprovals, collection.manager, etc.
}
\`\`\`

### Fetching Balance Data
\`\`\`tsx
import { useBalance } from '../hooks/useBalance';

function BalanceDisplay({ collectionId, address }: Props) {
  const balance = useBalance(collectionId, address);
  return <CoinDisplay amount={balance?.balances?.[0]?.amount} denom="ubadge" />;
}
\`\`\`

### Displaying Addresses
\`\`\`tsx
import { AddressDisplay } from '../components/address/AddressDisplay';

// Shows resolved name + avatar, links to profile
<AddressDisplay addressOrUsername="bb1..." />
\`\`\`

### Transaction Submission
\`\`\`tsx
import { useTxContext } from '../hooks/useTxContext';

function MintButton() {
  const txContext = useTxContext();

  const handleMint = async () => {
    await txContext.submitTransaction({
      messages: [/* MsgTransferTokens */],
      memo: '',
    });
  };

  return <Button onClick={handleMint}>Mint</Button>;
}
\`\`\`

### Conditional Rendering by Standard
\`\`\`tsx
const isSmartToken = collection.standards?.includes('Smart Token');
const isSubscription = collection.standards?.includes('Subscriptions');
const isAIStablecoin = collection.standards?.includes('AI Agent Stablecoin');

if (isSmartToken) return <SmartTokenView collection={collection} />;
\`\`\``,

  skillsAndPrompts: `## AI Skills / Prompt Generation UI

The frontend has a pattern for AI-facing features (used in AI Agent Stablecoins):

### Skills Registry
Skills are registered as objects with:
- \`id\`: unique identifier
- \`name\`: display name
- \`description\`: what it does
- \`generatePrompt(collection, context)\`: function that returns the prompt text

### Prompt Display Pattern
- Show skills as expandable cards/buttons
- User clicks to expand → shows generated prompt text
- Include a "Copy" button for the prompt
- Keep each skill focused on ONE action (don't bundle)

### Adding a New Skill
1. Create the skill definition in the relevant component directory
2. Implement \`generatePrompt\` that uses collection data to build context-aware prompts
3. Register in the skills array
4. UI auto-renders from the array`,

  thingsToAvoid: `## Things to Avoid

- **DO NOT** use App Router patterns (no \`app/\` directory, no \`layout.tsx\`, no server components)
- **DO NOT** use raw \`<input>\` for addresses — use AddressSelect
- **DO NOT** display raw base units — use CoinDisplay
- **DO NOT** use \`fetch()\` directly for BitBadges API — use the SDK
- **DO NOT** create new CSS frameworks — use Ant Design + existing CSS patterns
- **DO NOT** add global state management libraries — use existing Context/hooks
- **DO NOT** hardcode collection IDs or addresses — make them configurable
- **DO NOT** skip loading states — always show \`<Spin />\` while fetching`
};

export function getFrontendDocsContent(): string {
  return Object.values(FRONTEND_DOCS_CONTENT).join('\n\n');
}
