import { dayMonthOf } from '@/lib/contribute/landing-proof';
import type { ContributeAgentRun } from '@/lib/workspace/contribute.types';
import { usd } from '@/lib/workspace/format';
import { type KeyNotice, keyNoticeWordsOf } from '@/lib/workspace/notice-words';
import { KEY_REPLACE_PATH, pullRequestByAttemptPath, WORKSPACE_PATHS } from '@/lib/workspace/paths';
import { needsYouRowWordsOf } from '@/lib/workspace/pull-request-list';
import type { PullRequestListRow } from '@/lib/workspace/pull-request-page.types';
import { isWorkingPhase, stepsOf } from '@/lib/workspace/run-steps';

/*
 * Contribute home's three boxes (page 37): a pull request that needs the person, their agent, and what was merged.
 * Always three, in this order; only their words change. Each box is worked out here from the reads, as words; the page
 * draws them. A box whose read failed says so in one sentence and never says something untrue.
 */

/** A link or a button of a box. */
export type HomeBoxLink = { label: string; href: string };

/** One box, as words. */
export type HomeBoxWords = {
  top: string;
  /** The top line drawn as a mark: something needs the person. */
  chip: boolean;
  /** Left out when the box's read failed. */
  title: string | null;
  /** The project and the issue's number ("harbor-kit/relay · #512"), when the box names one. */
  project: string | null;
  lines: string[];
  /** A link under the lines ("1 more pull request needs you →", "All your pull requests →"). */
  link: HomeBoxLink | null;
  button: HomeBoxLink | null;
  /** Dashed: nothing to do here. */
  quiet: boolean;
};

/** A row of the list that needs the person, as box 1 reads it. */
export type HomeNeedsYouRow = Pick<
  PullRequestListRow,
  'box' | 'round' | 'since' | 'repo' | 'issueNumber' | 'title' | 'path' | 'walkthroughBlocked'
>;

/** What box 2 reads. */
export type HomeAgentRead = {
  /** The runs, live; null when the activity could not be read. */
  runs:
    | readonly Pick<
        ContributeAgentRun,
        | 'attemptId'
        | 'phase'
        | 'kind'
        | 'mode'
        | 'runner'
        | 'label'
        | 'elapsedSeconds'
        | 'title'
        | 'nameWithOwner'
        | 'number'
      >[]
    | null;
  /** The person's own agent when one is connected (its client's name, else "Your agent"); null when none is. */
  own: string | null;
  /** A Claude key is saved and works. */
  key: boolean;
  /** The first of the key's notices, when there is one: box 2 says it in the Agent tab's words. */
  notice: KeyNotice | null;
  /** A cap set in GitRanks has less left than one fix may spend: which period's, and what a fix may spend. */
  capHold: { period: 'day' | 'week' | 'cycle'; attemptCapUsd: number } | null;
  /** The even pace holds the hosted agent until a time, as the site words it; `picksOwn`: it picks its own issues. */
  paceHold: { at: string; picksOwn: boolean } | null;
};

/** What box 3 reads; null when the list or the totals could not be read. */
export type HomeMergedRead = {
  merged: number;
  reposHelped: number;
  newest: {
    repo: string;
    issueNumber: number;
    title: string;
    mergedAt: string;
    /** The pull request's public page, when it shows. */
    publicPage: string | null;
  } | null;
  /** The person's pull requests that wait for their maintainers. */
  waiting: number;
};

export type HomeBoxesRead = {
  /** No attempt of the person's exists yet. */
  firstDay: boolean;
  /** The rows that need the person; null when the list could not be read. */
  needsYou: readonly HomeNeedsYouRow[] | null;
  agent: HomeAgentRead;
  merged: HomeMergedRead | null;
  /** The person's Skills page. */
  skillsHref: string;
};

export type HomeBoxes = {
  boxes: [HomeBoxWords, HomeBoxWords, HomeBoxWords];
  /** The box with the highlight, the one filled button and Enter; null for none. */
  lit: 0 | 1 | null;
};

const ALL_PULL_REQUESTS: HomeBoxLink = { label: 'All your pull requests →', href: WORKSPACE_PATHS.pullRequests };
const AGENT_TAB: HomeBoxLink = { label: 'Open the Agent tab', href: WORKSPACE_PATHS.agent };
const NOT_READ = 'We could not read your pull requests just now.';
const HOSTED = 'The hosted agent';

const box = (words: Partial<HomeBoxWords> & Pick<HomeBoxWords, 'top'>): HomeBoxWords => ({
  chip: false,
  title: null,
  project: null,
  lines: [],
  link: null,
  button: null,
  quiet: false,
  ...words,
});

/** A box whose read failed: its top line, one sentence, and the way to the list. */
const notRead = (top: string): HomeBoxWords => box({ top, lines: [NOT_READ], link: ALL_PULL_REQUESTS, quiet: true });

const projectOf = (repo: string, number: number) => `${repo} · #${number}`;
const countOf = (count: number, one: string, many: string) =>
  `${count.toLocaleString('en-US')} ${count === 1 ? one : many}`;

/** Box 1: the pull request that has waited longest for the person. */
export function needsYouBoxOf(rows: readonly HomeNeedsYouRow[] | null): HomeBoxWords {
  if (!rows) return notRead('Pull requests');
  const oldest = [...rows].sort((a, b) => a.since.localeCompare(b.since))[0];
  const words = oldest ? needsYouRowWordsOf(oldest) : null;
  if (!oldest || !words) {
    return box({
      top: 'Pull requests',
      title: 'Nothing needs you',
      lines: ['When a pull request needs you, it shows here first.'],
      link: ALL_PULL_REQUESTS,
      quiet: true,
    });
  }
  const more = rows.length - 1;
  const moreLink = more
    ? {
        label: `${countOf(more, 'more pull request needs', 'more pull requests need')} you →`,
        href: WORKSPACE_PATHS.pullRequests,
      }
    : null;
  return box({
    top: 'Needs you',
    chip: true,
    title: words.line,
    project: projectOf(oldest.repo, oldest.issueNumber),
    lines: [oldest.title],
    // A row with no page has no button: the way to the list takes its place.
    link: oldest.path ? moreLink : (moreLink ?? ALL_PULL_REQUESTS),
    button: oldest.path ? { label: words.button, href: oldest.path } : null,
  });
}

/** What is connected, in one sentence: "Claude Code is connected.", "Your Claude key is connected.", or both. */
export function connectedLineOf({ own, key }: Pick<HomeAgentRead, 'own' | 'key'>): string | null {
  if (own && key) return `${own} and your Claude key are connected.`;
  if (own) return `${own} is connected.`;
  if (key) return 'Your Claude key is connected.';
  return null;
}

/** Whether nothing is connected: neither an own agent that was used nor a key that works. */
export const nothingConnected = (agent: Pick<HomeAgentRead, 'own' | 'key'>) => !agent.own && !agent.key;

/** A notice's box: the key stopped working (its own link), or its credits or its workspace's limit (the Agent tab). */
function noticeBoxOf(notice: KeyNotice): HomeBoxWords {
  const { title, text } = keyNoticeWordsOf(notice);
  const button = notice.kind === 'key-invalid' ? { label: 'Connect a new key', href: KEY_REPLACE_PATH } : AGENT_TAB;
  return box({ top: 'Your agent', title, lines: [text], button });
}

/** The cases that say something is wrong or missing, which every day's words give way to; null for none. */
function wrongBoxOf(agent: HomeAgentRead): HomeBoxWords | null {
  if (agent.notice) return noticeBoxOf(agent.notice);
  if (agent.capHold) {
    const { period, attemptCapUsd } = agent.capHold;
    return box({
      top: 'Your agent',
      title: 'The hosted agent waits for your caps',
      lines: [
        `Your spend cap for this ${period} has less left than one fix may spend (${usd(attemptCapUsd)}), so nothing can start until that period turns or you raise the cap.`,
      ],
      button: AGENT_TAB,
    });
  }
  if (nothingConnected(agent)) {
    return box({
      top: 'Your agent',
      title: 'Connect an agent to start',
      lines: [
        'Claude Code, Codex, Cursor, Gemini CLI, VS Code or Antigravity. Or run the hosted agent on your Claude key.',
      ],
      button: { label: 'Connect an agent', href: WORKSPACE_PATHS.agentConnect },
    });
  }
  return null;
}

/** "Working · Step 3 of 5 · 12 minutes": the run's own line, its step, the whole minutes since it started; each when known. */
export function runLineOf(run: NonNullable<HomeAgentRead['runs']>[number]): string {
  const { steps, at } = stepsOf(run);
  const minutes = Math.floor(run.elapsedSeconds / 60);
  return [
    run.label,
    at < steps.length ? `Step ${at + 1} of ${steps.length}` : null,
    minutes >= 1 ? countOf(minutes, 'minute', 'minutes') : null,
  ]
    .filter((part): part is string => !!part)
    .join(' · ');
}

/** Box 2: what the person's agent is doing now. A finished fix is not here: it is a pull request that needs them. */
export function agentBoxOf(agent: HomeAgentRead): HomeBoxWords {
  const working = (agent.runs ?? []).filter(isWorkingPhase);
  const hostedName = (run: { runner: string }) => (run.runner === 'MCP' ? (agent.own ?? 'Your agent') : HOSTED);
  if (working.length === 1) {
    const [run] = working;
    return box({
      top: 'Your agent',
      title: `${hostedName(run)} is fixing an issue`,
      project: run.nameWithOwner ? projectOf(run.nameWithOwner, run.number) : null,
      lines: [run.title, runLineOf(run)].filter((line): line is string => !!line),
      button: { label: 'See the run', href: pullRequestByAttemptPath(run.attemptId) },
    });
  }
  if (working.length > 1) {
    const hosted = working.filter((run) => run.runner !== 'MCP').length;
    const own = working.length - hosted;
    // "The hosted agent on 2 issues, Claude Code on 1.": the first part carries the noun, whichever it is.
    const parts = [
      hosted ? { who: HOSTED, count: hosted } : null,
      own ? { who: agent.own ?? 'Your agent', count: own } : null,
    ]
      .filter((part): part is { who: string; count: number } => !!part)
      .map(({ who, count }, index) => `${who} on ${index ? count : countOf(count, 'issue', 'issues')}`);
    return box({
      top: 'Your agents',
      title: `${working.length} fixes are under way`,
      lines: [`${parts.join(', ')}.`, 'When one finishes, its pull request shows under "Needs you".'],
      button: { label: 'All runs', href: WORKSPACE_PATHS.agentRuns },
    });
  }
  const wrong = wrongBoxOf(agent);
  if (wrong) return wrong;
  const connected = connectedLineOf(agent) ?? '';
  // Without the runs, the box says what is connected and nothing about what runs.
  if (!agent.runs) return box({ top: 'Your agent', title: connected.replace(/\.$/, ''), quiet: true });
  if (agent.paceHold?.picksOwn) {
    return box({
      top: 'Your agent',
      title: 'The hosted agent spreads your credits',
      lines: [`It spreads your credits across the cycle and starts the next fix at ${agent.paceHold.at}.`],
      button: AGENT_TAB,
    });
  }
  const next = agent.paceHold
    ? `You can start the next fix at ${agent.paceHold.at}.`
    : 'See an issue in full below, and it starts from there.';
  return box({ top: 'Your agent', title: 'No agent is working', lines: [`${connected} ${next}`], quiet: true });
}

/** Box 3: what was merged. A count shows only from two; none is said in words. */
export function mergedBoxOf(read: HomeMergedRead | null, skillsHref: string): HomeBoxWords {
  if (!read || (read.merged > 0 && !read.newest)) return notRead('Merged');
  const { merged, reposHelped, newest, waiting } = read;
  if (merged >= 2 && newest) {
    return box({
      top: 'Merged',
      title: `${merged.toLocaleString('en-US')} pull requests merged`,
      lines: [
        reposHelped > 1 ? `In ${reposHelped.toLocaleString('en-US')} projects.` : null,
        `Newest: ${newest.title}, ${dayMonthOf(newest.mergedAt)}.`,
      ].filter((line): line is string => !!line),
      button: { label: 'See your Skills page', href: skillsHref },
    });
  }
  if (merged === 1 && newest) {
    return box({
      top: 'Merged',
      title: 'Your first pull request was merged',
      project: projectOf(newest.repo, newest.issueNumber),
      lines: [`${newest.title}. Merged ${dayMonthOf(newest.mergedAt)}.`],
      button: newest.publicPage ? { label: 'See how it was made', href: newest.publicPage } : null,
    });
  }
  if (waiting > 0) {
    return box({
      top: 'Merged',
      title: 'Nothing merged yet',
      lines: [
        `${waiting === 1 ? '1 pull request waits for its maintainers' : `${waiting.toLocaleString('en-US')} pull requests wait for their maintainers`}. A merged one shows here.`,
      ],
      quiet: true,
    });
  }
  return box({
    top: 'Merged',
    title: 'Merged pull requests show here',
    lines: ['Each with the project it helped.'],
    quiet: true,
  });
}

/** The first day's boxes: what will happen, in order. */
export const FIRST_DAY_BOXES: [HomeBoxWords, HomeBoxWords, HomeBoxWords] = [
  box({
    top: 'First',
    chip: true,
    title: 'See an issue in full',
    lines: ['Issue details are hidden until you ask. Pick one below, read it on GitHub, and decide.'],
    button: { label: 'Go to the issues', href: '#issues' },
  }),
  box({
    top: 'Then',
    title: 'Your agent writes the fix',
    lines: ['It reads the project, writes the change and runs the tests. Nothing reaches GitHub yet.'],
  }),
  box({
    top: 'Then',
    title: 'You read it and send it',
    lines: ['The pull request opens in your name. Maintainers answer, and your agent prepares each reply for you.'],
  }),
];

/**
 * The three boxes and the one with the highlight: a pull request that needs the person, else connecting an agent when
 * none is, else the first day's first box, else none. On the first day the boxes say what will happen; box 2's words
 * give way to anything wrong or missing.
 */
export function homeBoxesOf(read: HomeBoxesRead): HomeBoxes {
  const needsYou = !!read.needsYou?.length;
  const empty = nothingConnected(read.agent);
  if (read.firstDay && !needsYou) {
    const agent = wrongBoxOf(read.agent) ?? FIRST_DAY_BOXES[1];
    // With nothing connected, connecting takes the highlight, and the first box stays plain.
    const first = empty ? { ...FIRST_DAY_BOXES[0], chip: false } : FIRST_DAY_BOXES[0];
    return { boxes: [first, agent, FIRST_DAY_BOXES[2]], lit: empty ? 1 : 0 };
  }
  return {
    boxes: [needsYouBoxOf(read.needsYou), agentBoxOf(read.agent), mergedBoxOf(read.merged, read.skillsHref)],
    lit: needsYou ? 0 : empty ? 1 : null,
  };
}
