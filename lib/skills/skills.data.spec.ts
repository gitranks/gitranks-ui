import { print } from 'graphql';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { builtRows, contributorPage, ownerBuildsMine, skillsMine } from './__fixtures__/skills';

const { graphqlDirect, cacheLife, cacheTag } = vi.hoisted(() => ({
  graphqlDirect: vi.fn(),
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ cacheLife, cacheTag }));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));

const data = await import('./skills.data');
const documents = await import('./skills.documents');

beforeEach(() => {
  graphqlDirect.mockReset();
  cacheLife.mockReset();
  cacheTag.mockReset();
});

describe('the public Skills reads', () => {
  it('read the page signed out, tagged by the login in lower case, kept fifteen minutes', async () => {
    graphqlDirect.mockResolvedValueOnce({ skillsPage: contributorPage });
    await expect(data.loadSkillsPage('OctoCat')).resolves.toEqual({ value: contributorPage, failed: false });
    expect(graphqlDirect).toHaveBeenCalledWith(documents.SkillsPageDocument, { login: 'OctoCat' }, { source: 'ssr' });
    expect(cacheTag).toHaveBeenCalledWith('skills:octocat');
    expect(cacheLife).toHaveBeenCalledWith({ stale: 300, revalidate: 900, expire: 86_400 });
  });

  it('say there is no public page as a null value, kept as long', async () => {
    graphqlDirect.mockResolvedValueOnce({ skillsPage: null });
    await expect(data.loadSkillsPage('octocat')).resolves.toEqual({ value: null, failed: false });
    graphqlDirect.mockResolvedValueOnce({ skillsBrief: null });
    await expect(data.loadSkillsBrief('octocat')).resolves.toEqual({ value: null, failed: false });
  });

  it('catch a failed read inside, keep it for minutes, and say it failed', async () => {
    for (const read of [
      () => data.loadSkillsPage('octocat'),
      () => data.loadSkillsBrief('octocat'),
      () => data.loadSkillsFixes('octocat', 'c1'),
    ]) {
      cacheLife.mockReset();
      graphqlDirect.mockRejectedValueOnce(new Error('down'));
      await expect(read()).resolves.toEqual({ value: null, failed: true });
      expect(cacheLife).toHaveBeenCalledExactlyOnceWith('minutes');
    }
  });

  it('read the next fixes after a cursor', async () => {
    const fixes = { rows: [], total: 26, next: null };
    graphqlDirect.mockResolvedValueOnce({ skillsFixes: fixes });
    await expect(data.loadSkillsFixes('octocat', 'c6')).resolves.toEqual({ value: fixes, failed: false });
    expect(graphqlDirect).toHaveBeenCalledWith(
      documents.SkillsFixesDocument,
      { login: 'octocat', after: 'c6' },
      { source: 'client' },
    );
  });
});

describe("the sitemap's logins", () => {
  it('reads every page, tagged for hiding a page to expire, kept for hours once it lists any', async () => {
    graphqlDirect
      .mockResolvedValueOnce({ skillsLogins: { logins: ['a', 'b'], next: 'n1' } })
      .mockResolvedValueOnce({ skillsLogins: { logins: ['c'], next: null } });
    await expect(data.loadSkillsLogins()).resolves.toEqual(['a', 'b', 'c']);
    expect(graphqlDirect).toHaveBeenNthCalledWith(
      2,
      documents.SkillsLoginsDocument,
      { after: 'n1' },
      { source: 'ssr' },
    );
    expect(cacheLife).toHaveBeenCalledExactlyOnceWith('hours');
    expect(cacheTag).toHaveBeenCalledWith('skills-logins');
  });

  it('is kept for minutes while empty, and null on a failure', async () => {
    graphqlDirect.mockResolvedValueOnce({ skillsLogins: { logins: [], next: null } });
    await expect(data.loadSkillsLogins()).resolves.toEqual([]);
    expect(cacheLife).toHaveBeenCalledExactlyOnceWith('minutes');
    cacheLife.mockReset();
    graphqlDirect.mockRejectedValueOnce(new Error('down'));
    await expect(data.loadSkillsLogins()).resolves.toBeNull();
    expect(cacheLife).toHaveBeenCalledExactlyOnceWith('minutes');
  });

  it('stops after its most pages', async () => {
    graphqlDirect.mockResolvedValue({ skillsLogins: { logins: ['a'], next: 'more' } });
    await expect(data.loadSkillsLogins()).resolves.toHaveLength(data.SKILLS_LOGIN_PAGES);
    expect(graphqlDirect).toHaveBeenCalledTimes(data.SKILLS_LOGIN_PAGES);
  });
});

describe("the owner's reads and writes", () => {
  it('read the view as the person, never kept: undefined when it fails', async () => {
    graphqlDirect.mockResolvedValueOnce({ skillsMine: skillsMine.publicLearner });
    await expect(data.loadSkillsMine('octocat')).resolves.toEqual(skillsMine.publicLearner);
    expect(graphqlDirect).toHaveBeenCalledWith(
      documents.SkillsMineDocument,
      {},
      { source: 'client', githubLogin: 'octocat' },
    );
    graphqlDirect.mockResolvedValueOnce({ skillsMine: null });
    await expect(data.loadSkillsMine('octocat')).resolves.toBeNull();
    graphqlDirect.mockRejectedValueOnce(new Error('down'));
    await expect(data.loadSkillsMine('octocat')).resolves.toBeUndefined();
    expect(cacheLife).not.toHaveBeenCalled();
  });

  it("read the tab's mark, null on a failure", async () => {
    graphqlDirect.mockResolvedValueOnce({ skillsMine: { state: 'NEW', tabNew: true } });
    await expect(data.loadSkillsTab('octocat')).resolves.toEqual({ state: 'NEW', tabNew: true });
    graphqlDirect.mockRejectedValueOnce(new Error('down'));
    await expect(data.loadSkillsTab('octocat')).resolves.toBeNull();
  });

  it('mark the tab seen, false on a failure', async () => {
    graphqlDirect.mockResolvedValueOnce({ markSkillsSeen: true });
    await expect(data.markSkillsSeen('octocat')).resolves.toBe(true);
    graphqlDirect.mockRejectedValueOnce(new Error('down'));
    await expect(data.markSkillsSeen('octocat')).resolves.toBe(false);
  });

  it('hide or show the page, throwing on a failure for the action to say so', async () => {
    graphqlDirect.mockResolvedValueOnce({ setSkillsHidden: skillsMine.hiddenLearner });
    await expect(data.setSkillsHidden('octocat', true)).resolves.toEqual(skillsMine.hiddenLearner);
    expect(graphqlDirect).toHaveBeenCalledWith(
      documents.SetSkillsHiddenDocument,
      { hidden: true },
      { source: 'client', githubLogin: 'octocat' },
    );
    graphqlDirect.mockRejectedValueOnce(new Error('down'));
    await expect(data.setSkillsHidden('octocat', false)).rejects.toThrow('down');
  });
});

describe("Build's fields", () => {
  const unknown = (field: string, type: string) =>
    new Error(
      JSON.stringify([
        {
          message: `Cannot query field "${field}" on type "${type}".`,
          extensions: { code: 'GRAPHQL_VALIDATION_FAILED' },
        },
      ]),
    );
  const { built: _built, ...pageBefore } = contributorPage;
  const { usesBuild: _usesBuild, ...mineBefore } = skillsMine.publicLearner;
  const { built: _learnerBuilt, ...learnerBefore } = skillsMine.publicLearner.page as NonNullable<
    typeof skillsMine.publicLearner.page
  >;

  it("are asked: the Built rows on the page, and the owner's usesBuild", () => {
    const page = print(documents.SkillsPageDocument);
    for (const field of ['built', 'thing', 'partsOf', 'builtAt', 'gold', 'answeredAll']) expect(page).toContain(field);
    expect(print(documents.SkillsMineDocument)).toContain('usesBuild');
    expect(print(documents.SetSkillsHiddenDocument)).toContain('usesBuild');
  });

  it('are not in the documents for an API that does not know them, which ask everything else as before', () => {
    for (const document of [
      documents.SkillsPageBeforeBuildDocument,
      documents.SkillsMineBeforeBuildDocument,
      documents.SetSkillsHiddenBeforeBuildDocument,
    ]) {
      const query = print(document);
      expect(query).not.toMatch(/\bbuilt\b|usesBuild/);
      expect(query).toContain('indexable');
    }
  });

  it('pass through: the owner reads their built projects', async () => {
    graphqlDirect.mockResolvedValueOnce({ skillsMine: ownerBuildsMine });
    const mine = await data.loadSkillsMine('octocat');
    expect(mine?.page?.built).toEqual([builtRows[0]]);
    expect(mine?.usesBuild).toBe(true);
  });

  it('are read as empty when the answer has none', async () => {
    graphqlDirect.mockResolvedValueOnce({ skillsPage: pageBefore });
    await expect(data.loadSkillsPage('octocat')).resolves.toEqual({ value: contributorPage, failed: false });
    graphqlDirect.mockResolvedValueOnce({ skillsMine: { ...mineBefore, page: learnerBefore } });
    await expect(data.loadSkillsMine('octocat')).resolves.toEqual(skillsMine.publicLearner);
  });

  it('are asked again without them when the API does not know them, and the page still answers', async () => {
    graphqlDirect
      .mockRejectedValueOnce(unknown('built', 'SkillsPage'))
      .mockResolvedValueOnce({ skillsPage: pageBefore });
    await expect(data.loadSkillsPage('octocat')).resolves.toEqual({ value: contributorPage, failed: false });
    expect(graphqlDirect).toHaveBeenLastCalledWith(
      documents.SkillsPageBeforeBuildDocument,
      { login: 'octocat' },
      { source: 'ssr' },
    );
    expect(cacheLife).toHaveBeenCalledExactlyOnceWith({ stale: 300, revalidate: 900, expire: 86_400 });

    graphqlDirect
      .mockRejectedValueOnce(unknown('usesBuild', 'SkillsMine'))
      .mockResolvedValueOnce({ skillsMine: { ...mineBefore, page: learnerBefore } });
    await expect(data.loadSkillsMine('octocat')).resolves.toEqual(skillsMine.publicLearner);
    expect(graphqlDirect).toHaveBeenLastCalledWith(
      documents.SkillsMineBeforeBuildDocument,
      {},
      { source: 'client', githubLogin: 'octocat' },
    );

    graphqlDirect
      .mockRejectedValueOnce(unknown('usesBuild', 'SkillsMine'))
      .mockResolvedValueOnce({ setSkillsHidden: { ...mineBefore, page: learnerBefore } });
    await expect(data.setSkillsHidden('octocat', true)).resolves.toEqual(skillsMine.publicLearner);
    expect(graphqlDirect).toHaveBeenLastCalledWith(
      documents.SetSkillsHiddenBeforeBuildDocument,
      { hidden: true },
      { source: 'client', githubLogin: 'octocat' },
    );
  });

  it('do not hide another failure: it is not asked again', async () => {
    graphqlDirect.mockRejectedValueOnce(new Error('down'));
    await expect(data.loadSkillsPage('octocat')).resolves.toEqual({ value: null, failed: true });
    expect(graphqlDirect).toHaveBeenCalledTimes(1);
  });
});
