import type { FC } from 'react';

import { Link } from '@/components/link/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { StarsNeighbour } from '@/graphql/helpers/fetch-stars-neighbours';

type StarsRankNeighboursProps = {
  login: string;
  neighbours: StarsNeighbour[];
};

/** The developers ranked just above and below the profile worldwide by stars, linked to their profiles. */
export const StarsRankNeighbours: FC<StarsRankNeighboursProps> = ({ login, neighbours }) => {
  const isSelf = (neighbour: StarsNeighbour) => neighbour.login.toLowerCase() === login.toLowerCase();

  if (neighbours.length < 2 || !neighbours.some(isSelf)) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-xl font-semibold">Nearby in the Stars Rank</h3>
      <p className="text-muted-foreground">
        Developers ranked just above and below @{login} worldwide by stars on their own repositories.{' '}
        <Link href="/by/stars/1">Full ranking</Link>
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Rank</TableHead>
            <TableHead>Developer</TableHead>
            <TableHead>Stars</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {neighbours.map((neighbour) => (
            <TableRow key={neighbour.login} className={isSelf(neighbour) ? 'bg-muted/50 font-semibold' : undefined}>
              <TableCell>#{neighbour.rank.toLocaleString('en-US')}</TableCell>
              <TableCell translate="no">
                {isSelf(neighbour) ? (
                  `@${neighbour.login}`
                ) : (
                  <Link href={`/profile/${encodeURIComponent(neighbour.login)}`}>@{neighbour.login}</Link>
                )}
              </TableCell>
              <TableCell>{neighbour.stars ? neighbour.stars.toLocaleString('en-US') : '–'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
