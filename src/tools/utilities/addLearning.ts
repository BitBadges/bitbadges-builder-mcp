/**
 * Tool: add_learning
 * Add a new learning/gotcha/tip to the persistent knowledge base
 */

import { z } from 'zod';
import { addLearningEntry, getLearningsContent } from '../../resources/learnings.js';

export const addLearningSchema = z.object({
  topic: z.enum([
    'approvals', 'permissions', 'minting', 'smart-tokens', 'signing',
    'sdk', 'api', 'frontend', 'evm', 'ibc', 'claims', 'general'
  ]).describe('Topic category for the learning'),
  title: z.string().describe('Short descriptive title'),
  content: z.string().describe('The learning content — what you discovered, the gotcha, the fix'),
  severity: z.enum(['critical', 'important', 'tip']).optional()
    .describe('How important is this? Default: tip')
});

export type AddLearningInput = z.infer<typeof addLearningSchema>;

export interface AddLearningResult {
  success: boolean;
  message: string;
  topic: string;
  totalLearnings: number;
}

export const addLearningTool = {
  name: 'add_learning',
  description: 'Add a new learning, gotcha, or tip to the persistent knowledge base. Use this when you discover something that would help future AI agents or developers avoid mistakes.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      topic: {
        type: 'string',
        enum: [
          'approvals', 'permissions', 'minting', 'smart-tokens', 'signing',
          'sdk', 'api', 'frontend', 'evm', 'ibc', 'claims', 'general'
        ],
        description: 'Topic category for the learning'
      },
      title: {
        type: 'string',
        description: 'Short descriptive title'
      },
      content: {
        type: 'string',
        description: 'The learning content — what you discovered, the gotcha, the fix'
      },
      severity: {
        type: 'string',
        enum: ['critical', 'important', 'tip'],
        description: 'How important is this? (default: tip)'
      }
    },
    required: ['topic', 'title', 'content']
  }
};

export function handleAddLearning(input: AddLearningInput): AddLearningResult {
  const { topic, title, content, severity = 'tip' } = input;

  addLearningEntry({
    topic,
    title,
    content,
    severity,
    timestamp: new Date().toISOString()
  });

  // Count total learnings
  const allContent = getLearningsContent();
  const totalLearnings = (allContent.match(/^### /gm) || []).length;

  return {
    success: true,
    message: `Learning added to "${topic}" category: "${title}"`,
    topic,
    totalLearnings
  };
}
