import type { Metadata } from 'next';

import { MethodologySection as Section } from '../components/methodology-section';
import {
  DEPENDENT_MIN_STARS,
  PACKAGE_RANKING_ORDER_LIST,
  PACKAGE_RANKINGS,
  packageRankingOf,
} from '@/app/packages/package-rankings';
import { Header } from '@/components/header/header';
import { Link } from '@/components/link/link';
import { Page } from '@/components/page/page';
import { Pill } from '@/components/pill/pill';
import {
  type DownloadsUnit,
  REGISTRIES,
  REGISTRY_IDS,
  type RegistryId,
  registryLabelList,
  registryOf,
} from '@/lib/packages/registries';
import { pageMetadata } from '@/lib/seo/page-metadata';
import { packageRankingPath } from '@/utils/package-paths';

export const metadata: Metadata = pageMetadata({
  title: 'How package rankings work',
  description: `How GitRanks ranks packages from ${registryLabelList()}: by downloads, by the stars of the GitHub repositories with ${DEPENDENT_MIN_STARS}+ stars that use them directly, and by how many do. What counts as a dependent, and how often the numbers are read.`,
  path: '/methodology/packages',
});

/** "npm and crates.io": the labels of the listed registries whose downloads are counted in this unit (`null`: none). */
const labelsOf = (unit: DownloadsUnit | null) =>
  listOf(REGISTRY_IDS.filter((id) => registryOf(id).downloads === unit).map((id) => REGISTRIES[id].label));

/** "a", "a and b", "a, b and c". */
function listOf(items: readonly string[]): string {
  return items.length > 1 ? `${items.slice(0, -1).join(', ')} and ${items.at(-1)}` : (items[0] ?? '');
}

const WEEKLY = labelsOf('week');
const MONTHLY = labelsOf('month');
const UNCOUNTED = labelsOf(null);

/** What each ranking ranks by, and what its change column compares. */
const RANKINGS: Record<(typeof PACKAGE_RANKING_ORDER_LIST)[number], { ranksBy: string; change: string }> = {
  downloads: {
    ranksBy: [
      `Downloads over 7 days on ${WEEKLY}, and over the last whole calendar month on ${MONTHLY}; the ranking says which days it counts.`,
      UNCOUNTED ? ` ${UNCOUNTED} publish no download counts, so they have no downloads ranking.` : '',
    ].join(''),
    change: 'Against the 7 days before',
  },
  'dependents-stars': {
    ranksBy: `The stars of every repository with ${DEPENDENT_MIN_STARS}+ stars that uses the package directly, added up`,
    change: 'Against the monthly read before',
  },
  dependents: {
    ranksBy: `How many repositories with ${DEPENDENT_MIN_STARS}+ stars use the package directly`,
    change: 'The repositories that started using it since the monthly read before',
  },
};

/** The first listed registry whose downloads are counted in this unit. */
const firstOf = (unit: DownloadsUnit) => REGISTRY_IDS.find((id) => registryOf(id).downloads === unit) as RegistryId;

/**
 * A ranking's change column, by its label and what it compares: "This month: against the monthly read before". The
 * downloads ranking's label is its unit's, so each unit has its own: "npm and crates.io: vs last week, against the 7
 * days before. PyPI, pub.dev and Packagist: vs the month before."
 */
function changeCellOf(order: (typeof PACKAGE_RANKING_ORDER_LIST)[number]): string {
  if (order !== 'downloads') return `${PACKAGE_RANKINGS[order].change}: ${RANKINGS[order].change.toLowerCase()}`;
  return `${WEEKLY}: ${packageRankingOf('downloads', firstOf('week')).change}, ${RANKINGS.downloads.change.toLowerCase()}. ${MONTHLY}: ${packageRankingOf('downloads', firstOf('month')).change}.`;
}

/** Each listed registry's dependency file, as a dependent lists a package: "package.json for npm". */
const MANIFESTS = listOf(REGISTRY_IDS.map((id) => `${REGISTRIES[id].manifest} for ${REGISTRIES[id].label}`));

/** A registry's rankings, by the ranking it opens on. */
const rankingsLink = (registry: RegistryId) => (
  <Link href={packageRankingPath(registryOf(registry).downloads ? 'downloads' : 'dependents-stars', 1, registry)}>
    {REGISTRIES[registry].label} package rankings
  </Link>
);

/** How each registry is read, one paragraph each. */
const HOW_READ: Record<RegistryId, string> = {
  npm: "A package's facts and its downloads come from the npm registry, counted by the day.",
  pypi: "A project's facts come from PyPI's JSON API, and its source repository from the links the project gives there. Its downloads come from PyPI's public download statistics, counted one calendar month at a time, from the first month GitRanks read on: there are no older numbers. PyPI takes Zope.Interface, zope.interface and zope-interface as one name, so GitRanks does too: its addresses use the lower-case form with dashes.",
  go: "A module's facts come from the Go module proxy and pkg.go.dev. Go publishes no download counts, so Go modules are ranked by the repositories that depend on them alone. A module path is kept as written, capitals included.",
  crates:
    "A crate's facts and its downloads come from crates.io's public database dump, read every day, with downloads counted by the day. crates.io takes Serde-JSON and serde_json as one name, so GitRanks does too: its addresses use the lower-case form with an underscore.",
  pub: "A package's facts come from pub.dev's API. Its downloads are pub.dev's 30-day count, read in the first days of each month and scaled to the calendar month.",
  packagist:
    "A package's facts come from packagist.org, with its downloads counted a month at a time, past months included. Composer reads names without case, so GitRanks' addresses use the lower-case form.",
  maven:
    "An artifact's facts come from deps.dev, which reads Maven Central. Maven Central publishes no download counts, so its artifacts are ranked by the repositories that depend on them alone. An artifact is named groupId:artifactId, and its address on GitRanks is groupId/artifactId.",
};

export default function PackageMethodologyPage() {
  return (
    <>
      <Header />
      <Page className="max-w-3xl gap-8 leading-relaxed">
        <div className="flex flex-col gap-3">
          <h1 className="flex items-center gap-2 text-2xl md:text-3xl font-semibold">
            How package rankings work{' '}
            <Pill tone="violet" size="small">
              Beta
            </Pill>
          </h1>
          <p>
            GitRanks ranks packages by who uses them on GitHub: how many popular repositories depend on a package, how
            many stars those repositories have between them, and, where the registry counts them, how often the package
            is downloaded. Package rankings are new: for now they cover {registryLabelList()}, and count direct
            dependents only. Each registry is ranked on its own.
          </p>
        </div>

        <Section title="What a dependent is">
          <p>
            A dependent is a public GitHub repository with {DEPENDENT_MIN_STARS}+ stars that lists the package in a
            dependency file of its own, as GitHub reports them: {MANIFESTS}. A repository counts once for a package,
            however many of its files list it.
          </p>
        </Section>

        <Section title="What does not count">
          <ul className="list-disc pl-6">
            <li>Repositories with fewer than {DEPENDENT_MIN_STARS} stars.</li>
            <li>
              Packages a repository only gets through another package: lockfiles are not read, so only direct
              dependencies count.
            </li>
            <li>Forks.</li>
            <li>Dependency files in example, docs or test folders.</li>
          </ul>
        </Section>

        <Section title="The three rankings">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr>
                  {['Ranking', 'Ranks by', 'Change column'].map((cell) => (
                    <th key={cell} className="border-b p-2 font-medium">
                      {cell}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PACKAGE_RANKING_ORDER_LIST.map((order) => (
                  <tr key={order}>
                    <th scope="row" className="border-b p-2 align-top font-normal">
                      <Link href={packageRankingPath(order)}>{PACKAGE_RANKINGS[order].label}</Link>
                    </th>
                    <td className="border-b p-2 align-top">{RANKINGS[order].ranksBy}</td>
                    <td className="border-b p-2 align-top">{changeCellOf(order)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            A package is ranked once at least one repository with {DEPENDENT_MIN_STARS}+ stars uses it directly. Rank #1
            has the highest number.
          </p>
        </Section>

        <Section title="How often the numbers are read">
          <p>
            Dependents are read once a month. Ranks are worked out again after each monthly read and at least once a
            week, so a downloads ranking follows the latest week on {WEEKLY}, and the latest whole month on {MONTHLY}.
            Every number carries the date it was read: the dependents&apos; rankings say when the dependents were read,
            a downloads ranking names the last of its 7 days or its month, and each ranking says when its ranks were
            worked out.
          </p>
          <p>
            A package&apos;s own page can show newer numbers than its ranks: they move on the page as soon as they are
            read again, and in the rankings at the next time ranks are worked out.
          </p>
        </Section>

        <Section title="Registries">
          {REGISTRY_IDS.map((registry) => (
            <p key={registry}>
              <strong>{REGISTRIES[registry].label}.</strong> {HOW_READ[registry]} The rankings are at{' '}
              {rankingsLink(registry)}.
            </p>
          ))}
        </Section>
      </Page>
    </>
  );
}
