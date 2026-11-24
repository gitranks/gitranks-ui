import type { LearnIssueLesson } from './issues';
import type { LearnQuestion, LearnVerdict } from './learn-question';
import type { LessonBlock, LessonDiagramTone } from '@/lib/workspace/blocks/block.types';
import { type PrRef, parsePrLink } from '@/lib/workspace/pr-feedback';

/*
 * A fix's walkthrough as its pages read it: the questions about one fix, one a part, each with its key on the public
 * page. Everything here needs no screen: the shapes the API answers (each read defensively: a read of another shape is
 * null, so the page says it is not here instead of breaking), the question as the player's answer part takes it, and
 * the words of the answers page. Words: "Fix walkthrough", never "story" or "lesson".
 */

/** An option with its key: right or not, and why. */
export type WalkthroughOption = { id: string; text: string; right: boolean; why: string };
/** A part's one question: one answer (`single`) or several (`multi`), its options in the order the API gives them. */
export type WalkthroughQuestion = { id: string; multi: boolean; prompt: string; options: WalkthroughOption[] };
/** One part of the change: its heading, its blocks (text, code, a diff, a diagram, a table), its question. */
export type WalkthroughPart = { id: string; heading: string; blocks: LessonBlock[]; question: WalkthroughQuestion };

/** A fix's public walkthrough: the pull request, who fixed it, the lesson it used, its parts. */
export type Walkthrough = {
  /** `owner/name`. */
  repo: string;
  issueNumber: number;
  /** The pull request's number. */
  number: number;
  title: string;
  language: string | null;
  fixer: string;
  /** The walkthrough's own version: the one a pass names. */
  version: number;
  lesson: LearnIssueLesson | null;
  parts: WalkthroughPart[];
};

/** How many tries a question of a person's answers took: all the page ever shows of a pick. */
export type WalkthroughAnswer = { question: string; tries: number };

/**
 * A person's answers. `shared: false` with no walkthrough and no answers: the fixer keeps theirs private (or the
 * walkthrough is held), as everyone but the fixer reads them.
 */
export type WalkthroughAnswers = {
  login: string;
  passedAt: string | null;
  shared: boolean;
  readers: number | null;
  walkthrough: Walkthrough | null;
  answers: WalkthroughAnswer[] | null;
};

/** Where a fix's address leads: live, taken down, answers not shared, or nothing there. */
export type FixAddressState = 'LIVE' | 'REMOVED' | 'PRIVATE' | 'MISSING';
export type FixAddress = {
  state: FixAddressState;
  owner: string | null;
  repo: string | null;
  number: number | null;
  login: string | null;
};

/** The signed-in person's side of a fix, as these pages read it. */
export type FixMine = {
  /** They made the fix. */
  fixer: boolean;
  /** Their own walkthrough is held while reports are looked at: true for the fixer alone. */
  held: boolean;
  /** When they passed this walkthrough; null while they have not. */
  passedAt: string | null;
  /** The mask id of the first similar issue of their list, best match first; null with none. */
  similar: string | null;
};

const recordOf = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
const textOf = (value: unknown): string | null => (typeof value === 'string' ? value : null);
const countOf = (value: unknown): number | null =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : null;

/** A pull request from its address's three segments; null for anything that cannot name one. */
export function fixRefOf(owner: string, repo: string, number: string): PrRef | null {
  const pr = parsePrLink(`${owner}/${repo}#${number}`);
  return pr && String(pr.number) === number ? pr : null;
}

/** The pull request as the API's `LearnFixRef` takes it. */
export const fixRefInputOf = ({ nameWithOwner, number }: PrRef) => {
  const [owner = '', repo = ''] = nameWithOwner.split('/');
  return { owner, repo, number };
};

export function lessonOf(value: unknown): LearnIssueLesson | null {
  const lesson = recordOf(value);
  const slug = textOf(lesson?.slug);
  const title = textOf(lesson?.title);
  if (!lesson || !slug || !title) return null;
  return { slug, title, course: textOf(lesson.course) ?? '', courseName: textOf(lesson.courseName) ?? '' };
}

function questionOf(value: unknown): WalkthroughQuestion | null {
  const question = recordOf(value);
  const id = textOf(question?.id);
  const prompt = textOf(question?.prompt);
  if (!question || !id || prompt === null || !Array.isArray(question.options) || question.options.length < 2) {
    return null;
  }
  const options: WalkthroughOption[] = [];
  for (const raw of question.options) {
    const option = recordOf(raw);
    const optionId = textOf(option?.id);
    const text = textOf(option?.text);
    if (!option || !optionId || text === null || typeof option.right !== 'boolean') return null;
    options.push({ id: optionId, text, right: option.right, why: textOf(option.why) ?? '' });
  }
  if (!options.some((option) => option.right)) return null;
  return { id, multi: question.multi === true, prompt, options };
}

// ─── Blocks ──────────────────────────────────────────────────────────────────────────────────────────────────────────

const EMPTY_BLOCK: LessonBlock = {
  type: 'TEXT',
  text: null,
  nodes: null,
  edges: null,
  caption: null,
  layout: null,
  file: null,
  lines: null,
  mark: null,
  repo: null,
  commit: null,
  path: null,
  fromLine: null,
  toLine: null,
  excerpt: null,
  compareOf: null,
  before: null,
  after: null,
  columns: null,
  rows: null,
  ring: null,
};

const TONES = new Set<string>(['PLAIN', 'ACCENT', 'WARN']);
const toneOf = (value: unknown): LessonDiagramTone => {
  const tone = typeof value === 'string' ? value.toUpperCase() : '';
  return (TONES.has(tone) ? tone : 'PLAIN') as LessonDiagramTone;
};

function nodesOf(value: unknown): LessonBlock['nodes'] {
  if (!Array.isArray(value) || !value.length) return null;
  const nodes: NonNullable<LessonBlock['nodes']> = [];
  for (const raw of value) {
    const node = recordOf(raw);
    const id = textOf(node?.id);
    const label = textOf(node?.label);
    if (!node || !id || label === null) return null;
    nodes.push({ id, label, sub: textOf(node.sub), tone: toneOf(node.tone), mono: node.mono === true });
  }
  return nodes;
}

function edgesOf(value: unknown): LessonBlock['edges'] {
  if (!Array.isArray(value)) return null;
  const edges: NonNullable<LessonBlock['edges']> = [];
  for (const raw of value) {
    const edge = recordOf(raw);
    const from = textOf(edge?.from);
    const to = textOf(edge?.to);
    if (!edge || !from || !to) return null;
    edges.push({ from, to, label: textOf(edge.label), reply: edge.reply === true, tone: toneOf(edge.tone) });
  }
  return edges;
}

/** A side of a before-and-after: a small diagram, or a code excerpt (`lines` as [first, last], or the flat fields). */
function sideOf(value: unknown): NonNullable<LessonBlock['before']> | null {
  const side = recordOf(value);
  if (!side) return null;
  if (side.nodes != null) {
    const nodes = nodesOf(side.nodes);
    const edges = edgesOf(side.edges ?? []);
    return nodes && edges ? { nodes, edges, path: null, fromLine: null, toLine: null, excerpt: null } : null;
  }
  const lines = Array.isArray(side.lines) ? side.lines : [side.fromLine, side.toLine];
  const [fromLine, toLine] = lines.map(countOf);
  const path = textOf(side.path);
  const excerpt = textOf(side.excerpt);
  if (!path || excerpt === null || fromLine == null || toLine == null) return null;
  return { nodes: null, edges: null, path, fromLine, toLine, excerpt };
}

const DIFF_KINDS: Record<string, 'HUNK' | 'CTX' | 'ADD' | 'DEL'> = {
  hunk: 'HUNK',
  ctx: 'CTX',
  add: 'ADD',
  del: 'DEL',
};

/** A diff's lines: the flat shape's `{ kind, text }`, or the stored shape's header and lines marked ` `, `+`, `-`. */
function diffLinesOf(block: Record<string, unknown>): NonNullable<LessonBlock['lines']> | null {
  if (!Array.isArray(block.lines)) return null;
  const header = textOf(block.header);
  const lines: NonNullable<LessonBlock['lines']> = header === null ? [] : [{ kind: 'HUNK', text: header }];
  for (const raw of block.lines) {
    if (typeof raw === 'string') {
      lines.push({ kind: raw.startsWith('+') ? 'ADD' : raw.startsWith('-') ? 'DEL' : 'CTX', text: raw });
      continue;
    }
    const line = recordOf(raw);
    const kind = DIFF_KINDS[String(line?.kind).toLowerCase()];
    const text = textOf(line?.text);
    if (!kind || text === null) return null;
    lines.push({ kind, text });
  }
  return lines;
}

/**
 * One block of a part as the shared block renderer draws it. The API sends a part's blocks as data: in the shape a
 * lesson's step is stored in (`type: 'diff'`, `lines` as `[first, last]`), or already in the flat shape lessons are
 * read in (`type: 'DIFF'`). Both are read; anything else is null, so a block of a kind this page does not know is
 * skipped.
 */
export function walkthroughBlockOf(value: unknown): LessonBlock | null {
  const block = recordOf(value);
  const type = typeof block?.type === 'string' ? block.type.toUpperCase() : '';
  if (!block) return null;
  const caption = textOf(block.caption);
  switch (type) {
    case 'TEXT': {
      const text = textOf(block.text);
      return text ? { ...EMPTY_BLOCK, type: 'TEXT', text } : null;
    }
    case 'DIAGRAM': {
      const nodes = nodesOf(block.nodes);
      const edges = edgesOf(block.edges ?? []);
      if (!nodes || !edges) return null;
      const layout = String(block.layout).toUpperCase() === 'SEQUENCE' ? 'SEQUENCE' : 'FLOW';
      return { ...EMPTY_BLOCK, type: 'DIAGRAM', nodes, edges, caption, layout };
    }
    case 'DIFF': {
      const lines = diffLinesOf(block);
      const file = textOf(block.file);
      if (!lines || !file) return null;
      // The stored shape counts its marks from the hunk's first line; the header drawn first moves them by one.
      const shift = textOf(block.header) === null ? 0 : 1;
      const mark = Array.isArray(block.mark)
        ? block.mark.filter((index): index is number => Number.isInteger(index)).map((index) => index + shift)
        : null;
      return { ...EMPTY_BLOCK, type: 'DIFF', file, lines, mark };
    }
    case 'CODE': {
      const range = Array.isArray(block.lines) ? block.lines : [block.fromLine, block.toLine];
      const [fromLine, toLine] = range.map(countOf);
      const path = textOf(block.path);
      const excerpt = textOf(block.excerpt);
      if (!path || excerpt === null || fromLine == null || toLine == null) return null;
      return {
        ...EMPTY_BLOCK,
        type: 'CODE',
        repo: textOf(block.repo),
        commit: textOf(block.commit),
        path,
        fromLine,
        toLine,
        excerpt,
      };
    }
    case 'COMPARE': {
      const of = String(block.of ?? block.compareOf).toUpperCase();
      if (of !== 'DIAGRAM' && of !== 'CODE') return null;
      const before = sideOf(block.before);
      const after = sideOf(block.after);
      if (!before || !after) return null;
      return {
        ...EMPTY_BLOCK,
        type: 'COMPARE',
        compareOf: of,
        repo: textOf(block.repo),
        commit: textOf(block.commit),
        before,
        after,
        caption,
      };
    }
    case 'TABLE': {
      const { columns, rows } = block;
      if (!Array.isArray(columns) || !columns.length || !columns.every((cell) => typeof cell === 'string')) return null;
      if (!Array.isArray(rows) || !rows.every((row) => Array.isArray(row) && row.every((c) => typeof c === 'string'))) {
        return null;
      }
      const ring = countOf(block.ring);
      return {
        ...EMPTY_BLOCK,
        type: 'TABLE',
        columns: columns as string[],
        rows: rows as string[][],
        ring: ring !== null && ring < rows.length ? ring : null,
        caption,
      };
    }
    default:
      return null;
  }
}

/** A part's blocks, those of a kind this page does not know left out. */
export const walkthroughBlocksOf = (value: unknown): LessonBlock[] =>
  Array.isArray(value) ? value.map(walkthroughBlockOf).filter((block): block is LessonBlock => block !== null) : [];

// ─── Reads ───────────────────────────────────────────────────────────────────────────────────────────────────────────

/** A public walkthrough, or null when the read is not of its shape or has no part to ask. */
export function walkthroughOf(value: unknown): Walkthrough | null {
  const read = recordOf(value);
  const repo = textOf(read?.repo);
  const fixer = textOf(read?.fixer);
  const issueNumber = countOf(read?.issueNumber);
  const number = countOf(read?.number);
  const version = countOf(read?.version);
  if (!read || !repo || !fixer || !issueNumber || !number || version === null || !Array.isArray(read.parts)) {
    return null;
  }
  const parts: WalkthroughPart[] = [];
  for (const raw of read.parts) {
    const part = recordOf(raw);
    const id = textOf(part?.id);
    const question = questionOf(part?.question);
    if (!part || !id || !question) return null;
    parts.push({ id, heading: textOf(part.heading) ?? '', blocks: walkthroughBlocksOf(part.blocks), question });
  }
  if (!parts.length) return null;
  return {
    repo,
    issueNumber,
    number,
    title: textOf(read.title) ?? '',
    language: textOf(read.language),
    fixer,
    version,
    lesson: lessonOf(read.lesson),
    parts,
  };
}

/**
 * A person's answers, or null when the read is not of their shape. Answers come with their walkthrough: shared ones
 * as everyone reads them, and the fixer's own (`own`) shared or not. Answers with nothing to show read as kept
 * private, so the page never draws an empty answers page.
 */
export function walkthroughAnswersOf(
  value: unknown,
  { own = false }: { own?: boolean } = {},
): WalkthroughAnswers | null {
  const read = recordOf(value);
  const login = textOf(read?.login);
  if (!read || !login || typeof read.shared !== 'boolean') return null;
  const walkthrough = walkthroughOf(read.walkthrough);
  const answers = Array.isArray(read.answers)
    ? read.answers.flatMap((raw) => {
        const answer = recordOf(raw);
        const question = textOf(answer?.question);
        const tries = countOf(answer?.tries);
        return question && tries ? [{ question, tries }] : [];
      })
    : null;
  const shown = (read.shared || own) && walkthrough && answers ? { walkthrough, answers } : null;
  return {
    login,
    passedAt: textOf(read.passedAt),
    shared: read.shared && (own || !!shown),
    readers: countOf(read.readers) || null,
    walkthrough: shown?.walkthrough ?? null,
    answers: shown?.answers ?? null,
  };
}

const ADDRESS_STATES = new Set<FixAddressState>(['LIVE', 'REMOVED', 'PRIVATE', 'MISSING']);

/** Where a fix's address leads, or null for a read of another shape. */
export function fixAddressOf(value: unknown): FixAddress | null {
  const read = recordOf(value);
  const state = textOf(read?.state)?.toUpperCase() as FixAddressState | undefined;
  if (!read || !state || !ADDRESS_STATES.has(state)) return null;
  return {
    state,
    owner: textOf(read.owner),
    repo: textOf(read.repo),
    number: countOf(read.number) || null,
    login: textOf(read.login),
  };
}

/** The person's side of a fix, or null for none (signed out, Learn not open to them, a read of another shape). */
export function fixMineOf(value: unknown): FixMine | null {
  const read = recordOf(value);
  if (!read || typeof read.fixer !== 'boolean') return null;
  const first = Array.isArray(read.similar) ? recordOf(read.similar[0]) : null;
  const similar = textOf(recordOf(recordOf(first?.issue)?.issue)?.id);
  return {
    fixer: read.fixer,
    held: read.fixer && read.walkthroughHeld === true,
    passedAt: textOf(read.passedAt),
    similar: similar || null,
  };
}

// ─── The player ──────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * A walkthrough question as the player's answer part takes it: one answer is "Pick one", several "Pick all that
 * apply". With `keyed`, the options carry their key and the page grades a pick itself (the public walkthrough);
 * without, a pick is sent and the call grades it (the fixer's run). The options keep the API's order: the page never
 * shuffles them, so a person's answers page reads in the order they were asked.
 */
export function playerQuestionOf(
  question: {
    id: string;
    multi: boolean;
    prompt: string;
    options: readonly { text: string; right?: boolean; why?: string }[];
  },
  keyed: boolean,
): LearnQuestion {
  return {
    id: question.id,
    type: question.multi ? 'PICK_ALL' : 'PICK_ONE',
    prompt: question.prompt,
    example: null,
    visual: null,
    content: {
      options: question.options.map((option) =>
        keyed ? { text: option.text, right: option.right === true, why: option.why ?? '' } : { text: option.text },
      ),
    },
    codes: [],
  };
}

/** The ids of the options a pick names, as the run's call takes them: the pick is one index, or several. */
export function pickedIdsOf(options: readonly { id: string }[], picked: unknown): string[] {
  const indexes = Array.isArray(picked) ? picked : [picked];
  return indexes.flatMap((index) => (typeof index === 'number' && options[index] ? [options[index].id] : []));
}

/** A reason of the call: an option's id, whether that option is right, and why. */
export type WalkthroughWhy = { optionId: string; correct: boolean; why: string };

/**
 * The call's verdict on a pick, as the answer part shows it. Right: why the picked options are right. Wrong: why the
 * wrong picks are wrong, and those crossed out (none when every pick was right but one was missed), so the person
 * picks again.
 */
export function callVerdictOf(
  options: readonly { id: string }[],
  picked: readonly string[],
  correct: boolean,
  whys: readonly WalkthroughWhy[],
): LearnVerdict {
  const byId = new Map(whys.map((line) => [line.optionId, line]));
  const said = (ids: readonly string[]) =>
    [...new Set(ids.map((id) => byId.get(id)?.why ?? '').filter((text) => text.trim()))].join(' ') || null;
  if (correct) return { right: true, why: said(picked.filter((id) => byId.get(id)?.correct !== false)), wrong: [] };
  const wrongIds = picked.filter((id) => byId.get(id)?.correct === false);
  const named = wrongIds.length ? wrongIds : whys.length ? [] : picked;
  const wrong = named.map((id) => options.findIndex((option) => option.id === id)).filter((index) => index >= 0);
  return { right: false, why: said(named), wrong };
}

// ─── The answers page ────────────────────────────────────────────────────────────────────────────────────────────────

const ORDINALS = ['first', 'second', 'third', 'fourth', 'fifth'];

/** How a person got to the right answer: "on the first try", "on the second try", "after 7 tries". */
export const triesWordsOf = (tries: number): string =>
  tries >= 1 && tries <= ORDINALS.length ? `on the ${ORDINALS[tries - 1]} try` : `after ${tries} tries`;

/** "3 on the first try, 1 on the second": the answers counted by tries, fewest first. */
export function triesSummaryOf(answers: readonly WalkthroughAnswer[]): string {
  const counts = new Map<number, number>();
  for (const { tries } of answers) counts.set(tries, (counts.get(tries) ?? 0) + 1);
  const groups = [...counts.entries()].sort(([a], [b]) => a - b);
  return groups
    .map(([tries, count], index) => {
      const words = triesWordsOf(tries);
      // The first group says "try"; the next ones are read with it ("1 on the second").
      return `${count} ${index && tries <= ORDINALS.length ? words.replace(/ try$/, '') : words}`;
    })
    .join(', ');
}

/** The tries one question took, from a person's answers; null when it is not among them. */
export const triesOf = (answers: readonly WalkthroughAnswer[], question: string): number | null =>
  answers.find((answer) => answer.question === question)?.tries ?? null;

/** "4 questions", "1 question". */
export const questionsWordsOf = (count: number) => `${count} question${count === 1 ? '' : 's'}`;

/** Whether two GitHub logins are the same person's: GitHub's names are not case-sensitive. */
export const sameLogin = (a: string | null | undefined, b: string | null | undefined) =>
  !!a && !!b && a.toLowerCase() === b.toLowerCase();

const ANSWERED_ON = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

/** "24 Nov 2026", the day a person answered; null for a date that does not read. */
export function answeredDateOf(at: string | null): string | null {
  if (!at) return null;
  const date = new Date(at);
  return Number.isNaN(date.getTime()) ? null : ANSWERED_ON.format(date);
}

/** The reasons a question's right options give, said once each. */
export const rightWhyOf = (question: WalkthroughQuestion): string =>
  [...new Set(question.options.filter((option) => option.right).map((option) => option.why.trim()))]
    .filter(Boolean)
    .join(' ');
