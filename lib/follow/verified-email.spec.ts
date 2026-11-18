import { describe, expect, it, vi } from 'vitest';

import { GITHUB_EMAILS_URL, isVerifiedAccountEmail, verifiedEmailOf } from './verified-email';

const answering = (body: unknown, status = 200) => vi.fn(async () => Response.json(body, { status }));

describe("the session's verified email", () => {
  it('is the address, in lower case, when GitHub lists it verified', async () => {
    const fetchImpl = answering([{ email: 'Me@Example.com', verified: true }]);

    expect(await verifiedEmailOf('me@example.com', 'gho_x', fetchImpl)).toBe('me@example.com');
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(GITHUB_EMAILS_URL);
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer gho_x');
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it.each([
    ['listed unverified', [{ email: 'me@example.com', verified: false }]],
    ['not listed', [{ email: 'other@example.com', verified: true }]],
    ['an answer of another shape', { email: 'me@example.com', verified: true }],
  ])('is undefined when it is %s', async (_, body) => {
    expect(await verifiedEmailOf('me@example.com', 'gho_x', answering(body))).toBeUndefined();
  });

  it('is undefined on a refusal or a network error, and nothing is asked without an email or a token', async () => {
    expect(await verifiedEmailOf('me@example.com', 'gho_x', answering({}, 403))).toBeUndefined();
    const failing = vi.fn(async () => {
      throw new Error('timeout');
    });
    expect(await verifiedEmailOf('me@example.com', 'gho_x', failing)).toBeUndefined();

    const unused = answering([]);
    expect(await verifiedEmailOf(undefined, 'gho_x', unused)).toBeUndefined();
    expect(await verifiedEmailOf('me@example.com', undefined, unused)).toBeUndefined();
    expect(unused).not.toHaveBeenCalled();
  });

  it('counts only for the email it was read for', () => {
    expect(isVerifiedAccountEmail('me@example.com', 'Me@Example.com')).toBe(true);
    expect(isVerifiedAccountEmail('me@example.com', 'new@example.com')).toBe(false);
    expect(isVerifiedAccountEmail(undefined, 'me@example.com')).toBe(false);
    expect(isVerifiedAccountEmail('me@example.com', undefined)).toBe(false);
  });
});
