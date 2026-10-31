import { beforeEach, describe, expect, it, vi } from 'vitest';

const { graphqlDirect, sessionTokenOf } = vi.hoisted(() => ({ graphqlDirect: vi.fn(), sessionTokenOf: vi.fn() }));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));
vi.mock('./session-token', () => ({ sessionTokenOf }));

const { contributeOpen, contributePreviewAllowed, requestMaySeeContribute, resetContributeOpen } = await import(
  './preview-gate'
);
const { isContributePath, isLandingPath, isMaintainersPath } = await import('./contribute-path');

const req = { headers: new Headers({ cookie: 'authjs.session-token=t' }) };

describe('the Contribute preview gate', () => {
  beforeEach(() => {
    graphqlDirect.mockReset();
    sessionTokenOf.mockReset();
    resetContributeOpen();
  });

  it('takes the landing alone as the landing, in the spellings the router reads as it', () => {
    for (const path of ['/contribute', '/contribute/', '/%63ontribute', '//CONTRIBUTE']) {
      expect(isLandingPath(path), path).toBe(true);
    }
    for (const path of ['/contribute/issues', '/contribute%2Fsettings', '/contribute/maintainers', '/contribute%']) {
      expect(isLandingPath(path), path).toBe(false);
    }
  });

  it('is open once the API says it is launched, asked once a minute, and closed on any failure', async () => {
    graphqlDirect.mockResolvedValue({ contributeOpen: true });
    expect(await contributeOpen(0)).toBe(true);
    expect(graphqlDirect.mock.calls[0][2]).toEqual({ source: 'ssr' });
    expect(await contributeOpen(59_999)).toBe(true);
    expect(graphqlDirect).toHaveBeenCalledOnce();

    graphqlDirect.mockResolvedValue({ contributeOpen: false });
    expect(await contributeOpen(60_000)).toBe(false);
    resetContributeOpen();
    graphqlDirect.mockRejectedValue(new Error('Cannot query field "contributeOpen"'));
    expect(await contributeOpen(0)).toBe(false);
    expect(await contributeOpen(1)).toBe(false);
    expect(graphqlDirect).toHaveBeenCalledTimes(3);
  });

  it('covers /contribute and everything under it, nothing else', () => {
    expect(isContributePath('/contribute')).toBe(true);
    expect(isContributePath('/contribute/settings')).toBe(true);
    expect(isContributePath('/contributors')).toBe(false);
    expect(isContributePath('/profile/contribute')).toBe(false);
  });

  it('leaves out the page for maintainers alone, in the spellings the router reads as it', () => {
    expect(isMaintainersPath('/contribute/maintainers')).toBe(true);
    expect(isMaintainersPath('/contribute/maintainers/')).toBe(true);
    expect(isMaintainersPath('/contribute/%6daintainers')).toBe(true);
    expect(isMaintainersPath('/contribute/maintainers/x')).toBe(false);
    expect(isMaintainersPath('/contribute/maintainers%2F..%2Fsettings')).toBe(false);
    expect(isMaintainersPath('/contribute/maintainers\\..\\settings')).toBe(false);
    expect(isMaintainersPath('/contribute/maintainers%')).toBe(false);
    expect(isMaintainersPath('/contribute')).toBe(false);
    expect(isMaintainersPath('/maintainers')).toBe(false);
  });

  it('matches the decoded path, so an encoded spelling cannot get past it', () => {
    expect(isContributePath('/%63ontribute')).toBe(true);
    expect(isContributePath('/contribute%2Fsettings')).toBe(true);
    expect(isContributePath('/%2Fcontribute')).toBe(true);
    expect(isContributePath('//contribute/issues')).toBe(true);
    expect(isContributePath('/CONTRIBUTE')).toBe(true);
    expect(isContributePath('/contribute%')).toBe(true);
    expect(isContributePath('/%63ontributors')).toBe(false);
  });

  it('lets in only the logins the API lets in, asking as that login', async () => {
    sessionTokenOf.mockResolvedValue({ githubLogin: 'octocat' });
    graphqlDirect.mockResolvedValue({ contribute: { previewAllowed: true } });

    expect(await requestMaySeeContribute(req)).toBe(true);
    expect(graphqlDirect.mock.calls[0][2]).toEqual({ source: 'ssr', githubLogin: 'octocat' });

    graphqlDirect.mockResolvedValue({ contribute: null });
    expect(await requestMaySeeContribute(req)).toBe(false);
    graphqlDirect.mockResolvedValue({ contribute: { previewAllowed: false } });
    expect(await requestMaySeeContribute(req)).toBe(false);
  });

  it('keeps out a visitor without a session, a session that needs a new sign-in, and any failure', async () => {
    sessionTokenOf.mockResolvedValue(null);
    expect(await requestMaySeeContribute(req)).toBe(false);
    sessionTokenOf.mockResolvedValue({ githubLogin: 'octocat', error: 'RefreshTokenError' });
    expect(await requestMaySeeContribute(req)).toBe(false);
    expect(graphqlDirect).not.toHaveBeenCalled();

    graphqlDirect.mockRejectedValue(new Error('GraphQL error! 502'));
    expect(await contributePreviewAllowed('octocat')).toBe(false);
  });
});
