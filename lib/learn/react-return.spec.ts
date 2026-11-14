import { describe, expect, it, vi } from 'vitest';

import { dropReturnQuery, settleReturnedPick, storeThenClean } from './react-return';

const deferred = () => {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};

describe('the way back from a reaction sign-in', () => {
  it('cleans the address only once the store has answered', async () => {
    const store = deferred();
    const order: string[] = [];
    const clean = vi.fn(() => order.push('clean'));
    const done = storeThenClean(() => {
      order.push('store');
      return store.promise.then(() => {
        order.push('stored');
      });
    }, clean);

    await Promise.resolve();
    expect(order).toEqual(['store']);
    expect(clean).not.toHaveBeenCalled();

    store.resolve();
    await done;
    expect(order).toEqual(['store', 'stored', 'clean']);
  });

  it('still cleans the address when the store fails, so a reload does not try again', async () => {
    const store = deferred();
    const clean = vi.fn();
    const done = storeThenClean(() => store.promise, clean);
    expect(clean).not.toHaveBeenCalled();
    store.reject(new Error('offline'));
    await expect(done).rejects.toThrow('offline');
    expect(clean).toHaveBeenCalledOnce();
  });

  it("stores a pick with the sign-in's token before the address changes, and never asks again", async () => {
    const store = deferred();
    const prompt = vi.fn();
    const clean = vi.fn();
    const done = settleReturnedPick({ canReact: true }, { store: () => store.promise, prompt, clean });
    await Promise.resolve();
    expect(clean).not.toHaveBeenCalled();
    store.resolve();
    await done;
    expect(clean).toHaveBeenCalledOnce();
    expect(prompt).not.toHaveBeenCalled();
  });

  it('without the token, asks for the sign-in again and cleans the address after the mount, not during it', async () => {
    const store = vi.fn();
    const prompt = vi.fn();
    const clean = vi.fn();
    const done = settleReturnedPick({ canReact: false }, { store, prompt, clean });
    expect(prompt).toHaveBeenCalledOnce();
    expect(clean).not.toHaveBeenCalled();
    await done;
    expect(clean).toHaveBeenCalledOnce();
    expect(store).not.toHaveBeenCalled();
  });

  it("for the result's own person, neither stores nor asks: only cleans the address, after the mount", async () => {
    const store = vi.fn();
    const prompt = vi.fn();
    const clean = vi.fn();
    const done = settleReturnedPick({ canReact: true, own: true }, { store, prompt, clean });
    expect(clean).not.toHaveBeenCalled();
    await done;
    expect(clean).toHaveBeenCalledOnce();
    expect(store).not.toHaveBeenCalled();
    expect(prompt).not.toHaveBeenCalled();
  });

  it("drops the query through the history alone, keeping the path, the hash and the history's state", () => {
    const replaceState = vi.fn();
    const state = { tree: 'kept' };
    dropReturnQuery({
      location: { pathname: '/learn/lessons/route-cache-miss-8f3k/passes/octocat', hash: '#react' },
      history: { replaceState, state },
    });
    expect(replaceState).toHaveBeenCalledWith(state, '', '/learn/lessons/route-cache-miss-8f3k/passes/octocat#react');
  });
});
