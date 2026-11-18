import { afterEach, describe, expect, it, vi } from 'vitest';

import { FOLLOW_ROUTES, postFollowingPress } from './follow-client';

const answering = (body: unknown, status = 200) =>
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => Response.json(body, { status })),
  );

describe('a press on the signed-in settings page', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('answers the page the route answered', async () => {
    answering({ kind: 'list', subscribers: [] });
    expect(await postFollowingPress({ action: 'stop-all' })).toEqual({ kind: 'list', subscribers: [] });
    expect(fetch).toHaveBeenCalledWith(FOLLOW_ROUTES.following, expect.objectContaining({ method: 'POST' }));
  });

  it('says the session ended when the route asks for a sign-in', async () => {
    answering({ error: 'sign_in' }, 401);
    expect(await postFollowingPress({ action: 'stop-all' })).toEqual({ kind: 'signed-out' });
  });

  it.each([
    [{ error: 'not_found' }, 404],
    [{ error: 'unavailable' }, 503],
  ])('says it did not go through for %o', async (body, status) => {
    answering(body, status);
    expect(await postFollowingPress({ action: 'stop-all' })).toEqual({ kind: 'unavailable' });
  });
});
