import { beforeEach, describe, expect, it, vi } from 'vitest';

import sitemap from './sitemap';
import { fetchRepoLanguages } from '@/graphql/helpers/fetch-repo-languages';

vi.mock('@/graphql/helpers/fetch-repo-languages', () => ({ fetchRepoLanguages: vi.fn() }));

type RepoLanguages = Awaited<ReturnType<typeof fetchRepoLanguages>>;

const languages = (...entries: [string | null, number][]): RepoLanguages =>
  entries.map(([language, repos]) => ({ language, repos, stars: 0 }));

const paths = async () => (await sitemap()).map(({ url }) => new URL(url).pathname);

describe('rankings sitemap', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_URI', 'https://example.test');
    vi.mocked(fetchRepoLanguages).mockReset();
  });

  it('lists the repository pages the ranked repositories fill, without the no-language list', async () => {
    vi.mocked(fetchRepoLanguages).mockResolvedValue(languages(['TypeScript', 250], [null, 50]));

    const repoPaths = (await paths()).filter((p) => p.startsWith('/repos'));

    expect(repoPaths).toEqual([
      '/repos/languages',
      '/repos/1',
      '/repos/2',
      '/repos/3',
      '/repos/language/TypeScript/1',
      '/repos/language/TypeScript/2',
      '/repos/language/TypeScript/3',
    ]);
  });

  it('stops at the sitemap depth', async () => {
    vi.mocked(fetchRepoLanguages).mockResolvedValue(languages(['Rust', 1_000_000]));

    const repoPaths = (await paths()).filter((p) => p.startsWith('/repos'));

    expect(repoPaths.filter((p) => /^\/repos\/\d+$/.test(p))).toHaveLength(50);
    expect(repoPaths.filter((p) => p.startsWith('/repos/language/'))).toHaveLength(20);
  });

  it('lists at most 30 languages', async () => {
    vi.mocked(fetchRepoLanguages).mockResolvedValue(
      languages(...Array.from({ length: 35 }, (_, i): [string, number] => [`Lang${i}`, 10])),
    );

    const languagePaths = (await paths()).filter((p) => p.startsWith('/repos/language/'));

    expect(languagePaths).toHaveLength(30);
    expect(languagePaths.at(-1)).toBe('/repos/language/Lang29/1');
  });

  it('lists no repository ranking when none is ranked', async () => {
    vi.mocked(fetchRepoLanguages).mockResolvedValue([]);

    const all = await paths();

    expect(all.filter((p) => p.startsWith('/repos'))).toEqual([]);
    expect(all).toHaveLength(60);
  });

  it('still lists the user rankings when the repository languages cannot be read', async () => {
    vi.mocked(fetchRepoLanguages).mockRejectedValue(new Error('unavailable'));

    const all = await paths();

    expect(all.filter((p) => p.startsWith('/repos'))).toEqual([]);
    expect(all).toContain('/by/stars/1');
  });
});
