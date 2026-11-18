import { beforeEach, describe, expect, it, vi } from 'vitest';

import { followOf, subscriberOf } from '@/lib/link-token/__fixtures__/follow-links';

const { readFollowing, changeFollowing, stopAllFollowing, settingsPageState } = vi.hoisted(() => ({
  readFollowing: vi.fn(),
  changeFollowing: vi.fn(),
  stopAllFollowing: vi.fn(),
  settingsPageState: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('./follow-api', () => ({ readFollowing, changeFollowing, stopAllFollowing }));
vi.mock('@/lib/link-token/link-pages', () => ({ settingsPageState }));

import type { FollowCaller } from './follow-api';

const { followingPageOf, followingPressOf, pressSessionSettings, sessionSettingsState } = await import(
  './following-session'
);

const viewer = { githubLogin: 'octocat', accountEmailVerified: false };
const visitor = { accountEmailVerified: false };
const FOLLOW_ID = followOf().id;
const SUBSCRIBER = subscriberOf();
const EVENTS = { notable: true, digest: false, milestones: true };

describe('the signed-in settings page', () => {
  beforeEach(() => {
    readFollowing.mockReset().mockResolvedValue({ ok: true, data: [SUBSCRIBER] });
    changeFollowing.mockReset().mockResolvedValue({ ok: true, data: { follow: followOf(), subscriber: null } });
    stopAllFollowing.mockReset().mockResolvedValue({ ok: true, data: 2 });
    settingsPageState.mockReset().mockResolvedValue({ kind: 'timed-out' });
  });

  it('takes only the presses the page has, with ids of a stored id’s shape', () => {
    expect(followingPressOf({ action: 'events', followId: FOLLOW_ID, events: { ...EVENTS, extra: 1 } })).toEqual({
      action: 'events',
      followId: FOLLOW_ID,
      events: EVENTS,
    });
    expect(followingPressOf({ action: 'undo', followId: FOLLOW_ID })).toEqual({ action: 'undo', followId: FOLLOW_ID });
    expect(followingPressOf({ action: 'resume', subscriberId: SUBSCRIBER.id })).toEqual({
      action: 'resume',
      subscriberId: SUBSCRIBER.id,
    });
    expect(followingPressOf({ action: 'stop-all', channel: 'EMAIL' })).toEqual({ action: 'stop-all' });
    expect(followingPressOf({ action: 'remove', followId: 'x' })).toBeNull();
    expect(followingPressOf({ action: 'events', followId: FOLLOW_ID, events: { notable: true } })).toBeNull();
    expect(followingPressOf({ action: 'delete-account' })).toBeNull();
    expect(followingPressOf(null)).toBeNull();
  });

  it('lists every address of the account, and asks nothing for a visitor', async () => {
    expect(await sessionSettingsState(viewer)).toEqual({ kind: 'list', subscribers: [SUBSCRIBER] });
    expect(await sessionSettingsState(visitor)).toBeNull();
    expect(readFollowing).toHaveBeenCalledOnce();
  });

  it('shows an empty list as a list, and is null when the feature is closed to the viewer', async () => {
    readFollowing.mockResolvedValueOnce({ ok: true, data: [] });
    expect(await sessionSettingsState(viewer)).toEqual({ kind: 'list', subscribers: [] });
    readFollowing.mockResolvedValueOnce({ ok: false, failure: 'not_found' });
    expect(await sessionSettingsState(viewer)).toBeNull();
    readFollowing.mockResolvedValueOnce({ ok: false, failure: 'unavailable' });
    expect(await sessionSettingsState(viewer)).toEqual({ kind: 'unavailable' });
  });

  it.each([
    [
      { action: 'events', followId: FOLLOW_ID, events: EVENTS },
      { followId: FOLLOW_ID, events: EVENTS },
    ],
    [
      { action: 'remove', followId: FOLLOW_ID },
      { followId: FOLLOW_ID, remove: true },
    ],
    [
      { action: 'undo', followId: FOLLOW_ID },
      { followId: FOLLOW_ID, undo: true },
    ],
  ] as const)('sends %o as a change by the session, then answers the page', async (press, change) => {
    const state = await pressSessionSettings(viewer, press);
    expect(changeFollowing).toHaveBeenCalledWith(viewer, change);
    expect(state).toEqual({ kind: 'list', subscribers: [SUBSCRIBER] });
  });

  it('says an Undo was refused, a resume went through, and a change that failed', async () => {
    changeFollowing.mockResolvedValueOnce({
      ok: true,
      data: { follow: followOf({ status: 'REMOVED' }), subscriber: null },
    });
    expect(await pressSessionSettings(viewer, { action: 'undo', followId: FOLLOW_ID })).toMatchObject({
      notice: { kind: 'undo-refused', package: followOf().package, channel: 'EMAIL' },
    });

    changeFollowing.mockResolvedValueOnce({
      ok: true,
      data: { follow: null, subscriber: subscriberOf({ channel: 'TELEGRAM' }) },
    });
    expect(await pressSessionSettings(viewer, { action: 'resume', subscriberId: SUBSCRIBER.id })).toMatchObject({
      notice: { kind: 'resumed', channel: 'TELEGRAM' },
    });
    expect(changeFollowing).toHaveBeenLastCalledWith(viewer, { resumeSubscriberId: SUBSCRIBER.id });

    changeFollowing.mockResolvedValueOnce({ ok: false, failure: 'unavailable' });
    expect(await pressSessionSettings(viewer, { action: 'remove', followId: FOLLOW_ID })).toMatchObject({
      notice: { kind: 'failed' },
    });
  });

  it('stops every follow on every channel, and says how many', async () => {
    expect(await pressSessionSettings(viewer, { action: 'stop-all' })).toMatchObject({
      notice: { kind: 'stopped', count: 2 },
    });
    expect(stopAllFollowing).toHaveBeenCalledWith(viewer);
    expect(changeFollowing).not.toHaveBeenCalled();
  });

  it('changes nothing for a visitor', async () => {
    expect(await pressSessionSettings(visitor, { action: 'stop-all' })).toBeNull();
    expect(stopAllFollowing).not.toHaveBeenCalled();
  });

  describe('on load', () => {
    const caller = vi.fn(async (): Promise<FollowCaller> => viewer);
    beforeEach(() => caller.mockClear());

    it('keeps an email settings link’s page, without reading the session', async () => {
      settingsPageState.mockResolvedValueOnce({ kind: 'list', subscribers: [SUBSCRIBER] });
      expect(await followingPageOf(false, caller)).toEqual({
        state: { kind: 'list', subscribers: [SUBSCRIBER] },
        session: false,
      });
      expect(caller).not.toHaveBeenCalled();
      expect(readFollowing).not.toHaveBeenCalled();
    });

    it('shows a signed-in viewer’s own list when there is no link', async () => {
      expect(await followingPageOf(false, caller)).toEqual({
        state: { kind: 'list', subscribers: [SUBSCRIBER] },
        session: true,
      });
    });

    it('says the link timed out to a visitor, and that a bad link does not work', async () => {
      caller.mockResolvedValueOnce(visitor);
      expect(await followingPageOf(false, caller)).toEqual({ state: { kind: 'timed-out' }, session: false });

      settingsPageState.mockResolvedValueOnce({ kind: 'unknown' });
      caller.mockResolvedValueOnce(visitor);
      expect(await followingPageOf(true, caller)).toEqual({ state: { kind: 'unknown' }, session: false });
      expect(readFollowing).not.toHaveBeenCalled();
    });

    it('shows a signed-in viewer their own list after a link that no longer works, saying so', async () => {
      settingsPageState.mockResolvedValueOnce({ kind: 'unknown' });
      expect(await followingPageOf(true, caller)).toEqual({
        state: { kind: 'list', subscribers: [SUBSCRIBER], notice: { kind: 'link-gone' } },
        session: true,
      });
    });

    it('keeps "unavailable" from the link, without reading the session', async () => {
      settingsPageState.mockResolvedValueOnce({ kind: 'unavailable' });
      expect(await followingPageOf(false, caller)).toEqual({ state: { kind: 'unavailable' }, session: false });
      expect(readFollowing).not.toHaveBeenCalled();
    });
  });
});
