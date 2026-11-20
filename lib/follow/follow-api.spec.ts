import jwt from 'jsonwebtoken';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const {
  changeFollow,
  changeFollowing,
  readFollowChannels,
  readFollowing,
  readFollowState,
  startFollow,
  stopAllFollowing,
} = await import('./follow-api');

const SECRET = 'test-secret';
const visitor = { accountEmailVerified: false, visitorAddress: '203.0.113.7' };
const verifiedViewer = {
  githubLogin: 'octocat',
  accountEmail: 'octo@example.com',
  accountEmailVerified: true,
  visitorAddress: '203.0.113.7',
};
const ALL = { notable: true, digest: true, milestones: true };

describe('the follow API calls', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  const answer = (body: unknown, status = 200) => fetchMock.mockResolvedValueOnce(Response.json(body, { status }));
  const sent = () => {
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const claims = jwt.verify(new Headers(init.headers).get('Authorization')!.slice('Bearer '.length), SECRET);
    return {
      url,
      claims,
      body: JSON.parse(init.body as string) as { query: string; variables: Record<string, unknown> },
    };
  };

  beforeEach(() => {
    vi.stubEnv('INTERNAL_JWT_SECRET', SECRET);
    vi.stubEnv('URI_GITRANKS', 'https://api.test');
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('sign the viewer with accountEmailVerified only when GitHub verified their email', async () => {
    answer({ data: { packageFollowChannels: { channels: [], dependents: null, notable: null } } });
    await readFollowChannels(verifiedViewer, null);
    expect(sent().claims).toMatchObject({
      source: 'client',
      githubLogin: 'octocat',
      accountEmail: 'octo@example.com',
      accountEmailVerified: true,
    });

    fetchMock.mockReset();
    answer({ data: { packageFollowChannels: { channels: [], dependents: null, notable: null } } });
    await readFollowChannels({ ...verifiedViewer, accountEmailVerified: false }, null);
    expect(sent().claims).not.toHaveProperty('accountEmailVerified');
    expect(sent().claims).toMatchObject({ accountEmail: 'octo@example.com' });

    fetchMock.mockReset();
    answer({ data: { packageFollowChannels: { channels: [], dependents: null, notable: null } } });
    await readFollowChannels(visitor, null);
    expect(sent().claims).not.toHaveProperty('githubLogin');
    expect(sent().claims).not.toHaveProperty('accountEmailVerified');
  });

  it('read the channels in lower case, asking for one package by its registry enum', async () => {
    answer({
      data: {
        packageFollowChannels: {
          channels: [
            { channel: 'WHATSAPP', open: false, limit: 3, linked: null, addressHint: null, rankUpdates: null },
          ],
          dependents: 16,
          notable: 4,
        },
      },
    });

    const read = await readFollowChannels(visitor, { registry: 'npm', name: 'react-resize-detector' });

    expect(sent().url).toBe('https://api.test/graphql');
    expect(sent().body.variables).toEqual({ package: { registry: 'NPM', name: 'react-resize-detector' } });
    expect(read).toEqual({
      ok: true,
      data: {
        channels: [{ channel: 'whatsapp', open: false, limit: 3, linked: null, addressHint: null, rankUpdates: null }],
        dependents: 16,
        notable: 4,
      },
    });
  });

  it('pass a press on with the visitor address the route read, and read its outcomes', async () => {
    answer({
      data: {
        followPackages: {
          refusal: null,
          notHeld: [],
          results: [
            { channel: 'EMAIL', package: { registry: 'npm', name: 'x' }, result: 'ACTIVE', url: null, limit: null },
            {
              channel: 'TELEGRAM',
              package: { registry: 'npm', name: 'x' },
              result: 'CONNECT',
              url: 'https://t.me/bot?start=f_c',
              limit: null,
            },
          ],
        },
      },
    });

    const read = await startFollow(visitor, {
      packages: [{ registry: 'npm', name: 'x' }],
      events: ALL,
      channels: ['email', 'telegram'],
    });

    expect(sent().body.query).toContain('followPackages(');
    expect(sent().body.variables).toEqual({
      packages: [{ registry: 'NPM', name: 'x' }],
      events: ALL,
      channels: ['EMAIL', 'TELEGRAM'],
      visitorAddress: '203.0.113.7',
    });
    expect(read).toMatchObject({
      ok: true,
      data: {
        refusal: null,
        results: [
          { channel: 'email', result: 'active' },
          { channel: 'telegram', result: 'connect', url: 'https://t.me/bot?start=f_c' },
        ],
      },
    });
  });

  it('never send an email address: the API takes it from the signed call', async () => {
    answer({ data: { followPackages: { refusal: null, notHeld: [], results: [] } } });
    await startFollow(visitor, { packages: [{ registry: 'npm', name: 'x' }], events: ALL, channels: ['email'] });
    expect(sent().body.query).not.toContain('email:');
    expect(sent().body.query).not.toContain('manageToken');
    expect(Object.keys(sent().body.variables)).not.toContain('email');
  });

  it('read a refusal and the packages GitRanks does not hold', async () => {
    answer({
      data: { followPackages: { refusal: 'NOT_HELD', notHeld: [{ registry: 'npm', name: 'ghost' }], results: [] } },
    });
    const read = await startFollow(visitor, {
      packages: [{ registry: 'npm', name: 'ghost' }],
      events: ALL,
      channels: ['telegram'],
    });
    expect(read).toEqual({
      ok: true,
      data: { refusal: 'not_held', notHeld: [{ registry: 'npm', name: 'ghost' }], results: [] },
    });
  });

  it('answer not found when the feature is closed to the request (a null answer)', async () => {
    answer({ data: { packageFollow: null } });
    expect(await readFollowState(verifiedViewer, [{ registry: 'npm', name: 'x' }])).toEqual({
      ok: false,
      failure: 'not_found',
    });
  });

  it.each([
    ['FOLLOW_UNAVAILABLE', 'unavailable'],
    ['UNAUTHENTICATED', 'sign_in'],
    ['BAD_USER_INPUT', 'invalid'],
    ['INTERNAL_SERVER_ERROR', 'failed'],
  ])('read the API error %s as %s', async (code, failure) => {
    answer({ errors: [{ message: 'x', extensions: { code } }], data: null });
    expect(await changeFollow(verifiedViewer, { followId: 'f1', remove: true })).toEqual({ ok: false, failure });
  });

  it('answer unavailable when the API cannot be reached', async () => {
    fetchMock.mockRejectedValueOnce(new Error('offline'));
    expect(await readFollowState(verifiedViewer, [{ registry: 'npm', name: 'x' }])).toEqual({
      ok: false,
      failure: 'unavailable',
    });
  });

  it('read a change, and a follow that is not the viewer’s as null', async () => {
    answer({
      data: {
        followChange: {
          follow: {
            id: 'f1',
            channel: 'TELEGRAM',
            package: { registry: 'npm', name: 'x' },
            status: 'REMOVED',
            events: ALL,
          },
        },
      },
    });
    expect(await changeFollow(verifiedViewer, { followId: 'f1', remove: true })).toEqual({
      ok: true,
      data: { id: 'f1', channel: 'telegram', package: { registry: 'npm', name: 'x' }, status: 'removed', events: ALL },
    });
    expect(sent().body.variables).toEqual({ followId: 'f1', events: null, remove: true, undo: null });

    answer({ data: { followChange: { follow: null } } });
    expect(await changeFollow(verifiedViewer, { followId: 'f2', remove: true })).toEqual({ ok: true, data: null });
  });

  describe('for the signed-in settings page', () => {
    const subscriber = {
      id: 's1',
      channel: 'TELEGRAM',
      addressHint: '…1234',
      paused: false,
      follows: [
        { id: 'f1', channel: 'TELEGRAM', status: 'ACTIVE', package: { registry: 'npm', name: 'x' }, events: ALL },
      ],
    };

    it('read the account’s addresses as the page shows them, signed as the viewer', async () => {
      answer({ data: { following: [subscriber] } });
      expect(await readFollowing(verifiedViewer)).toEqual({ ok: true, data: [subscriber] });
      expect(sent().body.query).toContain('following {');
      expect(sent().claims).toMatchObject({ githubLogin: 'octocat' });

      fetchMock.mockReset();
      answer({ data: { following: null } });
      expect(await readFollowing(verifiedViewer)).toEqual({ ok: false, failure: 'not_found' });
    });

    it('send a change and a stop by the session, with no link key', async () => {
      answer({ data: { followChange: { follow: null, subscriber } } });
      expect(await changeFollowing(verifiedViewer, { resumeSubscriberId: 's1' })).toEqual({
        ok: true,
        data: { follow: null, subscriber },
      });
      expect(sent().body.variables).toEqual({ resumeSubscriberId: 's1' });
      expect(sent().body.query).not.toMatch(/manageToken|followToken/);

      fetchMock.mockReset();
      answer({ data: { followStopAll: 3 } });
      expect(await stopAllFollowing(verifiedViewer)).toEqual({ ok: true, data: 3 });
      expect(sent().body.query).toContain('followStopAll');
    });
  });
});
