import { ArrowDownIcon } from 'lucide-react';
import NextLink from 'next/link';
import type { FC } from 'react';

import {
  formatMetric,
  LANGUAGE_ORDER_LIST,
  LANGUAGE_ORDERS,
  type LanguageRanking,
  type LanguageRankingRow,
  type LanguageStandOut,
  languagesPath,
} from '../language-ranking';
import { LanguageScopePicker } from './language-scope-picker';
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
import { LanguageSummaryOrder } from '@/types/generated/graphql';
import { formatNumberShort } from '@/utils/format-number-short';
import { formatSummaryDate } from '@/utils/format-summary-date';
import { getLanguageRankingPath } from '@/utils/get-language-ranking-path';
import { GLOBAL_SCOPE } from '@/utils/global-scope';

type LanguageRankingScreenProps = {
  /** `global` or a country's name. */
  scope: string;
  order: LanguageSummaryOrder;
  page: number;
  ranking: LanguageRanking;
  /** Every country, for the scope picker. */
  countries: { name: string; flag: string | null }[];
};

const metricOf = (row: LanguageRankingRow, order: LanguageSummaryOrder) => row[LANGUAGE_ORDERS[order].metric];

const shortMetric = (row: LanguageRankingRow, order: LanguageSummaryOrder) => {
  const { metric } = LANGUAGE_ORDERS[order];
  return metric === 'size' ? formatMetric(metric, row.size) : formatNumberShort(row[metric]);
};

/** On phones, under the language: what the hidden columns would say. */
const phoneLine = (row: LanguageRankingRow, order: LanguageSummaryOrder, isCountry: boolean) =>
  [
    order === LanguageSummaryOrder.Users
      ? `${formatNumberShort(row.score)} stars`
      : `${formatNumberShort(row.usersCount)} developers`,
    isCountry && row.worldRank ? `#${row.worldRank} worldwide` : null,
    !isCountry && row.leader ? row.leader.login : null,
  ]
    .filter(Boolean)
    .join(' · ');

const Dot: FC<{ color: string }> = ({ color }) => (
  <span className="inline-block size-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
);

/** Languages that rank well above their worldwide place in this country, and the month's biggest climb. */
const StandOuts: FC<{ scope: string; items: LanguageStandOut[] }> = ({ scope, items }) => (
  <section className="flex flex-col gap-2 rounded-xl border bg-card p-4 text-card-foreground shadow-sm">
    <h2 className="text-base font-semibold">What stands out in {scope}</h2>
    <ul className="grid gap-1 sm:grid-cols-3 sm:gap-2">
      {items.map(({ kind, row }) => (
        <li key={row.language}>
          <NextLink
            href={getLanguageRankingPath(row.language, scope)}
            prefetch={false}
            className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted/50"
          >
            <span
              className={`min-w-12 font-mono text-2xl font-bold tabular-nums ${kind === 'climb' ? 'text-positive' : ''}`}
            >
              {kind === 'climb' ? `↑${(row.previous ?? row.rank) - row.rank}` : `#${row.rank}`}
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="flex items-center gap-2 font-medium">
                <Dot color={row.color} />
                <span translate="no">{row.language}</span>
              </span>
              <span className="text-xs text-muted-foreground">
                {kind === 'climb' ? `now #${row.rank}, #${row.previous} last month` : `#${row.worldRank} worldwide`}
                {row.leader && ` · led by ${row.leader.login}`}
              </span>
            </span>
          </NextLink>
        </li>
      ))}
    </ul>
  </section>
);

/**
 * A page of a language ranking, worldwide or in one country: the title, the metric tabs and the scope picker, what
 * stands out in a country, one table, and the facts in words. Rendered by the page and by the design catalogue.
 */
export const LanguageRankingScreen: FC<LanguageRankingScreenProps> = ({ scope, order, page, ranking, countries }) => {
  const config = LANGUAGE_ORDERS[order];
  const others = LANGUAGE_ORDER_LIST.filter((o) => o !== order);
  const isCountry = scope !== GLOBAL_SCOPE;
  const flag = isCountry ? countries.find((c) => c.name === scope)?.flag : null;
  const { rows, pageCount, leadShare, sharesKnown, languagesCount, date, standOuts, facts } = ranking;
  const title = isCountry ? `Language ranking in ${scope}` : 'Language ranking';

  return (
    <>
      <JsonLd
        payloads={[
          buildRankingItemList(
            `${title} by ${config.label.toLowerCase()}`,
            languagesPath(scope, order, page),
            rows.map((row) => ({
              position: row.rank,
              name: row.language,
              path: getLanguageRankingPath(row.language, scope),
            })),
          ),
        ]}
      />

      <div className="flex flex-col gap-1">
        <h1 className="flex flex-wrap items-center gap-x-2 text-2xl font-semibold text-balance">
          {isCountry ? (
            <>
              Language ranking in
              <span className="flex items-center gap-2">
                <Flag flag={flag} />
                {scope}
              </span>
            </>
          ) : (
            title
          )}
        </h1>
        <p className="text-sm text-muted-foreground">
          {languagesCount === null ? 'Languages' : `${languagesCount.toLocaleString('en-US')} languages`} ranked by{' '}
          {config.rankedBy}, among developers {isCountry ? `in ${scope}` : 'on GitRanks'}.
          {date && ` Monthly count of ${formatSummaryDate(date)}.`}{' '}
          <Link href="/methodology#countries-and-languages">How it&apos;s counted</Link>
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <SummaryTabs
          label="Rank languages by"
          items={LANGUAGE_ORDER_LIST.map((o) => ({
            label: LANGUAGE_ORDERS[o].label,
            href: languagesPath(scope, o),
            active: o === order,
          }))}
        />
        <LanguageScopePicker scope={scope} order={order.toLowerCase()} countries={countries} />
      </div>

      {standOuts.length > 0 && <StandOuts scope={scope} items={standOuts} />}

      {rows.length ? (
        <Table>
          <TableHeader className="[&_tr]:border-b-0">
            <TableRow>
              <TableHead className="w-14 sm:w-18">Rank</TableHead>
              <TableHead>Language</TableHead>
              <TableHead className="text-right" aria-sort="descending">
                {config.label} <ArrowDownIcon className="inline size-3.5 align-[-2px]" aria-hidden="true" />
              </TableHead>
              <TableHead className="hidden sm:table-cell">
                <span className="sr-only">Share of all languages</span>
              </TableHead>
              {isCountry && (
                <TableHead className="hidden text-right text-muted-foreground md:table-cell">Worldwide</TableHead>
              )}
              {others.map((o) => (
                <TableHead key={o} className="hidden text-right md:table-cell">
                  <NextLink
                    href={languagesPath(scope, o)}
                    prefetch={false}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {LANGUAGE_ORDERS[o].label}
                  </NextLink>
                </TableHead>
              ))}
              <TableHead className="hidden lg:table-cell">Top developer</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <ClickableRow
                key={row.language}
                href={getLanguageRankingPath(row.language, scope)}
                className="border-b-0"
              >
                <TableCell className="font-medium">
                  <div className="flex items-end gap-1">
                    <span className="font-mono tabular-nums">{row.rank}</span>
                    <RankDelta current={row.rank} previous={row.previous} />
                  </div>
                </TableCell>
                <TableCell className="whitespace-normal">
                  <div className="flex flex-col gap-0.5">
                    <NextLink
                      href={getLanguageRankingPath(row.language, scope)}
                      prefetch={false}
                      className="flex items-center gap-2 font-medium"
                    >
                      <Dot color={row.color} />
                      <span translate="no">{row.language}</span>
                    </NextLink>
                    <span className="pl-[18px] text-xs text-muted-foreground md:hidden">
                      {phoneLine(row, order, isCountry)}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono font-semibold tabular-nums">
                  <span className="hidden sm:inline">{formatMetric(config.metric, metricOf(row, order))}</span>
                  <span className="sm:hidden">{shortMetric(row, order)}</span>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  {sharesKnown && <ShareBar share={row.share} leadShare={leadShare} showShare={config.showShare} />}
                </TableCell>
                {isCountry && (
                  <TableCell className="hidden text-right font-mono tabular-nums text-muted-foreground md:table-cell">
                    {row.worldRank ? `#${row.worldRank}` : '—'}
                  </TableCell>
                )}
                {others.map((o) => (
                  <TableCell
                    key={o}
                    className="hidden text-right font-mono tabular-nums text-muted-foreground md:table-cell"
                  >
                    {shortMetric(row, o)}
                  </TableCell>
                ))}
                <TableCell className="hidden lg:table-cell">
                  {row.leader && <UserCard login={row.leader.login} avatarUrl={row.leader.avatarUrl} size={24} />}
                </TableCell>
              </ClickableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <p className="text-sm text-muted-foreground">
          {isCountry ? `No languages are counted in ${scope} yet.` : 'No languages are counted yet.'}
        </p>
      )}

      {page === 1 && <RankingStats parts={facts} />}

      <Pagination
        prev={page > 1 ? languagesPath(scope, order, page - 1) : undefined}
        next={page < pageCount ? languagesPath(scope, order, page + 1) : undefined}
      />
    </>
  );
};
