import type { FC } from 'react';

import { RankDelta } from '@/components/rank-delta/rank-delta';
import { ClickableRow } from '@/components/ranking-table/clickable-row';
import { RepoLink } from '@/components/repo-link/repo-link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LinkWithStopPropagation } from '@/components/user-card/components/link-with-stop-propagation';
import type { RepoRankingsQuery } from '@/types/generated/graphql';
import { getRepoLanguageRankingPath, getRepoPath } from '@/utils/repo-paths';

type RepoRankingTableProps = {
  data: RepoRankingsQuery['repoRankings'];
  /** `s` for the global ranking, `l` for a language's or the no-language one. */
  rankProp?: 's' | 'l';
};

export const RepoRankingTable: FC<RepoRankingTableProps> = ({ data, rankProp = 's' }) => {
  return (
    <Table>
      <TableHeader className="[&_tr]:border-b-0">
        <TableRow>
          <TableHead className="w-[100px]">Rank</TableHead>
          <TableHead>Repository</TableHead>
          <TableHead className="hidden md:table-cell">Language</TableHead>
          <TableHead className="text-right">Stars</TableHead>
          <TableHead className="hidden sm:table-cell text-right">Stars this month</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((item) => {
          const { githubId, repo } = item;

          if (!repo) {
            return null;
          }

          return (
            <ClickableRow key={githubId} className="border-b-0" href={getRepoPath(repo.nameWithOwner)}>
              <TableCell className="font-medium align-top">
                <div className="flex items-end gap-1">
                  {item[rankProp]}
                  <RankDelta current={item[rankProp]} previous={item[`${rankProp}M`]} />
                </div>
              </TableCell>
              <TableCell className="whitespace-normal">
                <div className="flex min-w-0 flex-col gap-1">
                  <RepoLink nameWithOwner={repo.nameWithOwner} ownerAvatarUrl={repo.ownerAvatarUrl} />
                  {!!repo.description && (
                    <p className="line-clamp-1 text-sm text-muted-foreground [overflow-wrap:anywhere]">
                      {repo.description}
                    </p>
                  )}
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                {repo.language && (
                  <LinkWithStopPropagation
                    href={getRepoLanguageRankingPath(repo.language)}
                    className="inline hover:underline"
                  >
                    {repo.language}
                  </LinkWithStopPropagation>
                )}
              </TableCell>
              <TableCell className="text-right">{repo.stars.toLocaleString('en-US')}</TableCell>
              <TableCell className="hidden sm:table-cell text-right">
                {!!repo.gainedThisMonth && (
                  <span className={repo.gainedThisMonth > 0 ? 'text-positive' : 'text-negative'}>
                    {repo.gainedThisMonth > 0 ? '+' : ''}
                    {repo.gainedThisMonth.toLocaleString('en-US')}
                  </span>
                )}
              </TableCell>
            </ClickableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};
