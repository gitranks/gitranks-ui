import { beforeEach, describe, expect, it, vi } from 'vitest';

import { answerBy, jsonResponse, NOT_FOUND_ANSWER, sentOf } from './__fixtures__/api';
import { boardOf, CHECKED, liveCheckOf, NO_RECEIPT, NOT_TOLD, slotOf } from './__fixtures__/board';
import type { HeroBoard } from './admin.types';
import { REFUSAL_TEXT } from './admin-copy';
import type { AdminState } from './admin-state';

const { auth, signedFetch } = vi.hoisted(() => ({ auth: vi.fn(), signedFetch: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/auth', () => ({ auth }));
vi.mock('@/lib/signed-fetch', () => ({ signedFetch }));

const { pressAdmin } = await import('./actions');

const ADMIN = { user: { githubLogin: 'octocat', email: 'octocat@example.com' } };
const BEFORE: AdminState = { board: boardOf(), notice: null, check: null };
/** The board the API answers after a press: one row fewer. */
const AFTER: HeroBoard = boardOf({ shortlist: [CHECKED] });

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
};

const answers = (operation: string, field: string, value: unknown) =>
  answerBy(signedFetch, {
    [operation]: () => jsonResponse({ data: { [field]: value } }),
    UnsungHeroAdmin: () => jsonResponse({ data: { unsungHeroAdmin: AFTER } }),
  });

const operations = () => sentOf(signedFetch).map(({ operation }) => operation);

beforeEach(() => {
  auth.mockReset().mockResolvedValue(ADMIN);
  signedFetch.mockReset();
});

describe('Skip', () => {
  const skip = form({ intent: 'skip', repoGithubId: '92718271' });

  it('skips the candidate as the signed-in admin, then answers the board as it now is', async () => {
    answers('UnsungHeroSkip', 'unsungHeroSkip', { ok: true, refusal: null, slot: null });
    const state = await pressAdmin(BEFORE, skip);

    expect(sentOf(signedFetch)).toEqual([
      {
        operation: 'UnsungHeroSkip',
        variables: { repoGithubId: '92718271' },
        source: 'client',
        githubLogin: 'octocat',
        accountEmail: 'octocat@example.com',
      },
      expect.objectContaining({ operation: 'UnsungHeroAdmin', source: 'client' }),
    ]);
    expect(state.board).toEqual(AFTER);
    expect(state.notice).toEqual({
      intent: 'skip',
      tone: 'done',
      text: 'Skipped hubot/size-watch: it is not listed again.',
    });
  });

  it('says why a skip was refused', async () => {
    answers('UnsungHeroSkip', 'unsungHeroSkip', { ok: false, refusal: 'NOT_ON_SHORTLIST', slot: null });
    const state = await pressAdmin(BEFORE, skip);
    expect(state.notice).toEqual({ intent: 'skip', tone: 'refused', text: REFUSAL_TEXT.NOT_ON_SHORTLIST });
    expect(state.board).toEqual(AFTER);
  });
});

describe('Live check', () => {
  it("reads the candidate's package now and keeps the answer, the maintainer's first name with it", async () => {
    const check = liveCheckOf();
    answers('UnsungHeroLiveCheck', 'unsungHeroLiveCheck', { refusal: null, check });
    const state = await pressAdmin(
      BEFORE,
      form({ intent: 'live-check', repoGithubId: '149283910', packageName: ' ref-hook ' }),
    );

    expect(sentOf(signedFetch)[0]).toMatchObject({
      operation: 'UnsungHeroLiveCheck',
      variables: { repoGithubId: '149283910', packageName: 'ref-hook' },
    });
    expect(state.check).toEqual({ repoGithubId: '149283910', check, refusal: null });
    expect(state.notice).toMatchObject({ intent: 'live-check', tone: 'done' });
  });

  it('asks for the listed package when none is named, and says why nothing was read', async () => {
    answers('UnsungHeroLiveCheck', 'unsungHeroLiveCheck', { refusal: 'OTHER_PACKAGE', check: null });
    const state = await pressAdmin(BEFORE, form({ intent: 'live-check', repoGithubId: '149283910', packageName: '' }));
    expect(sentOf(signedFetch)[0].variables).toEqual({ repoGithubId: '149283910', packageName: null });
    expect(state.check).toEqual({ repoGithubId: '149283910', check: null, refusal: 'OTHER_PACKAGE' });
    expect(state.notice).toEqual({ intent: 'live-check', tone: 'refused', text: REFUSAL_TEXT.OTHER_PACKAGE });
  });
});

describe('Schedule', () => {
  const press = form({
    intent: 'schedule',
    repoGithubId: '149283910',
    week: '2026-W45',
    name: 'ref-hook',
    line: 'Ships inside @example/dialog',
    reason: '  ',
    text: 'Keeps a ref current.',
  });

  it('schedules with the words as written, a blank reason as none, and the session’s email beside the login', async () => {
    const slot = slotOf({
      id: 'a1',
      status: 'SCHEDULED',
      week: '2026-W45',
      startsAt: '2026-11-02T00:00:00.000Z',
      endsAt: '2026-11-09T00:00:00.000Z',
    });
    answers('UnsungHeroSchedule', 'unsungHeroSchedule', { ok: true, refusal: null, slot });
    const state = await pressAdmin(BEFORE, press);

    expect(sentOf(signedFetch)[0]).toEqual({
      operation: 'UnsungHeroSchedule',
      variables: {
        input: {
          repoGithubId: '149283910',
          week: '2026-W45',
          registry: 'NPM',
          name: 'ref-hook',
          line: 'Ships inside @example/dialog',
          reason: null,
          text: 'Keeps a ref current.',
        },
      },
      source: 'client',
      githubLogin: 'octocat',
      accountEmail: 'octocat@example.com',
    });
    expect(state.notice?.text).toBe(
      'Scheduled mona/scroll-guard for Nov 2 – 8. The heads-up goes to the maintainer 4 days before.',
    );
  });

  it('says a preview’s emails go to the admin', async () => {
    const slot = slotOf({
      preview: true,
      week: '2026-W45',
      startsAt: '2026-11-02T00:00:00.000Z',
      endsAt: '2026-11-09T00:00:00.000Z',
    });
    answers('UnsungHeroSchedule', 'unsungHeroSchedule', { ok: true, refusal: null, slot });
    expect((await pressAdmin(BEFORE, press)).notice?.text).toBe(
      'Scheduled mona/scroll-guard for Nov 2 – 8 as a preview: both emails go to you.',
    );
  });

  it.each([
    'TOO_LATE',
    'WEEK_TAKEN',
    'LIVE_CHECK_STALE',
    'NO_EMAIL',
    'UNLINKED',
    'NO_ACCOUNT_EMAIL',
    'BAD_TEXT',
  ] as const)('shows the refusal %s as its own words', async (refusal) => {
    answers('UnsungHeroSchedule', 'unsungHeroSchedule', { ok: false, refusal, slot: null });
    const state = await pressAdmin(BEFORE, press);
    expect(state.notice).toEqual({ intent: 'schedule', tone: 'refused', text: REFUSAL_TEXT[refusal] });
  });
});

describe('Cancel and Mark notified', () => {
  it('cancels a slot by its id', async () => {
    answers('UnsungHeroCancel', 'unsungHeroCancel', {
      ok: true,
      refusal: null,
      slot: { ...NOT_TOLD, status: 'CANCELLED' },
    });
    const state = await pressAdmin(BEFORE, form({ intent: 'cancel', id: NOT_TOLD.id }));
    expect(sentOf(signedFetch)[0]).toMatchObject({ operation: 'UnsungHeroCancel', variables: { id: NOT_TOLD.id } });
    expect(state.notice).toEqual({ intent: 'cancel', tone: 'done', text: 'Cancelled mona/hide-rest (Nov 9 – 15).' });
  });

  it('says why a locked slot cannot be cancelled', async () => {
    answers('UnsungHeroCancel', 'unsungHeroCancel', { ok: false, refusal: 'NOT_CANCELLABLE', slot: null });
    const state = await pressAdmin(BEFORE, form({ intent: 'cancel', id: NO_RECEIPT.id }));
    expect(state.notice).toEqual({ intent: 'cancel', tone: 'refused', text: REFUSAL_TEXT.NOT_CANCELLABLE });
    expect(state.notice?.text).toContain('maintainer was told, or may have been');
  });

  it('marks a heads-up with no receipt as sent, and says why it could not', async () => {
    answers('UnsungHeroMarkNotified', 'unsungHeroMarkNotified', {
      ok: true,
      refusal: null,
      slot: { ...NO_RECEIPT, status: 'NOTIFIED' },
    });
    const state = await pressAdmin(BEFORE, form({ intent: 'mark-notified', id: NO_RECEIPT.id }));
    expect(operations()).toEqual(['UnsungHeroMarkNotified', 'UnsungHeroAdmin']);
    expect(state.notice?.text).toBe('Marked the heads-up of octo-dev/static-copy (Nov 2 – 8) as sent.');

    signedFetch.mockReset();
    answers('UnsungHeroMarkNotified', 'unsungHeroMarkNotified', { ok: false, refusal: 'NOT_MARKABLE', slot: null });
    expect((await pressAdmin(BEFORE, form({ intent: 'mark-notified', id: NO_RECEIPT.id }))).notice).toEqual({
      intent: 'mark-notified',
      tone: 'refused',
      text: REFUSAL_TEXT.NOT_MARKABLE,
    });
  });
});

describe('a press that does not go through', () => {
  const cancel = form({ intent: 'cancel', id: NOT_TOLD.id });

  it('the API answers "not found" (not an admin): nothing changed, the board is kept, nothing more is asked', async () => {
    auth.mockResolvedValue({ user: { githubLogin: 'someone' } });
    signedFetch.mockResolvedValue(jsonResponse(NOT_FOUND_ANSWER));
    const state = await pressAdmin(BEFORE, cancel);
    expect(operations()).toEqual(['UnsungHeroCancel']);
    expect(state.board).toBe(BEFORE.board);
    expect(state.notice).toMatchObject({ intent: 'cancel', tone: 'failed' });
  });

  it('nobody signed in: nothing is asked', async () => {
    auth.mockResolvedValue(null);
    const state = await pressAdmin(BEFORE, cancel);
    expect(signedFetch).not.toHaveBeenCalled();
    expect(state.notice).toMatchObject({ tone: 'failed' });
  });

  it('the API does not answer: says it may or may not have gone through', async () => {
    signedFetch.mockRejectedValue(new Error('down'));
    const state = await pressAdmin(BEFORE, cancel);
    expect(state.notice?.text).toContain('may or may not have gone through');
    expect(state.board).toBe(BEFORE.board);
  });

  it('the board cannot be read again: the press’s answer stands, with the page’s board and a note', async () => {
    answerBy(signedFetch, {
      UnsungHeroCancel: () => jsonResponse({ data: { unsungHeroCancel: { ok: true, refusal: null, slot: NOT_TOLD } } }),
      UnsungHeroAdmin: () => jsonResponse({}, 502),
    });
    const state = await pressAdmin(BEFORE, cancel);
    expect(state.board).toBe(BEFORE.board);
    expect(state.notice?.tone).toBe('done');
    expect(state.notice?.text).toMatch(/could not be read again: reload the page\.$/);
  });

  it.each([
    [{ intent: 'publish', id: NOT_TOLD.id }],
    [{ intent: 'cancel', id: 'not an id!' }],
    [{ intent: 'skip' }],
    [{ intent: 'schedule', repoGithubId: '1', week: '2026-W45' }],
  ])('a form that names no known press changes nothing and asks nothing: %j', async (fields) => {
    expect(await pressAdmin(BEFORE, form(fields as Record<string, string>))).toBe(BEFORE);
    expect(signedFetch).not.toHaveBeenCalled();
  });
});
