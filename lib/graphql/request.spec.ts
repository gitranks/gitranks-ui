import { beforeEach, describe, expect, it, vi } from 'vitest';

const { signedFetch } = vi.hoisted(() => ({ signedFetch: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('../signed-fetch', () => ({ signedFetch }));

const { request } = await import('./request');

const answer = (status: number, body: unknown, statusText = '') =>
  signedFetch.mockResolvedValueOnce(
    new Response(typeof body === 'string' ? body : JSON.stringify(body), {
      status,
      statusText,
      headers: { 'Content-Type': 'application/json' },
    }),
  );

describe('request', () => {
  beforeEach(() => signedFetch.mockReset());

  it('answers the data of a 200', async () => {
    answer(200, { data: { ok: true } });
    expect(await request('{ ok }')).toEqual({ data: { ok: true }, status: 200 });
  });

  it('throws the GraphQL errors of a 200', async () => {
    const errors = [{ message: 'Not found', extensions: { code: 'NOT_FOUND' } }];
    answer(200, { data: null, errors });
    await expect(request('{ ok }')).rejects.toThrow(JSON.stringify(errors));
  });

  it('throws the GraphQL errors a 400 carries: an unknown field, a variable it cannot read', async () => {
    const unknown = [
      {
        message: 'Cannot query field "skipIssue" on type "Mutation".',
        extensions: { code: 'GRAPHQL_VALIDATION_FAILED' },
      },
    ];
    answer(400, { errors: unknown }, 'Bad Request');
    await expect(request('mutation { skipIssue }')).rejects.toThrow(JSON.stringify(unknown));

    const coercion = [{ message: 'Variable "$plan" got invalid value "X"', extensions: { code: 'BAD_USER_INPUT' } }];
    answer(400, { errors: coercion }, 'Bad Request');
    await expect(request('mutation($plan: P!) { a(plan: $plan) }')).rejects.toThrow(JSON.stringify(coercion));
  });

  it('keeps the status for an answer without GraphQL errors', async () => {
    answer(400, 'not json', 'Bad Request');
    await expect(request('{ ok }')).rejects.toThrow('GraphQL error! 400: Bad Request');
    answer(502, { errors: [{ message: 'upstream' }] }, 'Bad Gateway');
    await expect(request('{ ok }')).rejects.toThrow('GraphQL error! 502: Bad Gateway');
  });
});
