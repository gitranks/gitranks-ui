import { print } from 'graphql';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const { cacheLife, graphqlDirect } = vi.hoisted(() => ({ cacheLife: vi.fn(), graphqlDirect: vi.fn() }));
vi.mock('next/cache', () => ({ cacheLife }));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));
const contribute = vi.hoisted(() => ({
  viewerLogin: vi.fn(async (): Promise<string | null> => 'octocat'),
  ContributeUnavailableError: class ContributeUnavailableError extends Error {},
}));
vi.mock('@/lib/workspace/contribute.data', () => contribute);
vi.mock('@/lib/workspace/gate.data', () => ({ loadWorkspaceGate: vi.fn() }));
vi.mock('@/lib/workspace/preview-gate', () => ({ contributeOpen: vi.fn(async () => true) }));
vi.mock('./learn-everyone', () => ({ learnOpenToEveryone: vi.fn(async () => false) }));

const { loadLearnIssues } = await import('./learn.data');
const { readLearnPublicIssues } = await import('./start-flow.data');
const { learnIssues } = await import('./__fixtures__/home');
const { maskedIssue } = await import('@/lib/workspace/__fixtures__/masked-issue');

const nameOf = (document: unknown) => /(?:query|mutation) (\w+)/.exec(print(document as never))?.[1] ?? '';
const asked = () => graphqlDirect.mock.calls.map(([document]) => nameOf(document));

/** Answers each read by its operation's name; an Error is thrown. */
const answer = (answers: Record<string, unknown>) =>
  graphqlDirect.mockImplementation(async (document) => {
    const value = answers[nameOf(document)];
    if (value instanceof Error) throw value;
    return value;
  });

/** Today's API, which does not know the masked form: what GraphQL answers a query for it. */
const todaysAnswerTo = (type: string) =>
  new Error(JSON.stringify([{ message: `Cannot query field "masked" on type "${type}".` }]));
const outage = () => new Error('fetch failed');

beforeEach(() => {
  graphqlDirect.mockReset();
  cacheLife.mockReset();
  contribute.viewerLogin.mockResolvedValue('octocat');
});

describe("Learn's list for the viewer's goal, with masked issues", () => {
  it('reads each issue with its masked form, in an operation of its own, keyed by its mask id', async () => {
    const named = learnIssues().items[1];
    const list = { ...learnIssues(), items: [{ ...learnIssues().items[0], masked: maskedIssue() }, named] };
    answer({ LearnIssuesMasked: { learnIssues: list } });
    expect(await loadLearnIssues(10)).toEqual({
      ...list,
      items: [
        {
          ...list.items[0],
          issueId: 'mask:q7k2m9xa',
          url: '',
          repo: '',
          number: 0,
          title: maskedIssue().title,
          why: null,
        },
        named,
      ],
    });
    expect(asked()).toEqual(['LearnIssuesMasked']);
  });

  it('keeps nothing that names a masked issue, whatever the API sent beside its masked form', async () => {
    const leaky = {
      issueId: 'I_kwDOsecret',
      url: 'https://github.com/secret-org/secret-repo/issues/4242',
      repo: 'secret-org/secret-repo',
      number: 4242,
      title: 'Secret title of the real issue',
      language: 'Go',
      size: 'S',
      why: 'secret reason',
      masked: maskedIssue(),
    };
    answer({ LearnIssuesMasked: { learnIssues: { ...learnIssues(), items: [leaky] } } });
    const read = JSON.stringify(await loadLearnIssues(13));
    for (const secret of ['secret', '4242', 'I_kwDO']) expect(read).not.toContain(secret);
    expect(read).toContain('"issueId":"mask:q7k2m9xa"');
  });

  it("reads today's list from an API that does not know the masked form", async () => {
    const today = learnIssues();
    answer({ LearnIssuesMasked: todaysAnswerTo('LearnIssue'), LearnIssues: { learnIssues: today } });
    expect(await loadLearnIssues(11)).toEqual(today);
    expect(asked()).toEqual(['LearnIssuesMasked', 'LearnIssues']);
  });

  it('is not read on an outage, never taken for an API without the field', async () => {
    answer({ LearnIssuesMasked: outage(), LearnIssues: { learnIssues: learnIssues() } });
    expect(await loadLearnIssues(12)).toBeUndefined();
    expect(asked()).toEqual(['LearnIssuesMasked']);
  });
});

describe("a visitor's day list, with masked issues", () => {
  it('reads each issue with its masked form, without a viewer', async () => {
    const list = {
      language: 'Go',
      items: [{ title: null, repo: null, number: null, masked: maskedIssue() }],
      total: 9,
    };
    answer({ LearnPublicIssuesMasked: { learnPublicIssues: list } });
    expect(await readLearnPublicIssues('Go')).toEqual({
      ok: true,
      data: {
        ...list,
        items: [{ title: maskedIssue().title, repo: '', number: 0, url: '', why: null, masked: maskedIssue() }],
      },
    });
    expect(asked()).toEqual(['LearnPublicIssuesMasked']);
    expect(graphqlDirect.mock.calls[0][2]).toEqual({ source: 'ssr' });
  });

  it("reads today's day list from an API that does not know the masked form", async () => {
    const today = { language: 'Go', items: [], total: 9 };
    answer({
      LearnPublicIssuesMasked: todaysAnswerTo('LearnPublicIssue'),
      LearnPublicIssues: { learnPublicIssues: today },
    });
    expect(await readLearnPublicIssues('Go')).toEqual({ ok: true, data: today });
    expect(asked()).toEqual(['LearnPublicIssuesMasked', 'LearnPublicIssues']);
    expect(cacheLife).toHaveBeenCalledExactlyOnceWith('minutes');
  });

  it('says the read failed on an outage, kept for seconds', async () => {
    answer({ LearnPublicIssuesMasked: outage() });
    expect(await readLearnPublicIssues('Go')).toEqual({ ok: false });
    expect(asked()).toEqual(['LearnPublicIssuesMasked']);
    expect(cacheLife).toHaveBeenCalledExactlyOnceWith('seconds');
  });
});
