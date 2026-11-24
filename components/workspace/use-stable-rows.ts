'use client';

import { useRef, useState } from 'react';

/**
 * An upcoming list that grows in place while its reads come back in another order: the rows shown keep their places,
 * each drawn from the newest data read for it. A new read of the page (`items`) only adds the rows it does not hold
 * yet, under the others; a row the new read left out stays. `add` does the same for a "Show 10 more" read, and answers
 * how many rows it added. `swap` puts another item in a row's place (a skip's next issue), `drop` takes a row away: a
 * row that left never comes back with a later read.
 */
export function useStableRows<T>(items: readonly T[], keyOf: (item: T) => string) {
  const known = useRef(new Map<string, T>());
  const left = useRef(new Set<string>());
  for (const item of items) known.current.set(keyOf(item), item);
  const [order, setOrder] = useState<string[]>(() => items.map(keyOf));
  const held = new Set(order);
  const fresh = items.map(keyOf).filter((key) => !held.has(key) && !left.current.has(key));
  // The page read itself again with rows not held yet: they go under the others (React's update during render).
  if (fresh.length) setOrder([...order, ...fresh]);
  const keys = fresh.length ? [...order, ...fresh] : order;
  const rows = keys.flatMap((key) => {
    const row = known.current.get(key);
    return row === undefined ? [] : [row];
  });

  const add = (more: readonly T[]): number => {
    const shown = new Set(keys);
    const added: string[] = [];
    for (const item of more) {
      const key = keyOf(item);
      known.current.set(key, item);
      if (!shown.has(key) && !left.current.has(key)) {
        shown.add(key);
        added.push(key);
      }
    }
    if (added.length) setOrder((before) => [...before, ...added.filter((key) => !before.includes(key))]);
    return added.length;
  };

  const drop = (key: string) => {
    left.current.add(key);
    setOrder((before) => before.filter((each) => each !== key));
  };

  const swap = (key: string, item: T) => {
    const next = keyOf(item);
    known.current.set(next, item);
    left.current.add(key);
    // The next item shown elsewhere already: the row only leaves.
    setOrder((before) =>
      before.includes(next)
        ? before.filter((each) => each !== key)
        : before.map((each) => (each === key ? next : each)),
    );
  };

  return { rows, add, swap, drop };
}
