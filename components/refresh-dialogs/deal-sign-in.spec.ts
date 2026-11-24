import { describe, expect, it } from 'vitest';

import { DEAL_SIGN_IN_TTL, dealPageOf, keepDealSignIn, takeDealSignIn } from './deal-sign-in';

const NOW = Date.parse('2026-11-15T12:00:00Z');

const memoryStorage = () => {
  const items = new Map<string, string>();
  const storage = {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    removeItem: (key: string) => void items.delete(key),
  } as Storage;
  return { items, of: () => storage };
};

const refusing = () => {
  throw new Error('SecurityError');
};

describe('the deal sign-in mark', () => {
  it('names a page in any letter case', () => {
    expect(dealPageOf('profile', 'Octo-Dev')).toBe('profile:octo-dev');
    expect(dealPageOf('repo', 'Acme/FastQueue')).toBe('repo:acme/fastqueue');
  });

  it('is taken once, on the page it was kept for', () => {
    const storage = memoryStorage();
    keepDealSignIn('profile:octo-dev', NOW, storage.of);

    expect(takeDealSignIn('profile:octo-dev', NOW + 60_000, storage.of)).toBe(true);
    expect(takeDealSignIn('profile:octo-dev', NOW + 60_000, storage.of)).toBe(false);
  });

  it('stays for its own page when another page reads it', () => {
    const storage = memoryStorage();
    keepDealSignIn('repo:acme/fastqueue', NOW, storage.of);

    expect(takeDealSignIn('profile:octo-dev', NOW, storage.of)).toBe(false);
    expect(takeDealSignIn('repo:acme/fastqueue', NOW, storage.of)).toBe(true);
  });

  it('drops an old or broken mark, whichever page reads it', () => {
    const storage = memoryStorage();
    keepDealSignIn('repo:acme/fastqueue', NOW, storage.of);
    expect(takeDealSignIn('profile:octo-dev', NOW + DEAL_SIGN_IN_TTL + 1, storage.of)).toBe(false);
    expect(storage.items.size).toBe(0);

    storage.items.set('daily-updates-deal', '{not json');
    expect(takeDealSignIn('profile:octo-dev', NOW, storage.of)).toBe(false);
    expect(storage.items.size).toBe(0);

    storage.items.set('daily-updates-deal', JSON.stringify({ page: 'profile:octo-dev', at: NOW + 60_000 }));
    expect(takeDealSignIn('profile:octo-dev', NOW, storage.of)).toBe(false);
  });

  it('keeps and takes nothing, with no error, when storage refuses', () => {
    expect(() => keepDealSignIn('profile:octo-dev', NOW, refusing)).not.toThrow();
    expect(takeDealSignIn('profile:octo-dev', NOW, refusing)).toBe(false);
  });
});
