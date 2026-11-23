import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const { graphqlDirect } = vi.hoisted(() => ({ graphqlDirect: vi.fn() }));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));

const { LEARN_EVERYONE_TIMEOUT_MS, learnOpenToEveryone, learnOpenToEveryoneKnown, resetLearnOpenToEveryone } =
  await import('./learn-everyone');

/** Lets an ask made in the background land. */
const settle = () => new Promise((resolve) => setImmediate(resolve));

describe('learnOpenToEveryone', () => {
  beforeEach(() => {
    graphqlDirect.mockReset();
    resetLearnOpenToEveryone();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("is the API's answer, asked without a viewer, once a minute and one ask at a time", async () => {
    graphqlDirect.mockResolvedValue({ learnOpenToEveryone: true });
    expect(await Promise.all([learnOpenToEveryone(0), learnOpenToEveryone(0)])).toEqual([true, true]);
    expect(graphqlDirect).toHaveBeenCalledOnce();
    expect(graphqlDirect.mock.calls[0][2]).toEqual({ source: 'ssr' });
    expect(await learnOpenToEveryone(59_999)).toBe(true);
    expect(graphqlDirect).toHaveBeenCalledOnce();

    // A minute on, the kept answer is given at once and asked again in the background.
    graphqlDirect.mockResolvedValue({ learnOpenToEveryone: false });
    expect(await learnOpenToEveryone(60_000)).toBe(true);
    await settle();
    expect(await learnOpenToEveryone(60_001)).toBe(false);
  });

  it('is closed when the API does not know the field yet, and keeps the last answer on a later failure', async () => {
    graphqlDirect.mockRejectedValueOnce(new Error('[{"message":"Cannot query field \\"learnOpenToEveryone\\""}]'));
    expect(await learnOpenToEveryone(0)).toBe(false);

    graphqlDirect.mockResolvedValue({ learnOpenToEveryone: true });
    // Tried again 10 seconds later, not before.
    expect(await learnOpenToEveryone(9_999)).toBe(false);
    expect(await learnOpenToEveryone(10_000)).toBe(false);
    await settle();
    expect(await learnOpenToEveryone(10_001)).toBe(true);

    graphqlDirect.mockRejectedValue(new Error('down'));
    expect(await learnOpenToEveryone(80_001)).toBe(true);
    await settle();
    expect(await learnOpenToEveryone(80_002)).toBe(true);
  });

  it('answers closed when the first ask is late, without waiting past the timeout', async () => {
    vi.useFakeTimers();
    graphqlDirect.mockReturnValue(new Promise(() => {}));
    const answer = learnOpenToEveryone(0);
    await vi.advanceTimersByTimeAsync(LEARN_EVERYONE_TIMEOUT_MS);
    expect(await answer).toBe(false);
  });
});

describe('learnOpenToEveryoneKnown', () => {
  beforeEach(() => {
    graphqlDirect.mockReset();
    resetLearnOpenToEveryone();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("is the API's answer, open or closed", async () => {
    graphqlDirect.mockResolvedValueOnce({ learnOpenToEveryone: true });
    expect(await learnOpenToEveryoneKnown(0)).toBe(true);
    resetLearnOpenToEveryone();
    graphqlDirect.mockResolvedValueOnce({ learnOpenToEveryone: false });
    expect(await learnOpenToEveryoneKnown(0)).toBe(false);
  });

  it('fails, rather than guess closed, while the API has never answered', async () => {
    graphqlDirect.mockRejectedValueOnce(new Error('down'));
    await expect(learnOpenToEveryoneKnown(0)).rejects.toThrow('Learn has not said yet whether it is open');
    // The guess is still what the plain reader gives.
    expect(await learnOpenToEveryone(1)).toBe(false);
    await expect(learnOpenToEveryoneKnown(2)).rejects.toThrow();

    vi.useFakeTimers();
    resetLearnOpenToEveryone();
    graphqlDirect.mockReturnValue(new Promise(() => {}));
    const late = learnOpenToEveryoneKnown(0);
    const settled = expect(late).rejects.toThrow('Learn has not said yet whether it is open');
    await vi.advanceTimersByTimeAsync(LEARN_EVERYONE_TIMEOUT_MS);
    await settled;
  });

  it('keeps the last real answer when a later ask fails', async () => {
    graphqlDirect.mockResolvedValueOnce({ learnOpenToEveryone: true });
    expect(await learnOpenToEveryoneKnown(0)).toBe(true);
    graphqlDirect.mockRejectedValue(new Error('down'));
    expect(await learnOpenToEveryoneKnown(60_000)).toBe(true);
    await settle();
    expect(await learnOpenToEveryoneKnown(60_001)).toBe(true);
  });
});
