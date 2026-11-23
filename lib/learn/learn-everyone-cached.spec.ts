import { beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({ known: vi.fn(), cacheLife: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ cacheLife: m.cacheLife }));
vi.mock('./learn-everyone', () => ({ learnOpenToEveryoneKnown: m.known }));

const { learnOpenToEveryoneCached } = await import('./learn-everyone-cached');

beforeEach(() => {
  m.known.mockReset();
  m.cacheLife.mockClear();
});

describe('learnOpenToEveryoneCached', () => {
  it("is the API's real answer, kept for minutes", async () => {
    m.known.mockResolvedValueOnce(true);
    expect(await learnOpenToEveryoneCached()).toBe(true);
    expect(m.cacheLife).toHaveBeenCalledWith('minutes');
    m.known.mockResolvedValueOnce(false);
    expect(await learnOpenToEveryoneCached()).toBe(false);
  });

  it('is closed for this render alone while the API has not answered, the failure thrown inside what is kept', async () => {
    const failure = new Error('Learn has not said yet whether it is open');
    m.known.mockRejectedValueOnce(failure);
    expect(await learnOpenToEveryoneCached()).toBe(false);
    // The next render asks again, and gets the real answer.
    m.known.mockResolvedValueOnce(true);
    expect(await learnOpenToEveryoneCached()).toBe(true);
    expect(m.known).toHaveBeenCalledTimes(2);
  });
});
