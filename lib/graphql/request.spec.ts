import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { signedFetch } = vi.hoisted(() => ({ signedFetch: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('../signed-fetch', () => ({ signedFetch }));

const { BUILD_RETRIES, request } = await import('./request');

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

  describe('during the build', () => {
    beforeEach(() => {
      vi.stubEnv('NEXT_PHASE', 'phase-production-build');
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
      vi.unstubAllEnvs();
    });

    const settle = async <T>(promise: Promise<T>) => {
      const result = promise.then(
        (value) => ({ value }),
        (error: unknown) => ({ error }),
      );
      await vi.runAllTimersAsync();
      return result;
    };

    it.each([502, 503, 504])('asks again after a %i and answers the next good answer', async (status) => {
      answer(status, 'gateway', 'Gateway');
      answer(200, { data: { ok: true } });
      expect(await settle(request('{ ok }'))).toEqual({ value: { data: { ok: true }, status: 200 } });
      expect(signedFetch).toHaveBeenCalledTimes(2);
    });

    it('asks again after a network error', async () => {
      signedFetch.mockRejectedValueOnce(new TypeError('fetch failed'));
      answer(200, { data: { ok: true } });
      expect(await settle(request('{ ok }'))).toEqual({ value: { data: { ok: true }, status: 200 } });
      expect(signedFetch).toHaveBeenCalledTimes(2);
    });

    it(`stops after ${BUILD_RETRIES} retries, and the last answer stands`, async () => {
      for (let at = 0; at <= BUILD_RETRIES; at += 1) answer(502, 'gateway', 'Bad Gateway');
      const result = (await settle(request('{ ok }'))) as { error?: Error };
      expect(result.error?.message).toBe('GraphQL error! 502: Bad Gateway');
      expect(signedFetch).toHaveBeenCalledTimes(BUILD_RETRIES + 1);
    });

    it('waits 0.5 s, 1 s and 2 s between attempts', async () => {
      for (let at = 0; at < BUILD_RETRIES; at += 1) answer(503, 'busy', 'Service Unavailable');
      answer(200, { data: { ok: true } });
      const pending = request('{ ok }');
      await vi.advanceTimersByTimeAsync(0);
      expect(signedFetch).toHaveBeenCalledTimes(1);
      for (const [step, calls] of [
        [500, 2],
        [1000, 3],
        [2000, 4],
      ]) {
        await vi.advanceTimersByTimeAsync(step - 1);
        expect(signedFetch).toHaveBeenCalledTimes(calls - 1);
        await vi.advanceTimersByTimeAsync(1);
        expect(signedFetch).toHaveBeenCalledTimes(calls);
      }
      await expect(pending).resolves.toEqual({ data: { ok: true }, status: 200 });
    });

    it('throws the last network error when every attempt fails', async () => {
      for (let at = 0; at <= BUILD_RETRIES; at += 1)
        signedFetch.mockRejectedValueOnce(new TypeError(`fetch failed ${at}`));
      const result = (await settle(request('{ ok }'))) as { error?: Error };
      expect(result.error?.message).toBe(`fetch failed ${BUILD_RETRIES}`);
      expect(signedFetch).toHaveBeenCalledTimes(BUILD_RETRIES + 1);
    });

    it('never asks again for other statuses or GraphQL errors', async () => {
      answer(500, 'oops', 'Internal Server Error');
      expect(((await settle(request('{ ok }'))) as { error?: Error }).error?.message).toBe(
        'GraphQL error! 500: Internal Server Error',
      );
      answer(200, { data: null, errors: [{ message: 'nope' }] });
      await settle(request('{ ok }'));
      expect(signedFetch).toHaveBeenCalledTimes(2);
    });
  });

  it('never asks again at request time', async () => {
    answer(502, 'gateway', 'Bad Gateway');
    await expect(request('{ ok }')).rejects.toThrow('GraphQL error! 502: Bad Gateway');
    signedFetch.mockRejectedValueOnce(new TypeError('fetch failed'));
    await expect(request('{ ok }')).rejects.toThrow('fetch failed');
    expect(signedFetch).toHaveBeenCalledTimes(2);
  });
});
