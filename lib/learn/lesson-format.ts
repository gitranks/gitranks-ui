import type {
  LessonBlock,
  LessonCompareSide,
  LessonDiagramEdge,
  LessonDiagramNode,
  LessonHead,
  LessonQuestion,
  LessonStep,
} from './learn.types';
import { cleanDiagram } from '@/lib/workspace/blocks/diagram-layout';
import { cleanSequence } from '@/lib/workspace/blocks/sequence-layout';

/** What a new account reads while GitRanks sets up its account, before Learn can answer for it. */
export const LEARN_SETTING_UP_TEXT = 'Setting up your GitRanks account. This takes about a minute.';

/** "the repo · issue #871", the lesson's subject in one line; null when it names no issue. */
export function subjectLineOf(
  head: Pick<LessonHead, 'subject'> | null,
  fallback?: { repo: string | null; number: number },
) {
  const repo = head?.subject.repo ?? fallback?.repo ?? null;
  const issue = head?.subject.issue ?? fallback?.number ?? null;
  if (!repo || !issue) return null;
  return { text: `${repo} · issue #${issue}`, href: `https://github.com/${repo}/issues/${issue}` };
}

/** "learn TypeScript, level Some": the goal and the level, split for the rail's line. */
export function writtenForOf(writtenFor: string | null | undefined): { goal: string; level: string | null } | null {
  const text = writtenFor?.trim();
  if (!text) return null;
  const match = /^(.*?),\s*level\s+(.+)$/i.exec(text);
  return match ? { goal: match[1], level: match[2].toLowerCase() } : { goal: text, level: null };
}

/** The warm-up questions a lesson of this kind asks, for the summary's "1 of 3"; null when not known. */
const WARMUP_BY_KIND: Record<string, number> = { fix: 3 };
export const warmupCountOf = (kind: string | null | undefined) => (kind ? (WARMUP_BY_KIND[kind] ?? null) : null);

const indent = (lines: string[]) => lines.map((line) => `  ${line}`);

/** A flow diagram's arrows, one a line: `a → b`, and `a → b (calls)` when the arrow is labelled. */
function arrowLines(nodes: readonly LessonDiagramNode[] | null, edges: readonly LessonDiagramEdge[] | null): string[] {
  const kept = cleanDiagram(nodes, edges);
  const label = new Map(kept.nodes.map((node) => [node.id, node.label]));
  return kept.edges.map(
    (edge) =>
      `${label.get(edge.from) ?? edge.from} → ${label.get(edge.to) ?? edge.to}${edge.label ? ` (${edge.label})` : ''}`,
  );
}

/** A call sequence's calls, numbered as drawn: `1. a → b: label`, a reply and the call the fix changed said so. */
function callLines(nodes: readonly LessonDiagramNode[] | null, edges: readonly LessonDiagramEdge[] | null): string[] {
  const { actors, calls } = cleanSequence(nodes, edges);
  const label = new Map(actors.map((node) => [node.id, node.label]));
  return calls.map((call, index) =>
    [
      `${index + 1}. ${label.get(call.from) ?? call.from} → ${label.get(call.to) ?? call.to}`,
      call.reply ? ' (reply)' : '',
      call.label ? `: ${call.label}` : '',
      call.tone === 'ACCENT' ? ' [changed by the fix]' : '',
    ].join(''),
  );
}

/** Quoted code: where it is, then the excerpt in a fence. */
function codeLines(path: string | null, fromLine: number | null, toLine: number | null, excerpt: string | null) {
  const where = [path, fromLine ? `lines ${fromLine}–${toLine ?? fromLine}` : null].filter(Boolean).join(', ');
  return [`Code${where ? ` (${where})` : ''}:`, '```', excerpt ?? '', '```'];
}

/** One side of a before-and-after, as its own kind: a diagram's arrows, or code. */
function sideLines(block: LessonBlock, side: LessonCompareSide | null): string[] {
  if (!side) return [];
  return block.compareOf === 'CODE'
    ? codeLines(side.path, side.fromLine, side.toLine, side.excerpt)
    : indent(arrowLines(side.nodes, side.edges));
}

/** A table in Markdown, the ringed row marked with an arrow. */
function tableLines(block: LessonBlock): string[] {
  const columns = block.columns ?? [];
  const cell = (text: string) => text.replaceAll('|', '\\|');
  const row = (cells: string[]) => `| ${cells.map(cell).join(' | ')} |`;
  const rows = (block.rows ?? []).map((cells, index) => {
    const own = columns.map((_, at) => cells[at] ?? '');
    if (index === block.ring && own.length) own[0] = `→ ${own[0]}`;
    return row(own);
  });
  return [
    row(columns),
    row(columns.map(() => '---')),
    ...rows,
    ...(block.ring !== null && block.ring >= 0 && block.ring < rows.length
      ? ['(→ marks the case this step is about)']
      : []),
  ];
}

/** A block as plain text, for the prompt "Copy for my agent" copies. */
function blockText(block: LessonBlock): string | null {
  const caption = block.caption ? `: ${block.caption}` : '';
  switch (block.type) {
    case 'TEXT':
      return block.text;
    case 'DIAGRAM':
      return block.layout === 'SEQUENCE'
        ? [`Call sequence${caption}`, ...indent(callLines(block.nodes, block.edges))].join('\n')
        : [`Diagram${caption}`, ...indent(arrowLines(block.nodes, block.edges))].join('\n');
    case 'DIFF':
      return [
        `Diff of ${block.file ?? 'a file'}:`,
        '```diff',
        ...(block.lines ?? []).map((line) => line.text),
        '```',
      ].join('\n');
    case 'CODE':
      return codeLines(block.path, block.fromLine, block.toLine, block.excerpt).join('\n');
    case 'COMPARE':
      return [
        `Before and after the fix${caption}`,
        'Before:',
        ...sideLines(block, block.before),
        'After:',
        ...sideLines(block, block.after),
      ].join('\n');
    case 'TABLE':
      return [`Table${caption}`, ...tableLines(block)].join('\n');
    default:
      return null;
  }
}

/**
 * The step and its question as a prompt for the user's own agent: explain it another way, and never answer it. The
 * question's options go with it, never which one is right (the page does not know).
 */
export function copyPromptOf(step: LessonStep, question: LessonQuestion | null, head: LessonHead | null): string {
  const about = head
    ? `the fix for ${head.subject.repo ?? 'a repository'}${head.subject.issue ? ` issue #${head.subject.issue}` : ''}`
    : 'a fix';
  const lines = [
    `I am taking a short lesson on ${about}. Explain this step to me another way, with an example. Do not tell me which answer is right: I answer it myself.`,
    '',
    `Step: ${step.title}`,
    '',
    ...step.blocks.map(blockText).filter((text): text is string => !!text),
  ];
  if (question) {
    lines.push('', `The question: ${question.prompt}`, ...question.options.map((option) => `- ${option.text}`));
  }
  return lines.join('\n');
}
