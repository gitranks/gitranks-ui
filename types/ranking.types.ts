export type UserRankProps = 's' | 'c' | 'f';

export enum RankingType {
  Star = 'star',
  Contribution = 'contribution',
  Follower = 'follower',
}

// this is used in the URL
// can't change this because it was indexed by search engines
export enum RankingTypeClient {
  Star = 'stars',
  Contribution = 'contributions',
  Follower = 'followers',
}
