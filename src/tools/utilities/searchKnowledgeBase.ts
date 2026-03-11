/**
 * Tool: search_knowledge_base
 * Search across all BitBadges knowledge — docs, learnings, recipes, and resources
 */

import { z } from 'zod';
import { getConceptsDocsContent } from '../../resources/conceptsDocs.js';
import { getExamplesDocsContent } from '../../resources/examplesDocs.js';
import { getMasterPromptContent } from '../../resources/masterPrompt.js';
import { getRecipesContent, RECIPES } from '../../resources/recipes.js';
import { getLearningsContent } from '../../resources/learnings.js';
import { getErrorPatternsContent } from '../../resources/errorPatterns.js';
import { getFrontendDocsContent } from '../../resources/frontendDocs.js';
import { getWorkflowsContent } from '../../resources/workflows.js';

export const searchKnowledgeBaseSchema = z.object({
  query: z.string().describe('Search query — keywords, error messages, or concepts'),
  category: z.enum(['all', 'docs', 'learnings', 'recipes', 'errors', 'rules']).optional()
    .describe('Optional category filter. Default: all')
});

export type SearchKnowledgeBaseInput = z.infer<typeof searchKnowledgeBaseSchema>;

export interface KnowledgeSearchResult {
  source: string;
  section: string;
  content: string;
  relevance: number;
}

export interface SearchKnowledgeBaseResult {
  success: boolean;
  query: string;
  results: KnowledgeSearchResult[];
  totalMatches: number;
}

export const searchKnowledgeBaseTool = {
  name: 'search_knowledge_base',
  description: 'Search across all BitBadges knowledge — embedded docs, learnings, recipes, error patterns, and critical rules. Returns ranked, relevant snippets. Use this before asking questions or when debugging.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      query: {
        type: 'string',
        description: 'Search query — keywords, error messages, or concepts'
      },
      category: {
        type: 'string',
        enum: ['all', 'docs', 'learnings', 'recipes', 'errors', 'rules'],
        description: 'Optional category filter (default: all)'
      }
    },
    required: ['query']
  }
};

interface KnowledgeSection {
  source: string;
  section: string;
  content: string;
  category: 'docs' | 'learnings' | 'recipes' | 'errors' | 'rules';
}

/**
 * Split content into sections by markdown headers
 */
function splitBySections(content: string, source: string, category: KnowledgeSection['category']): KnowledgeSection[] {
  const sections: KnowledgeSection[] = [];
  const lines = content.split('\n');
  let currentSection = '';
  let currentContent: string[] = [];

  for (const line of lines) {
    if (line.match(/^#{1,3}\s/)) {
      if (currentContent.length > 0) {
        sections.push({
          source,
          section: currentSection || source,
          content: currentContent.join('\n').trim(),
          category
        });
      }
      currentSection = line.replace(/^#{1,3}\s+/, '').trim();
      currentContent = [line];
    } else {
      currentContent.push(line);
    }
  }

  if (currentContent.length > 0) {
    sections.push({
      source,
      section: currentSection || source,
      content: currentContent.join('\n').trim(),
      category
    });
  }

  return sections;
}

/**
 * Score relevance of a section to a query
 */
function scoreRelevance(section: KnowledgeSection, queryTerms: string[]): number {
  const contentLower = section.content.toLowerCase();
  const sectionLower = section.section.toLowerCase();
  let score = 0;

  for (const term of queryTerms) {
    const termLower = term.toLowerCase();

    // Exact phrase match in section title
    if (sectionLower.includes(termLower)) {
      score += 10;
    }

    // Count occurrences in content
    const regex = new RegExp(termLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const matches = contentLower.match(regex);
    if (matches) {
      score += Math.min(matches.length * 2, 10);
    }
  }

  // Bonus for shorter, more focused sections
  if (section.content.length < 500) score += 2;
  if (section.content.length < 200) score += 2;

  return score;
}

/**
 * Build the full knowledge index
 */
function buildKnowledgeIndex(): KnowledgeSection[] {
  const sections: KnowledgeSection[] = [];

  // Docs
  sections.push(...splitBySections(getConceptsDocsContent(), 'docs/concepts', 'docs'));
  sections.push(...splitBySections(getExamplesDocsContent(), 'docs/examples', 'docs'));

  // Rules
  sections.push(...splitBySections(getMasterPromptContent(), 'rules/critical', 'rules'));

  // Recipes
  sections.push(...splitBySections(getRecipesContent(), 'recipes', 'recipes'));

  // Learnings
  sections.push(...splitBySections(getLearningsContent(), 'learnings', 'learnings'));

  // Error patterns
  sections.push(...splitBySections(getErrorPatternsContent(), 'errors', 'errors'));

  // Frontend
  sections.push(...splitBySections(getFrontendDocsContent(), 'docs/frontend', 'docs'));

  // Workflows
  sections.push(...splitBySections(getWorkflowsContent(), 'workflows', 'docs'));

  return sections;
}

export function handleSearchKnowledgeBase(input: SearchKnowledgeBaseInput): SearchKnowledgeBaseResult {
  const { query, category = 'all' } = input;
  const queryTerms = query.split(/\s+/).filter(t => t.length > 1);

  if (queryTerms.length === 0) {
    return {
      success: false,
      query,
      results: [],
      totalMatches: 0
    };
  }

  let sections = buildKnowledgeIndex();

  // Filter by category
  if (category !== 'all') {
    sections = sections.filter(s => s.category === category);
  }

  // Score and rank
  const scored = sections
    .map(s => ({ ...s, relevance: scoreRelevance(s, queryTerms) }))
    .filter(s => s.relevance > 0)
    .sort((a, b) => b.relevance - a.relevance);

  // Return top 10 results, truncating content
  const results: KnowledgeSearchResult[] = scored.slice(0, 10).map(s => ({
    source: s.source,
    section: s.section,
    content: s.content.length > 1500 ? s.content.substring(0, 1500) + '\n...[truncated]' : s.content,
    relevance: s.relevance
  }));

  return {
    success: true,
    query,
    results,
    totalMatches: scored.length
  };
}
