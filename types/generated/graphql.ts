import DocumentNode from '../typed-document-node';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  DateTime: { input: any; output: any; }
  JSON: { input: any; output: any; }
};

export type Contribution = {
  __typename?: 'Contribution';
  linesAdded?: Maybe<Scalars['Int']['output']>;
  linesRemoved?: Maybe<Scalars['Int']['output']>;
  mergedPrsCount?: Maybe<Scalars['Int']['output']>;
  prsCount?: Maybe<Scalars['Int']['output']>;
  repoId?: Maybe<Scalars['String']['output']>;
  repository?: Maybe<Repository>;
  year: Scalars['Int']['output'];
};

export type LanguageEntity = {
  __typename?: 'LanguageEntity';
  id: Scalars['String']['output'];
  size: Scalars['Float']['output'];
};

export type Organization = {
  __typename?: 'Organization';
  avatarUrl?: Maybe<Scalars['String']['output']>;
  githubId: Scalars['String']['output'];
  login: Scalars['String']['output'];
  name?: Maybe<Scalars['String']['output']>;
};

export type ProfileForSitemap = {
  __typename?: 'ProfileForSitemap';
  avatarUrl?: Maybe<Scalars['String']['output']>;
  login: Scalars['String']['output'];
};

export type Query = {
  __typename?: 'Query';
  profilesForSitemap: Array<ProfileForSitemap>;
  rankByLogin?: Maybe<Rank>;
  rankings: Array<Rank>;
  user?: Maybe<User>;
};


export type QueryRankByLoginArgs = {
  login: Scalars['String']['input'];
};


export type QueryRankingsArgs = {
  limit?: Scalars['Int']['input'];
  offset?: Scalars['Int']['input'];
  order?: RankOrder;
};


export type QueryUserArgs = {
  login: Scalars['String']['input'];
};

export type Rank = {
  __typename?: 'Rank';
  _id: Scalars['String']['output'];
  contributedStars: Scalars['Int']['output'];
  contributedStarsD?: Maybe<Scalars['Int']['output']>;
  contributedStarsM?: Maybe<Scalars['Int']['output']>;
  contributedStarsY?: Maybe<Scalars['Int']['output']>;
  followersCount: Scalars['Int']['output'];
  followersCountD?: Maybe<Scalars['Int']['output']>;
  followersCountM?: Maybe<Scalars['Int']['output']>;
  followersCountY?: Maybe<Scalars['Int']['output']>;
  githubId: Scalars['ID']['output'];
  ownedStars: Scalars['Int']['output'];
  ownedStarsD?: Maybe<Scalars['Int']['output']>;
  ownedStarsM?: Maybe<Scalars['Int']['output']>;
  ownedStarsY?: Maybe<Scalars['Int']['output']>;
  user?: Maybe<UserBasic>;
};

export enum RankOrder {
  FollowersCount = 'FOLLOWERS_COUNT',
  StarsContributed = 'STARS_CONTRIBUTED',
  StarsOwned = 'STARS_OWNED'
}

export type RankWithoutUser = {
  __typename?: 'RankWithoutUser';
  _id: Scalars['String']['output'];
  contributedStars: Scalars['Int']['output'];
  contributedStarsD?: Maybe<Scalars['Int']['output']>;
  contributedStarsM?: Maybe<Scalars['Int']['output']>;
  contributedStarsY?: Maybe<Scalars['Int']['output']>;
  followersCount: Scalars['Int']['output'];
  followersCountD?: Maybe<Scalars['Int']['output']>;
  followersCountM?: Maybe<Scalars['Int']['output']>;
  followersCountY?: Maybe<Scalars['Int']['output']>;
  githubId: Scalars['ID']['output'];
  ownedStars: Scalars['Int']['output'];
  ownedStarsD?: Maybe<Scalars['Int']['output']>;
  ownedStarsM?: Maybe<Scalars['Int']['output']>;
  ownedStarsY?: Maybe<Scalars['Int']['output']>;
};

export type Repository = {
  __typename?: 'Repository';
  createdAt?: Maybe<Scalars['DateTime']['output']>;
  forkCount: Scalars['Int']['output'];
  githubId: Scalars['String']['output'];
  isArchived: Scalars['Boolean']['output'];
  languages?: Maybe<RepositoryLanguagesEntity>;
  name?: Maybe<Scalars['String']['output']>;
  pushedAt?: Maybe<Scalars['DateTime']['output']>;
  releasesCount?: Maybe<Scalars['Int']['output']>;
  stargazerCount: Scalars['Int']['output'];
  url: Scalars['String']['output'];
};

export type RepositoryLanguagesEntity = {
  __typename?: 'RepositoryLanguagesEntity';
  nodes: Array<LanguageEntity>;
  totalCount: Scalars['Int']['output'];
  totalSize: Scalars['Float']['output'];
};

export enum RepositorySortField {
  Stargazers = 'STARGAZERS'
}

export type SocialAccount = {
  __typename?: 'SocialAccount';
  nodes?: Maybe<Array<SocialAccountNodeEntity>>;
  totalCount: Scalars['Int']['output'];
};

export type SocialAccountNodeEntity = {
  __typename?: 'SocialAccountNodeEntity';
  displayName?: Maybe<Scalars['String']['output']>;
  provider: Scalars['String']['output'];
  url: Scalars['String']['output'];
};

export enum SortDirection {
  Asc = 'ASC',
  Desc = 'DESC'
}

export type Timeline = {
  __typename?: 'Timeline';
  changes: Scalars['JSON']['output'];
  createdAt: Scalars['DateTime']['output'];
};

export type User = {
  __typename?: 'User';
  _id: Scalars['String']['output'];
  avatarUrl?: Maybe<Scalars['String']['output']>;
  company?: Maybe<Scalars['String']['output']>;
  contributedRepoCount?: Maybe<Scalars['Int']['output']>;
  contributedStars?: Maybe<Scalars['Int']['output']>;
  contributions?: Maybe<Array<Contribution>>;
  createdAt: Scalars['DateTime']['output'];
  email?: Maybe<Scalars['String']['output']>;
  fetchingStartedAt?: Maybe<Scalars['Int']['output']>;
  fetchingStatus?: Maybe<UserFetchingStatus>;
  firstSeenAt?: Maybe<Scalars['DateTime']['output']>;
  followersCount?: Maybe<Scalars['Int']['output']>;
  followingCount?: Maybe<Scalars['Int']['output']>;
  githubCreatedAt?: Maybe<Scalars['DateTime']['output']>;
  githubFetchedAt?: Maybe<Scalars['DateTime']['output']>;
  githubId: Scalars['ID']['output'];
  githubServiceFetchedAt?: Maybe<Scalars['DateTime']['output']>;
  githubUpdatedAt?: Maybe<Scalars['DateTime']['output']>;
  isHireable?: Maybe<Scalars['Boolean']['output']>;
  location?: Maybe<Scalars['String']['output']>;
  login: Scalars['String']['output'];
  name?: Maybe<Scalars['String']['output']>;
  organizations?: Maybe<Array<Organization>>;
  ownedStars?: Maybe<Scalars['Int']['output']>;
  rank?: Maybe<RankWithoutUser>;
  repositories?: Maybe<Array<Repository>>;
  repositoriesCount?: Maybe<Scalars['Int']['output']>;
  socialAccounts?: Maybe<SocialAccount>;
  timeline?: Maybe<Array<Timeline>>;
  twitterUsername?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['DateTime']['output'];
  websiteUrl?: Maybe<Scalars['String']['output']>;
};


export type UserRepositoriesArgs = {
  limit?: Scalars['Int']['input'];
  offset?: Scalars['Int']['input'];
  order?: RankOrder;
  sortBy?: RepositorySortField;
  sortDirection?: SortDirection;
};

export type UserBasic = {
  __typename?: 'UserBasic';
  avatarUrl?: Maybe<Scalars['String']['output']>;
  contributedStars?: Maybe<Scalars['Int']['output']>;
  followersCount?: Maybe<Scalars['Int']['output']>;
  githubId: Scalars['String']['output'];
  location?: Maybe<Scalars['String']['output']>;
  login: Scalars['String']['output'];
  ownedStars?: Maybe<Scalars['Int']['output']>;
};

export enum UserFetchingStatus {
  Active = 'ACTIVE',
  Completed = 'COMPLETED'
}

export type IdByLoginQueryVariables = Exact<{
  login: Scalars['String']['input'];
}>;


export type IdByLoginQuery = { __typename?: 'Query', rankByLogin?: { __typename?: 'Rank', githubId: string } | null };

export type RankingsQueryVariables = Exact<{
  order?: InputMaybe<RankOrder>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;


export type RankingsQuery = { __typename?: 'Query', rankings: Array<{ __typename?: 'Rank', githubId: string, contributedStars: number, contributedStarsM?: number | null, followersCount: number, followersCountM?: number | null, ownedStars: number, ownedStarsM?: number | null, user?: { __typename?: 'UserBasic', login: string, avatarUrl?: string | null, ownedStars?: number | null, contributedStars?: number | null, followersCount?: number | null, location?: string | null } | null }> };

export type RepositoryFieldsFragment = { __typename?: 'Repository', githubId: string, createdAt?: any | null, pushedAt?: any | null, url: string, forkCount: number, isArchived: boolean, name?: string | null, releasesCount?: number | null, stargazerCount: number, languages?: { __typename?: 'RepositoryLanguagesEntity', totalCount: number, totalSize: number, nodes: Array<{ __typename?: 'LanguageEntity', id: string, size: number }> } | null };

export type UserQueryVariables = Exact<{
  login: Scalars['String']['input'];
}>;


export type UserQuery = { __typename?: 'Query', user?: { __typename?: 'User', githubId: string, githubFetchedAt?: any | null, githubServiceFetchedAt?: any | null, login: string, avatarUrl?: string | null, location?: string | null, followersCount?: number | null, ownedStars?: number | null, contributedStars?: number | null, company?: string | null, email?: string | null, followingCount?: number | null, githubCreatedAt?: any | null, isHireable?: boolean | null, name?: string | null, twitterUsername?: string | null, websiteUrl?: string | null, firstSeenAt?: any | null, repositoriesCount?: number | null, contributedRepoCount?: number | null, socialAccounts?: { __typename?: 'SocialAccount', totalCount: number, nodes?: Array<{ __typename?: 'SocialAccountNodeEntity', displayName?: string | null, provider: string, url: string }> | null } | null, organizations?: Array<{ __typename?: 'Organization', githubId: string, login: string, avatarUrl?: string | null, name?: string | null }> | null, contributions?: Array<{ __typename?: 'Contribution', year: number, prsCount?: number | null, mergedPrsCount?: number | null, linesAdded?: number | null, linesRemoved?: number | null, repository?: { __typename?: 'Repository', githubId: string, createdAt?: any | null, pushedAt?: any | null, url: string, forkCount: number, isArchived: boolean, name?: string | null, releasesCount?: number | null, stargazerCount: number, languages?: { __typename?: 'RepositoryLanguagesEntity', totalCount: number, totalSize: number, nodes: Array<{ __typename?: 'LanguageEntity', id: string, size: number }> } | null } | null }> | null, repositories?: Array<{ __typename?: 'Repository', githubId: string, createdAt?: any | null, pushedAt?: any | null, url: string, forkCount: number, isArchived: boolean, name?: string | null, releasesCount?: number | null, stargazerCount: number, languages?: { __typename?: 'RepositoryLanguagesEntity', totalCount: number, totalSize: number, nodes: Array<{ __typename?: 'LanguageEntity', id: string, size: number }> } | null }> | null, timeline?: Array<{ __typename?: 'Timeline', changes: any, createdAt: any }> | null, rank?: { __typename?: 'RankWithoutUser', ownedStars: number, ownedStarsM?: number | null, ownedStarsY?: number | null, contributedStars: number, contributedStarsM?: number | null, contributedStarsY?: number | null, followersCount: number, followersCountM?: number | null, followersCountY?: number | null } | null } | null };

export type ProfilesForSitemapQueryVariables = Exact<{ [key: string]: never; }>;


export type ProfilesForSitemapQuery = { __typename?: 'Query', profilesForSitemap: Array<{ __typename?: 'ProfileForSitemap', login: string }> };

export type UserRepositoriesQueryVariables = Exact<{
  login: Scalars['String']['input'];
}>;


export type UserRepositoriesQuery = { __typename?: 'Query', user?: { __typename?: 'User', repositories?: Array<{ __typename?: 'Repository', githubId: string, createdAt?: any | null, pushedAt?: any | null, url: string, forkCount: number, isArchived: boolean, name?: string | null, releasesCount?: number | null, stargazerCount: number }> | null } | null };

export type TopRanksQueryVariables = Exact<{ [key: string]: never; }>;


export type TopRanksQuery = { __typename?: 'Query', byStars: Array<{ __typename?: 'Rank', user?: { __typename?: 'UserBasic', login: string } | null }>, byContribution: Array<{ __typename?: 'Rank', user?: { __typename?: 'UserBasic', login: string } | null }>, byFollowers: Array<{ __typename?: 'Rank', user?: { __typename?: 'UserBasic', login: string } | null }> };

export type RankByLoginQueryVariables = Exact<{
  login: Scalars['String']['input'];
}>;


export type RankByLoginQuery = { __typename?: 'Query', rankByLogin?: { __typename?: 'Rank', githubId: string, contributedStars: number, contributedStarsM?: number | null, followersCount: number, followersCountM?: number | null, ownedStars: number, ownedStarsM?: number | null, user?: { __typename?: 'UserBasic', login: string, avatarUrl?: string | null, ownedStars?: number | null, contributedStars?: number | null, followersCount?: number | null, location?: string | null } | null } | null };

export const RepositoryFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"RepositoryFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Repository"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"githubId"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"pushedAt"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"forkCount"}},{"kind":"Field","name":{"kind":"Name","value":"isArchived"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"releasesCount"}},{"kind":"Field","name":{"kind":"Name","value":"stargazerCount"}},{"kind":"Field","name":{"kind":"Name","value":"languages"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalCount"}},{"kind":"Field","name":{"kind":"Name","value":"totalSize"}},{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"size"}}]}}]}}]}}]} as unknown as DocumentNode<RepositoryFieldsFragment, unknown>;
export const IdByLoginDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"IdByLogin"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"login"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"rankByLogin"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"login"},"value":{"kind":"Variable","name":{"kind":"Name","value":"login"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"githubId"}}]}}]}}]} as unknown as DocumentNode<IdByLoginQuery, IdByLoginQueryVariables>;
export const RankingsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Rankings"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"order"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"RankOrder"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"rankings"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"order"},"value":{"kind":"Variable","name":{"kind":"Name","value":"order"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"githubId"}},{"kind":"Field","name":{"kind":"Name","value":"contributedStars"}},{"kind":"Field","name":{"kind":"Name","value":"contributedStarsM"}},{"kind":"Field","name":{"kind":"Name","value":"followersCount"}},{"kind":"Field","name":{"kind":"Name","value":"followersCountM"}},{"kind":"Field","name":{"kind":"Name","value":"ownedStars"}},{"kind":"Field","name":{"kind":"Name","value":"ownedStarsM"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"ownedStars"}},{"kind":"Field","name":{"kind":"Name","value":"contributedStars"}},{"kind":"Field","name":{"kind":"Name","value":"followersCount"}},{"kind":"Field","name":{"kind":"Name","value":"location"}}]}}]}}]}}]} as unknown as DocumentNode<RankingsQuery, RankingsQueryVariables>;
export const UserDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"User"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"login"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"user"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"login"},"value":{"kind":"Variable","name":{"kind":"Name","value":"login"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"githubId"}},{"kind":"Field","name":{"kind":"Name","value":"githubFetchedAt"}},{"kind":"Field","name":{"kind":"Name","value":"githubServiceFetchedAt"}},{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"location"}},{"kind":"Field","name":{"kind":"Name","value":"followersCount"}},{"kind":"Field","name":{"kind":"Name","value":"ownedStars"}},{"kind":"Field","name":{"kind":"Name","value":"contributedStars"}},{"kind":"Field","name":{"kind":"Name","value":"company"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"followingCount"}},{"kind":"Field","name":{"kind":"Name","value":"githubCreatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"isHireable"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"twitterUsername"}},{"kind":"Field","name":{"kind":"Name","value":"websiteUrl"}},{"kind":"Field","name":{"kind":"Name","value":"firstSeenAt"}},{"kind":"Field","name":{"kind":"Name","value":"repositoriesCount"}},{"kind":"Field","name":{"kind":"Name","value":"contributedRepoCount"}},{"kind":"Field","name":{"kind":"Name","value":"socialAccounts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalCount"}},{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"provider"}},{"kind":"Field","name":{"kind":"Name","value":"url"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"organizations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"githubId"}},{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"contributions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"year"}},{"kind":"Field","name":{"kind":"Name","value":"prsCount"}},{"kind":"Field","name":{"kind":"Name","value":"mergedPrsCount"}},{"kind":"Field","name":{"kind":"Name","value":"linesAdded"}},{"kind":"Field","name":{"kind":"Name","value":"linesRemoved"}},{"kind":"Field","name":{"kind":"Name","value":"repository"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"RepositoryFields"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"repositories"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"RepositoryFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"timeline"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"changes"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"rank"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ownedStars"}},{"kind":"Field","name":{"kind":"Name","value":"ownedStarsM"}},{"kind":"Field","name":{"kind":"Name","value":"ownedStarsY"}},{"kind":"Field","name":{"kind":"Name","value":"contributedStars"}},{"kind":"Field","name":{"kind":"Name","value":"contributedStarsM"}},{"kind":"Field","name":{"kind":"Name","value":"contributedStarsY"}},{"kind":"Field","name":{"kind":"Name","value":"followersCount"}},{"kind":"Field","name":{"kind":"Name","value":"followersCountM"}},{"kind":"Field","name":{"kind":"Name","value":"followersCountY"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"RepositoryFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Repository"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"githubId"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"pushedAt"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"forkCount"}},{"kind":"Field","name":{"kind":"Name","value":"isArchived"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"releasesCount"}},{"kind":"Field","name":{"kind":"Name","value":"stargazerCount"}},{"kind":"Field","name":{"kind":"Name","value":"languages"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalCount"}},{"kind":"Field","name":{"kind":"Name","value":"totalSize"}},{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"size"}}]}}]}}]}}]} as unknown as DocumentNode<UserQuery, UserQueryVariables>;
export const ProfilesForSitemapDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ProfilesForSitemap"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"profilesForSitemap"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"}}]}}]}}]} as unknown as DocumentNode<ProfilesForSitemapQuery, ProfilesForSitemapQueryVariables>;
export const UserRepositoriesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"UserRepositories"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"login"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"user"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"login"},"value":{"kind":"Variable","name":{"kind":"Name","value":"login"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"repositories"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"IntValue","value":"10"}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"IntValue","value":"200"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"githubId"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"pushedAt"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"forkCount"}},{"kind":"Field","name":{"kind":"Name","value":"isArchived"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"releasesCount"}},{"kind":"Field","name":{"kind":"Name","value":"stargazerCount"}}]}}]}}]}}]} as unknown as DocumentNode<UserRepositoriesQuery, UserRepositoriesQueryVariables>;
export const TopRanksDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"TopRanks"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"byStars"},"name":{"kind":"Name","value":"rankings"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"order"},"value":{"kind":"EnumValue","value":"STARS_OWNED"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"}}]}}]}},{"kind":"Field","alias":{"kind":"Name","value":"byContribution"},"name":{"kind":"Name","value":"rankings"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"order"},"value":{"kind":"EnumValue","value":"STARS_CONTRIBUTED"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"}}]}}]}},{"kind":"Field","alias":{"kind":"Name","value":"byFollowers"},"name":{"kind":"Name","value":"rankings"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"order"},"value":{"kind":"EnumValue","value":"FOLLOWERS_COUNT"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"}}]}}]}}]}}]} as unknown as DocumentNode<TopRanksQuery, TopRanksQueryVariables>;
export const RankByLoginDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"RankByLogin"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"login"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"rankByLogin"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"login"},"value":{"kind":"Variable","name":{"kind":"Name","value":"login"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"githubId"}},{"kind":"Field","name":{"kind":"Name","value":"contributedStars"}},{"kind":"Field","name":{"kind":"Name","value":"contributedStarsM"}},{"kind":"Field","name":{"kind":"Name","value":"followersCount"}},{"kind":"Field","name":{"kind":"Name","value":"followersCountM"}},{"kind":"Field","name":{"kind":"Name","value":"ownedStars"}},{"kind":"Field","name":{"kind":"Name","value":"ownedStarsM"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"ownedStars"}},{"kind":"Field","name":{"kind":"Name","value":"contributedStars"}},{"kind":"Field","name":{"kind":"Name","value":"followersCount"}},{"kind":"Field","name":{"kind":"Name","value":"location"}}]}}]}}]}}]} as unknown as DocumentNode<RankByLoginQuery, RankByLoginQueryVariables>;