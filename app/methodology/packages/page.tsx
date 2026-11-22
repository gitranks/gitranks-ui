import type { Metadata } from 'next';

import { MethodologySection as Section } from '../components/methodology-section';
import { DEPENDENT_MIN_STARS, PACKAGE_RANKING_ORDER_LIST, PACKAGE_RANKINGS } from '@/app/packages/package-rankings';
import { Header } from '@/components/header/header';
import { Link } from '@/components/link/link';
import { Page } from '@/components/page/page';
import { Pill } from '@/components/pill/pill';
import { pageMetadata } from '@/lib/seo/page-metadata';
import { packageRankingPath } from '@/utils/package-paths';

export const metadata: Metadata = pageMetadata({
  title: 'How package rankings work',
  description: `How GitRanks ranks npm and PyPI packages: by downloads, by the stars of the GitHub repositories with ${DEPENDENT_MIN_STARS}+ stars that use them directly, and by how many do. What counts as a dependent, and how often the numbers are read.`,
  path: '/methodology/packages',
});

/** What each ranking ranks by, and what its change column compares. */
const RANKINGS: Record<(typeof PACKAGE_RANKING_ORDER_LIST)[number], { ranksBy: string; change: string }> = {
  downloads: {
    ranksBy:
      'Downloads from the npm registry over 7 days, and from PyPI over the last whole calendar month; the ranking says which days it counts',
    change: 'Against the 7 days before on npm, and the month before on PyPI',
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
            GitRanks ranks npm and PyPI packages by who uses them on GitHub: how many popular repositories depend on a
            package, how many stars those repositories have between them, and how often the package is downloaded.
            Package rankings are new: for now they cover npm and PyPI packages only, and count direct dependents only.
            Each registry is ranked on its own.
          </p>
        </div>

        <Section title="What a dependent is">
          <p>
            A dependent is a public GitHub repository with {DEPENDENT_MIN_STARS}+ stars that lists the package in a
            dependency file of its own: a package.json for an npm package, a requirements.txt, pyproject.toml or other
            Python dependency file for a PyPI one. A repository counts once for a package, however many of its files
            list it.
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
                    <td className="border-b p-2 align-top">
                      {PACKAGE_RANKINGS[order].change}: {RANKINGS[order].change.toLowerCase()}
                    </td>
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
            week, so the npm downloads ranking follows the latest week, and the PyPI one the latest whole month. Every
            number carries the date it was read: the dependents&apos; rankings say when the dependents were read, the
            downloads ranking names the last of its 7 days on npm and its month on PyPI, and each ranking says when its
            ranks were worked out.
          </p>
          <p>
            A package&apos;s own page can show newer numbers than its ranks: they move on the page as soon as they are
            read again, and in the rankings at the next time ranks are worked out.
          </p>
        </Section>

        <Section title="Registries">
          <p>
            <strong>npm.</strong> A package&apos;s facts and its downloads come from the npm registry, counted by the
            day; the rankings are at <Link href={packageRankingPath('downloads')}>npm package rankings</Link>.
          </p>
          <p>
            <strong>PyPI.</strong> A project&apos;s facts come from PyPI&apos;s JSON API, and its source repository from
            the links the project gives there. Its downloads come from PyPI&apos;s public download statistics, counted
            one calendar month at a time, from the first month GitRanks read on: there are no older numbers. Its
            dependents come from the dependency files GitHub reports for each repository. PyPI takes{' '}
            <code>Zope.Interface</code>, <code>zope.interface</code> and <code>zope-interface</code> as one name, so
            GitRanks does too: its addresses use the lower-case form with dashes. The rankings are at{' '}
            <Link href={packageRankingPath('downloads', 1, 'pypi')}>PyPI package rankings</Link>.
          </p>
        </Section>
      </Page>
    </>
  );
}
