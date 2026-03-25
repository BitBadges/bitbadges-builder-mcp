/**
 * Tool: explain_collection
 * Produces a human-readable explanation of any collection.
 * Works on build results, raw transaction JSON, or on-chain query results.
 * No API key required — purely local analysis.
 *
 * Uses interpretCollection() from bitbadgesjs-sdk as the core explanation engine,
 * with MCP-specific input normalization and developer/auditor extras on top.
 */

import { interpretCollection, BitBadgesCollection } from 'bitbadgesjs-sdk';
import type { NumberType } from 'bitbadgesjs-sdk';

const MAX_UINT64 = '18446744073709551615';

export const explainCollectionTool = {
  name: 'explain_collection',
  description: 'Generate a human-readable explanation of a collection. Works on build results, transaction JSON, or on-chain query results. Covers: what it is, how to get tokens, what the manager can change, trust signals, and risk summary. No API key required.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      collection: {
        type: 'object',
        description: 'The collection to explain. Accepts: (1) A build result with transaction.messages, (2) A MsgUniversalUpdateCollection message, (3) A raw collection object from query_collection.'
      },
      question: {
        type: 'string',
        description: 'Optional specific question to answer about the collection (e.g., "can the manager freeze my tokens?", "how do I mint?", "is the supply fixed?"). If omitted, generates a full overview.'
      },
      audience: {
        type: 'string',
        enum: ['user', 'developer', 'auditor'],
        description: 'Target audience. "user" = non-technical, "developer" = technical details, "auditor" = security-focused. Default: "user".'
      }
    },
    required: ['collection']
  }
};

// ---------------------------------------------------------------------------
// Input normalization — handles multiple input formats
// ---------------------------------------------------------------------------

interface ApprovalData {
  fromListId: string;
  toListId: string;
  initiatedByListId: string;
  transferTimes: { start: string; end: string }[];
  tokenIds: { start: string; end: string }[];
  ownershipTimes: { start: string; end: string }[];
  approvalId: string;
  approvalCriteria: Record<string, unknown>;
  uri: string;
  customData: string;
  version: string;
}

/**
 * Unwraps the raw MCP input into a flat collection-like object.
 * Handles build results, MsgUniversalUpdateCollection, on-chain query results, etc.
 */
function normalizeInput(input: Record<string, unknown>): Record<string, unknown> {
  let raw: Record<string, unknown> = input;

  // Handle { transaction: { messages: [...] } } from builders
  if (raw.transaction) {
    raw = raw.transaction as Record<string, unknown>;
  }
  // Handle { messages: [{ typeUrl, value }] }
  if (raw.messages && Array.isArray(raw.messages)) {
    const msg = (raw.messages as Record<string, unknown>[])[0];
    raw = (msg?.value || msg || raw) as Record<string, unknown>;
  }
  // Handle { typeUrl, value }
  if (raw.typeUrl && raw.value) {
    raw = raw.value as Record<string, unknown>;
  }

  // Handle on-chain format (timelines → flat fields)
  if (raw.collectionMetadataTimeline && !raw.collectionMetadata) {
    const timeline = raw.collectionMetadataTimeline as Record<string, unknown>[];
    if (timeline[0]?.collectionMetadata) {
      raw.collectionMetadata = timeline[0].collectionMetadata;
    }
  }
  if (raw.managerTimeline && !raw.manager) {
    const timeline = raw.managerTimeline as Record<string, unknown>[];
    if (timeline[0]?.manager) {
      raw.manager = timeline[0].manager;
    }
  }
  if (raw.standardsTimeline && !raw.standards) {
    const timeline = raw.standardsTimeline as Record<string, unknown>[];
    if (timeline[0]?.standards) {
      raw.standards = timeline[0].standards;
    }
  }
  if (raw.isArchivedTimeline && raw.isArchived === undefined) {
    const timeline = raw.isArchivedTimeline as Record<string, unknown>[];
    if (timeline[0]?.isArchived !== undefined) {
      raw.isArchived = timeline[0].isArchived;
    }
  }
  if (raw.customDataTimeline && !raw.customData) {
    const timeline = raw.customDataTimeline as Record<string, unknown>[];
    if (timeline[0]?.customData) {
      raw.customData = timeline[0].customData;
    }
  }
  // On-chain uses validBadgeIds
  if (raw.validBadgeIds && !raw.validTokenIds) {
    raw.validTokenIds = raw.validBadgeIds;
  }

  return raw;
}

/**
 * Shapes the normalized raw input into an iBitBadgesCollection-compatible object.
 * Missing fields are filled with safe defaults (empty arrays / objects).
 */
function toSdkCollectionInput(raw: Record<string, unknown>): Record<string, unknown> {
  // Build a minimal iBitBadgesCollection-shaped object.
  // The SDK constructor will handle type coercion.
  const collectionApprovals = (raw.collectionApprovals as unknown[]) || [];

  // Ensure each approval has the required nested fields
  const normalizedApprovals = collectionApprovals.map((a: any) => ({
    fromListId: a.fromListId || 'All',
    toListId: a.toListId || 'All',
    initiatedByListId: a.initiatedByListId || 'All',
    transferTimes: a.transferTimes || [{ start: '1', end: MAX_UINT64 }],
    tokenIds: a.tokenIds || [{ start: '1', end: MAX_UINT64 }],
    ownershipTimes: a.ownershipTimes || [{ start: '1', end: MAX_UINT64 }],
    approvalId: a.approvalId || '',
    approvalCriteria: a.approvalCriteria || {},
    uri: a.uri || '',
    customData: a.customData || '',
    version: a.version || '',
    fromList: a.fromList || { listId: a.fromListId || 'All', addresses: [], allowlist: true, uri: '', customData: '' },
    toList: a.toList || { listId: a.toListId || 'All', addresses: [], allowlist: true, uri: '', customData: '' },
    initiatedByList: a.initiatedByList || { listId: a.initiatedByListId || 'All', addresses: [], allowlist: true, uri: '', customData: '' },
    ...a
  }));

  const defaultBalances = (raw.defaultBalances as Record<string, unknown>) || {};

  return {
    // Core fields
    collectionId: raw.collectionId || '0',
    creator: raw.creator || '',
    manager: raw.manager || '',
    validTokenIds: raw.validTokenIds || [],
    collectionPermissions: raw.collectionPermissions || {},
    collectionApprovals: normalizedApprovals,
    invariants: raw.invariants || {},
    standards: raw.standards || [],
    customData: raw.customData || '',
    isArchived: raw.isArchived || false,

    // Metadata (wrap if needed)
    collectionMetadata: raw.collectionMetadata || { uri: '', customData: '' },
    tokenMetadata: raw.tokenMetadata || [],

    // Default balances
    defaultBalances: {
      balances: defaultBalances.balances || [],
      autoApproveSelfInitiatedOutgoingTransfers: defaultBalances.autoApproveSelfInitiatedOutgoingTransfers || false,
      autoApproveSelfInitiatedIncomingTransfers: defaultBalances.autoApproveSelfInitiatedIncomingTransfers || false,
      autoApproveAllIncomingTransfers: defaultBalances.autoApproveAllIncomingTransfers || false,
      outgoingApprovals: defaultBalances.outgoingApprovals || [],
      incomingApprovals: defaultBalances.incomingApprovals || [],
      userPermissions: defaultBalances.userPermissions || {},
      ...defaultBalances
    },

    // Arrays that iBitBadgesCollection expects — supply safe empty defaults
    activity: raw.activity || [],
    owners: raw.owners || [],
    challengeTrackers: raw.challengeTrackers || [],
    approvalTrackers: raw.approvalTrackers || [],
    listings: raw.listings || [],
    claims: raw.claims || [],
    views: raw.views || {},
    cosmosCoinWrapperPaths: raw.cosmosCoinWrapperPaths || [],
    aliasPaths: raw.aliasPaths || raw.aliasPathsToAdd || [],

    // Pass through anything else (e.g. _docId, etc.)
    ...raw
  };
}

// ---------------------------------------------------------------------------
// Question routing — extracts relevant sections from SDK output
// ---------------------------------------------------------------------------

/**
 * Given a question string, extract the most relevant section(s) from the
 * full SDK-generated explanation.
 */
function extractSectionForQuestion(fullExplanation: string, question: string): string {
  const q = question.toLowerCase();

  // Map question keywords to section headers in the SDK output
  const sectionMatchers: Array<{ keywords: string[]; headers: string[] }> = [
    {
      keywords: ['supply', 'inflation', 'fixed', 'how many', 'total'],
      headers: ['OVERVIEW', 'INVARIANTS']
    },
    {
      keywords: ['transfer', 'send', 'move', 'tradeable', 'tradable', 'soulbound'],
      headers: ['TRANSFERABILITY']
    },
    {
      keywords: ['mint', 'get', 'obtain', 'buy', 'acquire', 'deposit', 'claim'],
      headers: ['HOW TOKENS ARE CREATED', 'CLAIMS']
    },
    {
      keywords: ['manager', 'admin', 'control', 'centralize', 'owner', 'who can change'],
      headers: ['PERMISSIONS']
    },
    {
      keywords: ['freeze', 'seize', 'revoke', 'confiscate', 'forceful'],
      headers: ['TRANSFERABILITY', 'INVARIANTS', 'PERMISSIONS']
    },
    {
      keywords: ['permission', 'immutable', 'locked', 'frozen', 'trust'],
      headers: ['PERMISSIONS']
    },
    {
      keywords: ['risk', 'safe', 'secure', 'rug', 'scam', 'audit'],
      headers: ['PERMISSIONS', 'INVARIANTS', 'TRANSFERABILITY']
    },
    {
      keywords: ['metadata', 'name', 'image', 'description', 'uri'],
      headers: ['METADATA']
    },
    {
      keywords: ['ibc', 'cross-chain', 'bridge', 'backing', 'wrapper'],
      headers: ['IBC']
    },
    {
      keywords: ['default', 'balance', 'auto-approve', 'auto approve'],
      headers: ['DEFAULT BALANCES']
    }
  ];

  // Find matching section headers
  let matchedHeaders: string[] = [];
  for (const matcher of sectionMatchers) {
    if (matcher.keywords.some((kw) => q.includes(kw))) {
      matchedHeaders = matcher.headers;
      break;
    }
  }

  if (matchedHeaders.length === 0) {
    // No specific match — return full explanation with a note
    return `> ${question}\n\n${fullExplanation}\n\nFor more specific information, try asking about: supply, transfers, minting, manager control, permissions, or risks.`;
  }

  // Extract matching sections from the explanation
  const lines = fullExplanation.split('\n');
  const sections: string[] = [];
  let currentSection = '';
  let capturing = false;

  for (const line of lines) {
    // Detect section headers (SDK uses UPPERCASE headers)
    const isHeader = /^[A-Z][A-Z /()]+$/.test(line.trim()) && line.trim().length > 3;

    if (isHeader) {
      if (capturing && currentSection.trim()) {
        sections.push(currentSection);
      }
      capturing = matchedHeaders.some((h) => line.toUpperCase().includes(h));
      currentSection = capturing ? line + '\n' : '';
    } else if (capturing) {
      currentSection += line + '\n';
    }
  }
  if (capturing && currentSection.trim()) {
    sections.push(currentSection);
  }

  if (sections.length === 0) {
    // Fallback: return full explanation
    return `> ${question}\n\n${fullExplanation}`;
  }

  return `> ${question}\n\n${sections.join('\n')}`;
}

// ---------------------------------------------------------------------------
// Developer / Auditor extras (not in SDK output)
// ---------------------------------------------------------------------------

function buildDeveloperExtras(raw: Record<string, unknown>): string {
  const approvals = (raw.collectionApprovals as ApprovalData[]) || [];
  const aliasPathsToAdd = (raw.aliasPathsToAdd as unknown[]) || [];

  let report = '\n--- DEVELOPER NOTES ---\n\n';
  report += `Collection ID: ${raw.collectionId || '0 (new)'}\n`;
  report += `Creator: ${raw.creator || '(not set)'}\n`;
  report += `Custom Data: ${raw.customData || '(empty)'}\n`;
  report += `Alias Paths: ${(raw.aliasPaths as unknown[] || aliasPathsToAdd).length}\n`;
  report += `Approval Count: ${approvals.length}\n`;

  report += '\nApproval IDs:\n';
  for (const a of approvals) {
    const criteria = a.approvalCriteria || {};
    const flags: string[] = [];
    if (criteria.allowBackedMinting) flags.push('backed');
    if (criteria.mustPrioritize) flags.push('mustPrioritize');
    if (criteria.overridesFromOutgoingApprovals) flags.push('overridesOutgoing');
    if (criteria.coinTransfers) flags.push('payment');
    if (criteria.predeterminedBalances) flags.push('predetermined');
    report += `  ${a.approvalId}: ${a.fromListId} -> ${a.toListId} (by ${a.initiatedByListId}) ${flags.length > 0 ? `[${flags.join(', ')}]` : ''}\n`;
  }

  return report;
}

function buildAuditorExtras(raw: Record<string, unknown>): string {
  const perms = (raw.collectionPermissions as Record<string, unknown[]>) || {};
  const approvalPerms = (perms.canUpdateCollectionApprovals as Array<Record<string, unknown>>) || [];

  let report = '\n--- AUDITOR NOTES ---\n\n';

  if (approvalPerms.length > 1) {
    report += `Scoped Approval Permissions (${approvalPerms.length} entries):\n`;
    for (let i = 0; i < approvalPerms.length; i++) {
      const entry = approvalPerms[i];
      const forbiddenTimes = entry.permanentlyForbiddenTimes as Array<{ start: string; end: string }> | undefined;
      const permittedTimes = entry.permanentlyPermittedTimes as Array<{ start: string; end: string }> | undefined;

      const isForever = (ranges: Array<{ start: string; end: string }> | undefined) =>
        ranges && ranges.some((r) => r.start === '1' && r.end === MAX_UINT64);

      const state = isForever(forbiddenTimes) ? 'FORBIDDEN' : isForever(permittedTimes) ? 'PERMITTED' : 'NEUTRAL';
      report += `  ${i + 1}. from=${entry.fromListId || 'All'}, to=${entry.toListId || 'All'}, approvalId=${entry.approvalId || 'All'} -> ${state}\n`;
    }
    report += '\n';
  }

  // Raw permission keys
  const permKeys = Object.keys(perms);
  if (permKeys.length > 0) {
    report += `All permission keys: ${permKeys.join(', ')}\n`;
  }

  return report;
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

export function handleExplainCollection(input: {
  collection: Record<string, unknown>;
  question?: string;
  audience?: string;
}): { success: boolean; explanation: string; error?: string } {
  try {
    const audience = input.audience || 'user';

    // Step 1: Normalize the raw input (unwrap build results, timelines, etc.)
    const normalized = normalizeInput(input.collection);

    // Step 2: Shape into SDK-compatible format
    const sdkInput = toSdkCollectionInput(normalized);

    // Step 3: Call SDK interpretCollection for the base explanation
    let baseExplanation: string;
    try {
      baseExplanation = interpretCollection(sdkInput as any);
    } catch (sdkError) {
      // If the SDK fails (e.g., incompatible input shape), fall back to
      // a minimal explanation from the raw data
      baseExplanation = buildFallbackExplanation(normalized);
    }

    // Step 4: Handle question routing
    if (input.question) {
      const answer = extractSectionForQuestion(baseExplanation, input.question);
      return { success: true, explanation: answer };
    }

    // Step 5: Full report — base + audience-specific extras
    let report = baseExplanation;

    if (audience === 'developer' || audience === 'auditor') {
      report += buildDeveloperExtras(normalized);
    }
    if (audience === 'auditor') {
      report += buildAuditorExtras(normalized);
    }

    return { success: true, explanation: report };
  } catch (error) {
    return {
      success: false,
      explanation: '',
      error: `Failed to explain collection: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

// ---------------------------------------------------------------------------
// Fallback explanation (used when SDK interpretCollection fails)
// ---------------------------------------------------------------------------

function buildFallbackExplanation(raw: Record<string, unknown>): string {
  let lines = 'OVERVIEW\n\n';
  lines += `Collection ID: ${raw.collectionId || '(new - not yet deployed)'}\n`;
  lines += `Manager: ${raw.manager || '(none)'}\n`;

  const standards = (raw.standards as string[]) || [];
  lines += `Standards: ${standards.length > 0 ? standards.join(', ') : '(none set)'}\n`;

  const validTokenIds = (raw.validTokenIds as Array<{ start: string; end: string }>) || [];
  if (validTokenIds.length > 0) {
    const rangeStr = validTokenIds
      .map((r) => {
        if (r.start === '1' && r.end === MAX_UINT64) return 'all';
        if (r.start === r.end) return `#${r.start}`;
        return `#${r.start}-#${r.end}`;
      })
      .join(', ');
    lines += `Token IDs: ${rangeStr}\n`;
  }

  if (raw.isArchived) {
    lines += 'Status: ARCHIVED\n';
  }

  const approvals = (raw.collectionApprovals as ApprovalData[]) || [];
  if (approvals.length > 0) {
    lines += `\nApprovals: ${approvals.length} approval(s) configured\n`;
    for (const a of approvals) {
      lines += `  - ${a.approvalId}: ${a.fromListId} -> ${a.toListId}\n`;
    }
  }

  return lines;
}
