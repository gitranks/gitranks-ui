import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { APPLICATIONS, boardWithApplications } from '../__fixtures__/board';
import { applicationSlotTag } from '../admin-copy';

vi.mock('server-only', () => ({}));

const { AdminBoard } = await import('./admin-board');
const { ApplicationsTable, scheduleSubjectOf } = await import('./applications');

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&#x27;', "'")
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replace(/\s+/g, ' ')
    .trim();

const COUNTS = { inReview: 4, scheduled: 1, notPicked: 11 };

describe('the Applications tab', () => {
  it('sits beside the Shortlist with the count in review, and has no Cancelled tab', () => {
    const html = renderToStaticMarkup(
      <AdminBoard state={{ board: boardWithApplications(), notice: null, check: null }} tab="applications" />,
    );
    const words = text(html);
    expect(words).toContain('Shortlist Applications 4 Past heroes Opt-outs');
    expect(words).toContain('In review 4 Scheduled 1 Not picked 11');
    expect(words).not.toContain('Cancelled ·');
  });

  it('in review, oldest first: what each is for, who sent it, labels and numbers, Not picked and Schedule', () => {
    const html = renderToStaticMarkup(<ApplicationsTable applications={APPLICATIONS} counts={COUNTS} />);
    const rows = [...html.matchAll(/<tr class="border-b[^"]*">([\s\S]*?)<\/tr>/g)].map(([, row]) => text(row));
    expect(rows[0]).toContain('“left-padder” nominated by monalisa · Sun, Oct 25, 07:55 UTC Package not found');
    expect(rows[1]).toContain('mona/tidy-env PyPI tidy-env · by mona, the owner');
    expect(rows[1]).toContain('Not heavily used yet (310K a month, under PyPI’s line) 1,240 stars (over 1,000)');
    expect(rows[1]).toContain('1,240 310K a month 96 240');
    expect(rows[2]).toContain('diff-tools/fast-diff npm fast-diff · nominated by hubot');
    expect(rows[2]).toContain('Typed: https://www.npmjs.com/package/fast-diff');
    expect(rows[3]).toContain('octocat/tiny-clamp npm tiny-clamp · by octocat, the owner');
    expect(rows[3]).toContain('Meets the rules');
    expect(rows[3]).toContain('412 2.4M a week 1,920 128 Not picked Schedule');
  });

  it('Schedule is off for a nomination we could not find', () => {
    const html = renderToStaticMarkup(<ApplicationsTable applications={APPLICATIONS} counts={COUNTS} />);
    const first = /<tr class="border-b[^"]*">([\s\S]*?)<\/tr>/.exec(html)?.[1] ?? '';
    expect(first).toMatch(/<button[^>]*disabled=""[^>]*>Schedule<\/button>/);
    expect(scheduleSubjectOf(APPLICATIONS.inReview[0])).toBeNull();
  });

  it('scheduled and not picked rows have no actions; a scheduled one shows its slot', () => {
    expect(
      text(
        renderToStaticMarkup(
          <ApplicationsTable applications={{ inReview: [], scheduled: [], notPicked: [] }} counts={COUNTS} />,
        ),
      ),
    ).toContain('No applications in review.');
    // The first tab is drawn on the server: the rows of the other two, drawn there.
    const html = renderToStaticMarkup(
      <ApplicationsTable
        applications={{
          inReview: [...APPLICATIONS.scheduled, ...APPLICATIONS.notPicked],
          scheduled: [],
          notPicked: [],
        }}
        counts={COUNTS}
      />,
    );
    const words = text(html);
    expect(applicationSlotTag(APPLICATIONS.scheduled[0].slot!)).toBe('Scheduled · Nov 9 – 15');
    expect(words).toContain('Scheduled · Nov 9 – 15');
    expect(words).toContain('Not picked Mon, Oct 19, 08:30 UTC by octocat');
    expect(words).not.toContain('Schedule Not picked');
  });

  it('an application as the Schedule dialog takes it: its repository, package, numbers and labels', () => {
    const subject = scheduleSubjectOf(APPLICATIONS.inReview[2]);
    expect(subject).toMatchObject({
      repo: { githubId: '310442212', nameWithOwner: 'diff-tools/fast-diff' },
      package: { registry: 'NPM', name: 'fast-diff' },
      downloads: 3_100_000,
      stars: 640,
      owner: { login: 'diff-tools', type: 'Organization', hasEmail: false },
      misses: [{ code: 'ORGANIZATION', label: 'Owner is an organization', blocks: false }],
      liveCheck: null,
    });
  });
});
