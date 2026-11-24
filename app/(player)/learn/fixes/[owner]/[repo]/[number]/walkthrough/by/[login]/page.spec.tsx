import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { loadWalkthroughAnswers, notFound } = vi.hoisted(() => ({
  loadWalkthroughAnswers: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));
vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({ notFound }));
vi.mock('@/lib/learn/walkthrough.data', () => ({ loadWalkthroughAnswers }));
vi.mock('@/components/learn/walkthrough/answers-view', () => ({ AnswersLive: () => null }));

const { default: AnswersPage, generateMetadata } = await import('./page');
const { octocatAnswers } = await import('@/lib/learn/__fixtures__/walkthrough');

const props = (login = 'octocat') => ({
  params: Promise.resolve({ owner: 'acme', repo: 'widgets', number: '57', login }),
});

beforeEach(() => {
  loadWalkthroughAnswers.mockReset();
});

describe("a person's answers page", () => {
  it("hands the cached answers to the page, which reads the person's side itself; never indexed", async () => {
    loadWalkthroughAnswers.mockResolvedValue(octocatAnswers);
    const page = (await AnswersPage(props())) as ReactElement<{ pr: unknown; login: string; initial: unknown }>;
    expect(page.props).toEqual({
      pr: { nameWithOwner: 'acme/widgets', number: 57 },
      login: 'octocat',
      initial: octocatAnswers,
    });
    const metadata = await generateMetadata(props());
    expect(metadata.robots).toEqual({ index: false, follow: true });
    expect(metadata.alternates?.canonical).toBe('/learn/fixes/acme/widgets/57/walkthrough');
  });

  it('hands on no answers when the read did not come', async () => {
    loadWalkthroughAnswers.mockResolvedValue(null);
    const page = (await AnswersPage(props())) as ReactElement<{ initial: unknown }>;
    expect(page.props.initial).toBeNull();
  });

  it('is not there for a login of no shape, without asking', async () => {
    await expect(AnswersPage(props('-bad-'))).rejects.toThrow('NEXT_NOT_FOUND');
    expect(loadWalkthroughAnswers).not.toHaveBeenCalled();
  });
});
