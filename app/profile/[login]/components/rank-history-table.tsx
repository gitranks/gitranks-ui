import type { FC } from 'react';

import type { RankHistory, RankHistoryCell } from '../utils/rank-history';
import { RANK_NAME } from '@/badge/badge.consts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserRankProp } from '@/types/ranking.types';

type RankHistoryTableProps = {
  history: RankHistory;
  /** "worldwide" or "in Germany". */
  scope: string;
};

const UNITS: Record<UserRankProp, string> = {
  [UserRankProp.s]: 'stars',
  [UserRankProp.c]: 'stars',
  [UserRankProp.f]: 'followers',
};

const HistoryCell: FC<{ cell: RankHistoryCell; prop: UserRankProp }> = ({ cell: { rank, score }, prop }) => (
  <TableCell>
    {rank ? (
      <span className="font-medium">#{rank.toLocaleString('en-US')}</span>
    ) : (
      <span className="text-muted-foreground">Not ranked</span>
    )}
    {!!score && (
      <span className="text-muted-foreground">
        {' '}
        ({score.toLocaleString('en-US')} {UNITS[prop]})
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
    <div className="flex flex-col gap-3">
      <h3 className="text-xl font-semibold">Rank History</h3>
      <p className="text-muted-foreground">Ranks {scope} now and at the start of each month.</p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            {columns.map((prop) => (
              <TableHead key={prop}>{RANK_NAME[prop]}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.date ?? 'current'}>
              <TableCell>{row.date ? <time dateTime={row.date}>{row.label}</time> : row.label}</TableCell>
              {columns.map((prop) => (
                <HistoryCell key={prop} cell={row.cells[prop]} prop={prop} />
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
