import type { OperationDefinitionNode } from 'graphql';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { cookieJar } from '@/lib/link-token/__fixtures__/cookie-jar';
import {
  CONFIRM_TOKEN,
  FOLLOW_TOKEN,
  followOf,
  MANAGE_TOKEN,
  RESIZE,
  subscriberOf,
} from '@/lib/link-token/__fixtures__/follow-links';
import type { ConfirmState, UnfollowState } from '@/lib/link-token/follow-pages';

const { graphqlDirect, jar } = vi.hoisted(() => ({ graphqlDirect: vi.fn(), jar: { current: null as unknown } }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));
vi.mock('next/headers', () => ({ cookies: async () => jar.current }));

const cookies = cookieJar();
jar.current = cookies.store;
const { confirmFollow } = await import('./confirm/actions');
const { changeFollow } = await import('./unfollow/actions');

const sent = () =>
  graphqlDirect.mock.calls.map(([document, variables]) => ({
    name: (document.definitions[0] as OperationDefinitionNode).name?.value,
    variables,
  }));
const PENDING: ConfirmState = { kind: 'pending', packages: [RESIZE], events: null };
const form = (change: string) => {
  const data = new FormData();
  data.set('change', change);
  return data;
};

beforeEach(() => {
  graphqlDirect.mockReset();
  cookies.clear();
});

describe('Confirm, the confirmation page’s one button', () => {
  beforeEach(() => cookies.values.set('gitranks-link-confirm', CONFIRM_TOKEN));
  const press = (answer: unknown) => graphqlDirect.mockResolvedValue({ followConfirm: answer });

  it("confirms by the link's cookie, keeps the settings key in its own cookie, and never hands it to the page", async () => {
    press({ result: 'CONFIRMED', packages: [RESIZE], manageToken: MANAGE_TOKEN });
    const state = await confirmFollow(PENDING);

    expect(state).toEqual({ kind: 'confirmed', packages: [RESIZE], settings: true });
    expect(JSON.stringify(state)).not.toContain(MANAGE_TOKEN);
    expect(sent()).toEqual([{ name: 'FollowConfirm', variables: { token: CONFIRM_TOKEN } }]);
    expect(cookies.sets.map(({ name, value, options }) => [name, value, options.maxAge, options.httpOnly])).toEqual([
      ['gitranks-link-confirm', CONFIRM_TOKEN, 900, true],
      ['gitranks-link-settings', MANAGE_TOKEN, 900, true],
    ]);
  });

  it('already confirmed: the packages, and no settings key', async () => {
    press({ result: 'ALREADY_CONFIRMED', packages: [RESIZE], manageToken: null });
    expect(await confirmFollow(PENDING)).toEqual({ kind: 'already-confirmed', packages: [RESIZE] });
    expect(cookies.sets.map(({ name }) => name)).toEqual(['gitranks-link-confirm']);
  });

  it('expired and unknown links', async () => {
    press({ result: 'EXPIRED', packages: [], manageToken: null });
    expect(await confirmFollow(PENDING)).toEqual({ kind: 'expired' });
    press({ result: 'UNKNOWN', packages: [], manageToken: null });
    expect(await confirmFollow(PENDING)).toEqual({ kind: 'unknown' });
  });

  it('unavailable when the API cannot answer, and timed out without the cookie (asking nothing)', async () => {
    graphqlDirect.mockRejectedValue(new Error('down'));
    expect(await confirmFollow(PENDING)).toEqual({ kind: 'unavailable' });

    cookies.clear();
    graphqlDirect.mockReset();
    expect(await confirmFollow(PENDING)).toEqual({ kind: 'timed-out' });
    expect(graphqlDirect).not.toHaveBeenCalled();
  });
});

describe('Unfollow and Undo, the Unfollow page’s buttons', () => {
  beforeEach(() => cookies.values.set('gitranks-link-unfollow', FOLLOW_TOKEN));
  const before: UnfollowState = { kind: 'follow', follow: followOf(), addressHint: 'm•••@gmail.com' };

  it("unfollows by the link's own token, then shows the follow as it now is", async () => {
    const removed = followOf({ status: 'REMOVED' });
    graphqlDirect
      .mockResolvedValueOnce({ followChangeByToken: { follow: removed, subscriber: null } })
      .mockResolvedValueOnce({ followingByToken: [subscriberOf({ follows: [removed] })] });

    expect(await changeFollow(before, form('remove'))).toEqual({ ...before, follow: removed });
    expect(sent()).toEqual([
      { name: 'FollowChangeByToken', variables: { followToken: FOLLOW_TOKEN, remove: true } },
      { name: 'FollowingByToken', variables: { followToken: FOLLOW_TOKEN } },
    ]);
    expect(cookies.sets.map(({ name }) => name)).toEqual(['gitranks-link-unfollow']);
  });

  it('Undo follows it again', async () => {
    graphqlDirect
      .mockResolvedValueOnce({ followChangeByToken: { follow: followOf(), subscriber: null } })
      .mockResolvedValueOnce({ followingByToken: [subscriberOf({ follows: [followOf()] })] });
    expect(await changeFollow(before, form('undo'))).toEqual({ ...before, undone: true });
    expect(sent()[0]).toEqual({ name: 'FollowChangeByToken', variables: { followToken: FOLLOW_TOKEN, undo: true } });
  });

  it('a press that names no button changes nothing; without the cookie it times out', async () => {
    expect(await changeFollow(before, form('everything'))).toBe(before);
    cookies.clear();
    expect(await changeFollow(before, form('remove'))).toEqual({ kind: 'timed-out' });
    expect(graphqlDirect).not.toHaveBeenCalled();
  });
});
