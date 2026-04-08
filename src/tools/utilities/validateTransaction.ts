/**
 * Tool: validate_transaction
 * Validate BitBadges transaction JSON against critical rules.
 *
 * Logic delegated to bitbadgesjs-sdk's validateTransaction().
 */

import { z } from 'zod';
import { validateTransaction, type ValidationIssue, type ValidationResult } from 'bitbadgesjs-sdk';

export const validateTransactionSchema = z.object({
  transactionJson: z.string().optional().describe('The transaction JSON to validate (as a string)'),
  transaction: z.object({}).passthrough().optional().describe('The transaction object to validate (alternative to transactionJson)')
}).refine(data => data.transactionJson !== undefined || data.transaction !== undefined, {
  message: 'Either transactionJson or transaction must be provided'
});

export type ValidateTransactionInput = z.infer<typeof validateTransactionSchema>;

export type { ValidationIssue, ValidationResult };

export interface ValidateTransactionResult extends ValidationResult {}

export const validateTransactionTool = {
  name: 'validate_transaction',
  description: 'Validate BitBadges transaction JSON against critical rules. Checks for common errors like numbers not being strings, missing required fields, and invalid list IDs.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      transactionJson: {
        type: 'string',
        description: 'The transaction JSON to validate (as a string). Either this or transaction must be provided.'
      },
      transaction: {
        type: 'object',
        description: 'The transaction object to validate (alternative to transactionJson — pass the object directly without JSON.stringify).'
      }
    }
  }
};

export function handleValidateTransaction(input: ValidateTransactionInput): ValidateTransactionResult {
  // Normalize: accept either a pre-parsed object or a JSON string
  const resolvedJson: string = input.transaction !== undefined
    ? JSON.stringify(input.transaction)
    : (input.transactionJson ?? '');

  // Parse JSON
  let tx: unknown;
  try {
    tx = JSON.parse(resolvedJson);
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

  // Delegate to SDK
  return validateTransaction(tx);
}
