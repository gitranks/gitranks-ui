import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/learn/profile',
  useSearchParams: () => new URLSearchParams(),
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));
vi.mock('next-auth/react', () => ({ signIn: vi.fn(), useSession: () => ({ data: null }) }));
vi.mock('@/app/learn/actions', () => ({ saveLearnProfile: vi.fn() }));
vi.mock('@/app/contribute/actions', () => ({}));
vi.mock('@/lib/contribute/contribute.data', () => ({ loadContribute: vi.fn() }));
const data = vi.hoisted(() => ({
  loadLearnOpen: vi.fn(),
  loadLearnProfile: vi.fn(),
  loadLearnSetup: vi.fn(),
  loadMyLessons: vi.fn(),
  loadOwnAgent: vi.fn(),
}));
vi.mock('@/lib/learn/learn.data', () => data);

const { LearnHomeView, LearnLanding } = await import('./learn-landing');
const { LearnMaintainers } = await import('./learn-maintainers');
const { LearnProfileScreen, LearnProfileView } = await import('./learn-profile');
const { MyLessonsScreen, MyLessonsView } = await import('./my-lessons');
const { views } = await import('@/lib/contribute/__fixtures__/contribute-views');
const { emptyProfile, filledProfile, myLessons } = await import('@/lib/learn/__fixtures__/profile');
const { controlDescriptions, controlNames } = await import('@/lib/learn/__fixtures__/control-names');

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&#x27;', "'")
    .replaceAll('&quot;', '"')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' ')
    .trim();

describe("Learn's front door", () => {
  it('signs a visitor in from Start learning, and sends a signed-in user to Goal and level', () => {
    const visitor = renderToStaticMarkup(<LearnLanding viewer="visitor" />);
    expect(visitor.match(/data-sign-in="learn"/g)).toHaveLength(2);
    expect(visitor).not.toContain('href="/learn/profile"');
    const member = renderToStaticMarkup(<LearnLanding viewer="signed-in" />);
    expect(member).not.toContain('data-sign-in');
    expect(member.match(/href="\/learn\/profile"/g)).toHaveLength(2);
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
    const html = renderToStaticMarkup(
      <LearnProfileScreen profile={emptyProfile} ownAgent={views.onboardedNoPath.ownAgent} />,
    );
    expect(html).toContain('data-learn-profile="empty"');
    expect(text(html)).toContain('A language');
    expect(text(html)).toContain('How one project works');
    expect(text(html)).not.toContain('A domain');
    expect(html.match(/data-guessed="true"/g)).toHaveLength(3);
    expect(text(html)).toContain('We guessed from your public GitHub work.');
    expect(text(html)).toContain('Pick what you want to learn.');
    expect(html).toContain('type="submit" disabled=""');
    expect(html).toContain('data-learn-agent="Not set up"');
    expect(html).toContain('href="/contribute/connect?path=agent"');
  });

  it('shows a saved profile: the goal with its language, Your goal first, the focus ticked, the agent connected', () => {
    const html = renderToStaticMarkup(
      <LearnProfileScreen profile={filledProfile} ownAgent={views.agentOnboarded.ownAgent} />,
    );
    expect(html).toContain('data-learn-profile="filled"');
    expect(html).toMatch(/data-goal="LANGUAGE"[^>]*class="[^"]*border-primary/);
    expect(text(html)).toContain('TypeScript Your goal · 2 repos, since Oct 2026');
    expect(html.match(/data-guessed="true"/g)).toHaveLength(2);
    expect(html.match(/role="checkbox"[^>]*aria-checked="true"/g)).toHaveLength(2);
    expect(html).toContain('type="submit"');
    expect(html).not.toContain('type="submit" disabled=""');
    expect(html).toContain('data-learn-agent="Connected"');
    expect(text(html)).toContain('Find me an issue to learn from on GitRanks');
  });

  it('names every goal, level and focus control by its text', () => {
    const html = renderToStaticMarkup(
      <LearnProfileScreen profile={filledProfile} ownAgent={views.agentOnboarded.ownAgent} />,
    );
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

  it('says when the agent could not be read, and when there are no languages yet', () => {
    const html = renderToStaticMarkup(<LearnProfileScreen profile={null} ownAgent={undefined} />);
    expect(text(html)).toContain("We can't check your agent right now.");
    expect(text(html)).toContain('No languages yet.');
  });
});

describe('My lessons', () => {
  it('lists what is going, then what is done, with outline buttons on the done ones', () => {
    const html = renderToStaticMarkup(<MyLessonsScreen lessons={myLessons} />);
    expect(text(html)).toContain('In progress · 1');
    expect(text(html)).toContain('Done · 3');
    expect(html).toContain('href="/learn/attempts/A_3"');
    expect(html).toContain('href="/learn/lessons/retry-backoff-jitter-2m9q"');
    expect(html.indexOf('lessons-going')).toBeLessThan(html.indexOf('lessons-done'));
    expect(html.match(/data-variant="outline"/g)).toHaveLength(3);
  });

  it('says how the first lesson starts, and when the list did not load', () => {
    const empty = renderToStaticMarkup(<MyLessonsScreen lessons={[]} />);
    expect(text(empty)).toContain('No lessons yet');
    expect(text(empty)).toContain('Find me an issue to learn from on GitRanks');
    expect(empty).toContain('href="/learn/profile"');
    const failed = renderToStaticMarkup(<MyLessonsScreen lessons={undefined} />);
    expect(text(failed)).toContain('Your lessons are not available right now.');
  });
});

describe("Learn's gate on its own pages", () => {
  const closed = () => {
    data.loadLearnOpen.mockResolvedValue(false);
    data.loadLearnProfile.mockRejectedValue(new Error('down'));
    data.loadMyLessons.mockResolvedValue(undefined);
    data.loadOwnAgent.mockResolvedValue(undefined);
  };

  afterEach(() => {
    data.loadLearnSetup.mockReset();
  });

  it('answers not found to anyone Learn is not open to, whatever the other reads do', async () => {
    closed();
    data.loadLearnSetup.mockResolvedValue(true);
    await expect(LearnHomeView()).rejects.toThrow('NEXT_NOT_FOUND');
    await expect(LearnProfileView()).rejects.toThrow('NEXT_NOT_FOUND');
    await expect(MyLessonsView()).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('says a new account is being set up, in place of the form and the list, with a refresh', async () => {
    data.loadLearnOpen.mockResolvedValue(true);
    data.loadLearnSetup.mockResolvedValue(true);
    data.loadLearnProfile.mockResolvedValue(null);
    data.loadMyLessons.mockResolvedValue([]);
    data.loadOwnAgent.mockResolvedValue(undefined);
    for (const html of [renderToStaticMarkup(await LearnProfileView()), renderToStaticMarkup(await MyLessonsView())]) {
      expect(html).toContain('data-learn-setting-up');
      expect(text(html)).toContain('Setting up your GitRanks account. This takes about a minute. Refresh');
      expect(html).not.toContain('data-learn-profile=');
    }
  });

  it('draws the pages for a user Learn is open to', async () => {
    data.loadLearnOpen.mockResolvedValue(true);
    data.loadLearnProfile.mockResolvedValue(filledProfile);
    data.loadMyLessons.mockResolvedValue(myLessons);
    data.loadOwnAgent.mockResolvedValue(views.agentOnboarded.ownAgent);
    expect(renderToStaticMarkup(await LearnHomeView())).toContain('data-landing-viewer="signed-in"');
    expect(renderToStaticMarkup(await LearnProfileView())).toContain('data-learn-profile="filled"');
    expect(renderToStaticMarkup(await MyLessonsView())).toContain('data-lesson="A_3"');
  });
});
