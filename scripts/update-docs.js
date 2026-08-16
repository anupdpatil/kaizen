#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const rootDir = process.cwd();
const dateStamp = new Date().toISOString().slice(0, 10);

function git(args) {
  try {
    return execSync(`git ${args}`, { cwd: rootDir, encoding: 'utf8' }).trim();
  } catch (error) {
    return '';
  }
}

function safeRead(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    return '';
  }
}

function extractWords(text) {
  return (text.match(/[A-Za-z0-9]+/g) || []).map((word) => word.toLowerCase());
}

function summarizeMarkdownChange(filePath, previousText, currentText) {
  const previousWords = new Set(extractWords(previousText || ''));
  const currentWords = extractWords(currentText || '');
  const addedWords = [...new Set(currentWords.filter((word) => !previousWords.has(word)))].slice(0, 8);
  const prevLines = (previousText || '').split(/\r?\n/).filter(Boolean).length;
  const currLines = (currentText || '').split(/\r?\n/).filter(Boolean).length;
  const delta = currLines - prevLines;

  let changeType = 'refreshed';
  if (delta > 25) changeType = 'expanded';
  else if (delta < -25) changeType = 'trimmed';

  return {
    filePath,
    changeType,
    delta,
    insight: addedWords.length ? `new concepts: ${addedWords.join(', ')}` : 'content updated without major new vocabulary',
    summary: `${filePath} ${changeType} with ${Math.abs(delta)} line delta.`
  };
}

function buildRoadmapCandidates(changedFiles) {
  const candidates = [];

  if (changedFiles.some((file) => file.endsWith('.md') || file.startsWith('docs/'))) {
    candidates.push('Documentation automation and release-note generation');
  }

  if (changedFiles.some((file) => file.includes('backend/') || file.includes('frontend/'))) {
    candidates.push('Feature refinement based on current product usage and code evolution');
  }

  if (changedFiles.some((file) => file.includes('.github/') || file.includes('package.json') || file.includes('workflow'))) {
    candidates.push('CI/CD and release-quality workflow hardening');
  }

  if (changedFiles.some((file) => file.includes('README') || file.includes('CHANGELOG') || file.includes('VERSION'))) {
    candidates.push('Release-readiness, product narrative, and stakeholder communication');
  }

  if (candidates.length === 0) {
    candidates.push('Feature validation and backlog refinement based on the latest product changes');
  }

  return candidates.slice(0, 5);
}

function ensureDirectory(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

const currentSha = git('rev-parse --short HEAD') || 'local-sync';
const previousSha = git('rev-parse --short HEAD~1') || 'initial-state';
const trackedMarkdownFiles = git('ls-files "*.md" "docs/**/*.md"')
  .split(/\r?\n/)
  .map((file) => file.trim())
  .filter(Boolean);

const mdFiles = [...new Set([
  ...trackedMarkdownFiles,
  ...git("diff --name-only HEAD~1 HEAD -- '*.md'")
    .split(/\r?\n/)
    .map((file) => file.trim())
    .filter(Boolean)
])];

const changedFiles = [...new Set([
  ...mdFiles,
  ...git('diff --name-only HEAD~1 HEAD')
    .split(/\r?\n/)
    .map((file) => file.trim())
    .filter(Boolean)
])];

const categories = {
  docs: [],
  app: [],
  config: []
};

for (const file of changedFiles) {
  if (file.endsWith('.md') || file.startsWith('docs/')) {
    categories.docs.push(file);
  } else if (file.includes('package.json') || file.includes('.github/') || file.includes('package-lock.json') || file.includes('.env')) {
    categories.config.push(file);
  } else if (file) {
    categories.app.push(file);
  }
}

const summaryLines = [
  `- Previous commit: ${previousSha}`,
  `- Current commit: ${currentSha}`,
  `- Trigger: push-based documentation sync`,
  `- Changed files reviewed: ${changedFiles.length || 0}`
];

for (const [group, files] of Object.entries(categories)) {
  if (files.length) {
    summaryLines.push(`- ${group.toUpperCase()}: ${files.slice(0, 5).join(', ')}${files.length > 5 ? '...' : ''}`);
  }
}

const markdownInsights = [];
for (const file of mdFiles.length ? mdFiles : []) {
  let previousText = '';
  let currentText = '';

  try {
    previousText = git(`show HEAD~1:${file}`);
  } catch (error) {
    previousText = '';
  }

  try {
    currentText = git(`show HEAD:${file}`);
  } catch (error) {
    currentText = safeRead(path.join(rootDir, file));
  }

  if (previousText || currentText) {
    markdownInsights.push(summarizeMarkdownChange(file, previousText, currentText));
  }
}

const docInsightSummary = markdownInsights.length
  ? markdownInsights.map((entry) => `- ${entry.summary} (${entry.insight})`)
  : ['- No markdown content diff detected beyond the current sync context.'];

const changelogPath = path.join(rootDir, 'docs', 'CHANGELOG.md');
const changelogContent = safeRead(changelogPath) || '# Changelog\n\n';
const changelogMarker = `<!-- auto-docs:last-commit:${currentSha} -->`;

const releaseNoteDir = path.join(rootDir, 'docs', 'releases');
ensureDirectory(releaseNoteDir);

const releaseNoteFile = path.join(releaseNoteDir, `V2-${dateStamp}.md`);
const roadmapPath = path.join(rootDir, 'docs', 'VERSION_ROADMAP.md');
const roadmapContent = safeRead(roadmapPath) || '# Version Roadmap\n\n';

const roadmapCandidates = buildRoadmapCandidates(changedFiles);
const releaseNoteContent = [
  `# V2 Release Notes - ${dateStamp}`,
  '',
  `- Trigger commit: ${currentSha}`,
  `- Previous version reference: ${previousSha}`,
  `- Markdown files reviewed: ${mdFiles.length || 0}`,
  `- Release focus: Documentation automation + version-aware updates`,
  '',
  '## Summary',
  `The latest push introduced changes that were compared across the previous and current project state. This generated a version-aware summary for V2 planning and a release note entry based on the observed git diff.`,
  '',
  '## Version delta summary',
  ...summaryLines,
  '',
  '## Markdown comparison insights',
  ...docInsightSummary,
  '',
  '## V2 roadmap candidates generated from git changes',
  ...roadmapCandidates.map((candidate) => `- ${candidate}`),
  '',
  '## Suggested next actions',
  '- Review the updated markdown documents and align release language with the live product state.',
  '- Prioritize the roadmap candidates for the next V2 implementation cycle.',
  '- Use this file as the structured release-note snapshot for the current version iteration.',
  ''
].join('\n');
fs.writeFileSync(releaseNoteFile, releaseNoteContent, 'utf8');

const roadmapMarker = `<!-- auto-docs:v2-summary:${currentSha} -->`;
const roadmapBlock = [
  roadmapMarker,
  '## Auto-generated V2 roadmap summary',
  `- Version target: V2`,
  `- Generated from: ${previousSha} → ${currentSha}`,
  `- Analysis date: ${dateStamp}`,
  '',
  '### Signals from the latest git changes',
  ...summaryLines.map((line) => line.replace('- ', '  - ')),
  '',
  '### V2 roadmap candidates',
  ...roadmapCandidates.map((candidate) => `- ${candidate}`),
  '',
  '### Documentation summary',
  ...docInsightSummary.map((line) => `- ${line}`),
  '',
  '---',
  ''
].join('\n');

if (!roadmapContent.includes(roadmapMarker)) {
  const updatedRoadmap = `${roadmapContent.trimEnd()}\n\n${roadmapBlock}\n`;
  fs.writeFileSync(roadmapPath, updatedRoadmap, 'utf8');
}

if (!changelogContent.includes(changelogMarker)) {
  const newEntry = [
    changelogMarker,
    `## Auto-sync: ${currentSha} (${dateStamp})`,
    '',
    '### Version comparison summary',
    ...summaryLines,
    '',
    '### Markdown comparison insights',
    ...docInsightSummary,
    '',
    '### V2 roadmap suggestions',
    ...roadmapCandidates.map((candidate) => `- ${candidate}`),
    '',
    '### Documentation effect',
    '- Documentation was refreshed by comparing the previous and current project state with deeper markdown-aware analysis.',
    '- A release note file was generated for the current version cycle and the V2 roadmap was updated automatically from git changes.',
    '',
    '---',
    ''
  ].join('\n');

  const updatedChangelog = `${newEntry}${changelogContent.replace(/^# Changelog\s*\n/, '')}`;
  fs.writeFileSync(changelogPath, updatedChangelog, 'utf8');
}

const readmePath = path.join(rootDir, 'README.md');
const readmeContent = safeRead(readmePath);
const readmeMarker = `<!-- auto-docs:sync:${currentSha} -->`;

if (readmeContent && !readmeContent.includes(readmeMarker)) {
  const readmeBlock = [
    readmeMarker,
    '## Documentation Sync Status',
    `- Last auto-sync: ${dateStamp}`,
    `- Current commit: ${currentSha}`,
    `- Previous commit: ${previousSha}`,
    `- Changed files reviewed: ${changedFiles.length || 0}`,
    '- Notes: Markdown content was compared using a content-aware diff, a V2 roadmap summary was refreshed, and a per-version release note was generated.',
    `- Release notes: [docs/releases/V2-${dateStamp}.md](./docs/releases/V2-${dateStamp}.md)`,
    ''
  ].join('\n');

  const updatedReadme = `${readmeContent.trimEnd()}\n\n${readmeBlock}\n`;
  fs.writeFileSync(readmePath, updatedReadme, 'utf8');
}

console.log('Documentation sync complete.');
console.log(`Previous: ${previousSha}`);
console.log(`Current: ${currentSha}`);
console.log(`Markdown files compared: ${mdFiles.length || 0}`);
console.log(`Release notes generated: docs/releases/V2-${dateStamp}.md`);
