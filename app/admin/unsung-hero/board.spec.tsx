import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import {
  boardOf,
  CHECKED,
  HELD,
  LIVE,
  liveCheckOf,
  NO_RECEIPT,
  NOT_TOLD,
  PAST,
  SHORTLIST_WITH_SLOTS,
  slotOf,
} from './__fixtures__/board';
import { HERO_REFUSALS } from './admin.types';
import {
  cancelReasonText,
  cancelStateOf,
  headsUpLine,
  markableOf,
  markNotifiedConfirm,
  REFUSAL_TEXT,
  recapLine,
  skipConfirm,
  takenTag,
  weekShort,
} from './admin-copy';
import { isoWeekOf, weekOptionsOf } from './admin-weeks';

vi.mock('server-only', () => ({}));

const { AdminBoard } = await import('./components/admin-board');
const { CheckFacts, HeadsUpPreview } = await import('./components/schedule-dialog');
const { SlotActions } = await import('./components/slot-parts');
const { OptOutsTable, PastTable } = await import('./components/past');
const { slotsByRepoOf } = await import('./components/shortlist');

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&#x27;', "'")
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replace(/\s+/g, ' ')
    .trim();
const render = (element: React.ReactElement) => text(renderToStaticMarkup(element));

describe('the slot states', () => {
  it('Cancel: only before its heads-up left (or while held)', () => {
    expect(cancelStateOf(NOT_TOLD)).toEqual({ kind: 'cancellable' });
    expect(cancelStateOf(HELD)).toEqual({ kind: 'cancellable' });
    expect(cancelStateOf(NO_RECEIPT)).toMatchObject({
      kind: 'locked',
      why: expect.stringContaining('may have reached'),
    });
    expect(cancelStateOf(slotOf({ status: 'NOTIFIED' }))).toMatchObject({
      kind: 'locked',
      why: expect.stringContaining('the maintainer was told'),
    });
    expect(cancelStateOf(LIVE)).toMatchObject({ kind: 'locked' });
    expect(cancelStateOf(slotOf({ status: 'DONE' }))).toEqual({ kind: 'none' });
    expect(cancelStateOf(slotOf({ status: 'CANCELLED' }))).toEqual({ kind: 'none' });
    expect(cancelStateOf(slotOf({ status: 'OPTED_OUT' }))).toEqual({ kind: 'none' });
  });

  it('Cancel: a slot with no heads-up until its week ends, live included (nobody was told)', () => {
    for (const status of ['SCHEDULED', 'LIVE'] as const) {
      expect(cancelStateOf(slotOf({ status, noHeadsUp: true, headsUp: null }))).toEqual({ kind: 'cancellable' });
    }
    expect(cancelStateOf(slotOf({ status: 'DONE', noHeadsUp: true, headsUp: null }))).toEqual({ kind: 'none' });
    expect(cancelStateOf(slotOf({ status: 'NOTIFIED', noHeadsUp: true, headsUp: null }))).toMatchObject({
      kind: 'locked',
    });
  });

  it('a slot with no heads-up says so, in the weeks and the past', () => {
    expect(headsUpLine(slotOf({ status: 'SCHEDULED', noHeadsUp: true, headsUp: null }))).toEqual({
      text: 'No heads-up: the maintainer gets no email before the week',
      tone: 'neutral',
    });
    for (const status of ['LIVE', 'DONE', 'CANCELLED'] as const) {
      expect(headsUpLine(slotOf({ status, noHeadsUp: true, headsUp: null }))?.text).toBe('No heads-up was sent');
    }
  });

  it('Mark notified: a scheduled slot whose heads-up has no receipt', () => {
    expect(markableOf(NO_RECEIPT)).toBe(true);
    expect(markableOf(HELD)).toBe(false);
    expect(markableOf(NOT_TOLD)).toBe(false);
    expect(markableOf(LIVE)).toBe(false);
  });

  it('says where each heads-up stands', () => {
    expect(headsUpLine(NOT_TOLD)).toEqual({
      text: 'Heads-up not sent yet: it goes out from Wed, Nov 4, 23:00 UTC',
      tone: 'neutral',
    });
    expect(headsUpLine(HELD)).toEqual({
      text: 'Heads-up held: the address may not receive this email yet',
      tone: 'amber',
    });
    expect(headsUpLine(NO_RECEIPT)).toEqual({
      text: 'No receipt: heads-up queued Wed, Oct 28, 05:10 UTC, neither sent nor held',
      tone: 'amber',
    });
    expect(headsUpLine(LIVE)?.text).toBe('Heads-up sent Wed, Oct 21, 23:11 UTC');
    expect(
      headsUpLine(
        slotOf({ headsUp: { ...NO_RECEIPT.headsUp!, sentAt: '2026-10-28T19:00:00.000Z', markedBy: 'octocat' } }),
      )?.text,
    ).toBe('Heads-up sent Wed, Oct 28, 19:00 UTC, marked by octocat');
    expect(
      headsUpLine(
        slotOf({ headsUp: { ...NO_RECEIPT.headsUp!, queuedAt: '2026-10-28T11:10:00.000Z', noReceipt: false } }),
      )?.text,
    ).toBe('Heads-up queued Wed, Oct 28, 11:10 UTC, waiting for its receipt');
    expect(recapLine(PAST[0])?.text).toBe('Recap sent Mon, Oct 26, 00:11 UTC');
  });

  it('has words for every refusal and every cancel reason', () => {
    for (const refusal of HERO_REFUSALS) expect(REFUSAL_TEXT[refusal]).toMatch(/\.$/);
    expect(cancelReasonText('owner_changed')).toBe('The repository belonged to another account at the heads-up');
    expect(cancelReasonText('not_live')).toBe('The week ended before GitHub’s star count could be read');
    expect(cancelReasonText('something_new')).toBe('Cancelled (something_new)');
  });

  it('names a week by its days', () => {
    expect(weekShort(NO_RECEIPT)).toBe('Nov 2 – 8');
    expect(weekShort({ startsAt: '2026-11-30T00:00:00.000Z', endsAt: '2026-12-07T00:00:00.000Z' })).toBe(
      'Nov 30 – Dec 6',
    );
  });
});

describe('the weeks Schedule offers', () => {
  it('counts ISO weeks across a year’s end', () => {
    expect(isoWeekOf(new Date('2026-11-02T00:00:00Z'))).toBe('2026-W45');
    expect(isoWeekOf(new Date('2026-12-28T00:00:00Z'))).toBe('2026-W53');
    expect(isoWeekOf(new Date('2027-01-04T00:00:00Z'))).toBe('2027-W01');
  });

  it('starts at the first open week and marks the weeks a slot of the same kind holds', () => {
    const options = weekOptionsOf(boardOf());
    expect(options.slice(0, 4).map(({ week, taken }) => [week, taken])).toEqual([
      ['2026-W45', true],
      ['2026-W46', true],
      ['2026-W47', true],
      ['2026-W48', false],
    ]);
    expect(options[3].label).toBe('Nov 23 – 29 (2026-W48)');
  });

  it('with no heads-up, starts at next week even once scheduling with it has closed', () => {
    // Thursday: next week (W45) is inside the heads-up's 97 hours, so with it the first open week is W46.
    const board = boardOf({
      upcoming: [],
      live: [],
      nextWeek: {
        week: '2026-W45',
        startsAt: '2026-11-02T00:00:00.000Z',
        endsAt: '2026-11-09T00:00:00.000Z',
        closesAt: '2026-10-28T23:00:00.000Z',
      },
      firstOpenWeek: {
        week: '2026-W46',
        startsAt: '2026-11-09T00:00:00.000Z',
        endsAt: '2026-11-16T00:00:00.000Z',
        closesAt: '2026-11-04T23:00:00.000Z',
      },
    });
    expect(weekOptionsOf(board)[0].week).toBe('2026-W46');
    const off = weekOptionsOf(board, { headsUp: false });
    expect(off.slice(0, 2).map(({ week, label }) => [week, label])).toEqual([
      ['2026-W45', 'Nov 2 – 8 (2026-W45)'],
      ['2026-W46', 'Nov 9 – 15 (2026-W46)'],
    ]);
    // Through the same last week: a week picked with the heads-up is still there with none.
    expect(off).toHaveLength(9);
    expect(off.at(-1)?.week).toBe(weekOptionsOf(board).at(-1)?.week);
    // Before the cutoff both start at next week.
    expect(weekOptionsOf(boardOf(), { headsUp: false })).toEqual(weekOptionsOf(boardOf()));
  });
});

describe('the board', () => {
  const html = renderToStaticMarkup(<AdminBoard state={{ board: boardOf(), notice: null, check: null }} />);
  const page = text(html);

  it('shows the live and next weeks, every slot with its state, and the shortlist with its labels', () => {
    for (const words of [
      'Live',
      'mona/scroll-guard',
      '+69 stars since Monday',
      'Next',
      'octo-dev/static-copy',
      'Scheduled',
      'Heads-up held: the address may not receive this email yet',
      'No receipt: heads-up queued',
      'hubot/size-watch',
      '1,745 stars (over 1,000)',
      'No public email',
      'Owner: 747 followers (over 500)',
      'Checked Wed, Oct 28, 11:55 UTC: nothing stops Schedule (the week aside).',
      'Built Tue, Oct 27, 03:04 UTC.',
    ]) {
      expect(page).toContain(words);
    }
  });

  it('asks before Skip and Mark notified, naming the repository and what cannot be undone', () => {
    expect(skipConfirm('hubot/size-watch')).toEqual({
      title: 'Skip hubot/size-watch?',
      description:
        'It will not be listed again, on this shortlist or any later one. This cannot be undone from this page.',
      confirm: 'Skip it',
    });
    expect(markNotifiedConfirm('octo-dev/static-copy')).toEqual({
      title: 'Mark the heads-up of octo-dev/static-copy as sent?',
      description:
        'Check the mailbox’s Sent folder first. The slot becomes “Maintainer told” and can no longer be cancelled. This cannot be undone.',
      confirm: 'Mark as sent',
    });
  });

  it('offers Mark notified on the heads-up with no receipt alone, and says why a locked slot cannot be cancelled', () => {
    expect(page.match(/Mark notified/g)).toHaveLength(1);
    expect(page).toContain('Check the mailbox’s Sent folder first');
    expect(page).toContain('Locked: the heads-up has left and may have reached the maintainer.');
    expect(page).toContain('Locked: the maintainer was told.');
  });

  it('turns Cancel off on a locked slot, on for one nobody was told about', () => {
    const cancelOf = (slot: typeof NOT_TOLD) => renderToStaticMarkup(<SlotActions slot={slot} />);
    expect(cancelOf(NO_RECEIPT)).toMatch(/<button[^>]*disabled=""[^>]*>Cancel<\/button>/);
    expect(cancelOf(LIVE)).toMatch(/<button[^>]*disabled=""[^>]*>Cancel<\/button>/);
    expect(cancelOf(NOT_TOLD)).toMatch(/<button(?![^>]*disabled="")[^>]*>Cancel<\/button>/);
    expect(cancelOf(NOT_TOLD)).toContain(`name="id" value="${NOT_TOLD.id}"`);
    expect(cancelOf(slotOf({ status: 'DONE' }))).toBe('');
  });

  it('shows the past weeks with how each went or why it ended, and the opt-outs', () => {
    const past = render(<PastTable past={PAST} />);
    expect(past).toContain('octo-dev/number-check number-check Done Heads-up sent');
    expect(past).toContain('Recap sent Mon, Oct 26, 00:11 UTC 98.8M 290 +26 318 1,204 356');
    expect(past).toContain('Cancelled The repository belonged to another account at the heads-up');
    expect(past).toContain('Opted out Opted out Fri, Oct 9, 08:00 UTC');
    // A week that ended cannot be cancelled.
    expect(past).not.toMatch(/Cancel(?!led)/);
    expect(render(<OptOutsTable optOuts={boardOf().optOuts} />)).toBe('Maintainer Opted out example-dev Oct 9');
  });

  it('says what the last press did; a refusal in its own words', () => {
    const notice = { intent: 'cancel', tone: 'refused', text: REFUSAL_TEXT.NOT_CANCELLABLE } as const;
    expect(render(<AdminBoard state={{ board: boardOf(), notice, check: null }} />)).toContain(
      REFUSAL_TEXT.NOT_CANCELLABLE,
    );
  });

  it('tags a candidate that has a slot with its state and week, without Skip, and with Schedule off', () => {
    const board = boardOf({ shortlist: SHORTLIST_WITH_SLOTS });
    const markup = renderToStaticMarkup(<AdminBoard state={{ board, notice: null, check: null }} />);
    const shortlist = text(markup.slice(markup.indexOf('Candidate')));
    expect(shortlist).toContain('mona/scroll-guard scroll-guard Live · Oct 26 – Nov 1 942');
    expect(shortlist).toContain('mona/hide-rest hide-rest Scheduled · Nov 9 – 15 942');
    // A cancelled slot leaves its repository open again.
    expect(shortlist).toContain('hubot/micro-queue micro-queue 942 98.8M — 120 Jan 2023 Skip Schedule');
    expect(shortlist.match(/Skip/g)).toHaveLength(3);
    const schedule = markup.slice(markup.indexOf('Candidate')).match(/<button[^>]*>Schedule<\/button>/g) ?? [];
    expect(schedule.filter((button) => button.includes('disabled=""'))).toHaveLength(2);
    expect(schedule).toHaveLength(5);
    // The tag says why Schedule is off.
    expect(markup).toContain(`aria-describedby="slot-of-${NOT_TOLD.repo.githubId}"`);
    expect(markup).toContain(`id="slot-of-${NOT_TOLD.repo.githubId}"`);
  });

  it('names a slot on the shortlist by its state: scheduled, live, featured, opted out', () => {
    expect(takenTag(NOT_TOLD)).toBe('Scheduled · Nov 9 – 15');
    expect(takenTag({ ...NO_RECEIPT, status: 'NOTIFIED' })).toBe('Scheduled · Nov 2 – 8');
    expect(takenTag(LIVE)).toBe('Live · Oct 26 – Nov 1');
    expect(takenTag(PAST[0])).toBe('Featured · Oct 19 – 25');
    expect(takenTag(PAST[2])).toBe('Opted out · Oct 5 – 11');
    expect(slotsByRepoOf(PAST).has(PAST[1].repo.githubId)).toBe(false);
    // The live slot wins over an older one of the same repository.
    expect(slotsByRepoOf([LIVE, PAST[3]]).get(LIVE.repo.githubId)?.status).toBe('LIVE');
  });

  it('with nobody next week, asks for one by the day scheduling closes', () => {
    const board = boardOf({ live: [], upcoming: [] });
    const empty = render(<AdminBoard state={{ board, notice: null, check: null }} />);
    expect(empty).toContain('Pick from the shortlist');
    expect(empty).toContain(
      'Schedule one by Oct 28 so the maintainer gets 4 days to opt out, or with no heads-up until the week starts.',
    );
    expect(empty).toContain('No hero this week');
  });
});

describe('the Schedule dialog’s parts', () => {
  it('shows the heads-up as it will read, greeting the maintainer by the first name the check read', () => {
    const preview = render(
      <HeadsUpPreview
        candidate={CHECKED}
        check={liveCheckOf()}
        startsAt="2026-11-23T00:00:00.000Z"
        reason="inside @example/dialog"
      />,
    );
    expect(preview).toContain('ref-hook is our Unsung hero next week');
    expect(preview).toContain('Hi Mona,');
    expect(preview).toContain('From Monday, November 23, GitRanks will feature ref-hook on its home page for a week');
    expect(preview).toContain('93M downloads a week, inside @example/dialog, and 312 stars.');

    const noReason = render(
      <HeadsUpPreview candidate={CHECKED} check={liveCheckOf({ firstName: null })} startsAt={null} reason=" " />,
    );
    expect(noReason).toContain('Hi mona,');
    expect(noReason).toContain('93M downloads a week and 312 stars.');
  });

  it('lists what the check read; a repository GitHub no longer shows says so', () => {
    const facts = render(<CheckFacts check={liveCheckOf({ advisories: ['GHSA-xxxx-yyyy-zzzz'], linked: false })} />);
    expect(facts).toContain('Open: GHSA-xxxx-yyyy-zzzz');
    expect(facts).toContain('GitHub links the package No');
    expect(render(<CheckFacts check={liveCheckOf({ outcome: 'MISSING' })} />)).toBe(REFUSAL_TEXT.REPOSITORY_GONE);
  });
});
