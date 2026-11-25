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
vi.mock('@/lib/workspace/actions', () => ({ readFeedComputedAt: vi.fn() }));
const mark = vi.hoisted(() => ({ markContributeOnboarded: vi.fn() }));
vi.mock('@/lib/workspace/onboarding.actions', () => mark);
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
const place = vi.hoisted(() => ({ loadContributeFlowPlace: vi.fn(), loadOpenedIssue: vi.fn() }));
vi.mock('@/lib/workspace/getting-in.data', () => place);
vi.mock('@/lib/workspace/masked-issue.data', () => ({ loadMaskedListReads: vi.fn(async () => undefined) }));
const issues = vi.hoisted(() => ({ loadIssues: vi.fn() }));
vi.mock('@/lib/contribute/contribute.data', () => issues);
const profile = vi.hoisted(() => ({ loadFlowProfileLanguages: vi.fn(async () => ['GO']) }));
vi.mock('@/lib/contribute/start-flow.data', () => profile);

const { default: StartPage } = await import('./page');
const { default: AgentPage } = await import('./agent/page');
const { default: OwnAgentPage } = await import('./agent/own/page');
const { default: KeyPage } = await import('./agent/key/page');
const { default: IssuePage } = await import('./issue/page');
const { views, agentTabViews } = await import('@/lib/contribute/__fixtures__/contribute-views');
const { issue } = await import('@/lib/contribute/__fixtures__/contribute-overview');
const { issuePage, maskedIssue } = await import('@/lib/workspace/__fixtures__/masked-issue');

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
  const props = node.props as { children?: ReactNode; fallback?: ReactNode };
  return (
    innerOf(props.children) ??
    (typeof node.type === 'function' ? innerOf((node.type as (p: object) => ReactNode)(props)) : null)
  );
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
type Agents = { hosted: boolean; own: boolean };
const OWN: Agents = { hosted: false, own: true };
/** An open account, with the Contribute sign or without it. */
const open = (sign: boolean, agents: Agents = OWN) =>
  ({ kind: 'open', entered: sign, signs: { contribute: sign, learn: null }, agents }) as const;
const at = (kind: string, gate: object = open(false), to?: string, facts: object = {}) =>
  place.loadContributeFlowPlace.mockResolvedValue({
    place: to ? { kind, to } : { kind },
    gate,
    facts: { hasAttempt: false, connected: OWN, ...facts },
  });

beforeEach(() => {
  vi.clearAllMocks();
  data.loadContribute.mockResolvedValue(views.newcomer);
  place.loadOpenedIssue.mockResolvedValue(null);
});

describe('Your agent: the first step', () => {
  it('a visitor reads it whole, its buttons signing in first; nothing of theirs is read', async () => {
    at('page', SIGNED_OUT);
    const html = await render(StartPage);
    expect(html.match(/aria-current="step"/g)).toHaveLength(1);
    expect(text(html)).toContain('1 Your agent 2 Your first issue');
    expect(text(html)).toContain('How Contribute works');
    expect(text(html)).toContain('Who does the work?');
    expect(html).toContain('data-contribute-source="contribute_flow_sign_in"');
    expect(html).not.toContain('href="/contribute/start/agent/own"');
    expect(data.loadContribute).not.toHaveBeenCalled();
    expect(place.loadContributeFlowPlace).toHaveBeenCalledWith('agent', { issue: null });
  });

  it('signed in, the two ways lead on, your own agent first', async () => {
    at('page');
    const html = await render(AgentPage);
    const own = html.indexOf('href="/contribute/start/agent/own"');
    const key = html.indexOf('href="/contribute/start/agent/key"');
    expect(own).toBeGreaterThan(-1);
    expect(key).toBeGreaterThan(own);
    expect(html).toContain('data-contribute-source="contribute_flow_own"');
    expect(html).toContain('data-contribute-source="contribute_flow_key"');
    expect(html).not.toContain('data-flow-sign-in');
  });

  it('opened from an issue: the way back rides on both buttons, and the line says so while the issue reads', async () => {
    at('page');
    place.loadOpenedIssue.mockResolvedValue(issuePage());
    const html = await render(StartPage, { issue: 'q7k2m9xa' });
    expect(place.loadContributeFlowPlace).toHaveBeenCalledWith('agent', { issue: 'q7k2m9xa' });
    expect(place.loadOpenedIssue).toHaveBeenCalledWith('q7k2m9xa');
    expect(html).toContain('href="/contribute/start/agent/own?issue=q7k2m9xa"');
    expect(html).toContain('href="/contribute/start/agent/key?issue=q7k2m9xa"');
    expect(text(html)).toContain('You opened an issue. After this setup you go back to it.');

    place.loadOpenedIssue.mockResolvedValue(null);
    const gone = await render(StartPage, { issue: 'q7k2m9xa' });
    expect(gone).toContain('href="/contribute/start/agent/own?issue=q7k2m9xa"');
    expect(text(gone)).not.toContain('You opened an issue.');
  });

  it('an address with something else in `issue` is no way back', async () => {
    at('page');
    await render(StartPage, { issue: '//evil.example' });
    expect(place.loadContributeFlowPlace).toHaveBeenCalledWith('agent', { issue: null });
  });

  it('an account being set up waits in the frame', async () => {
    at('setting-up', { kind: 'setting-up' });
    expect(text(await render(AgentPage))).toContain('Setting up your GitRanks account');
  });
});

describe('Your agent: your own agent and a Claude key', () => {
  it('a visitor is sent to the first step, the way back kept', async () => {
    at('redirect', SIGNED_OUT, '/contribute/start?issue=q7k2m9xa');
    await expect(render(OwnAgentPage, { issue: 'q7k2m9xa' })).rejects.toThrow(
      'NEXT_REDIRECT /contribute/start?issue=q7k2m9xa',
    );
    expect(place.loadContributeFlowPlace).toHaveBeenCalledWith('agent-own', {
      query: 'issue=q7k2m9xa',
      issue: 'q7k2m9xa',
    });
    at('redirect', SIGNED_OUT, '/contribute/start');
    await expect(render(KeyPage)).rejects.toThrow('NEXT_REDIRECT /contribute/start');
  });

  it('signed in, the own agent’s connect steps sit under the page’s title, on the first step, with the way back', async () => {
    at('page');
    data.loadContribute.mockResolvedValue({ ...views.midSetup });
    const html = await render(OwnAgentPage);
    expect(html.match(/<h1/g)).toHaveLength(1);
    expect(text(html)).toContain('About a minute · no Claude key needed');
    expect(html).toContain('href="/contribute/start"');
    expect(html).toMatch(/data-step-state="current"[^>]*>[\s\S]*?Your agent/);
  });

  it('a person with the sign goes on to the Agent tab’s connect page, the query kept', async () => {
    at('redirect', open(true), '/my/agent/connect?from=agent');
    await expect(render(OwnAgentPage, { from: 'agent' })).rejects.toThrow('NEXT_REDIRECT /my/agent/connect?from=agent');
    expect(place.loadContributeFlowPlace).toHaveBeenCalledWith('agent-own', { query: 'from=agent', issue: null });
  });

  it('signed in, the key’s one screen, its other way the own agent with the way back', async () => {
    at('page');
    data.loadContribute.mockResolvedValue(views.noKey);
    const html = await render(KeyPage, { issue: 'q7k2m9xa' });
    expect(place.loadContributeFlowPlace).toHaveBeenCalledWith('agent-key', { issue: 'q7k2m9xa' });
    expect(html).toContain('data-connect-path="key"');
    expect(text(html)).toContain('About two minutes');
    expect(html).toContain('href="/contribute/start/agent/own?issue=q7k2m9xa"');
  });
});

describe('Your first issue: the second step', () => {
  const page = (items = [issue()], computedAt: string | null = '2026-10-28T07:00:00.000Z') =>
    issues.loadIssues.mockResolvedValue({ items, total: items.length, next: null, computedAt });

  it('names the agent connected, lists the issues without the row menu, then the next sentence and Skip', async () => {
    at('page', open(true));
    data.loadContribute.mockResolvedValue(agentTabViews.ownOnly);
    page();
    const html = await render(IssuePage);
    expect(text(html)).toContain(
      'Claude Code is connected. These open issues fit what you work on. See one in full, then start it.',
    );
    expect(html).toContain('data-issue=');
    expect(html).not.toContain('data-row-menu');
    expect(html).toContain('data-start-control="link"');
    expect(html).toContain('data-contribute-source="contribute_flow_issue"');
    expect(text(html)).toContain(
      'Next: you see one issue in full, your agent writes the fix, and you read it before anything reaches GitHub.',
    );
    const skip = [...html.matchAll(/<a [^>]*>/g)].map(([tag]) => tag).find((tag) => tag.includes('data-flow-leave'));
    expect(skip).toContain('href="/contribute"');
    expect(html).toContain('data-contribute-source="contribute_flow_skip"');
    expect(html).toMatch(/data-step-state="done"[^>]*>[\s\S]*?Done: <\/span>Your agent/);
    expect(html).toMatch(/aria-current="step"[^>]*>[\s\S]*?Your first issue/);
  });

  it('with the key alone, or both, says so; the connected rule is the place’s, not the gate’s', async () => {
    at('page', open(true, { hosted: true, own: true }), undefined, { connected: { hosted: true, own: false } });
    data.loadContribute.mockResolvedValue(agentTabViews.hostedOnly);
    page();
    expect(text(await render(IssuePage))).toContain('Your Claude key is connected.');
    at('page', open(true), undefined, { connected: { hosted: true, own: true } });
    data.loadContribute.mockResolvedValue(agentTabViews.both);
    page();
    expect(text(await render(IssuePage))).toContain('Your agents are connected.');
  });

  it('the line of languages: the saved ones, else the profile’s, read only then', async () => {
    at('page', open(true));
    page();
    data.loadContribute.mockResolvedValue(views.newcomer);
    const fromProfile = text(await render(IssuePage));
    expect(profile.loadFlowProfileLanguages).toHaveBeenCalledTimes(1);
    expect(fromProfile).toContain('Picked for Go , from your GitHub profile. Change');

    profile.loadFlowProfileLanguages.mockClear();
    data.loadContribute.mockResolvedValue(views.active);
    const saved = text(await render(IssuePage));
    expect(profile.loadFlowProfileLanguages).not.toHaveBeenCalled();
    expect(saved).toMatch(/Picked for .+\. Change/);
    expect(saved).not.toContain('from your GitHub profile');
  });

  it('with nothing that fits: the box with "Add a language", not a way back to the first step', async () => {
    at('page', open(true));
    data.loadContribute.mockResolvedValue(agentTabViews.ownOnly);
    page([]);
    const html = await render(IssuePage);
    expect(text(html)).toContain('Claude Code is connected, so you are ready when an issue comes.');
    expect(text(html)).toContain('No open issue fits what you work on right now');
    expect(text(html)).toContain('New issues are checked every hour. Adding a language lets more of them fit.');
    expect(text(html)).toContain('Add a language');
    expect(html).not.toContain('href="/contribute/start"');
  });

  it('while the first picks are made: the box that reads the page again, and the head says they are on their way', async () => {
    at('page', open(true));
    data.loadContribute.mockResolvedValue(agentTabViews.ownOnly);
    page([], null);
    const html = await render(IssuePage);
    expect(html).toContain('data-ranking="waiting"');
    expect(text(html)).toContain('Claude Code is connected. Your first issues are on their way.');
  });

  it('opened from an issue that still reads: "The issue you opened" first, its one button to its page', async () => {
    at('page', open(true), undefined, { issue: 'q7k2m9xa' });
    data.loadContribute.mockResolvedValue(agentTabViews.ownOnly);
    place.loadOpenedIssue.mockResolvedValue(issuePage());
    page();
    const html = await render(IssuePage, { issue: 'q7k2m9xa' });
    expect(place.loadOpenedIssue).toHaveBeenCalledWith('q7k2m9xa');
    const opened = html.slice(html.indexOf('data-opened-issue'), html.indexOf('Or pick another'));
    expect(text(html)).toContain('The issue you opened');
    expect(opened).toContain('href="/my/issues/q7k2m9xa?from=contribute"');
    expect(text(opened)).toContain('Start fixing it');
    expect(text(opened)).not.toContain('Skip');
    expect(opened).toContain('data-flow-leave');
    expect(html.indexOf('Or pick another')).toBeLessThan(html.indexOf('data-issue='));
  });

  it('the issue the person opened is not in the list under it as well', async () => {
    at('page', open(true), undefined, { issue: 'q7k2m9xa' });
    data.loadContribute.mockResolvedValue(agentTabViews.ownOnly);
    place.loadOpenedIssue.mockResolvedValue(issuePage());
    page([issue({ issueId: 'I_opened', masked: maskedIssue({ id: 'q7k2m9xa' }) }), issue({ issueId: 'I_other' })]);
    const html = await render(IssuePage, { issue: 'q7k2m9xa' });
    expect(html.match(/data-masked-row="q7k2m9xa"/g)).toHaveLength(1);
    expect(html).toContain('data-issue="I_other"');
    expect(html).not.toContain('data-issue="I_opened"');
  });

  it('the sign: asked from the browser only, never while the server draws; a person with it is not held', async () => {
    at('page', open(false));
    data.loadContribute.mockResolvedValue(agentTabViews.ownOnly);
    page();
    expect(await render(IssuePage)).toContain('data-mark="pending"');
    at('page', open(true));
    expect(await render(IssuePage)).toContain('data-mark="done"');
    expect(mark.markContributeOnboarded).not.toHaveBeenCalled();
  });

  it('every other place is the rule’s, the way back kept', async () => {
    at('redirect', SIGNED_OUT, '/contribute/start?issue=q7k2m9xa');
    await expect(render(IssuePage, { issue: 'q7k2m9xa' })).rejects.toThrow(
      'NEXT_REDIRECT /contribute/start?issue=q7k2m9xa',
    );
    expect(place.loadContributeFlowPlace).toHaveBeenCalledWith('issue', { issue: 'q7k2m9xa' });
    expect(issues.loadIssues).not.toHaveBeenCalled();
    at('redirect', open(true, { hosted: false, own: false }), '/my/agent');
    await expect(render(IssuePage)).rejects.toThrow('NEXT_REDIRECT /my/agent');
  });
});
