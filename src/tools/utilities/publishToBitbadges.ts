/**
 * Tool: publish_to_bitbadges
 * Publish a generated transaction to BitBadges and get a short import link
 */

import { exec } from 'child_process';
import { z } from 'zod';

export const publishToBitbadgesSchema = z.object({
  transactionJson: z.string().describe('The complete transaction JSON to publish'),
  openInBrowser: z.boolean().optional().default(true).describe('Automatically open the import URL in the default browser'),
  environment: z.enum(['mainnet', 'testnet']).optional().default('mainnet').describe('Target environment')
});

export type PublishToBitbadgesInput = z.infer<typeof publishToBitbadgesSchema>;

export interface PublishToBitbadgesResult {
  success: boolean;
  code?: string;
  url?: string;
  expiresIn?: string;
  error?: string;
}

export const publishToBitbadgesTool = {
  name: 'publish_to_bitbadges',
  description: `Publish a generated transaction to BitBadges and get a short import link.
Optionally opens the browser automatically. The link expires after 15 minutes.
Use this after generating a transaction to make it easy to import into the BitBadges site.`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      transactionJson: {
        type: 'string',
        description: 'The complete transaction JSON to publish'
      },
      openInBrowser: {
        type: 'boolean',
        description: 'Automatically open the import URL in the default browser (default: true)'
      },
      environment: {
        type: 'string',
        enum: ['mainnet', 'testnet'],
        description: 'Target environment (default: mainnet)'
      }
    },
    required: ['transactionJson']
  }
};

/**
 * Open a URL in the default browser
 */
function openInBrowser(url: string): void {
  const command = process.platform === 'darwin'
    ? 'open'
    : process.platform === 'win32'
      ? 'start'
      : 'xdg-open';

  exec(`${command} "${url}"`, (error) => {
    if (error) {
      console.error('Failed to open browser:', error);
    }
  });
}

export async function handlePublishToBitbadges(input: PublishToBitbadgesInput): Promise<PublishToBitbadgesResult> {
  const { transactionJson, openInBrowser: shouldOpenBrowser = true, environment = 'mainnet' } = input;

  // Validate JSON
  let parsed: any;
  try {
    parsed = JSON.parse(transactionJson);
  } catch (e) {
    return {
      success: false,
      error: 'Invalid JSON provided'
    };
  }

  // Validate it looks like a BitBadges transaction
  if (!parsed.messages || !Array.isArray(parsed.messages)) {
    return {
      success: false,
      error: 'Invalid transaction format: missing messages array'
    };
  }

  // Determine base URL
  const baseUrl = environment === 'testnet'
    ? 'https://testnet.bitbadges.io'
    : 'https://bitbadges.io';

  try {
    // POST to BitBadges API
    const response = await fetch(`${baseUrl}/api/v0/builder/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transaction: parsed,
        metadata: {
          source: 'claude-code-mcp',
          createdAt: Date.now()
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `Failed to publish: ${errorText}`
      };
    }

    const result = await response.json() as { code: string };
    const importUrl = `${baseUrl}/create?import=${result.code}`;

    // Open in browser if requested
    if (shouldOpenBrowser) {
      openInBrowser(importUrl);
    }

    return {
      success: true,
      code: result.code,
      url: importUrl,
      expiresIn: '15 minutes'
    };
  } catch (error) {
    return {
      success: false,
      error: `Network error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
