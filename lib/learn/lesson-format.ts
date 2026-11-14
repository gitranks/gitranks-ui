import type { LearnStage, LessonBlock, LessonHead, LessonQuestion, LessonStep } from './learn.types';

/** What a new account reads while GitRanks sets up its account, before Learn can answer for it. */
export const LEARN_SETTING_UP_TEXT = 'Setting up your GitRanks account. This takes about a minute.';

/** What the user asks their own agent to start a lesson. */
export const LEARN_AGENT_PROMPT = 'Find me an issue to learn from on GitRanks';

/** Where a stage of the strip is: done, the one now, or still to come. */
export type StageMark = 'done' | 'now' | 'next';

/** The three stages of a Learn attempt: the agent's fix, the lesson, the approval. */
export const STAGES = [
  { key: 'fix', where: '1 · In your terminal', title: 'Your agent fixes the issue' },
  { key: 'lesson', where: '2 · Here, about 10 minutes', title: 'You take the lesson' },
  { key: 'approve', where: '3 · Here', title: 'You approve the pull request' },
] as const;

/** Each stage's mark at a Learn stage; null where the strip is not shown (a hand-opened pull request, an end). */
export function stageMarksOf(stage: LearnStage): [StageMark, StageMark, StageMark] | null {
  switch (stage) {
    case 'AGENT_WORKING':
    case 'AGENT_REWRITING':
      return ['now', 'next', 'next'];
    case 'WARMUP':
    case 'LESSON':
    case 'BLOCKED':
      return ['done', 'now', 'next'];
    case 'READY_TO_APPROVE':
      return ['done', 'done', 'now'];
    case 'PR_OPEN':
      return ['done', 'done', 'done'];
    default:
      return null;
  }
}

/** The stages where the lesson's steps are shown in the rail. */
export const showsSteps = (stage: LearnStage) =>
  stage !== 'AGENT_WORKING' && stage !== 'AGENT_REWRITING' && stage !== 'ENDED';

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

/** A block as plain text, for the prompt "Copy for my agent" copies. */
function blockText(block: LessonBlock): string | null {
  switch (block.type) {
    case 'TEXT':
      return block.text;
    case 'DIAGRAM': {
      const label = new Map((block.nodes ?? []).map((node) => [node.id, node.label]));
      const arrows = (block.edges ?? []).map(
        (edge) => `${label.get(edge.from) ?? edge.from} → ${label.get(edge.to) ?? edge.to}`,
      );
      return [`Diagram${block.caption ? `: ${block.caption}` : ''}`, ...arrows.map((line) => `  ${line}`)].join('\n');
    }
    case 'DIFF':
      return [
        `Diff of ${block.file ?? 'a file'}:`,
        '```diff',
        ...(block.lines ?? []).map((line) => line.text),
        '```',
      ].join('\n');
    case 'CODE': {
      const where = [block.path, block.fromLine ? `lines ${block.fromLine}–${block.toLine ?? block.fromLine}` : null]
        .filter(Boolean)
        .join(', ');
      return [`Code${where ? ` (${where})` : ''}:`, '```', block.excerpt ?? '', '```'].join('\n');
    }
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
