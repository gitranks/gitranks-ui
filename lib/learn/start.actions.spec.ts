import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/auth', () => ({ auth: vi.fn(), signIn: vi.fn() }));
const { viewerLogin } = vi.hoisted(() => ({ viewerLogin: vi.fn(async (): Promise<string | null> => 'octocat') }));
vi.mock('@/lib/workspace/contribute.data', () => ({ viewerLogin }));
const data = vi.hoisted(() => ({ learnStartViewOf: vi.fn(), learnStartAttemptOf: vi.fn() }));
vi.mock('@/lib/learn/learn-start.data', () => data);

const { readLearnStartAttempt, readLearnStartIssue } = await import('./actions');

describe("the start page's actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    data.learnStartViewOf.mockResolvedValue({ ok: true, data: 'view' });
    data.learnStartAttemptOf.mockResolvedValue({ ok: true, data: null });
  });

  it('ask as the session’s user, for the issue the page names', async () => {
    expect(await readLearnStartIssue('driftwood-js/driftwood', 934)).toEqual({ ok: true, data: 'view' });
    expect(data.learnStartViewOf).toHaveBeenCalledWith(
      { source: 'client', githubLogin: 'octocat' },
      'driftwood-js/driftwood',
      934,
    );
    expect(await readLearnStartAttempt('driftwood-js/driftwood', 934)).toEqual({ ok: true, data: null });
    expect(data.learnStartAttemptOf).toHaveBeenCalledWith(
      { source: 'client', githubLogin: 'octocat' },
      'driftwood-js/driftwood',
      934,
    );
  });

  it('take nothing but an issue as the address names one', async () => {
    for (const [repo, number] of [
      ['driftwood-js', 934],
      ['driftwood-js/driftwood/x', 934],
      ['../x', 934],
      ['driftwood-js/driftwood', 0],
      ['driftwood-js/driftwood', 1.5],
      [42, 934],
      ['driftwood-js/driftwood', '934'],
    ] as const) {
      // Values the browser could send, whatever the types say.
      expect(await readLearnStartIssue(repo as never, number as never)).toMatchObject({ ok: false, error: 'INVALID' });
      expect(await readLearnStartAttempt(repo as never, number as never)).toMatchObject({
        ok: false,
        error: 'INVALID',
      });
    }
    expect(data.learnStartViewOf).not.toHaveBeenCalled();
    expect(data.learnStartAttemptOf).not.toHaveBeenCalled();
  });

  it('answer a signed-out visitor so', async () => {
    viewerLogin.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    expect(await readLearnStartIssue('driftwood-js/driftwood', 934)).toEqual({ ok: false, error: 'SIGNED_OUT' });
    expect(await readLearnStartAttempt('driftwood-js/driftwood', 934)).toEqual({ ok: false, error: 'SIGNED_OUT' });
  });
});
