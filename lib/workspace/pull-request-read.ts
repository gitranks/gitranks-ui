import type {
  LearnIssueLesson,
  PullRequestApproval,
  PullRequestBox,
  PullRequestChange,
  PullRequestCheck,
  PullRequestCheckClass,
  PullRequestChecks,
  PullRequestFile,
  PullRequestList,
  PullRequestListGroup,
  PullRequestListMark,
  PullRequestListRow,
  PullRequestOnlyYou,
  PullRequestOutcome,
  PullRequestPage,
  PullRequestReply,
  PullRequestRound,
  PullRequestRoundAsk,
  PullRequestRoundCloser,
  PullRequestRoundNotNeeded,
  PullRequestRoundState,
  PullRequestStage,
  PullRequestsMerged,
  PullRequestWalkthroughCard,
  PullRequestWaysOn,
} from './pull-request-page.types';

/*
 * The pull request's page, Approve and the list of pull requests as the API answers them, read tolerantly: a field the
 * API does not answer (an older API, a field added later) takes its quiet default, a part of another shape is left
 * out, and a read with none of what makes it one is null, which the page answers as "did not load".
 */

const recordOf = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
const textOf = (value: unknown): string | null => (typeof value === 'string' && value.trim() ? value : null);
const numberOf = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;
const countOf = (value: unknown): number => Math.max(0, Math.floor(numberOf(value) ?? 0));
/** A count the API leaves null when it would be zero: null for none. */
const someOf = (value: unknown): number | null => {
  const n = numberOf(value);
  return n !== null && n > 0 ? Math.floor(n) : null;
};
const listOf = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const oneOf = <T extends string>(value: unknown, values: readonly T[]): T | null =>
  values.includes(value as T) ? (value as T) : null;
const present = <T>(value: T | null): value is T => value !== null;

const STAGES: readonly PullRequestStage[] = ['FIX', 'WALKTHROUGH', 'APPROVE', 'REVIEW', 'MERGED'];
const ROUND_STATES: readonly PullRequestRoundState[] = ['WAITING', 'WORKING', 'READY', 'SENT', 'NOT_NEEDED'];
const NOT_NEEDED: readonly PullRequestRoundNotNeeded[] = [
  'FAILS_ON_BASE',
  'ASKS_NOTHING',
  'ALREADY_ANSWERED',
  'BOT_IS_WRONG',
  'OTHER',
];
const CLOSERS: readonly PullRequestRoundCloser[] = ['PERSON', 'GITRANKS'];
const CHECK_CLASSES: readonly PullRequestCheckClass[] = ['AGENT_CAN_FIX', 'NEEDS_YOU', 'NOT_YOURS'];
const OUTCOMES: readonly PullRequestOutcome[] = ['SILENT', 'REPO_OUT'];
const GROUPS: readonly PullRequestListGroup[] = ['NEEDS_YOU', 'IN_PROGRESS', 'ENDED'];
const MARKS: readonly PullRequestListMark[] = ['NEEDS_YOU', 'AGENT_WORKING', 'MAINTAINERS', 'MERGED'];

/** A lesson an issue or a fix is linked to; null without its slug and title. */
function issueLessonOf(value: unknown): LearnIssueLesson | null {
  const lesson = recordOf(value);
  const slug = textOf(lesson?.slug);
  const title = textOf(lesson?.title);
  if (!lesson || !slug || !title) return null;
  return { slug, title, course: textOf(lesson.course) ?? '', courseName: textOf(lesson.courseName) ?? '' };
}

/** An `owner/name` the API gives. */
const repoOf = (value: unknown): string | null => {
  const repo = textOf(value);
  return repo && /^[^/\s]+\/[^/\s]+$/.test(repo) ? repo : null;
};

/** An address of this site the API gives (a way on, a row's page): a path, never another site's address. */
export function sitePathOf(value: unknown): string | null {
  const path = textOf(value);
  return path?.startsWith('/') && !path.startsWith('//') && !path.includes('\\') ? path : null;
}

function askOf(value: unknown): PullRequestRoundAsk | null {
  const ask = recordOf(value);
  const kind = textOf(ask?.kind);
  const author = textOf(ask?.author);
  if (!ask || !kind || !author) return null;
  return {
    id: textOf(ask.id),
    kind,
    author,
    bot: ask.bot === true,
    excerpt: textOf(ask.excerpt),
    comments: someOf(ask.comments),
    url: textOf(ask.url) ?? '',
  };
}

function replyOf(value: unknown): PullRequestReply | null {
  const reply = recordOf(value);
  const id = textOf(reply?.id);
  if (!reply || !id) return null;
  return {
    id,
    to: textOf(reply.to) ?? 'a comment',
    text: typeof reply.text === 'string' ? reply.text : '',
    leftOut: reply.leftOut === true,
  };
}

function roundOf(value: unknown): PullRequestRound | null {
  const round = recordOf(value);
  const n = numberOf(round?.n);
  const state = oneOf(round?.state, ROUND_STATES);
  if (!round || n === null || n < 1 || !state) return null;
  return {
    n: Math.floor(n),
    state,
    openedAt: textOf(round.openedAt) ?? '',
    asked: listOf(round.asked).map(askOf).filter(present),
    did: textOf(round.did),
    commits: someOf(round.commits),
    replies: listOf(round.replies).map(replyOf).filter(present),
    sentAt: textOf(round.sentAt),
    since: listOf(round.since).map(askOf).filter(present),
    notNeeded: oneOf(round.notNeeded, NOT_NEEDED),
    closedBy: oneOf(round.closedBy, CLOSERS),
    prompt: textOf(round.prompt),
  };
}

function checkOf(value: unknown): PullRequestCheck | null {
  const check = recordOf(value);
  const name = textOf(check?.name);
  const kind = oneOf(check?.class, CHECK_CLASSES);
  if (!check || !name || !kind) return null;
  return { name, class: kind, reason: textOf(check.reason) ?? '', url: textOf(check.url) ?? '' };
}

function checksOf(value: unknown): PullRequestChecks | null {
  const checks = recordOf(value);
  if (!checks) return null;
  return {
    pass: someOf(checks.pass),
    agentCanFix: someOf(checks.agentCanFix),
    needsYou: someOf(checks.needsYou),
    notYours: someOf(checks.notYours),
    rows: listOf(checks.rows).map(checkOf).filter(present),
  };
}

function changeOf(value: unknown): PullRequestChange | null {
  const change = recordOf(value);
  if (!change) return null;
  return {
    summary: textOf(change.summary),
    files: countOf(change.files),
    added: countOf(change.added),
    removed: countOf(change.removed),
  };
}

function walkthroughCardOf(value: unknown): PullRequestWalkthroughCard | null {
  const card = recordOf(value);
  if (!card) return null;
  return {
    questions: countOf(card.questions),
    answered: countOf(card.answered),
    passedAt: textOf(card.passedAt),
    readers: someOf(card.readers),
    shared: card.shared === true,
  };
}

function onlyYouOf(value: unknown): PullRequestOnlyYou | null {
  const item = recordOf(value);
  const kind = textOf(item?.kind);
  if (!item || !kind) return null;
  return { kind, text: textOf(item.text) ?? '', url: textOf(item.url) };
}

function waysOnOf(value: unknown): PullRequestWaysOn | null {
  const ways = recordOf(value);
  if (!ways) return null;
  return {
    lessonQuestions: sitePathOf(ways.lessonQuestions),
    lessonIssues: sitePathOf(ways.lessonIssues),
    course: sitePathOf(ways.course),
  };
}

/** The page of one pull request; null when the read is not one (nothing, or none of what makes it one). */
export function pullRequestPageOf(value: unknown): PullRequestPage | null {
  const page = recordOf(value);
  const attemptId = textOf(page?.attemptId);
  const repo = repoOf(page?.repo);
  const issueNumber = numberOf(page?.issueNumber);
  // A box this UI does not know yet is kept: its words are the plain default.
  const box = textOf(page?.box) as PullRequestBox | null;
  const stage = oneOf(page?.stage, STAGES);
  if (!page || !attemptId || !repo || issueNumber === null || !box || !stage) return null;
  const made = page.made === 'LEARN' ? 'LEARN' : 'CONTRIBUTE';
  const stages = listOf(page.stages)
    .map((each) => oneOf(each, STAGES))
    .filter(present);
  return {
    attemptId,
    made,
    hosted: page.hosted === true,
    agent: textOf(page.agent),
    repo,
    issueNumber,
    issueTitle: textOf(page.issueTitle) ?? `${repo} #${issueNumber}`,
    issueUrl: textOf(page.issueUrl) ?? `https://github.com/${repo}/issues/${issueNumber}`,
    number: someOf(page.number),
    url: textOf(page.url),
    lesson: issueLessonOf(page.lesson),
    lessonConfirmed: page.lessonConfirmed === true,
    stages: stages.includes(stage) ? stages : [...stages, stage],
    stage,
    working: page.working === true,
    box,
    round: someOf(page.round),
    openingStep: someOf(page.openingStep),
    autoSend: page.autoSend === true,
    stoppedAtLimit: page.stoppedAtLimit === true,
    onlyYou: listOf(page.onlyYou).map(onlyYouOf).filter(present),
    change: changeOf(page.change),
    walkthrough: made === 'LEARN' ? walkthroughCardOf(page.walkthrough) : null,
    rounds: listOf(page.rounds)
      .map(roundOf)
      .filter(present)
      .sort((a, b) => b.n - a.n),
    since: listOf(page.since).map(askOf).filter(present),
    checks: checksOf(page.checks),
    rules: textOf(page.rules),
    lessonToAsk: page.lessonToAsk === true,
    outcome: oneOf(page.outcome, OUTCOMES),
    waysOn: made === 'LEARN' ? waysOnOf(page.waysOn) : null,
  };
}

function fileOf(value: unknown): PullRequestFile | null {
  const file = recordOf(value);
  const path = textOf(file?.path);
  if (!file || !path) return null;
  return { path, added: countOf(file.added), removed: countOf(file.removed) };
}

/** What Approve needs before the press; null when the read is not one. */
export function pullRequestApprovalOf(value: unknown): PullRequestApproval | null {
  const approval = recordOf(value);
  const change = changeOf(approval?.change);
  if (!approval || typeof approval.title !== 'string' || typeof approval.description !== 'string' || !change) {
    return null;
  }
  const files = listOf(approval.files).map(fileOf).filter(present);
  return {
    title: approval.title,
    description: approval.description,
    footer: typeof approval.footer === 'string' ? approval.footer : '',
    titlePrefix: textOf(approval.titlePrefix),
    signOffNeeded: approval.signOffNeeded === true,
    signOffOn: approval.signOffOn === true,
    // A read that does not say counts as allowed: the send says so if it is not.
    githubAllowed: approval.githubAllowed !== false,
    walkthroughPassed: typeof approval.walkthroughPassed === 'boolean' ? approval.walkthroughPassed : null,
    lessonLater: issueLessonOf(approval.lessonLater),
    change,
    files,
    filesTotal: Math.max(countOf(approval.filesTotal), files.length),
  };
}

/** A row of the person's pull requests; null when it is not one. */
export function pullRequestRowOf(value: unknown): PullRequestListRow | null {
  const raw = recordOf(value);
  const attemptId = textOf(raw?.attemptId);
  const repo = textOf(raw?.repo);
  const issueNumber = numberOf(raw?.issueNumber);
  const title = textOf(raw?.title);
  const box = textOf(raw?.box) as PullRequestBox | null;
  const since = textOf(raw?.since);
  const group = oneOf(raw?.group, GROUPS);
  if (!raw || !attemptId || !repo?.includes('/') || issueNumber === null || !title || !box || !since || !group) {
    return null;
  }
  // The row's page: the API's when it gives one, the issue's when it does not say (an older API), none when it says
  // the repository's name is not known.
  const path = 'path' in raw ? sitePathOf(raw.path) : undefined;
  return {
    attemptId,
    made: raw.made === 'CONTRIBUTE' ? 'CONTRIBUTE' : 'LEARN',
    repo,
    issueNumber,
    issueUrl: textOf(raw.issueUrl) ?? `https://github.com/${repo}/issues/${issueNumber}`,
    number: numberOf(raw.number),
    url: textOf(raw.url),
    title,
    group,
    box,
    round: numberOf(raw.round),
    mark: oneOf(raw.mark, MARKS),
    agent: textOf(raw.agent),
    costUsd: numberOf(raw.costUsd),
    lesson: issueLessonOf(raw.lesson),
    pageRemoved: raw.pageRemoved === true,
    since,
    ...(raw.stoppedAtLimit === true ? { stoppedAtLimit: true } : {}),
    ...(path === undefined ? {} : { path }),
  };
}

/** The list of the person's pull requests; null when the read is not one. */
export function pullRequestListOf(value: unknown): PullRequestList | null {
  const list = recordOf(value);
  if (!list || !Array.isArray(list.rows)) return null;
  const rows = list.rows.map(pullRequestRowOf).filter(present);
  const open = countOf(list.open);
  return {
    rows,
    open,
    limit: Math.max(countOf(list.limit), open),
    atLimit: list.atLimit === true,
    more: textOf(list.more),
  };
}

/**
 * The list's newest merged pull request; null when the API sent none (an API older than it) or sent one that is not a
 * row, so the page says it could not read rather than "nothing merged".
 */
export function pullRequestsMergedOf(value: unknown): PullRequestsMerged | null {
  const merged = recordOf(value);
  if (!merged) return null;
  if (merged.newest === null) return { newest: null, newestPublicPage: false };
  const newest = pullRequestRowOf(merged.newest);
  return newest ? { newest, newestPublicPage: merged.newestPublicPage === true } : null;
}
