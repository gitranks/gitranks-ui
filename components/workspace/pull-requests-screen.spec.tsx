import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/my/pull-requests',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/lib/workspace/actions', () => ({}));

const { PullRequestsScreen, audienceOf } = await import('./pull-requests-screen');
const { boardItems, emptyPage, learnerPage, needsYouAnswer, pullRequestsPage } = await import(
  '@/lib/contribute/__fixtures__/pull-requests'
);

import type { PullRequestsData } from './pull-requests-screen';

const NOW = new Date('2026-10-28T12:00:00.000Z');
const BOTH = { contribute: true, learn: true };

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&#x27;', "'")
    .replaceAll('&quot;', '"')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' ')
    .trim();

const screen = (data: Partial<PullRequestsData> = {}) =>
  renderToStaticMarkup(
    <PullRequestsScreen
      sides={BOTH}
      learnOpen
      limit={{ count: 3, limit: 8, open: 3 }}
      needsYou={needsYouAnswer()}
      page={pullRequestsPage()}
      filter={{}}
      now={NOW}
      {...data}
    />,
  );

/** The view's primary buttons: one at most. */
const primaries = (html: string) => html.match(/max-sm:w-full bg-primary|data-variant="default"/g) ?? [];

describe('the Pull requests tab', () => {
  it('heads the page with the limit, then Needs you, In progress, the filters and the table, in order', () => {
    const html = screen();
    const plain = text(html);
    expect(plain).toMatch(/^Pull requests 3 of 8 open at a time · Change in Settings Needs you · 3/);
    expect(html).toContain('href="/my/agent/model#prs"');
    expect(html.indexOf('data-section="needs-you"')).toBeLessThan(html.indexOf('data-section="in-progress"'));
    expect(html.indexOf('data-section="in-progress"')).toBeLessThan(html.indexOf('aria-label="State"'));
    expect(html.indexOf('aria-label="State"')).toBeLessThan(html.indexOf('<table'));
    expect(plain).toContain('1–20 of 46 pull requests');
  });

  it('words each row from the API, the first row primary and the rest outline, every row by attempt', () => {
    const html = screen();
    const plain = text(html);
    expect(plain).toContain(
      'kelp-db/kelp Issue #1400 ↗ (opens GitHub) PR #1419 ↗ (opens GitHub) Changes requested Add a --json flag to kelp status Your move: A reviewer asked for changes. Start run 2 on them. Start run 2',
    );
    expect(plain).toContain(
      'driftwood-js/driftwood Issue #934 ↗ (opens GitHub) PR #961 ↗ (opens GitHub) Learn Changes requested Route params lose their type after a redirect Your move: A maintainer asked for a change. Your agent makes it; you read it and push. See what they asked',
    );
    expect(plain).toContain('Learn Lesson ready Dark mode toggle flashes on first load');
    expect(html).toContain('href="/my/pull-requests/by-attempt/A_TIDE?view=lesson"');
    expect(primaries(html)).toHaveLength(1);
    expect(plain).toContain('In progress · 1 driftwood-js/driftwood Issue #871');
    expect(plain).toContain(
      'Agent working Nested layouts re-render on every navigation Started 3 hours ago · $0.40 of $5 Details',
    );
  });

  it('counts the chips of the side the "Made with" filter picks, and keeps the filters in their links', () => {
    const all = text(screen());
    expect(all).toContain('All 46 Open 3 Merged 31 Closed 12');
    expect(all).toContain('Made with All Contribute Learn');
    const learn = screen({ filter: { made: 'learn' } });
    expect(text(learn)).toContain('All 4 Open 1 Merged 2 Closed 1');
    expect(learn).toContain('href="/my/pull-requests?state=open&amp;made=learn"');
    expect(learn).toContain('aria-current="true" class="inline-flex min-h-8');
  });

  it('shows who made each pull request, and a Learn one with its pill and its lesson', () => {
    const html = screen();
    const plain = text(html);
    expect(plain).toContain('Hosted agent · $3.12');
    expect(plain).toContain('Your own agent');
    expect(html).toMatch(/data-mode="LEARN"[\s\S]*?Learn[\s\S]*?Lesson/);
    expect(html).toContain('href="/my/pull-requests/by-attempt/A_DRIFT"');
  });

  it('pages 20 at a time, the page in the address and the filters kept', () => {
    const html = screen({ filter: { state: 'merged', page: 2 }, page: { ...pullRequestsPage(), total: 46 } });
    expect(text(html)).toContain('21–40 of 46 pull requests');
    expect(html).toContain('href="/my/pull-requests?state=merged"');
    expect(html).toContain('href="/my/pull-requests?state=merged&amp;page=3"');
  });
});

describe("the tab's states", () => {
  it('nothing yet: two ways to send the first one, Learn first unless the account uses Contribute alone', () => {
    const empty = { needsYou: needsYouAnswer({ items: [], inProgress: [], count: 0 }), page: emptyPage() };
    const both = screen({ ...empty, sides: null });
    expect(text(both)).toContain('Every pull request you send shows here, with what it needs from you.');
    expect(both).toContain('data-card="contribute"');
    expect(both).toMatch(/data-card="learn"[\s\S]*?data-variant="default"/);
    const contributor = screen({ ...empty, sides: { contribute: true, learn: false } });
    expect(contributor).toMatch(/data-card="contribute"[\s\S]*?data-variant="default"[\s\S]*?data-card="learn"/);
    const closed = screen({ ...empty, learnOpen: false });
    expect(closed).not.toContain('data-card="learn"');
    expect(text(closed)).toContain('Send your first one');
    expect(primaries(closed)).toHaveLength(1);
  });

  it('all quiet: no Needs you block, In progress if any, the table', () => {
    const html = screen({ needsYou: needsYouAnswer({ items: [], count: 0 }) });
    expect(html).not.toContain('data-section="needs-you"');
    expect(html).toContain('data-section="in-progress"');
    expect(html).toContain('<table');
  });

  it('a learner: no "Made with", the lesson in the last column', () => {
    const html = screen({
      sides: { contribute: false, learn: true },
      needsYou: needsYouAnswer({ items: [boardItems()[1]], inProgress: [], count: 1 }),
      page: learnerPage(),
    });
    expect(html).not.toContain('aria-label="Made with"');
    expect(text(html)).toContain('Pull request State Dates Lesson');
    expect(text(html)).toContain('Passed 5 of 5 Lesson');
  });

  it('a contributor, or Learn not open: no "Made with", no Learn pill in the table', () => {
    for (const data of [{ sides: { contribute: true, learn: false } }, { learnOpen: false }]) {
      const html = screen({ ...data, needsYou: needsYouAnswer({ items: [], inProgress: [], count: 0 }) });
      expect(html).not.toContain('aria-label="Made with"');
      expect(text(html)).toContain('Pull request State Dates Made with');
    }
    expect(audienceOf(null, true)).toBe('both');
    expect(audienceOf({ contribute: false, learn: false }, true)).toBe('both');
    expect(audienceOf({ contribute: false, learn: true }, false)).toBe('contributor');
  });

  it('a filter that matches nothing: says so, with the way back to all', () => {
    const html = screen({ filter: { state: 'closed' }, page: { ...emptyPage(), total: 0 } });
    expect(text(html)).toContain('No pull requests match. Show all');
  });

  it('the pull requests did not load: says so, and Needs you still shows', () => {
    const html = screen({ page: undefined });
    expect(text(html)).toContain("Your pull requests didn't load. Reload the page to try again.");
    expect(html).toContain('data-section="needs-you"');
  });

  it('Needs you did not load in full: the rows read, then the line to reload', () => {
    const html = screen({ needsYou: needsYouAnswer({ complete: false }) });
    expect(html).toContain('data-needs-incomplete');
    expect(text(html)).toContain("Some of what waits for you didn't load. Reload to see the rest.");
    const none = screen({ needsYou: needsYouAnswer({ items: [], count: 0, complete: false }) });
    expect(none).toContain('data-needs-incomplete');
  });

  it('Needs you not answered by the API: no block, the table as usual', () => {
    const html = screen({ needsYou: null });
    expect(html).not.toContain('data-section="needs-you"');
    expect(html).toContain('<table');
  });
});
