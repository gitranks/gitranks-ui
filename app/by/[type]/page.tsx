import { graphqlRequest } from '@/lib/graphql-request';
import { RankOrder, StarsRankingDocument } from '@/types/generated/graphql';
import Image from 'next/image';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

const ITEMS_PER_PAGE = 100;

function getRankIcon(ownedStars: number, ownedStarsM: number | null | undefined): string {
  if (!ownedStarsM) {
    return '';
  }

  const difference = ownedStars - ownedStarsM;
  return difference > 0 ? '+' : difference < 0 ? '-' : '';
}

function getConfigByType(rankingType: string) {
  let propName: 'contributedStars' | 'followersCount' | 'ownedStars';
  let queryOrder: RankOrder;

  switch (rankingType) {
    case 'contributed-stars':
      queryOrder = RankOrder.StarsContributed;
      propName = 'contributedStars';
      break;
    case 'followers':
      queryOrder = RankOrder.FollowersCount;
      propName = 'followersCount';
      break;
    case 'owned-stars':
    default:
      queryOrder = RankOrder.StarsOwned;
      propName = 'ownedStars';
      break;
  }

  return [queryOrder, propName] as const;
}

export default async function GlobalRanking({
  searchParams,
  params,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
  params: Promise<{ type: string }>;
}) {
  const { type } = await params;
  const [queryOrder, rankPropName] = getConfigByType(type);
  const page = Number((await searchParams)?.page) || 1;
  const offset = (page - 1) * ITEMS_PER_PAGE;
  const data = await graphqlRequest(StarsRankingDocument, { order: queryOrder, offset });

  return (
    <>
      <table className="table-auto mx-auto my-6">
        <thead>
          <tr>
            <th>#</th>
            <th></th>
            <th>Login</th>
            <th>Location</th>
            <th>⭐</th>
          </tr>
        </thead>
        <tbody>
          {data.globalRanks.map((item) => {
            const { githubId, user } = item;
            return (
              <tr key={githubId}>
                <td>
                  {item[rankPropName]}
                  {getRankIcon(item[rankPropName], item[`${rankPropName}M`])}
                </td>
                <td>
                  {!!user?.avatarUrl && (
                    <Image
                      src={user.avatarUrl}
                      width={36}
                      height={36}
                      className="rounded-full m-2"
                      alt={`${user?.login}'s avatar`}
                    />
                  )}
                </td>
                <td>{user?.login}</td>
                <td>{user?.location}</td>
                <td>{user?.[rankPropName]}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <Pagination>
        <PaginationContent>
          {page > 1 && (
            <PaginationItem>
              <PaginationPrevious href={`/by/${type}?page=${page - 1}`} />
            </PaginationItem>
          )}
          <PaginationItem>
            <PaginationNext href={`/by/${type}?page=${page + 1}`} />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </>
  );
}
