import type { OperationDefinitionNode } from 'graphql';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { cookieJar } from '@/lib/link-token/__fixtures__/cookie-jar';
import { FOLLOW_TOKEN, followOf } from '@/lib/link-token/__fixtures__/follow-links';
import type { UnfollowState } from '@/lib/link-token/follow-pages';

const { graphqlDirect, jar } = vi.hoisted(() => ({ graphqlDirect: vi.fn(), jar: { current: null as unknown } }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));
vi.mock('next/headers', () => ({ cookies: async () => jar.current }));

const cookies = cookieJar();
jar.current = cookies.store;
const { changeFollow } = await import('./unfollow/actions');

const sent = () =>
  graphqlDirect.mock.calls.map(([document, variables]) => ({
    name: (document.definitions[0] as OperationDefinitionNode).name?.value,
    variables,
  }));
const form = (change: string) => {
  const data = new FormData();
  data.set('change', change);
  return data;
};

beforeEach(() => {
  graphqlDirect.mockReset();
  cookies.clear();
});

describe('Unfollow and Undo, the Unfollow page’s buttons', () => {
  beforeEach(() => cookies.values.set('gitranks-link-unfollow', FOLLOW_TOKEN));
  const before: UnfollowState = { kind: 'follow', follow: followOf(), addressHint: 'm•••@gmail.com' };

  const answers = (follow: unknown) =>
    graphqlDirect.mockResolvedValue({ followChangeByToken: { follow, subscriber: null } });
  const removedState = { ...before, follow: followOf({ status: 'REMOVED' }) } as const;

  it("unfollows by the link's own token and shows the follow as the change answered it, with Undo", async () => {
    const removed = followOf({ status: 'REMOVED' });
    answers(removed);

    expect(await changeFollow(before, form('remove'))).toEqual({ ...before, follow: removed });
    expect(sent()).toEqual([{ name: 'FollowChangeByToken', variables: { followToken: FOLLOW_TOKEN, remove: true } }]);
    expect(cookies.sets.map(({ name }) => name)).toEqual(['gitranks-link-unfollow']);
  });

  it('Undo follows it again', async () => {
    answers(followOf());
    expect(await changeFollow(removedState, form('undo'))).toEqual({ ...before, note: 'undone' });
    expect(sent()).toEqual([{ name: 'FollowChangeByToken', variables: { followToken: FOLLOW_TOKEN, undo: true } }]);
  });

  it('an Undo answered still unfollowed was refused, and says so', async () => {
    answers(followOf({ status: 'REMOVED' }));
    expect(await changeFollow(removedState, form('undo'))).toEqual({ ...removedState, note: 'undo-refused' });
  });

  it('a change that reached no follow is a link that does not work, not a success', async () => {
    answers(null);
    expect(await changeFollow(before, form('remove'))).toEqual({ kind: 'unknown' });
    expect(await changeFollow(removedState, form('undo'))).toEqual({ kind: 'unknown' });
  });

  it('unavailable when the API cannot answer', async () => {
    graphqlDirect.mockRejectedValue(new Error('down'));
    expect(await changeFollow(before, form('remove'))).toEqual({ kind: 'unavailable' });
  });

  it('a press that names no button changes nothing; without the cookie it times out', async () => {
    expect(await changeFollow(before, form('everything'))).toBe(before);
    cookies.clear();
    expect(await changeFollow(before, form('remove'))).toEqual({ kind: 'timed-out' });
    expect(graphqlDirect).not.toHaveBeenCalled();
  });
});
