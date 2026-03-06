/**
 * Tool: fetch_docs
 * Fetch live documentation from docs.bitbadges.io
 */

import { z } from 'zod';

export const fetchDocsSchema = z.object({
  topic: z.string().describe('The topic to search for (e.g., "claims", "approvals", "SDK usage")')
});

export type FetchDocsInput = z.infer<typeof fetchDocsSchema>;

export interface FetchDocsResult {
  success: boolean;
  topic?: string;
  content?: string;
  url?: string;
  error?: string;
}

export const fetchDocsTool = {
  name: 'fetch_docs',
  description: 'Fetch live documentation from docs.bitbadges.io for a topic',
  inputSchema: {
    type: 'object' as const,
    properties: {
      topic: {
        type: 'string',
        description: 'The topic to search for (e.g., "claims", "approvals", "SDK usage")'
      }
    },
    required: ['topic']
  }
};

/**
 * Map common topics to documentation URLs
 */
const TOPIC_URL_MAP: Record<string, string> = {
  // Core concepts
  'approvals': 'https://docs.bitbadges.io/learn/transferability',
  'transferability': 'https://docs.bitbadges.io/learn/transferability',
  'permissions': 'https://docs.bitbadges.io/learn/permissions',
  'balances': 'https://docs.bitbadges.io/for-developers/concepts/balances',
  'minting': 'https://docs.bitbadges.io/learn/minting-and-circulating-supply',
  'supply': 'https://docs.bitbadges.io/learn/minting-and-circulating-supply',

  // SDK
  'sdk': 'https://docs.bitbadges.io/for-developers/bitbadges-sdk/overview',
  'sdk usage': 'https://docs.bitbadges.io/for-developers/bitbadges-sdk/overview',
  'address conversion': 'https://docs.bitbadges.io/for-developers/bitbadges-sdk/common-snippets/address-conversions',

  // API
  'api': 'https://docs.bitbadges.io/for-developers/bitbadges-api/api',
  'api key': 'https://docs.bitbadges.io/for-developers/bitbadges-api/api',

  // Claims
  'claims': 'https://docs.bitbadges.io/for-developers/claim-builder/overview',
  'claim builder': 'https://docs.bitbadges.io/for-developers/claim-builder/overview',

  // Smart tokens
  'smart tokens': 'https://docs.bitbadges.io/learn/ibc-backed-minting',
  'ibc': 'https://docs.bitbadges.io/learn/ibc-backed-minting',
  'backed minting': 'https://docs.bitbadges.io/learn/ibc-backed-minting',

  // Messages
  'messages': 'https://docs.bitbadges.io/x-tokenization/messages/README',
  'msg': 'https://docs.bitbadges.io/x-tokenization/messages/README',
  'msguniversalupdatecollection': 'https://docs.bitbadges.io/x-tokenization/messages/msg-universal-update-collection',
  'msgtransfertokens': 'https://docs.bitbadges.io/x-tokenization/messages/msg-transfer-tokens',

  // Examples
  'examples': 'https://docs.bitbadges.io/x-tokenization/examples/README',

  // Sign in
  'sign in': 'https://docs.bitbadges.io/for-developers/sign-in-with-bitbadges/overview',
  'siwbb': 'https://docs.bitbadges.io/for-developers/sign-in-with-bitbadges/overview',
  'oauth': 'https://docs.bitbadges.io/for-developers/sign-in-with-bitbadges/overview',

  // Blockchain
  'blockchain': 'https://docs.bitbadges.io/for-developers/bitbadges-blockchain/run-a-node',
  'node': 'https://docs.bitbadges.io/for-developers/bitbadges-blockchain/run-a-node',

  // Overview
  'overview': 'https://docs.bitbadges.io/overview/what-is-bitbadges',
  'what is bitbadges': 'https://docs.bitbadges.io/overview/what-is-bitbadges',
  'getting started': 'https://docs.bitbadges.io/for-developers/getting-started',

  // AI Agents & Bots
  'ai agents': 'https://docs.bitbadges.io/for-developers/ai-agents',
  'ai': 'https://docs.bitbadges.io/for-developers/ai-agents',
  'bots': 'https://docs.bitbadges.io/for-developers/ai-agents',
  'mcp': 'https://docs.bitbadges.io/for-developers/ai-agents/mcp-builder-tools',
  'mcp tools': 'https://docs.bitbadges.io/for-developers/ai-agents/mcp-builder-tools',
  'bot examples': 'https://docs.bitbadges.io/for-developers/ai-agents/bot-examples',
  'websocket': 'https://docs.bitbadges.io/for-developers/ai-agents/websocket-events',
  'websocket events': 'https://docs.bitbadges.io/for-developers/ai-agents/websocket-events',
  'machine discovery': 'https://docs.bitbadges.io/for-developers/ai-agents/capabilities-json',
  'capabilities': 'https://docs.bitbadges.io/for-developers/ai-agents/capabilities-json',
  'vault tutorial': 'https://docs.bitbadges.io/for-developers/ai-agents/openclaw-vault-tutorial',
  'faucet': 'https://docs.bitbadges.io/for-developers/ai-agents/testnet-faucet',
  'testnet faucet': 'https://docs.bitbadges.io/for-developers/ai-agents/testnet-faucet',

  // Claims extended
  'claims ai': 'https://docs.bitbadges.io/for-developers/claim-builder/leveraging-ai',
  'leveraging ai': 'https://docs.bitbadges.io/for-developers/claim-builder/leveraging-ai',
  'dynamic stores': 'https://docs.bitbadges.io/for-developers/claim-builder/dynamic-stores',
  'plugins': 'https://docs.bitbadges.io/for-developers/claim-builder/custom-plugins-webhooks',
  'webhooks': 'https://docs.bitbadges.io/for-developers/claim-builder/custom-plugins-webhooks',
  'zapier': 'https://docs.bitbadges.io/for-developers/claim-builder/integrate-with-zapier',

  // BB-402
  'bb-402': 'https://docs.bitbadges.io/x-tokenization/bb-402-token-gated-api-access',
  'token gated': 'https://docs.bitbadges.io/x-tokenization/bb-402-token-gated-api-access',
  'gated api': 'https://docs.bitbadges.io/x-tokenization/bb-402-token-gated-api-access',

  // EVM
  'evm': 'https://docs.bitbadges.io/x-tokenization/evm-compatibility',
  'evm compatibility': 'https://docs.bitbadges.io/x-tokenization/evm-compatibility',
  'precompiles': 'https://docs.bitbadges.io/x-tokenization/evm-compatibility',
  'solidity': 'https://docs.bitbadges.io/x-tokenization/evm-compatibility'
};

/**
 * Find the best matching URL for a topic
 */
function findTopicUrl(topic: string): string | null {
  const normalizedTopic = topic.toLowerCase().trim();

  // Direct match
  if (TOPIC_URL_MAP[normalizedTopic]) {
    return TOPIC_URL_MAP[normalizedTopic];
  }

  // Partial match
  for (const [key, url] of Object.entries(TOPIC_URL_MAP)) {
    if (normalizedTopic.includes(key) || key.includes(normalizedTopic)) {
      return url;
    }
  }

  return null;
}

/**
 * Fetch and extract content from a documentation page
 */
async function fetchDocContent(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'BitBadges-Builder-MCP/1.0',
        'Accept': 'text/html,application/xhtml+xml'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();

    // Extract main content (simple extraction, GitBook-based)
    // Remove script and style tags
    let content = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    content = content.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

    // Remove HTML tags but keep text
    content = content.replace(/<[^>]+>/g, ' ');

    // Clean up whitespace
    content = content.replace(/\s+/g, ' ').trim();

    // Decode HTML entities
    content = content.replace(/&nbsp;/g, ' ');
    content = content.replace(/&amp;/g, '&');
    content = content.replace(/&lt;/g, '<');
    content = content.replace(/&gt;/g, '>');
    content = content.replace(/&quot;/g, '"');

    // Truncate to reasonable length
    if (content.length > 10000) {
      content = content.substring(0, 10000) + '...\n\n[Content truncated. Visit the URL for full documentation.]';
    }

    return content;
  } catch (error) {
    throw new Error(`Failed to fetch: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Cache for llms-full.txt content (fetched once, reused)
 */
let llmsFullTextCache: string | null = null;

/**
 * Fetch llms-full.txt and search for relevant sections by keyword
 */
async function fetchLlmsFullText(topic: string): Promise<string | null> {
  // Fetch and cache
  if (!llmsFullTextCache) {
    const response = await fetch('https://docs.bitbadges.io/llms-full.txt', {
      headers: { 'User-Agent': 'BitBadges-Builder-MCP/1.0' }
    });
    if (!response.ok) return null;
    llmsFullTextCache = await response.text();
  }

  const text = llmsFullTextCache;
  const topicLower = topic.toLowerCase();
  const terms = topicLower.split(/\s+/).filter(t => t.length > 2);

  // Split into sections by markdown headers
  const sections = text.split(/(?=^#{1,3}\s)/m);

  // Score each section by keyword relevance
  const scored = sections
    .map(section => {
      let score = 0;
      const sectionLower = section.toLowerCase();
      for (const term of terms) {
        const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        const matches = sectionLower.match(regex);
        if (matches) score += matches.length;
      }
      // Bonus for header match
      const headerMatch = section.match(/^#{1,3}\s+(.+)/);
      if (headerMatch) {
        const header = headerMatch[1].toLowerCase();
        for (const term of terms) {
          if (header.includes(term)) score += 5;
        }
      }
      return { section, score };
    })
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return null;

  // Return top 3 most relevant sections, truncated
  let result = `# Search results for "${topic}" from docs.bitbadges.io\n\n`;
  for (const s of scored.slice(0, 3)) {
    const trimmed = s.section.trim();
    result += trimmed.length > 3000 ? trimmed.substring(0, 3000) + '\n...[truncated]' : trimmed;
    result += '\n\n---\n\n';
  }

  return result.length > 100 ? result : null;
}

export async function handleFetchDocs(input: FetchDocsInput): Promise<FetchDocsResult> {
  try {
    const { topic } = input;

    // Find matching URL
    const url = findTopicUrl(topic);

    if (!url) {
      // Fallback: search llms-full.txt for the topic
      try {
        const fallbackContent = await fetchLlmsFullText(topic);
        if (fallbackContent) {
          return {
            success: true,
            topic,
            content: fallbackContent,
            url: 'https://docs.bitbadges.io/llms-full.txt'
          };
        }
      } catch {
        // Fallback failed, continue to error
      }

      const availableTopics = Object.keys(TOPIC_URL_MAP).slice(0, 20).join(', ');
      return {
        success: false,
        topic,
        error: `No documentation found for topic "${topic}". Try one of: ${availableTopics}. Or visit https://docs.bitbadges.io directly.`
      };
    }

    // Fetch the content
    const content = await fetchDocContent(url);

    return {
      success: true,
      topic,
      content,
      url
    };
  } catch (error) {
    return {
      success: false,
      topic: input.topic,
      error: `Failed to fetch documentation: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
