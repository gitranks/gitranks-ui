import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { lessonPageOf, redirect, approve } = vi.hoisted(() => ({
  approve: { built: false },
  lessonPageOf: vi.fn(),
  redirect: vi.fn((to: string) => {
    throw new Error(`NEXT_REDIRECT ${to}`);
  }),
}));
vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({ redirect }));
vi.mock('@/lib/learn/built-pages', async (original) => ({
  ...(await original<typeof import('@/lib/learn/built-pages')>()),
  get LEARN_APPROVE_PAGE_BUILT() {
    return approve.built;
  },
}));
vi.mock('@/components/workspace/pull-request/page-read', () => ({
  lessonPageOf,
  Unavailable: () => null,
}));
vi.mock('@/components/learn/walkthrough/fixer-walkthrough', () => ({ FixerWalkthroughPlayer: () => null }));
vi.mock('@/components/learn/walkthrough/fixer-waiting', () => ({ FixerWaiting: () => null }));
vi.mock('@/components/workspace/page-skeleton', () => ({ ContributeSessionSkeleton: () => null }));

const { default: FixerWalkthroughPage } = await import('./page');
const { fixerRun, fixerSteps } = await import('@/lib/learn/__fixtures__/walkthrough');

const params = Promise.resolve({ owner: 'acme', repo: 'widgets', issue: '42' });
/** The view under the page's Suspense, drawn as the server draws it. */
async function viewOf() {
  const page = FixerWalkthroughPage({ params } as never) as ReactElement<{ children: ReactElement }>;
  const view = page.props.children as ReactElement<{ params: unknown }>;
  return (view.type as (props: unknown) => Promise<ReactElement | null>)(view.props);
}

const BASE = '/my/pull-requests/acme/widgets/42';
const first = { attemptId: 'A_1', nameWithOwner: 'acme/widgets', number: 42, pullRequest: null };
const lessonAt = (stage: string, patch: Record<string, unknown> = {}) => ({
  attemptId: 'A_1',
  stage,
  head: { language: 'TypeScript', title: 'Fix', subject: { issueTitle: 'Empty names break the list', pr: null } },
  steps: fixerSteps,
  run: fixerRun,
  ...patch,
});
const read = (stage: string, patch?: Record<string, unknown>) =>
  lessonPageOf.mockResolvedValue({ view: {}, first, lesson: lessonAt(stage, patch), base: BASE });

beforeEach(() => {
  approve.built = false;
  lessonPageOf.mockReset();
  redirect.mockClear();
});

describe("the fixer's walkthrough page", () => {
  it('reads the lesson as the Lesson view does, keeping the walkthrough address on a move', async () => {
    read('LESSON');
    await viewOf();
    expect(lessonPageOf).toHaveBeenCalledWith(params);
  });

  it("draws the run's parts, leading the end to the pull request's page until Approve exists", async () => {
    read('LESSON');
    const player = (await viewOf()) as ReactElement<{
      stepIds: string[];
      articles: unknown[];
      finish: string;
      crumbs: { label: string }[];
    }>;
    expect(player.props.stepIds).toEqual(['before', 'fix', 'cases', 'connects']);
    expect(player.props.articles).toHaveLength(4);
    expect(player.props.finish).toBe(BASE);
    expect(player.props.crumbs.map((crumb) => crumb.label)).toEqual([
      'Pull requests',
      'acme/widgets #42',
      'The walkthrough of this fix',
    ]);
  });

  it("leads the end to Approve once it exists, a blocked walkthrough still to the pull request's page", async () => {
    approve.built = true;
    read('BLOCKED');
    const player = (await viewOf()) as ReactElement<{ finish: string; pullRequest: string }>;
    expect(player.props.finish).toBe(`${BASE}/approve`);
    expect(player.props.pullRequest).toBe(BASE);
  });

  it('opens Approve for a passed walkthrough, where the emails’ “Read and send” lead', async () => {
    approve.built = true;
    read('READY_TO_APPROVE');
    await expect(viewOf()).rejects.toThrow(`NEXT_REDIRECT ${BASE}/approve`);
    // While the pull request is being opened: its page, which follows the opening.
    lessonPageOf.mockResolvedValue({
      view: {},
      first: { ...first, state: 'SUBMITTING' },
      lesson: lessonAt('READY_TO_APPROVE'),
      base: BASE,
    });
    await expect(viewOf()).rejects.toThrow(`NEXT_REDIRECT ${BASE}`);
  });

  it('says the agent is writing or rewriting the walkthrough', async () => {
    read('AGENT_REWRITING', { head: null, steps: null, run: null });
    const page = (await viewOf()) as ReactElement<{ children: ReactElement<{ rewriting?: boolean }>[] }>;
    expect(page.props.children[1].props.rewriting).toBe(true);
  });

  it('sends an open pull request to the public walkthrough, and an ended attempt to its page', async () => {
    read('PR_OPEN', {
      head: { language: null, title: 'Fix', subject: { issueTitle: null, pr: 57 } },
    });
    await expect(viewOf()).rejects.toThrow('NEXT_REDIRECT /learn/fixes/acme/widgets/57/walkthrough');
    read('ENDED');
    await expect(viewOf()).rejects.toThrow(`NEXT_REDIRECT ${BASE}`);
  });

  it('draws nothing signed out (the layout asks to sign in), and says when the API does not answer', async () => {
    lessonPageOf.mockResolvedValue(null);
    expect(await viewOf()).toBeNull();
    lessonPageOf.mockResolvedValue('unread');
    expect(await viewOf()).not.toBeNull();
  });
});
