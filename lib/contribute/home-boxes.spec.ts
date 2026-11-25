import { describe, expect, it } from 'vitest';

import {
  agentBoxOf,
  connectedLineOf,
  FIRST_DAY_BOXES,
  type HomeAgentRead,
  type HomeBoxesRead,
  type HomeBoxWords,
  type HomeMergedRead,
  type HomeNeedsYouRow,
  homeBoxesOf,
  mergedBoxOf,
  needsYouBoxOf,
  runLineOf,
} from './home-boxes';

const row = (over: Partial<HomeNeedsYouRow> = {}): HomeNeedsYouRow => ({
  box: 'APPROVE',
  round: null,
  since: '2026-11-20T10:00:00Z',
  repo: 'harbor-kit/relay',
  issueNumber: 512,
  title: 'Keep the retry delay when the queue reconnects',
  path: '/my/pull-requests/harbor-kit/relay/512',
  ...over,
});

type Run = NonNullable<HomeAgentRead['runs']>[number];
const run = (over: Partial<Run> = {}): Run => ({
  attemptId: 'a1',
  phase: 'WORKING',
  kind: 'FIRST',
  mode: 'FIX',
  runner: 'MANAGED_AGENTS',
  label: 'Working',
  elapsedSeconds: 12 * 60 + 30,
  title: 'Retry delay resets',
  nameWithOwner: 'harbor-kit/relay',
  number: 512,
  ...over,
});

const AGENT: HomeAgentRead = {
  runs: [],
  own: 'Claude Code',
  key: false,
  notice: null,
  capHold: null,
  paceHold: null,
};

/** A box as its words in reading order, empty parts left out. */
const said = (box: HomeBoxWords) =>
  [
    `${box.top}${box.chip ? ' (chip)' : ''}`,
    box.title,
    box.project,
    ...box.lines,
    box.link ? `${box.link.label} [${box.link.href}]` : null,
    box.button ? `button: ${box.button.label} [${box.button.href}]` : null,
    box.quiet ? '(quiet)' : null,
  ].filter(Boolean);

describe('needsYouBoxOf (box 1)', () => {
  it('shows the pull request that has waited longest, and how many more', () => {
    const box = needsYouBoxOf([
      row({ since: '2026-11-22T10:00:00Z', issueNumber: 7 }),
      row({ box: 'ROUND_WAITING', round: 2, since: '2026-11-19T10:00:00Z' }),
      row({ since: '2026-11-23T10:00:00Z', issueNumber: 9 }),
    ]);
    expect(said(box)).toEqual([
      'Needs you (chip)',
      'Round 2: something to answer',
      'harbor-kit/relay · #512',
      'Keep the retry delay when the queue reconnects',
      '2 more pull requests need you → [/my/pull-requests]',
      'button: See what was asked [/my/pull-requests/harbor-kit/relay/512]',
    ]);
  });

  it('says one more in the singular, and no link when it is the only one', () => {
    expect(needsYouBoxOf([row(), row({ since: '2026-11-21T00:00:00Z' })]).link?.label).toBe(
      '1 more pull request needs you →',
    );
    expect(needsYouBoxOf([row()]).link).toBeNull();
  });

  it('has no button for a row with no page: the way to the list takes its place', () => {
    const box = needsYouBoxOf([row({ path: null })]);
    expect(box.button).toBeNull();
    expect(box.link?.label).toBe('All your pull requests →');
  });

  it.each<[string, Partial<HomeNeedsYouRow>, string, string]>([
    ['the fix walkthrough', { box: 'WALKTHROUGH' }, 'The fix walkthrough is ready', 'Start the walkthrough'],
    [
      'a blocked walkthrough',
      { box: 'WALKTHROUGH', walkthroughBlocked: { reason: null } },
      'The fix walkthrough needs another pass',
      'Send it back to your agent',
    ],
    [
      'a round ready',
      { box: 'ROUND_READY', round: 2 },
      'Round 2 is ready: your agent made the change',
      'Read and approve',
    ],
    ['only the person can do it', { box: 'ONLY_YOU' }, 'Only you can do this', 'See what to do'],
    ['ready to open', { box: 'APPROVE' }, 'Ready to open the pull request', 'Read and approve'],
  ])('says %s with its own button', (_case, over, title, button) => {
    const box = needsYouBoxOf([row(over)]);
    expect(box.title).toBe(title);
    expect(box.button?.label).toBe(button);
    expect(box.chip).toBe(true);
  });

  it('is quiet when nothing needs the person', () => {
    expect(said(needsYouBoxOf([]))).toEqual([
      'Pull requests',
      'Nothing needs you',
      'When a pull request needs you, it shows here first.',
      'All your pull requests → [/my/pull-requests]',
      '(quiet)',
    ]);
  });

  it('says it could not read the list, and nothing untrue', () => {
    expect(said(needsYouBoxOf(null))).toEqual([
      'Pull requests',
      'We could not read your pull requests just now.',
      'All your pull requests → [/my/pull-requests]',
      '(quiet)',
    ]);
  });
});

describe('agentBoxOf (box 2)', () => {
  it.each<[string, Partial<HomeAgentRead>, string[]]>([
    [
      'one hosted run',
      { runs: [run()] },
      [
        'Your agent',
        'The hosted agent is fixing an issue',
        'harbor-kit/relay · #512',
        'Retry delay resets',
        'Working · Step 3 of 5 · 12 minutes',
        'button: See the run [/my/pull-requests/by-attempt/a1]',
      ],
    ],
    [
      'one run of the own agent',
      { runs: [run({ runner: 'MCP', elapsedSeconds: 30 })] },
      [
        'Your agent',
        'Claude Code is fixing an issue',
        'harbor-kit/relay · #512',
        'Retry delay resets',
        'Working · Step 3 of 5',
        'button: See the run [/my/pull-requests/by-attempt/a1]',
      ],
    ],
    [
      'several runs',
      {
        runs: [run(), run({ attemptId: 'a2' }), run({ attemptId: 'a3', runner: 'MCP' })],
      },
      [
        'Your agents',
        '3 fixes are under way',
        'The hosted agent on 2 issues, Claude Code on 1.',
        'When one finishes, its pull request shows under "Needs you".',
        'button: All runs [/my/agent/runs]',
      ],
    ],
    [
      'several runs, all of the own agent: the noun goes with the first part',
      {
        runs: [
          run({ runner: 'MCP' }),
          run({ attemptId: 'a2', runner: 'MCP' }),
          run({ attemptId: 'a3', runner: 'MCP' }),
        ],
      },
      [
        'Your agents',
        '3 fixes are under way',
        'Claude Code on 3 issues.',
        'When one finishes, its pull request shows under "Needs you".',
        'button: All runs [/my/agent/runs]',
      ],
    ],
    [
      'the key stopped working',
      {
        own: null,
        notice: { kind: 'key-invalid' },
      },
      [
        'Your agent',
        'Your Claude key stopped working',
        'Anthropic refused it: it was deleted, or it is not the key you meant. Contributing is paused until you connect a working one.',
        'button: Connect a new key [/my/agent/key?replace=1]',
      ],
    ],
    [
      'credits used up',
      { notice: { kind: 'exhausted', until: '2026-12-01T00:00:00.000Z' } },
      [
        'Your agent',
        'Your credits are used up for this cycle',
        'Nothing starts until they renew on Dec 1. Nothing is spent beyond them.',
        'button: Open the Agent tab [/my/agent]',
      ],
    ],
    [
      "the workspace's limit",
      { notice: { kind: 'limit-reached', until: '2026-12-01T00:00:00.000Z' } },
      [
        'Your agent',
        "Your workspace's spend limit is reached",
        'The Claude Console stopped this workspace at its monthly limit. Work starts again on Dec 1, or raise the limit in the Console.',
        'button: Open the Agent tab [/my/agent]',
      ],
    ],
    [
      'a cap that holds',
      { key: true, capHold: { period: 'week', attemptCapUsd: 2 } },
      [
        'Your agent',
        'The hosted agent waits for your caps',
        'Your spend cap for this week has less left than one fix may spend ($2), so nothing can start until that period turns or you raise the cap.',
        'button: Open the Agent tab [/my/agent]',
      ],
    ],
    [
      'nothing connected',
      { own: null, key: false },
      [
        'Your agent',
        'Connect an agent to start',
        'Claude Code, Codex, Cursor, Gemini CLI, VS Code or Antigravity. Or run the hosted agent on your Claude key.',
        'button: Connect an agent [/my/agent/connect]',
      ],
    ],
    [
      'the even pace holds a hosted agent that picks its own issues',
      { own: null, key: true, paceHold: { at: '14:00 UTC', picksOwn: true } },
      [
        'Your agent',
        'The hosted agent spreads your credits',
        'It spreads your credits across the cycle and starts the next fix at 14:00 UTC.',
        'button: Open the Agent tab [/my/agent]',
      ],
    ],
    [
      'the even pace holds, the person picks',
      { own: null, key: true, paceHold: { at: '14:00 UTC', picksOwn: false } },
      [
        'Your agent',
        'No agent is working',
        'Your Claude key is connected. You can start the next fix at 14:00 UTC.',
        '(quiet)',
      ],
    ],
    [
      'connected, nothing working',
      {},
      [
        'Your agent',
        'No agent is working',
        'Claude Code is connected. See an issue in full below, and it starts from there.',
        '(quiet)',
      ],
    ],
    [
      'the runs could not be read',
      { runs: null, key: true },
      ['Your agent', 'Claude Code and your Claude key are connected', '(quiet)'],
    ],
  ])('%s', (_case, over, expected) => {
    expect(said(agentBoxOf({ ...AGENT, ...over }))).toEqual(expected);
  });

  it('leaves out a queued run: nothing works on it yet', () => {
    expect(agentBoxOf({ ...AGENT, runs: [run({ phase: 'QUEUED' })] }).title).toBe('No agent is working');
  });
});

describe('connectedLineOf', () => {
  it.each([
    ['Codex', true, 'Codex and your Claude key are connected.'],
    ['Codex', false, 'Codex is connected.'],
    [null, true, 'Your Claude key is connected.'],
    [null, false, null],
  ])('%s, key %s', (own, key, expected) => {
    expect(connectedLineOf({ own, key })).toBe(expected);
  });
});

describe('runLineOf', () => {
  it('leaves out what is not known', () => {
    expect(runLineOf(run({ phase: 'WORKING', elapsedSeconds: 60 }))).toBe('Working · Step 3 of 5 · 1 minute');
    expect(runLineOf(run({ phase: 'DONE', elapsedSeconds: 0, label: 'Done' }))).toBe('Done');
  });
});

describe('mergedBoxOf (box 3)', () => {
  const NEWEST: HomeMergedRead['newest'] = {
    repo: 'harbor-kit/relay',
    issueNumber: 512,
    title: 'Keep the retry delay when the queue reconnects',
    mergedAt: '2026-11-18T10:00:00Z',
    publicPage: '/contribute/pr/harbor-kit/relay/88',
  };
  const read = (over: Partial<HomeMergedRead>): HomeMergedRead => ({
    merged: 0,
    reposHelped: 0,
    newest: null,
    waiting: 0,
    ...over,
  });

  it.each<[string, HomeMergedRead | null, string[]]>([
    [
      'several merged in several projects',
      read({ merged: 4, reposHelped: 3, newest: NEWEST }),
      [
        'Merged',
        '4 pull requests merged',
        'In 3 projects.',
        'Newest: Keep the retry delay when the queue reconnects, 18 Nov.',
        'button: See your Skills page [/profile/mira-dev/skills]',
      ],
    ],
    [
      'several merged in one project',
      read({ merged: 2, reposHelped: 1, newest: NEWEST }),
      [
        'Merged',
        '2 pull requests merged',
        'Newest: Keep the retry delay when the queue reconnects, 18 Nov.',
        'button: See your Skills page [/profile/mira-dev/skills]',
      ],
    ],
    [
      'the first one merged',
      read({ merged: 1, reposHelped: 1, newest: NEWEST }),
      [
        'Merged',
        'Your first pull request was merged',
        'harbor-kit/relay · #512',
        'Keep the retry delay when the queue reconnects. Merged 18 Nov.',
        'button: See how it was made [/contribute/pr/harbor-kit/relay/88]',
      ],
    ],
    [
      'the first one merged, no public page',
      read({ merged: 1, reposHelped: 1, newest: { ...NEWEST, publicPage: null } }),
      [
        'Merged',
        'Your first pull request was merged',
        'harbor-kit/relay · #512',
        'Keep the retry delay when the queue reconnects. Merged 18 Nov.',
      ],
    ],
    [
      'one waits',
      read({ waiting: 1 }),
      ['Merged', 'Nothing merged yet', '1 pull request waits for its maintainers. A merged one shows here.', '(quiet)'],
    ],
    [
      'several wait',
      read({ waiting: 3 }),
      [
        'Merged',
        'Nothing merged yet',
        '3 pull requests wait for their maintainers. A merged one shows here.',
        '(quiet)',
      ],
    ],
    [
      'nothing yet',
      read({}),
      ['Merged', 'Merged pull requests show here', 'Each with the project it helped.', '(quiet)'],
    ],
    [
      'a failed read',
      null,
      [
        'Merged',
        'We could not read your pull requests just now.',
        'All your pull requests → [/my/pull-requests]',
        '(quiet)',
      ],
    ],
    [
      'merged ones without the newest',
      read({ merged: 3 }),
      [
        'Merged',
        'We could not read your pull requests just now.',
        'All your pull requests → [/my/pull-requests]',
        '(quiet)',
      ],
    ],
  ])('%s', (_case, value, expected) => {
    expect(said(mergedBoxOf(value, '/profile/mira-dev/skills'))).toEqual(expected);
  });

  it('never says a zero count', () => {
    for (const value of [read({}), read({ waiting: 0 }), null]) {
      expect(said(mergedBoxOf(value, '/s')).join(' ')).not.toMatch(/\b0\b/);
    }
  });
});

describe('homeBoxesOf: the highlight and the first day', () => {
  const READ: HomeBoxesRead = {
    firstDay: false,
    needsYou: [],
    agent: AGENT,
    merged: { merged: 0, reposHelped: 0, newest: null, waiting: 0 },
    skillsHref: '/profile/mira-dev/skills',
  };

  it.each<[string, Partial<HomeBoxesRead>, 0 | 1 | null]>([
    ['a pull request needs the person', { needsYou: [row()] }, 0],
    ['needs-you comes before connecting', { needsYou: [row()], agent: { ...AGENT, own: null } }, 0],
    ['nothing connected', { agent: { ...AGENT, own: null } }, 1],
    ['an ordinary day', {}, null],
    ['the list could not be read', { needsYou: null }, null],
    ['the first day', { firstDay: true }, 0],
    ['the first day, nothing connected', { firstDay: true, agent: { ...AGENT, own: null } }, 1],
    ['the first day with a pull request that needs the person', { firstDay: true, needsYou: [row()] }, 0],
  ])('%s', (_case, over, lit) => {
    expect(homeBoxesOf({ ...READ, ...over }).lit).toBe(lit);
  });

  it('says what will happen on the first day', () => {
    expect(homeBoxesOf({ ...READ, firstDay: true }).boxes).toEqual(FIRST_DAY_BOXES);
  });

  it('on the first day with nothing connected, connecting takes the highlight and box 1 loses its mark', () => {
    const { boxes } = homeBoxesOf({ ...READ, firstDay: true, agent: { ...AGENT, own: null } });
    expect(boxes[0]).toEqual({ ...FIRST_DAY_BOXES[0], chip: false });
    expect(boxes[1].title).toBe('Connect an agent to start');
    expect(boxes[2]).toEqual(FIRST_DAY_BOXES[2]);
  });

  it("on the first day, box 2 gives way to the key's notice", () => {
    const notice = { kind: 'key-invalid' as const };
    expect(homeBoxesOf({ ...READ, firstDay: true, agent: { ...AGENT, notice } }).boxes[1].title).toBe(
      'Your Claude key stopped working',
    );
  });

  it('a first-day person whose pull request needs them gets the ordinary boxes', () => {
    expect(homeBoxesOf({ ...READ, firstDay: true, needsYou: [row()] }).boxes[0].top).toBe('Needs you');
  });
});
