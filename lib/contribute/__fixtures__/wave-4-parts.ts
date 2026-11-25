import type { HomeAgentRead, HomeBoxesRead, HomeMergedRead, HomeNeedsYouRow } from '../home-boxes';
import type { LandingProofPr } from '../landing-proof';
import type { StartWaysRead } from '../start-ways';

/**
 * Contribute's new parts (the landing's, home's boxes, step 1 of the flow) from fixtures, for the catalogue and the
 * specs, before the pages use them.
 */

const prOf = (over: Partial<LandingProofPr> & Pick<LandingProofPr, 'number' | 'title'>): LandingProofPr => ({
  nameWithOwner: 'driftwood-js/driftwood',
  url: `https://github.com/driftwood-js/driftwood/pull/${over.number}`,
  openedAt: '2026-10-27T09:12:00Z',
  mergedAt: '2026-10-30T15:40:00Z',
  contributorLogin: 'mira-dev',
  agent: 'Claude Code',
  issue: {
    number: 871,
    url: 'https://github.com/driftwood-js/driftwood/issues/871',
    title: 'Pagination skips the last page when the total is a multiple of the page size',
    kind: 'BUG',
    language: 'JS_TS',
  },
  change: { files: 2, added: 18, removed: 3 },
  ...over,
});

/** The newest pull requests with a public page, newest first: three merged, then one more. */
export const proofMerged: LandingProofPr[] = [
  prOf({ number: 912, title: 'Count the last page when the total divides evenly' }),
  prOf({
    nameWithOwner: 'harbor-kit/relay',
    url: 'https://github.com/harbor-kit/relay/pull/418',
    number: 418,
    title: 'Keep the retry delay when the queue reconnects',
    openedAt: '2026-10-26T08:00:00Z',
    mergedAt: '2026-10-27T10:00:00Z',
    contributorLogin: 'tomasz-k',
    agent: "GitRanks' hosted agent",
    issue: {
      number: 412,
      url: 'https://github.com/harbor-kit/relay/issues/412',
      title: 'Retry delay resets after a reconnect',
      kind: 'BUG',
      language: 'GO',
    },
    change: { files: 1, added: 9, removed: 2 },
  }),
  prOf({
    nameWithOwner: 'lumen-data/importer',
    url: 'https://github.com/lumen-data/importer/pull/93',
    number: 93,
    title: 'Treat an email as one user whatever its case',
    openedAt: '2026-10-21T08:00:00Z',
    mergedAt: '2026-10-21T17:30:00Z',
    contributorLogin: 'ana-p',
    issue: {
      number: 88,
      url: 'https://github.com/lumen-data/importer/issues/88',
      title: 'The importer counts one email as two users',
      kind: null,
      language: 'PYTHON',
    },
    change: null,
  }),
  prOf({ number: 905, title: 'Document the page size option', mergedAt: '2026-10-19T12:00:00Z' }),
];

/** Only an open pull request has a public page so far. */
export const proofOpenOnly: LandingProofPr[] = [
  prOf({ number: 920, title: 'Stop the date picker from closing on a typed date', mergedAt: null }),
];

/** "Two ways to contribute": the hosted agent first, then the person's own. */
export const landingWays = [
  {
    top: 'We run the agent',
    title: 'On your Claude key',
    text: 'Best if your Claude plan has API credits that expire unused. We pick an issue, run Claude in a hosted sandbox, and bring you a tested change to review. You never touch a terminal.',
    facts: [
      { label: 'You bring', value: 'A Claude API key with its own spend limit' },
      { label: 'It spends', value: 'Your API credits, up to the caps you set' },
      { label: 'The pace', value: 'Spread across your billing cycle' },
      { label: 'Setup', value: 'One step, about two minutes' },
    ],
  },
  {
    top: 'Your agent does the work',
    title: 'With your own agent',
    text: 'Best if you already work with Claude Code, Codex, Cursor, Gemini CLI, VS Code or Antigravity. It asks GitRanks for an issue, fixes it on your machine, and hands the change back for your review.',
    facts: [
      { label: 'You bring', value: 'A coding agent that speaks MCP' },
      { label: 'It spends', value: 'Nothing through us: your agent, your plan' },
      { label: 'The pace', value: 'Whenever you ask your agent' },
      { label: 'Setup', value: 'Add GitRanks and allow it, about a minute' },
    ],
  },
] as const;

/** The band's words on Contribute's landing, and the two footer lines it quotes. */
export const landingBand = {
  text: "Every pull request says an AI agent wrote the fix and who reviewed it. We open one pull request in a project at a time, follow each project's rules on AI, and stay out of projects that ask us to.",
  footer: [
    'Made with GitRanks Contribute and Claude Code (Opus) · Reviewed and submitted by @mira-dev',
    'Something off? Tell us or opt out in one step. Maintainers are always in control.',
  ],
} as const;

/* Home's boxes ------------------------------------------------------------------------------------------------------ */

export const needsYouRow = (over: Partial<HomeNeedsYouRow> = {}): HomeNeedsYouRow => ({
  box: 'APPROVE',
  round: null,
  since: '2026-11-24T08:00:00Z',
  repo: 'harbor-kit/relay',
  issueNumber: 512,
  title: 'Keep the retry delay when the queue reconnects',
  path: '/my/pull-requests/harbor-kit/relay/512',
  ...over,
});

type Run = NonNullable<HomeAgentRead['runs']>[number];
export const agentRun = (over: Partial<Run> = {}): Run => ({
  attemptId: 'att_7f3k',
  phase: 'WORKING',
  kind: 'FIRST',
  mode: 'FIX',
  runner: 'MCP',
  label: 'Working',
  elapsedSeconds: 12 * 60 + 20,
  title: 'Retry delay resets after a reconnect',
  nameWithOwner: 'harbor-kit/relay',
  number: 412,
  ...over,
});

export const agentRead = (over: Partial<HomeAgentRead> = {}): HomeAgentRead => ({
  runs: [],
  own: 'Claude Code',
  key: false,
  notice: null,
  capHold: null,
  paceHold: null,
  ...over,
});

export const mergedRead = (over: Partial<HomeMergedRead> = {}): HomeMergedRead => ({
  merged: 0,
  reposHelped: 0,
  newest: null,
  waiting: 0,
  ...over,
});

export const NEWEST_MERGED: NonNullable<HomeMergedRead['newest']> = {
  repo: 'driftwood-js/driftwood',
  issueNumber: 871,
  title: 'Count the last page when the total divides evenly',
  mergedAt: '2026-11-18T10:00:00Z',
  publicPage: '/contribute/pr/driftwood-js/driftwood/912',
};

export const homeRead = (over: Partial<HomeBoxesRead> = {}): HomeBoxesRead => ({
  firstDay: false,
  needsYou: [],
  agent: agentRead(),
  merged: mergedRead({ merged: 4, reposHelped: 3, newest: NEWEST_MERGED }),
  skillsHref: '/profile/mira-dev/skills',
  ...over,
});

/* Step 1 of the flow ------------------------------------------------------------------------------------------------ */

export const startRead = (over: Partial<StartWaysRead> = {}): StartWaysRead => ({
  signedIn: true,
  sign: false,
  own: null,
  key: 'none',
  attempt: false,
  issue: null,
  issueReads: false,
  ...over,
});
