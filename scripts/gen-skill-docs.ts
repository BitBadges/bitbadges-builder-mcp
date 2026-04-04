#!/usr/bin/env tsx
/**
 * Generate docs pages from MCP skill instructions.
 * Source of truth: src/resources/skillInstructions.ts
 * Output: ../bitbadges-docs/x-tokenization/examples/skills/
 *
 * Usage: npx tsx scripts/gen-skill-docs.ts
 */

import { SKILL_INSTRUCTIONS } from '../src/resources/skillInstructions.js';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const DOCS_DIR = join(import.meta.dirname, '../../bitbadges-docs/x-tokenization/examples/skills');

mkdirSync(DOCS_DIR, { recursive: true });

const categoryLabels: Record<string, string> = {
  'token-type': 'Token Types',
  standard: 'Standards',
  approval: 'Approval Patterns',
  feature: 'Features',
  advanced: 'Advanced',
};

// Group skills by category for the README
const byCategory = new Map<string, typeof SKILL_INSTRUCTIONS>();
for (const skill of SKILL_INSTRUCTIONS) {
  const list = byCategory.get(skill.category) || [];
  list.push(skill);
  byCategory.set(skill.category, list);
}

// Generate individual skill pages
for (const skill of SKILL_INSTRUCTIONS) {
  const filename = `${skill.id}.md`;
  const refs = skill.referenceCollectionIds?.length
    ? `\n\n## Reference Collections\n\n${skill.referenceCollectionIds.map((id) => `- [Collection ${id}](https://bitbadges.io/collections/${id})`).join('\n')}`
    : '';

  const content = `# ${skill.name}

> ${skill.description}

**Category:** ${categoryLabels[skill.category] || skill.category}

## Summary

${skill.summary}

## Instructions

${skill.instructions}${refs}
`;

  writeFileSync(join(DOCS_DIR, filename), content);
}

// Generate README index
const categoryOrder = ['token-type', 'standard', 'approval', 'feature', 'advanced'];
let readme = `# 🤖 MCP Builder Skills

These pages document every guided build skill available in the [BitBadges MCP Builder](https://github.com/bitbadges/bitbadges-builder-mcp). Each skill provides step-by-step instructions for building a specific type of token or configuring a specific feature.

> **Tip:** If you're using the MCP builder in Claude, Cursor, or another AI tool, these instructions are loaded automatically when you select a skill. These pages are provided as a human-readable reference.

`;

for (const cat of categoryOrder) {
  const skills = byCategory.get(cat);
  if (!skills?.length) continue;
  readme += `## ${categoryLabels[cat] || cat}\n\n`;
  for (const skill of skills) {
    readme += `- [${skill.name}](${skill.id}.md) — ${skill.description}\n`;
  }
  readme += '\n';
}

readme += ``;

writeFileSync(join(DOCS_DIR, 'README.md'), readme);

// Print SUMMARY.md lines for easy copy-paste
console.log('\n=== Add these lines to SUMMARY.md as a top-level section ===\n');
console.log('## 🤖 MCP Builder Skills\n');
console.log('* [Overview](x-tokenization/examples/skills/README.md)');
for (const skill of SKILL_INSTRUCTIONS) {
  console.log(`  * [${skill.name}](x-tokenization/examples/skills/${skill.id}.md)`);
}

console.log(`\n✅ Generated ${SKILL_INSTRUCTIONS.length} skill pages + README in ${DOCS_DIR}`);
