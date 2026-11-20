import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
  redirect: (to: string) => {
    throw new Error(`NEXT_REDIRECT ${to}`);
  },
}));
vi.mock('server-only', () => ({}));
const data = vi.hoisted(() => ({
  loadContribute: vi.fn(),
  loadAttempts: vi.fn(),
  loadContributeSetup: vi.fn(async () => false),
  loadProviderInterests: vi.fn(async () => []),
  viewerLogin: vi.fn(async () => 'octocat'),
}));
vi.mock('@/lib/workspace/contribute.data', () => data);
const gate = vi.hoisted(() => ({ loadWorkspaceGate: vi.fn() }));
vi.mock('@/lib/workspace/gate.data', () => gate);
vi.mock('@/lib/workspace/preview-gate', () => ({ contributeOpen: vi.fn(async () => true) }));
vi.mock('@/lib/contribute/agent-page', () => ({ loadAgentPage: vi.fn(async () => null) }));
vi.mock('@/app/(workspace)/contribute/components/contribute-tab-view', () => ({
  ContributeTab: () => <div data-tab="" />,
}));
vi.mock('@/app/contribute/components/landing', () => ({ Landing: () => <div data-landing="" /> }));
vi.mock('@/components/workspace/agent/connect-view', () => ({
  OwnAgentConnectView: () => <div data-connect="" />,
}));

const { default: ContributeHomePage } = await import('@/app/(workspace)/contribute/page');
const { default: AgentConnectPage } = await import('@/app/(workspace)/my/agent/connect/page');
const { agentTabViews, views } = await import('@/lib/contribute/__fixtures__/contribute-views');

/** The async part inside the page's Suspense boundary (and its `main`, where it has one), rendered. */
async function renderInner(page: ReactElement): Promise<string> {
  let node = page as ReactElement<{ children?: ReactElement }>;
  while (node.type && typeof node.type !== 'function')
    node = node.props.children as ReactElement<{ children?: ReactElement }>;
  const drawn = await (node.type as unknown as (props: object) => Promise<ReactElement>)(node.props as object);
  return renderToStaticMarkup(drawn);
}

const OPEN = (entered: boolean) => ({ kind: 'open', entered, agents: { hosted: false, own: true }, learnOpen: true });
const home = (search: Record<string, string>) =>
  renderInner(ContributeHomePage({ searchParams: Promise.resolve(search) } as never) as ReactElement);
const connect = (search: Record<string, string>) =>
  renderInner(AgentConnectPage({ searchParams: Promise.resolve(search) } as never) as ReactElement);

beforeEach(() => {
  vi.clearAllMocks();
  gate.loadWorkspaceGate.mockResolvedValue(OPEN(true));
});

describe('the own agent’s old welcome, /contribute?welcome=agent', () => {
  it('goes to the first issue while there is no attempt yet', async () => {
    data.loadContribute.mockResolvedValue(agentTabViews.ownOnly);
    data.loadAttempts.mockResolvedValue([]);
    await expect(home({ welcome: 'agent', client: 'codex' })).rejects.toThrow('NEXT_REDIRECT /contribute/start/issue');
    expect(data.loadAttempts).toHaveBeenCalledWith(undefined, 1);
  });

  it('goes to the tab without it once there is an attempt, or when the read fails', async () => {
    data.loadContribute.mockResolvedValue(agentTabViews.ownOnly);
    data.loadAttempts.mockResolvedValue([{ attemptId: 'A_1' }]);
    await expect(home({ welcome: 'agent' })).rejects.toThrow(/NEXT_REDIRECT \/contribute$/);
    data.loadAttempts.mockResolvedValue(undefined);
    await expect(home({ welcome: 'agent' })).rejects.toThrow(/NEXT_REDIRECT \/contribute$/);
  });

  it('is the landing as before for an account that has not entered, and the tab without it', async () => {
    data.loadContribute.mockResolvedValue(views.noKey);
    expect(await home({ welcome: 'agent' })).toContain('data-landing');
    data.loadContribute.mockResolvedValue(agentTabViews.ownOnly);
    expect(await home({})).toContain('data-tab');
    expect(data.loadAttempts).not.toHaveBeenCalled();
  });
});

describe('the Agent tab’s connect page', () => {
  it('sends an account that has not entered to the own-agent step, the query kept', async () => {
    gate.loadWorkspaceGate.mockResolvedValue(OPEN(false));
    await expect(connect({ from: 'agent', proof: 'A_1' })).rejects.toThrow(
      'NEXT_REDIRECT /contribute/start/agent/own?from=agent&proof=A_1',
    );
  });

  it('opens for an account that has entered, and leaves a visitor to the layout’s sign-in', async () => {
    expect(await connect({ from: 'agent' })).toContain('data-connect');
    gate.loadWorkspaceGate.mockResolvedValue({ kind: 'signed-out' });
    expect(await connect({})).toContain('data-connect');
  });
});
