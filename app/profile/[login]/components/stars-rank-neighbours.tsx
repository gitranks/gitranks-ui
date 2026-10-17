import type { FC } from 'react';

import { Link } from '@/components/link/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { StarsNeighbour } from '@/graphql/helpers/fetch-stars-neighbours';

type StarsRankNeighboursProps = {
  login: string;
  /** The profile's own worldwide Stars Rank. */
  rank?: number | null;
  neighbours: StarsNeighbour[];
};

export const NEIGHBOURS_EACH_SIDE = 5;

const HEADING_ID = 'stars-neighbours-heading';

/**
 * The rows around the profile's own row, or none when the profile is not among them at its current rank:
 * a window read before the last ranking update would show it at its old place.
 */
export function pickNeighbours(login: string, rank: number | null | undefined, rows: StarsNeighbour[]) {
  const self = rows.findIndex((row) => row.rank === rank && row.login.toLowerCase() === login.toLowerCase());

  if (self < 0) {
    return [];
  }

  const around = rows.slice(Math.max(0, self - NEIGHBOURS_EACH_SIDE), self + NEIGHBOURS_EACH_SIDE + 1);

  return around.length > 1 ? around : [];
}

/** The developers ranked just above and below the profile worldwide by stars, linked to their profiles. */
export const StarsRankNeighbours: FC<StarsRankNeighboursProps> = ({ login, rank, neighbours }) => {
  const rows = pickNeighbours(login, rank, neighbours);

  if (!rows.length) {
    return null;
  }

  const isSelf = (row: StarsNeighbour) => row.login.toLowerCase() === login.toLowerCase();

  return (
    <div className="flex flex-col gap-3">
      <h3 id={HEADING_ID} className="text-xl font-semibold">
        Nearby in the Stars Rank
      </h3>
      <p className="text-muted-foreground">
        Developers ranked just above and below @{login} worldwide by stars on their own repositories.{' '}
        <Link href="/by/stars/1">Full ranking</Link>
      </p>
      <Table aria-labelledby={HEADING_ID}>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Rank</TableHead>
            <TableHead scope="col">Developer</TableHead>
            <TableHead scope="col">Stars</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={row.login}
              aria-current={isSelf(row) ? 'true' : undefined}
              className={isSelf(row) ? 'bg-muted/50 font-semibold' : undefined}
            >
              <TableCell>#{row.rank.toLocaleString('en-US')}</TableCell>
              <TableCell translate="no">
                {isSelf(row) ? (
                  `@${row.login}`
                ) : (
                  <Link href={`/profile/${encodeURIComponent(row.login)}`}>@{row.login}</Link>
                )}
              </TableCell>
              <TableCell>{row.stars ? row.stars.toLocaleString('en-US') : '–'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
