import type { FC } from 'react';

import { RankDelta } from '../rank-delta/rank-delta';
import { LinkWithStopPropagation } from '../user-card/components/link-with-stop-propagation';
import { UserCard } from '../user-card/user-card';
import { ClickableRow } from './clickable-row';
import { StarTotalCount } from '@/components/star-count/star-count';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { CountryQuery, CountryRankingsQuery, GlobalRankingsQuery } from '@/types/generated/graphql';
import { getRankingConfigByType } from '@/utils/get-ranking-config-by-type';

type RankingTableProps = {
  rankingType: string;
  data: GlobalRankingsQuery['globalRankings'] | CountryRankingsQuery['countryRankings'];
  countries: CountryQuery['country'];
  /** Where a row's location links to; defaults to the same ranking within that country. */
  getCountryHref?: (country: string) => string;
};

export const RankingTable: FC<RankingTableProps> = ({ rankingType, data, countries, getCountryHref }) => {
  const [rankPropName, rankingBaseEntity] = getRankingConfigByType(rankingType);
  const countryHref =
    getCountryHref ?? ((country: string) => `/country/${encodeURIComponent(country)}/${rankingType}/1`);

  return (
    <Table>
      <TableHeader className="[&_tr]:border-b-0">
        <TableRow>
          <TableHead className="w-[100px]">Rank</TableHead>
          <TableHead>Login</TableHead>
          <TableHead className="hidden sm:table-cell">Location</TableHead>
          <TableHead className="text-right">{rankingBaseEntity}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((item) => {
          const { githubId, user } = item;
          const country = user?.country ? countries?.find((c) => c.name === user.country) : undefined;
          const location = (
            <>
              {country?.flag ?? null} <span translate="no">{user?.location}</span>
            </>
          );

          return (
            <ClickableRow key={githubId} className="border-b-0" href={`/profile/${user?.login}`}>
              <TableCell className="font-medium">
                <div className="flex items-end gap-1">
                  {item[rankPropName]}
                  <RankDelta current={item[rankPropName]} previous={item[`${rankPropName}M`]} />
                </div>
              </TableCell>
              <TableCell>
                <UserCard login={user?.login} avatarUrl={user?.avatarUrl} />
              </TableCell>
              <TableCell className="hidden sm:table-cell break-all whitespace-normal">
                {country ? (
                  <LinkWithStopPropagation href={countryHref(country.name)} className="inline hover:underline">
                    {location}
                  </LinkWithStopPropagation>
                ) : (
                  location
                )}
              </TableCell>
              <TableCell className="text-right">
                {rankPropName === 's' && typeof user?.s === 'number' ? (
                  <StarTotalCount stars={user.s} notCounted={user.starsNotCounted} />
                ) : (
                  user?.[rankPropName]?.toLocaleString('en-US')
                )}
              </TableCell>
            </ClickableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};
