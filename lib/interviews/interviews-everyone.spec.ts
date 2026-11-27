import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const { graphqlDirect } = vi.hoisted(() => ({ graphqlDirect: vi.fn() }));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));

const {
  INTERVIEWS_EVERYONE_RETRY_MS,
  INTERVIEWS_EVERYONE_TIMEOUT_MS,
  interviewsOpenToEveryone,
  resetInterviewsOpenToEveryone,
} = await import('./interviews-everyone');

/** Lets an ask made in the background land. */
const settle = () => new Promise((resolve) => setImmediate(resolve));

describe('interviewsOpenToEveryone', () => {
  beforeEach(() => {
    graphqlDirect.mockReset();
    resetInterviewsOpenToEveryone();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("is the API's answer, asked with no viewer, once a minute per server and one ask at a time", async () => {
    graphqlDirect.mockResolvedValue({ interviewsOpenToEveryone: true });
    expect(await Promise.all([interviewsOpenToEveryone(0), interviewsOpenToEveryone(0)])).toEqual([true, true]);
    expect(graphqlDirect).toHaveBeenCalledOnce();
    expect(graphqlDirect.mock.calls[0][2]).toMatchObject({ source: 'ssr' });
    expect(graphqlDirect.mock.calls[0][2]).not.toHaveProperty('githubLogin');
    expect(await interviewsOpenToEveryone(59_999)).toBe(true);
    expect(graphqlDirect).toHaveBeenCalledOnce();

    // A minute on, the kept answer is given at once and asked again in the background.
    graphqlDirect.mockResolvedValue({ interviewsOpenToEveryone: false });
    expect(await interviewsOpenToEveryone(60_000)).toBe(true);
    await settle();
    expect(await interviewsOpenToEveryone(60_001)).toBe(false);
  });

  it('is closed while the API does not know the field, and asks again 10 seconds later', async () => {
    graphqlDirect.mockRejectedValue(new Error('[{"message":"Cannot query field \\"interviewsOpenToEveryone\\""}]'));
    const error = vi.spyOn(console, 'error');
    expect(await interviewsOpenToEveryone(0)).toBe(false);
    expect(await interviewsOpenToEveryone(INTERVIEWS_EVERYONE_RETRY_MS - 1)).toBe(false);
    expect(graphqlDirect).toHaveBeenCalledOnce();
    expect(await interviewsOpenToEveryone(INTERVIEWS_EVERYONE_RETRY_MS)).toBe(false);
    await settle();
    expect(graphqlDirect).toHaveBeenCalledTimes(2);
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });

  it('is closed for anything but a real true', async () => {
    for (const value of [null, undefined, 'true', 1]) {
      resetInterviewsOpenToEveryone();
      graphqlDirect.mockResolvedValueOnce({ interviewsOpenToEveryone: value });
      expect(await interviewsOpenToEveryone(0)).toBe(false);
    }
  });

  it('keeps the last real answer through a failed ask, and asks again 10 seconds later', async () => {
    graphqlDirect.mockResolvedValueOnce({ interviewsOpenToEveryone: true });
    expect(await interviewsOpenToEveryone(0)).toBe(true);
    graphqlDirect.mockRejectedValueOnce(new Error('down'));
    expect(await interviewsOpenToEveryone(60_000)).toBe(true);
    await settle();
    expect(await interviewsOpenToEveryone(60_001)).toBe(true);
    expect(await interviewsOpenToEveryone(60_000 + INTERVIEWS_EVERYONE_RETRY_MS - 1)).toBe(true);
    expect(graphqlDirect).toHaveBeenCalledTimes(2);

    // The next try answers: a real false closes it.
    graphqlDirect.mockResolvedValueOnce({ interviewsOpenToEveryone: false });
    expect(await interviewsOpenToEveryone(60_000 + INTERVIEWS_EVERYONE_RETRY_MS)).toBe(true);
    await settle();
    expect(await interviewsOpenToEveryone(60_000 + INTERVIEWS_EVERYONE_RETRY_MS + 1)).toBe(false);
  });

  it('keeps the last real answer through a slow ask', async () => {
    graphqlDirect.mockResolvedValueOnce({ interviewsOpenToEveryone: true });
    expect(await interviewsOpenToEveryone(0)).toBe(true);
    vi.useFakeTimers();
    graphqlDirect.mockImplementationOnce(() => new Promise(() => {}));
    expect(await interviewsOpenToEveryone(60_000)).toBe(true);
    await vi.advanceTimersByTimeAsync(INTERVIEWS_EVERYONE_TIMEOUT_MS);
    expect(await interviewsOpenToEveryone(60_001)).toBe(true);
  });

  it('answers closed when the API is slow, without waiting past the timeout, and stops the ask', async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    graphqlDirect.mockImplementation((_doc: unknown, _vars: unknown, params: { signal?: AbortSignal }) => {
      signal = params.signal;
      return new Promise(() => {});
    });
    const answer = interviewsOpenToEveryone(0);
    await vi.advanceTimersByTimeAsync(INTERVIEWS_EVERYONE_TIMEOUT_MS);
    expect(await answer).toBe(false);
    expect(signal?.aborted).toBe(true);
  });
});
