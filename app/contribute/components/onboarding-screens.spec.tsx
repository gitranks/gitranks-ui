import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const nav = vi.hoisted(() => ({ pathname: '/contribute', search: '' }));
const data = vi.hoisted(() => ({
  loadContribute: vi.fn(),
  viewerLogin: vi.fn(),
  loadIssues: vi.fn(),
  loadContributeSet: vi.fn(async () => null),
  loadContributeActivity: vi.fn(async () => null),
  loadAttempt: vi.fn(),
  loadResolveHumanThreads: vi.fn(async () => undefined),
  loadAttempts: vi.fn(),
  loadContributions: vi.fn(),
  loadOpenPrDrafts: vi.fn(),
}));
const { signIn } = vi.hoisted(() => ({ signIn: vi.fn() }));

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
vi.mock('@/app/contribute/actions', () => ({}));
vi.mock('./live-refresh', () => ({ LiveRefresh: () => <span data-live-refresh /> }));
vi.mock('@/lib/contribute/contribute.data', () => data);

const { Landing } = await import('./landing');
const { SignInButton, SignInPanel, signInRouteOf, startSignIn } = await import('./sign-in-dialog');
const { ContributeTabsNav, HeaderLine, contributeTabsShown } = await import('./contribute-tabs-nav');
const { ContributeTabs } = await import('./contribute-tabs');
const { default: ContributeLayout } = await import('../layout');
const { IssuesView } = await import('./issues-view');
const { ContributionsView } = await import('./contributions-view');
const { ReviewView } = await import('./review-view');
const { SettingsView } = await import('./settings-view');
const { Dialog } = await import('@/components/ui/dialog');
const { views } = await import('@/lib/contribute/__fixtures__/contribute-views');

import type { ContributeView } from '@/lib/contribute/contribute.types';

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&#x27;', "'")
    .replaceAll('&quot;', '"')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' ');

const count = (html: string, needle: string) => html.split(needle).length - 1;

const KEY_HREF = 'href="/contribute/connect"';
const AGENT_HREF = 'href="/contribute/connect?path=agent"';
const DIALOG_TRIGGER = 'aria-haspopup="dialog"';

describe('the landing', () => {
  it('walks a visitor from an issue to a merged pull request, in the order of the design', () => {
    const plain = text(renderToStaticMarkup(<Landing viewer="visitor" />));
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
    expect(plain).toContain('fern-lang/fern · #2481');
    expect(plain).toContain('Merged');
  });

  it('states the facts the product holds to', () => {
    const plain = text(renderToStaticMarkup(<Landing viewer="visitor" />));

    // The hold of an issue for the user's own agent.
    expect(plain).toContain('An issue is held for you 24 hours from its last step, 7 days at most');
    // GitHub access: asked at the first submit, public_repo only.
    expect(plain).toContain('On your first submit we ask GitHub for one permission, public_repo');
    expect(plain).toContain('Nothing on private repos, never workflow files');
    // The maintainers' rails, and autopilot after three merged pull requests.
    expect(plain).toContain(
      'We open at most one PR in a repo at a time, never more than four a month, and pause after two are closed in a row',
    );
    expect(plain).toContain('After three of yours are merged you can turn on autopilot');
  });

  it("opens the sign-in from every one of a visitor's buttons, never the steps themselves", () => {
    const html = renderToStaticMarkup(<Landing viewer="visitor" />);

    expect(html).toContain('data-landing-viewer="visitor"');
    // The two ways, three times each, and the eight coming-soon cards' "Notify me".
    expect(count(html, DIALOG_TRIGGER)).toBe(14);
    expect(count(text(html), 'Start with my Claude key')).toBe(3);
    expect(count(text(html), 'Connect my own agent')).toBe(3);
    expect(html).not.toContain(KEY_HREF);
    expect(html).not.toContain(AGENT_HREF);
    expect(html).not.toContain('data-landing="mid-setup"');
  });

  it("sends a signed-in user's buttons straight to the Claude key and to their own agent", () => {
    const html = renderToStaticMarkup(<Landing viewer="signed-in" />);

    expect(count(html, KEY_HREF)).toBe(3);
    expect(count(html, AGENT_HREF)).toBe(3);
    expect(html).not.toContain(DIALOG_TRIGGER);
    expect(html).not.toContain('data-landing="mid-setup"');
  });

  it('offers a user mid-setup to carry on, and Settings for the token', () => {
    const html = renderToStaticMarkup(<Landing viewer="mid-setup" />);
    const plain = text(html);

    expect(html).toContain('data-landing="mid-setup"');
    expect(plain).toContain("Almost there. Your token is ready, and your agent hasn't connected yet.");
    expect(plain).toContain('Continue setup →');
    expect(count(html, AGENT_HREF)).toBe(4);
    expect(html).toContain('href="/contribute/settings"');
  });

  it("shows the user's coming-soon list as the API keeps it, and none of it to a visitor", () => {
    const signedIn = renderToStaticMarkup(<Landing viewer="signed-in" noted={['GEMINI', 'CURSOR']} />);
    const visitor = renderToStaticMarkup(<Landing viewer="visitor" preview noted={['GEMINI']} />);

    expect(count(signedIn, 'aria-pressed="true"')).toBe(2);
    expect(text(signedIn)).toContain("You're on the list for 2 of these.");
    expect(visitor).not.toContain('aria-pressed');
    expect(text(visitor)).toContain('Sign in with GitHub to be told when one opens');
  });

  it('links the opt-out for maintainers', () => {
    const html = renderToStaticMarkup(<Landing viewer="signed-in" />);

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

  it('names the way picked, what GitHub shares, and that repo access waits for the first submit', () => {
    const html = panel({ path: 'key' });
    const plain = text(html);

    expect(plain).toContain('Your Claude key');
    expect(html).toMatch(/<h2[^>]*id="[^"]+"[^>]*>Sign in to continue<\/h2>/);
    expect(plain).toContain('GitHub shares your public profile and email with us, read-only.');
    expect(plain).toContain('You come straight back, to the next step');
    expect(plain).toContain("No access to your repos. That's asked once, at your first submit");
    expect(html).toMatch(/<button[^>]*data-sign-in="github"[^>]*>.*Continue with GitHub<\/button>/);
    expect(plain).toContain('Not now');
    expect(text(panel({ path: 'agent' }))).toContain('Your own agent');
  });

  it('signs in with the identity sign-in, back to the step of the way picked', async () => {
    signIn.mockResolvedValue(undefined);

    await startSignIn('key');
    await startSignIn('agent');
    await startSignIn();

    expect(signIn.mock.calls).toEqual([
      ['github-basic', { redirectTo: '/contribute/connect' }],
      ['github-basic', { redirectTo: '/contribute/connect?path=agent' }],
      ['github-basic', { redirectTo: '/contribute' }],
    ]);
    expect(signInRouteOf('agent')).toBe('/contribute/connect?path=agent');
  });

  it('only goes on to the step for a signed-in user seeing the visitor view', () => {
    const html = panel({ path: 'agent', preview: true });

    expect(html).toMatch(/<a [^>]*data-sign-in="preview"[^>]*>/);
    expect(html.match(/<a [^>]*data-sign-in="preview"[^>]*>/)?.[0]).toContain(AGENT_HREF);
    expect(html).not.toContain('data-sign-in="github"');
  });

  it('is closed until its button is pressed', () => {
    const html = renderToStaticMarkup(<SignInButton path="key">Start with my Claude key</SignInButton>);

    expect(html).toContain(DIALOG_TRIGGER);
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain('Sign in to continue');
  });
});

describe("Contribute's header and tabs", () => {
  const TABS = [
    ['/contribute', 'Overview'],
    ['/contribute/issues', 'Issues for you'],
    ['/contribute/me', 'My contributions'],
    ['/contribute/settings', 'Settings'],
  ];
  /** The tab links, as the site's tabs draw them. */
  const tabLinks = (html: string) => html.match(/<a [^>]*href="\/contribute[^"]*"[^>]*>[^<]*/g) ?? [];
  /** The tab marked as the current page: filled underline, and `aria-current` for screen readers, on the same link. */
  const currentTab = (html: string) => {
    const filled = tabLinks(html).filter((link) => link.includes('border-foreground'));
    const named = tabLinks(html).filter((link) => link.includes('aria-current="page"'));
    expect(named).toEqual(filled);
    return filled.map((link) => link.match(/href="([^"]+)"/)?.[1]);
  };
  const tabsAt = (pathname: string, search = '', onboarded = true) => {
    nav.pathname = pathname;
    nav.search = search;
    return renderToStaticMarkup(<ContributeTabsNav onboarded={onboarded} />);
  };

  beforeEach(() => {
    nav.pathname = '/contribute';
    nav.search = '';
  });

  it('shows the tabs only to an onboarded user', () => {
    expect(contributeTabsShown('/contribute/issues', null, true)).toBe(true);
    expect(contributeTabsShown('/contribute', null, false)).toBe(false);
    // Settings stays open before onboarding, from the landing and the setup page; there are no tabs to it.
    expect(contributeTabsShown('/contribute/settings', null, false)).toBe(false);
  });

  it('shows no tabs under ?as=visitor on the landing, or on the maintainers page', () => {
    expect(contributeTabsShown('/contribute', 'visitor', true)).toBe(false);
    expect(contributeTabsShown('/contribute/', 'visitor', true)).toBe(false);
    // Only on the landing: elsewhere the query changes nothing.
    expect(contributeTabsShown('/contribute/settings', 'visitor', true)).toBe(true);
    expect(contributeTabsShown('/contribute/maintainers', null, true)).toBe(false);
    expect(contributeTabsShown('/contribute/maintainers', null, false)).toBe(false);
  });

  it("are the site's tabs, the four of them and no Contribute label, the current one marked", () => {
    const html = tabsAt('/contribute/issues');

    expect(html).toMatch(/^<div class="[^"]*border-b[^"]*"><ul /);
    expect(tabLinks(html).map((link) => link.replace(/^.*href="([^"]+)"[^>]*>/, '$1 '))).toEqual(
      TABS.map(([href, label]) => `${href} ${label}`),
    );
    expect(text(html)).not.toMatch(/\bContribute\b/);
    expect(currentTab(html)).toEqual(['/contribute/issues']);
    // The tabs' own line is the one under the header: no second one.
    expect(html.match(/\bborder-b(?![\w-])/g)).toHaveLength(1);
  });

  it("marks My contributions on an attempt's review, and the overview on the connect flow", () => {
    expect(currentTab(tabsAt('/contribute'))).toEqual(['/contribute']);
    expect(currentTab(tabsAt('/contribute/attempts/A_1'))).toEqual(['/contribute/me']);
    expect(currentTab(tabsAt('/contribute/me'))).toEqual(['/contribute/me']);
    expect(currentTab(tabsAt('/contribute/connect', 'path=agent'))).toEqual(['/contribute']);
    expect(currentTab(tabsAt('/contribute/settings'))).toEqual(['/contribute/settings']);
  });

  it('draws only the line under the header where there are no tabs', () => {
    const line = renderToStaticMarkup(<HeaderLine />);

    expect(tabsAt('/contribute', '', false)).toBe(line);
    expect(tabsAt('/contribute', 'as=visitor')).toBe(line);
    expect(tabsAt('/contribute/maintainers')).toBe(line);
    expect(line).toBe('<div class="border-b"></div>');
  });

  it("reads the viewer, and shows no tabs when the read fails rather than failing the page's header", async () => {
    nav.pathname = '/contribute/issues';

    data.loadContribute.mockResolvedValueOnce(views.active);
    expect(renderToStaticMarkup(await ContributeTabs())).toContain('href="/contribute/me"');

    data.loadContribute.mockResolvedValueOnce(views.midSetup);
    expect(renderToStaticMarkup(await ContributeTabs())).not.toContain('href="/contribute');

    // A visitor has no view.
    data.loadContribute.mockResolvedValueOnce(null);
    expect(renderToStaticMarkup(await ContributeTabs())).not.toContain('href="/contribute');

    data.loadContribute.mockRejectedValueOnce(new Error('GitRanks Contribute did not load'));
    expect(renderToStaticMarkup(await ContributeTabs())).not.toContain('href="/contribute');
  });

  it("is the site's header: the logo home, the main menu and the site's sign-in, no title", () => {
    const html = renderToStaticMarkup(<ContributeLayout>{null}</ContributeLayout>);
    const header = html.match(/<header[\s\S]*<\/header>/)?.[0] ?? '';

    expect(header).toContain('<a class="shrink-0" href="/">');
    expect(header).toContain('<nav aria-label="Main"');
    expect(header).toContain('data-avatar-menu');
    expect(header).not.toContain('>/</span>');
    expect(header).not.toContain('contribute</span>');
    expect(header).not.toContain(DIALOG_TRIGGER);
    // While the viewer is read, the header's line and no tabs.
    expect(html.slice(html.indexOf('</header>'))).toContain('<div class="border-b"></div>');
    expect(html).not.toContain('href="/contribute/me"');
  });
});

describe('the pages that wait for onboarding', () => {
  const searchParams = Promise.resolve({});
  const params = Promise.resolve({ id: 'A_1' });
  const pages = {
    issues: () => IssuesView({ searchParams }),
    me: () => ContributionsView(),
    attempt: () => ReviewView({ params }),
    settings: () => SettingsView({ searchParams }),
  };

  const visit = (page: keyof typeof pages, view: ContributeView) => {
    data.loadContribute.mockResolvedValue(view);
    data.loadIssues.mockResolvedValue(undefined);
    data.loadAttempts.mockResolvedValue(undefined);
    data.loadAttempt.mockResolvedValue(undefined);
    data.loadContributions.mockResolvedValue(undefined);
    data.loadOpenPrDrafts.mockResolvedValue({});
    return pages[page]();
  };

  it.each(['issues', 'me', 'attempt'] as const)('sends a user not onboarded from %s to the landing', async (page) => {
    await expect(visit(page, views.midSetup)).rejects.toThrow('NEXT_REDIRECT /contribute');
    await expect(visit(page, views.noKey)).rejects.toThrow('NEXT_REDIRECT /contribute');
  });

  it.each(['issues', 'me', 'attempt', 'settings'] as const)('opens %s to an onboarded user', async (page) => {
    await expect(visit(page, views.active)).resolves.toBeTruthy();
  });

  it('keeps Settings open to a contributor mid-setup, and sends a user with no contributor row to the landing', async () => {
    await expect(visit('settings', views.midSetup)).resolves.toBeTruthy();
    await expect(visit('settings', views.newcomer)).rejects.toThrow('NEXT_REDIRECT /contribute');
  });
});
