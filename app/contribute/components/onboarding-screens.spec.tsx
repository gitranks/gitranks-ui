import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const nav = vi.hoisted(() => ({ pathname: '/contribute', search: '' }));
const data = vi.hoisted(() => ({
  loadContribute: vi.fn(),
  viewerLogin: vi.fn(),
  loadIssues: vi.fn(),
  loadContributeSet: vi.fn(async () => null),
  loadContributeEmailSettings: vi.fn(async () => null),
  loadContributeActivity: vi.fn(async () => null),
  loadContributeVersion: vi.fn(async () => '4.2'),
  loadAttempt: vi.fn(),
  loadResolveHumanThreads: vi.fn(async () => undefined),
  loadAttempts: vi.fn(),
  loadNeedsYou: vi.fn(async () => null),
  loadPullRequestsPage: vi.fn(async () => undefined),
  loadScheduleCounts: vi.fn(async () => undefined),
  loadRepliesWaiting: vi.fn(),
  loadIssueAttempt: vi.fn(async () => ({
    attemptId: 'A_1',
    mode: 'FIX',
    repo: 'driftwood-js/driftwood',
    number: 871,
    earlier: null,
  })),
}));
const { signIn } = vi.hoisted(() => ({ signIn: vi.fn() }));

vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  usePathname: () => nav.pathname,
  useSearchParams: () => new URLSearchParams(nav.search),
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  },
}));
vi.mock('next-auth/react', () => ({ signIn, signOut: vi.fn(), useSession: () => ({ data: null }) }));
vi.mock('@/components/signin-button/signin-button', () => ({ default: () => <span data-avatar-menu /> }));
vi.mock('@/lib/workspace/actions', () => ({}));
vi.mock('@/lib/contribute/actions', () => ({}));
vi.mock('@/lib/workspace/issue-actions', () => ({}));
vi.mock('@/lib/workspace/contribute.data', () => data);
vi.mock('@/lib/contribute/contribute.data', () => data);
vi.mock('@/lib/workspace/gate.data', () => ({ loadLearnOpen: vi.fn(async () => false) }));
vi.mock('@/lib/learn/settings.data', () => ({}));
vi.mock('@/lib/skills/skills.data', () => ({ loadSkillsMine: async () => undefined }));
vi.mock('@/lib/learn/settings.actions', () => ({}));
vi.mock('@/lib/learn/learn.data', () => ({ loadLearnOpen: vi.fn(async () => false), loadAttemptLesson: vi.fn() }));

const { Landing } = await import('./landing');
const { SignInButton, SignInPanel, startSignIn } = await import('@/components/workspace/sign-in-dialog');
const { PullRequestsView } = await import('@/components/workspace/pull-requests-view');
const { ContributionLayout, FirstSessionView } = await import('@/components/workspace/pull-request/review-view');
const { SettingsView } = await import('@/app/(workspace)/my/settings/components/settings-view');
const { Dialog } = await import('@/components/ui/dialog');
const { views } = await import('@/lib/contribute/__fixtures__/contribute-views');

import type { ContributeView } from '@/lib/workspace/contribute.types';

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&#x27;', "'")
    .replaceAll('&quot;', '"')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' ');

const count = (html: string, needle: string) => html.split(needle).length - 1;

const KEY_HREF = 'href="/my/agent/key"';
const AGENT_HREF = 'href="/my/agent/connect"';
/** A visitor's way in: the flow's first step. */
const VISITOR_START = { href: '/contribute/start', signedIn: false } as Parameters<typeof Landing>[0]['start'];
const SIGNED_IN_START = { href: '/contribute/start/agent', signedIn: true } as Parameters<typeof Landing>[0]['start'];
const DIALOG_TRIGGER = 'aria-haspopup="dialog"';

describe('the landing', () => {
  it('walks a visitor from an issue to a merged pull request, in the order of the design', () => {
    const plain = text(renderToStaticMarkup(<Landing viewer="visitor" start={VISITOR_START} />));
    const sections = [
      'Fix real open-source issues with the AI you already pay for',
      'Two ways to contribute. Pick either, add the other later.',
      'More ways to spend credits you already have',
      'From an issue to a merged pull request',
      'Everything is set for you, and all of it is yours to change',
      'Questions',
      'Ready for your first issue?',
    ];

    const at = sections.map((heading) => plain.indexOf(heading));
    expect(at.every((index) => index >= 0)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    expect(plain).toContain('Free to use. Nothing reaches GitHub without your OK. Leave any time.');
    expect(plain).toContain('Issue details are hidden until you see the full issue');
    expect(plain).toContain('Merged');
  });

  it('states the facts the product holds to', () => {
    const plain = text(renderToStaticMarkup(<Landing viewer="visitor" start={VISITOR_START} />));

    // The hold of an issue for the user's own agent.
    expect(plain).toContain(
      'An issue is held for you 24 hours from its last step, 48 hours without a patch that passes the checks, 7 days at most',
    );
    // The own agent signs in with GitHub; a token is the fallback.
    expect(plain).toContain(
      "An agent that speaks MCP. It signs in with your GitHub account; a client that can't gets a token",
    );
    expect(plain).not.toContain('a token we give you');
    // GitHub access: asked at the first submit, public_repo only.
    expect(plain).toContain('On your first submit we ask GitHub for one permission, public_repo');
    expect(plain).toContain('Nothing on private repos, never workflow files');
    // The maintainers' rails, and autopilot opening about a month after launch.
    expect(plain).toContain(
      'We open at most one PR in a repo at a time, never more than four a month, and take a repo out of the shared pool for 90 days after two misses there within 90 days: a PR no one answers for 30 days, or one closed as wrong, low quality or harshly.',
    );
    expect(plain).toContain('Autopilot opens about a month after launch, and only if you turn it on');
    // The plans by their current names, and auto-reload's real money.
    expect(plain).toContain('Claude Max, Ultra or Team plan');
    expect(plain).toContain("keep auto-reload off: it can charge your card even while your plan's credits remain");
    expect(plain).not.toMatch(/Max 5x|Max 20x/);
  });

  it('has one start action, Start contributing, in the hero and again in the closing row: a link into the flow', () => {
    const html = renderToStaticMarkup(<Landing viewer="visitor" start={VISITOR_START} />);
    const starts = [...html.matchAll(/<a [^>]*data-landing-start[^>]*>([^<]*)<\/a>/g)];

    expect(html).toContain('data-landing-viewer="visitor"');
    expect(starts.map(([, label]) => label)).toEqual(['Start contributing', 'Start contributing']);
    for (const [tag] of starts) {
      expect(tag).toContain('href="/contribute/start"');
      expect(tag).toContain('data-contribute-source="contribute_landing"');
      expect(tag).not.toContain('data-sign-in');
    }
    // The hero's comes before the closing row's.
    expect(html.indexOf('data-landing-start')).toBeLessThan(html.indexOf('Ready for your first issue?'));
    expect(html.lastIndexOf('data-landing-start')).toBeGreaterThan(html.indexOf('Ready for your first issue?'));
    // No more start buttons: the ways are facts, and only the eight "Notify me" open the sign-in.
    expect(text(html)).not.toContain('Start with my Claude key');
    expect(text(html)).not.toContain('Connect my own agent');
    expect(count(html, DIALOG_TRIGGER)).toBe(8);
    expect(html).not.toContain(KEY_HREF);
    expect(html).not.toContain(AGENT_HREF);
    expect(html).not.toContain('data-landing="mid-setup"');
  });

  it("starts a signed-in user at the server's step, the button the same", () => {
    const html = renderToStaticMarkup(<Landing viewer="signed-in" start={SIGNED_IN_START} />);

    expect(count(html, 'href="/contribute/start/agent"')).toBe(2);
    expect(html).not.toContain(DIALOG_TRIGGER);
    expect(text(html)).not.toContain('Almost there');
  });

  it('opens Contribute for a member reading how it works', () => {
    const html = renderToStaticMarkup(<Landing viewer="signed-in" start={{ member: true }} />);
    const starts = [...html.matchAll(/<a [^>]*data-landing-start[^>]*>([^<]*)<\/a>/g)];

    expect(starts.map(([, label]) => label)).toEqual(['Open Contribute', 'Open Contribute']);
    for (const [tag] of starts) expect(tag).toContain('href="/contribute"');
  });

  it('says the workspace’s words: Pull requests, the Agent tab', () => {
    const plain = text(renderToStaticMarkup(<Landing viewer="visitor" start={VISITOR_START} />));

    expect(plain).toContain('Reviews and comments show up in Pull requests');
    expect(plain).toContain('You can add the other later on the Agent tab.');
    expect(plain).not.toContain('My contributions');
  });

  it("shows the user's coming-soon list as the API keeps it, and none of it to a visitor", () => {
    const signedIn = renderToStaticMarkup(
      <Landing viewer="signed-in" start={SIGNED_IN_START} noted={['GEMINI', 'CURSOR']} />,
    );
    const visitor = renderToStaticMarkup(<Landing viewer="visitor" start={VISITOR_START} preview noted={['GEMINI']} />);

    expect(count(signedIn, 'aria-pressed="true"')).toBe(2);
    expect(text(signedIn)).toContain("You're on the list for 2 of these.");
    expect(visitor).not.toContain('aria-pressed');
    expect(text(visitor)).toContain('Press Notify me to be told when one opens');
  });

  it('links the opt-out for maintainers', () => {
    const html = renderToStaticMarkup(<Landing viewer="signed-in" start={SIGNED_IN_START} />);

    expect(text(html)).toContain('Maintain a repo? Opt it out →');
    expect(html).toContain('href="/contribute/maintainers"');
  });
});

describe('the sign-in', () => {
  const panel = (props: Parameters<typeof SignInPanel>[0]) =>
    renderToStaticMarkup(
      <Dialog open>
        <SignInPanel {...props} />
      </Dialog>,
    );

  beforeEach(() => signIn.mockReset());

  it('says what GitHub shares, and that repo access waits for the first submit', () => {
    const html = panel({});
    const plain = text(html);

    expect(plain).toContain('GitRanks Contribute');
    expect(html).toMatch(/<h2[^>]*id="[^"]+"[^>]*>Sign in to continue<\/h2>/);
    expect(plain).toContain('GitHub shares your public profile and email with us, read-only.');
    expect(plain).toContain('You come straight back here');
    expect(plain).toContain("No access to your repos. That's asked once, at your first submit");
    expect(html).toMatch(/<button[^>]*data-sign-in="github"[^>]*>.*Continue with GitHub<\/button>/);
    expect(plain).toContain('Not now');
  });

  it('signs in with the identity sign-in, back to the landing', async () => {
    signIn.mockResolvedValue(undefined);
    await startSignIn();
    expect(signIn.mock.calls).toEqual([['github-basic', { redirectTo: '/contribute' }]]);
  });

  it('only goes back to the landing for a signed-in user seeing the visitor view', () => {
    const html = panel({ preview: true });

    expect(html.match(/<a [^>]*data-sign-in="preview"[^>]*>/)?.[0]).toContain('href="/contribute"');
    expect(html).not.toContain('data-sign-in="github"');
  });

  it('is closed until its button is pressed', () => {
    const html = renderToStaticMarkup(<SignInButton>Notify me</SignInButton>);

    expect(html).toContain(DIALOG_TRIGGER);
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain('Sign in to continue');
  });
});

describe('the pages that wait for onboarding', () => {
  const searchParams = Promise.resolve({});
  const params = Promise.resolve({ owner: 'driftwood-js', repo: 'driftwood', issue: '871' });
  const pages = {
    me: () => PullRequestsView({ searchParams: Promise.resolve({}) }),
    attempt: () => FirstSessionView({ params, searchParams: Promise.resolve({}) }),
    layout: () => ContributionLayout({ params, children: null }),
    settings: () => SettingsView({ searchParams }),
  };

  const visit = (page: keyof typeof pages, view: ContributeView) => {
    data.viewerLogin.mockResolvedValue('octocat');
    data.loadContribute.mockResolvedValue(view);
    data.loadIssues.mockResolvedValue(undefined);
    data.loadAttempts.mockResolvedValue(undefined);
    data.loadAttempt.mockResolvedValue(undefined);
    data.loadRepliesWaiting.mockResolvedValue([]);
    return pages[page]();
  };

  it.each(['me', 'attempt', 'layout'] as const)('sends a user not onboarded from %s to the landing', async (page) => {
    await expect(visit(page, views.midSetup)).rejects.toThrow('NEXT_REDIRECT /contribute');
    await expect(visit(page, views.noKey)).rejects.toThrow('NEXT_REDIRECT /contribute');
  });

  it.each(['me', 'attempt', 'settings'] as const)('opens %s to an onboarded user', async (page) => {
    await expect(visit(page, views.active)).resolves.toBeTruthy();
  });

  it("asks a visitor without a session to sign in on a contribution's page, the link their agent handed them", async () => {
    data.viewerLogin.mockResolvedValue(null);
    data.loadContribute.mockClear();
    data.loadAttempt.mockClear();
    const html = renderToStaticMarkup(await ContributionLayout({ params, children: <span data-session /> }));
    expect(html).toContain('data-attempt-sign-in="contribution"');
    expect(text(html)).toContain('Sign in to see this contribution');
    expect(html).toContain('data-sign-in="attempt"');
    expect(html).not.toContain('data-session');
    await expect(FirstSessionView({ params, searchParams: Promise.resolve({}) })).resolves.toBeNull();
    expect(data.loadContribute).not.toHaveBeenCalled();
    expect(data.loadAttempt).not.toHaveBeenCalled();
  });

  it('keeps the 404 for a signed-in user whose attempt it is not', async () => {
    data.viewerLogin.mockResolvedValue('octocat');
    data.loadContribute.mockResolvedValue(views.active);
    data.loadAttempt.mockResolvedValue(null);
    await expect(ContributionLayout({ params, children: null })).rejects.toThrow('NEXT_NOT_FOUND');
    data.loadIssueAttempt.mockResolvedValueOnce(null as never);
    await expect(ContributionLayout({ params, children: null })).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it("draws a Learn attempt's Pull request view here, as a Fix attempt's", async () => {
    data.viewerLogin.mockResolvedValue('octocat');
    const { detail } = await import('@/lib/contribute/__fixtures__/contribute-attempts');
    data.loadContribute.mockResolvedValue(views.active);
    data.loadAttempt.mockResolvedValue(detail({ mode: 'LEARN' }));
    await expect(FirstSessionView({ params, searchParams: Promise.resolve({}) })).resolves.toBeTruthy();
    data.loadAttempt.mockResolvedValue(detail({ mode: 'FIX' }));
    await expect(FirstSessionView({ params, searchParams: Promise.resolve({}) })).resolves.toBeTruthy();
  });

  it('keeps Settings open to a contributor mid-setup, and to an account with no contributor row yet', async () => {
    await expect(visit('settings', views.midSetup)).resolves.toBeTruthy();
    // A learner who has not connected an agent comes back here from their goal: the summary opens.
    await expect(visit('settings', views.newcomer)).resolves.toBeTruthy();
  });
});
