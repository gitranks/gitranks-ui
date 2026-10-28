import { describe, expect, it, vi } from 'vitest';

import { PULL_NOTE_TTL, reloadWithPullNote, savePullNote, showKeptPullNote, takePullNote } from './pull-note';

const NOW = Date.parse('2026-10-28T10:00:00.000Z');

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

  it('drops a note the reload never read, so a later visit in the tab shows nothing', () => {
    const tab = tabStorage();
    savePullNote('octo', 'hello', 'Updated.', tab.of, NOW);

    expect(takePullNote('octo', 'hello', tab.of, NOW + PULL_NOTE_TTL + 1)).toBeNull();
    expect(tab.items.size).toBe(0);
  });

  it('shows a note read within the wait', () => {
    const tab = tabStorage();
    savePullNote('octo', 'hello', 'Updated.', tab.of, NOW);

    expect(takePullNote('octo', 'hello', tab.of, NOW + PULL_NOTE_TTL)).toBe('Updated.');
  });

  it.each([
    ['text that is not JSON', 'Updated.'],
    ['JSON without a note', JSON.stringify({ savedAt: NOW })],
    ['JSON without a time', JSON.stringify({ note: 'Updated.' })],
    ['JSON null', 'null'],
  ])('drops %s', (_, raw) => {
    const tab = tabStorage();
    tab.items.set('repo-pull-note:octo/hello', raw);

    expect(takePullNote('octo', 'hello', tab.of, NOW)).toBeNull();
    expect(tab.items.size).toBe(0);
  });
});

describe('showKeptPullNote', () => {
  it('shows the kept note once, with no timeout and a close button', () => {
    const tab = tabStorage();
    const show = vi.fn();
    savePullNote('Octo-Org', 'Hello', 'Updated.', tab.of, NOW);

    showKeptPullNote('Octo-Org', 'Hello', show, tab.of, NOW + 1_000);
    showKeptPullNote('Octo-Org', 'Hello', show, tab.of, NOW + 2_000);

    expect(show).toHaveBeenCalledTimes(1);
    expect(show).toHaveBeenCalledWith('Updated.', {
      id: 'repo-pull-note:octo-org/hello',
      duration: Infinity,
      closeButton: true,
    });
  });

  it('shows nothing without a kept note', () => {
    const show = vi.fn();

    showKeptPullNote('octo', 'hello', show, tabStorage().of, NOW);

    expect(show).not.toHaveBeenCalled();
  });
});

describe('reloadWithPullNote', () => {
  it('keeps the note before the reload, so the page after it can show it', () => {
    const tab = tabStorage();
    const reload = vi.fn(() => {
      expect(takePullNote('octo', 'hello', tab.of, NOW)).toBe('Updated.');
    });

    reloadWithPullNote('octo', 'hello', 'Updated.', reload, tab.of, NOW);

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('reloads without keeping anything when there is no note', () => {
    const tab = tabStorage();
    const reload = vi.fn();

    reloadWithPullNote('octo', 'hello', null, reload, tab.of, NOW);

    expect(reload).toHaveBeenCalledTimes(1);
    expect(tab.items.size).toBe(0);
  });

  it('still reloads when storage refuses the note', () => {
    const reload = vi.fn();

    reloadWithPullNote('octo', 'hello', 'Updated.', reload, refusing('setItem').of, NOW);

    expect(reload).toHaveBeenCalledTimes(1);
  });
});
