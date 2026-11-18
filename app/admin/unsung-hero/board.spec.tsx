import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { boardOf, CHECKED, HELD, LIVE, liveCheckOf, NO_RECEIPT, NOT_TOLD, PAST, slotOf } from './__fixtures__/board';
import { HERO_REFUSALS } from './admin.types';
import {
  cancelReasonText,
  cancelStateOf,
  headsUpLine,
  markableOf,
  REFUSAL_TEXT,
  recapLine,
  weekShort,
} from './admin-copy';
import { isoWeekOf, weekOptionsOf } from './admin-weeks';

vi.mock('server-only', () => ({}));

const { AdminBoard } = await import('./components/admin-board');
const { CheckFacts, HeadsUpPreview } = await import('./components/schedule-dialog');
const { SlotActions } = await import('./components/slot-parts');
const { OptOutsTable, PastTable } = await import('./components/past');

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
  it('Cancel: a real slot only before its heads-up left (or while held); a preview until it ends', () => {
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

    for (const status of ['SCHEDULED', 'NOTIFIED', 'LIVE', 'DONE'] as const) {
      expect(cancelStateOf(slotOf({ status, preview: true }))).toEqual({ kind: 'cancellable' });
    }
    expect(cancelStateOf(slotOf({ status: 'OPTED_OUT', preview: true }))).toEqual({ kind: 'none' });
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
    // A preview holds no real week, and the other way round.
    expect(weekOptionsOf(boardOf({ preview: true }))[0].taken).toBe(false);
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
    // A preview that ran can still be cancelled; a real week that ended cannot.
    expect(past.match(/Cancel(?!led)/g)).toHaveLength(1);
    expect(render(<OptOutsTable optOuts={boardOf().optOuts} />)).toBe('Maintainer Opted out example-dev Oct 9');
  });

  it('says what the last press did; a refusal in its own words', () => {
    const notice = { intent: 'cancel', tone: 'refused', text: REFUSAL_TEXT.NOT_CANCELLABLE } as const;
    expect(render(<AdminBoard state={{ board: boardOf(), notice, check: null }} />)).toContain(
      REFUSAL_TEXT.NOT_CANCELLABLE,
    );
  });

  it('says before launch that a slot scheduled now is a preview', () => {
    expect(render(<AdminBoard state={{ board: boardOf({ preview: true }), notice: null, check: null }} />)).toContain(
      'every slot scheduled now is a preview. Both its emails go to you',
    );
  });

  it('with nobody next week, asks for one by the day scheduling closes', () => {
    const board = boardOf({ live: [], upcoming: [] });
    const empty = render(<AdminBoard state={{ board, notice: null, check: null }} />);
    expect(empty).toContain('Pick from the shortlist');
    expect(empty).toContain('Schedule one by Oct 28 so the maintainer gets 4 days to opt out.');
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
