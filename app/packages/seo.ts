import type { Metadata } from 'next';

import {
  DEPENDENT_MIN_STARS,
  formatPackageCount,
  PACKAGE_RANKINGS,
  type PackageRankingOrder,
} from './package-rankings';
import type { QuestionItem } from '@/components/questions-block/questions-block';
import { buildPackageRankingItemList } from '@/components/ranking-table/ranking-item-list';
import type { PackageRankRows } from '@/graphql/helpers/fetch-package-rankings';
import { clipText } from '@/lib/seo/clip-text';
import { pageClause, pageMetadata, pageSuffix } from '@/lib/seo/page-metadata';
import { absoluteUrl } from '@/lib/seo/site';
import { packageRankingPath } from '@/utils/package-paths';

/** The one link preview image of the package rankings, all three. */
export const PACKAGE_RANKINGS_IMAGE = '/social/package-rankings.png';

type PackageRankingPage = {
  /** The registry's name in URLs, `npm`, and as written, `npm`. */
  registry: string;
  registryLabel: string;
  order: PackageRankingOrder;
  page: number;
};

/** "npm Package Ranking by Downloads", with " · Page 2" past the first page. */
export function packageRankingPageTitle({ registryLabel, order, page }: PackageRankingPage) {
  return `${registryLabel} Package Ranking by ${PACKAGE_RANKINGS[order].label}${pageSuffix(page)}`;
}

const count = (value: number, [one, many]: readonly [string, string]) =>
  `${formatPackageCount(value)} ${Math.round(value) === 1 ? one : many}`;

const joinNames = (names: string[]) =>
  names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;

/**
 * A package ranking page's title, description, canonical and preview image. The description says what the rank
 * counts, the page's top three and, when known, how many packages are ranked.
 */
export function buildPackageRankingMetadata(
  input: PackageRankingPage & { rows?: PackageRankRows | null; ranked?: number | null },
): Metadata {
  const { registry, registryLabel, order, page, rows, ranked } = input;
  const ranking = PACKAGE_RANKINGS[order];
  const top = (rows ?? []).slice(0, 3).map(({ name }) => name);
  const description = [
    `${registryLabel} packages ranked by ${ranking.rankedBy}${pageClause(page)}.`,
    top.length ? `${top.length === 1 ? 'The top package' : `The top ${top.length}`}: ${joinNames(top)}.` : '',
    ranked ? `${formatPackageCount(ranked)} packages ranked.` : '',
  ]
    .filter(Boolean)
    .join(' ');

  return pageMetadata({
    title: packageRankingPageTitle(input),
    description: clipText(description, 158),
    path: packageRankingPath(order, page, registry),
    images: [
      {
        url: absoluteUrl(PACKAGE_RANKINGS_IMAGE),
        width: 1200,
        height: 630,
        alt: `${registryLabel} package rankings on GitRanks`,
      },
    ],
  });
}

/** Home, the ranking, and the page past the first. */
function buildBreadcrumbs(input: PackageRankingPage) {
  const { registry, order, page } = input;
  const crumbs = [
    { name: 'Home', item: absoluteUrl('/') },
    { name: packageRankingPageTitle({ ...input, page: 1 }), item: absoluteUrl(packageRankingPath(order, 1, registry)) },
    ...(page > 1 ? [{ name: `Page ${page}`, item: absoluteUrl(packageRankingPath(order, page, registry)) }] : []),
  ];

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, i) => ({ '@type': 'ListItem', position: i + 1, ...crumb })),
  };
}

/** The page's JSON-LD: its packages as an `ItemList`, and where it sits as a `BreadcrumbList`. */
export function buildPackageRankingJsonLd(input: PackageRankingPage & { rows: PackageRankRows }): object[] {
  const { registry, order, page, rows } = input;
  const itemList = buildPackageRankingItemList(
    packageRankingPageTitle(input),
    packageRankingPath(order, page, registry),
    rows,
    registry,
  );

  return [itemList, buildBreadcrumbs(input)].filter((payload): payload is NonNullable<typeof payload> => !!payload);
}

/**
 * The questions under a ranking's first page, answered from that page: what it counts, who leads it, what a dependent
 * is, and how fresh the numbers are. A question whose answer has no data is left out.
 */
export function buildPackageRankingQuestions(
  input: PackageRankingPage & { rows: PackageRankRows; readOn?: string | null; ranksOn?: string | null },
): QuestionItem[] {
  const { registryLabel, order, rows, readOn, ranksOn } = input;
  const ranking = PACKAGE_RANKINGS[order];
  const [first, ...next] = rows;
  const items: QuestionItem[] = [
    {
      question: `What does the ${registryLabel} package ranking by ${ranking.label.toLowerCase()} count?`,
      answer: `${ranking.basis} A package is ranked once at least one repository with ${DEPENDENT_MIN_STARS}+ stars uses it directly.`,
    },
  ];

  if (first) {
    const after = next.slice(0, 2).map(({ name }) => name);
    items.push({
      question: `Which ${registryLabel} package is first by ${ranking.metricInSentence}?`,
      answer: `${first.name}, with ${count(first.value, ranking.unit)}.${after.length ? ` Then ${joinNames(after)}.` : ''}`,
    });
  }

  items.push(
    {
      question: 'What counts as a dependent?',
      answer: `A public repository with ${DEPENDENT_MIN_STARS}+ stars that lists the package in its own package.json. Lockfiles, forks and example, docs or test folders don't count, and neither does a package that only comes in through another package.`,
    },
    {
      question: 'How often are package rankings updated?',
      answer: [
        `Dependents are read once a month${readOn ? `, last on ${readOn}` : ''}.`,
        `Ranks are worked out again after each monthly read and at least once a week${ranksOn ? `; these are of ${ranksOn}` : ''}.`,
      ].join(' '),
    },
  );

  return items;
}
