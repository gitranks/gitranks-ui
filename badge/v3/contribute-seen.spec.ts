import { beforeEach, describe, expect, it, vi } from 'vitest';

const { signedFetch } = vi.hoisted(() => ({ signedFetch: vi.fn() }));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/signed-fetch', () => ({ signedFetch }));

const { reportContributeBadgeSeen } = await import('./contribute-seen');

describe('reportContributeBadgeSeen', () => {
  beforeEach(() => {
    signedFetch.mockReset();
  });

  it('posts the repository id as the badge surface, with no visitor', async () => {
    signedFetch.mockResolvedValue(new Response(null, { status: 204 }));
    await reportContributeBadgeSeen('R_kgDOAcmeFq');

    expect(signedFetch).toHaveBeenCalledExactlyOnceWith(
      '/ui/contribute-badge-seen',
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"repoId":"R_kgDOAcmeFq"}' },
      'badge',
    );
  });

  it('swallows a failed call', async () => {
    signedFetch.mockRejectedValue(new Error('unreachable'));
    await expect(reportContributeBadgeSeen('R_kgDOAcmeFq')).resolves.toBeUndefined();
  });
});
