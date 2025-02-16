import { graphqlRequest } from '@/lib/graphql-request';
import { StarsRankingDocument } from '@/types/generated/graphql';
import Image from 'next/image';

export default async function OwnedStarsRanking() {
  const data = await graphqlRequest(StarsRankingDocument);

  return (
    <table className="table-auto">
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
        {data.globalRanks.map((rank) => (
          <tr key={rank.githubId}>
            <td>{rank.ownedStars}</td>
            <td>
              <Image
                src={rank.user?.avatarUrl}
                width={36}
                height={36}
                className="rounded-full m-2"
                alt={`${rank.user?.login}'s avatar`}
              />
            </td>
            <td>{rank.user?.login}</td>
            <td>{rank.user?.location}</td>
            <td>{rank.user?.ownedStars}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
