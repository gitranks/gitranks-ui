import { beforeEach, describe, expect, it, vi } from 'vitest';

const { graphqlDirect, viewerLogin } = vi.hoisted(() => ({ graphqlDirect: vi.fn(), viewerLogin: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));
vi.mock('@/lib/workspace/contribute.data', () => ({ viewerLogin }));

const { saveLearnSetupAction, startLearnSetupGuessAction } = await import('./setup.actions');
const { SaveLearnSetupDocument, StartLearnSetupGuessDocument } = await import('./setup.documents');
const { setupSaved } = await import('./__fixtures__/setup');

const input = { mainLanguage: 'rust', otherLanguages: ['python', 'go'], level: 2 };
const apiError = (code: string) => new Error(JSON.stringify([{ message: 'no', extensions: { code } }]));

beforeEach(() => {
  graphqlDirect.mockReset();
  viewerLogin.mockReset().mockResolvedValue('octocat');
});

describe("Set up Learn's save", () => {
  it("saves the three fields as the session's user, and answers the saved setup", async () => {
    graphqlDirect.mockResolvedValueOnce({ saveLearnSetup: setupSaved });
    expect(await saveLearnSetupAction(input)).toEqual({ ok: true, data: setupSaved });
    expect(graphqlDirect).toHaveBeenCalledWith(
      SaveLearnSetupDocument,
      { setup: input },
      { source: 'client', githubLogin: 'octocat' },
    );
  });

  it('answers no data when Learn is not open to the person', async () => {
    graphqlDirect.mockResolvedValueOnce({ saveLearnSetup: null });
    expect(await saveLearnSetupAction(input)).toEqual({ ok: true, data: null });
  });

  it('refuses fields the API does not take, and a signed-out person, without asking', async () => {
    for (const bad of [
      null,
      { ...input, mainLanguage: 'typescript' },
      { ...input, level: 5 },
      { ...input, otherLanguages: ['rust'] },
      { ...input, otherLanguages: ['go', 'go'] },
      { ...input, otherLanguages: ['python', 'javascript', 'go', 'java', 'php', 'ruby', 'kotlin'] },
    ]) {
      expect(await saveLearnSetupAction(bad as never)).toEqual({ ok: false, error: 'INVALID' });
    }
    viewerLogin.mockResolvedValueOnce(undefined);
    expect(await saveLearnSetupAction(input)).toEqual({ ok: false, error: 'SIGNED_OUT' });
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it('sends only the three fields, never anything else the call carried', async () => {
    graphqlDirect.mockResolvedValueOnce({ saveLearnSetup: setupSaved });
    await saveLearnSetupAction({ ...input, githubLogin: 'someone-else' } as never);
    expect(graphqlDirect.mock.calls[0][1]).toEqual({ setup: input });
    expect(graphqlDirect.mock.calls[0][2]).toEqual({ source: 'client', githubLogin: 'octocat' });
  });

  it('passes on a refusal and any other failure', async () => {
    graphqlDirect.mockRejectedValueOnce(apiError('BAD_USER_INPUT'));
    expect(await saveLearnSetupAction(input)).toEqual({ ok: false, error: 'INVALID' });
    graphqlDirect.mockRejectedValueOnce(new Error('down'));
    expect(await saveLearnSetupAction(input)).toEqual({ ok: false, error: 'FAILED' });
  });
});

describe("Set up Learn's guess", () => {
  it("starts our guess as the session's user, and answers the setup's state", async () => {
    graphqlDirect.mockResolvedValueOnce({ startLearnSetupGuess: 'WORKING' });
    expect(await startLearnSetupGuessAction()).toEqual({ ok: true, data: 'WORKING' });
    expect(graphqlDirect).toHaveBeenCalledWith(
      StartLearnSetupGuessDocument,
      {},
      { source: 'client', githubLogin: 'octocat' },
    );
    graphqlDirect.mockResolvedValueOnce({ startLearnSetupGuess: null });
    expect(await startLearnSetupGuessAction()).toEqual({ ok: true, data: null });
  });

  it('asks nothing for a signed-out person, and passes on a failure', async () => {
    viewerLogin.mockResolvedValueOnce(undefined);
    expect(await startLearnSetupGuessAction()).toEqual({ ok: false, error: 'SIGNED_OUT' });
    expect(graphqlDirect).not.toHaveBeenCalled();
    graphqlDirect.mockRejectedValueOnce(new Error('down'));
    expect(await startLearnSetupGuessAction()).toEqual({ ok: false, error: 'FAILED' });
  });
});
