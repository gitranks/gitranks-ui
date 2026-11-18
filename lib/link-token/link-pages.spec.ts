import type { OperationDefinitionNode } from 'graphql';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { cookieJar } from './__fixtures__/cookie-jar';
import {
  CONFIRM_TOKEN,
  DIALOG,
  FOLLOW_TOKEN,
  followOf,
  MANAGE_TOKEN,
  RESIZE,
  subscriberOf,
} from './__fixtures__/follow-links';

const { graphqlDirect, jar } = vi.hoisted(() => ({ graphqlDirect: vi.fn(), jar: { current: null as unknown } }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));
vi.mock('next/headers', () => ({ cookies: async () => jar.current }));

const cookies = cookieJar();
jar.current = cookies.store;
const { confirmPageState, settingsPageState, unfollowPageState } = await import('./link-pages');

const operationsSent = () =>
  graphqlDirect.mock.calls.map(([document]) => (document.definitions[0] as OperationDefinitionNode).operation);
const variablesSent = () => graphqlDirect.mock.calls.map(([, variables]) => variables);

describe('a link page on load', () => {
  beforeEach(() => {
    graphqlDirect.mockReset();
    cookies.clear();
  });

  it('only reads: every call a load makes is a query, and it sets no cookie', async () => {
    cookies.values.set('gitranks-link-confirm', CONFIRM_TOKEN);
    cookies.values.set('gitranks-link-unfollow', FOLLOW_TOKEN);
    cookies.values.set('gitranks-link-settings', MANAGE_TOKEN);
    graphqlDirect.mockImplementation(async (document) => {
      const name = (document.definitions[0] as OperationDefinitionNode).name?.value;
      return name === 'FollowConfirmPeek'
        ? { followConfirmPeek: { result: 'PENDING', packages: [RESIZE], events: followOf().events } }
        : { followingByToken: [subscriberOf()] };
    });

    await confirmPageState();
    await unfollowPageState();
    await settingsPageState();

    expect(operationsSent()).toEqual(['query', 'query', 'query']);
    expect(variablesSent()).toEqual([
      { token: CONFIRM_TOKEN },
      { followToken: FOLLOW_TOKEN },
      { manageToken: MANAGE_TOKEN },
    ]);
    expect(cookies.sets).toEqual([]);
  });

  it("without the link's cookie, says the link timed out and asks nothing", async () => {
    expect(await confirmPageState()).toEqual({ kind: 'timed-out' });
    expect(await unfollowPageState()).toEqual({ kind: 'timed-out' });
    expect(await settingsPageState()).toEqual({ kind: 'timed-out' });
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it('a malformed cookie is no cookie', async () => {
    cookies.values.set('gitranks-link-confirm', 'not a token');
    expect(await confirmPageState()).toEqual({ kind: 'timed-out' });
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  describe('the confirmation page shows each answer of the look', () => {
    beforeEach(() => cookies.values.set('gitranks-link-confirm', CONFIRM_TOKEN));
    const peek = (answer: unknown) => graphqlDirect.mockResolvedValue({ followConfirmPeek: answer });

    it('pending: the packages and switches waiting for the press', async () => {
      const events = { notable: true, digest: false, milestones: true };
      peek({ result: 'PENDING', packages: [RESIZE, DIALOG], events });
      expect(await confirmPageState()).toEqual({ kind: 'pending', packages: [RESIZE, DIALOG], events });
    });

    it('already confirmed: the packages only', async () => {
      peek({ result: 'ALREADY_CONFIRMED', packages: [RESIZE], events: null });
      expect(await confirmPageState()).toEqual({ kind: 'already-confirmed', packages: [RESIZE] });
    });

    it('expired and unknown', async () => {
      peek({ result: 'EXPIRED', packages: [], events: null });
      expect(await confirmPageState()).toEqual({ kind: 'expired' });
      peek({ result: 'UNKNOWN', packages: [], events: null });
      expect(await confirmPageState()).toEqual({ kind: 'unknown' });
    });

    it('unavailable when the API cannot answer', async () => {
      graphqlDirect.mockRejectedValue(new Error('down'));
      expect(await confirmPageState()).toEqual({ kind: 'unavailable' });
    });
  });

  it("the Unfollow page: the link's one follow at its address; unknown when it reaches none", async () => {
    cookies.values.set('gitranks-link-unfollow', FOLLOW_TOKEN);
    const follow = followOf();
    graphqlDirect.mockResolvedValueOnce({ followingByToken: [subscriberOf({ follows: [follow] })] });
    expect(await unfollowPageState()).toEqual({ kind: 'follow', follow, addressHint: 'm•••@gmail.com' });
    graphqlDirect.mockResolvedValueOnce({ followingByToken: [] });
    expect(await unfollowPageState()).toEqual({ kind: 'unknown' });
  });

  it("the settings page: the address's follows; unknown when the link reaches no address", async () => {
    cookies.values.set('gitranks-link-settings', MANAGE_TOKEN);
    const subscriber = subscriberOf();
    graphqlDirect.mockResolvedValueOnce({ followingByToken: [subscriber] });
    expect(await settingsPageState()).toEqual({ kind: 'list', subscribers: [subscriber] });
    graphqlDirect.mockResolvedValueOnce({ followingByToken: [] });
    expect(await settingsPageState()).toEqual({ kind: 'unknown' });
  });
});
