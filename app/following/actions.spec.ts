import type { OperationDefinitionNode } from 'graphql';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { cookieJar } from '@/lib/link-token/__fixtures__/cookie-jar';
import { followOf, MANAGE_TOKEN, subscriberOf } from '@/lib/link-token/__fixtures__/follow-links';

const { graphqlDirect, jar } = vi.hoisted(() => ({ graphqlDirect: vi.fn(), jar: { current: null as unknown } }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));
vi.mock('next/headers', () => ({ cookies: async () => jar.current }));

const cookies = cookieJar();
jar.current = cookies.store;
const { changeFollowing, resumeAddress, setFollowEvents, stopAllEmail } = await import('./actions');

const sent = () =>
  graphqlDirect.mock.calls.map(([document, variables]) => ({
    name: (document.definitions[0] as OperationDefinitionNode).name?.value,
    variables,
  }));
const FOLLOW_ID = followOf().id;
const SUBSCRIBER = subscriberOf();

describe("the settings page's presses", () => {
  beforeEach(() => {
    graphqlDirect.mockReset();
    cookies.clear();
    cookies.values.set('gitranks-link-settings', MANAGE_TOKEN);
    graphqlDirect.mockImplementation(async (document) => {
      const name = (document.definitions[0] as OperationDefinitionNode).name?.value;
      if (name === 'FollowStopAllByToken') return { followStopAllByToken: 2 };
      if (name === 'FollowChangeByToken') return { followChangeByToken: { follow: followOf(), subscriber: null } };
      return { followingByToken: [SUBSCRIBER] };
    });
  });

  it("sets a follow's switches by the link's settings key, renews it, and answers the page as it now is", async () => {
    const events = { notable: false, digest: true, milestones: true };
    expect(await setFollowEvents(FOLLOW_ID, events)).toEqual({ kind: 'list', subscribers: [SUBSCRIBER] });
    expect(sent()).toEqual([
      { name: 'FollowChangeByToken', variables: { manageToken: MANAGE_TOKEN, followId: FOLLOW_ID, events } },
      { name: 'FollowingByToken', variables: { manageToken: MANAGE_TOKEN } },
    ]);
    expect(cookies.sets.map(({ name, options }) => [name, options.maxAge])).toEqual([['gitranks-link-settings', 900]]);
  });

  it('unfollows and undoes one follow', async () => {
    await changeFollowing(FOLLOW_ID, 'remove');
    await changeFollowing(FOLLOW_ID, 'undo');
    expect(sent().filter(({ name }) => name === 'FollowChangeByToken')).toEqual([
      { name: 'FollowChangeByToken', variables: { manageToken: MANAGE_TOKEN, followId: FOLLOW_ID, remove: true } },
      { name: 'FollowChangeByToken', variables: { manageToken: MANAGE_TOKEN, followId: FOLLOW_ID, undo: true } },
    ]);
  });

  it('sends to a paused address again', async () => {
    expect(await resumeAddress(SUBSCRIBER.id)).toEqual({
      kind: 'list',
      subscribers: [SUBSCRIBER],
      notice: { kind: 'resumed' },
    });
    expect(sent()[0]).toEqual({
      name: 'FollowChangeByToken',
      variables: { manageToken: MANAGE_TOKEN, resumeSubscriberId: SUBSCRIBER.id },
    });
  });

  it('stops all package email and says how many follows it removed', async () => {
    expect(await stopAllEmail()).toEqual({
      kind: 'list',
      subscribers: [SUBSCRIBER],
      notice: { kind: 'stopped', count: 2 },
    });
    expect(sent()[0]).toEqual({ name: 'FollowStopAllByToken', variables: { manageToken: MANAGE_TOKEN } });
  });

  it('sends nothing it was given that is not an id or three switches', async () => {
    expect(await setFollowEvents('not-an-id', followOf().events)).toEqual({
      kind: 'list',
      subscribers: [SUBSCRIBER],
      notice: { kind: 'failed' },
    });
    await setFollowEvents(FOLLOW_ID, { notable: 'yes' } as never);
    await resumeAddress('{"$ne":null}');
    expect(sent().map(({ name }) => name)).toEqual(['FollowingByToken', 'FollowingByToken', 'FollowingByToken']);
  });

  it('a change that does not go through keeps the list and says so', async () => {
    graphqlDirect.mockImplementation(async (document) => {
      if ((document.definitions[0] as OperationDefinitionNode).operation === 'mutation') throw new Error('down');
      return { followingByToken: [SUBSCRIBER] };
    });
    expect(await changeFollowing(FOLLOW_ID, 'remove')).toEqual({
      kind: 'list',
      subscribers: [SUBSCRIBER],
      notice: { kind: 'failed' },
    });
  });

  it('without the settings cookie, every press times out and asks nothing', async () => {
    cookies.clear();
    expect(await setFollowEvents(FOLLOW_ID, followOf().events)).toEqual({ kind: 'timed-out' });
    expect(await changeFollowing(FOLLOW_ID, 'remove')).toEqual({ kind: 'timed-out' });
    expect(await resumeAddress(SUBSCRIBER.id)).toEqual({ kind: 'timed-out' });
    expect(await stopAllEmail()).toEqual({ kind: 'timed-out' });
    expect(graphqlDirect).not.toHaveBeenCalled();
  });
});
