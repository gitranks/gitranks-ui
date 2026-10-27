import { describe, expect, it, vi } from 'vitest';

import { createRechecker, listenForReturn, type RecheckResult } from './recheck';
import { repoBig } from '@/badge/v3/fixtures';

/** A read the test settles by hand. */
function deferred() {
  let resolve!: (value: typeof repoBig | null) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<typeof repoBig | null>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function setup(visible = true) {
  let clock = 1_000;
  const reads: ReturnType<typeof deferred>[] = [];
  const done: [RecheckResult, boolean][] = [];
  const onStart = vi.fn();
  const checker = createRechecker({
    read: () => {
      const read = deferred();
      reads.push(read);
      return read.promise;
    },
    onStart,
    onDone: (result, manual) => done.push([result, manual]),
    every: 10_000,
    now: () => clock,
    visible: () => visible,
  });
  return { checker, reads, done, onStart, tick: (ms: number) => (clock += ms) };
}

describe('createRechecker', () => {
  it('runs one check at a time: a click while one is under way is ignored', async () => {
    const { checker, reads, done, onStart } = setup();
    checker.run(true);
    checker.run(true);
    expect(reads).toHaveLength(1);
    expect(onStart).toHaveBeenCalledTimes(1);
    reads[0].resolve(repoBig);
    await flush();
    expect(done).toEqual([[{ status: 'found', facts: repoBig }, true]]);
    checker.run(true);
    expect(reads).toHaveLength(2);
  });

  it('checks on a return only after `every`, and never while the page is hidden', () => {
    const { checker, reads, tick } = setup();
    checker.onReturn();
    expect(reads).toHaveLength(0);
    tick(10_001);
    checker.onReturn();
    expect(reads).toHaveLength(1);
    reads[0].resolve(null);

    const hidden = setup(false);
    hidden.tick(60_000);
    hidden.checker.onReturn();
    expect(hidden.reads).toHaveLength(0);
  });

  it('counts `every` from a touch', async () => {
    const { checker, reads, tick } = setup();
    tick(9_000);
    checker.touch();
    tick(9_000);
    checker.onReturn();
    expect(reads).toHaveLength(0);
  });

  it('reports a miss or a failure as such, so the facts shown stay', async () => {
    const { checker, reads, done } = setup();
    checker.run(false);
    reads[0].reject(new Error('down'));
    await flush();
    checker.run(true);
    reads[1].resolve(null);
    await flush();
    expect(done).toEqual([
      [{ status: 'error' }, false],
      [{ status: 'missing' }, true],
    ]);
  });

  it('drops the result of a check under way when the entity changes', async () => {
    const { checker, reads, done } = setup();
    checker.run(true);
    checker.reset();
    reads[0].resolve(repoBig);
    await flush();
    expect(done).toEqual([]);
    // And a new check can start at once.
    checker.run(true);
    expect(reads).toHaveLength(2);
  });
});

describe('listenForReturn', () => {
  it('listens for focus, back navigation and a shown tab, and stops on cleanup', () => {
    const win = new EventTarget();
    const doc = new EventTarget();
    const onReturn = vi.fn();
    const stop = listenForReturn(win, doc, onReturn);
    win.dispatchEvent(new Event('focus'));
    win.dispatchEvent(new Event('pageshow'));
    doc.dispatchEvent(new Event('visibilitychange'));
    expect(onReturn).toHaveBeenCalledTimes(3);
    stop();
    win.dispatchEvent(new Event('focus'));
    doc.dispatchEvent(new Event('visibilitychange'));
    expect(onReturn).toHaveBeenCalledTimes(3);
  });
});
