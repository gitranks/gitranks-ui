import { beforeEach, describe, expect, it, vi } from 'vitest';

const { signedFetch, after } = vi.hoisted(() => ({
  signedFetch: vi.fn(),
  after: vi.fn<(task: () => Promise<void>) => void>(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/signed-fetch', () => ({ signedFetch }));
vi.mock('next/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/server')>()),
  after,
}));

const { reportBadgeSeen } = await import('./badge-seen');
const { badgeSeenReporterFor, isReadmeProxy } = await import('./badge-seen-reporter');

/** The User-Agent GitHub's image proxy sends. */
const README_PROXY_UA = 'github-camo (876de43e)';
const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 15_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Safari/605.1.15';

const requestFrom = (userAgent?: string) =>
  new Request('https://gitranks.com/badge/user/octocat/rank.svg', {
    headers: userAgent === undefined ? {} : { 'User-Agent': userAgent },
  });

const runAfter = async () => {
  for (const [task] of after.mock.calls) await task();
};

describe('isReadmeProxy', () => {
  it("knows GitHub's image proxy, in any letter case", () => {
    expect(isReadmeProxy(README_PROXY_UA)).toBe(true);
    expect(isReadmeProxy('github-camo')).toBe(true);
    expect(isReadmeProxy('GitHub-Camo (1a2b3c4d)')).toBe(true);
  });

  it('refuses browsers, a missing header and a proxy name further in', () => {
    expect(isReadmeProxy(BROWSER_UA)).toBe(false);
    expect(isReadmeProxy(null)).toBe(false);
    expect(isReadmeProxy(undefined)).toBe(false);
    expect(isReadmeProxy('')).toBe(false);
    expect(isReadmeProxy('Mozilla/5.0 github-camo')).toBe(false);
  });
});

describe('reportBadgeSeen', () => {
  beforeEach(() => {
    signedFetch.mockReset();
  });

  it('posts the kind and the name as the badge surface, with no visitor', async () => {
    signedFetch.mockResolvedValue(new Response(null, { status: 204 }));
    await reportBadgeSeen('repo', 'acme/FastQueue');

    expect(signedFetch).toHaveBeenCalledExactlyOnceWith(
      '/ui/badge-seen',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"kind":"repo","name":"acme/FastQueue"}',
      },
      'badge',
    );
  });

  it('swallows a failed call', async () => {
    signedFetch.mockRejectedValue(new Error('unreachable'));
    await expect(reportBadgeSeen('user', 'octocat')).resolves.toBeUndefined();
  });
});

describe('badgeSeenReporterFor', () => {
  beforeEach(() => {
    signedFetch.mockReset();
    signedFetch.mockResolvedValue(new Response(null, { status: 204 }));
    after.mockReset();
  });

  it('gives no reporter to a browser or a request without a User-Agent', () => {
    expect(badgeSeenReporterFor(requestFrom(BROWSER_UA))).toBeUndefined();
    expect(badgeSeenReporterFor(requestFrom())).toBeUndefined();
  });

  it("reports for GitHub's image proxy only after the response", async () => {
    const report = badgeSeenReporterFor(requestFrom(README_PROXY_UA));
    report?.('user', 'octocat');

    expect(signedFetch).not.toHaveBeenCalled();
    expect(after).toHaveBeenCalledTimes(1);
    await runAfter();
    expect(signedFetch).toHaveBeenCalledExactlyOnceWith(
      '/ui/badge-seen',
      expect.objectContaining({ body: '{"kind":"user","name":"octocat"}' }),
      'badge',
    );
  });

  it('never throws: not when scheduling fails, not when the call fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const report = badgeSeenReporterFor(requestFrom(README_PROXY_UA));

    after.mockImplementationOnce(() => {
      throw new Error('outside a request');
    });
    expect(() => report?.('user', 'octocat')).not.toThrow();

    signedFetch.mockRejectedValue(new Error('down'));
    report?.('repo', 'acme/fastqueue');
    await expect(runAfter()).resolves.toBeUndefined();
  });
});
