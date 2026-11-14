import { describe, expect, it, vi } from 'vitest';

import { dropReturnQuery, storeThenClean } from './react-return';

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

  it('drops the query through the history alone, keeping the path and the hash', () => {
    const replaceState = vi.fn();
    dropReturnQuery({
      location: { pathname: '/learn/lessons/route-cache-miss-8f3k/passes/octocat', hash: '#react' },
      history: { replaceState },
    });
    expect(replaceState).toHaveBeenCalledWith(null, '', '/learn/lessons/route-cache-miss-8f3k/passes/octocat#react');
  });
});
