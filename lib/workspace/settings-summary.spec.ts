import { describe, expect, it } from 'vitest';

import { movedAnchorOf, renamedAnchorOf, settingsPathOf, switchModeOf, switchPathOf } from './paths';
import {
  agentSummaryOf,
  attemptsSummaryOf,
  budgetSummaryOf,
  dcoSummaryOf,
  modelSummaryOf,
  openPrsSummaryOf,
  prSizeSummaryOf,
} from './settings-summary';
import { resolve, smallReposSet, stackSet } from '@/lib/contribute/__fixtures__/contribute-sets';
import { contributor, limits, mcpToken, settings, views } from '@/lib/contribute/__fixtures__/contribute-views';
import { stackPendingOf } from '@/lib/contribute/set-format';
import { keptListOf, listSummaryOf, preferencesSummaryOf, waitingLibrariesOf } from '@/lib/contribute/work-summary';

describe('the Settings summary', () => {
  it('says the preferences in short, naming three languages and counting the rest', () => {
    expect(preferencesSummaryOf(null)).toBe('Every language · every kind of issue · any size');
    expect(
      preferencesSummaryOf({
        languages: ['RUST', 'GO', 'PYTHON', 'JAVA', 'JS_TS'],
        topicIds: [],
        kinds: ['BUG', 'DOCS'],
        maxSize: 'M',
      }),
    ).toMatch(/^Rust, Go, Python \+2 · Bugs, Docs · up to medium$/);
  });

  it("says the hosted agent's budget and model in a line each", () => {
    expect(budgetSummaryOf(settings, contributor().spend)).toBe(
      '$63.40 of $200 used this cycle · renews Nov 14 · up to $5 an attempt',
    );
    expect(budgetSummaryOf(settings, null)).toBe('$200 a cycle · renews on the 14th · up to $5 an attempt');
    expect(modelSummaryOf(settings)).toBe('Claude Sonnet 5.5, medium effort');
  });

  it("says Settings' pull request rows in words", () => {
    expect(prSizeSummaryOf(settings)).toBe('Up to 400 changed lines, 15 files · a larger change stops before review');
    expect(dcoSummaryOf(settings)).toBe('Ask me each time a repo requires it');
    expect(dcoSummaryOf({ dco: 'STANDING' })).toBe('Sign off automatically when a repo requires it');
    expect(attemptsSummaryOf({ ...settings, attemptsAtATime: 2 }, limits.standard)).toBe(
      'Up to 2 issues in work at once',
    );
    expect(openPrsSummaryOf({ ...settings, openPrsAtATime: 8 }, limits.standard, 3)).toBe('Up to 8 · 3 open now');
  });
});

describe('the Settings pages', () => {
  it('sends each old section anchor to the page it is on now, and keeps the rest on the summary', () => {
    expect(movedAnchorOf('limits')).toBe('/my/agent/budget');
    expect(movedAnchorOf('prs')).toBe('/my/settings/pull-requests');
    expect(movedAnchorOf('agent')).toBe('/my/agent/model');
    expect(movedAnchorOf('github')).toBe('/my/settings/github');
    expect(movedAnchorOf('ignored')).toBe('/my/settings/work#ignored');
    expect(movedAnchorOf('email')).toBeNull();
    expect(movedAnchorOf('more-limits')).toBe('/my/agent/budget#more-limits');
    expect(movedAnchorOf('access')).toBe('/my/agent/key');
    expect(movedAnchorOf('own-agent')).toBe('/my/agent#own-agent');
    expect(movedAnchorOf('pause')).toBe('/my/agent#hosted-level');
    expect(movedAnchorOf('modes')).toBe('/my/settings/work#modes');
    expect(settingsPathOf('work')).toBe('/my/settings/work#work');
    expect(movedAnchorOf('autopilot')).toBe('/my/agent#autopilot');
    expect(movedAnchorOf('constructor')).toBeNull();
    expect(settingsPathOf('danger')).toBe('/my/settings#danger');
  });
});

describe('what you work on, in short', () => {
  it('names each switch page by its mode, and reads the mode back', () => {
    expect(switchPathOf('STACK')).toBe('/my/settings/work/switch/stack');
    expect(switchPathOf('REPOS')).toBe('/my/settings/work/switch/repos');
    expect(switchModeOf('stack')).toBe('STACK');
    expect(switchModeOf('repos')).toBe('REPOS');
    expect(switchModeOf('all')).toBeNull();
    expect(switchModeOf('STACK')).toBeNull();
  });

  it('says the stack is worked out while it is, and that none was found once it was', () => {
    const fresh = stackSet({ stack: { ...stackSet().stack, resolve: null } });
    expect(listSummaryOf(fresh)).toBe('Working out your libraries from 3 repos · all issues until then');
    expect(waitingLibrariesOf(fresh)).toContain('Until one is read, your agent works on all issues.');
    const setOnly = stackSet({ stack: { ...stackSet().stack, fallback: 'SET_ONLY', resolve: null } });
    expect(listSummaryOf(setOnly)).toBe('Working out your libraries from 3 repos · all issues until then');
    // Every library found still read for the first time: pending, and it says so.
    const justNow = new Date().toISOString();
    const reading = resolve({
      targets: resolve().targets.map((each) =>
        each.status === 'ACTIVE' ? { ...each, status: 'CHECKING' as const, addedAt: justNow } : each,
      ),
    });
    // Its sources all read: the libraries are found, only their issues are read.
    const sources = stackSet().stack.sources.map((each) => ({ ...each, status: 'ACTIVE' as const }));
    const readingSet = stackSet({ stack: { ...stackSet().stack, sources, resolve: reading } });
    expect(stackPendingOf(readingSet)).toBe(true);
    expect(listSummaryOf(readingSet)).toMatch(/^Reading \d+ libraries for the first time · all issues until then$/);
    // A first read that never landed, a day on, no longer holds it.
    expect(stackPendingOf(readingSet, new Date(Date.now() + 25 * 60 * 60 * 1000))).toBe(false);
    // A stack that works goes on waiting while a new source is worked out.
    expect(stackPendingOf(stackSet({ stack: { ...stackSet().stack, resolve: resolve({ state: 'RESOLVING' }) } }))).toBe(
      false,
    );
    expect(stackPendingOf(stackSet())).toBe(false);
    // Only libraries that failed their read: none to work on, and with "wait" it says the agent would wait.
    const failedOnly = stackSet({
      stack: {
        ...stackSet().stack,
        fallback: 'SET_ONLY',
        resolve: resolve({ targets: resolve().targets.map((each) => ({ ...each, status: 'FAILED' as const })) }),
      },
    });
    expect(waitingLibrariesOf(failedOnly)).toContain('so your agent would wait');
    expect(listSummaryOf(failedOnly)).toBe('No libraries found in 3 repos · waiting');

    const none = stackSet({ stack: { ...stackSet().stack, resolve: resolve({ targets: [] }) } });
    expect(listSummaryOf(none)).toBe('No libraries found in 3 repos · all issues meanwhile');
    expect(waitingLibrariesOf(none)).toContain('We found no libraries we can work on');

    expect(waitingLibrariesOf(stackSet())).toBeNull();
    expect(listSummaryOf(stackSet())).toBe('50 libraries from 3 repos · then all issues');
  });

  it('says what a switch keeps', () => {
    expect(keptListOf(stackSet())).toBe('Your stack (3 repos) stays saved: switch back any time.');
    expect(keptListOf(smallReposSet())).toBe('Your repos list (12 repos) stays saved: switch back any time.');
    expect(keptListOf(stackSet({ mode: 'ALL' }))).toBeNull();
  });
});

describe('the AI agent row', () => {
  it('names the agent connected last and the day, then how many others', () => {
    const one = { ...views.active, ownAgent: { paths: { hosted: false, mcp: true }, tokens: [mcpToken()] } };
    expect(agentSummaryOf(one)).toEqual({ connected: true, value: 'Claude Code on macOS · connected on 28 Oct' });
    const older = mcpToken({ id: 'T_0', name: 'Codex', createdAt: '2026-10-03T09:00:00.000Z' });
    const two = { ...views.active, ownAgent: { paths: { hosted: false, mcp: true }, tokens: [older, mcpToken()] } };
    expect(agentSummaryOf(two).value).toBe('Claude Code on macOS and 1 other agent · connected on 28 Oct');
  });

  it('names the hosted agent with a key and no token, and says when none is connected', () => {
    expect(agentSummaryOf({ ...views.active, ownAgent: { paths: { hosted: true, mcp: false }, tokens: [] } })).toEqual({
      connected: true,
      value: 'The hosted agent, with your Claude key',
    });
    const none = {
      ...views.active,
      contributor: contributor({ credentials: [] }),
      ownAgent: { paths: { hosted: false, mcp: false }, tokens: [] },
    };
    expect(agentSummaryOf(none)).toEqual({
      connected: false,
      value: 'No agent connected yet. An agent is what fixes an issue for you.',
    });
  });
});

describe("Settings' renamed groups", () => {
  it('lands an old anchor on the group it is now, and leaves the rest as they are', () => {
    expect(renamedAnchorOf('for-learning')).toBe('learn-preferences');
    expect(renamedAnchorOf('for-contributing')).toBe('contribute-preferences');
    expect(renamedAnchorOf('pull-requests')).toBe('pr-limits');
    expect(renamedAnchorOf('email')).toBe('email');
    expect(renamedAnchorOf('toString')).toBe('toString');
  });
});
