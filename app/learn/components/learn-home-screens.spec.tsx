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
  readMyLearnAttempts: vi.fn(),
  readPracticeLessons: vi.fn(),
}));
vi.mock('@/lib/workspace/actions', () => ({}));
vi.mock('@/lib/workspace/contribute.data', () => ({ viewerLogin: vi.fn(async () => 'octocat') }));
const data = vi.hoisted(() => ({
  loadLearnOpen: vi.fn(async () => true),
  loadLearnProfile: vi.fn(),
  loadLearnSetup: vi.fn(async () => false),
  loadMyLearnAttempts: vi.fn(),
  loadLearnIssues: vi.fn(),
  loadPracticeLessons: vi.fn(),
}));
vi.mock('@/lib/learn/learn.data', () => data);

const { LearnHomeScreen, LearnHomeSignedIn } = await import('./learn-home');
const { quickGoalInputOf } = await import('./learn-goal-quick');
const { PracticeSection } = await import('./practice-lessons');
const { emptyIssues, learnIssues, myLearnAttempts, practiceLessons } = await import('@/lib/learn/__fixtures__/home');
const { emptyProfile, filledProfile } = await import('@/lib/learn/__fixtures__/profile');
const { learnHomeStateOf } = await import('@/lib/learn/learn-home');

import type {
  LearnIssues,
  LearnProfile,
  MyLearnAttempt,
  MyLearnAttempts,
  PracticeLessons,
} from '@/lib/learn/learn.types';

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&#x27;', "'")
    .replaceAll('&quot;', '"')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' ')
    .trim();

const NOW = new Date('2026-10-28T12:00:00.000Z');

/** Learn home as drawn for the viewer; a part named `undefined` is one the API did not answer. */
const home = (
  attempts: MyLearnAttempts,
  parts: { profile?: LearnProfile | null; issues?: LearnIssues; practice?: PracticeLessons } = {},
) => {
  const profile = 'profile' in parts ? (parts.profile ?? null) : filledProfile;
  return renderToStaticMarkup(
    <LearnHomeScreen
      state={learnHomeStateOf({ settingUp: false, profile, attempts })}
      profile={profile}
      issues={'issues' in parts ? parts.issues : learnIssues()}
      practice={'practice' in parts ? parts.practice : practiceLessons()}
      now={NOW}
    />,
  );
};

const marks = (html: string) => [...html.matchAll(/data-mark="(\w+)"/g)].map((match) => match[1]);

describe('Learn home, no goal yet', () => {
  const html = home(myLearnAttempts.none, { profile: emptyProfile });

  it('asks what the viewer wants to learn first: a language, the four levels, Show my issues', () => {
    expect(html).toContain('data-learn-home="no-goal"');
    expect(text(html)).toContain('Learn from real open-source fixes');
    expect(text(html)).toContain('Your path to a first pull request');
    expect(marks(html)).toEqual(['now', 'next', 'next']);
    expect(html).toContain('data-goal-first');
    expect(text(html)).toContain('What do you want to learn?');
    expect(text(html)).toContain('Choose a language');
    expect([...html.matchAll(/type="radio"/g)]).toHaveLength(4);
    expect(text(html)).toContain('New to it Some Comfortable Expert');
    // Nothing to save until a language is picked.
    expect(html).toMatch(/<button[^>]*type="submit"[^>]*disabled=""[^>]*data-contribute-source="learn_home_goal"/);
    expect(text(html)).toContain('Show my issues');
    expect(html).toContain('href="/learn/profile"');
    expect(text(html)).toContain('More choices: what to focus on');
  });

  it('says how a lesson is made, and that practice comes once a goal is set; no issues or practice yet', () => {
    expect(text(html)).toContain('Every lesson is made for one issue');
    expect(text(html)).toContain('They’re optional.');
    expect(html).not.toContain('id="issues"');
    expect(html).not.toContain('id="practice"');
  });

  it('ends with how Learn works, the page for maintainers and My lessons', () => {
    expect(html).toContain('href="/learn/about"');
    expect(html).toContain('href="/learn/maintainers"');
    expect(html).toContain('href="/learn/lessons"');
  });
});

describe('Learn home, goal set', () => {
  const html = home(myLearnAttempts.none);

  it('lists the issues for the goal, the first Start primary, each to its start page', () => {
    expect(html).toContain('data-learn-home="goal-set"');
    expect(marks(html)).toEqual(['done', 'now', 'next']);
    expect(text(html)).toContain('Pick an issue for your lesson');
    expect(text(html)).toContain('Open TypeScript issues from projects that take outside pull requests.');
    expect(text(html)).toContain('For your goal: TypeScript Some Change');
    expect(html.match(/data-learn-issue=/g)).toHaveLength(4);
    const starts = [...html.matchAll(/href="(\/learn\/start\/[^"]+)"/g)].map((match) => match[1]);
    expect(starts).toEqual([
      '/learn/start/driftwood-js/driftwood/934',
      '/learn/start/tidewave/tide/958',
      '/learn/start/calendarist/cal/102',
      '/learn/start/hearth/hearth-api/341',
    ]);
    expect(html.match(/data-contribute-source="learn_home_issue"/g)).toHaveLength(4);
    expect(html).toContain('aria-label="Start with my agent: driftwood-js/driftwood#934"');
    expect(text(html)).toContain('Why it was picked: you want to learn TypeScript, and it has a clear reproduction');
    expect(text(html)).toContain('Size small');
    // One primary action: the first row's.
    expect(html.match(/data-variant="default"/g)).toHaveLength(1);
    // No "at your level": the list does not filter by level.
    expect(text(html)).not.toContain('at your level');
  });

  it('offers practice as optional, with its context, the total and Show all', () => {
    expect(text(html)).toContain('Practice first? Optional');
    expect(text(html)).toContain('7 for TypeScript you haven’t passed');
    expect(html.match(/data-practice-lesson=/g)).toHaveLength(3);
    expect(text(html)).toContain('The issue: “Nested layouts re-render on every navigation”');
    expect(text(html)).toContain('Made for octocat , who wanted to learn TypeScript (some experience)');
    expect(text(html)).toContain('Made Oct 14, by Claude Code (Opus)');
    expect(text(html)).toContain('5 steps · 10 min · 14 passed');
    expect(html.match(/data-contribute-source="learn_home_practice"/g)).toHaveLength(3);
    expect(html).toContain('href="/learn/lessons/route-cache-miss-8f3k"');
    expect(text(html)).toContain('Show all 7');
    expect(html.indexOf('id="issues"')).toBeLessThan(html.indexOf('id="practice"'));
  });

  it('leaves practice out when no lesson matches the goal, and Show all when every one shows', () => {
    expect(home(myLearnAttempts.none, { practice: practiceLessons({ items: [], total: 0 }) })).not.toContain(
      'id="practice"',
    );
    expect(home(myLearnAttempts.none, { practice: undefined })).not.toContain('id="practice"');
    const all = renderToStaticMarkup(
      <PracticeSection practice={practiceLessons({ total: 3 })} goal="TypeScript" title="t" text="x" />,
    );
    expect(text(all)).not.toContain('Show all');
  });

  it('keeps the rows without Start, under the limit, when there is no room for a new lesson', () => {
    const full = home(myLearnAttempts.none, { issues: emptyIssues.noRoom });
    expect(full.match(/data-learn-issue=/g)).toHaveLength(4);
    expect(full).not.toContain('href="/learn/start/');
    expect(full).toContain('data-room="open_prs_at_a_time"');
    expect(text(full)).toContain(
      '2 of your pull requests are waiting on maintainers. A new lesson can start when one is merged or closed. My lessons',
    );
  });

  it('words each way the list can be empty apart', () => {
    const none = home(myLearnAttempts.none, { issues: emptyIssues.noneToday });
    expect(none).toContain('data-issues-empty="none-today"');
    expect(text(none)).toContain('No open issues fit TypeScript today. New ones come in every day. Change your goal');

    const unsupported = home(myLearnAttempts.none, {
      profile: { ...filledProfile, goalValue: 'C++' },
      issues: emptyIssues.unsupported,
    });
    expect(text(unsupported)).toContain('Learn can’t find issues for this goal yet. Change your goal');
    // With no row to start, Change your goal is the primary action.
    expect(unsupported).toMatch(/data-variant="default"[^>]*href="\/learn\/profile"/);

    const cap = home(myLearnAttempts.none, { issues: emptyIssues.cap });
    expect(text(cap)).toContain('That’s today’s new issues');
    expect(text(cap)).toContain('More arrive at 00:00 UTC');

    for (const issues of [emptyIssues.unread, undefined]) {
      expect(text(home(myLearnAttempts.none, { issues }))).toContain(
        'Couldn’t load the issues. Try again in a minute.',
      );
    }
  });
});

describe("Learn home, the viewer's own lesson", () => {
  it('while the agent works: the card, its newest step in fixed words, how to give it back, practice, one at a time', () => {
    const html = home(myLearnAttempts.working);
    expect(html).toContain('data-learn-home="own"');
    expect(marks(html)).toEqual(['done', 'working', 'next']);
    expect(text(html)).toContain('Working');
    expect(html).toContain('data-own-card="working"');
    expect(text(html)).toContain('driftwood-js/driftwood · issue #934');
    expect(text(html)).toContain('Your agent is working');
    expect(text(html)).toContain('Route params lose their type after a redirect');
    expect(text(html)).toContain('Latest: The agent started, 4 minutes ago');
    expect(text(html)).toContain(
      'Your lesson opens on its page when the fix passes our checks. Your agent tells you in the terminal too.',
    );
    expect(text(html)).not.toMatch(/email/i);
    expect(html).toContain('href="/learn/attempts/A_1"');
    expect(text(html)).toContain('Open your lesson page');
    expect(text(html)).toContain(
      'Changed your mind? Ask your agent to release the issue. If your agent stops, the claim ends by itself within 24 hours.',
    );
    expect(text(html)).toContain('While you wait: practice, if you like');
    expect(text(html)).toContain('One lesson of your own at a time. More issues show here once this one is done.');
    expect(html).not.toContain('id="issues"');
  });

  it('names the issue owner/repo#n until the agent stores its title', () => {
    const html = home(myLearnAttempts.noTitle);
    expect(text(html)).toContain('driftwood-js/driftwood#934');
    expect(text(html)).not.toContain('Latest:');
  });

  it('once the lesson is ready, its questions need fixing, or it passed', () => {
    const ready = home(myLearnAttempts.ready);
    expect(marks(ready)).toEqual(['done', 'done', 'now']);
    expect(text(ready)).toContain('Your lesson is ready');
    expect(text(ready)).toContain('Take your lesson');
    expect(ready).toContain('id="practice"');
    expect(text(ready)).toContain('One lesson of your own at a time.');

    const blocked = home(myLearnAttempts.blocked);
    expect(text(blocked)).toContain('The lesson’s questions need fixing');
    expect(text(blocked)).toContain('Send it back and your agent writes them again.');
    expect(text(blocked)).toContain('Open your lesson page');
    expect(blocked).not.toContain('id="practice"');
    expect(text(blocked)).toContain('One lesson of your own at a time.');

    const approve = home(myLearnAttempts.approve);
    expect(text(approve)).toContain('You passed. Approve your pull request');
    expect(text(approve)).toContain('Approve the pull request');
    expect(approve).not.toContain('id="practice"');
    expect(approve).not.toContain('id="issues"');
    expect(text(approve)).not.toContain('One lesson of your own at a time.');

    const submitting = home(myLearnAttempts.submitting);
    expect(text(submitting)).toContain('Opening your pull request…');
    expect(submitting).not.toContain('href="/learn/attempts/A_1"');
  });
});

describe('Learn home, the pull request', () => {
  it('says what maintainers do next, links the pull request and the result, then the next lesson', () => {
    const html = home(myLearnAttempts.prOpen);
    expect(html).toContain('data-learn-home="pull-request"');
    expect(marks(html)).toEqual(['done', 'done', 'done']);
    expect(text(html)).toContain('driftwood-js/driftwood · pull request #961');
    expect(text(html)).toContain('Your pull request is open');
    expect(text(html)).not.toContain('first pull request is open');
    expect(html).toContain('href="https://github.com/driftwood-js/driftwood/pull/961"');
    expect(html).toContain('href="https://gitranks.com/learn/lessons/route-params-redirect-k2p9/passes/octocat"');
    expect(text(html)).toContain('Your next lesson');
    expect(text(html)).toContain('Start the next one');
    // One primary action: the next lesson's Start; the pull request's link is outline.
    expect(html.match(/data-variant="default"/g)).toHaveLength(1);
    expect(html).toMatch(/data-variant="default"[^>]*href="\/learn\/start\/driftwood-js\/driftwood\/934"/);
    expect(text(html)).toContain('Practice, optional');
  });

  it('words a merged and a closed pull request apart, with no result link before the lesson is public', () => {
    expect(text(home(myLearnAttempts.merged))).toContain('Your pull request was merged');
    const closed = text(home(myLearnAttempts.closed));
    expect(closed).toContain('Your pull request was closed');
    expect(closed).toContain('That happens; the lesson stays yours.');
    const noResult = home({
      current: null,
      lastPullRequest: { ...(myLearnAttempts.prOpen.lastPullRequest as MyLearnAttempt), resultUrl: null },
    });
    expect(text(noResult)).not.toContain('Your lesson result');
  });
});

describe("Learn home's reads", () => {
  afterEach(() => {
    for (const fn of Object.values(data)) fn.mockClear();
  });

  const signedIn = async (attempts: MyLearnAttempts, profile: LearnProfile | null = filledProfile) => {
    data.loadMyLearnAttempts.mockResolvedValue(attempts);
    data.loadLearnProfile.mockResolvedValue(profile);
    data.loadLearnIssues.mockResolvedValue(learnIssues());
    data.loadPracticeLessons.mockResolvedValue(practiceLessons());
    return renderToStaticMarkup(await LearnHomeSignedIn());
  };

  it('reads the issues and practice only where the state shows them', async () => {
    expect(await signedIn(myLearnAttempts.none)).toContain('data-learn-home="goal-set"');
    expect(data.loadLearnIssues).toHaveBeenCalledWith(10);
    expect(data.loadPracticeLessons).toHaveBeenCalledWith(3);

    data.loadLearnIssues.mockClear();
    data.loadPracticeLessons.mockClear();
    await signedIn(myLearnAttempts.working);
    // No new issue is revealed while the viewer's own lesson is in progress.
    expect(data.loadLearnIssues).not.toHaveBeenCalled();
    expect(data.loadPracticeLessons).toHaveBeenCalled();

    data.loadPracticeLessons.mockClear();
    await signedIn(myLearnAttempts.approve);
    expect(data.loadLearnIssues).not.toHaveBeenCalled();
    expect(data.loadPracticeLessons).not.toHaveBeenCalled();

    await signedIn(myLearnAttempts.none, emptyProfile);
    expect(data.loadLearnIssues).not.toHaveBeenCalled();
  });

  it('reads no issue when the attempts could not be read: a lesson may be in progress', async () => {
    data.loadMyLearnAttempts.mockResolvedValue(undefined);
    data.loadLearnProfile.mockResolvedValue(filledProfile);
    data.loadPracticeLessons.mockResolvedValue(practiceLessons());
    const html = renderToStaticMarkup(await LearnHomeSignedIn());
    expect(data.loadLearnIssues).not.toHaveBeenCalled();
    expect(html).toContain('data-issues-empty="unread"');
    expect(html).not.toContain('href="/learn/start/');
  });

  it('shows the setup line to a new account, without reading its profile', async () => {
    data.loadLearnSetup.mockResolvedValueOnce(true);
    const html = await signedIn(myLearnAttempts.none);
    expect(html).toContain('data-learn-home="setting-up"');
    expect(html).toContain('data-learn-setting-up');
    expect(data.loadLearnProfile).not.toHaveBeenCalled();
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
    // A guessed level that is not the goal's stays a guess: not sent.
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
