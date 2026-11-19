import { beforeEach, describe, expect, it, vi } from 'vitest';

const { auth, graphqlDirect } = vi.hoisted(() => ({ auth: vi.fn(), graphqlDirect: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/auth', () => ({ auth }));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));

const { approveContributeOAuthAsReviewer } = await import('./review-sign-in.actions');
const { ApproveContributeOAuthAsReviewerDocument } = await import('@/lib/workspace/contribute.documents');

const REQUEST_ID = 'aBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789-_abcde';
const refusal = (code: string) => new Error(JSON.stringify([{ message: 'no', extensions: { code } }]));

describe('approveContributeOAuthAsReviewer (the directory reviewers sign-in)', () => {
  beforeEach(() => {
    graphqlDirect.mockReset();
    auth.mockReset();
  });

  it('asks with no session at all and answers a redirect the browser may go to', async () => {
    const redirectTo = 'https://chatgpt.com/connector/oauth/d_abc?code=c&state=s';
    graphqlDirect.mockResolvedValueOnce({ approveContributeOAuthAsReviewer: { redirectTo } });
    expect(await approveContributeOAuthAsReviewer(REQUEST_ID, ' openai-review ', 'pw')).toEqual({
      ok: true,
      data: { redirectTo },
    });
    expect(graphqlDirect).toHaveBeenCalledWith(
      ApproveContributeOAuthAsReviewerDocument,
      { requestId: REQUEST_ID, username: 'openai-review', password: 'pw' },
      { source: 'client' },
    );
    expect(auth).not.toHaveBeenCalled();
  });

  it('says what each refusal means', async () => {
    for (const [code, error, message] of [
      ['UNAUTHENTICATED', 'INVALID', 'Wrong username or password.'],
      ['FORBIDDEN', 'INVALID', 'The review sign-in is not available right now.'],
      ['EXPIRED', 'EXPIRED', 'This sign-in has expired or had too many tries. Start it again from the app.'],
    ]) {
      graphqlDirect.mockRejectedValueOnce(refusal(code));
      expect(await approveContributeOAuthAsReviewer(REQUEST_ID, 'u', 'p'), code).toEqual({ ok: false, error, message });
    }
    graphqlDirect.mockRejectedValueOnce(new Error('ECONNRESET'));
    expect(await approveContributeOAuthAsReviewer(REQUEST_ID, 'u', 'p')).toEqual({ ok: false, error: 'FAILED' });
  });

  it('asks nothing for a bad id, an empty or too long field', async () => {
    expect(await approveContributeOAuthAsReviewer('../x', 'u', 'p')).toMatchObject({ ok: false, error: 'EXPIRED' });
    expect(await approveContributeOAuthAsReviewer(REQUEST_ID, ' ', 'p')).toMatchObject({ error: 'INVALID' });
    expect(await approveContributeOAuthAsReviewer(REQUEST_ID, 'u', '')).toMatchObject({ error: 'INVALID' });
    expect(await approveContributeOAuthAsReviewer(REQUEST_ID, 'u', 'p'.repeat(201))).toMatchObject({
      error: 'INVALID',
    });
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it('never sends the browser to a script, a file or a plain-http web address', async () => {
    for (const redirectTo of ['javascript:alert(1)', 'file:///etc/passwd', 'http://evil.example/cb']) {
      graphqlDirect.mockResolvedValueOnce({ approveContributeOAuthAsReviewer: { redirectTo } });
      expect(await approveContributeOAuthAsReviewer(REQUEST_ID, 'u', 'p'), redirectTo).toMatchObject({
        ok: false,
        error: 'FAILED',
      });
    }
  });
});
