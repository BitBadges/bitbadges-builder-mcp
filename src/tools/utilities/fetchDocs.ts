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
  'getting started': 'https://docs.bitbadges.io/for-developers/getting-started'
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

export async function handleFetchDocs(input: FetchDocsInput): Promise<FetchDocsResult> {
  try {
    const { topic } = input;

    // Find matching URL
    const url = findTopicUrl(topic);

    if (!url) {
      // Return suggestion for unknown topics
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
