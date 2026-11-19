import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PublicLesson } from '@/lib/learn/learn.types';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/learn/profile',
  useSearchParams: () => new URLSearchParams(),
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));
vi.mock('next-auth/react', () => ({ signIn: vi.fn(), useSession: () => ({ data: null }) }));
vi.mock('@/lib/learn/actions', () => ({
  saveLearnProfile: vi.fn(),
  readMyLearnAttempts: vi.fn(),
  readLearnIssueCount: vi.fn(),
}));
vi.mock('@/lib/workspace/actions', () => ({}));
vi.mock('@/lib/contribute/actions', () => ({}));
vi.mock('@/lib/workspace/issue-actions', () => ({}));
const { everyone, viewerLogin } = vi.hoisted(() => ({
  everyone: vi.fn(async () => false),
  viewerLogin: vi.fn(async (): Promise<string | undefined> => undefined),
}));
vi.mock('@/lib/workspace/contribute.data', () => ({ loadContribute: vi.fn(), viewerLogin }));
vi.mock('@/lib/learn/learn-front-door', () => ({ learnFrontDoorOpenToVisitor: everyone }));
const data = vi.hoisted(() => ({
  loadLearnOpen: vi.fn(),
  loadLearnProfile: vi.fn(),
  loadLearnSetup: vi.fn(),
  loadMyLessons: vi.fn(),
  loadMyLearnAttempts: vi.fn(async () => ({ current: null, lastPullRequest: null })),
  loadLearnIssues: vi.fn(async () => undefined),
  loadPracticeLessons: vi.fn(async () => undefined),
}));
vi.mock('@/lib/learn/learn.data', () => data);
const recent = vi.hoisted(() => ({ readRecentLessons: vi.fn(async () => [] as PublicLesson[]) }));
vi.mock('@/lib/learn/recent-lessons.data', () => recent);

const { LearnAboutView, LearnHomeView, LearnLanding } = await import('./learn-landing');
const { LearnHomeSignedIn } = await import('./learn-home');
const { publishedDayOf, RecentLessons } = await import('./recent-lessons');
const { recentLessons } = await import('@/lib/learn/__fixtures__/recent-lessons');
const { LearnMaintainers } = await import('./learn-maintainers');
const { LearnProfileScreen, LearnProfileView } = await import('./learn-profile');
const { MyLessonsScreen, MyLessonsView } = await import('./my-lessons');
const { goalSavedWordsOf } = await import('./goal-saved-next');
const { emptyIssues, practiceNext } = await import('@/lib/learn/__fixtures__/home');
const { emptyProfile, filledProfile, myLessons } = await import('@/lib/learn/__fixtures__/profile');
const { controlDescriptions, controlNames } = await import('@/lib/learn/__fixtures__/control-names');

/** The front door's recent lessons, as `LearnHomeView` lazily reads them (inside their own Suspense), rendered. */
async function recentOf(home: ReactElement<{ recentLessons?: ReactElement<{ children: ReactElement }> }>) {
  const loaded = home.props.recentLessons?.props.children;
  if (!loaded) return '';
  return renderToStaticMarkup(await (loaded.type as () => Promise<ReactElement>)());
}

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&#x27;', "'")
    .replaceAll('&quot;', '"')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' ')
    .trim();

describe("Learn's front door", () => {
  it('signs a visitor in from Start learning, and sends a signed-in user to Learn home', () => {
    const visitor = renderToStaticMarkup(<LearnLanding viewer="visitor" />);
    expect(visitor.match(/data-sign-in="learn"/g)).toHaveLength(2);
    expect(visitor).not.toContain('href="/learn/profile"');
    const member = renderToStaticMarkup(<LearnLanding viewer="signed-in" />);
    expect(member).not.toContain('data-sign-in');
    expect(member).not.toContain('href="/learn/profile"');
    expect(member.match(/href="\/learn"/g)).toHaveLength(2);
  });

  it('shows the example lesson with its diagram and question, the parts, and the way to maintainers', () => {
    const html = renderToStaticMarkup(<LearnLanding viewer="visitor" />);
    expect(html).toContain('id="lesson"');
    expect(html).toContain('href="#lesson"');
    expect(html).toContain('data-diagram=');
    expect(html.match(/role="radio"/g)).toHaveLength(2);
    expect(text(html)).toContain('Two spellings of one route got two cache entries');
    expect(text(html)).toContain('Before Cause The fix How it connects Deep dive');
    expect(html).toContain('href="/learn/maintainers"');
    // There are no domains to pick yet, so the front door does not offer one.
    expect(text(html)).not.toMatch(/domain/i);
  });

  it('lists the newest shared lessons, each a link to its page, with its repository, language and day', () => {
    const html = renderToStaticMarkup(
      <LearnLanding viewer="visitor" recentLessons={<RecentLessons lessons={recentLessons} />} />,
    );
    expect(html).toContain('data-recent-lessons');
    expect(html.match(/href="\/learn\/lessons\/[^"]+"/g)).toEqual([
      'href="/learn/lessons/why-1h30m-came-back-as-one-hour-p47ocg"',
      'href="/learn/lessons/two-spellings-of-one-route-k2m9qa"',
      'href="/learn/lessons/a-lesson-on-a-topic-z7x3wb"',
    ]);
    expect(text(html)).toContain('Why 1h30m came back as one hour spf13/cobra Go 14 Nov 2026');
    // A topic lesson has no repository or language: its day alone.
    expect(text(html)).toContain('Retries that waited for nothing 10 Nov 2026');
  });

  it('leaves the list out when no lesson is shared yet, or the API did not answer', () => {
    expect(renderToStaticMarkup(<LearnLanding viewer="visitor" />)).not.toContain('Recent lessons');
    expect(renderToStaticMarkup(<RecentLessons lessons={[]} />)).toBe('');
  });

  it("writes a lesson's day in UTC, and nothing for a date that does not parse", () => {
    expect(publishedDayOf('2026-11-14T23:59:59.000Z')).toBe('14 Nov 2026');
    expect(publishedDayOf('2026-09-01T00:00:00.000Z')).toBe('1 Sep 2026');
    expect(publishedDayOf('not a date')).toBe('');
  });
});

describe('Learn for maintainers', () => {
  it('names the opt-in key, and leads to the rules and report pages', () => {
    const html = renderToStaticMarkup(<LearnMaintainers />);
    expect(text(html)).toContain('You got a pull request made with GitRanks Learn');
    expect(text(html)).toContain('learn: welcome');
    expect(text(html)).toContain('.github/gitranks.yml');
    expect(html).toContain('href="/contribute/maintainers"');
    expect(html).toContain('href="/contribute/maintainers/report"');
  });
});

describe('Goal and level', () => {
  it('starts with no goal picked, the levels guessed and marked, no domain, and Save off', () => {
    const html = renderToStaticMarkup(<LearnProfileScreen profile={emptyProfile} />);
    expect(html).toContain('data-learn-profile="empty"');
    expect(text(html)).toContain('A language');
    expect(text(html)).toContain('How one project works');
    expect(text(html)).not.toContain('A domain');
    expect(html.match(/data-guessed="true"/g)).toHaveLength(3);
    expect(text(html)).toContain('We guessed from your public GitHub work.');
    expect(text(html)).toContain('Pick what you want to learn.');
    expect(html).toContain('type="submit" disabled=""');
    // The user's agent is on the Agent tab alone.
    expect(html).not.toContain('data-learn-agent');
  });

  it('shows a saved profile: the goal with its language, Your goal first, the focus ticked', () => {
    const html = renderToStaticMarkup(<LearnProfileScreen profile={filledProfile} />);
    expect(html).toContain('data-learn-profile="filled"');
    expect(html).toMatch(/data-goal="LANGUAGE"[^>]*class="[^"]*border-primary/);
    expect(text(html)).toContain('TypeScript Your goal · 2 repos, since Oct 2026');
    expect(html.match(/data-guessed="true"/g)).toHaveLength(2);
    expect(html.match(/role="checkbox"[^>]*aria-checked="true"/g)).toHaveLength(2);
    expect(html).toContain('type="submit"');
    expect(html).not.toContain('type="submit" disabled=""');
    expect(html).not.toContain('data-saved-next');
  });

  it('once saved, says so by the button and shows the next step under the form', () => {
    const saved = (next: Parameters<typeof goalSavedWordsOf>[0], profile = filledProfile) =>
      renderToStaticMarkup(<LearnProfileScreen profile={profile} saved={{ next }} />);
    const issues = saved(practiceNext.own);
    expect(text(issues)).toContain('Save Saved');
    expect(text(issues)).not.toContain('ask your agent');
    expect(issues).toContain('data-saved-next="issues"');
    expect(text(issues)).toContain('Next: an issue to learn from 4 open issues fit TypeScript.');
    expect(issues).toMatch(/href="\/learn#issues"[^>]*>See issues for TypeScript/);

    const lesson = saved(practiceNext.back);
    expect(text(lesson)).toContain(
      'Your next lesson can start once “Route params lose their type after a redirect” is done.',
    );
    expect(lesson).toMatch(/href="\/my\/pull-requests\/by-attempt\/A_1"[^>]*>Back to your lesson/);

    const unsupported = saved(practiceNext.unsupported, { ...filledProfile, goalValue: 'C++' });
    expect(text(unsupported)).toContain(
      'Learn can’t find issues for C++ yet. Pick a language from the list on Learn home.',
    );
    expect(unsupported).toMatch(/href="\/learn"[^>]*>Back to Learn home/);
  });

  it('words each next step after a save', () => {
    expect(goalSavedWordsOf({ current: null, issues: emptyIssues.noneToday }, 'Go').text).toBe(
      'None fit Go today. New ones come in every day.',
    );
    expect(goalSavedWordsOf({ current: null, issues: { ...emptyIssues.noneToday, total: 1 } }, 'Go').text).toMatch(
      /^1 open issue fits Go\./,
    );
    // Nothing read: Learn home, whose list says the rest.
    expect(goalSavedWordsOf(null, 'Go')).toMatchObject({
      text: 'Learn home lists the open issues for your goal.',
      action: { href: '/learn#issues', label: 'See issues for Go' },
    });
  });

  it('names every goal, level and focus control by its text', () => {
    const html = renderToStaticMarkup(<LearnProfileScreen profile={filledProfile} />);
    const radios = controlNames(html, 'radio');
    expect(radios).toContain('A language');
    expect(radios).toContain('How one project works');
    for (const name of radios) expect(name).toBeTruthy();
    expect(controlDescriptions(html, 'radio').filter(Boolean).length).toBeGreaterThan(0);
    expect(controlNames(html, 'checkbox')).toEqual([
      'How the language works',
      'How the project is organised',
      'Patterns the project uses',
      'Tests and tooling',
    ]);
  });

  it('says when there are no languages yet', () => {
    const html = renderToStaticMarkup(<LearnProfileScreen profile={null} />);
    expect(text(html)).toContain('No languages yet.');
  });
});

describe('My lessons', () => {
  it('lists what is going, then what is done, with outline buttons on the done ones', () => {
    const html = renderToStaticMarkup(<MyLessonsScreen lessons={myLessons} />);
    expect(text(html)).toContain('In progress · 1');
    expect(text(html)).toContain('Done · 3');
    expect(html).toContain('href="/my/pull-requests/by-attempt/A_3"');
    expect(html).toContain('href="/learn/lessons/retry-backoff-jitter-2m9q"');
    expect(html.indexOf('lessons-going')).toBeLessThan(html.indexOf('lessons-done'));
    expect(html.match(/data-variant="outline"/g)).toHaveLength(3);
  });

  it('says each lesson is made for an issue picked on Learn home, and when the list did not load', () => {
    const empty = renderToStaticMarkup(<MyLessonsScreen lessons={[]} />);
    expect(text(empty)).toContain('No lessons yet');
    expect(text(empty)).toContain('Each lesson here is written by your agent for an issue you pick');
    expect(text(empty)).not.toContain('Find me an issue to learn from on GitRanks');
    expect(empty).not.toContain('href="/learn/profile"');
    expect(empty).toMatch(/data-variant="default"[^>]*href="\/learn"[^>]*>Pick an issue for your first lesson/);
    // With no goal saved, practice waits for one: Learn home asks it first.
    expect(empty).toMatch(/href="\/learn"[^>]*>Or see a practice lesson first/);
    const withGoal = renderToStaticMarkup(<MyLessonsScreen lessons={[]} hasGoal />);
    expect(withGoal).toMatch(/href="\/learn#practice"[^>]*>Or see a practice lesson first/);
    const failed = renderToStaticMarkup(<MyLessonsScreen lessons={undefined} />);
    expect(text(failed)).toContain('Your lessons are not available right now.');
  });
});

describe("Learn's gate on its own pages", () => {
  const closed = () => {
    data.loadLearnOpen.mockResolvedValue(false);
    data.loadLearnProfile.mockRejectedValue(new Error('down'));
    data.loadMyLessons.mockResolvedValue(undefined);
  };

  afterEach(() => {
    data.loadLearnSetup.mockReset();
    recent.readRecentLessons.mockClear().mockResolvedValue([]);
  });

  it('answers not found to anyone Learn is not open to, whatever the other reads do', async () => {
    closed();
    data.loadLearnSetup.mockResolvedValue(true);
    await expect(LearnHomeView()).rejects.toThrow('NEXT_NOT_FOUND');
    await expect(LearnAboutView()).rejects.toThrow('NEXT_NOT_FOUND');
    await expect(LearnProfileView()).rejects.toThrow('NEXT_NOT_FOUND');
    await expect(MyLessonsView()).rejects.toThrow('NEXT_NOT_FOUND');
    expect(recent.readRecentLessons).not.toHaveBeenCalled();
  });

  it("opens the front door's visitor version to a visitor once Learn is open to everyone, and nothing else", async () => {
    closed();
    data.loadLearnSetup.mockResolvedValue(false);
    everyone.mockResolvedValue(true);
    try {
      recent.readRecentLessons.mockResolvedValue(recentLessons);
      const home = await LearnHomeView();
      expect(renderToStaticMarkup(home)).toContain('data-landing-viewer="visitor"');
      expect(await recentOf(home)).toContain('href="/learn/lessons/why-1h30m-came-back-as-one-hour-p47ocg"');
      await expect(LearnProfileView()).rejects.toThrow('NEXT_NOT_FOUND');
      await expect(MyLessonsView()).rejects.toThrow('NEXT_NOT_FOUND');
      // A signed-in person Learn is not open to still gets a 404 (the list, not everyone, decides for them).
      viewerLogin.mockResolvedValueOnce('stranger');
      await expect(LearnHomeView()).rejects.toThrow('NEXT_NOT_FOUND');
    } finally {
      everyone.mockResolvedValue(false);
    }
  });

  it('says a new account is being set up, in place of the form and the list, with a refresh', async () => {
    data.loadLearnOpen.mockResolvedValue(true);
    data.loadLearnSetup.mockResolvedValue(true);
    data.loadLearnProfile.mockResolvedValue(null);
    data.loadMyLessons.mockResolvedValue([]);
    for (const html of [
      renderToStaticMarkup(await LearnProfileView()),
      renderToStaticMarkup(await MyLessonsView()),
      renderToStaticMarkup(await LearnHomeSignedIn()),
    ]) {
      expect(html).toContain('data-learn-setting-up');
      expect(text(html)).toContain('Setting up your GitRanks account. This takes about a minute. Refresh');
      expect(html).not.toContain('data-learn-profile=');
    }
  });

  it('draws the pages for a user Learn is open to', async () => {
    data.loadLearnOpen.mockResolvedValue(true);
    data.loadLearnProfile.mockResolvedValue(filledProfile);
    data.loadMyLessons.mockResolvedValue(myLessons);
    recent.readRecentLessons.mockResolvedValue(recentLessons);
    // `/learn` is Learn home for them; the front door moved to `/learn/about`.
    const home = await LearnHomeView();
    expect(home.type).toBe(LearnHomeSignedIn);
    expect(renderToStaticMarkup(await LearnHomeSignedIn())).toContain('data-learn-home="goal-set"');
    const about = await LearnAboutView();
    expect(renderToStaticMarkup(about)).toContain('data-landing-viewer="signed-in"');
    expect(await recentOf(about)).toContain('data-recent-lessons');
    expect(renderToStaticMarkup(await LearnProfileView())).toContain('data-learn-profile="filled"');
    expect(renderToStaticMarkup(await MyLessonsView())).toContain('data-lesson="A_3"');
  });
});
