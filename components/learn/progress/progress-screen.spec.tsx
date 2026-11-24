import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({
  usePathname: () => '/my/progress',
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
  redirect: (to: string) => {
    throw new Error(`NEXT_REDIRECT ${to}`);
  },
}));
const gate = vi.hoisted(() => ({ loadWorkspaceGate: vi.fn() }));
vi.mock('@/lib/workspace/gate.data', () => gate);
const data = vi.hoisted(() => ({ loadLearnProgress: vi.fn(), loadProgressList: vi.fn() }));
vi.mock('@/lib/learn/progress/progress.data', () => data);
const contribute = vi.hoisted(() => ({ loadPullRequestsPage: vi.fn(), viewerLogin: vi.fn(async () => 'octocat') }));
vi.mock('@/lib/workspace/contribute.data', () => contribute);

const { ProgressScreen } = await import('./progress-screen');
const { ProgressView } = await import('./progress-view');
const { LearnLessonStatePill } = await import('./learn-lesson-state-pill');
const fixtures = await import('@/lib/learn/progress/__fixtures__/progress');

import type { ProgressScreenProps } from './progress-screen';
import type { LearnPrLabel } from '@/lib/learn/progress/progress.types';

const { learnedPage, lessonsPage, mergedPage, progressCounts, reposPage, zeroCounts } = fixtures;

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&#x27;', "'")
    .replaceAll('&quot;', '"')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' ')
    .trim();

const screen = (props: Partial<ProgressScreenProps> = {}) =>
  renderToStaticMarkup(
    <ProgressScreen
      view="lessons"
      page={1}
      counts={progressCounts}
      list={{ view: 'lessons', lessons: lessonsPage }}
      {...props}
    />,
  );

/** The rows' `data-state`, in order. */
const states = (html: string) => [...html.matchAll(/data-state="([^"]+)"/g)].map((match) => match[1]);

describe('Your progress', () => {
  it('heads the page with the way back, the title, its line and the four views with their counts', () => {
    const html = screen();
    expect(text(html)).toMatch(
      /^← Learn Your progress What you have learned so far, and where your fixes landed\. Lessons passed 7 New things learned 14 Repos helped 2 Pull requests merged 6/,
    );
    expect(html).toContain('href="/learn"');
    for (const href of [
      '/my/progress',
      '/my/progress?view=learned',
      '/my/progress?view=repos',
      '/my/progress?view=merged',
    ]) {
      expect(html).toContain(`href="${href}"`);
    }
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    expect(html).toMatch(/aria-current="page"[^>]*data-view="lessons"/);
    expect(screen({ view: 'merged', list: { view: 'merged', merged: mergedPage } })).toMatch(
      /aria-current="page"[^>]*data-view="merged"/,
    );
  });

  it('ends every view with the next lesson', () => {
    for (const props of [
      {},
      { view: 'learned', list: { view: 'learned', lessons: learnedPage } },
      { view: 'repos', list: { view: 'repos', repos: reposPage } },
      { view: 'merged', list: { view: 'merged', merged: mergedPage } },
    ] as Partial<ProgressScreenProps>[]) {
      const html = screen(props);
      expect(text(html)).toMatch(/Pick your next issue$/);
      expect(html).toMatch(/data-next-lesson=""[^>]*href="\/learn\/issues"/);
    }
  });

  it('never shows Contribute’s numbers or what needs the viewer', () => {
    const html = screen();
    expect(text(html)).not.toMatch(/Needs you|spent|\$\d/);
  });
});

describe('Lessons passed', () => {
  const html = screen();
  const plain = text(html);

  it('lists each lesson with its reference line, its kind, the real state of an own lesson’s pull request', () => {
    expect(plain).toContain('Lessons your agent wrote for your own pull requests, and practice lessons you took.');
    expect(states(html).slice(0, 7)).toEqual([
      'OPEN',
      'MERGED',
      'PRACTICE',
      'CLOSED',
      'MERGED',
      'PRACTICE',
      'PRACTICE',
    ]);
    expect(plain).toContain(
      'driftwood-js/driftwood Issue #934 ↗ (opens GitHub) PR #961 ↗ (opens GitHub) Your lesson Why a redirect dropped the route’s param types Passed Nov 12 · 3 new things learned Open Details',
    );
    expect(plain).toContain('harbor-io/harbor Issue #140 ↗ (opens GitHub) Practice Why the retry loop needed jitter');
    expect(html).toContain('data-pr-label="MERGED"');
    expect(html).toContain('data-pr-label="CLOSED"');
  });

  it('opens an own lesson’s Lesson view and its pull request’s page, a practice lesson’s page', () => {
    expect(html).toContain('href="/my/pull-requests/driftwood-js/driftwood/934/walkthrough"');
    expect(html).toMatch(/href="\/my\/pull-requests\/driftwood-js\/driftwood\/934"[^>]*>Details</);
    expect(html).toMatch(/href="\/learn\/lessons\/retry-backoff-jitter-2m9q"[^>]*>See the lesson</);
    // No primary button: the page has no main action.
    expect(html).not.toContain('data-variant="default"');
  });

  it('keeps a lesson taken down, its title plain, and says who took it down', () => {
    expect(plain).toContain(
      'Why nested layouts rebuilt on every navigation Passed Oct 28 · 2 new things learned · Taken down Merged Details',
    );
    expect(html).not.toContain('/my/pull-requests/driftwood-js/driftwood/871/walkthrough');
    expect(plain).toContain(
      'Why two all-day events overlapped by an hour Passed Oct 20 · 1 new thing learned · Its author took it down',
    );
    const row = html.slice(html.indexOf('Why two all-day events'));
    expect(row.slice(0, row.indexOf('</li>'))).not.toContain('<a');
  });

  it('says the total under the list, then Not finished on page 1', () => {
    expect(plain).toContain('1–7 of 7 lessons');
    expect(plain).toContain('Not finished · 2');
    expect(plain).toContain('Why the submit button stayed disabled Started Oct 22 · 2 of 5 steps passed Continue');
    expect(plain).toContain(
      'quill-md/quill Issue #188 ↗ (opens GitHub) Your lesson Escape pipes in table cells Ended Oct 12, before the lesson was written. No pull request. Ended Details',
    );
    expect(html).toMatch(/href="\/learn\/lessons\/submit-button-disabled-4t7n"[^>]*>Continue</);
    expect(html).toMatch(/href="\/my\/pull-requests\/quill-md\/quill\/188"[^>]*>Details</);
    expect(html.indexOf('1–7 of 7 lessons')).toBeLessThan(html.indexOf('Not finished'));
  });

  it('pages 20 a page, Not finished absent when empty', () => {
    const paged = screen({
      page: 2,
      list: { view: 'lessons', lessons: { items: lessonsPage.items, total: 143, notFinished: [] } },
    });
    expect(text(paged)).toContain('21–40 of 143 lessons');
    expect(paged).toContain('href="/my/progress?page=3"');
    expect(paged).toContain('href="/my/progress"');
    expect(paged).not.toContain('data-section="not-finished"');
  });
});

describe('New things learned', () => {
  const html = screen({ view: 'learned', list: { view: 'learned', lessons: learnedPage } });
  const plain = text(html);

  it('draws one card per lesson, a tile per new thing to its step', () => {
    expect(plain).toContain(
      'Each one is a lesson step you did not know before the lesson, and passed in it. Newest lesson first.',
    );
    expect(html.match(/data-learned-lesson=""/g)).toHaveLength(6);
    expect(plain).toContain(
      'Why a redirect dropped the route’s param types Passed Nov 12 · 3 new things learned 2 · Cause The redirect built its target from a plain string 3 · The fix The fix: carry the params type through redirect() 5 · Deep dive How a generic keeps a literal type',
    );
    expect(html).toContain('href="/my/pull-requests/driftwood-js/driftwood/934/walkthrough#step-s2"');
    expect(html).toContain('href="/learn/lessons/retry-backoff-jitter-2m9q#step-s5"');
    expect(plain).toContain('1–6 of 6 lessons');
  });

  it('draws a taken-down lesson’s tiles without links', () => {
    const card = html.slice(html.indexOf('Why nested layouts'));
    expect(card.slice(0, card.indexOf('</li></ul></li>'))).not.toContain('<a');
  });

  it('says so when no lesson taught a new thing', () => {
    const none = text(
      screen({
        view: 'learned',
        counts: { ...zeroCounts, lessonsPassed: 2 },
        list: { view: 'learned', lessons: { items: [], total: 0, notFinished: [] } },
      }),
    );
    expect(none).toContain(
      'You already knew what these lessons asked you first. A new thing shows here when a lesson teaches you one.',
    );
    expect(none).toMatch(/Pick your next issue$/);
  });
});

describe('Repos helped and Pull requests merged', () => {
  it('lists each repository, its first three pull requests and the rest to the merged view', () => {
    const html = screen({ view: 'repos', list: { view: 'repos', repos: reposPage } });
    const plain = text(html);
    expect(plain).toContain(
      'tidewave/tide (opens GitHub) 5 pull requests merged · last on Nov 9 PR #947 ↗ (opens GitHub) PR #922 ↗ (opens GitHub) PR #903 ↗ (opens GitHub) and 2 more',
    );
    expect(html).toContain('href="https://github.com/tidewave/tide"');
    expect(html).toMatch(/href="\/my\/progress\?view=merged"[^>]*>and 2 more</);
    expect(plain).toContain('driftwood-js/driftwood (opens GitHub) 1 pull request merged · last on Oct 30 PR #1419');
    expect(plain).not.toContain('and 0 more');
    expect(plain).toContain('1–2 of 2 repos');
  });

  it('lists each merged pull request, its issue’s title to its page, the lesson while it is there', () => {
    const html = screen({ view: 'merged', list: { view: 'merged', merged: mergedPage } });
    const plain = text(html);
    expect(plain).toContain(
      'tidewave/tide Issue #931 ↗ (opens GitHub) PR #947 ↗ (opens GitHub) Sidebar width resets after a reload Merged Nov 9 Lesson',
    );
    expect(html).toMatch(/href="\/my\/pull-requests\/tidewave\/tide\/931"[^>]*>Sidebar width resets/);
    expect(html).toMatch(/href="\/my\/pull-requests\/tidewave\/tide\/931\/walkthrough"[^>]*>Lesson</);
    expect(html.match(/>Lesson</g)).toHaveLength(1);
    expect(plain).toContain('1–6 of 6 pull requests');
  });

  it('says no pull request was merged yet, how many are open, and leads to Pull requests', () => {
    for (const view of ['merged', 'repos'] as const) {
      const list =
        view === 'merged' ? { view, merged: { items: [], total: 0 } } : { view, repos: { items: [], total: 0 } };
      const html = screen({ view, counts: { ...progressCounts, prsMerged: 0, reposHelped: 0 }, list, openPrs: 2 });
      expect(text(html)).toContain('No pull request of yours has been merged yet. 2 are open. Pull requests');
      expect(html).toMatch(/href="\/my\/pull-requests"[^>]*>Pull requests</);
      expect(text(screen({ view, counts: progressCounts, list, openPrs: 1 }))).toContain('1 is open.');
      expect(text(screen({ view, counts: progressCounts, list, openPrs: 0 }))).toContain(
        'No pull request of yours has been merged yet. Pull requests',
      );
    }
  });
});

describe('the states with nothing to list', () => {
  it('shows the four tabs at 0 and one way to a first lesson when nothing is passed', () => {
    const html = screen({ counts: zeroCounts, list: undefined });
    const plain = text(html);
    expect(plain).toContain('Lessons passed 0 New things learned 0 Repos helped 0 Pull requests merged 0');
    expect(plain).toContain(
      'No lessons yet Your agent fixes an issue you pick, and the fix walkthrough teaches what it used. See the issues',
    );
    expect(html).toMatch(/data-variant="default"[^>]*href="\/learn\/issues"[^>]*>See the issues/);
    // Its one next step: no second link to the same place.
    expect(html).not.toContain('data-next-lesson');
  });

  it('nothing passed, one practice lesson started: the card, then Not finished · 1 with Continue', () => {
    const started = { ...lessonsPage, items: [], total: 0, notFinished: [fixtures.notFinished[0]] };
    const html = screen({ counts: zeroCounts, list: { view: 'lessons', lessons: started } });
    const plain = text(html);
    expect(plain).toContain('No lessons yet');
    expect(plain).toContain('Not finished · 1');
    expect(plain).toContain('Why the submit button stayed disabled Started Oct 22 · 2 of 5 steps passed Continue');
    expect(html.indexOf('data-section="no-lessons"')).toBeLessThan(html.indexOf('data-section="not-finished"'));
    expect(html).toMatch(/href="\/learn\/lessons\/submit-button-disabled-4t7n"[^>]*>Continue</);
    // The card keeps the one primary step.
    expect(html.match(/data-variant="default"/g)).toHaveLength(1);
    expect(plain).not.toContain('of 0 lessons');
  });

  it('says the read failed, with the title alone', () => {
    const html = screen({ counts: undefined, list: undefined });
    expect(text(html)).toBe(
      '← Learn Your progress What you have learned so far, and where your fixes landed. Your progress is not available right now. Try again in a minute.',
    );
    const listFailed = screen({ list: undefined });
    expect(text(listFailed)).toContain('Lessons passed 7');
    expect(text(listFailed)).toContain('Your progress is not available right now. Try again in a minute.');
  });
});

describe('LearnLessonStatePill', () => {
  it.each([
    ['MERGED', 'Merged', 'bg-brand-soft'],
    ['CLOSED', 'Closed', 'bg-muted'],
    ['OPEN', 'Open', 'bg-positive/10'],
    ['OPENING', 'Opening', 'bg-positive/10'],
    ['READY', 'Ready to submit', 'bg-warning-soft'],
    ['REWRITING', 'Being rewritten', 'bg-muted'],
    ['ENDED', 'Ended', 'bg-muted'],
  ] as [LearnPrLabel, string, string][])('%s reads “%s”', (label, words, tone) => {
    const html = renderToStaticMarkup(<LearnLessonStatePill label={label} />);
    expect(text(html)).toBe(words);
    expect(html).toContain(tone);
  });
});

describe('the page’s reads and gate', () => {
  const open = { kind: 'open', entered: true, agents: { hosted: false, own: true } };
  const view = (search: Record<string, string> = {}) =>
    ProgressView({
      searchParams: Promise.resolve(search),
      shareUrlOf: (login) => `https://gitranks.com/profile/${login}/skills`,
    });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('answers not found to an account the workspace is hidden from', async () => {
    data.loadLearnProgress.mockResolvedValue({ counts: progressCounts });
    data.loadProgressList.mockResolvedValue({ view: 'lessons', lessons: lessonsPage });
    gate.loadWorkspaceGate.mockResolvedValue({ kind: 'hidden' });
    await expect(view()).rejects.toThrow('NEXT_NOT_FOUND');
    // The API's own "not for you" is a 404 too.
    gate.loadWorkspaceGate.mockResolvedValue(open);
    data.loadLearnProgress.mockResolvedValue(null);
    await expect(view()).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('sends an account not entered yet, and one being set up, to Contribute; leaves a visitor to the sign-in', async () => {
    data.loadLearnProgress.mockResolvedValue({ counts: progressCounts });
    gate.loadWorkspaceGate.mockResolvedValue({ ...open, entered: false });
    await expect(view()).rejects.toThrow('NEXT_REDIRECT /contribute');
    gate.loadWorkspaceGate.mockResolvedValue({ kind: 'setting-up' });
    await expect(view()).rejects.toThrow('NEXT_REDIRECT /contribute');
    gate.loadWorkspaceGate.mockResolvedValue({ kind: 'signed-out' });
    expect(await view()).toBeNull();
  });

  it('reads the view and the page the address names, and goes to the last page past it', async () => {
    gate.loadWorkspaceGate.mockResolvedValue(open);
    data.loadLearnProgress.mockResolvedValue({ counts: progressCounts });
    data.loadProgressList.mockResolvedValue({ view: 'merged', merged: mergedPage });
    const html = renderToStaticMarkup(await view({ view: 'merged', page: '1' }));
    expect(data.loadProgressList).toHaveBeenCalledWith('merged', 1);
    expect(html).toContain('data-progress="merged"');
    expect(contribute.loadPullRequestsPage).not.toHaveBeenCalled();
    await expect(view({ view: 'merged', page: '9' })).rejects.toThrow('NEXT_REDIRECT /my/progress?view=merged');
    data.loadProgressList.mockResolvedValue({ view: 'lessons', lessons: { ...lessonsPage, total: 143 } });
    await expect(view({ page: '12' })).rejects.toThrow('NEXT_REDIRECT /my/progress?page=8');
  });

  it('shows the way to a first lesson when nothing is passed, and the failure when the numbers do not load', async () => {
    gate.loadWorkspaceGate.mockResolvedValue(open);
    data.loadLearnProgress.mockResolvedValue({ counts: zeroCounts });
    data.loadProgressList.mockResolvedValue({ view: 'repos', repos: { items: [], total: 0 } });
    expect(renderToStaticMarkup(await view({ view: 'repos' }))).toContain('data-section="no-lessons"');
    expect(data.loadProgressList).toHaveBeenCalledWith('repos', 1);
    data.loadProgressList.mockResolvedValue({
      view: 'lessons',
      lessons: { items: [], total: 0, notFinished: fixtures.notFinished },
    });
    const first = renderToStaticMarkup(await view());
    expect(first).toContain('data-section="no-lessons"');
    expect(text(first)).toContain('Not finished · 2');
    data.loadLearnProgress.mockResolvedValue(undefined);
    expect(renderToStaticMarkup(await view())).toContain('data-progress="unavailable"');
  });

  it('counts the open Learn pull requests only when none was merged', async () => {
    gate.loadWorkspaceGate.mockResolvedValue(open);
    data.loadLearnProgress.mockResolvedValue({ counts: { ...progressCounts, prsMerged: 0, reposHelped: 0 } });
    data.loadProgressList.mockResolvedValue({ view: 'repos', repos: { items: [], total: 0 } });
    contribute.loadPullRequestsPage.mockResolvedValue({ items: [], totals: {}, total: 3 });
    const html = renderToStaticMarkup(await view({ view: 'repos' }));
    expect(contribute.loadPullRequestsPage).toHaveBeenCalledWith({ page: 1, state: 'OPEN', mode: 'LEARN' });
    expect(text(html)).toContain('3 are open.');
  });

  it('gives the Share control the viewer’s public link and what their public page counts', async () => {
    gate.loadWorkspaceGate.mockResolvedValue(open);
    data.loadLearnProgress.mockResolvedValue({
      counts: progressCounts,
      publicCounts: { ...progressCounts, lessonsPassed: 5 },
    });
    data.loadProgressList.mockResolvedValue({ view: 'lessons', lessons: lessonsPage });
    const html = renderToStaticMarkup(await view());
    expect(html).toContain('data-share="differ"');
    expect(text(html)).toContain('Your public page counts 5 lessons.');
  });
});

describe('Your progress: Share', () => {
  const share = (publicCounts: ProgressScreenProps['counts'] | null) =>
    screen({ share: { url: 'https://gitranks.com/profile/octocat/skills', publicCounts: publicCounts ?? null } });

  it('copies the public link when the public page counts as much as Your progress', () => {
    const html = share(progressCounts);
    expect(html).toContain('data-share="equal"');
    expect(text(html)).toContain('Share your progress');
    expect(text(html)).toContain('Copies your public link. Posted anywhere, it shows a card with your numbers.');
    expect(text(html)).not.toContain('Your public page counts');
  });

  it('says why the public page counts less', () => {
    const html = share({ ...progressCounts, lessonsPassed: 1, newThings: 2 });
    expect(html).toContain('data-share="differ"');
    expect(text(html)).toContain(
      'Your public page counts 1 lesson. A lesson is counted there once its pull request is open, and a practice lesson once you share your result.',
    );
  });

  it('names the count that differs: merged pull requests whose repository is no longer public', () => {
    const html = share({ ...progressCounts, prsMerged: progressCounts.prsMerged - 1, reposHelped: 1 });
    expect(html).toContain('data-share="differ"');
    expect(text(html)).not.toContain('lesson is counted there');
    expect(text(html)).toContain(
      `Your public page counts ${progressCounts.prsMerged - 1} pull requests merged in 1 repository. A merged pull request is counted there while its repository is public.`,
    );
    const learned = share({ ...progressCounts, newThings: 3 });
    expect(text(learned)).toContain(
      'Your public page counts 3 new things learned. It counts the new things of the results that are public.',
    );
  });

  it('offers no button before anything is public, and nothing before a first pass', () => {
    const none = share(null);
    expect(none).toContain('data-share="no-record"');
    expect(text(none)).toContain(
      'You can share once your first pull request opens, or after you share a practice result.',
    );
    expect(text(none)).not.toContain('Share your progress');
    const empty = screen({ counts: zeroCounts, list: undefined, share: { url: 'u', publicCounts: null } });
    expect(empty).not.toContain('data-share');
  });
});
