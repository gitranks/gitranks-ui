import { ArrowDownIcon } from 'lucide-react';
import NextLink from 'next/link';
import type { FC } from 'react';

import { countryAnchor } from '../country-paths';
import {
  COUNTRIES_PER_PAGE,
  COUNTRY_ORDER_LIST,
  COUNTRY_ORDERS,
  type CountryRanking,
  type CountryRankingRow,
  countriesPath,
  countryRankingHref,
} from '../country-ranking';
import { CountryRankingTools } from './country-ranking-tools';
import { Flag } from '@/components/flag/flag';
import { JsonLd } from '@/components/json-ld/json-ld';
import { Link } from '@/components/link/link';
import { Pagination } from '@/components/pagination/pagination';
import { RankDelta } from '@/components/rank-delta/rank-delta';
import { RankingStats } from '@/components/ranking-stats/ranking-stats';
import { ClickableRow } from '@/components/ranking-table/clickable-row';
import { ShareBar } from '@/components/summary-ranking/share-bar';
import { SummaryTabs } from '@/components/summary-ranking/summary-tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserCard } from '@/components/user-card/user-card';
import { buildRankingItemList } from '@/lib/seo/json-ld';
import { CountrySummaryOrder } from '@/types/generated/graphql';
import { formatNumberShort } from '@/utils/format-number-short';
import { formatSummaryDate } from '@/utils/format-summary-date';

type CountryRankingScreenProps = {
  order: CountrySummaryOrder;
  page: number;
  ranking: CountryRanking;
};

const full = (n: number) => Math.round(n).toLocaleString('en-US');

const metricOf = (row: CountryRankingRow, order: CountrySummaryOrder) => row[COUNTRY_ORDERS[order].metric];

/**
 * A page of the country ranking: the title, the metric tabs and "Find a country", the viewer's own country, one table,
 * and the facts in words. Rendered by the page and by the design catalogue.
 */
export const CountryRankingScreen: FC<CountryRankingScreenProps> = ({ order, page, ranking }) => {
  const config = COUNTRY_ORDERS[order];
  const others = COUNTRY_ORDER_LIST.filter((o) => o !== order);
  const { rows, entries, pageCount, leadShare, countriesCount, date, facts } = ranking;
  const path = countriesPath(order, page);

  return (
    <>
      <JsonLd
        payloads={[
          buildRankingItemList(
            `Country ranking by ${config.label.toLowerCase()}`,
            path,
            rows.map((row) => ({
              position: row.rank,
              name: row.country,
              path: countryRankingHref(row.country, order),
            })),
          ),
        ]}
      />

      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-balance">Country ranking</h1>
        <p className="text-sm text-muted-foreground">
          {countriesCount.toLocaleString('en-US')} countries ranked by {config.rankedBy}.
          {date && ` Monthly count of ${formatSummaryDate(date)}.`}{' '}
          <Link href="/methodology#countries-and-languages">How it&apos;s counted</Link>
        </p>
      </div>

      <CountryRankingTools
        order={order.toLowerCase()}
        pageSize={COUNTRIES_PER_PAGE}
        entries={entries}
        unit={config.unit}
        rankedBy={`by ${config.label.toLowerCase()}`}
        rankingType={config.rankingType}
        tabs={
          <SummaryTabs
            label="Rank countries by"
            items={COUNTRY_ORDER_LIST.map((o) => ({
              label: COUNTRY_ORDERS[o].label,
              href: countriesPath(o),
              active: o === order,
            }))}
          />
        }
      />

      <Table>
        <TableHeader className="[&_tr]:border-b-0">
          <TableRow>
            <TableHead className="w-14 sm:w-18">Rank</TableHead>
            <TableHead>Country</TableHead>
            <TableHead className="text-right" aria-sort="descending">
              {config.label} <ArrowDownIcon className="inline size-3.5 align-[-2px]" aria-hidden="true" />
            </TableHead>
            <TableHead className="hidden sm:table-cell">
              <span className="sr-only">Share of all countries</span>
            </TableHead>
            {others.map((o) => (
              <TableHead key={o} className="hidden text-right md:table-cell">
                <NextLink
                  href={countriesPath(o)}
                  prefetch={false}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {COUNTRY_ORDERS[o].label}
                </NextLink>
              </TableHead>
            ))}
            <TableHead className="hidden lg:table-cell">{config.leaderLabel}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <ClickableRow
              key={row.country}
              id={countryAnchor(row.country)}
              href={countryRankingHref(row.country, order)}
              className="scroll-mt-24 border-b-0"
            >
              <TableCell className="font-medium">
                <div className="flex items-end gap-1">
                  <span className="font-mono tabular-nums">{row.rank}</span>
                  <RankDelta current={row.rank} previous={row.previous} />
                </div>
              </TableCell>
              <TableCell className="whitespace-normal">
                <div className="flex flex-col">
                  <NextLink
                    href={countryRankingHref(row.country, order)}
                    prefetch={false}
                    className="flex items-center gap-1.5 font-medium"
                  >
                    <Flag flag={row.flag} />
                    <span translate="no">{row.country}</span>
                  </NextLink>
                  <span className="text-xs text-muted-foreground md:hidden">
                    {order === CountrySummaryOrder.Users
                      ? `${formatNumberShort(row.s)} stars`
                      : `${formatNumberShort(row.usersCount)} developers`}
                    {row.leader && ` · ${row.leader.login}`}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-right font-mono font-semibold tabular-nums">
                <span className="hidden sm:inline">{full(metricOf(row, order))}</span>
                <span className="sm:hidden">{formatNumberShort(metricOf(row, order))}</span>
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <ShareBar share={row.share} leadShare={leadShare} />
              </TableCell>
              {others.map((o) => (
                <TableCell
                  key={o}
                  className="hidden text-right font-mono tabular-nums text-muted-foreground md:table-cell"
                >
                  <span title={full(metricOf(row, o))}>{formatNumberShort(metricOf(row, o))}</span>
                </TableCell>
              ))}
              <TableCell className="hidden lg:table-cell">
                {row.leader && <UserCard login={row.leader.login} avatarUrl={row.leader.avatarUrl} size={24} />}
              </TableCell>
            </ClickableRow>
          ))}
        </TableBody>
      </Table>

      {page === 1 && <RankingStats parts={facts} />}

      <Pagination
        prev={page > 1 ? countriesPath(order, page - 1) : undefined}
        next={page < pageCount ? countriesPath(order, page + 1) : undefined}
      />
    </>
  );
};
