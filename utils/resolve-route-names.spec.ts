import { describe, expect, it, vi } from 'vitest';

import { resolveRepoLanguageName } from './resolve-route-names';
import { fetchRepoLanguages } from '@/graphql/helpers/fetch-repo-languages';

vi.mock('@/graphql/helpers/fetch-repo-languages', () => ({ fetchRepoLanguages: vi.fn() }));
vi.mock('@/graphql/helpers/fetch-countries', () => ({ fetchCountries: vi.fn() }));
vi.mock('@/graphql/helpers/top-languages', () => ({ fetchTopLanguages: vi.fn() }));

vi.mocked(fetchRepoLanguages).mockResolvedValue([
  { language: 'Rust', repos: 10, stars: 0 },
  { language: 'C#', repos: 5, stars: 0 },
  { language: null, repos: 3, stars: 0 },
]);

describe('resolveRepoLanguageName', () => {
  it.each([
    ['Rust', 'Rust'],
    ['rust', 'Rust'],
    ['RUST', 'Rust'],
    ['c#', 'C#'],
  ])('resolves %s to %s', async (name, expected) => {
    await expect(resolveRepoLanguageName(name)).resolves.toBe(expected);
  });

  it.each(['null', 'Null', 'Cobol', ''])('matches no language for %j', async (name) => {
    await expect(resolveRepoLanguageName(name)).resolves.toBeUndefined();
  });
});
