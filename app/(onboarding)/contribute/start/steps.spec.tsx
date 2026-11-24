import type { ReactElement, ReactNode } from 'react';
import { isValidElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/workspace/masked-issue.actions', () => ({
  lookAtIssue: vi.fn(),
  signInToSeeIssue: vi.fn(),
  skipMaskedIssue: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/contribute/start',
  useSearchParams: () => new URLSearchParams(),
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
vi.mock('@/lib/contribute/actions', () => ({ savePreferences: vi.fn(), readIssuesPage: vi.fn() }));
vi.mock('@/lib/workspace/issue-actions', () => ({ startIssue: vi.fn(), skipIssue: vi.fn() }));
vi.mock('@/lib/workspace/start/start-page.actions', () => ({ readStartPageAttempt: vi.fn() }));
const data = vi.hoisted(() => ({
  loadContribute: vi.fn(),
  loadScheduleCounts: vi.fn(async () => undefined),
  loadProfileLanguages: vi.fn(async () => ['Rust']),
  viewerLogin: vi.fn(async () => 'octocat'),
}));
vi.mock('@/lib/workspace/contribute.data', () => data);
const place = vi.hoisted(() => ({ loadContributeFlowPlace: vi.fn() }));
vi.mock('@/lib/workspace/getting-in.data', () => place);
const issues = vi.hoisted(() => ({ loadIssues: vi.fn() }));
vi.mock('@/lib/contribute/contribute.data', () => issues);
const profile = vi.hoisted(() => ({ loadFlowProfileLanguages: vi.fn(async () => ['GO']) }));
vi.mock('@/lib/contribute/start-flow.data', () => profile);

const { default: AgentPage } = await import('./agent/page');
const { default: OwnAgentPage } = await import('./agent/own/page');
const { default: KeyPage } = await import('./agent/key/page');
const { default: IssuePage } = await import('./issue/page');
const { views, agentTabViews } = await import('@/lib/contribute/__fixtures__/contribute-views');
const { issue } = await import('@/lib/contribute/__fixtures__/contribute-overview');

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&#x27;', "'")
    .replace(/\s+/g, ' ')
    .trim();

/** The page's async part, wherever its frame places it. */
function innerOf(node: ReactNode): ReactElement | null {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = innerOf(child);
      if (found) return found;
    }
    return null;
  }
  if (!isValidElement(node)) return null;
  if (typeof node.type === 'function' && node.type.constructor.name === 'AsyncFunction') return node;
  return innerOf((node.props as { children?: ReactNode }).children);
}

/** The page whole: the frame as drawn, with its async part rendered in place of the Suspense boundary. */
async function render(page: (props: never) => ReactElement, search: Record<string, string> = {}): Promise<string> {
  const frame = page({ searchParams: Promise.resolve(search) } as never);
  const inner = innerOf(frame);
  if (!inner) throw new Error('no async part');
  const drawn = await (inner.type as (props: object) => Promise<ReactElement>)(inner.props as object);
  return `${renderToStaticMarkup(frame).replace(/<!--\$\?-->[\s\S]*?<!--\/\$-->/, '')}${renderToStaticMarkup(drawn)}`;
}

const SIGNED_OUT = { kind: 'signed-out' } as const;
const open = (entered: boolean, agents = { hosted: false, own: true }) =>
  ({ kind: 'open', entered, agents, learnOpen: true }) as const;
const at = (kind: string, gate: object = open(false), to?: string) =>
  place.loadContributeFlowPlace.mockResolvedValue({ place: to ? { kind, to } : { kind }, gate });

beforeEach(() => {
  vi.clearAllMocks();
  data.loadContribute.mockResolvedValue(views.newcomer);
});

describe('Your agent: the choice', () => {
  it('a visitor signs in here, above the two ways, dimmed and off', async () => {
    at('page', SIGNED_OUT);
    const html = await render(AgentPage);
    expect(html).toContain('aria-current="step"');
    expect(text(html)).toContain('Who does the work?');
    expect(text(html)).toContain('Sign in to connect an agent');
    expect(text(html)).toContain('What you picked in step 1 is kept.');
    expect(html).toContain('data-agent-choice="off"');
    expect(html).not.toContain('href="/contribute/start/agent/own"');
    expect(html).toContain('data-contribute-source="contribute_flow_sign_in"');
    expect(data.loadContribute).not.toHaveBeenCalled();
  });

  it('signed in, the two ways lead on, your own agent first and primary', async () => {
    at('page');
    const html = await render(AgentPage);
    expect(html).toContain('data-agent-choice="on"');
    expect(html).not.toContain('data-flow-sign-in');
    const own = html.indexOf('href="/contribute/start/agent/own"');
    const key = html.indexOf('href="/contribute/start/agent/key"');
    expect(own).toBeGreaterThan(-1);
    expect(key).toBeGreaterThan(own);
    expect(html).toContain('data-contribute-source="contribute_flow_own"');
    expect(html).toContain('data-contribute-source="contribute_flow_key"');
    expect(text(html)).toContain('Recommended');
    expect(text(html)).toContain('Nothing through us: your agent, your plan');
  });

  it('an account being set up waits in the frame; an entered one is sent on', async () => {
    at('setting-up', { kind: 'setting-up' });
    expect(text(await render(AgentPage))).toContain('Setting up your GitRanks account');
    at('redirect', open(true), '/contribute/start/issue');
    await expect(render(AgentPage)).rejects.toThrow('NEXT_REDIRECT /contribute/start/issue');
  });
});

describe('Your agent: your own agent and a Claude key', () => {
  it('a visitor meets the sign-in card under the step’s title and the way back', async () => {
    at('sign-in', SIGNED_OUT);
    const html = await render(OwnAgentPage);
    expect(text(html)).toContain('Connect your own agent');
    expect(text(html)).toContain('About a minute · no Claude key needed');
    expect(html).toContain('href="/contribute/start/agent"');
    expect(html).toContain('data-flow-sign-in');
    at('sign-in', SIGNED_OUT);
    expect(await render(KeyPage)).toContain('data-flow-sign-in');
  });

  it('signed in, the own agent’s connect steps sit embedded under the page’s title', async () => {
    at('page');
    data.loadContribute.mockResolvedValue({ ...views.midSetup });
    const html = await render(OwnAgentPage);
    expect(html.match(/<h1/g)).toHaveLength(1);
    expect(html).not.toContain('data-flow-sign-in');
  });

  it('an account that has entered goes on to the Agent tab’s connect page, the query kept', async () => {
    at('redirect', open(true), '/my/agent/connect?from=agent');
    await expect(render(OwnAgentPage, { from: 'agent' })).rejects.toThrow('NEXT_REDIRECT /my/agent/connect?from=agent');
    expect(place.loadContributeFlowPlace).toHaveBeenCalledWith('agent-own', 'from=agent');
  });

  it('signed in, the key’s one screen, its other way the own-agent step', async () => {
    at('page');
    data.loadContribute.mockResolvedValue(views.noKey);
    const html = await render(KeyPage);
    expect(html).toContain('data-connect-path="key"');
    expect(text(html)).toContain('About two minutes');
    expect(text(html)).not.toContain('The only step');
    expect(html).toContain('href="/contribute/start/agent/own"');
  });
});

describe('Your first issue', () => {
  const page = (items = [issue()], computedAt: string | null = '2026-10-28T07:00:00.000Z') =>
    issues.loadIssues.mockResolvedValue({ items, total: items.length, next: null, computedAt });

  it('names the agent connected, lists the issues without the row menu, and Start and Skip leave the flow', async () => {
    at('page', open(true));
    data.loadContribute.mockResolvedValue(agentTabViews.ownOnly);
    page();
    const html = await render(IssuePage);
    expect(text(html)).toContain(
      'Claude Code is connected. These open issues match what you work on: press Start on one, and you get one prompt to paste in your agent.',
    );
    expect(html).toContain('data-issue=');
    expect(html).not.toContain('data-row-menu');
    expect(html).toContain('data-start-control="link"');
    expect(html).toContain('data-contribute-source="contribute_flow_issue"');
    expect(text(html)).toContain('You review every change before anything reaches GitHub.');
    const skip = [...html.matchAll(/<a [^>]*>/g)].map(([tag]) => tag).find((tag) => tag.includes('data-flow-leave'));
    expect(skip).toContain('href="/contribute"');
    expect(html).toContain('data-contribute-source="contribute_flow_skip"');
  });

  it('with the key alone, or both, says so', async () => {
    at('page', open(true, { hosted: true, own: false }));
    data.loadContribute.mockResolvedValue(agentTabViews.hostedOnly);
    page();
    expect(text(await render(IssuePage))).toContain('Your Claude key is connected.');
    at('page', open(true, { hosted: true, own: true }));
    data.loadContribute.mockResolvedValue(agentTabViews.both);
    page();
    expect(text(await render(IssuePage))).toContain('Your agents are connected.');
  });

  it('with nothing matching, says so and links Settings’ work page, not step 1', async () => {
    at('page', open(true));
    data.loadContribute.mockResolvedValue(agentTabViews.ownOnly);
    page([]);
    const html = await render(IssuePage);
    expect(text(html)).toContain('No open issues match what you work on yet. New ones come in every day.');
    expect(html).toContain('href="/my/settings/work"');
    expect(html).not.toContain('href="/contribute/start"');
  });

  it('while the picks are still ranked, waits in the list’s place', async () => {
    at('page', open(true));
    data.loadContribute.mockResolvedValue(agentTabViews.ownOnly);
    page([], null);
    expect(await render(IssuePage)).toContain('data-ranking=');
  });

  it('a visitor signs in; the other places are the rule’s', async () => {
    at('sign-in', SIGNED_OUT);
    const html = await render(IssuePage);
    expect(text(html)).toContain('Sign in to pick your first issue');
    expect(issues.loadIssues).not.toHaveBeenCalled();
    at('redirect', open(false), '/contribute/start/agent');
    await expect(render(IssuePage)).rejects.toThrow('NEXT_REDIRECT /contribute/start/agent');
    at('redirect', open(true, { hosted: false, own: false }), '/my/agent');
    await expect(render(IssuePage)).rejects.toThrow('NEXT_REDIRECT /my/agent');
  });
});
