import { beforeEach, describe, expect, it, vi } from 'vitest';

const { graphqlDirect, viewerLogin } = vi.hoisted(() => ({ graphqlDirect: vi.fn(), viewerLogin: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));
vi.mock('@/lib/workspace/contribute.data', () => ({ viewerLogin }));

const { saveLearnEmailSettingsAction } = await import('./settings.actions');
const { loadLearnEmailSettings, loadLearnSetupForSettings } = await import('./settings.data');
const { LearnEmailSettingsDocument, SaveLearnEmailSettingsDocument } = await import('./settings.documents');
const { LearnSetupOfMineDocument } = await import('./setup.documents');
const { learnEmail } = await import('./__fixtures__/settings');
const { setupSaved } = await import('./__fixtures__/setup');

const apiError = (code: string) => new Error(JSON.stringify([{ message: 'no', extensions: { code } }]));

beforeEach(() => {
  graphqlDirect.mockReset();
  viewerLogin.mockReset().mockResolvedValue('octocat');
});

describe("the save of Learn's email settings", () => {
  it("saves the switch alone as the session's user, and answers the settings", async () => {
    graphqlDirect.mockResolvedValueOnce({ saveLearnEmailSettings: learnEmail.on });
    expect(await saveLearnEmailSettingsAction({ lessonsToRepeat: true })).toEqual({ ok: true, data: learnEmail.on });
    expect(graphqlDirect).toHaveBeenCalledWith(
      SaveLearnEmailSettingsDocument,
      { settings: { lessonsToRepeat: true } },
      { source: 'client', githubLogin: 'octocat' },
    );
  });

  it("sends a zone as the person's, and the device's hand-back alone", async () => {
    graphqlDirect.mockResolvedValue({ saveLearnEmailSettings: learnEmail.chosen });
    await saveLearnEmailSettingsAction({ timeZone: 'Europe/Berlin', timeZoneBy: 'PERSON' });
    await saveLearnEmailSettingsAction({ timeZoneBy: 'DEVICE' });
    expect(graphqlDirect.mock.calls.map((call) => call[1])).toEqual([
      { settings: { timeZone: 'Europe/Berlin', timeZoneBy: 'PERSON' } },
      { settings: { timeZoneBy: 'DEVICE' } },
    ]);
  });

  it('refuses a save not of that shape, and a signed-out person, without asking', async () => {
    for (const bad of [null, {}, { lessonsToRepeat: 'on' }, { timeZone: '+02:00' }, { timeZoneBy: 'PERSON' }]) {
      expect(await saveLearnEmailSettingsAction(bad)).toEqual({ ok: false, error: 'INVALID' });
    }
    viewerLogin.mockResolvedValueOnce(null);
    expect(await saveLearnEmailSettingsAction({ lessonsToRepeat: true })).toEqual({ ok: false, error: 'SIGNED_OUT' });
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it('answers no data when Learn is not open, and a failure for an answer out of shape', async () => {
    graphqlDirect.mockResolvedValueOnce({ saveLearnEmailSettings: null });
    expect(await saveLearnEmailSettingsAction({ lessonsToRepeat: true })).toEqual({ ok: true, data: null });
    graphqlDirect.mockResolvedValueOnce({ saveLearnEmailSettings: { lessonsToRepeat: 'yes' } });
    expect(await saveLearnEmailSettingsAction({ lessonsToRepeat: true })).toEqual({ ok: false, error: 'FAILED' });
  });

  it('passes on a refusal and any other failure', async () => {
    graphqlDirect.mockRejectedValueOnce(apiError('BAD_USER_INPUT'));
    expect(await saveLearnEmailSettingsAction({ lessonsToRepeat: true })).toEqual({ ok: false, error: 'INVALID' });
    graphqlDirect.mockRejectedValueOnce(new Error('down'));
    expect(await saveLearnEmailSettingsAction({ lessonsToRepeat: true })).toEqual({ ok: false, error: 'FAILED' });
  });
});

describe("Settings' reads of Learn's rows", () => {
  it("reads the person's own, and tells not open (null) from a failure (undefined)", async () => {
    graphqlDirect.mockResolvedValueOnce({ learnEmailSettings: learnEmail.device });
    expect(await loadLearnEmailSettings('octocat')).toEqual(learnEmail.device);
    expect(graphqlDirect).toHaveBeenCalledWith(
      LearnEmailSettingsDocument,
      {},
      { source: 'ssr', githubLogin: 'octocat' },
    );
    graphqlDirect.mockResolvedValueOnce({ learnEmailSettings: null });
    expect(await loadLearnEmailSettings('octocat')).toBeNull();
    graphqlDirect.mockResolvedValueOnce({ learnEmailSettings: { lessonsToRepeat: true } });
    expect(await loadLearnEmailSettings('octocat')).toBeUndefined();
    graphqlDirect.mockRejectedValueOnce(new Error('down'));
    expect(await loadLearnEmailSettings('octocat')).toBeUndefined();
  });

  it('reads the setup the same way', async () => {
    graphqlDirect.mockResolvedValueOnce({ learnSetupOfMine: setupSaved });
    expect(await loadLearnSetupForSettings('octocat')).toEqual(setupSaved);
    expect(graphqlDirect).toHaveBeenCalledWith(LearnSetupOfMineDocument, {}, { source: 'ssr', githubLogin: 'octocat' });
    graphqlDirect.mockResolvedValueOnce({ learnSetupOfMine: null });
    expect(await loadLearnSetupForSettings('octocat')).toBeNull();
    graphqlDirect.mockRejectedValueOnce(new Error('down'));
    expect(await loadLearnSetupForSettings('octocat')).toBeUndefined();
  });
});
