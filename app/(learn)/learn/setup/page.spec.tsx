import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { connection, redirect, viewerLogin, loadLearnSign, loadLearnSetup } = vi.hoisted(() => ({
  connection: vi.fn(async () => undefined),
  redirect: vi.fn((to: string) => {
    throw Object.assign(new Error('NEXT_REDIRECT'), { to });
  }),
  viewerLogin: vi.fn(async (): Promise<string | null> => 'octocat'),
  loadLearnSign: vi.fn(async (): Promise<boolean | null> => false),
  loadLearnSetup: vi.fn(async (): Promise<{ state: string } | null> => null),
}));
vi.mock('next/server', async (original) => ({ ...(await original<object>()), connection }));
vi.mock('next/navigation', () => ({ redirect }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/workspace/contribute.data', () => ({ viewerLogin }));
vi.mock('@/lib/learn/learn-sign.data', () => ({ loadLearnSign }));
vi.mock('@/lib/learn/setup.data', () => ({ loadLearnSetup }));
vi.mock('@/components/learn/setup/setup-live', () => ({ SetupLive: () => null }));

const { default: SetupPage, metadata } = await import('./page');

type Drawn = { mode: string; back: string | null };
const LESSON = '/learn/lessons/hash-maps';

/** The page for an address's `back`: what it draws, or where it sends the person. */
async function open(back?: string | string[]): Promise<Drawn | { redirect: string }> {
  try {
    const page = (await SetupPage({
      params: Promise.resolve({}),
      searchParams: Promise.resolve(back === undefined ? {} : { back }),
    } as never)) as ReactElement<Drawn>;
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
    loadLearnSetup.mockResolvedValue(null);
    expect(await open()).toEqual({ mode: 'onboarding', back: null });
    expect(redirect).not.toHaveBeenCalled();
  });

  it('reads nothing of a visitor: the page asks them to sign in itself', async () => {
    viewerLogin.mockResolvedValue(null);
    expect(await open(LESSON)).toEqual({ mode: 'onboarding', back: LESSON });
    expect(loadLearnSign).not.toHaveBeenCalled();
    expect(loadLearnSetup).not.toHaveBeenCalled();
  });
});
