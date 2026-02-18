/**
 * Tool: validate_transaction
 * Validate BitBadges transaction JSON against critical rules
 */

import { z } from 'zod';

export const validateTransactionSchema = z.object({
  transactionJson: z.string().describe('The transaction JSON to validate')
});

export type ValidateTransactionInput = z.infer<typeof validateTransactionSchema>;

export interface ValidationIssue {
  severity: 'error' | 'warning';
  message: string;
  path?: string;
}

export interface ValidateTransactionResult {
  valid: boolean;
  issues: ValidationIssue[];
}

export const validateTransactionTool = {
  name: 'validate_transaction',
  description: 'Validate BitBadges transaction JSON against critical rules. Checks for common errors like numbers not being strings, missing required fields, and invalid list IDs.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      transactionJson: {
        type: 'string',
        description: 'The transaction JSON to validate (as a string)'
      }
    },
    required: ['transactionJson']
  }
};

const RESERVED_LIST_IDS = ['All', 'Mint', 'Total', '!Mint'];
const MAX_UINT64 = '18446744073709551615';

/**
 * Check if a value is a valid list ID
 */
function isValidListId(id: string): boolean {
  // Reserved IDs
  if (RESERVED_LIST_IDS.includes(id)) {
    return true;
  }

  // Negated reserved IDs (except !Mint which is already in the list)
  if (id.startsWith('!') && RESERVED_LIST_IDS.includes(id.slice(1))) {
    return true;
  }

  // Direct bb1... address
  if (id.startsWith('bb1')) {
    return true;
  }

  // Negated bb1... address
  if (id.startsWith('!bb1')) {
    return true;
  }

  // Colon-separated list of addresses (bb1abc:bb1xyz)
  if (id.includes(':') && !id.startsWith('!')) {
    const parts = id.split(':');
    return parts.every(part => part.startsWith('bb1'));
  }

  // Negated colon-separated list (!bb1abc:bb1xyz)
  if (id.startsWith('!') && id.includes(':')) {
    const rest = id.slice(1);
    const parts = rest.split(':');
    return parts.every(part => part.startsWith('bb1'));
  }

  // Special format for Smart Token: !Mint:bb1...
  if (id.startsWith('!Mint:bb1')) {
    return true;
  }

  return false;
}

/**
 * Recursively check for non-string numbers in an object
 */
function checkNumbersAreStrings(obj: unknown, path: string, issues: ValidationIssue[]): void {
  if (obj === null || obj === undefined) {
    return;
  }

  if (typeof obj === 'number') {
    issues.push({
      severity: 'error',
      message: `Number value found where string expected. Use "${obj}" instead of ${obj}`,
      path
    });
    return;
  }

  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      checkNumbersAreStrings(item, `${path}[${index}]`, issues);
    });
    return;
  }

  if (typeof obj === 'object') {
    Object.entries(obj).forEach(([key, value]) => {
      checkNumbersAreStrings(value, `${path}.${key}`, issues);
    });
  }
}

/**
 * Check UintRange format
 */
function checkUintRangeFormat(obj: unknown, path: string, issues: ValidationIssue[]): void {
  if (!obj || typeof obj !== 'object') {
    return;
  }

  const range = obj as Record<string, unknown>;

  // Check if it looks like a UintRange (has start or end)
  if ('start' in range || 'end' in range) {
    if (!('start' in range)) {
      issues.push({
        severity: 'error',
        message: 'UintRange missing "start" field',
        path
      });
    } else if (typeof range.start !== 'string') {
      issues.push({
        severity: 'error',
        message: `UintRange "start" must be a string, got ${typeof range.start}`,
        path: `${path}.start`
      });
    }

    if (!('end' in range)) {
      issues.push({
        severity: 'error',
        message: 'UintRange missing "end" field',
        path
      });
    } else if (typeof range.end !== 'string') {
      issues.push({
        severity: 'error',
        message: `UintRange "end" must be a string, got ${typeof range.end}`,
        path: `${path}.end`
      });
    }
  }
}

/**
 * Recursively find and validate UintRanges
 */
function findAndValidateUintRanges(obj: unknown, path: string, issues: ValidationIssue[]): void {
  if (!obj || typeof obj !== 'object') {
    return;
  }

  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      findAndValidateUintRanges(item, `${path}[${index}]`, issues);
    });
    return;
  }

  const record = obj as Record<string, unknown>;

  // Check if this looks like a UintRange
  checkUintRangeFormat(obj, path, issues);

  // Recurse into nested objects
  Object.entries(record).forEach(([key, value]) => {
    findAndValidateUintRanges(value, `${path}.${key}`, issues);
  });
}

/**
 * Validate orderCalculationMethod has exactly one true value
 */
function validateOrderCalculationMethod(
  orderCalc: Record<string, unknown>,
  path: string,
  issues: ValidationIssue[]
): void {
  const methods = [
    'useOverallNumTransfers',
    'usePerToAddressNumTransfers',
    'usePerFromAddressNumTransfers',
    'usePerInitiatedByAddressNumTransfers',
    'useMerkleChallengeLeafIndex'
  ];

  const trueCount = methods.filter(m => orderCalc[m] === true).length;

  if (trueCount > 1) {
    issues.push({
      severity: 'error',
      message: 'orderCalculationMethod MUST have exactly ONE method set to true, found ' + trueCount,
      path
    });
  } else if (trueCount === 0) {
    // Only warn if any incrementedBalances.startBalances are defined
    issues.push({
      severity: 'warning',
      message: 'orderCalculationMethod should have exactly ONE method set to true (default: useOverallNumTransfers)',
      path
    });
  }
}

/**
 * Validate subscription-specific requirements
 */
function validateSubscriptionApproval(
  approval: Record<string, unknown>,
  path: string,
  issues: ValidationIssue[]
): void {
  const criteria = approval.approvalCriteria as Record<string, unknown> | undefined;
  if (!criteria) return;

  // Check coinTransfers override flags
  if (Array.isArray(criteria.coinTransfers)) {
    (criteria.coinTransfers as unknown[]).forEach((ct, ctIndex) => {
      if (!ct || typeof ct !== 'object') return;
      const coinTransfer = ct as Record<string, unknown>;

      if (coinTransfer.overrideFromWithApproverAddress === true) {
        issues.push({
          severity: 'warning',
          message: 'Subscription coinTransfers should have overrideFromWithApproverAddress: false',
          path: `${path}.approvalCriteria.coinTransfers[${ctIndex}].overrideFromWithApproverAddress`
        });
      }
      if (coinTransfer.overrideToWithInitiator === true) {
        issues.push({
          severity: 'warning',
          message: 'Subscription coinTransfers should have overrideToWithInitiator: false',
          path: `${path}.approvalCriteria.coinTransfers[${ctIndex}].overrideToWithInitiator`
        });
      }
    });
  }

  // Check predeterminedBalances.incrementedBalances requirements
  const predeterminedBalances = criteria.predeterminedBalances as Record<string, unknown> | undefined;
  if (predeterminedBalances) {
    const incrementedBalances = predeterminedBalances.incrementedBalances as Record<string, unknown> | undefined;
    if (incrementedBalances) {
      // Check durationFromTimestamp is non-zero
      if (incrementedBalances.durationFromTimestamp === '0' || incrementedBalances.durationFromTimestamp === 0) {
        issues.push({
          severity: 'warning',
          message: 'Subscription durationFromTimestamp should be non-zero (subscription duration in ms)',
          path: `${path}.approvalCriteria.predeterminedBalances.incrementedBalances.durationFromTimestamp`
        });
      }

      // Check allowOverrideTimestamp is true
      if (incrementedBalances.allowOverrideTimestamp !== true) {
        issues.push({
          severity: 'warning',
          message: 'Subscription allowOverrideTimestamp should be true',
          path: `${path}.approvalCriteria.predeterminedBalances.incrementedBalances.allowOverrideTimestamp`
        });
      }
    }

    // Check orderCalculationMethod
    const orderCalc = predeterminedBalances.orderCalculationMethod as Record<string, unknown> | undefined;
    if (orderCalc) {
      validateOrderCalculationMethod(orderCalc, `${path}.approvalCriteria.predeterminedBalances.orderCalculationMethod`, issues);
    }
  }
}

/**
 * Validate approvals
 */
function validateApprovals(approvals: unknown[], path: string, issues: ValidationIssue[], standards?: string[]): void {
  const isSubscription = Array.isArray(standards) && standards.includes('Subscriptions');

  approvals.forEach((approval, index) => {
    if (!approval || typeof approval !== 'object') {
      return;
    }

    const a = approval as Record<string, unknown>;
    const approvalPath = `${path}[${index}]`;

    // Check list IDs
    ['fromListId', 'toListId', 'initiatedByListId'].forEach(field => {
      if (field in a && typeof a[field] === 'string') {
        if (!isValidListId(a[field] as string)) {
          issues.push({
            severity: 'error',
            message: `Invalid list ID: "${a[field]}". Use only reserved IDs (All, Mint, !Mint, Total) or bb1... addresses`,
            path: `${approvalPath}.${field}`
          });
        }
      }
    });

    // Check Mint approval override
    if (a.fromListId === 'Mint') {
      const criteria = a.approvalCriteria as Record<string, unknown> | undefined;
      if (criteria && criteria.overridesFromOutgoingApprovals !== true) {
        issues.push({
          severity: 'error',
          message: 'Mint approvals MUST have overridesFromOutgoingApprovals: true',
          path: `${approvalPath}.approvalCriteria.overridesFromOutgoingApprovals`
        });
      }

      // Subscription-specific validations
      if (isSubscription) {
        validateSubscriptionApproval(a, approvalPath, issues);
      }
    }

    // Check backing address approvals should NOT have overridesFromOutgoingApprovals: true
    if (typeof a.fromListId === 'string' && a.fromListId.startsWith('bb1') && !a.fromListId.includes('Mint')) {
      const criteria = a.approvalCriteria as Record<string, unknown> | undefined;
      if (criteria && criteria.overridesFromOutgoingApprovals === true && criteria.allowBackedMinting === true) {
        issues.push({
          severity: 'warning',
          message: 'Backing address approvals should NOT have overridesFromOutgoingApprovals: true',
          path: `${approvalPath}.approvalCriteria.overridesFromOutgoingApprovals`
        });
      }
    }

    // Check approvalId exists
    if (!a.approvalId || typeof a.approvalId !== 'string') {
      issues.push({
        severity: 'error',
        message: 'Approval missing required "approvalId" field',
        path: approvalPath
      });
    }
  });
}

/**
 * Validate tokenMetadata has tokenIds
 */
function validateTokenMetadata(metadata: unknown[], path: string, issues: ValidationIssue[]): void {
  metadata.forEach((entry, index) => {
    if (!entry || typeof entry !== 'object') {
      return;
    }

    const m = entry as Record<string, unknown>;
    const entryPath = `${path}[${index}]`;

    if (!('tokenIds' in m) || !Array.isArray(m.tokenIds) || m.tokenIds.length === 0) {
      issues.push({
        severity: 'error',
        message: 'tokenMetadata entry MUST include tokenIds field with UintRange array',
        path: entryPath
      });
    }
  });
}

/**
 * Validate collection permissions
 */
function validatePermissions(permissions: unknown, path: string, issues: ValidationIssue[]): void {
  if (!permissions || typeof permissions !== 'object') {
    return;
  }

  const p = permissions as Record<string, unknown>;

  // Check TokenIdsActionPermission types have tokenIds
  ['canUpdateValidTokenIds', 'canUpdateTokenMetadata'].forEach(field => {
    if (field in p && Array.isArray(p[field])) {
      (p[field] as unknown[]).forEach((perm, index) => {
        if (!perm || typeof perm !== 'object') return;
        const permObj = perm as Record<string, unknown>;

        // Only check if both time arrays are not empty (otherwise it's meant to be empty array)
        const hasTimes = Array.isArray(permObj.permanentlyPermittedTimes) && permObj.permanentlyPermittedTimes.length > 0 ||
                         Array.isArray(permObj.permanentlyForbiddenTimes) && permObj.permanentlyForbiddenTimes.length > 0;

        if (hasTimes && !('tokenIds' in permObj)) {
          issues.push({
            severity: 'error',
            message: `${field} permission MUST include tokenIds field`,
            path: `${path}.${field}[${index}]`
          });
        }
      });
    }
  });

  // Check for empty permission arrays that should be [] instead of [{...}]
  Object.entries(p).forEach(([field, value]) => {
    if (Array.isArray(value) && value.length === 1) {
      const perm = value[0] as Record<string, unknown>;
      if (perm &&
          Array.isArray(perm.permanentlyPermittedTimes) && perm.permanentlyPermittedTimes.length === 0 &&
          Array.isArray(perm.permanentlyForbiddenTimes) && perm.permanentlyForbiddenTimes.length === 0) {
        issues.push({
          severity: 'warning',
          message: `Permission "${field}" has both time arrays empty - should be [] instead of full object`,
          path: `${path}.${field}`
        });
      }
    }
  });
}

export function handleValidateTransaction(input: ValidateTransactionInput): ValidateTransactionResult {
  const issues: ValidationIssue[] = [];

  // Parse JSON
  let tx: unknown;
  try {
    tx = JSON.parse(input.transactionJson);
  } catch (error) {
    return {
      valid: false,
      issues: [{
        severity: 'error',
        message: `Invalid JSON: ${error instanceof Error ? error.message : String(error)}`
      }]
    };
  }

  if (!tx || typeof tx !== 'object') {
    return {
      valid: false,
      issues: [{
        severity: 'error',
        message: 'Transaction must be a JSON object'
      }]
    };
  }

  const transaction = tx as Record<string, unknown>;

  // Check for messages array
  if (!Array.isArray(transaction.messages)) {
    issues.push({
      severity: 'error',
      message: 'Transaction must have a "messages" array',
      path: 'messages'
    });
    return { valid: false, issues };
  }

  // Check all numbers are strings
  checkNumbersAreStrings(tx, '', issues);

  // Check UintRange formats
  findAndValidateUintRanges(tx, '', issues);

  // Validate each message
  (transaction.messages as unknown[]).forEach((msg, msgIndex) => {
    if (!msg || typeof msg !== 'object') return;

    const message = msg as Record<string, unknown>;
    const msgPath = `messages[${msgIndex}]`;

    // Check typeUrl
    if (!message.typeUrl || typeof message.typeUrl !== 'string') {
      issues.push({
        severity: 'error',
        message: 'Message missing "typeUrl" field',
        path: msgPath
      });
    }

    // Check value
    if (!message.value || typeof message.value !== 'object') {
      issues.push({
        severity: 'error',
        message: 'Message missing "value" object',
        path: msgPath
      });
      return;
    }

    const value = message.value as Record<string, unknown>;

    // Validate MsgUniversalUpdateCollection
    if (message.typeUrl === '/tokenization.MsgUniversalUpdateCollection') {
      // Check creator
      if (!value.creator || typeof value.creator !== 'string') {
        issues.push({
          severity: 'error',
          message: 'MsgUniversalUpdateCollection missing "creator" field',
          path: `${msgPath}.value.creator`
        });
      } else if (!value.creator.startsWith('bb1')) {
        issues.push({
          severity: 'warning',
          message: 'Creator address should start with "bb1"',
          path: `${msgPath}.value.creator`
        });
      }

      // Check collectionId
      if (!('collectionId' in value)) {
        issues.push({
          severity: 'error',
          message: 'MsgUniversalUpdateCollection missing "collectionId" field',
          path: `${msgPath}.value.collectionId`
        });
      }

      // Validate collectionApprovals
      if (Array.isArray(value.collectionApprovals)) {
        const standards = Array.isArray(value.standards) ? value.standards as string[] : undefined;
        validateApprovals(value.collectionApprovals, `${msgPath}.value.collectionApprovals`, issues, standards);
      }

      // Validate subscription-specific: validTokenIds must be exactly 1 token
      if (Array.isArray(value.standards) && (value.standards as string[]).includes('Subscriptions')) {
        if (Array.isArray(value.validTokenIds)) {
          const tokenIds = value.validTokenIds as unknown[];
          if (tokenIds.length !== 1) {
            issues.push({
              severity: 'warning',
              message: 'Subscription collections should have exactly 1 validTokenIds range',
              path: `${msgPath}.value.validTokenIds`
            });
          } else {
            const range = tokenIds[0] as Record<string, unknown>;
            if (range && (range.start !== '1' || range.end !== '1')) {
              issues.push({
                severity: 'warning',
                message: 'Subscription collections should have validTokenIds: [{ "start": "1", "end": "1" }]',
                path: `${msgPath}.value.validTokenIds`
              });
            }
          }
        }
      }

      // Validate tokenMetadata
      if (Array.isArray(value.tokenMetadata)) {
        validateTokenMetadata(value.tokenMetadata, `${msgPath}.value.tokenMetadata`, issues);
      }

      // Validate collectionPermissions
      if (value.collectionPermissions) {
        validatePermissions(value.collectionPermissions, `${msgPath}.value.collectionPermissions`, issues);
      }
    }

    // Validate MsgTransferTokens
    if (message.typeUrl === '/tokenization.MsgTransferTokens') {
      // Check creator
      if (!value.creator || typeof value.creator !== 'string') {
        issues.push({
          severity: 'error',
          message: 'MsgTransferTokens missing "creator" field',
          path: `${msgPath}.value.creator`
        });
      }

      // Check transfers array
      if (!Array.isArray(value.transfers)) {
        issues.push({
          severity: 'error',
          message: 'MsgTransferTokens missing "transfers" array',
          path: `${msgPath}.value.transfers`
        });
      } else {
        // Validate each transfer
        (value.transfers as unknown[]).forEach((transfer, tIndex) => {
          if (!transfer || typeof transfer !== 'object') return;
          const t = transfer as Record<string, unknown>;
          const transferPath = `${msgPath}.value.transfers[${tIndex}]`;

          // Check prioritizedApprovals is specified
          if (!('prioritizedApprovals' in t)) {
            issues.push({
              severity: 'warning',
              message: 'prioritizedApprovals should always be explicitly specified (use [] if none needed)',
              path: `${transferPath}.prioritizedApprovals`
            });
          }
        });
      }
    }
  });

  return {
    valid: issues.filter(i => i.severity === 'error').length === 0,
    issues
  };
}
