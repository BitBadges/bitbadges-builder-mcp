/**
 * Tool: diagnose_error
 * Diagnose BitBadges transaction errors and suggest fixes
 */

import { z } from 'zod';
import { ERROR_PATTERNS, ErrorPattern } from '../../resources/errorPatterns.js';

export const diagnoseErrorSchema = z.object({
  error: z.string().describe('The error message or description'),
  context: z.string().optional().describe('Optional context — what you were trying to do, transaction JSON snippet, etc.')
});

export type DiagnoseErrorInput = z.infer<typeof diagnoseErrorSchema>;

export interface DiagnoseErrorResult {
  success: boolean;
  diagnosis: {
    matchedPattern: string;
    category: string;
    explanation: string;
    fix: string;
    example?: string;
  } | null;
  suggestions: Array<{
    pattern: string;
    category: string;
    relevance: number;
  }>;
  tip: string;
}

export const diagnoseErrorTool = {
  name: 'diagnose_error',
  description: 'Diagnose BitBadges transaction errors and get suggested fixes. Pass the error message and optionally the context of what you were doing.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      error: {
        type: 'string',
        description: 'The error message or description'
      },
      context: {
        type: 'string',
        description: 'Optional context — what you were trying to do, transaction JSON snippet, etc.'
      }
    },
    required: ['error']
  }
};

function scorePatternMatch(pattern: ErrorPattern, error: string, context?: string): number {
  const errorLower = error.toLowerCase();
  const contextLower = (context || '').toLowerCase();
  const combined = errorLower + ' ' + contextLower;
  let score = 0;

  // Check trigger keywords
  for (const trigger of pattern.triggers) {
    const triggerLower = trigger.toLowerCase();
    if (combined.includes(triggerLower)) {
      score += 10;
      // Bonus for exact match in error (not just context)
      if (errorLower.includes(triggerLower)) {
        score += 5;
      }
    }
  }

  // Check category keywords in context
  if (combined.includes(pattern.category.toLowerCase())) {
    score += 3;
  }

  return score;
}

export function handleDiagnoseError(input: DiagnoseErrorInput): DiagnoseErrorResult {
  const { error, context } = input;

  // Score all patterns
  const scored = ERROR_PATTERNS
    .map(pattern => ({
      pattern,
      score: scorePatternMatch(pattern, error, context)
    }))
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score);

  const bestMatch = scored.length > 0 ? scored[0] : null;

  return {
    success: scored.length > 0,
    diagnosis: bestMatch ? {
      matchedPattern: bestMatch.pattern.name,
      category: bestMatch.pattern.category,
      explanation: bestMatch.pattern.explanation,
      fix: bestMatch.pattern.fix,
      example: bestMatch.pattern.example
    } : null,
    suggestions: scored.slice(1, 4).map(s => ({
      pattern: s.pattern.name,
      category: s.pattern.category,
      relevance: s.score
    })),
    tip: scored.length === 0
      ? 'No matching error pattern found. Try: (1) validate_transaction to check your JSON, (2) simulate_transaction to get chain-level errors, (3) search_knowledge_base for related topics.'
      : 'If this diagnosis doesn\'t match, try simulate_transaction for chain-level error details.'
  };
}
