import type { FC, ReactNode } from 'react';

import {
  DEPENDENT_MIN_STARS,
  formatPackageDate,
  PACKAGE_RANKING_ORDER_LIST,
  PACKAGE_RANKINGS,
  type PackageRankingOrder,
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
import { packageRankingPath } from '@/utils/package-paths';

type PackageRankingProps = {
  /** The registry's name in URLs, `npm`, and as written, `npm`. */
  registry: string;
  registryLabel: string;
  order: PackageRankingOrder;
};

/**
 * A package ranking's frame, as its layout draws it: the title with its Beta pill, "Rank by", what the rank is based
 * on, the "Go to a package" field and the Beta notice, around a page of the ranking.
 */
export const PackageRankingFrame: FC<PackageRankingProps & { children: ReactNode }> = ({
  registry,
  order,
  children,
}) => (
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
        options={PACKAGE_RANKING_ORDER_LIST.map((option) => ({
          href: packageRankingPath(option, 1, registry),
          label: PACKAGE_RANKINGS[option].label,
          active: option === order,
        }))}
        subtitle={PACKAGE_RANKINGS[order].basis}
      />
      <GoToPackageField registry={registry} />
      <PackageBetaNotice />
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

  const ranking = PACKAGE_RANKINGS[order];
  const pageProps = { registry, registryLabel, order, page };
  const readOn = formatPackageDate(facts?.dependentsReadAt);
  const ranksOn = formatPackageDate(facts?.ranksAt);
  const isFirstPage = page === 1;
  const stats = isFirstPage
    ? buildPackageRankingStats({
        registry: registryLabel,
        registrySlug: registry,
        metric: ranking.metricInSentence,
        minStars: DEPENDENT_MIN_STARS,
        ranked: facts?.ranked,
        readOn,
        ranksOn,
        leaders: rows.slice(0, 3).map(({ name, value }) => ({ name, value })),
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
            items={buildPackageRankingQuestions({ ...pageProps, rows, readOn, ranksOn })}
            jsonLd
            className="flex flex-col gap-4 text-sm"
          />
        </section>
      )}
    </>
  );
};
