// @vitest-environment jsdom
import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/workspace/masked-issue.actions', () => ({
  lookAtIssue: vi.fn(),
  signInToSeeIssue: vi.fn(),
  skipMaskedIssue: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/contribute/about',
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
  redirect: (to: string) => {
    throw new Error(`NEXT_REDIRECT ${to}`);
  },
}));
vi.mock('server-only', () => ({}));
vi.mock('next-auth/react', () => ({ signIn: vi.fn(), useSession: () => ({ data: null }) }));
vi.mock('@/lib/workspace/actions', () => ({}));
const data = vi.hoisted(() => ({
  loadContribute: vi.fn(),
  loadProviderInterests: vi.fn(async () => []),
  loadContributeSetup: vi.fn(async () => false),
  viewerLogin: vi.fn(async (): Promise<string | null> => null),
}));
vi.mock('@/lib/workspace/contribute.data', () => data);
const gate = vi.hoisted(() => ({ contributeOpen: vi.fn(async () => true) }));
vi.mock('@/lib/workspace/preview-gate', () => gate);
vi.mock('@/lib/contribute/agent-page', () => ({ loadAgentPage: vi.fn(async () => null) }));
const proofRead = vi.hoisted(() => ({
  loadLandingProof: vi.fn(async (): Promise<unknown> => null),
  loadLandingLedgerOpen: vi.fn(async () => true),
}));
vi.mock('@/lib/contribute/landing-proof.data', () => proofRead);

const { ContributeAboutView, signedInStartOf } = await import('./landing-view');
const { metadata: aboutMetadata } = await import('@/app/(public)/contribute/about/page');
const { default: ContributeHomePage, metadata: homeMetadata } = await import('@/app/(workspace)/contribute/page');
const { AuthorizeNextStep } = await import('./authorize-next-step');
const { loadAgentPage } = await import('@/lib/contribute/agent-page');
const { views } = await import('@/lib/contribute/__fixtures__/contribute-views');
const { proofMerged, proofOpenOnly } = await import('@/lib/contribute/__fixtures__/wave-4-parts');
const { default: staticSitemap } = await import('@/app/sitemaps/static/sitemap');

/** The landing's one button, as drawn: its label and where it goes. */
const startsOf = (html: string) =>
  [...html.matchAll(/<a [^>]*data-landing-start[^>]*>([^<]*)<\/a>/g)].map(([tag, label]) => [
    /href="([^"]+)"/.exec(tag)?.[1],
    label,
  ]);

beforeEach(() => {
  vi.clearAllMocks();
  data.loadContributeSetup.mockResolvedValue(false);
  data.viewerLogin.mockResolvedValue(null);
  proofRead.loadLandingProof.mockResolvedValue(null);
  proofRead.loadLandingLedgerOpen.mockResolvedValue(true);
});

/** The landing as drawn for a visitor, from the given answer of the newest pull requests' read. */
const landingWith = async (read: unknown) => {
  data.loadContribute.mockResolvedValue(null);
  proofRead.loadLandingProof.mockResolvedValue(read);
  const page = document.createElement('div');
  page.innerHTML = renderToStaticMarkup((await ContributeAboutView()) as ReactElement);
  return page;
};
/** What a person reads: each element's words apart, as the page lays them out. */
const words = (element: Element | null | undefined) =>
  (element?.innerHTML ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&amp;', '&')
    .replaceAll('&#x27;', "'")
    .replace(/\s+/g, ' ')
    .trim();

describe("the landing's proof, by what the newest pull requests' read answers", () => {
  const card = (page: Element) => page.querySelector('[data-landing-proof-card]');
  const rows = (page: Element) => page.querySelector('[data-landing="merged"]');

  it('three merged: the first on the top card, all three under "Merged through GitRanks", no count', async () => {
    const page = await landingWith(proofMerged);
    expect(card(page)?.getAttribute('data-landing-proof-card')).toBe('merged');
    expect(words(card(page))).toContain('Count the last page when the total divides evenly');
    expect(words(card(page))).toContain('Merged 3 days after it was sent');
    expect(card(page)?.querySelector('a')?.getAttribute('href')).toBe('/contribute/pr/driftwood-js/driftwood/912');
    expect(rows(page)?.querySelectorAll('li')).toHaveLength(3);
    expect(words(rows(page))).toContain('Every pull request, in the public ledger →');
    expect(words(rows(page))).not.toMatch(/\b\d+ (merged|pull requests)\b/);
    // The rows come after the steps and before the defaults.
    const order = [...page.querySelectorAll('[data-landing]')].map((part) => part.getAttribute('data-landing'));
    expect(order.indexOf('merged')).toBe(order.indexOf('steps') + 1);
    expect(order.indexOf('defaults')).toBe(order.indexOf('merged') + 1);
  });

  it('stands the heading alone while the ledger is closed', async () => {
    proofRead.loadLandingLedgerOpen.mockResolvedValue(false);
    const page = await landingWith(proofMerged);
    expect(words(rows(page)?.querySelector('h2'))).toBe('Merged through GitRanks');
    expect(rows(page)?.querySelector('a[href="/contribute/ledger"]')).toBeNull();
  });

  it.each([
    ['two merged', proofMerged.slice(0, 2)],
    ['one merged', proofMerged.slice(0, 1)],
  ])('%s: the first on the top card, the rows left out with their heading', async (_case, read) => {
    const page = await landingWith(read);
    expect(card(page)?.getAttribute('data-landing-proof-card')).toBe('merged');
    expect(rows(page)).toBeNull();
    expect(page.textContent).not.toContain('Merged through GitRanks');
  });

  it('none merged, an open one with a public page: the same card with "Open", and no days', async () => {
    const page = await landingWith(proofOpenOnly);
    expect(card(page)?.getAttribute('data-landing-proof-card')).toBe('open');
    expect(words(card(page))).toContain('Open');
    expect(words(card(page))).not.toMatch(/Merged|after it was sent/);
    expect(rows(page)).toBeNull();
  });

  it.each([
    ['none at all', []],
    ['a failed or slow read', null],
  ])("%s: no card, the head's words take the full width, no rows", async (_case, read) => {
    const page = await landingWith(read);
    expect(card(page)).toBeNull();
    expect(rows(page)).toBeNull();
    expect(page.querySelector('[data-landing="head"] > div')?.className).toContain('flex-[1_1_100%]');
  });

  it('starts the proof and the ledger reads before the view is read, so neither waits for it', async () => {
    let viewAsked = false;
    data.loadContribute.mockImplementation(async () => {
      viewAsked = true;
      return null;
    });
    proofRead.loadLandingProof.mockImplementation(async () => {
      expect(viewAsked).toBe(false);
      return proofMerged;
    });
    proofRead.loadLandingLedgerOpen.mockImplementation(async () => {
      expect(viewAsked).toBe(false);
      return true;
    });
    renderToStaticMarkup((await ContributeAboutView()) as ReactElement);
    expect(proofRead.loadLandingProof).toHaveBeenCalledOnce();
    expect(proofRead.loadLandingLedgerOpen).toHaveBeenCalledOnce();
  });

  it('draws a pull request whose sender is not known, its by-line naming the agent alone', async () => {
    const page = await landingWith(proofMerged.map((pr) => ({ ...pr, contributorLogin: null })));
    expect(words(card(page))).toContain('2 files with Claude Code How it was made');
    expect(words(rows(page))).toContain('Merged 30 Oct · with Claude Code');
    expect(words(page)).not.toContain('null');
  });

  it('leaves out an issue title that is not known', async () => {
    const [, second] = proofMerged;
    const page = await landingWith([{ ...second, issue: { ...second.issue, title: null } }]);
    expect(words(card(page))).toContain('harbor-kit/relay · #412 the issue bug Go an agent wrote the fix');
  });
});

describe('where the landing’s button leads a signed-in person', () => {
  it('the step that is left: the agent’s connect step mid-setup, else the first step, saved preferences or not', () => {
    expect(signedInStartOf(views.noKey)).toEqual({ href: '/contribute/start', signedIn: true });
    expect(signedInStartOf(views.newcomer)).toEqual({ href: '/contribute/start', signedIn: true });
    expect(signedInStartOf(views.midSetup)).toEqual({ href: '/contribute/start/agent/own', signedIn: true });
  });

  it('Contribute itself once they have entered', () => {
    expect(signedInStartOf(views.active)).toEqual({ member: true });
  });
});

describe('how Contribute works, /contribute/about', () => {
  const about = async () => renderToStaticMarkup((await ContributeAboutView()) as ReactElement);

  it('offers a member Go to your issues, at the top and at the foot, and counts no start', async () => {
    data.loadContribute.mockResolvedValue(views.active);
    const html = await about();
    expect(startsOf(html)).toEqual([
      ['/contribute', 'Go to your issues'],
      ['/contribute', 'Go to your issues'],
    ]);
    for (const [tag] of html.matchAll(/<a [^>]*data-landing-start[^>]*>/g)) {
      expect(tag).not.toContain('data-contribute-source');
    }
  });

  it('tells an account being set up, or one with no profile, so, as /contribute does', async () => {
    data.loadContribute.mockResolvedValue(null);
    data.loadContributeSetup.mockResolvedValue(true);
    data.viewerLogin.mockResolvedValue('octocat');
    const settingUp = await about();
    expect(settingUp).toContain('data-contribute-setting-up');
    expect(settingUp).not.toContain('data-landing-start');
    data.loadContributeSetup.mockResolvedValue(false);
    const noProfile = await about();
    expect(noProfile).toContain('data-contribute-no-profile');
    expect(noProfile).not.toContain('data-landing-start');
  });

  it('starts anyone else at their step, a visitor at the first', async () => {
    data.loadContribute.mockResolvedValue(views.midSetup);
    expect(startsOf(await about())[0]).toEqual(['/contribute/start/agent/own', 'Start contributing']);
    data.loadContribute.mockResolvedValue(null);
    expect(startsOf(await about())[0]).toEqual(['/contribute/start', 'Start contributing']);
  });

  it('is a 404 to a visitor before the launch', async () => {
    data.loadContribute.mockResolvedValue(null);
    gate.contributeOpen.mockResolvedValueOnce(false);
    await expect(about()).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('says "index", so the canonical it names is followed, and names the landing as the one page for search engines', () => {
    expect(aboutMetadata.robots).toEqual({ index: true, follow: true });
    expect(aboutMetadata.alternates?.canonical).toBe('/contribute');
    expect(aboutMetadata.title).toBe('How Contribute works');
  });
});

describe('the landing at /contribute', () => {
  it('is indexed for every viewer, from one static block that reads no session, with its own canonical', () => {
    // A static object, the same for a visitor and a signed-in person: nothing in it is read per request.
    expect(typeof homeMetadata).toBe('object');
    expect(homeMetadata.robots).toEqual({ index: true, follow: true });
    expect(homeMetadata.alternates).toEqual({
      canonical: '/contribute',
      types: { 'text/markdown': '/contribute/agents.md' },
    });
    expect(homeMetadata.title).toEqual({
      absolute: 'GitRanks Contribute: fix real open-source issues with the AI you already pay for',
    });
    expect(homeMetadata.description).toBe(
      'We find issues maintainers want solved and match them to what you know. An AI agent writes the fix, you review it, and the pull request opens in your name.',
    );
  });

  it('is in the sitemap, and its other address is not', () => {
    vi.stubEnv('NEXT_PUBLIC_URI', 'https://gitranks.com');
    const urls = staticSitemap().map(({ url }) => url);
    expect(urls).toContain('https://gitranks.com/contribute');
    expect(urls.filter((url) => url.includes('/contribute/'))).toEqual([]);
    vi.unstubAllEnvs();
  });

  it('draws the landing for a signed-in person who has not entered, with the same proof', async () => {
    data.loadContribute.mockResolvedValue(views.newcomer);
    proofRead.loadLandingProof.mockResolvedValue(proofMerged);
    const page = ContributeHomePage({ searchParams: Promise.resolve({}) } as never) as ReactElement<{
      children: ReactElement;
    }>;
    const home = page.props.children as ReactElement<Record<string, unknown>>;
    const render = home.type as (props: Record<string, unknown>) => Promise<ReactElement>;
    const html = renderToStaticMarkup(await render(home.props));
    expect(html).toContain('data-landing-viewer="signed-in"');
    expect(html).toContain('data-landing-proof-card="merged"');
    expect(html).toContain('data-landing="merged"');
    expect(startsOf(html)[0]).toEqual(['/contribute/start', 'Start contributing']);
  });

  it('sends a new account, once set up, back to the page of the issue it came from, with its press', async () => {
    data.loadContribute.mockResolvedValue(views.newcomer);
    const page = ContributeHomePage({
      searchParams: Promise.resolve({ issue: 'q7k2m9xa', from: 'learn', look: '1' }),
    } as never) as ReactElement<{ children: ReactElement }>;
    const home = page.props.children as ReactElement<Record<string, unknown>>;
    const render = home.type as (props: Record<string, unknown>) => Promise<ReactElement>;
    await expect(render(home.props)).rejects.toThrow('NEXT_REDIRECT /my/issues/q7k2m9xa?from=learn&look=1');
  });
});

describe('the agent sign-in’s consent page', () => {
  it('tells a person who started on the site that the tab there moves on by itself', () => {
    const html = renderToStaticMarkup(<AuthorizeNextStep clientName="Codex" />);
    expect(html).toContain('Started on gitranks.com? Go back to that tab: it moves on by itself.');
    expect(html).toContain('Then ask it:');
  });
});

describe('how Contribute works: the words', () => {
  const about = async () => renderToStaticMarkup((await ContributeAboutView()) as ReactElement);
  const stats = (readyIssues: number, repos: number) =>
    vi.mocked(loadAgentPage).mockResolvedValue({
      stats: { readyIssues, repos, languages: [], checkedAt: null },
      sample: { day: null, items: [] },
    });

  it('shows the numbers line only when issues are ready', async () => {
    data.loadContribute.mockResolvedValue(null);
    stats(3124, 1412);
    expect(await about()).toContain('3,124 issues ready in 1,412 repositories.');
    stats(0, 0);
    const html = await about();
    expect(html).not.toContain('data-landing="stats"');
    expect(html).not.toContain('0 issues ready');
  });

  it('names VS Code among your own agents, and narrows by language or repo only', async () => {
    data.loadContribute.mockResolvedValue(null);
    const html = await about();
    expect(html).toContain('Claude Code, Codex, Cursor, Gemini CLI, VS Code or Antigravity');
    expect(html).toContain('Narrow by language or repo whenever you like.');
    expect(html).not.toMatch(/kind, size/);
  });

  it('has its parts in order, and the steps named like the stages of a pull request', async () => {
    const page = await landingWith(proofMerged);
    expect([...page.querySelectorAll('h2')].map((h2) => words(h2))).toEqual([
      'Two ways to contribute. Pick either, add the other later.',
      'More ways to spend credits you already have',
      'From an issue to a merged pull request',
      'Merged through GitRanks',
      'Everything is set for you, and all of it is yours to change',
      'Honest with maintainers',
      'Questions',
      'Ready for your first issue?',
    ]);
    const steps = [...page.querySelectorAll('[data-landing="steps"] li > span:first-child')];
    expect(steps.map((step) => words(step))).toEqual(['01 · we pick', '02 · fix', '03 · approve', '04 · review']);
    expect(page.querySelectorAll('[data-landing-way]')).toHaveLength(2);
    expect(page.querySelectorAll('[data-landing="defaults"] h3')).toHaveLength(6);
  });

  it("quotes the pull request's footer in the band, and links the page for maintainers", async () => {
    const page = await landingWith(null);
    expect(page.textContent).toContain(
      'Every pull request says an AI agent wrote the fix and who reviewed it. We open one pull request in a project at a time',
    );
    // The footer's two lines, as GitHub shows them: the linked words drawn as links.
    expect(page.textContent).toContain(
      'Made with GitRanks Contribute and Claude Code (Opus) · Reviewed and submitted by @mira-dev',
    );
    expect(page.textContent).toContain(
      'Something off? Tell us or opt out in one step. Maintainers are always in control.',
    );
    expect(page.querySelector('a[href="/contribute/maintainers"]')?.textContent).toBe('For maintainers →');
    expect(page.textContent).not.toContain('Maintain a repo?');
  });

  it("answers the landing's own questions: GitHub access in short, how it differs from Learn, none on maintainers", async () => {
    const page = await landingWith(null);
    const questions = page.querySelector('[data-landing="questions"]');
    expect([...(questions?.querySelectorAll('dt') ?? [])].map((term) => words(term))).toEqual([
      'Will Contribute change?',
      'Does it cost anything?',
      'What can you do on my GitHub account?',
      'Do you see my Claude bill or my code?',
      "What if a fix isn't good?",
      'How is it different from GitRanks Learn?',
    ]);
    expect(words(questions)).toContain(
      'Only after you send your first pull request, and only on public repositories: we copy the project to your account, push your change, open the pull request, and post the replies you approve. Nothing on private repositories, never workflow files. You can take the access back at any time.',
    );
    expect(questions?.querySelector('a[href="/learn"]')?.textContent).toBe('GitRanks Learn →');
    expect(words(questions)).not.toContain('Is it fair to maintainers?');
    expect(words(questions)).not.toMatch(/claim/i);
  });

  it('ends with the button again and the links open to every visitor', async () => {
    const page = await landingWith(null);
    expect([...page.querySelectorAll('[data-landing="foot"] nav a')].map((link) => words(link))).toEqual([
      'GitRanks Learn',
      'MCP server docs',
      'For AI agents',
      'Questions',
      'Terms',
    ]);
  });
});
