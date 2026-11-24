import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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

const { ContributeAboutView, signedInStartOf } = await import('./landing-view');
const { metadata: aboutMetadata } = await import('@/app/(public)/contribute/about/page');
const { default: ContributeHomePage, metadata: homeMetadata } = await import('@/app/(workspace)/contribute/page');
const { AuthorizeNextStep } = await import('./authorize-next-step');
const { views } = await import('@/lib/contribute/__fixtures__/contribute-views');

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
});

describe('where the landing’s button leads a signed-in person', () => {
  it('the step that is left: the agent’s connect step mid-setup, step 2 with preferences saved, else step 1', () => {
    expect(signedInStartOf(views.noKey)).toEqual({ href: '/contribute/start/agent', signedIn: true });
    expect(signedInStartOf(views.newcomer)).toEqual({ href: '/contribute/start', signedIn: true });
    expect(signedInStartOf(views.midSetup)).toEqual({ href: '/contribute/start/agent/own', signedIn: true });
  });

  it('Contribute itself once they have entered', () => {
    expect(signedInStartOf(views.active)).toEqual({ member: true });
  });
});

describe('how Contribute works, /contribute/about', () => {
  const about = async () => renderToStaticMarkup((await ContributeAboutView()) as ReactElement);

  it('offers a member Open Contribute, with no tabs and no start into the flow, and counts no start', async () => {
    data.loadContribute.mockResolvedValue(views.active);
    const html = await about();
    expect(startsOf(html)).toEqual([
      ['/contribute', 'Open Contribute'],
      ['/contribute', 'Open Contribute'],
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

  it('is not indexed, and names the landing as the one page for search engines', () => {
    expect(aboutMetadata.robots).toEqual({ index: false, follow: false });
    expect(aboutMetadata.alternates?.canonical).toBe('/contribute');
    expect(aboutMetadata.title).toBe('How Contribute works');
  });
});

describe('the landing at /contribute', () => {
  it('stays out of search engines, set by the page itself', () => {
    expect(homeMetadata.robots).toEqual({ index: false, follow: false });
    expect(homeMetadata.alternates?.types).toEqual({ 'text/markdown': '/contribute/agents.md' });
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
