import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { connection, redirect, viewerLogin, loadLearnSign, loadLearnSetup, loadContributeSetupState } = vi.hoisted(
  () => ({
    connection: vi.fn(async () => undefined),
    redirect: vi.fn((to: string) => {
      throw Object.assign(new Error('NEXT_REDIRECT'), { to });
    }),
    viewerLogin: vi.fn(async (): Promise<string | null> => 'octocat'),
    loadLearnSign: vi.fn(async (): Promise<boolean | null> => false),
    loadLearnSetup: vi.fn(async (): Promise<{ state: string } | null> => null),
    loadContributeSetupState: vi.fn(async (): Promise<string> => 'none'),
  }),
);
vi.mock('next/server', async (original) => ({ ...(await original<object>()), connection }));
vi.mock('next/navigation', () => ({ redirect }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/workspace/contribute.data', () => ({ viewerLogin, loadContributeSetupState }));
vi.mock('@/lib/learn/learn-sign.data', () => ({ loadLearnSign }));
vi.mock('@/lib/learn/setup.data', () => ({ loadLearnSetup }));
vi.mock('@/components/learn/setup/setup-live', () => ({ SetupLive: () => null }));
vi.mock('@/components/learn/setup/setup-no-profile', () => ({ OnboardingNoProfile: () => null }));

const { default: SetupPage, metadata } = await import('./page');
const { OnboardingNoProfile } = await import('@/components/learn/setup/setup-no-profile');

type Drawn = { mode: string; back: string | null } | { noProfile: string };
const LESSON = '/learn/lessons/hash-maps';

/** The page for an address's `back`: what it draws, or where it sends the person. */
async function open(back?: string | string[]): Promise<Drawn | { redirect: string }> {
  try {
    const page = (await SetupPage({
      params: Promise.resolve({}),
      searchParams: Promise.resolve(back === undefined ? {} : { back }),
    } as never)) as ReactElement<{ mode: string; back: string | null; state: string }>;
    if (page.type === OnboardingNoProfile) return { noProfile: page.props.state };
    return { mode: page.props.mode, back: page.props.back };
  } catch (error) {
    const to = (error as { to?: string }).to;
    if (to) return { redirect: to };
    throw error;
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  viewerLogin.mockResolvedValue('octocat');
  loadLearnSign.mockResolvedValue(false);
  loadLearnSetup.mockResolvedValue(null);
  loadContributeSetupState.mockResolvedValue('none');
});

describe("Learn's setup page", () => {
  it('is the person’s own: never indexed', () => {
    expect(metadata).toEqual({ title: 'Set up Learn', robots: { index: false, follow: false } });
  });

  it('is drawn for each request, the address read only after it', async () => {
    await open();
    expect(connection).toHaveBeenCalled();
    expect(connection.mock.invocationCallOrder[0]).toBeLessThan(viewerLogin.mock.invocationCallOrder[0]);
  });

  it("tells a company-managed account it can't be used, never that its setup did not load", async () => {
    loadLearnSign.mockResolvedValue(null);
    loadContributeSetupState.mockResolvedValue('managed');
    expect(await open('/learn')).toEqual({ noProfile: 'managed' });
    // Even with a setup read back: the account still can't be used.
    loadLearnSetup.mockResolvedValue({ state: 'SAVED' });
    expect(await open('/learn')).toEqual({ noProfile: 'managed' });
  });

  it('draws the onboarding without the Learn sign, keeping a way back it takes', async () => {
    expect(await open(LESSON)).toEqual({ mode: 'onboarding', back: LESSON });
    expect(await open([LESSON, '/learn/courses'])).toEqual({ mode: 'onboarding', back: LESSON });
    expect(await open('https://evil.example')).toEqual({ mode: 'onboarding', back: null });
    expect(await open('/my/settings')).toEqual({ mode: 'onboarding', back: null });
    expect(loadLearnSetup).not.toHaveBeenCalled();
  });

  it('draws the editor with the sign, or sends the person straight back when a page sent them', async () => {
    loadLearnSign.mockResolvedValue(true);
    expect(await open()).toEqual({ mode: 'editor', back: null });
    expect(await open(LESSON)).toEqual({ redirect: LESSON });
    expect(await open('//evil.example')).toEqual({ mode: 'editor', back: null });
  });

  it('keeps the rule before the sign when the sign cannot be read, and never sends the person back', async () => {
    loadLearnSign.mockResolvedValue(null);
    loadLearnSetup.mockResolvedValue({ state: 'SAVED' });
    expect(await open(LESSON)).toEqual({ mode: 'editor', back: LESSON });
    loadLearnSetup.mockResolvedValue({ state: 'GUESSED' });
    expect(await open(LESSON)).toEqual({ mode: 'onboarding', back: LESSON });
    expect(redirect).not.toHaveBeenCalled();
  });

  it('gives the editor when neither the sign nor the setup can be read, so nothing saved is written over', async () => {
    loadLearnSign.mockResolvedValue(null);
    loadLearnSetup.mockResolvedValue(null);
    expect(await open(LESSON)).toEqual({ mode: 'editor', back: LESSON });
    expect(redirect).not.toHaveBeenCalled();
  });

  it('hands the page the sign it read, so it knows when a setup may be there', async () => {
    const signOf = async () =>
      (
        (await SetupPage({ params: Promise.resolve({}), searchParams: Promise.resolve({}) } as never)) as ReactElement<{
          sign: boolean | null;
        }>
      ).props.sign;
    expect(await signOf()).toBe(false);
    loadLearnSign.mockResolvedValue(null);
    loadLearnSetup.mockResolvedValue({ state: 'GUESSED' });
    expect(await signOf()).toBeNull();
  });

  it('draws the sign-in card for a visitor, reading nothing of them', async () => {
    viewerLogin.mockResolvedValue(null);
    expect(await open(LESSON)).toEqual({ mode: 'visitor', back: LESSON });
    expect(loadLearnSign).not.toHaveBeenCalled();
    expect(loadLearnSetup).not.toHaveBeenCalled();
    expect(loadContributeSetupState).not.toHaveBeenCalled();
  });

  describe('an account with no profile yet: neither the sign nor the setup answers', () => {
    beforeEach(() => {
      loadLearnSign.mockResolvedValue(null);
      loadLearnSetup.mockResolvedValue(null);
    });

    it('shows the setting-up panel while its first read is on its way, and sends nobody on', async () => {
      loadContributeSetupState.mockResolvedValue('setting-up');
      expect(await open(LESSON)).toEqual({ noProfile: 'setting-up' });
      expect(redirect).not.toHaveBeenCalled();
    });

    it('shows Try again once that read failed', async () => {
      loadContributeSetupState.mockResolvedValue('failed');
      expect(await open(LESSON)).toEqual({ noProfile: 'failed' });
    });

    it('says Learn is not open to an account GitRanks does not read', async () => {
      loadContributeSetupState.mockResolvedValue('removed');
      expect(await open()).toEqual({ noProfile: 'removed' });
    });

    it('draws the page as before when nothing is left to set up', async () => {
      loadContributeSetupState.mockResolvedValue('none');
      expect(await open(LESSON)).toEqual({ mode: 'editor', back: LESSON });
    });

    it('reads the state only when the sign cannot be read, after the request is known', async () => {
      loadContributeSetupState.mockResolvedValue('setting-up');
      await open();
      expect(connection.mock.invocationCallOrder[0]).toBeLessThan(loadContributeSetupState.mock.invocationCallOrder[0]);
      loadContributeSetupState.mockClear();
      loadLearnSign.mockResolvedValue(false);
      expect(await open(LESSON)).toEqual({ mode: 'onboarding', back: LESSON });
      loadLearnSign.mockResolvedValue(true);
      expect(await open()).toEqual({ mode: 'editor', back: null });
      expect(loadContributeSetupState).not.toHaveBeenCalled();
    });

    it('draws the page as before when the setup answers, whatever the state reads', async () => {
      loadContributeSetupState.mockResolvedValue('failed');
      loadLearnSetup.mockResolvedValue({ state: 'GUESSED' });
      expect(await open(LESSON)).toEqual({ mode: 'onboarding', back: LESSON });
    });
  });
});
