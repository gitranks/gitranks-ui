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
const gate = vi.hoisted(() => ({ loadWorkspaceGate: vi.fn() }));
vi.mock('@/lib/workspace/gate.data', () => gate);
const start = vi.hoisted(() => ({ loadStartPageView: vi.fn() }));
vi.mock('@/lib/workspace/start/start-page.data', () => start);
const masks = vi.hoisted(() => ({ loadStartPageWithMask: vi.fn() }));
vi.mock('@/lib/workspace/masked-issue.data', () => ({ loadStartPageWithMask: masks.loadStartPageWithMask }));

const { default: StartPage } = await import('./page');
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

/** An open gate with these signs. */
const openWith = (contribute: boolean | null, learn: boolean | null) =>
  ({ kind: 'open', signs: { contribute, learn }, agents: { hosted: false, own: true } }) as const;
const OPEN = openWith(true, true);
const ROUTE = { owner: 'driftwood-js', repo: 'driftwood', issue: '934' };

const startPage = (search: Record<string, string> = {}, route: Record<string, string> = ROUTE) =>
  renderInner(
    StartPage({ params: Promise.resolve(route), searchParams: Promise.resolve(search) } as never) as ReactElement,
  );

beforeEach(() => {
  vi.clearAllMocks();
  viewerLogin.mockResolvedValue('octocat');
  gate.loadWorkspaceGate.mockResolvedValue(OPEN);
  masks.loadStartPageWithMask.mockResolvedValue(null);
  start.loadStartPageView.mockImplementation(async () => ({ kind: 'view', view: startPageViewOf() }));
});

describe('the Start page at /my/start', () => {
  const REF = { repo: 'driftwood-js/driftwood', issue: 934 };

  it('is Fix it by default', async () => {
    const html = await startPage();
    expect(start.loadStartPageView).toHaveBeenCalledWith(REF, 'fix', undefined);
    expect(html).toContain('data-start-mode="fix"');
    expect(text(html)).toContain('Fix this issue');
  });

  it('is lesson mode for ?lesson=1, back to the tab it came from', async () => {
    const html = await startPage({ lesson: '1' });
    expect(start.loadStartPageView).toHaveBeenCalledWith(REF, 'lesson', undefined);
    expect(html).toContain('data-start-mode="lesson"');
    expect(html).toContain('href="/learn/issues"');
    expect(await startPage({ lesson: '1', from: 'contribute' })).toContain('href="/contribute#issues"');
    expect(text(await startPage({ lesson: '1' }))).not.toContain('Your lesson will be written for');
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

  describe('by the sign the page needs', () => {
    const LEARN_BACK = (query: string) =>
      `NEXT_REDIRECT /learn/setup?back=${encodeURIComponent(`/my/start/driftwood-js/driftwood/934?${query}`)}`;

    it.each<[string, boolean | null, boolean | null, boolean]>([
      ['no sign', false, false, false],
      ['the Contribute sign only', true, false, true],
      ['the Learn sign only', false, true, false],
      ['both signs', true, true, true],
      ['the signs not known', null, null, false],
    ])('from Contribute, %s: opens %s, else the flow’s first step', async (_who, contribute, learn, opens) => {
      for (const search of [{}, { from: 'contribute' }] as Record<string, string>[]) {
        gate.loadWorkspaceGate.mockResolvedValueOnce(openWith(contribute, learn));
        if (opens) expect(await startPage(search)).toContain('data-start-mode="fix"');
        else await expect(startPage(search)).rejects.toThrow(/^NEXT_REDIRECT \/contribute\/start$/);
      }
    });

    it.each<[string, boolean | null, boolean | null, boolean]>([
      ['no sign', false, false, false],
      ['the Contribute sign only', true, false, false],
      ['the Learn sign only', false, true, true],
      ['both signs', true, true, true],
      ['the signs not known', null, null, true],
    ])(
      "from Learn, %s: opens %s, else Learn's onboarding with the way back",
      async (_who, contribute, learn, opens) => {
        for (const search of [{ from: 'learn' }, { lesson: '1' }, { lesson: '1', from: 'contribute' }] as Record<
          string,
          string
        >[]) {
          gate.loadWorkspaceGate.mockResolvedValueOnce(openWith(contribute, learn));
          const query = new URLSearchParams(search).toString();
          if (opens) expect(await startPage(search)).toContain('data-start-mode');
          else await expect(startPage(search)).rejects.toThrow(LEARN_BACK(query));
        }
      },
    );

    it("moves on to the viewer's own attempt first, whatever sign they have", async () => {
      for (const search of [{}, { from: 'learn' }, { lesson: '1' }] as Record<string, string>[]) {
        gate.loadWorkspaceGate.mockResolvedValueOnce(openWith(false, false));
        start.loadStartPageView.mockResolvedValueOnce({ kind: 'claimed', href: '/my/pull-requests/by-attempt/A_9' });
        await expect(startPage(search)).rejects.toThrow('NEXT_REDIRECT /my/pull-requests/by-attempt/A_9');
      }
    });

    it('checks the sign before saying the issue is not found', async () => {
      gate.loadWorkspaceGate.mockResolvedValueOnce(openWith(false, false));
      start.loadStartPageView.mockResolvedValueOnce({ kind: 'not-found' });
      await expect(startPage()).rejects.toThrow(/^NEXT_REDIRECT \/contribute\/start$/);
    });

    it('is not found for a visitor and for an account the workspace is not open to (the layout signs a visitor in)', async () => {
      for (const kind of ['signed-out', 'hidden', 'setting-up']) {
        gate.loadWorkspaceGate.mockResolvedValueOnce({ kind });
        await expect(startPage()).rejects.toThrow('NEXT_NOT_FOUND');
      }
    });
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
      expect(start.loadStartPageView).toHaveBeenCalledWith(REF, 'fix', ANSWER);
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
      expect(start.loadStartPageView).toHaveBeenCalledWith(REF, 'fix', undefined);
    });
  });
});
