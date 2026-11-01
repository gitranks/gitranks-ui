'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import type { FC } from 'react';

import { formatFull, GithubAvatar } from './landing-ui';
import type { RankingKey } from './rank-card.types';
import { Flag } from '@/components/flag/flag';
import { RankDelta } from '@/components/rank-delta/rank-delta';
import { type StarsNotCountedTotal, StarTotalCount } from '@/components/star-count/star-count';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

export type LeaderboardRow = {
  position: number;
  previous: number | null;
  login: string;
  avatarUrl: string | null;
  flag: string | null;
  country: string | null;
  location: string | null;
  value: number | null;
  /** The stars board's total: the stars that don't count, struck through before it. */
  notCounted?: StarsNotCountedTotal | null;
};

export type Leaderboard = { key: RankingKey; tab: string; valueLabel: string; href: string; rows: LeaderboardRow[] };

/**
 * The three global leaderboards. All rows arrive with the page, so switching tabs sends no request.
 * The signed-in visitor's own row, when it is in the top, is tinted.
 */
export const LeaderboardTabs: FC<{ boards: Leaderboard[] }> = ({ boards }) => {
  const { data: session } = useSession();
  const viewer = session?.user?.githubLogin?.toLowerCase();

  return (
    <Tabs defaultValue={boards[0]?.key} className="gap-4">
      <div className="-mx-4 overflow-x-auto px-4">
        <TabsList>
          {boards.map((board) => (
            <TabsTrigger key={board.key} value={board.key}>
              {board.tab}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      {boards.map((board) => (
        <TabsContent
          key={board.key}
          value={board.key}
          forceMount
          className="flex flex-col gap-3 data-[state=inactive]:hidden"
        >
          <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr className="border-b">
                  <th scope="col" className="w-24 px-4 py-2 text-left font-medium">
                    #
                  </th>
                  <th scope="col" className="px-2 py-2 text-left font-medium">
                    Developer
                  </th>
                  <th scope="col" className="hidden px-2 py-2 text-left font-medium md:table-cell">
                    Location
                  </th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">
                    {board.valueLabel}
                  </th>
                </tr>
              </thead>
              <tbody>
                {board.rows.map((row, index) => (
                  <tr
                    key={row.login}
                    className={cn(
                      'border-b last:border-0 hover:bg-accent/60',
                      // Phones see the top 5.
                      index >= 5 && 'hidden sm:table-row',
                      viewer === row.login.toLowerCase() &&
                        'bg-brand-soft text-brand-soft-foreground hover:bg-brand-soft',
                    )}
                  >
                    <td className="px-4 py-2.5 font-mono whitespace-nowrap tabular-nums">
                      {row.position}{' '}
                      <RankDelta current={row.position} previous={row.previous} className="ml-1 font-mono" />
                    </td>
                    <td className="max-w-0 px-2 py-2.5 sm:max-w-none">
                      <Link
                        href={`/profile/${row.login}`}
                        prefetch={false}
                        className="flex min-w-0 items-center gap-2 font-medium hover:underline"
                      >
                        <GithubAvatar url={row.avatarUrl} size={24} />
                        <Flag flag={row.flag} label={row.country} className="md:hidden" />
                        <span className="truncate" translate="no">
                          {row.login}
                        </span>
                      </Link>
                    </td>
                    <td className="hidden max-w-56 px-2 py-2.5 text-muted-foreground md:table-cell">
                      <span className="flex min-w-0 items-center gap-1.5">
                        <Flag flag={row.flag} label={row.country} />
                        <span className="truncate">{row.location}</span>
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums">
                      {typeof row.value === 'number' && row.notCounted ? (
                        <StarTotalCount stars={row.value} notCounted={row.notCounted} />
                      ) : (
                        formatFull(row.value)
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Link href={board.href as Route} prefetch={false} className="self-start text-sm text-link underline">
            Full {board.tab.toLowerCase()} ranking
          </Link>
        </TabsContent>
      ))}
    </Tabs>
  );
};
