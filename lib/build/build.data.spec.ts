import { beforeEach, describe, expect, it, vi } from 'vitest';

const { graphqlDirect, cacheLife, cacheTag } = vi.hoisted(() => ({
  graphqlDirect: vi.fn(),
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ cacheLife, cacheTag }));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));

const { loadBuildProjects, loadBuildProjectsMine } = await import('./projects.data');
const { loadBuildProject, loadBuildProjectMine } = await import('./project.data');
const { loadBuildAddress, loadBuildStep, loadBuildStepMine } = await import('./step.data');
const { loadBuildBar } = await import('./build-bar.data');
const { loadBuildHome } = await import('./home.data');
const { loadBuildStart } = await import('./start.data');
const { loadBuildMine, removeBuild } = await import('./mine.data');
const { answerBuildTest, buildTestOf, loadBuildTest, startBuildTest } = await import('./test.data');
const { buildProjectsFew } = await import('./__fixtures__/projects');
const { mcpServerProject } = await import('./__fixtures__/project');
const { listTheToolsStep } = await import('./__fixtures__/step');
const { barTwoTests, homeBuilder, mineFull, projectMineTwo, startFresh, stepMineTwo } = await import(
  './__fixtures__/builds'
);
const { endTestOpen, testRun } = await import('./__fixtures__/test');

const apiError = (code: string) => new Error(JSON.stringify([{ message: 'no', extensions: { code } }]));
const unknownField = new Error(JSON.stringify([{ message: 'Cannot query field "buildProjects" on type "Query".' }]));

beforeEach(() => {
  graphqlDirect.mockReset();
  cacheLife.mockClear();
  cacheTag.mockClear();
});

describe('the public reads, cached for everyone and never throwing', () => {
  it('keeps the projects for hours under the list’s tag, and an empty list or a failure for minutes', async () => {
    graphqlDirect.mockResolvedValueOnce({ buildProjects: buildProjectsFew });
    expect(await loadBuildProjects()).toEqual(buildProjectsFew);
    expect(cacheTag).toHaveBeenLastCalledWith('build:projects');
    expect(cacheLife).toHaveBeenLastCalledWith('hours');
    expect(graphqlDirect.mock.calls[0][2]).toEqual({ source: 'ssr' });

    graphqlDirect.mockResolvedValueOnce({ buildProjects: [] });
    expect(await loadBuildProjects()).toEqual([]);
    expect(cacheLife).toHaveBeenLastCalledWith('minutes');

    graphqlDirect.mockRejectedValueOnce(unknownField);
    expect(await loadBuildProjects()).toEqual([]);
    expect(cacheLife).toHaveBeenLastCalledWith('minutes');
  });

  it('keeps a project for hours under its tag and the list’s; none for minutes; a bad slug asks nothing', async () => {
    graphqlDirect.mockResolvedValueOnce({ buildProject: mcpServerProject });
    expect(await loadBuildProject('mcp-server')).toEqual(mcpServerProject);
    expect(cacheTag).toHaveBeenLastCalledWith('build:project:mcp-server', 'build:projects');
    expect(cacheLife).toHaveBeenLastCalledWith('hours');

    graphqlDirect.mockRejectedValueOnce(new Error('down'));
    expect(await loadBuildProject('mcp-server')).toBeNull();
    expect(cacheLife).toHaveBeenLastCalledWith('minutes');

    graphqlDirect.mockClear();
    expect(await loadBuildProject('mine')).toBeNull();
    expect(await loadBuildProject('Not A Slug')).toBeNull();
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it('keeps a step for hours under its tag and its project’s; none for minutes', async () => {
    graphqlDirect.mockResolvedValueOnce({ buildStep: listTheToolsStep });
    expect(await loadBuildStep('mcp-server', 'list-the-tools')).toEqual(listTheToolsStep);
    expect(cacheTag).toHaveBeenLastCalledWith('build:step:mcp-server:list-the-tools', 'build:project:mcp-server');
    expect(cacheLife).toHaveBeenLastCalledWith('hours');

    graphqlDirect.mockResolvedValueOnce({ buildStep: null });
    expect(await loadBuildStep('mcp-server', 'list-the-tools')).toBeNull();
    expect(cacheLife).toHaveBeenLastCalledWith('minutes');

    graphqlDirect.mockClear();
    expect(await loadBuildStep('mcp-server', 'test')).toBeNull();
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it('tells whether an address is there: missing for slugs no page can have, null when the read fails', async () => {
    graphqlDirect.mockResolvedValueOnce({ buildAddress: { state: 'removed' } });
    expect(await loadBuildAddress('mcp-server', 'list-the-tools')).toEqual({ state: 'removed' });
    expect(graphqlDirect.mock.calls[0][1]).toEqual({ project: 'mcp-server', step: 'list-the-tools' });
    expect(cacheLife).toHaveBeenLastCalledWith('minutes');

    graphqlDirect.mockResolvedValueOnce({ buildAddress: { state: 'live' } });
    expect(await loadBuildAddress('mcp-server')).toEqual({ state: 'live' });
    expect(graphqlDirect.mock.calls[1][1]).toEqual({ project: 'mcp-server', step: null });

    graphqlDirect.mockRejectedValueOnce(new Error('down'));
    expect(await loadBuildAddress('mcp-server')).toBeNull();

    graphqlDirect.mockClear();
    expect(await loadBuildAddress('projects')).toEqual({ state: 'missing' });
    expect(await loadBuildAddress('mcp-server', 'gold')).toEqual({ state: 'missing' });
    expect(graphqlDirect).not.toHaveBeenCalled();
  });
});

describe("the person's own reads, never kept and never throwing", () => {
  const reads: [string, () => Promise<unknown>, string, unknown][] = [
    ['the bar', () => loadBuildBar('octocat'), 'buildBar', barTwoTests],
    ['home', () => loadBuildHome('octocat'), 'buildHome', homeBuilder],
    ['my builds', () => loadBuildMine('octocat'), 'buildMine', mineFull],
    ['the builds of every project', () => loadBuildProjectsMine('octocat'), 'buildProjectsMine', []],
    ['a project', () => loadBuildProjectMine('mcp-server', 'octocat'), 'buildProjectMine', projectMineTwo],
    ['a step', () => loadBuildStepMine('mcp-server', 'list-the-tools', 'octocat'), 'buildStepMine', stepMineTwo],
    ['the start flow', () => loadBuildStart('octocat', 'mcp-server'), 'buildStart', startFresh],
    [
      'a test',
      () => loadBuildTest('octocat', { project: 'mcp-server', kind: 'end', language: null }),
      'buildTest',
      endTestOpen,
    ],
  ];

  it.each(reads)('reads %s as the session’s person, and answers null on any failure', async (_, read, field, value) => {
    graphqlDirect.mockResolvedValueOnce({ [field]: value });
    expect(await read()).toEqual(value);
    expect(graphqlDirect.mock.calls[0][2]).toEqual({ source: 'ssr', githubLogin: 'octocat' });

    graphqlDirect.mockResolvedValueOnce({ [field]: null });
    expect(await read()).toBeNull();
    graphqlDirect.mockRejectedValueOnce(unknownField);
    expect(await read()).toBeNull();
    expect(cacheLife).not.toHaveBeenCalled();
  });

  it('asks nothing for slugs no project or step can have', async () => {
    expect(await loadBuildProjectMine('about', 'octocat')).toBeNull();
    expect(await loadBuildStepMine('mcp-server', 'gold', 'octocat')).toBeNull();
    expect(await loadBuildStart('octocat', 'NOPE')).toBeNull();
    expect(graphqlDirect).not.toHaveBeenCalled();
  });
});

describe("the person's writes", () => {
  it('reads which test is asked for, and nothing not of the shape', () => {
    expect(buildTestOf({ project: 'mcp-server', kind: 'gold' })).toEqual({
      project: 'mcp-server',
      kind: 'gold',
      language: null,
    });
    expect(buildTestOf({ project: 'mcp-server', kind: 'end', language: 'python' })?.language).toBe('python');
    expect(buildTestOf({ project: 'mcp-server', kind: 'silver' })).toBeNull();
    expect(buildTestOf({ project: 'mcp-server', kind: 'end', language: 'go' })).toBeNull();
    expect(buildTestOf({ project: 'test', kind: 'end' })).toBeNull();
    expect(buildTestOf({ kind: 'end' })).toBeNull();
  });

  it('starts a run as the session’s person, and names why one was refused', async () => {
    graphqlDirect.mockResolvedValueOnce({ startBuildTest: testRun });
    expect(await startBuildTest('octocat', { project: 'mcp-server', kind: 'end' })).toEqual({
      ok: true,
      data: testRun,
    });
    expect(graphqlDirect.mock.calls[0][2]).toEqual({ source: 'client', githubLogin: 'octocat' });

    graphqlDirect.mockRejectedValueOnce(apiError('CONFLICT'));
    expect(await startBuildTest('octocat', { project: 'mcp-server', kind: 'end' })).toEqual({
      ok: false,
      error: 'CONFLICT',
    });
    graphqlDirect.mockRejectedValueOnce(unknownField);
    expect(await startBuildTest('octocat', { project: 'mcp-server', kind: 'end' })).toEqual({
      ok: false,
      error: 'FAILED',
    });
    graphqlDirect.mockClear();
    expect(await startBuildTest('octocat', { project: 'mcp-server', kind: 'silver' })).toEqual({
      ok: false,
      error: 'INVALID',
    });
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it('sends an answer, "I don\'t know" as null, and refuses a pick not of the shape before asking', async () => {
    graphqlDirect.mockResolvedValueOnce({ answerBuildTest: { run: testRun, result: null } });
    expect(await answerBuildTest('octocat', { run: 'r-1', question: 't-stderr', pick: 1 })).toEqual({
      ok: true,
      data: { run: testRun, result: null },
    });
    graphqlDirect.mockResolvedValueOnce({ answerBuildTest: { run: testRun, result: null } });
    await answerBuildTest('octocat', { run: 'r-1', question: 't-stderr', pick: null });
    expect(graphqlDirect.mock.calls[1][1]).toEqual({ run: 'r-1', question: 't-stderr', pick: null });

    graphqlDirect.mockClear();
    for (const input of [
      { run: 'r-1', question: 't-stderr', pick: 4 },
      { run: 'r-1', question: 't-stderr', pick: 1.5 },
      { run: 'r-1', question: 't-stderr', pick: '1' },
      { run: 'r 1', question: 't-stderr', pick: 1 },
      { run: 'r-1', question: '', pick: 1 },
    ]) {
      expect(await answerBuildTest('octocat', input)).toEqual({ ok: false, error: 'INVALID' });
    }
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it('removes a build, and names a refusal', async () => {
    graphqlDirect.mockResolvedValueOnce({ removeBuild: true });
    expect(await removeBuild('octocat', 'b-mcp-ts')).toEqual({ ok: true, data: true });
    graphqlDirect.mockRejectedValueOnce(apiError('BAD_USER_INPUT'));
    expect(await removeBuild('octocat', 'b-mcp-ts')).toEqual({ ok: false, error: 'INVALID' });
    graphqlDirect.mockRejectedValueOnce(apiError('NOT_FOUND'));
    expect(await removeBuild('octocat', 'b-mcp-ts')).toEqual({ ok: false, error: 'NOT_FOUND' });
    expect(await removeBuild('octocat', { $ne: null })).toEqual({ ok: false, error: 'INVALID' });
  });
});
