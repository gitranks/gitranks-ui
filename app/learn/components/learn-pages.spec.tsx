import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/workspace/fair-use.actions', () => ({}));

vi.mock('@/lib/workspace/masked-issue.actions', () => ({
  lookAtIssue: vi.fn(),
  signInToSeeIssue: vi.fn(),
  skipMaskedIssue: vi.fn(),
}));

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
  loadFairUseNotices: vi.fn(async () => null),
  viewerLogin,
}));
vi.mock('@/lib/workspace/masked-issue.data', () => ({
  loadMaskedListReads: vi.fn(async () => ({ rulesLive: false, looks: null, numbers: null })),
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
vi.mock('@/lib/learn/settings.data', () => ({}));
vi.mock('@/lib/learn/settings.actions', () => ({}));
vi.mock('@/lib/learn/learn.data', () => data);
vi.mock('@/lib/learn/progress/progress.data', () => ({ loadLearnProgress: vi.fn(async () => undefined) }));
const ENTERED = { kind: 'open', entered: true, agents: { hosted: false, own: true }, learnOpen: true };
const gate = vi.hoisted(() => ({ loadWorkspaceGate: vi.fn(async (): Promise<unknown> => ENTERED) }));
vi.mock('@/lib/workspace/gate.data', () => ({ loadLearnOpen: vi.fn(async () => false), ...gate }));

const { LearnTab } = await import('@/app/(workspace)/learn/components/learn-tab-view');
const { LearnMaintainers } = await import('./learn-maintainers');
const { PrContext, PrLesson } = await import('./learn-pr-lesson');
const { prCard } = await import('@/lib/contribute/__fixtures__/maintainers');
const { result: lessonResult } = await import('@/lib/learn/__fixtures__/shared');
const { GoalSettingsScreen: LearnProfileScreen, GoalSettingsView: LearnProfileView } = await import(
  '@/app/(workspace)/my/settings/components/settings-pages'
);
const { emptyProfile, filledProfile } = await import('@/lib/learn/__fixtures__/profile');
const { controlDescriptions, controlNames } = await import('@/lib/learn/__fixtures__/control-names');

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&#x27;', "'")
    .replaceAll('&quot;', '"')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' ')
    .trim();

describe('Learn for maintainers', () => {
  it('names the opt-in key, and leads to the rules and report pages', () => {
    const html = renderToStaticMarkup(<LearnMaintainers />);
    expect(text(html)).toContain('You got a pull request made with GitRanks Learn');
    expect(text(html)).toContain('learn: welcome');
    expect(text(html)).toContain('.github/gitranks.yml');
    expect(html).toContain('href="/contribute/maintainers"');
    expect(html).toContain('href="/contribute/maintainers/report"');
    expect(html).not.toContain('data-pr-context');
    expect(html).not.toContain('data-pr-lesson');
  });

  const LEARN_PR = prCard({ number: 902, contributorLogin: 'octocat', learn: { slug: 'route-cache-miss-8f3k' } });
  const VIEWER = { canReact: false, mine: null, returned: null, own: false };
  const fromPr = (lesson: Parameters<typeof PrLesson>[0]['read']) =>
    renderToStaticMarkup(
      <LearnMaintainers
        context={<PrContext card={lesson.card} />}
        lesson={<PrLesson read={lesson} />}
        from={lesson.card.attemptId}
      />,
    );

  it('from a footer: the pull request first, then what it is, its lesson, Did this help?, and the rules (§9.3)', () => {
    const html = fromPr({ kind: 'lesson', card: LEARN_PR, result: lessonResult(), viewer: VIEWER });
    const order = [
      'You came here from this pull request',
      'You got a pull request made with GitRanks Learn',
      'What that means',
      'This pull request’s lesson',
      'Did this help you review the pull request?',
      'Your rules apply',
    ].map((words) => text(html).indexOf(words));
    expect(order.every((at) => at >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    // The top block is the pull request alone: no actions before anything is explained.
    const top = html.slice(
      html.indexOf('data-pr-context'),
      html.indexOf('</section>', html.indexOf('data-pr-context')),
    );
    expect(top).not.toMatch(/<button|lessons\//);
    expect(top).toContain('href="https://github.com/driftwood-js/driftwood/pull/902"');
    expect(html).toContain('href="/learn/lessons/route-cache-miss-8f3k"');
    expect(html).toContain('href="/learn/lessons/route-cache-miss-8f3k/passes/octocat"');
    expect(text(html)).toContain('octocat passed 5 of 5 steps');
    // One Report link, the rules block's, carrying the footer link's id.
    expect(text(html).match(/Report this pull request/g)).toHaveLength(1);
    expect(html).toContain(`href="/contribute/maintainers/report?from=${LEARN_PR.attemptId}"`);
  });

  it('a lesson not public now: the pull request, one neutral line, no result and no feedback', () => {
    const html = fromPr({ kind: 'closed', card: { ...LEARN_PR, learn: { slug: null } } });
    expect(text(html)).toContain('You came here from this pull request');
    expect(text(html)).toContain('It is not public right now.');
    expect(html).not.toContain('/learn/lessons/');
    expect(text(html)).not.toContain('Did this help');
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
  });

  it('answers not found to anyone Learn is not open to, whatever the other reads do', async () => {
    closed();
    data.loadLearnSetup.mockResolvedValue(true);
    await expect(LearnProfileView()).rejects.toThrow('NEXT_NOT_FOUND');
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
    expect(renderToStaticMarkup(await LearnTab())).toContain('data-learn-tab="ready"');
    expect(renderToStaticMarkup(await LearnProfileView())).toContain('data-learn-profile="filled"');
  });
});
