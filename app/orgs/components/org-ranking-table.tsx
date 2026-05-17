import type { FC } from 'react';

import { RankDelta } from '@/components/rank-delta/rank-delta';
import { ClickableRow } from '@/components/ranking-table/clickable-row';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserCard } from '@/components/user-card/user-card';
import type { CountryQuery, OrgRankingsQuery } from '@/types/generated/graphql';
import { getCountryFlag } from '@/utils/get-country-flag';

type OrgRankingTableProps = {
  data: OrgRankingsQuery['orgRankings'];
  countries: CountryQuery['country'];
};

export const OrgRankingTable: FC<OrgRankingTableProps> = ({ data, countries }) => {
  return (
    <Table>
      <TableHeader className="[&_tr]:border-b-0">
        <TableRow>
          <TableHead className="w-[100px]">Rank</TableHead>
          <TableHead>Login</TableHead>
          <TableHead className="hidden sm:table-cell">Location</TableHead>
          <TableHead className="text-right">Stars</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((item) => {
          const { githubId, organization } = item;
          return (
            <ClickableRow key={githubId} className="border-b-0" href={`/org/${organization?.login}`}>
              <TableCell className="font-medium">
                <div className="flex items-end gap-1">
                  {item.s}
                  <RankDelta current={item.s} previous={item.sM} />
                </div>
              </TableCell>
              <TableCell>
                {organization?.login && (
                  <UserCard login={organization?.login} avatarUrl={organization?.avatarUrl} baseUrl="/org" />
                )}
              </TableCell>
              <TableCell className="hidden sm:table-cell break-all whitespace-normal">
                {getCountryFlag(countries, organization?.country)} <span translate="no">{organization?.location}</span>
              </TableCell>
              <TableCell className="text-right">{organization?.s?.toLocaleString('en-US')}</TableCell>
            </ClickableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};
