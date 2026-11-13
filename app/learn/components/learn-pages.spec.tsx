import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

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
vi.mock('@/lib/learn/learn.data', () => ({
  loadLearnOpen: vi.fn(),
  loadLearnProfile: vi.fn(),
  loadMyLessons: vi.fn(),
}));

const { LearnLanding } = await import('./learn-landing');
const { LearnMaintainers } = await import('./learn-maintainers');
const { LearnProfileScreen } = await import('./learn-profile');
const { MyLessonsScreen } = await import('./my-lessons');
const { views } = await import('@/lib/contribute/__fixtures__/contribute-views');
const { emptyProfile, filledProfile, myLessons } = await import('@/lib/learn/__fixtures__/profile');

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
    const html = renderToStaticMarkup(<LearnProfileScreen profile={emptyProfile} view={views.onboardedNoPath} />);
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
    const html = renderToStaticMarkup(<LearnProfileScreen profile={filledProfile} view={views.agentOnboarded} />);
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

  it("works without Contribute's view: the agent is offered", () => {
    const html = renderToStaticMarkup(<LearnProfileScreen profile={null} view={null} />);
    expect(html).toContain('data-learn-agent="Not set up"');
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
