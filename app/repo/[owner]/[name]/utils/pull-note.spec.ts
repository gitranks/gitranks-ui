import { describe, expect, it } from 'vitest';

import { savePullNote, takePullNote } from './pull-note';

/** A tab's session storage: it outlives a reload of the page. */
const tabStorage = () => {
  const items = new Map<string, string>();
  const storage = {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    removeItem: (key: string) => void items.delete(key),
  } as Storage;
  return { items, of: () => storage };
};

const refusing = (method: 'getItem' | 'setItem' | 'removeItem') => {
  const tab = tabStorage();
  const storage = tab.of();
  return {
    ...tab,
    of: () =>
      ({
        ...storage,
        [method]: () => {
          throw new DOMException('denied', 'SecurityError');
        },
      }) as Storage,
  };
};

describe('pull note', () => {
  it('carries the note across a reload, and shows it once', () => {
    const tab = tabStorage();

    savePullNote('Octo-Org', 'Hello', 'Updated.', tab.of);

    expect(takePullNote('Octo-Org', 'Hello', tab.of)).toBe('Updated.');
    expect(takePullNote('Octo-Org', 'Hello', tab.of)).toBeNull();
    expect(tab.items.size).toBe(0);
  });

  it('keeps one note per repository, whatever the case of its name', () => {
    const tab = tabStorage();

    savePullNote('octo', 'one', 'First.', tab.of);
    savePullNote('octo', 'two', 'Second.', tab.of);

    expect(takePullNote('Octo', 'One', tab.of)).toBe('First.');
    expect(takePullNote('octo', 'one', tab.of)).toBeNull();
    expect(takePullNote('octo', 'two', tab.of)).toBe('Second.');
  });

  it('shows nothing when no note was left', () => {
    expect(takePullNote('octo', 'hello', tabStorage().of)).toBeNull();
  });

  it('shows nothing when storage cannot be reached', () => {
    const missing = () => {
      throw new DOMException('denied', 'SecurityError');
    };

    expect(() => savePullNote('octo', 'hello', 'Updated.', missing)).not.toThrow();
    expect(takePullNote('octo', 'hello', missing)).toBeNull();
  });

  it('shows nothing when storage refuses to keep the note', () => {
    const tab = refusing('setItem');

    expect(() => savePullNote('octo', 'hello', 'Updated.', tab.of)).not.toThrow();
    expect(takePullNote('octo', 'hello', tab.of)).toBeNull();
  });

  it.each([['getItem' as const], ['removeItem' as const]])('shows nothing when storage refuses %s', (method) => {
    const tab = refusing(method);
    savePullNote('octo', 'hello', 'Updated.', tab.of);

    expect(tab.items.size).toBe(1);
    expect(takePullNote('octo', 'hello', tab.of)).toBeNull();
  });
});
