import type { FC, ReactNode } from 'react';

import { ITEMS_PER_PAGE, MAX_PAGES } from '@/app/app.consts';
import { Header } from '@/components/header/header';
import { JsonLd } from '@/components/json-ld/json-ld';
import { Page } from '@/components/page/page';
import { Pagination } from '@/components/pagination/pagination';
import { RankingHeaderSection } from '@/components/ranking-header-section/ranking-header-section';
import { RankingStats } from '@/components/ranking-stats/ranking-stats';
import { buildRankingStats } from '@/components/ranking-stats/ranking-stats.utils';
import { buildUserRankingItemList } from '@/components/ranking-table/ranking-item-list';
import { RankingTable } from '@/components/ranking-table/ranking-table';
import type { fetchLanguageFacts } from '@/graphql/helpers/fetch-language-facts';
import type { fetchRankedCounts } from '@/graphql/helpers/fetch-ranked-counts';
import { pageSuffix } from '@/lib/seo/page-metadata';
import type { CountryQuery, GlobalRankingsQuery } from '@/types/generated/graphql';
import type { RankingTypeClient } from '@/types/ranking.types';
import { getRankingConfigByType } from '@/utils/get-ranking-config-by-type';
import { getRankingTitle } from '@/utils/get-ranking-title';

/** A global ranking's header, title and ranking switch around a page of it, as its layout draws them. */
export const GlobalRankingFrame: FC<{ rankingType: RankingTypeClient; children: ReactNode }> = ({
  rankingType,
  children,
}) => (
  <>
    <Header section="rankings" />
    <Page className="max-w-5xl gap-6">
      <RankingHeaderSection rankingType={rankingType} />
      {children}
    </Page>
  </>
);

type GlobalRankingScreenProps = {
  rankingType: RankingTypeClient;
  page: number;
  rows: GlobalRankingsQuery['globalRankings'];
  countries: CountryQuery['country'];
  /** How many developers each ranking holds; read for the first page only. */
  rankedCounts: Awaited<ReturnType<typeof fetchRankedCounts>> | null;
  /** The leading languages; read for the first page only. */
  languages: Awaited<ReturnType<typeof fetchLanguageFacts>>;
};

/** A page of a global ranking: the table, the first page's facts in words, and the way to the next page. */
export const GlobalRankingScreen: FC<GlobalRankingScreenProps> = ({
  rankingType,
  page,
  rows,
  countries,
  rankedCounts,
  languages,
}) => {
  const offset = (page - 1) * ITEMS_PER_PAGE;
  const [title] = getRankingTitle(rankingType);
  const path = `/by/${rankingType}/${page}`;
  const [rankProp] = getRankingConfigByType(rankingType);
  const stats =
    page === 1
      ? buildRankingStats({
          rankingType,
          rankedCount: rankedCounts?.[`${rankProp}Users`],
          leaders: rows
            .slice(0, 3)
            .flatMap((row) => (row.user ? [{ login: row.user.login, score: row.user[rankProp] }] : [])),
          languages: languages.length
            ? { names: languages.map(({ language }) => language), date: languages[0].date }
            : null,
        })
      : [];

  return (
    <>
      <JsonLd payloads={[buildUserRankingItemList(`${title}${pageSuffix(page)}`, path, rankingType, rows, offset)]} />
      <RankingTable rankingType={rankingType} data={rows} countries={countries} />
      <RankingStats parts={stats} />
      <Pagination
        prev={page > 1 ? `/by/${rankingType}/${page - 1}` : undefined}
        next={rows?.length === ITEMS_PER_PAGE && page < MAX_PAGES ? `/by/${rankingType}/${page + 1}` : undefined}
      />
    </>
  );
};
