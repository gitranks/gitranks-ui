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
vi.mock('@/lib/workspace/start/start-page.actions', () => ({ readStartPageAttempt: vi.fn() }));
vi.mock('next-auth/react', () => ({ signIn: vi.fn(), useSession: () => ({ data: null }) }));
vi.mock('@/lib/learn/actions', () => ({
  saveLearnProfile: vi.fn(),
  readMyLearnAttempts: vi.fn(),
}));
vi.mock('@/lib/workspace/actions', () => ({}));
vi.mock('@/lib/contribute/actions', () => ({}));
vi.mock('@/lib/workspace/issue-actions', () => ({}));
const { everyone, viewerLogin } = vi.hoisted(() => ({
  everyone: vi.fn(async () => false),
  viewerLogin: vi.fn(async (): Promise<string | undefined> => undefined),
}));
vi.mock('@/lib/workspace/contribute.data', () => ({
  loadContribute: vi.fn(async () => null),
  loadContributeActivity: vi.fn(async () => null),
  viewerLogin,
}));
vi.mock('@/lib/learn/learn-front-door', () => ({ learnFrontDoorOpenToVisitor: everyone }));
const data = vi.hoisted(() => ({
  loadLearnOpen: vi.fn(),
  loadLearnProfile: vi.fn(),
  loadLearnSetup: vi.fn(),
  loadMyLearnAttempts: vi.fn(async () => ({ current: null, lastPullRequest: null })),
  loadLearnIssues: vi.fn(async () => undefined),
  loadPracticeLessons: vi.fn(async () => undefined),
}));
vi.mock('@/lib/learn/learn.data', () => data);
vi.mock('@/lib/learn/progress/progress.data', () => ({ loadLearnProgress: vi.fn(async () => undefined) }));
const recent = vi.hoisted(() => ({ readRecentLessons: vi.fn(async () => [] as PublicLesson[]) }));
vi.mock('@/lib/learn/recent-lessons.data', () => recent);
const ENTERED = { kind: 'open', entered: true, agents: { hosted: false, own: true }, learnOpen: true };
const gate = vi.hoisted(() => ({ loadWorkspaceGate: vi.fn(async (): Promise<unknown> => ENTERED) }));
vi.mock('@/lib/workspace/gate.data', () => ({ loadLearnOpen: vi.fn(async () => false), ...gate }));

const { LEARN_VISITOR_START, LearnAboutView, LearnHomeView, LearnLanding } = await import('./learn-landing');
const { LearnTab } = await import('@/app/(workspace)/learn/components/learn-tab-view');
const { publishedDayOf, RecentLessons } = await import('./recent-lessons');
const { recentLessons } = await import('@/lib/learn/__fixtures__/recent-lessons');
const { LearnMaintainers } = await import('./learn-maintainers');
const { GoalSettingsScreen: LearnProfileScreen, GoalSettingsView: LearnProfileView } = await import(
  '@/app/(workspace)/my/settings/components/settings-pages'
);
const { emptyProfile, filledProfile } = await import('@/lib/learn/__fixtures__/profile');
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
  it('has one button, Start learning, a plain link into the flow with the mark, in the hero and beside the questions', () => {
    const visitor = renderToStaticMarkup(<LearnLanding start={LEARN_VISITOR_START} />);
    const starts = visitor.match(/<a[^>]*data-landing-start[^>]*>/g) ?? [];
    expect(starts).toHaveLength(2);
    for (const start of starts) {
      expect(start).toContain('href="/learn/start"');
      expect(start).toContain('data-contribute-source="learn_landing"');
    }
    expect(visitor).not.toContain('data-sign-in');
    expect(text(visitor)).not.toContain('See a lesson');
    expect(visitor).not.toContain('href="#lesson"');
    expect(text(visitor)).toContain('Ready? Tell us what you want to learn. Start learning');
    expect(visitor.match(/>Start learning</g)).toHaveLength(2);
    expect(visitor).toContain('data-landing-viewer="visitor"');

    const signedIn = renderToStaticMarkup(
      <LearnLanding start={{ href: '/learn/start/issues' as never, signedIn: true }} />,
    );
    expect(
      signedIn.match(
        /<a[^>]*data-landing-start[^>]*href="\/learn\/start\/issues"|<a[^>]*href="\/learn\/start\/issues"[^>]*data-landing-start/g,
      ),
    ).toHaveLength(2);

    const member = renderToStaticMarkup(<LearnLanding start={{ member: true }} />);
    expect(text(member)).toContain('Open Learn');
    expect(text(member)).not.toContain('Start learning');
    expect(member).not.toContain('learn_landing');
    expect(member.match(/<a[^>]*data-landing-start[^>]*>/g)?.every((a) => a.includes('href="/learn"'))).toBe(true);
  });

  it('shows the example lesson with its diagram and question, the parts, and the way to maintainers', () => {
    const html = renderToStaticMarkup(<LearnLanding start={LEARN_VISITOR_START} />);
    expect(html).toContain('id="lesson"');
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
      <LearnLanding start={LEARN_VISITOR_START} recentLessons={<RecentLessons lessons={recentLessons} />} />,
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
    expect(renderToStaticMarkup(<LearnLanding start={LEARN_VISITOR_START} />)).not.toContain('Recent lessons');
    expect(renderToStaticMarkup(<RecentLessons lessons={[]} />)).toBe('');
  });

  it("writes a lesson's day in UTC, and nothing for a date that does not parse", () => {
    expect(publishedDayOf('2026-11-14T23:59:59.000Z')).toBe('14 Nov 2026');
    expect(publishedDayOf('2026-09-01T00:00:00.000Z')).toBe('1 Sep 2026');
    expect(publishedDayOf('not a date')).toBe('');
  });
});

describe("Learn's front door for an account that has not entered", () => {
  const NOT_ENTERED = { ...ENTERED, entered: false, agents: { hosted: false, own: false } };

  afterEach(() => gate.loadWorkspaceGate.mockResolvedValue(ENTERED));

  it('reads the front door at /learn, its button at the step of the flow left for it', async () => {
    data.loadLearnOpen.mockResolvedValue(true);
    gate.loadWorkspaceGate.mockResolvedValue(NOT_ENTERED);
    data.loadLearnProfile.mockResolvedValueOnce(filledProfile);
    let html = renderToStaticMarkup(await LearnHomeView());
    expect(html).toContain('data-landing-viewer="signed-in"');
    expect(html.match(/href="\/learn\/start\/issues"/g)).toHaveLength(2);
    data.loadLearnProfile.mockResolvedValueOnce(emptyProfile);
    html = renderToStaticMarkup(await LearnHomeView());
    expect(html.match(/href="\/learn\/start"/g)).toHaveLength(2);
    data.loadLearnProfile.mockResolvedValueOnce(emptyProfile);
    expect(renderToStaticMarkup(await LearnAboutView())).toContain('data-landing-viewer="signed-in"');
  });

  it('an account being set up or with no profile keeps the Learn tab; How Learn works starts it at Your goal', async () => {
    data.loadLearnOpen.mockResolvedValue(true);
    for (const kind of ['setting-up', 'hidden']) {
      gate.loadWorkspaceGate.mockResolvedValue({ kind });
      expect((await LearnHomeView()).type, kind).toBe(LearnTab);
      const about = renderToStaticMarkup(await LearnAboutView());
      expect(
        about.match(/<a[^>]*data-landing-start[^>]*>/g)?.filter((a) => a.includes('href="/learn/start"')),
        kind,
      ).toHaveLength(2);
      expect(about, kind).toContain('data-contribute-source="learn_landing"');
    }
  });

  it('a gate that cannot be read shows no error: the Learn tab at /learn, Your goal from How Learn works', async () => {
    data.loadLearnOpen.mockResolvedValue(true);
    gate.loadWorkspaceGate.mockRejectedValue(new Error('down'));
    data.loadLearnProfile.mockClear();
    expect((await LearnHomeView()).type).toBe(LearnTab);
    const about = renderToStaticMarkup(await LearnAboutView());
    expect(about.match(/href="\/learn\/start"/g)).toHaveLength(2);
    expect(data.loadLearnProfile).not.toHaveBeenCalled();
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

  it('is a Settings page: back to Settings, and Saving takes you back there', () => {
    const html = renderToStaticMarkup(<LearnProfileScreen profile={filledProfile} />);
    expect(html).toMatch(/href="\/my\/settings"[^>]*>.*Settings<\/a>/);
    expect(text(html)).toContain('Goal and level');
    expect(text(html)).toContain('Saving takes you back to Settings.');
    // The agent and how-a-lesson-goes cards are gone.
    expect(text(html)).not.toContain('How a lesson goes');
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

describe("Learn's gate on its own pages", () => {
  const closed = () => {
    data.loadLearnOpen.mockResolvedValue(false);
    data.loadLearnProfile.mockRejectedValue(new Error('down'));
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
      // A signed-in person Learn is not open to still gets a 404 (the list, not everyone, decides for them).
      viewerLogin.mockResolvedValueOnce('stranger');
      await expect(LearnHomeView()).rejects.toThrow('NEXT_NOT_FOUND');
    } finally {
      everyone.mockResolvedValue(false);
    }
  });

  it('says a new account is being set up, in place of the form and the Learn tab, with a refresh', async () => {
    data.loadLearnOpen.mockResolvedValue(true);
    data.loadLearnSetup.mockResolvedValue(true);
    data.loadLearnProfile.mockResolvedValue(null);
    for (const html of [renderToStaticMarkup(await LearnProfileView()), renderToStaticMarkup(await LearnTab())]) {
      expect(html).toContain('data-learn-setting-up');
      expect(text(html)).toContain('Setting up your GitRanks account. This takes about a minute. Refresh');
      expect(html).not.toContain('data-learn-profile=');
    }
  });

  it('draws the pages for a user Learn is open to', async () => {
    data.loadLearnOpen.mockResolvedValue(true);
    data.loadLearnProfile.mockResolvedValue(filledProfile);
    recent.readRecentLessons.mockResolvedValue(recentLessons);
    // `/learn` is the Learn tab for an account that has entered; the front door is at `/learn/about`, with Open Learn.
    const home = await LearnHomeView();
    expect(home.type).toBe(LearnTab);
    expect(renderToStaticMarkup(await LearnTab())).toContain('data-learn-tab="ready"');
    const about = await LearnAboutView();
    expect(renderToStaticMarkup(about)).toContain('data-landing-viewer="member"');
    expect(text(renderToStaticMarkup(about))).toContain('Open Learn');
    expect(await recentOf(about)).toContain('data-recent-lessons');
    expect(renderToStaticMarkup(await LearnProfileView())).toContain('data-learn-profile="filled"');
  });
});
