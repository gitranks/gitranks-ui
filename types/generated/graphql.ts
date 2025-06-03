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

export type Country = {
  __typename?: 'Country';
  /** Alternative country spellings */
  altSpellings: Array<Scalars['String']['output']>;
  /** Area in square kilometers */
  area: Scalars['Float']['output'];
  code: Scalars['String']['output'];
  flag: Scalars['String']['output'];
  name: Scalars['String']['output'];
  population: Scalars['Int']['output'];
  states: Array<Scalars['String']['output']>;
  /** Top 5 biggest cities by population */
  topCities: Array<Scalars['String']['output']>;
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
  /** List of countries */
  country?: Maybe<Array<Country>>;
  countryRankByLogin?: Maybe<RankCountry>;
  countryRankings: Array<RankCountry>;
  globalRankByLogin?: Maybe<RankGlobal>;
  globalRankings: Array<RankGlobal>;
  profilesForSitemap: Array<ProfileForSitemap>;
  user?: Maybe<User>;
};


export type QueryCountryRankByLoginArgs = {
  login: Scalars['String']['input'];
};


export type QueryCountryRankingsArgs = {
  country: Scalars['String']['input'];
  limit?: Scalars['Int']['input'];
  offset?: Scalars['Int']['input'];
  order?: RankOrder;
};


export type QueryGlobalRankByLoginArgs = {
  login: Scalars['String']['input'];
};


export type QueryGlobalRankingsArgs = {
  limit?: Scalars['Int']['input'];
  offset?: Scalars['Int']['input'];
  order?: RankOrder;
};


export type QueryUserArgs = {
  login: Scalars['String']['input'];
};

export type RankCountry = {
  __typename?: 'RankCountry';
  c?: Maybe<Scalars['Int']['output']>;
  cD?: Maybe<Scalars['Int']['output']>;
  cM?: Maybe<Scalars['Int']['output']>;
  cProvisional?: Maybe<Scalars['Int']['output']>;
  country: Scalars['ID']['output'];
  f?: Maybe<Scalars['Int']['output']>;
  fD?: Maybe<Scalars['Int']['output']>;
  fM?: Maybe<Scalars['Int']['output']>;
  fProvisional?: Maybe<Scalars['Int']['output']>;
  githubId: Scalars['ID']['output'];
  s?: Maybe<Scalars['Int']['output']>;
  sD?: Maybe<Scalars['Int']['output']>;
  sM?: Maybe<Scalars['Int']['output']>;
  sProvisional?: Maybe<Scalars['Int']['output']>;
  snapshots?: Maybe<Scalars['JSON']['output']>;
  user?: Maybe<UserBasic>;
};

export type RankCountryWithoutUser = {
  __typename?: 'RankCountryWithoutUser';
  c?: Maybe<Scalars['Int']['output']>;
  cD?: Maybe<Scalars['Int']['output']>;
  cM?: Maybe<Scalars['Int']['output']>;
  cProvisional?: Maybe<Scalars['Int']['output']>;
  country: Scalars['ID']['output'];
  f?: Maybe<Scalars['Int']['output']>;
  fD?: Maybe<Scalars['Int']['output']>;
  fM?: Maybe<Scalars['Int']['output']>;
  fProvisional?: Maybe<Scalars['Int']['output']>;
  githubId: Scalars['ID']['output'];
  s?: Maybe<Scalars['Int']['output']>;
  sD?: Maybe<Scalars['Int']['output']>;
  sM?: Maybe<Scalars['Int']['output']>;
  sProvisional?: Maybe<Scalars['Int']['output']>;
  snapshots?: Maybe<Scalars['JSON']['output']>;
};

export type RankGlobal = {
  __typename?: 'RankGlobal';
  c?: Maybe<Scalars['Int']['output']>;
  cD?: Maybe<Scalars['Int']['output']>;
  cM?: Maybe<Scalars['Int']['output']>;
  cProvisional?: Maybe<Scalars['Int']['output']>;
  f?: Maybe<Scalars['Int']['output']>;
  fD?: Maybe<Scalars['Int']['output']>;
  fM?: Maybe<Scalars['Int']['output']>;
  fProvisional?: Maybe<Scalars['Int']['output']>;
  githubId: Scalars['ID']['output'];
  s?: Maybe<Scalars['Int']['output']>;
  sD?: Maybe<Scalars['Int']['output']>;
  sM?: Maybe<Scalars['Int']['output']>;
  sProvisional?: Maybe<Scalars['Int']['output']>;
  snapshots?: Maybe<Scalars['JSON']['output']>;
  user?: Maybe<UserBasic>;
};

export type RankGlobalWithoutUser = {
  __typename?: 'RankGlobalWithoutUser';
  c?: Maybe<Scalars['Int']['output']>;
  cD?: Maybe<Scalars['Int']['output']>;
  cM?: Maybe<Scalars['Int']['output']>;
  cProvisional?: Maybe<Scalars['Int']['output']>;
  f?: Maybe<Scalars['Int']['output']>;
  fD?: Maybe<Scalars['Int']['output']>;
  fM?: Maybe<Scalars['Int']['output']>;
  fProvisional?: Maybe<Scalars['Int']['output']>;
  githubId: Scalars['ID']['output'];
  s?: Maybe<Scalars['Int']['output']>;
  sD?: Maybe<Scalars['Int']['output']>;
  sM?: Maybe<Scalars['Int']['output']>;
  sProvisional?: Maybe<Scalars['Int']['output']>;
  snapshots?: Maybe<Scalars['JSON']['output']>;
};

export enum RankOrder {
  Contributions = 'CONTRIBUTIONS',
  Followers = 'FOLLOWERS',
  Stars = 'STARS'
}

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
  avatarUrl?: Maybe<Scalars['String']['output']>;
  c?: Maybe<Scalars['Int']['output']>;
  company?: Maybe<Scalars['String']['output']>;
  contributedRepoCount?: Maybe<Scalars['Int']['output']>;
  contributions?: Maybe<Array<Contribution>>;
  country?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  email?: Maybe<Scalars['String']['output']>;
  f?: Maybe<Scalars['Int']['output']>;
  fetchingStatus?: Maybe<UserFetchingStatus>;
  fetchingUpdatedAt?: Maybe<Scalars['Float']['output']>;
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
  rankCountry?: Maybe<RankCountryWithoutUser>;
  rankGlobal?: Maybe<RankGlobalWithoutUser>;
  repositories?: Maybe<Array<Repository>>;
  repositoriesCount?: Maybe<Scalars['Int']['output']>;
  s?: Maybe<Scalars['Int']['output']>;
  snapshots?: Maybe<Scalars['JSON']['output']>;
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
  c?: Maybe<Scalars['Int']['output']>;
  f?: Maybe<Scalars['Int']['output']>;
  followersCount?: Maybe<Scalars['Int']['output']>;
  githubId: Scalars['ID']['output'];
  location?: Maybe<Scalars['String']['output']>;
  login: Scalars['String']['output'];
  s?: Maybe<Scalars['Int']['output']>;
};

export enum UserFetchingStatus {
  Completed = 'COMPLETED',
  Fetching = 'FETCHING'
}

export type GlobalRankByLoginQueryVariables = Exact<{
  login: Scalars['String']['input'];
}>;


export type GlobalRankByLoginQuery = { __typename?: 'Query', globalRankByLogin?: { __typename?: 'RankGlobal', githubId: string, c?: number | null, cM?: number | null, f?: number | null, fM?: number | null, s?: number | null, sM?: number | null, user?: { __typename?: 'UserBasic', login: string, avatarUrl?: string | null, s?: number | null, c?: number | null, f?: number | null, location?: string | null } | null } | null };

export type CountryRankingsQueryVariables = Exact<{
  order?: InputMaybe<RankOrder>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  country: Scalars['String']['input'];
}>;


export type CountryRankingsQuery = { __typename?: 'Query', countryRankings: Array<{ __typename?: 'RankCountry', githubId: string, c?: number | null, cM?: number | null, f?: number | null, fM?: number | null, s?: number | null, sM?: number | null, user?: { __typename?: 'UserBasic', login: string, avatarUrl?: string | null, s?: number | null, c?: number | null, f?: number | null, location?: string | null } | null }> };

export type GlobalRankingsQueryVariables = Exact<{
  order?: InputMaybe<RankOrder>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GlobalRankingsQuery = { __typename?: 'Query', globalRankings: Array<{ __typename?: 'RankGlobal', githubId: string, c?: number | null, cM?: number | null, f?: number | null, fM?: number | null, s?: number | null, sM?: number | null, user?: { __typename?: 'UserBasic', login: string, avatarUrl?: string | null, s?: number | null, c?: number | null, f?: number | null, location?: string | null } | null }> };

export type ProfileFetchingStatusQueryVariables = Exact<{
  login: Scalars['String']['input'];
}>;


export type ProfileFetchingStatusQuery = { __typename?: 'Query', user?: { __typename?: 'User', fetchingStatus?: UserFetchingStatus | null, fetchingUpdatedAt?: number | null } | null };

export type ProfileIdByLoginQueryVariables = Exact<{
  login: Scalars['String']['input'];
}>;


export type ProfileIdByLoginQuery = { __typename?: 'Query', globalRankByLogin?: { __typename?: 'RankGlobal', githubId: string } | null };

export type ProfileRepositoriesQueryVariables = Exact<{
  login: Scalars['String']['input'];
}>;


export type ProfileRepositoriesQuery = { __typename?: 'Query', user?: { __typename?: 'User', repositories?: Array<{ __typename?: 'Repository', githubId: string, createdAt?: any | null, pushedAt?: any | null, url: string, forkCount: number, isArchived: boolean, name?: string | null, releasesCount?: number | null, stargazerCount: number }> | null } | null };

export type RepositoryFieldsFragment = { __typename?: 'Repository', githubId: string, createdAt?: any | null, pushedAt?: any | null, url: string, forkCount: number, isArchived: boolean, name?: string | null, releasesCount?: number | null, stargazerCount: number, languages?: { __typename?: 'RepositoryLanguagesEntity', totalCount: number, totalSize: number, nodes: Array<{ __typename?: 'LanguageEntity', id: string, size: number }> } | null };

export type ProfileSummaryQueryVariables = Exact<{
  login: Scalars['String']['input'];
}>;


export type ProfileSummaryQuery = { __typename?: 'Query', user?: { __typename?: 'User', githubId: string, githubFetchedAt?: any | null, githubServiceFetchedAt?: any | null, login: string, avatarUrl?: string | null, location?: string | null, f?: number | null, s?: number | null, c?: number | null, company?: string | null, email?: string | null, followingCount?: number | null, githubCreatedAt?: any | null, isHireable?: boolean | null, name?: string | null, twitterUsername?: string | null, websiteUrl?: string | null, firstSeenAt?: any | null, repositoriesCount?: number | null, contributedRepoCount?: number | null, fetchingStatus?: UserFetchingStatus | null, fetchingUpdatedAt?: number | null, socialAccounts?: { __typename?: 'SocialAccount', totalCount: number, nodes?: Array<{ __typename?: 'SocialAccountNodeEntity', displayName?: string | null, provider: string, url: string }> | null } | null, organizations?: Array<{ __typename?: 'Organization', githubId: string, login: string, avatarUrl?: string | null, name?: string | null }> | null, contributions?: Array<{ __typename?: 'Contribution', year: number, prsCount?: number | null, mergedPrsCount?: number | null, linesAdded?: number | null, linesRemoved?: number | null, repository?: { __typename?: 'Repository', githubId: string, createdAt?: any | null, pushedAt?: any | null, url: string, forkCount: number, isArchived: boolean, name?: string | null, releasesCount?: number | null, stargazerCount: number, languages?: { __typename?: 'RepositoryLanguagesEntity', totalCount: number, totalSize: number, nodes: Array<{ __typename?: 'LanguageEntity', id: string, size: number }> } | null } | null }> | null, repositories?: Array<{ __typename?: 'Repository', githubId: string, createdAt?: any | null, pushedAt?: any | null, url: string, forkCount: number, isArchived: boolean, name?: string | null, releasesCount?: number | null, stargazerCount: number, languages?: { __typename?: 'RepositoryLanguagesEntity', totalCount: number, totalSize: number, nodes: Array<{ __typename?: 'LanguageEntity', id: string, size: number }> } | null }> | null, timeline?: Array<{ __typename?: 'Timeline', changes: any, createdAt: any }> | null, rankGlobal?: { __typename?: 'RankGlobalWithoutUser', s?: number | null, sProvisional?: number | null, sM?: number | null, c?: number | null, cProvisional?: number | null, cM?: number | null, f?: number | null, fProvisional?: number | null, fM?: number | null } | null } | null };

export type ProfilesForSitemapQueryVariables = Exact<{ [key: string]: never; }>;


export type ProfilesForSitemapQuery = { __typename?: 'Query', profilesForSitemap: Array<{ __typename?: 'ProfileForSitemap', login: string }> };

export type TopGlobalRankingsQueryVariables = Exact<{ [key: string]: never; }>;


export type TopGlobalRankingsQuery = { __typename?: 'Query', byStars: Array<{ __typename?: 'RankGlobal', user?: { __typename?: 'UserBasic', login: string } | null }>, byContribution: Array<{ __typename?: 'RankGlobal', user?: { __typename?: 'UserBasic', login: string } | null }>, byFollowers: Array<{ __typename?: 'RankGlobal', user?: { __typename?: 'UserBasic', login: string } | null }> };

export const RepositoryFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"RepositoryFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Repository"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"githubId"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"pushedAt"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"forkCount"}},{"kind":"Field","name":{"kind":"Name","value":"isArchived"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"releasesCount"}},{"kind":"Field","name":{"kind":"Name","value":"stargazerCount"}},{"kind":"Field","name":{"kind":"Name","value":"languages"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalCount"}},{"kind":"Field","name":{"kind":"Name","value":"totalSize"}},{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"size"}}]}}]}}]}}]} as unknown as DocumentNode<RepositoryFieldsFragment, unknown>;
export const GlobalRankByLoginDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GlobalRankByLogin"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"login"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"globalRankByLogin"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"login"},"value":{"kind":"Variable","name":{"kind":"Name","value":"login"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"githubId"}},{"kind":"Field","name":{"kind":"Name","value":"c"}},{"kind":"Field","name":{"kind":"Name","value":"cM"}},{"kind":"Field","name":{"kind":"Name","value":"f"}},{"kind":"Field","name":{"kind":"Name","value":"fM"}},{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"sM"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"c"}},{"kind":"Field","name":{"kind":"Name","value":"f"}},{"kind":"Field","name":{"kind":"Name","value":"location"}}]}}]}}]}}]} as unknown as DocumentNode<GlobalRankByLoginQuery, GlobalRankByLoginQueryVariables>;
export const CountryRankingsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"CountryRankings"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"order"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"RankOrder"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"country"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"countryRankings"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"order"},"value":{"kind":"Variable","name":{"kind":"Name","value":"order"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}},{"kind":"Argument","name":{"kind":"Name","value":"country"},"value":{"kind":"Variable","name":{"kind":"Name","value":"country"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"githubId"}},{"kind":"Field","name":{"kind":"Name","value":"c"}},{"kind":"Field","name":{"kind":"Name","value":"cM"}},{"kind":"Field","name":{"kind":"Name","value":"f"}},{"kind":"Field","name":{"kind":"Name","value":"fM"}},{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"sM"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"c"}},{"kind":"Field","name":{"kind":"Name","value":"f"}},{"kind":"Field","name":{"kind":"Name","value":"location"}}]}}]}}]}}]} as unknown as DocumentNode<CountryRankingsQuery, CountryRankingsQueryVariables>;
export const GlobalRankingsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GlobalRankings"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"order"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"RankOrder"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"globalRankings"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"order"},"value":{"kind":"Variable","name":{"kind":"Name","value":"order"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"githubId"}},{"kind":"Field","name":{"kind":"Name","value":"c"}},{"kind":"Field","name":{"kind":"Name","value":"cM"}},{"kind":"Field","name":{"kind":"Name","value":"f"}},{"kind":"Field","name":{"kind":"Name","value":"fM"}},{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"sM"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"c"}},{"kind":"Field","name":{"kind":"Name","value":"f"}},{"kind":"Field","name":{"kind":"Name","value":"location"}}]}}]}}]}}]} as unknown as DocumentNode<GlobalRankingsQuery, GlobalRankingsQueryVariables>;
export const ProfileFetchingStatusDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ProfileFetchingStatus"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"login"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"user"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"login"},"value":{"kind":"Variable","name":{"kind":"Name","value":"login"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"fetchingStatus"}},{"kind":"Field","name":{"kind":"Name","value":"fetchingUpdatedAt"}}]}}]}}]} as unknown as DocumentNode<ProfileFetchingStatusQuery, ProfileFetchingStatusQueryVariables>;
export const ProfileIdByLoginDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ProfileIdByLogin"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"login"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"globalRankByLogin"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"login"},"value":{"kind":"Variable","name":{"kind":"Name","value":"login"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"githubId"}}]}}]}}]} as unknown as DocumentNode<ProfileIdByLoginQuery, ProfileIdByLoginQueryVariables>;
export const ProfileRepositoriesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ProfileRepositories"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"login"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"user"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"login"},"value":{"kind":"Variable","name":{"kind":"Name","value":"login"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"repositories"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"IntValue","value":"10"}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"IntValue","value":"200"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"githubId"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"pushedAt"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"forkCount"}},{"kind":"Field","name":{"kind":"Name","value":"isArchived"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"releasesCount"}},{"kind":"Field","name":{"kind":"Name","value":"stargazerCount"}}]}}]}}]}}]} as unknown as DocumentNode<ProfileRepositoriesQuery, ProfileRepositoriesQueryVariables>;
export const ProfileSummaryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ProfileSummary"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"login"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"user"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"login"},"value":{"kind":"Variable","name":{"kind":"Name","value":"login"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"githubId"}},{"kind":"Field","name":{"kind":"Name","value":"githubFetchedAt"}},{"kind":"Field","name":{"kind":"Name","value":"githubServiceFetchedAt"}},{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"location"}},{"kind":"Field","name":{"kind":"Name","value":"f"}},{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"c"}},{"kind":"Field","name":{"kind":"Name","value":"company"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"followingCount"}},{"kind":"Field","name":{"kind":"Name","value":"githubCreatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"isHireable"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"twitterUsername"}},{"kind":"Field","name":{"kind":"Name","value":"websiteUrl"}},{"kind":"Field","name":{"kind":"Name","value":"firstSeenAt"}},{"kind":"Field","name":{"kind":"Name","value":"repositoriesCount"}},{"kind":"Field","name":{"kind":"Name","value":"contributedRepoCount"}},{"kind":"Field","name":{"kind":"Name","value":"fetchingStatus"}},{"kind":"Field","name":{"kind":"Name","value":"fetchingUpdatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"socialAccounts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalCount"}},{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"provider"}},{"kind":"Field","name":{"kind":"Name","value":"url"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"organizations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"githubId"}},{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}},{"kind":"Field","name":{"kind":"Name","value":"contributions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"year"}},{"kind":"Field","name":{"kind":"Name","value":"prsCount"}},{"kind":"Field","name":{"kind":"Name","value":"mergedPrsCount"}},{"kind":"Field","name":{"kind":"Name","value":"linesAdded"}},{"kind":"Field","name":{"kind":"Name","value":"linesRemoved"}},{"kind":"Field","name":{"kind":"Name","value":"repository"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"RepositoryFields"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"repositories"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"RepositoryFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"timeline"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"changes"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"rankGlobal"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"sProvisional"}},{"kind":"Field","name":{"kind":"Name","value":"sM"}},{"kind":"Field","name":{"kind":"Name","value":"c"}},{"kind":"Field","name":{"kind":"Name","value":"cProvisional"}},{"kind":"Field","name":{"kind":"Name","value":"cM"}},{"kind":"Field","name":{"kind":"Name","value":"f"}},{"kind":"Field","name":{"kind":"Name","value":"fProvisional"}},{"kind":"Field","name":{"kind":"Name","value":"fM"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"RepositoryFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Repository"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"githubId"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"pushedAt"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"forkCount"}},{"kind":"Field","name":{"kind":"Name","value":"isArchived"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"releasesCount"}},{"kind":"Field","name":{"kind":"Name","value":"stargazerCount"}},{"kind":"Field","name":{"kind":"Name","value":"languages"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalCount"}},{"kind":"Field","name":{"kind":"Name","value":"totalSize"}},{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"size"}}]}}]}}]}}]} as unknown as DocumentNode<ProfileSummaryQuery, ProfileSummaryQueryVariables>;
export const ProfilesForSitemapDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ProfilesForSitemap"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"profilesForSitemap"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"}}]}}]}}]} as unknown as DocumentNode<ProfilesForSitemapQuery, ProfilesForSitemapQueryVariables>;
export const TopGlobalRankingsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"TopGlobalRankings"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"byStars"},"name":{"kind":"Name","value":"globalRankings"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"order"},"value":{"kind":"EnumValue","value":"STARS"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"}}]}}]}},{"kind":"Field","alias":{"kind":"Name","value":"byContribution"},"name":{"kind":"Name","value":"globalRankings"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"order"},"value":{"kind":"EnumValue","value":"CONTRIBUTIONS"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"}}]}}]}},{"kind":"Field","alias":{"kind":"Name","value":"byFollowers"},"name":{"kind":"Name","value":"globalRankings"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"order"},"value":{"kind":"EnumValue","value":"FOLLOWERS"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"}}]}}]}}]}}]} as unknown as DocumentNode<TopGlobalRankingsQuery, TopGlobalRankingsQueryVariables>;