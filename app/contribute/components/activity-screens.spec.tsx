import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

let pathname = '/contribute/settings';
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  usePathname: () => pathname,
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/app/contribute/actions', () => ({ readContributeChanges: vi.fn() }));
vi.mock('@/components/navigation-progress/navigation-progress', () => ({ useReportPendingNavigation: () => {} }));

const { ActivityBarView } = await import('./activity');
const { ContributeTabsNav } = await import('./contribute-tabs-nav');

import type { ContributeActivity, ContributeActivityItem } from '@/lib/contribute/contribute.types';

const NOW = new Date('2026-10-31T12:04:00.000Z');
const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&#x27;', "'")
    .replaceAll('&quot;', '"')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' ');

const reads: ContributeActivityItem = {
  kind: 'FIRST_READS',
  tabs: ['ISSUES', 'SETTINGS'],
  label: 'Reading issues from 14 of 20 repos',
  done: 6,
  total: 20,
  startedAt: '2026-10-31T11:50:00.000Z',
  expectedAt: '2026-10-31T13:10:00.000Z',
  repos: [
    ...Array.from({ length: 6 }, (_, index) => ({
      repositoryId: `R_d${index}`,
      nameWithOwner: `acme/done-${index}`,
      stage: 'READ' as const,
    })),
    { repositoryId: 'R_r', nameWithOwner: 'acme/reading', stage: 'READING' },
    { repositoryId: 'R_s', nameWithOwner: 'acme/sorting', stage: 'SORTING' },
    ...Array.from({ length: 12 }, (_, index) => ({
      repositoryId: `R_q${index}`,
      nameWithOwner: `acme/queued-${index}`,
      stage: 'QUEUED' as const,
    })),
  ],
};
const resolve: ContributeActivityItem = {
  kind: 'STACK_RESOLVE',
  tabs: ['ISSUES', 'SETTINGS'],
  label: 'Working out the libraries your stack uses',
  done: null,
  total: null,
  startedAt: '2026-10-31T12:02:00.000Z',
  expectedAt: '2026-10-31T12:17:00.000Z',
  repos: [{ repositoryId: 'R_src', nameWithOwner: 'me/app', stage: 'READING' }],
};
const waiting: ContributeActivityItem = {
  kind: 'FIRST_READS_WAITING',
  tabs: ['ISSUES', 'SETTINGS'],
  label: '2 repos waiting their turn in the shared queue',
  done: 0,
  total: 2,
  startedAt: '2026-10-31T11:00:00.000Z',
  expectedAt: null,
  repos: [
    { repositoryId: 'R_w1', nameWithOwner: 'acme/w1', stage: 'WAITING' },
    { repositoryId: 'R_w2', nameWithOwner: 'acme/w2', stage: 'WAITING' },
  ],
};

describe('the activity bar', () => {
  it('says the work in one quiet line, with a progress line and an estimate, details closed', () => {
    const html = renderToStaticMarkup(<ActivityBarView items={[reads]} now={NOW} />);

    expect(html).toContain('data-activity-bar="running"');
    expect(text(html)).toContain('Reading issues from 14 of 20 repos');
    expect(text(html)).toContain('about 1 h');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('style="width:30%"');
    expect(html).not.toContain('acme/reading');
    // No vivid colours: the bar uses the card, the brand dot and muted text only.
    expect(html).not.toMatch(/warning|amber|negative/);
  });

  it('pulses only under motion-safe, so reduced motion keeps it still', () => {
    const html = renderToStaticMarkup(<ActivityBarView items={[resolve]} now={NOW} />);
    const animated = [...html.matchAll(/class="([^"]*animate-[^"]*)"/g)].map(([, classes]) => classes);

    expect(animated.length).toBeGreaterThan(0);
    for (const classes of animated) {
      for (const name of classes.split(' ').filter((name) => name.includes('animate-'))) {
        expect(name.startsWith('motion-safe:'), name).toBe(true);
      }
    }
  });

  it('opens on a click to each repo and where it is, eight at first', () => {
    const html = renderToStaticMarkup(<ActivityBarView items={[reads, waiting]} now={NOW} open />);

    expect(html).toContain('aria-expanded="true"');
    expect(text(html)).toContain('Reading issues from 14 of 20 repos · 1 more');
    expect(text(html)).toContain('6 of 20 done · done in about 1 h');
    expect(html).toMatch(/data-stage="READING"[^>]*>.*acme\/reading.*Reading issues/);
    expect(text(html)).toContain('acme/sorting Sorting issues');
    expect(text(html)).toContain('Show 12 more');
    expect(text(html)).toContain("We can't promise a time for them.");
    expect(text(html)).toContain('acme/w1 Waiting its turn');
  });

  it('explains the stack resolve, which cannot be counted: a sweep, not a share', () => {
    const html = renderToStaticMarkup(<ActivityBarView items={[resolve]} now={NOW} open />);

    expect(text(html)).toContain('It usually takes a minute or two, at most 15.');
    expect(html).toContain('animate-navigation-progress');
    expect(html).not.toMatch(/style="width/);
  });

  it('says the user can leave right after they started something', () => {
    expect(text(renderToStaticMarkup(<ActivityBarView items={[reads]} announced />))).toContain(
      'you can leave this page',
    );
    expect(text(renderToStaticMarkup(<ActivityBarView items={[reads]} />))).not.toContain('leave this page');
  });

  it('shows a wait still, with no estimate', () => {
    const html = renderToStaticMarkup(<ActivityBarView items={[waiting]} now={NOW} />);

    expect(html).toContain('data-activity-bar="waiting"');
    expect(html).not.toContain('animate-');
    expect(text(html)).not.toContain('about');
  });
});

describe('the tabs with work in progress', () => {
  const activity: ContributeActivity = { items: [reads], readAt: NOW.toISOString() };

  it('dots the tabs the work belongs to, and shows the bar on them', () => {
    pathname = '/contribute/settings';
    const html = renderToStaticMarkup(<ContributeTabsNav onboarded activity={activity} />);

    expect(html).toContain('data-activity-dot="ISSUES"');
    expect(html).toContain('data-activity-dot="SETTINGS"');
    expect(html).not.toContain('data-activity-dot="OVERVIEW"');
    expect(text(html)).toContain('Settings (working)');
    expect(html).toContain('data-activity-bar');
  });

  it('shows no bar on a tab the work does not belong to, nor without work', () => {
    pathname = '/contribute/me';
    expect(renderToStaticMarkup(<ContributeTabsNav onboarded activity={activity} />)).not.toContain(
      'data-activity-bar',
    );
    pathname = '/contribute/issues';
    const quiet = renderToStaticMarkup(<ContributeTabsNav onboarded activity={{ items: [], readAt: '' }} />);
    expect(quiet).not.toContain('data-activity');
  });
});
