import { beforeEach, describe, expect, it, vi } from 'vitest';

const data = vi.hoisted(() => ({
  viewerLogin: vi.fn(),
  loadContribute: vi.fn(),
  loadContributeSetup: vi.fn(),
  loadContributeSetupState: vi.fn(async () => 'none'),
  loadIssueAttempt: vi.fn(),
  loadAttempt: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({
  redirect: (to: string) => {
    throw new Error(`NEXT_REDIRECT ${to}`);
  },
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));
vi.mock('@/lib/workspace/contribute.data', () => data);
const learnData = vi.hoisted(() => ({ loadAttemptLesson: vi.fn() }));
vi.mock('@/lib/learn/learn.data', () => learnData);

const { lessonPageOf } = await import('./page-read');
const { views } = await import('@/lib/contribute/__fixtures__/contribute-views');
const { detail } = await import('@/lib/contribute/__fixtures__/contribute-attempts');

/** A person with neither sign. */
const NO_SIGN = {
  ...views.midSetup,
  contributor: { ...views.midSetup.contributor, contributeOnboardedAt: null, learnOnboardedAt: null },
};
const params = () => Promise.resolve({ owner: 'acme', repo: 'widgets', issue: '42' });
const WALKTHROUGH = '/my/pull-requests/acme/widgets/42/walkthrough';

beforeEach(() => {
  for (const mock of Object.values(data)) mock.mockReset();
  data.viewerLogin.mockResolvedValue('octocat');
  data.loadContribute.mockResolvedValue(views.active);
  data.loadIssueAttempt.mockResolvedValue({ attemptId: 'A_1', repo: 'acme/widgets', number: 42, earlier: [] });
  data.loadAttempt.mockResolvedValue(
    detail({ attemptId: 'A_1', kind: 'FIRST', mode: 'LEARN', nameWithOwner: 'acme/widgets', number: 42 }),
  );
  learnData.loadAttemptLesson.mockReset().mockResolvedValue({ stage: 'LESSON' });
});

describe("the fixer's walkthrough without either sign", () => {
  it("goes to Learn's onboarding with the way back to the walkthrough, never to /contribute", async () => {
    data.loadContribute.mockResolvedValue(NO_SIGN);
    await expect(lessonPageOf(params())).rejects.toThrow(
      `NEXT_REDIRECT /learn/setup?back=${encodeURIComponent(`${WALKTHROUGH}?from=learn`)}`,
    );
  });

  it('keeps the query it was opened with on the way back', async () => {
    data.loadContribute.mockResolvedValue(NO_SIGN);
    await expect(lessonPageOf(params(), { from: 'learn', view: 'lesson' })).rejects.toThrow(
      `NEXT_REDIRECT /learn/setup?back=${encodeURIComponent(`${WALKTHROUGH}?from=learn&view=lesson`)}`,
    );
  });

  it('opens with the Learn sign', async () => {
    data.loadContribute.mockResolvedValue({
      ...NO_SIGN,
      contributor: { ...NO_SIGN.contributor, learnOnboardedAt: '2026-11-25T09:00:00.000Z' },
    });
    await expect(lessonPageOf(params())).resolves.toMatchObject({ lesson: { stage: 'LESSON' } });
  });
});
