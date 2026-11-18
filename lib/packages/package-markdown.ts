import { ITEMS_PER_PAGE } from '@/app/app.consts';
import { DEPENDENT_MIN_STARS, PACKAGE_RANKINGS } from '@/app/packages/package-rankings';
import { formatCount, formatDay } from '@/app/repo/[owner]/[name]/utils/used-by-summary';
import type { PackagePage, PackageRanks } from '@/graphql/package-page';
import { RANKING_MAX_PAGE } from '@/lib/routing/ranking-routes';
import { absoluteUrl } from '@/lib/seo/site';
import { PACKAGE_METHODOLOGY_PATH, packagePath, packageRankingPath } from '@/utils/package-paths';
import { getRepoPath } from '@/utils/repo-paths';

/** Where a package's facts are, in markdown: `/package/npm/<name>/facts.md`. */
export const packageMarkdownPath = (name: string) => `${packagePath(name)}/facts.md`;

/** One line of registry text, as it is but for its line breaks: a description cannot start a heading or a list. */
const oneLine = (text: string) => text.replace(/\s+/g, ' ').trim();

const plural = (count: number, one: string, many: string) => `${formatCount(count)} ${count === 1 ? one : many}`;

/** "#12 by weekly downloads: <its ranking page>", for each rank the package has, in the rankings' order; a rank past
 * the pages a ranking lists has no link. */
function rankLines(ranks: PackageRanks | null | undefined): string[] {
  const of = { downloads: ranks?.downloads, 'dependents-stars': ranks?.dependentsStars, dependents: ranks?.dependents };
  return Object.entries(of).flatMap(([order, rank]) => {
    if (!rank) return [];
    const page = Math.ceil(rank.rank / ITEMS_PER_PAGE);
    const link = page <= RANKING_MAX_PAGE.package ? `: ${absoluteUrl(packageRankingPath(order, page))}` : '';
    return [`- #${formatCount(rank.rank)} by ${PACKAGE_RANKINGS[order as keyof typeof of].metricInSentence}${link}`];
  });
}

/**
 * A read npm package's facts in markdown, for AI agents: what it is, who uses it (the first page of its dependents,
 * most-starred first), its downloads and its ranks, each with the page that shows it.
 */
export function packageMarkdownOf(pkg: PackagePage): string {
  const page = absoluteUrl(packagePath(pkg.name));
  const source = pkg.repo?.nameWithOwner ?? pkg.repositoryName;
  const rows = pkg.dependents?.items ?? [];
  const readOn = formatDay(pkg.dependentsReadAt);
  const facts = [
    `- GitRanks page: ${page}`,
    `- npm: https://www.npmjs.com/package/${pkg.name}`,
    source && `- Source: https://github.com/${source}`,
    pkg.repo && `- Source on GitRanks: ${absoluteUrl(getRepoPath(pkg.repo.nameWithOwner))}`,
    pkg.latestVersion &&
      `- Latest version: ${pkg.latestVersion}${pkg.releaseCount ? ` (${plural(pkg.releaseCount, 'release', 'releases')})` : ''}`,
    pkg.license && `- License: ${oneLine(pkg.license)}`,
    pkg.deprecated && `- Deprecated: ${oneLine(pkg.deprecated)}`,
  ];
  const usage = [
    pkg.dependentsCount > 0
      ? `- Used by ${plural(pkg.dependentsCount, 'public repository', 'public repositories')} with ${DEPENDENT_MIN_STARS}+ stars (${plural(pkg.dependentsStars, 'star', 'stars')} between them), each listing it in its own package.json.`
      : `- No public repository with ${DEPENDENT_MIN_STARS}+ stars lists it in its own package.json yet.`,
    pkg.downloads &&
      `- Downloads: ${formatCount(pkg.downloads.lastWeek)} in the last 7 days, ${formatCount(pkg.downloads.last30Days)} in the last 30 days (through ${formatDay(pkg.downloads.through) ?? pkg.downloads.through}).`,
    readOn && `- Dependents last read: ${readOn}.`,
  ];
  const ranks = rankLines(pkg.ranks);
  const dependents = rows.map(
    (row, i) =>
      `${i + 1}. ${row.nameWithOwner} (${plural(row.stars, 'star', 'stars')}${row.archived ? ', archived' : ''}): ${absoluteUrl(getRepoPath(row.nameWithOwner))}`,
  );

  return [
    `# ${pkg.name} (npm package)`,
    '',
    ...(pkg.description ? [`> ${oneLine(pkg.description)}`, ''] : []),
    ...facts.filter(Boolean),
    '',
    '## Usage',
    '',
    ...usage.filter(Boolean),
    '',
    ...(ranks.length ? ['## Ranks among npm packages', '', ...ranks, ''] : []),
    ...(dependents.length
      ? [
          `## Repositories that use it, most-starred first${rows.length < pkg.dependentsCount ? ` (the first ${formatCount(rows.length)}; all of them on the GitRanks page)` : ''}`,
          '',
          ...dependents,
          '',
        ]
      : []),
    `How these numbers are counted: ${absoluteUrl(PACKAGE_METHODOLOGY_PATH)}`,
    '',
  ].join('\n');
}
