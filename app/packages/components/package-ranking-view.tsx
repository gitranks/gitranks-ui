import type { FC, ReactNode } from 'react';

import {
  DEPENDENT_MIN_STARS,
  formatPackageDate,
  PACKAGE_RANKINGS,
  type PackageRankingOrder,
  packageRankingBasis,
  packageRankingOf,
  packageRankingOrdersOf,
} from '../package-rankings';
import { buildPackageRankingJsonLd, buildPackageRankingQuestions } from '../seo';
import { GoToPackageField } from './go-to-package-field';
import { PackageBetaNotice } from './package-beta-notice';
import { PackageRankingTable } from './package-ranking-table';
import { ITEMS_PER_PAGE, MAX_PAGES } from '@/app/app.consts';
import { Header } from '@/components/header/header';
import { JsonLd } from '@/components/json-ld/json-ld';
import { Page } from '@/components/page/page';
import { Pagination } from '@/components/pagination/pagination';
import { Pill } from '@/components/pill/pill';
import { QuestionsBlock } from '@/components/questions-block/questions-block';
import { RankingHeaderSection } from '@/components/ranking-header-section/ranking-header-section';
import { RankingStats } from '@/components/ranking-stats/ranking-stats';
import { buildPackageRankingStats } from '@/components/ranking-stats/ranking-stats.utils';
import type { PackageRankingFactsData, PackageRankRows } from '@/graphql/helpers/fetch-package-rankings';
import { REGISTRIES, REGISTRY_IDS, type RegistryId } from '@/lib/packages/registries';
import { packageRankingPath } from '@/utils/package-paths';

type PackageRankingProps = {
  /** The registry's name in URLs, `npm`, and as written, `npm`. */
  registry: RegistryId;
  registryLabel: string;
  order: PackageRankingOrder;
};

type PackageRankingFrameProps = Omit<PackageRankingProps, 'registryLabel'> & {
  /** The last day of the downloads ranking's period, as the facts give it; no date when unknown. */
  downloadsThrough?: unknown;
  children: ReactNode;
};

/**
 * The registry switch beside "Rank by", with more than one registry listed (none with one): each registry's ranking in
 * the same order when it has it, else by dependents' stars.
 */
function registrySwitches(registry: RegistryId, order: PackageRankingOrder) {
  if (REGISTRY_IDS.length < 2) return [];
  const options = REGISTRY_IDS.map((id) => ({
    href: packageRankingPath(packageRankingOrdersOf(id).includes(order) ? order : 'dependents-stars', 1, id),
    label: REGISTRIES[id].label,
    active: id === registry,
  }));
  return [{ label: 'Registry:', options }];
}

/**
 * A package ranking's frame, as its layout draws it: the title with its Beta pill, the registry (with more than one),
 * "Rank by", what the rank is based on, the "Go to a package" field and the Beta notice, around a page of the ranking.
 */
export const PackageRankingFrame: FC<PackageRankingFrameProps> = ({ registry, order, downloadsThrough, children }) => (
  <>
    <Header section="rankings" />
    <Page className="max-w-5xl gap-6">
      <RankingHeaderSection
        title={`Package Ranking · ${PACKAGE_RANKINGS[order].label}`}
        pill={
          <Pill tone="violet" size="small">
            Beta
          </Pill>
        }
        optionsLabel="Rank by:"
        switches={registrySwitches(registry, order)}
        options={packageRankingOrdersOf(registry).map((option) => ({
          href: packageRankingPath(option, 1, registry),
          label: PACKAGE_RANKINGS[option].label,
          active: option === order,
        }))}
        subtitle={packageRankingBasis(order, formatPackageDate(downloadsThrough), registry)}
      />
      <GoToPackageField registry={registry} />
      <PackageBetaNotice registry={registry} />
      {children}
    </Page>
  </>
);

/** The one state a page draws when its ranking cannot be read now. */
const RankingNotice: FC<{ title: string; children: ReactNode }> = ({ title, children }) => (
  <div className="flex flex-col gap-2 py-10 text-center">
    <p className="text-lg font-semibold">{title}</p>
    <p className="text-muted-foreground">{children}</p>
  </div>
);

type PackageRankingScreenProps = PackageRankingProps & {
  page: number;
  /** The page's rows; `undefined` when the ranking cannot be read now. */
  rows: PackageRankRows | undefined;
  /** The ranking's facts, read for the first page only; `undefined` when they cannot be read now. */
  facts?: PackageRankingFactsData | null;
};

/**
 * A page of a package ranking: the table, the way to the next page, and on the first page the ranking's facts in words
 * and its questions.
 */
export const PackageRankingScreen: FC<PackageRankingScreenProps> = ({
  registry,
  registryLabel,
  order,
  page,
  rows,
  facts,
}) => {
  if (!rows) {
    return (
      <RankingNotice title="Package rankings are not available right now">Try again in a few minutes.</RankingNotice>
    );
  }

  if (!rows.length) {
    return (
      <RankingNotice title="No packages are ranked yet">
        Packages are ranked once the first monthly read of their dependents is done.
      </RankingNotice>
    );
  }

  const ranking = packageRankingOf(order, registry);
  const pageProps = { registry, registryLabel, order, page };
  const readOn = formatPackageDate(facts?.dependentsReadAt);
  const ranksOn = formatPackageDate(facts?.ranksAt);
  const downloadsTo = formatPackageDate(facts?.downloadsThrough);
  const isDownloads = order === 'downloads';
  const isFirstPage = page === 1;
  const stats = isFirstPage
    ? buildPackageRankingStats({
        registry: registryLabel,
        registrySlug: registry,
        metric: ranking.metricInSentence,
        minStars: DEPENDENT_MIN_STARS,
        ranked: facts?.ranked,
        // The downloads ranking's numbers are of its own period, not of the monthly read.
        readOn: isDownloads ? null : readOn,
        downloadsTo: isDownloads ? downloadsTo : null,
        ranksOn,
        leaders: rows.slice(0, 3).map(({ name, displayName, value }) => ({ name, displayName, value })),
      })
    : [];

  return (
    <>
      <JsonLd payloads={buildPackageRankingJsonLd({ ...pageProps, rows })} />
      <PackageRankingTable ranking={ranking} data={rows} registry={registry} />
      <Pagination
        prev={page > 1 ? packageRankingPath(order, page - 1, registry) : undefined}
        next={
          rows.length === ITEMS_PER_PAGE && page < MAX_PAGES ? packageRankingPath(order, page + 1, registry) : undefined
        }
      />
      <RankingStats parts={stats} />
      {isFirstPage && (
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold">Questions</h2>
          <QuestionsBlock
            items={buildPackageRankingQuestions({ ...pageProps, rows, readOn, ranksOn, downloadsTo })}
            jsonLd
            className="flex flex-col gap-4 text-sm"
          />
        </section>
      )}
    </>
  );
};
