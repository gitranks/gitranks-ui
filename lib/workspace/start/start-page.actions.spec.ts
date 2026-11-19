import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const { viewerLogin } = vi.hoisted(() => ({ viewerLogin: vi.fn(async (): Promise<string | null> => 'octocat') }));
vi.mock('@/lib/workspace/contribute.data', () => ({ viewerLogin }));
const data = vi.hoisted(() => ({ startPageViewOf: vi.fn(), startPageAttemptOf: vi.fn() }));
vi.mock('./start-page.data', () => data);

const { readStartPageAttempt, readStartPageIssue } = await import('./start-page.actions');

const VIEWER = { source: 'client', githubLogin: 'octocat' };

describe("the Start page's actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    data.startPageViewOf.mockResolvedValue({ ok: true, data: 'view' });
    data.startPageAttemptOf.mockResolvedValue({ ok: true, data: null });
  });

  it('ask as the session’s user, for the issue the page names, in its mode', async () => {
    expect(await readStartPageIssue('driftwood-js/driftwood', 934, 'fix')).toEqual({ ok: true, data: 'view' });
    expect(data.startPageViewOf).toHaveBeenLastCalledWith(VIEWER, 'driftwood-js/driftwood', 934, 'fix');
    expect(await readStartPageIssue('driftwood-js/driftwood', 934, 'lesson')).toEqual({ ok: true, data: 'view' });
    expect(data.startPageViewOf).toHaveBeenLastCalledWith(VIEWER, 'driftwood-js/driftwood', 934, 'lesson');
    expect(await readStartPageAttempt('driftwood-js/driftwood', 934)).toEqual({ ok: true, data: null });
    expect(data.startPageAttemptOf).toHaveBeenCalledWith(VIEWER, 'driftwood-js/driftwood', 934);
  });

  it('take nothing but an issue as the address names one, in a mode the page has', async () => {
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
      expect(await readStartPageIssue(repo as never, number as never, 'fix')).toMatchObject({ error: 'INVALID' });
      expect(await readStartPageAttempt(repo as never, number as never)).toMatchObject({ error: 'INVALID' });
    }
    expect(await readStartPageIssue('driftwood-js/driftwood', 934, 'learn' as never)).toMatchObject({
      error: 'INVALID',
    });
    expect(data.startPageViewOf).not.toHaveBeenCalled();
    expect(data.startPageAttemptOf).not.toHaveBeenCalled();
  });

  it('answer a signed-out visitor so', async () => {
    viewerLogin.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    expect(await readStartPageIssue('driftwood-js/driftwood', 934, 'fix')).toEqual({ ok: false, error: 'SIGNED_OUT' });
    expect(await readStartPageAttempt('driftwood-js/driftwood', 934)).toEqual({ ok: false, error: 'SIGNED_OUT' });
  });
});
