import type { MetadataRoute } from 'next';

import { ITEMS_PER_PAGE } from '@/app/app.consts';
import { fetchRepoLanguages } from '@/graphql/helpers/fetch-repo-languages';
import { SITEMAP_PAGE_DEPTH, SITEMAP_RANKING_TYPES, SITEMAP_REPO_LANGUAGE_LIMIT } from '@/lib/sitemap/sitemap.consts';
import { sitemapEntry, sitemapPagePriority } from '@/lib/sitemap/sitemap-url';
import { getRepoLanguageRankingPath, getRepoRankingPath } from '@/utils/repo-paths';

const pagesOf = (depth: number) => Array.from({ length: depth }, (_, i) => i + 1);

/** The pages a repository ranking of `repos` entries fills, at most `depth`. */
const repoPagesOf = (repos: number, depth: number) => pagesOf(Math.min(depth, Math.ceil(repos / ITEMS_PER_PAGE)));

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pagesToParse = SITEMAP_PAGE_DEPTH.rankings;
  // Without the repository counts, the user rankings still ship.
  const repoLanguages = await fetchRepoLanguages().catch(() => []);
  const rankedRepos = repoLanguages.reduce((sum, { repos }) => sum + repos, 0);

  const userRankings = pagesOf(pagesToParse).flatMap((page) => {
    const priority = sitemapPagePriority(page, pagesToParse);
    return SITEMAP_RANKING_TYPES.map((rankingType) => sitemapEntry(`/by/${rankingType}/${page}`, { priority }));
  });
  const repoRankings = repoPagesOf(rankedRepos, SITEMAP_PAGE_DEPTH.repos).map((page) =>
    sitemapEntry(getRepoRankingPath(page), { priority: sitemapPagePriority(page, SITEMAP_PAGE_DEPTH.repos) }),
  );
  const repoLanguageRankings = repoLanguages
    .filter(({ language }) => language)
    .slice(0, SITEMAP_REPO_LANGUAGE_LIMIT)
    .flatMap(({ language, repos }) =>
      repoPagesOf(repos, pagesToParse).map((page) =>
        sitemapEntry(getRepoLanguageRankingPath(language, page), {
          priority: sitemapPagePriority(page, pagesToParse),
        }),
      ),
    );

  return [
    ...userRankings,
    ...(rankedRepos ? [sitemapEntry('/repos/languages', { priority: 0.8 })] : []),
    ...repoRankings,
    ...repoLanguageRankings,
  ];
}
