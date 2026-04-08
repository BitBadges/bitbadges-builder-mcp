/**
 * Tool: audit_collection
 * Audits a MsgUniversalUpdateCollection for security risks, design flaws, and common gotchas.
 * Returns categorized findings with severity levels.
 *
 * Logic delegated to bitbadgesjs-sdk's auditCollection().
 */

import { auditCollection, type AuditResult } from 'bitbadgesjs-sdk';

export const auditCollectionTool = {
  name: 'audit_collection',
  description: 'Audit a collection transaction or on-chain collection for security risks, design flaws, and common gotchas. Pass either a MsgUniversalUpdateCollection message or a raw collection object. Returns categorized findings with severity levels (critical/warning/info).',
  inputSchema: {
    type: 'object' as const,
    properties: {
      collection: {
        type: 'object',
        description: 'The collection to audit. Can be: (1) A MsgUniversalUpdateCollection message object with typeUrl and value, (2) The value field directly, or (3) A raw collection object from query_collection.'
      },
      context: {
        type: 'string',
        description: 'Optional context about the intended use case (e.g., "NFT art collection", "stablecoin vault", "subscription token"). Helps tailor findings.'
      }
    },
    required: ['collection']
  }
};

export function handleAuditCollection(input: { collection: Record<string, unknown>; context?: string }): AuditResult {
  return auditCollection(input);
}
