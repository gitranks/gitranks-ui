import type { SummaryPart } from '@/app/profile/[login]/utils/profile-summary';
import { formatCount, formatDay } from '@/app/repo/[owner]/[name]/utils/used-by-summary';
import type { PackageDependent, PackagePage } from '@/graphql/package-page';
import { getRepoPath } from '@/utils/repo-paths';

const COMPACT_LONG = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  compactDisplay: 'long',
  maximumSignificantDigits: 3,
});

/** "77.9 million", "54.2 thousand" from 10,000; plain digits below. */
export const formatCountLong = (value: number) => (value < 10_000 ? formatCount(value) : COMPACT_LONG.format(value));

const plural = (count: number, one: string, many: string) => `${formatCount(count)} ${count === 1 ? one : many}`;

const repoLink = (nameWithOwner: string): SummaryPart => ({ text: nameWithOwner, href: getRepoPath(nameWithOwner) });

type SummaryPackage = Pick<
  PackagePage,
  | 'name'
  | 'downloads'
  | 'dependentsCount'
  | 'dependentsStars'
  | 'repo'
  | 'repositoryName'
  | 'latestVersion'
  | 'firstPublishedAt'
  | 'dependentsReadAt'
>;

function downloadsSentence({ name, downloads }: SummaryPackage): string {
  if (!downloads) {
    return `${name} is an npm package.`;
  }
  return `${name} is an npm package downloaded ${formatCount(downloads.lastWeek)} times last week and ${formatCountLong(downloads.last52Weeks)} times in the last 12 months.`;
}

function dependentsParts(pkg: SummaryPackage, top: Pick<PackageDependent, 'nameWithOwner' | 'stars'> | undefined) {
  const { dependentsCount: count, dependentsStars: stars } = pkg;
  if (count === 0) {
    return [' No repository with 100+ stars depends on it directly yet.'];
  }
  const head = ` ${plural(count, 'repository', 'repositories')} with 100+ stars ${count === 1 ? 'depends' : 'depend'} on it directly`;
  const starsText = count === 1 ? '' : `, with ${plural(stars, 'star', 'stars')} between them`;
  if (!top) {
    return [`${head}${starsText}.`];
  }
  return [
    `${head}${starsText}; the most-starred is `,
    repoLink(top.nameWithOwner),
    ` (${plural(top.stars, 'star', 'stars')}).`,
  ];
}

function sourceParts({ repo, repositoryName }: SummaryPackage): SummaryPart[] {
  if (repo) {
    return [' Its source is ', repoLink(repo.nameWithOwner), ` (${plural(repo.stars, 'star', 'stars')}).`];
  }
  return repositoryName ? [` Its source is ${repositoryName}.`] : [];
}

function versionSentence({ latestVersion, firstPublishedAt }: SummaryPackage): string[] {
  const first = formatDay(firstPublishedAt);
  if (latestVersion && first) return [` Latest version ${latestVersion}, first published ${first}.`];
  if (latestVersion) return [` Latest version ${latestVersion}.`];
  return first ? [` First published ${first}.`] : [];
}

/**
 * The package in plain sentences, as a repository's Overview says its own: its downloads, the repositories with 100+
 * stars that depend on it and the most-starred of them, its source repository, its versions, then the read date.
 */
export function buildPackageSummary(
  pkg: SummaryPackage,
  top?: Pick<PackageDependent, 'nameWithOwner' | 'stars'>,
): SummaryPart[] {
  const read = formatDay(pkg.dependentsReadAt);
  return [
    downloadsSentence(pkg),
    ...dependentsParts(pkg, top),
    ...sourceParts(pkg),
    ...versionSentence(pkg),
    ...(read ? [` Dependents read on ${read}.`] : []),
  ];
}
