import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
  redirect: (to: string) => {
    throw new Error(`NEXT_REDIRECT ${to}`);
  },
}));
vi.mock('@/components/learn/learn-view-report', () => ({ LearnViewReport: () => null }));
const data = vi.hoisted(() => ({ loadPublicProgress: vi.fn(), loadPublicRecord: vi.fn() }));
vi.mock('@/lib/learn/public-progress/public-progress.data', () => data);
const session = vi.hoisted(() => ({ viewerLogin: vi.fn(async (): Promise<string | null> => null) }));
vi.mock('@/lib/workspace/contribute.data', () => session);

const { PublicProgressScreen } = await import('./public-progress-screen');
const { PublicProgressView } = await import('./public-progress-view');
const page = await import('@/app/(public)/learn/progress/[login]/page');

import type { LearnRecord } from '@/lib/learn/learn.types';
import type { LearnPublicLesson, LearnPublicProgress } from '@/lib/learn/public-progress/public-progress';

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&#x27;', "'")
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' ')
    .trim();

const RECORD: LearnRecord = {
  login: 'octocat',
  lessons: 2,
  newThings: 3,
  topics: [],
  prsOpened: 2,
  prsMerged: 1,
  reposHelped: 1,
};
const lesson = (extra: Partial<LearnPublicLesson> = {}): LearnPublicLesson => ({
  kind: 'OWN',
  slug: 'cache-keys-abc123',
  title: 'Why the layouts were built twice',
  repo: 'acme/router',
  issueNumber: 7,
  passedAt: '2026-11-12T10:00:00.000Z',
  learned: [{ stepId: 's2', number: 2, parts: ['cause'], title: 'The cache key is the raw path' }],
  merged: true,
  prNumber: 42,
  prUrl: 'https://github.com/acme/router/pull/42',
  ...extra,
});
const PROGRESS: LearnPublicProgress = {
  record: RECORD,
  items: [
    lesson(),
    lesson({ kind: 'PRACTICE', slug: 'rounding-def456', merged: false, prNumber: null, prUrl: null, learned: [] }),
  ],
  total: 2,
};

const screen = (props: Partial<Parameters<typeof PublicProgressScreen>[0]> = {}) =>
  renderToStaticMarkup(<PublicProgressScreen login="octocat" page={1} progress={PROGRESS} own={false} {...props} />);

afterEach(() => {
  vi.clearAllMocks();
});

describe('the public progress page', () => {
  it('says who is learning, their four numbers and their public lessons, each to its result page', () => {
    const html = screen();
    expect(text(html)).toMatch(
      /^Learn octocat is learning from real open-source fixes lessons passed 2 new things learned 3 repo helped 1 pull request merged 1 Lessons passed/,
    );
    expect(html).toContain('href="/profile/octocat"');
    expect(html).toContain('href="/learn/lessons/cache-keys-abc123/passes/octocat"');
    expect(html).toContain('href="/learn/lessons/rounding-def456/passes/octocat"');
    expect(text(html)).toContain('1–2 of 2 lessons');
    // Two columns of numbers on a phone, four from `sm`.
    expect(html).toContain('grid-cols-2 gap-3 sm:grid-cols-4');
  });

  it('names a pull request only once merged, and marks a practice lesson', () => {
    const html = screen();
    expect(html).toContain('href="https://github.com/acme/router/pull/42"');
    expect(text(html)).toContain('Merged');
    expect(text(html)).toContain('Practice');
    expect(text(html)).not.toContain('Your lesson');
    expect(html.match(/PR #/g)).toHaveLength(1);
  });

  it('gives the person themself the way to their own page, and everyone the way in', () => {
    expect(text(screen({ own: true }))).toContain(
      'This is your public page. Your progress is here →',
    );
    expect(screen({ own: true })).toContain('href="/learn/progress"');
    expect(screen()).not.toContain('data-own-line');
    expect(text(screen())).toContain('Learn from a real fix yourself');
  });

  it('says so when the read failed', () => {
    expect(text(screen({ progress: 'unavailable' }))).toContain(
      'This page is not available right now. Try again in a minute.',
    );
  });
});

describe('the public progress page, read', () => {
  const view = (login: string, search: Record<string, string> = {}) =>
    PublicProgressView({ login, searchParams: Promise.resolve(search) });

  it('answers 404 with nothing public, for another spelling of the login, and for a login that is not one', async () => {
    data.loadPublicProgress.mockResolvedValue(null);
    await expect(view('octocat')).rejects.toThrow('NEXT_NOT_FOUND');
    data.loadPublicProgress.mockResolvedValue(PROGRESS);
    await expect(view('OctoCat')).rejects.toThrow('NEXT_NOT_FOUND');
    await expect(view('-nope-')).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('reads the page the address names, goes to the last past it, and knows its owner', async () => {
    data.loadPublicProgress.mockResolvedValue(PROGRESS);
    session.viewerLogin.mockResolvedValue('OctoCat');
    const html = renderToStaticMarkup(await view('octocat', { page: '1' }));
    expect(data.loadPublicProgress).toHaveBeenCalledWith('octocat', 1);
    expect(html).toContain('data-public-progress="own"');
    await expect(view('octocat', { page: '3' })).rejects.toThrow('NEXT_REDIRECT /learn/progress/octocat');
  });

  it('says the page is not available when the read fails', async () => {
    data.loadPublicProgress.mockRejectedValue(new Error('down'));
    expect(renderToStaticMarkup(await view('octocat'))).toContain('data-public-progress="unavailable"');
  });
});

describe('the page’s link preview', () => {
  const params = (login: string) => Promise.resolve({ login });

  it('names the card under its `v`, from the record', async () => {
    data.loadPublicRecord.mockResolvedValue(RECORD);
    const metadata = await page.generateMetadata({ params: params('octocat') } as never);
    const images = metadata.openGraph?.images as { url: string; width: number; height: number; alt: string }[];
    expect(images[0]).toMatchObject({ width: 1200, height: 630 });
    expect(images[0].url).toMatch(/\/badge\/user\/octocat\/learn-card\.png\?v=2-3-1$/);
    expect(images[0].alt).toBe(
      'octocat passed 2 lessons on real open-source fixes and learned 3 new things. 1 repository merged the fixes.',
    );
    expect(metadata.title).toEqual({ absolute: 'octocat on GitRanks Learn' });
    expect(metadata.robots).toEqual({ index: false, follow: true });
    expect(data.loadPublicRecord).toHaveBeenCalledWith('octocat');
  });

  it('keeps no card in the preview of another spelling of the login', async () => {
    data.loadPublicRecord.mockResolvedValue(RECORD);
    const metadata = await page.generateMetadata({ params: params('OctoCat') } as never);
    expect(metadata.openGraph).toBeUndefined();
  });
});
