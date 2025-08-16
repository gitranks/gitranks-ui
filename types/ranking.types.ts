/**
 * @deprecated This enum will be removed in a future version
 */
export enum RankingType {
  Star = 'star',
  Contribution = 'contribution',
  Follower = 'follower',
}

export enum UserRankProp {
  s = 's',
  c = 'c',
  f = 'f',
}

// this is used in the URL
// can't change this because it was indexed by search engines
export enum RankingTypeClient {
  Star = 'stars',
  Contribution = 'contributions',
  Follower = 'followers',
}
