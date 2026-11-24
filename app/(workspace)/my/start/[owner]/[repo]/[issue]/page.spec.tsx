import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/my/start/driftwood-js/driftwood/934',
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
vi.mock('@/lib/workspace/start/start-page.actions', () => ({}));
const { viewerLogin } = vi.hoisted(() => ({ viewerLogin: vi.fn(async (): Promise<string | null> => 'octocat') }));
vi.mock('@/lib/workspace/contribute.data', () => ({
  viewerLogin,
  loadContributeVersion: vi.fn(async () => '1.1'),
  loadContributeActivity: vi.fn(async () => null),
  loadNeedsYouCount: vi.fn(async () => 0),
}));
const learn = vi.hoisted(() => ({ loadLearnProfile: vi.fn() }));
vi.mock('@/lib/learn/learn.data', () => learn);
const gate = vi.hoisted(() => ({ loadWorkspaceGate: vi.fn() }));
vi.mock('@/lib/workspace/gate.data', () => gate);
const start = vi.hoisted(() => ({ loadStartPageView: vi.fn() }));
vi.mock('@/lib/workspace/start/start-page.data', () => start);
const masks = vi.hoisted(() => ({ loadStartPageWithMask: vi.fn() }));
vi.mock('@/lib/workspace/masked-issue.data', () => ({ loadStartPageWithMask: masks.loadStartPageWithMask }));
// The poll outside the tabs: a mark, so the page says where it mounts it.
vi.mock('@/components/workspace/workspace-live', () => ({
  WorkspaceLive: ({ children }: { children: ReactElement }) => <div data-workspace-live="">{children}</div>,
}));

const { default: StartPage } = await import('./page');
const { filledProfile, emptyProfile } = await import('@/lib/learn/__fixtures__/profile');
const { startPageViewOf } = await import('@/lib/workspace/start/__fixtures__/start-page');

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&#x27;', "'")
    .replace(/\s+/g, ' ')
    .trim();

/** The page's inner part, as its Suspense boundary renders it. */
async function renderInner(page: ReactElement): Promise<string> {
  const main = page.props as { children: ReactElement };
  const suspense = main.children as ReactElement<{ children: ReactElement }>;
  const inner = suspense.props.children as ReactElement<Record<string, unknown>>;
  const render = inner.type as (props: Record<string, unknown>) => Promise<ReactElement>;
  return renderToStaticMarkup(await render(inner.props));
}

const OPEN = { kind: 'open', entered: true, agents: { hosted: false, own: true } } as const;
const ROUTE = { owner: 'driftwood-js', repo: 'driftwood', issue: '934' };

const startPage = (search: Record<string, string> = {}, route: Record<string, string> = ROUTE) =>
  renderInner(
    StartPage({ params: Promise.resolve(route), searchParams: Promise.resolve(search) } as never) as ReactElement,
  );

beforeEach(() => {
  vi.clearAllMocks();
  viewerLogin.mockResolvedValue('octocat');
  gate.loadWorkspaceGate.mockResolvedValue(OPEN);
  learn.loadLearnProfile.mockResolvedValue(filledProfile);
  masks.loadStartPageWithMask.mockResolvedValue(null);
  start.loadStartPageView.mockImplementation(async (_ref, _mode, goal) => ({
    kind: 'view',
    view: startPageViewOf({ goal }),
  }));
});

describe('the Start page at /my/start', () => {
  const REF = { repo: 'driftwood-js/driftwood', issue: 934 };

  it('is Fix it by default, without reading the goal', async () => {
    const html = await startPage();
    expect(start.loadStartPageView).toHaveBeenCalledWith(REF, 'fix', null, undefined);
    expect(learn.loadLearnProfile).not.toHaveBeenCalled();
    expect(html).toContain('data-start-mode="fix"');
    expect(text(html)).toContain('Fix this issue');
    expect(html).not.toContain('data-workspace-live');
  });

  it('is lesson mode for ?lesson=1, with the saved goal, back to the tab it came from', async () => {
    const html = await startPage({ lesson: '1' });
    expect(start.loadStartPageView).toHaveBeenCalledWith(REF, 'lesson', 'TypeScript, Some', undefined);
    expect(html).toContain('data-start-mode="lesson"');
    expect(html).toContain('href="/learn/issues"');
    expect(await startPage({ lesson: '1', from: 'contribute' })).toContain('href="/contribute#issues"');
    learn.loadLearnProfile.mockResolvedValueOnce(emptyProfile);
    expect(text(await startPage({ lesson: '1' }))).toContain('Your lesson will be written for a general reader.');
  });

  it('sends lesson mode to Fix mode when the API has no lesson page for the issue', async () => {
    start.loadStartPageView.mockResolvedValueOnce({ kind: 'not-found' });
    await expect(startPage({ lesson: '1' })).rejects.toThrow('NEXT_REDIRECT /my/start/driftwood-js/driftwood/934');
  });

  it('is not found for an address that names no issue, and where the API has no page in Fix mode', async () => {
    await expect(startPage({}, { ...ROUTE, issue: 'x' })).rejects.toThrow('NEXT_NOT_FOUND');
    await expect(startPage({}, { ...ROUTE, owner: '-acme' })).rejects.toThrow('NEXT_NOT_FOUND');
    start.loadStartPageView.mockResolvedValueOnce({ kind: 'not-found' });
    await expect(startPage()).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it("sends an account that has not entered where the gate says, and moves on to the viewer's attempt", async () => {
    gate.loadWorkspaceGate.mockResolvedValueOnce({ ...OPEN, entered: false });
    await expect(startPage({ lesson: '1' })).rejects.toThrow('NEXT_REDIRECT /learn/start/driftwood-js/driftwood/934');
    gate.loadWorkspaceGate.mockResolvedValueOnce({ ...OPEN, entered: false });
    await expect(startPage()).rejects.toThrow('NEXT_REDIRECT /contribute/start');
    start.loadStartPageView.mockResolvedValueOnce({ kind: 'claimed', href: '/my/pull-requests/by-attempt/A_9' });
    await expect(startPage()).rejects.toThrow('NEXT_REDIRECT /my/pull-requests/by-attempt/A_9');
  });

  describe('the old address of an issue whose details are hidden', () => {
    const ANSWER = { ok: true, data: startPageViewOf().issue.start };

    it('is not found for an issue the viewer neither named nor holds', async () => {
      masks.loadStartPageWithMask.mockResolvedValue({ answer: ANSWER, maskId: 'q7k2m9xa' });
      await expect(startPage()).rejects.toThrow('NEXT_NOT_FOUND');
      expect(masks.loadStartPageWithMask).toHaveBeenCalledWith(REF, 'fix');
    });

    it('reads the issue once: the answer with the mask goes on to the page, which asks it no more', async () => {
      masks.loadStartPageWithMask.mockResolvedValue({ answer: ANSWER, maskId: null });
      expect(await startPage()).toContain('data-start-mode="fix"');
      expect(start.loadStartPageView).toHaveBeenCalledWith(REF, 'fix', null, ANSWER);
    });

    it('keeps working for an issue the viewer named or holds, and one they work on', async () => {
      masks.loadStartPageWithMask.mockResolvedValue({ answer: ANSWER, maskId: null });
      expect(await startPage()).toContain('data-start-mode="fix"');
      masks.loadStartPageWithMask.mockResolvedValue({ answer: ANSWER, maskId: 'q7k2m9xa' });
      start.loadStartPageView.mockResolvedValueOnce({ kind: 'claimed', href: '/my/pull-requests/by-attempt/A_9' });
      await expect(startPage()).rejects.toThrow('NEXT_REDIRECT /my/pull-requests/by-attempt/A_9');
    });

    it('leaves the page to read the issue itself when the mask read answers nothing', async () => {
      masks.loadStartPageWithMask.mockResolvedValue(null);
      expect(await startPage()).toContain('data-start-mode="fix"');
      expect(masks.loadStartPageWithMask).toHaveBeenCalledWith(REF, 'fix');
      expect(start.loadStartPageView).toHaveBeenCalledWith(REF, 'fix', null, undefined);
    });
  });
});
