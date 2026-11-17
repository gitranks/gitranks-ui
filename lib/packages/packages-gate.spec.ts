import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const { graphqlDirect, sessionTokenOf } = vi.hoisted(() => ({ graphqlDirect: vi.fn(), sessionTokenOf: vi.fn() }));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));
vi.mock('@/lib/contribute/session-token', () => ({ sessionTokenOf }));

const { packagesPublic, requestMaySeePackages, resetPackagesGate } = await import('./packages-gate');

const req = { headers: new Headers({ cookie: 'authjs.session-token=t' }) };
const gate = (everyone: boolean, viewer = false) => ({ packagesGate: { everyone, viewer } });

describe('the packages gate', () => {
  beforeEach(() => {
    graphqlDirect.mockReset();
    sessionTokenOf.mockReset();
    resetPackagesGate();
  });

  describe('packagesPublic', () => {
    it('is open once the API says so, asked once a minute and one ask at a time', async () => {
      graphqlDirect.mockResolvedValue(gate(true));
      expect(await Promise.all([packagesPublic(0), packagesPublic(0)])).toEqual([true, true]);
      expect(graphqlDirect).toHaveBeenCalledOnce();
      expect(graphqlDirect.mock.calls[0][2]).toEqual({ source: 'ssr' });
      expect(await packagesPublic(59_999)).toBe(true);
      expect(graphqlDirect).toHaveBeenCalledOnce();

      graphqlDirect.mockResolvedValue(gate(false));
      expect(await packagesPublic(60_000)).toBe(false);
      expect(graphqlDirect).toHaveBeenCalledTimes(2);
    });

    it('is closed while the API never answered, and keeps its last answer through a failure', async () => {
      graphqlDirect.mockRejectedValue(new Error('Cannot query field "packagesGate"'));
      expect(await packagesPublic(0)).toBe(false);

      graphqlDirect.mockResolvedValueOnce(gate(true));
      expect(await packagesPublic(10_000)).toBe(true);
      // A failed ask a minute later keeps it open, and tries again 10 seconds on.
      expect(await packagesPublic(70_000)).toBe(true);
      expect(await packagesPublic(79_999)).toBe(true);
      expect(graphqlDirect).toHaveBeenCalledTimes(3);
      graphqlDirect.mockResolvedValueOnce(gate(false));
      expect(await packagesPublic(80_000)).toBe(false);
    });

    it('is closed on an answer without the gate', async () => {
      graphqlDirect.mockResolvedValue({ packagesGate: null });
      expect(await packagesPublic(0)).toBe(false);
    });
  });

  describe('requestMaySeePackages', () => {
    it('lets everyone in once public, without reading the session', async () => {
      graphqlDirect.mockResolvedValue(gate(true));
      expect(await requestMaySeePackages(req, 0)).toBe(true);
      expect(await requestMaySeePackages({ headers: new Headers() }, 0)).toBe(true);
      expect(sessionTokenOf).not.toHaveBeenCalled();
      expect(graphqlDirect).toHaveBeenCalledOnce();
    });

    it('keeps out a visitor without a session, and a session that needs a new sign-in, asking nothing for them', async () => {
      graphqlDirect.mockResolvedValue(gate(false, true));
      sessionTokenOf.mockResolvedValue(null);
      expect(await requestMaySeePackages(req, 0)).toBe(false);
      sessionTokenOf.mockResolvedValue({ email: 'octo@example.com' });
      expect(await requestMaySeePackages(req, 0)).toBe(false);
      sessionTokenOf.mockResolvedValue({ githubLogin: 'octocat', error: 'RefreshTokenError' });
      expect(await requestMaySeePackages(req, 0)).toBe(false);
      // Only the one ask for everyone.
      expect(graphqlDirect).toHaveBeenCalledOnce();
    });

    it("asks as the session's login and email, and answers what the API says of that viewer", async () => {
      sessionTokenOf.mockResolvedValue({ githubLogin: 'octocat', email: ' octo@example.com ' });
      graphqlDirect.mockResolvedValueOnce(gate(false)).mockResolvedValueOnce(gate(false, true));

      expect(await requestMaySeePackages(req, 0)).toBe(true);
      expect(graphqlDirect.mock.calls[1][2]).toEqual({
        source: 'ssr',
        githubLogin: 'octocat',
        accountEmail: 'octo@example.com',
      });

      sessionTokenOf.mockResolvedValue({ githubLogin: 'hubot', email: 'not an address' });
      graphqlDirect.mockResolvedValueOnce(gate(false, false));
      expect(await requestMaySeePackages(req, 0)).toBe(false);
      expect(graphqlDirect.mock.calls[2][2]).toEqual({ source: 'ssr', githubLogin: 'hubot' });
    });

    it('is closed on any failure, and asks again 10 seconds later', async () => {
      sessionTokenOf.mockResolvedValue({ githubLogin: 'octocat', email: 'octo@example.com' });
      graphqlDirect.mockResolvedValueOnce(gate(false)).mockRejectedValueOnce(new Error('GraphQL error! 502'));
      expect(await requestMaySeePackages(req, 0)).toBe(false);
      expect(await requestMaySeePackages(req, 9_999)).toBe(false);
      expect(graphqlDirect).toHaveBeenCalledTimes(2);

      graphqlDirect.mockResolvedValueOnce(gate(false, true));
      expect(await requestMaySeePackages(req, 10_000)).toBe(true);
      expect(graphqlDirect).toHaveBeenCalledTimes(3);
    });

    it('keeps each login’s answer a minute, one ask at a time per login', async () => {
      graphqlDirect.mockImplementation(async (_document, _variables, params?: { githubLogin?: string }) =>
        gate(false, params?.githubLogin === 'octocat'),
      );
      const as = (githubLogin: string) => {
        sessionTokenOf.mockResolvedValue({ githubLogin, email: `${githubLogin}@example.com` });
      };

      as('octocat');
      expect(await Promise.all([requestMaySeePackages(req, 0), requestMaySeePackages(req, 0)])).toEqual([true, true]);
      expect(await requestMaySeePackages(req, 30_000)).toBe(true);
      const viewerAsks = () => graphqlDirect.mock.calls.filter(([, , params]) => params?.githubLogin).length;
      expect(viewerAsks()).toBe(1);

      as('hubot');
      expect(await requestMaySeePackages(req, 30_000)).toBe(false);
      expect(viewerAsks()).toBe(2);

      as('octocat');
      expect(await requestMaySeePackages(req, 59_999)).toBe(true);
      expect(viewerAsks()).toBe(2);
      graphqlDirect.mockImplementation(async () => gate(false, false));
      expect(await requestMaySeePackages(req, 60_000)).toBe(false);
      expect(viewerAsks()).toBe(3);
    });
  });
});
