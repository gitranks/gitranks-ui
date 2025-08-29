import { FC } from 'react';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CountryQuery, CountryRankingsQuery, GlobalRankingsQuery } from '@/types/generated/graphql';
import { getCountryFlag } from '@/utils/get-country-flag';
import { getRankingConfigByType } from '@/utils/get-ranking-config-by-type';

import { ClickableRow } from './clickale-row';
import { RankDelta } from '../rank-delta/rank-delta';
import { UserCard } from '../user-card/user-card';

type RankingTableProps = {
  rankingType: string;
  data: GlobalRankingsQuery['globalRankings'] | CountryRankingsQuery['countryRankings'];
  countries: CountryQuery['country'];
};

export const RankingTable: FC<RankingTableProps> = ({ rankingType, data, countries }) => {
  const [rankPropName, rankingBaseEntity] = getRankingConfigByType(rankingType);

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
                {getCountryFlag(countries, user?.country)} <span translate="no">{user?.location}</span>
              </TableCell>
              <TableCell className="text-right">{user?.[rankPropName]?.toLocaleString('en-US')}</TableCell>
            </ClickableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};
