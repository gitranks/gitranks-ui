import { Page } from '@/components/page/page';
import { RankDelta } from '@/components/rank-delta/rank-delta';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { graphqlRequest } from '@/lib/graphql-request';
import { RankingsDocument, RankOrder } from '@/types/generated/graphql';
import { getInitials } from '@/utils/get-initials';

import { ClickableRow } from './components/clickale-row';
import { LinkWithStopPropagation } from './components/link-with-stop-propagation';

const ITEMS_PER_PAGE = 100;

function getConfigByRankingType(rankingType: string) {
  let propName: 'contributedStars' | 'followersCount' | 'ownedStars';
  let queryOrder: RankOrder;
  let title: string;
  let subtitle: string;
  let rankingBaseEntity: string;

  switch (rankingType) {
    case 'contributions':
      queryOrder = RankOrder.StarsContributed;
      propName = 'contributedStars';
      title = 'Contribution ranking';
      subtitle = "Rank is based on the stars from repositories where you've merged pull requests — excluding your own.";
      rankingBaseEntity = 'Stars';
      break;
    case 'followers':
      queryOrder = RankOrder.FollowersCount;
      propName = 'followersCount';
      title = 'Followers ranking';
      subtitle = 'Rank is based on the number of followers the user has on GitHub.';
      rankingBaseEntity = 'Followers';
      break;
    case 'stars':
    default:
      queryOrder = RankOrder.StarsOwned;
      propName = 'ownedStars';
      title = 'Star ranking';
      subtitle = 'Rank is based on the total number of stars across repositories owned by a user.';
      rankingBaseEntity = 'Stars';
      break;
  }

  return [queryOrder, propName, title, subtitle, rankingBaseEntity] as const;
}

export default async function GlobalRanking({
  searchParams,
  params,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
  params: Promise<{ rankingType: string }>;
}) {
  const { rankingType } = await params;
  const [queryOrder, rankPropName, title, subtitle, rankingBaseEntity] = getConfigByRankingType(rankingType);
  const page = Number((await searchParams)?.page) || 1;
  const offset = (page - 1) * ITEMS_PER_PAGE;
  const data = await graphqlRequest(RankingsDocument, { order: queryOrder, offset });

  return (
    <Page className="max-w-5xl gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        <div>{`${subtitle} Login or Search to see your rank.`}</div>
      </div>

      <Table>
        <TableHeader className="[&_tr]:border-b-0">
          <TableRow>
            <TableHead className="w-[100px]">#</TableHead>
            <TableHead>Login</TableHead>
            <TableHead className="hidden sm:table-cell">Location</TableHead>
            <TableHead className="text-right">{rankingBaseEntity}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.rankings.map((item) => {
            const { githubId, user } = item;
            return (
              <ClickableRow key={githubId} className="border-b-0" href={`/profile/${user?.login}`}>
                <TableCell className="font-medium">
                  <div className="flex items-end gap-1">
                    {item[rankPropName]}
                    <RankDelta current={item[rankPropName]} previous={item[`${rankPropName}M`]} />
                  </div>
                </TableCell>
                <TableCell className="flex items-center gap-2">
                  {!!user?.avatarUrl && (
                    <Avatar>
                      <AvatarImage src={user.avatarUrl} className="rounded-full" width={36} height={36} />
                      <AvatarFallback>{getInitials(user?.login)}</AvatarFallback>
                    </Avatar>
                  )}
                  <LinkWithStopPropagation href={`/profile/${user?.login}`}>{user?.login}</LinkWithStopPropagation>
                </TableCell>
                <TableCell className="hidden sm:table-cell break-all whitespace-normal">{user?.location}</TableCell>
                <TableCell className="text-right">{user?.[rankPropName]?.toLocaleString('en-US')}</TableCell>
              </ClickableRow>
            );
          })}
        </TableBody>
      </Table>

      <Pagination>
        <PaginationContent>
          {page > 1 && (
            <PaginationItem>
              <PaginationPrevious href={`/by/${rankingType}?page=${page - 1}`} />
            </PaginationItem>
          )}
          <PaginationItem>
            <PaginationNext href={`/by/${rankingType}?page=${page + 1}`} />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </Page>
  );
}
