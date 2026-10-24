import type { FC } from 'react';

import type { RankHistory, RankHistoryCell } from '../utils/rank-history';
import { ProfileSection } from './profile-card';
import { RANK_NAME } from '@/badge/badge.consts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserRankProp } from '@/types/ranking.types';

type RankHistoryTableProps = {
  history: RankHistory;
  /** "worldwide" or "in Germany". */
  scope: string;
};

const HEADING_ID = 'rank-history-heading';

const UNITS: Record<UserRankProp, string> = {
  [UserRankProp.s]: 'stars',
  [UserRankProp.c]: 'stars',
  [UserRankProp.f]: 'followers',
};

const HistoryCell: FC<{ cell: RankHistoryCell; prop: UserRankProp }> = ({
  cell: { rank, score, provisional },
  prop,
}) => (
  <TableCell>
    {rank ? (
      <span className="font-mono font-medium tabular-nums">
        #{rank.toLocaleString('en-US')}
        {provisional && ' (provisional)'}
      </span>
    ) : (
      <span className="text-muted-foreground">Not ranked</span>
    )}
    {!!score && (
      <span className="text-muted-foreground">
        {' '}
        (<span className="font-mono tabular-nums">{score.toLocaleString('en-US')}</span> {UNITS[prop]})
      </span>
    )}
  </TableCell>
);

/** Ranks and scores now and at the start of each recent month. */
export const RankHistoryTable: FC<RankHistoryTableProps> = ({ history: { columns, rows }, scope }) => {
  if (!rows.length) {
    return null;
  }

  return (
    <ProfileSection id={HEADING_ID} title="Rank history" intro={`Ranks ${scope} now and at the start of each month.`}>
      <div className="rounded-xl border bg-card text-card-foreground shadow-sm dark:shadow-none">
        <Table aria-labelledby={HEADING_ID}>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Date</TableHead>
              {columns.map((prop) => (
                <TableHead key={prop} scope="col">
                  {RANK_NAME[prop]}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.date ?? 'current'}>
                <TableHead scope="row" className="font-normal text-muted-foreground">
                  {row.date ? <time dateTime={row.date}>{row.label}</time> : row.label}
                </TableHead>
                {columns.map((prop) => (
                  <HistoryCell key={prop} cell={row.cells[prop]} prop={prop} />
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </ProfileSection>
  );
};
