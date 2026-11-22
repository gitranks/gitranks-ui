import { registryOfRepoPackage, sharedRegistryOf } from './repo-package-registry';
import type { SummaryPart } from '@/app/profile/[login]/utils/profile-summary';
import type { QuestionItem } from '@/components/questions-block/questions-block';
import type { RepoPackage, RepoPackages, RepoUsedByItem } from '@/graphql/repo-packages';
import {
  DOWNLOADS_UNIT_TEXT,
  type DownloadsUnit,
  downloadsUnitOf,
  REGISTRIES,
  registryManifestList,
  spelledNameOf,
} from '@/lib/packages/registries';
import { packagePath } from '@/utils/package-paths';
import { getRepoPath } from '@/utils/repo-paths';

const DATE_FORMAT = new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeZone: 'UTC' });
const COMPACT = new Intl.NumberFormat('en-US', { notation: 'compact', maximumSignificantDigits: 3 });

/** "214", "1,284". */
export const formatCount = (value: number) => value.toLocaleString('en-US');

/** "2,118", "54.2k", "527k": thousands in lower case, as the designs write them. */
export const formatDownloadsShort = (value: number) =>
  value < 10_000 ? formatCount(value) : COMPACT.format(value).replace('K', 'k');

/** "November 16, 2026"; nothing for a date that does not read. */
export function formatDay(value: unknown): string | undefined {
  if (typeof value !== 'string' && !(value instanceof Date)) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : DATE_FORMAT.format(date);
}

const plural = (count: number, one: string, many: string) => `${formatCount(count)} ${count === 1 ? one : many}`;

/** "a", "a and b", "a, b and c" as summary parts. */
function listParts(parts: SummaryPart[][]): SummaryPart[] {
  return parts.flatMap((part, i) => [...(i === 0 ? [] : [i === parts.length - 1 ? ' and ' : ', ']), ...part]);
}

/** "a", "a and b", "a, b and c". */
export const listText = (items: readonly string[]) =>
  items.length <= 1 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;

const packageLink = (pkg: Pick<RepoPackage, 'name' | 'displayName' | 'registry'>): SummaryPart => ({
  text: spelledNameOf(pkg),
  href: packagePath(pkg.name, registryOfRepoPackage(pkg)),
});

/** "npm packages" when every package is on one registry, "packages" across several; "npm package" for one. */
function packagesWord(packages: Pick<RepoPackages, 'items'>, one = false): string {
  const registry = sharedRegistryOf(packages.items);
  const word = one ? 'package' : 'packages';
  return registry ? `${REGISTRIES[registry].label} ${word}` : word;
}

/** The units a repository's downloads are added up in, in the order they are said: npm's week, then PyPI's month. */
const UNITS: readonly DownloadsUnit[] = ['week', 'month'];

/**
 * The unit a repository's package is counted in; `null` on a registry that publishes no download counts or whose first
 * count is not read yet.
 */
const unitOf = (pkg: Pick<RepoPackage, 'registry'>) => downloadsUnitOf(registryOfRepoPackage(pkg));

/**
 * A repository's package's downloads in its registry's unit, with how it is said after the count: last week's ("a
 * week") on npm, last month's ("last month") on PyPI. `null` on a registry with no download counts, and on PyPI before
 * its first month is read.
 */
export function repoPackageDownloadsOf(
  pkg: Pick<RepoPackage, 'registry' | 'downloadsLastWeek' | 'downloadsLastMonth'>,
): { count: number; unit: DownloadsUnit; per: string } | null {
  const unit = unitOf(pkg);
  const count = unit === 'week' ? pkg.downloadsLastWeek : unit === 'month' ? pkg.downloadsLastMonth : null;
  return unit && typeof count === 'number' ? { count, unit, per: DOWNLOADS_UNIT_TEXT[unit].per } : null;
}

/** One of a repository's download totals: the packages of one unit added up, and how it is said after the count. */
export type DownloadsFigure = { count: number; unit: DownloadsUnit; per: string };

/**
 * A repository's downloads, one figure a unit, never a week added to a month: its packages counted by the week (npm),
 * then those counted a month at a time (PyPI), each "… on npm" when the unit's packages are on one registry. A month is
 * said once one of its packages has a month read. None when no package is counted; a repository with no package listed
 * says npm's week, as it did.
 */
export function downloadsFiguresOf(
  packages: Pick<RepoPackages, 'items' | 'downloadsLastWeek' | 'downloadsLastMonth'>,
): DownloadsFigure[] {
  return UNITS.flatMap((unit) => {
    const items = packages.items.filter((pkg) => unitOf(pkg) === unit);
    const counted =
      unit === 'week' ? packages.items.length === 0 || items.length > 0 : items.some(repoPackageDownloadsOf);
    if (!counted) return [];
    const registry = sharedRegistryOf(items);
    const per = DOWNLOADS_UNIT_TEXT[unit].per;
    return [
      {
        count: unit === 'week' ? packages.downloadsLastWeek : packages.downloadsLastMonth,
        unit,
        per: registry ? `${per} on ${REGISTRIES[registry].label}` : per,
      },
    ];
  });
}
const repoLink = (nameWithOwner: string): SummaryPart => ({ text: nameWithOwner, href: getRepoPath(nameWithOwner) });

/** The read dates, last: "Dependents read on …; downloads updated on …." */
function readDates(packages: RepoPackages): string[] {
  const dependents = formatDay(packages.dependentsReadAt);
  const downloads = formatDay(packages.downloadsReadAt);
  if (dependents && downloads && downloads !== dependents) {
    return [` Dependents read on ${dependents}; downloads updated ${downloads}.`];
  }
  if (dependents) return [` Dependents read on ${dependents}.`];
  return downloads ? [` Downloads updated ${downloads}.`] : [];
}

/** How many packages it lists, and its packages at once when they are three or fewer. */
function publishes(nameWithOwner: string, packages: RepoPackages): SummaryPart[] {
  const { total, items } = packages;
  if (total === 1) {
    return [`${nameWithOwner} publishes one ${packagesWord(packages, true)}, `, packageLink(items[0]), '.'];
  }
  if (total <= 3 && items.length === total) {
    return [
      `${nameWithOwner} publishes ${total} ${packagesWord(packages)}: `,
      ...listParts(items.map((pkg) => [packageLink(pkg)])),
      '.',
    ];
  }
  return [`${nameWithOwner} publishes ${formatCount(total)} ${packagesWord(packages)}.`];
}

/**
 * " It is downloaded 412,880 times a week on npm.", " It was downloaded 1,200,000 times last month on PyPI.", " Together
 * they are downloaded … a week on npm, and … last month on PyPI.": each figure in its own unit.
 */
function downloadsSentence(packages: RepoPackages): string {
  const [first, ...more] = downloadsFiguresOf(packages);
  if (!first) return '';
  const past = first.unit === 'month';
  const subject =
    packages.total === 1
      ? `It ${past ? 'was' : 'is'}`
      : `Together ${packages.total <= 3 ? 'the packages' : 'they'} ${past ? 'were' : 'are'}`;
  const rest = more.map(({ count, per }) => `, and ${formatCount(count)} times ${per}`).join('');
  return ` ${subject} downloaded ${formatCount(first.count)} times ${first.per}${rest}.`;
}

/**
 * The Used by tab in plain sentences, as the Overview's summary: what the repository publishes, how many repositories
 * with 100+ stars depend on it and the most-starred of them, the downloads, then the read dates.
 */
export function buildUsedBySummary(
  nameWithOwner: string,
  packages: RepoPackages,
  top: readonly Pick<RepoUsedByItem, 'nameWithOwner' | 'stars'>[],
): SummaryPart[] {
  const parts: SummaryPart[] = publishes(nameWithOwner, packages);
  const one = packages.total === 1;

  if (packages.dependents === 0) {
    parts.push(
      one
        ? ' No repository with 100+ stars depends on it directly yet.'
        : ' No repository with 100+ stars depends on any of them directly yet.',
    );
    parts.push(downloadsSentence(packages));
    return parts;
  }

  const dependents = plural(packages.dependents, 'repository', 'repositories');
  const [first, ...rest] = top;
  if (one) {
    parts.push(` ${dependents} with 100+ stars ${packages.dependents === 1 ? 'depends' : 'depend'} on it directly`);
    if (first)
      parts.push('; the most-starred is ', repoLink(first.nameWithOwner), ` (${plural(first.stars, 'star', 'stars')})`);
    parts.push('.');
  } else if (packages.total <= 3) {
    parts.push(
      ` ${dependents} with 100+ stars ${packages.dependents === 1 ? 'depends' : 'depend'} on at least one of them directly.`,
    );
    if (first) {
      parts.push(' The most-starred is ', repoLink(first.nameWithOwner), ` (${plural(first.stars, 'star', 'stars')})`);
      const followers = rest.slice(0, 2).map(({ nameWithOwner: name }) => name);
      parts.push(followers.length ? `, followed by ${listText(followers)}.` : '.');
    }
  } else {
    const [most] = packages.items;
    const unused = packages.items.filter(({ dependents: count }) => count === 0);
    parts.push(
      ` ${dependents} with 100+ stars ${packages.dependents === 1 ? 'depends' : 'depend'} on at least one of them directly; `,
      packageLink(most),
      ` is used most (${formatCount(most.dependents)})`,
    );
    if (unused.length === 1) {
      parts.push(', and ', packageLink(unused[0]), ' has no such dependents yet');
    } else if (unused.length > 1) {
      parts.push(`, and ${unused.length} of them have no such dependents yet`);
    }
    parts.push('.');
  }

  parts.push(downloadsSentence(packages), ...readDates(packages));
  return parts;
}

/**
 * The Overview card's line: "231 repositories with 100+ stars depend on its 3 npm packages, 527k downloads a week."
 * `downloads` is the week's figure, `downloadsLastMonth` the month's, there only when one is said (PyPI); without
 * download counts the line ends after the packages, and `downloads` is `null`.
 */
export function usedByCardLine(packages: RepoPackages): {
  dependents: string;
  what: string;
  downloads: string | null;
  downloadsLastMonth?: string;
} {
  const figures = downloadsFiguresOf(packages);
  const week = figures.find(({ unit }) => unit === 'week');
  const month = figures.find(({ unit }) => unit === 'month');
  return {
    dependents: formatCount(packages.dependents),
    what: `${packages.dependents === 1 ? 'repository' : 'repositories'} with 100+ stars ${packages.dependents === 1 ? 'depends' : 'depend'} on ${
      packages.total === 1
        ? `its ${packagesWord(packages, true)} ${spelledNameOf(packages.items[0])}`
        : `its ${formatCount(packages.total)} ${packagesWord(packages)}`
    }${figures.length ? ', ' : '.'}`,
    downloads: week ? formatDownloadsShort(week.count) : null,
    ...(month ? { downloadsLastMonth: formatDownloadsShort(month.count) } : {}),
  };
}

/** The empty state's title: "No repository with 100+ stars uses @nebula/ui directly yet". */
export const noDependentsTitle = (packages: RepoPackages) =>
  packages.total === 1
    ? `No repository with 100+ stars uses ${spelledNameOf(packages.items[0])} directly yet`
    : 'No repository with 100+ stars uses its packages directly yet';

/** The empty state's note: when the next read is, and the downloads. */
export function noDependentsNote(packages: RepoPackages): string {
  const next = formatDay(packages.nextDependentsReadAt);
  return [
    'We read every repository with 100+ stars once a month.',
    next ? ` The next read is on ${next}.` : '',
    downloadsSentence(packages),
  ].join('');
}

/**
 * "How is this counted?", on the Used by tab and wherever its numbers are explained: the files of the registries the
 * repository's packages are on (every listed registry's, for none).
 */
export function usedByCountedOf(packages: Pick<RepoPackages, 'items'>): string {
  const registries = [...new Set(packages.items.map(registryOfRepoPackage))];
  return `From each repository's own ${registryManifestList(registries.length ? registries : undefined)} files, workspaces included. Lockfiles, forks and example, docs or test folders don't count. We read every repository with 100+ stars once a month.`;
}

/**
 * The Used by tab's questions, each answered from the tab's own numbers: who uses it, which package is used most (with
 * two or more), and how it is counted. None without a dependent.
 */
export function buildUsedByQuestions(
  nameWithOwner: string,
  packages: RepoPackages,
  top: readonly Pick<RepoUsedByItem, 'nameWithOwner'>[],
): QuestionItem[] {
  if (packages.dependents === 0) return [];

  const one = packages.total === 1;
  const names = top.slice(0, 3).map((row) => row.nameWithOwner);
  const dependents = plural(packages.dependents, 'repository', 'repositories');
  const verb = packages.dependents === 1 ? 'depends' : 'depend';
  const mostStarred = names.length ? ` The most-starred ${names.length === 1 ? 'is' : 'are'} ${listText(names)}.` : '';
  const items: QuestionItem[] = [
    {
      question: `Who uses ${nameWithOwner}?`,
      answer: `${dependents} with 100+ stars ${verb} on ${one ? `its package ${spelledNameOf(packages.items[0])}` : 'its packages'} directly.${mostStarred}`,
    },
  ];

  const [most] = packages.items;
  if (!one && most && most.dependents > 0) {
    const dependentsText = `${plural(most.dependents, 'repository', 'repositories')} with 100+ stars`;
    const downloads = repoPackageDownloadsOf(most);
    items.push({
      question: `Which ${nameWithOwner} package is used most?`,
      answer: downloads
        ? `${spelledNameOf(most)}: ${dependentsText} and ${formatCount(downloads.count)} downloads ${downloads.per}.`
        : `${spelledNameOf(most)}: ${dependentsText}.`,
    });
  }

  items.push({ question: 'How is this counted?', answer: usedByCountedOf(packages) });
  return items;
}
