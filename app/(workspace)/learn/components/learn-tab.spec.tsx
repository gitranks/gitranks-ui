import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

const nav = vi.hoisted(() => ({ pathname: '/learn' }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  usePathname: () => nav.pathname,
  useSearchParams: () => new URLSearchParams(),
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));
vi.mock('next-auth/react', () => ({ signIn: vi.fn(), useSession: () => ({ data: null }) }));
vi.mock('@/lib/learn/actions', () => ({
  saveLearnProfile: vi.fn(),
  readLearnIssues: vi.fn(),
  readPracticeLessons: vi.fn(),
}));
vi.mock('@/lib/workspace/actions', () => ({}));
vi.mock('@/lib/workspace/issue-actions', () => ({ startIssue: vi.fn(), skipIssue: vi.fn() }));
vi.mock('@/lib/workspace/start/start-page.actions', () => ({ readStartPageAttempt: vi.fn() }));
const workspace = vi.hoisted(() => ({
  viewerLogin: vi.fn(async () => 'octocat'),
  loadContribute: vi.fn(async (): Promise<unknown> => null),
  loadContributeActivity: vi.fn(async (): Promise<unknown> => null),
}));
vi.mock('@/lib/workspace/contribute.data', () => workspace);
const data = vi.hoisted(() => ({
  loadLearnOpen: vi.fn(async () => true),
  loadLearnProfile: vi.fn(),
  loadLearnSetup: vi.fn(async () => false),
  loadMyLearnAttempts: vi.fn(),
  loadLearnIssues: vi.fn(),
  loadPracticeLessons: vi.fn(),
}));
vi.mock('@/lib/learn/learn.data', () => data);
const progress = vi.hoisted(() => ({ loadLearnProgress: vi.fn(async (): Promise<unknown> => undefined) }));
vi.mock('@/lib/learn/progress/progress.data', () => progress);

const { LearnTabScreen } = await import('./learn-tab');
const { LearnTab } = await import('./learn-tab-view');
const { quickGoalInputOf } = await import('@/app/learn/components/learn-goal-quick');
const { emptyIssues, learnIssues, myAttempt, myLearnAttempts, practiceLessons } = await import(
  '@/lib/learn/__fixtures__/home'
);
const { emptyProfile, filledProfile } = await import('@/lib/learn/__fixtures__/profile');
const { learnTabStateOf } = await import('@/lib/learn/learn-tab');
const { runOf } = await import('@/lib/contribute/__fixtures__/agent-runs');

import type { LearnIssues, LearnProfile, MyLearnAttempts, PracticeLessons } from '@/lib/learn/learn.types';
import type { LearnProgressCounts } from '@/lib/learn/progress/progress.types';
import type { ContributeActivity, ContributeAgentRun } from '@/lib/workspace/contribute.types';

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&#x27;', "'")
    .replaceAll('&quot;', '"')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' ')
    .trim();

const COUNTS: LearnProgressCounts = { lessonsPassed: 7, newThings: 19, reposHelped: 2, prsMerged: 2, prsOpened: 3 };
const FIRST: LearnProgressCounts = { lessonsPassed: 0, newThings: 0, reposHelped: 0, prsMerged: 0, prsOpened: 0 };

/** The tab as drawn for the viewer; a part named `undefined` is one the API did not answer. */
const tab = (
  attempts: MyLearnAttempts | undefined,
  parts: {
    profile?: LearnProfile | null;
    issues?: LearnIssues;
    practice?: PracticeLessons;
    counts?: LearnProgressCounts;
    held?: boolean;
    activity?: ContributeActivity | null;
  } = {},
) => {
  const profile = 'profile' in parts ? (parts.profile ?? null) : filledProfile;
  return renderToStaticMarkup(
    <LearnTabScreen
      state={learnTabStateOf({ held: parts.held ?? false, settingUp: false, profile, attempts })}
      profile={profile}
      attempts={attempts}
      counts={'counts' in parts ? parts.counts : FIRST}
      issues={'issues' in parts ? parts.issues : learnIssues()}
      practice={'practice' in parts ? parts.practice : practiceLessons()}
      activity={parts.activity}
      agentName="Claude Code"
    />,
  );
};

const marks = (html: string) => [...html.matchAll(/data-mark="(\w+)"/g)].map((match) => match[1]);
const primaries = (html: string) => html.match(/data-variant="default"/g)?.length ?? 0;

describe('The Learn tab, every state', () => {
  it('heads every state with Learn, How Learn works and its line, and ends with Learn for maintainers alone', () => {
    for (const html of [tab(myLearnAttempts.none, { profile: emptyProfile }), tab(myLearnAttempts.none)]) {
      expect(text(html)).toMatch(/^Learn How Learn works → Your agent fixes a real issue and writes a lesson/);
      expect(html).toContain('href="/learn/about"');
      expect(html).toContain('href="/learn/maintainers"');
      expect(text(html)).not.toContain('My lessons');
      expect(text(html)).not.toContain('Goal and level');
    }
  });
});

describe('The Learn tab, no goal yet', () => {
  const html = tab(myLearnAttempts.none, { profile: emptyProfile });

  it('shows the path at its first step, asks what the viewer wants to learn, and says how a lesson is made', () => {
    expect(html).toContain('data-learn-tab="no-goal"');
    expect(text(html)).toContain('Your path to a first pull request');
    expect(marks(html)).toEqual(['now', 'next', 'next']);
    expect(html).toContain('data-goal-first');
    expect(text(html)).toContain('What do you want to learn?');
    expect(html).toMatch(/<button[^>]*type="submit"[^>]*disabled=""[^>]*data-contribute-source="learn_home_goal"/);
    expect(text(html)).toContain('Every lesson is made for one issue');
    expect(text(html)).toContain('They’re optional.');
    expect(html).not.toContain('id="issues"');
    expect(html).not.toContain('id="practice"');
  });
});

describe('The Learn tab, ready', () => {
  const html = tab(myLearnAttempts.none);

  it('lists the issues for the goal as Learn rows: Start a lesson to the Start page, the first one primary', () => {
    expect(html).toContain('data-learn-tab="ready"');
    expect(marks(html)).toEqual(['done', 'now', 'next']);
    expect(text(html)).toContain('Learn something new');
    expect(text(html)).toContain('Open TypeScript issues from projects that take outside pull requests.');
    expect(text(html)).toContain('For your goal: TypeScript Some Change');
    expect(html).toContain('href="/my/settings/goal"');
    expect(html.match(/data-side="learn"/g)).toHaveLength(4);
    const starts = [...html.matchAll(/href="(\/my\/start\/[^"]+)"/g)].map((match) => match[1].replaceAll('&amp;', '&'));
    expect(starts).toEqual([
      '/my/start/driftwood-js/driftwood/934?lesson=1',
      '/my/start/tidewave/tide/958?lesson=1',
      '/my/start/calendarist/cal/102?lesson=1',
      '/my/start/hearth/hearth-api/341?lesson=1',
    ]);
    expect(text(html).match(/Start a lesson/g)).toHaveLength(4);
    // Never a menu, never the hosted agent.
    expect(html).not.toContain('data-start-control="menu"');
    expect(html).not.toContain('data-start-control="hosted"');
    expect(html).toContain('data-contribute-source="learn_home_issue"');
    expect(html).toContain('href="https://github.com/driftwood-js/driftwood/issues/934"');
    expect(text(html)).toContain('Why it was picked: you want to learn TypeScript, and it has a clear reproduction');
    expect(text(html)).toContain('Size small');
    expect(primaries(html)).toBe(1);
  });

  it('offers practice as optional: three cards with their references, the total, then Show 10 more', () => {
    expect(text(html)).toContain('Practice lessons Optional');
    expect(text(html)).toContain(
      'Other learners’ lessons for the same goal. They need no agent. Lessons you passed are not shown.',
    );
    expect(text(html)).toContain('7 for TypeScript you haven’t passed');
    expect(html.match(/data-practice-lesson=/g)).toHaveLength(3);
    expect(text(html)).toContain('Issue #77');
    expect(html).toContain('href="https://github.com/calendarist/cal/issues/77"');
    expect(html.match(/data-contribute-source="learn_home_practice"/g)).toHaveLength(3);
    expect(text(html)).toContain('Showing 3 of 7 practice lessons Show 4 more');
    expect(text(html)).not.toContain('Show all');
    expect(html.indexOf('id="issues"')).toBeLessThan(html.indexOf('id="practice"'));
  });

  it('leaves practice out when no lesson matches the goal, or the API did not answer', () => {
    expect(tab(myLearnAttempts.none, { practice: practiceLessons({ items: [], total: 0 }) })).not.toContain(
      'id="practice"',
    );
    expect(tab(myLearnAttempts.none, { practice: undefined })).not.toContain('id="practice"');
  });

  it('keeps the rows without Start under the limit when there is no room for a new lesson', () => {
    const full = tab(myLearnAttempts.none, { issues: emptyIssues.noRoom });
    expect(full.match(/data-side="learn"/g)).toHaveLength(4);
    expect(full).not.toContain('href="/my/start/');
    expect(full).toContain('data-room="open_prs_at_a_time"');
    expect(text(full)).toContain(
      '2 of your pull requests are waiting on maintainers. A new one can start when one is merged or closed. Pull requests · Change the limit in Settings',
    );
    const busy = tab(myLearnAttempts.none, {
      issues: learnIssues({ room: { limit: 'attempts_at_a_time', value: 1 } }),
    });
    expect(text(busy)).toContain(
      'One of your issues is being worked on, the most at a time. One more can start when a run ends. Pull requests',
    );
    expect(busy).not.toContain('href="/my/start/');
  });

  it('words each way the list can be empty apart', () => {
    const none = tab(myLearnAttempts.none, { issues: emptyIssues.noneToday });
    expect(text(none)).toContain('No open issues fit TypeScript today. New ones come in every day. Change your goal');
    const unsupported = tab(myLearnAttempts.none, {
      profile: { ...filledProfile, goalValue: 'C++' },
      issues: emptyIssues.unsupported,
    });
    expect(text(unsupported)).toContain('Learn can’t find issues for this goal yet. Change your goal');
    expect(unsupported).toMatch(/data-variant="default"[^>]*href="\/my\/settings\/goal"/);
    const cap = tab(myLearnAttempts.none, { issues: emptyIssues.cap });
    expect(text(cap)).toContain('That’s today’s new issues');
    for (const issues of [emptyIssues.unread, undefined]) {
      const unread = tab(myLearnAttempts.none, { issues });
      expect(text(unread)).toContain('Couldn’t load the issues. Try again in a minute. Try again');
    }
    const capped = tab(myLearnAttempts.none, { issues: learnIssues({ capReached: true }) });
    expect(capped).toContain('data-issues-cap');
  });
});

describe("The Learn tab, the viewer's own lesson", () => {
  const run = (patch: Partial<ContributeAgentRun> = {}): ContributeAgentRun =>
    runOf({ attemptId: 'A_1', runner: 'MCP', mode: 'LEARN', phase: 'WRITING_LESSON', ...patch });
  const activity = (runs: ContributeAgentRun[]): ContributeActivity => ({
    items: [],
    runs,
    readAt: '2026-10-28T12:00:00.000Z',
  });

  it('while the agent works: the path at step 2, Right now with the Learn run, practice while you wait', () => {
    const html = tab(myLearnAttempts.working, {
      activity: activity([run(), run({ attemptId: 'F_1', mode: 'FIX', phase: 'WORKING' })]),
    });
    expect(html).toContain('data-learn-tab="working"');
    expect(marks(html)).toEqual(['done', 'working', 'next']);
    expect(html).toContain('data-right-now="learn"');
    expect(html).toContain('data-run="A_1"');
    expect(html).not.toContain('data-run="F_1"');
    expect(text(html)).toContain('Your own agent Claude Code');
    expect(text(html)).toContain('Practice while you wait Optional');
    expect(text(html)).toContain('and taking one doesn’t touch your own lesson.');
    expect(text(html)).toContain('One lesson of your own at a time. More issues show here once this one is done.');
    expect(html).not.toContain('id="issues"');
    // Gone: the own-lesson card and its "Changed your mind?".
    expect(text(html)).not.toContain('Changed your mind?');
    expect(html).not.toContain('data-own-card');
  });

  it('leaves Right now out with no Learn run at work', () => {
    expect(
      tab(myLearnAttempts.working, { activity: activity([run({ mode: 'FIX', phase: 'WORKING' })]) }),
    ).not.toContain('data-right-now');
    expect(tab(myLearnAttempts.working, { activity: null })).not.toContain('data-right-now');
  });

  it('once the lesson waits: step 3 is the primary link to it, with its length; practice and the one-at-a-time line', () => {
    const ready = tab({
      current: myAttempt({ stage: 'WARMUP', state: 'REVIEW', lessonMinutes: 10 }),
      lastPullRequest: null,
    });
    expect(ready).toContain('data-learn-tab="lesson"');
    expect(text(ready)).toContain('3 · Here, 10 minutes');
    expect(ready).toMatch(/data-variant="default"[^>]*href="\/my\/pull-requests\/by-attempt\/A_1\?view=lesson"/);
    expect(text(ready)).toContain('Take your lesson');
    expect(primaries(ready)).toBe(1);
    expect(text(ready)).toContain('Practice lessons Optional');
    expect(text(ready)).toContain('One lesson of your own at a time.');
    expect(ready).not.toContain('Your lesson is ready');

    expect(text(tab(myLearnAttempts.blocked))).toContain('Open your lesson');
    expect(text(tab(myLearnAttempts.approve))).toContain('Submit your pull request');
    const submitting = tab(myLearnAttempts.submitting);
    expect(text(submitting)).toContain('Opening your pull request…');
    expect(submitting).not.toContain('href="/my/pull-requests/by-attempt/A_1?view=lesson"');
  });

  it('after the first Learn pull request: four numbers in the path’s place, and nothing of a later lesson', () => {
    const html = tab(myLearnAttempts.ready, { counts: COUNTS });
    expect(html).toContain('data-number-tiles="learn"');
    expect(html).not.toContain('Your path to a first pull request');
    expect(text(html)).toContain('7 lessons passed');
    expect(text(html)).toContain('19 new things learned');
    expect(text(html)).toContain('2 repos helped');
    expect(text(html)).toContain('2 pull requests merged');
    expect(html).toContain('view=learned');
    expect(html).not.toContain('Take your lesson');
  });

  it('draws the path while the numbers are unread only if a lesson is in progress', () => {
    expect(tab(myLearnAttempts.working, { counts: undefined })).toContain('Your path to a first pull request');
    const quiet = tab(myLearnAttempts.none, { counts: undefined });
    expect(quiet).not.toContain('Your path to a first pull request');
    expect(quiet).not.toContain('data-number-tiles');
  });
});

describe('The Learn tab, a held account', () => {
  it('shows no issue and no Start, says why with Write to us, and keeps practice', () => {
    const html = tab(myLearnAttempts.none, { held: true });
    expect(html).toContain('data-learn-tab="held"');
    expect(text(html)).toContain('Learn is paused for this account, so no issues are shown. Write to us');
    expect(html).toContain('href="mailto:');
    expect(html).not.toContain('data-side="learn"');
    expect(html).not.toContain('href="/my/start/');
    expect(html).toContain('id="practice"');
  });
});

describe("The Learn tab's reads", () => {
  afterEach(() => {
    for (const fn of [...Object.values(data), ...Object.values(workspace)]) fn.mockClear();
  });

  const signedIn = async (attempts: MyLearnAttempts | undefined, profile: LearnProfile | null = filledProfile) => {
    data.loadMyLearnAttempts.mockResolvedValue(attempts);
    data.loadLearnProfile.mockResolvedValue(profile);
    data.loadLearnIssues.mockResolvedValue(learnIssues());
    data.loadPracticeLessons.mockResolvedValue(practiceLessons());
    return renderToStaticMarkup(await LearnTab());
  };

  it('reads the issues and practice only where the state shows them', async () => {
    expect(await signedIn(myLearnAttempts.none)).toContain('data-learn-tab="ready"');
    expect(data.loadLearnIssues).toHaveBeenCalledWith(10);
    expect(data.loadPracticeLessons).toHaveBeenCalledWith(3);

    data.loadLearnIssues.mockClear();
    data.loadPracticeLessons.mockClear();
    await signedIn(myLearnAttempts.working);
    // No new issue is revealed while the viewer's own lesson is in progress.
    expect(data.loadLearnIssues).not.toHaveBeenCalled();
    expect(data.loadPracticeLessons).toHaveBeenCalled();

    data.loadPracticeLessons.mockClear();
    await signedIn(myLearnAttempts.none, emptyProfile);
    expect(data.loadLearnIssues).not.toHaveBeenCalled();
    expect(data.loadPracticeLessons).not.toHaveBeenCalled();
  });

  it('reads no issue when the attempts could not be read: a lesson may be in progress', async () => {
    const html = await signedIn(undefined);
    expect(data.loadLearnIssues).not.toHaveBeenCalled();
    expect(html).toContain('data-issues-empty="unread"');
    expect(html).not.toContain('href="/my/start/');
  });

  it('holds a held account before anything else, and reads no issue for it', async () => {
    workspace.loadContribute.mockResolvedValueOnce({ contributor: { limits: { level: 'SUSPENDED' } } });
    const html = await signedIn(myLearnAttempts.none);
    expect(html).toContain('data-learn-tab="held"');
    expect(data.loadLearnIssues).not.toHaveBeenCalled();
  });

  it('shows the setup line to a new account, without reading its profile', async () => {
    data.loadLearnSetup.mockResolvedValueOnce(true);
    const html = await signedIn(myLearnAttempts.none);
    expect(html).toContain('data-learn-tab="setting-up"');
    expect(html).toContain('data-learn-setting-up');
    expect(data.loadLearnProfile).not.toHaveBeenCalled();
  });

  it('draws the numbers from the counts read', async () => {
    progress.loadLearnProgress.mockResolvedValueOnce({ counts: COUNTS });
    expect(await signedIn(myLearnAttempts.none)).toContain('data-number-tiles="learn"');
  });
});

describe('the quick goal', () => {
  it('saves the language as the goal at the picked level, keeping the other levels and the focus', () => {
    expect(quickGoalInputOf(filledProfile, 'Go', 2)).toEqual({
      goalKind: 'LANGUAGE',
      goalValue: 'Go',
      levels: [
        { language: 'Go', level: 2 },
        { language: 'TypeScript', level: 1 },
      ],
      focus: ['LANGUAGE', 'PATTERNS'],
    });
    expect(quickGoalInputOf(emptyProfile, 'TypeScript', 1)).toEqual({
      goalKind: 'LANGUAGE',
      goalValue: 'TypeScript',
      levels: [{ language: 'TypeScript', level: 1 }],
      focus: [],
    });
    expect(quickGoalInputOf(null, 'Python', 0)?.levels).toEqual([{ language: 'Python', level: 0 }]);
    expect(quickGoalInputOf(filledProfile, ' ', 1)).toBeNull();
  });
});
