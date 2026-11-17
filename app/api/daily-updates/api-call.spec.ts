import type { NextRequest } from 'next/server';
import type { Session } from 'next-auth';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { signedFetch } = vi.hoisted(() => ({ signedFetch: vi.fn() }));

vi.mock('@/lib/signed-fetch', () => ({ signedFetch }));

const { callDailyUpdates, viewerOf } = await import('./api-call');

const requestOf = (user: Record<string, unknown> | null) =>
  ({
    auth: user ? ({ user, expires: '2099-01-01T00:00:00.000Z' } as unknown as Session) : null,
  }) as NextRequest & { auth: Session | null };

describe('viewerOf', () => {
  it('is the login, with the session’s email beside it when it is a valid one', () => {
    expect(viewerOf(requestOf({ githubLogin: 'octo-dev', email: ' Octo@Example.com ' }))).toEqual({
      githubLogin: 'octo-dev',
      accountEmail: 'Octo@Example.com',
    });
  });

  it('leaves out an email that is missing or is no address', () => {
    for (const email of [undefined, null, '', 'not an address', 42]) {
      expect(viewerOf(requestOf({ githubLogin: 'octo-dev', email }))).toEqual({ githubLogin: 'octo-dev' });
    }
  });

  it('is nobody without a login', () => {
    expect(viewerOf(requestOf(null))).toBeUndefined();
    expect(viewerOf(requestOf({ email: 'octo@example.com' }))).toBeUndefined();
  });
});

describe('callDailyUpdates', () => {
  beforeEach(() => {
    signedFetch.mockReset();
    signedFetch.mockResolvedValue(new Response(JSON.stringify({ ok: 1 })));
  });

  it('signs the email beside the login when the visitor has one', async () => {
    const answer = await callDailyUpdates(
      { githubLogin: 'octo-dev', accountEmail: 'octo@example.com' },
      '/daily-updates/picks',
      'POST',
      { kind: 'repo', name: 'octo/rocket' },
    );

    expect(answer).toEqual({ ok: true, body: { ok: 1 } });
    expect(signedFetch).toHaveBeenCalledExactlyOnceWith(
      '/daily-updates/picks',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'repo', name: 'octo/rocket' }),
        cache: 'no-store',
      },
      'client',
      'octo-dev',
      'octo@example.com',
    );
  });

  it('signs the login alone without an email', async () => {
    await callDailyUpdates({ githubLogin: 'octo-dev' }, '/daily-updates/me', 'GET');

    expect(signedFetch).toHaveBeenCalledExactlyOnceWith(
      '/daily-updates/me',
      { method: 'GET', cache: 'no-store' },
      'client',
      'octo-dev',
    );
  });

  it('reads an answer that is no object, and a call that throws, as a 502', async () => {
    signedFetch.mockResolvedValueOnce(new Response('"text"'));
    expect(await callDailyUpdates({ githubLogin: 'octo-dev' }, '/daily-updates/me', 'GET')).toEqual({
      ok: false,
      status: 502,
    });

    signedFetch.mockRejectedValueOnce(new Error('down'));
    expect(await callDailyUpdates({ githubLogin: 'octo-dev' }, '/daily-updates/me', 'GET')).toEqual({
      ok: false,
      status: 502,
    });
  });
});
