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
};

export type Query = {
  __typename?: 'Query';
  globalRank: RankGlobal;
  globalRanks: Array<RankGlobal>;
};


export type QueryGlobalRankArgs = {
  id: Scalars['ID']['input'];
};


export type QueryGlobalRanksArgs = {
  limit?: Scalars['Int']['input'];
  offset?: Scalars['Int']['input'];
  order?: RankOrder;
};

export type RankGlobal = {
  __typename?: 'RankGlobal';
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
  user?: Maybe<User>;
};

export enum RankOrder {
  FollowersCount = 'FOLLOWERS_COUNT',
  StarsContributed = 'STARS_CONTRIBUTED',
  StarsOwned = 'STARS_OWNED'
}

export type User = {
  __typename?: 'User';
  _id: Scalars['String']['output'];
  avatarUrl?: Maybe<Scalars['String']['output']>;
  contributedStars?: Maybe<Scalars['Int']['output']>;
  createdAt: Scalars['DateTime']['output'];
  fetchingStartedAt?: Maybe<Scalars['Int']['output']>;
  fetchingStatus?: Maybe<UserFetchingStatus>;
  followersCount?: Maybe<Scalars['Int']['output']>;
  githubId: Scalars['ID']['output'];
  location?: Maybe<Scalars['String']['output']>;
  login: Scalars['String']['output'];
  ownedStars?: Maybe<Scalars['Int']['output']>;
  updatedAt: Scalars['DateTime']['output'];
};

export enum UserFetchingStatus {
  Active = 'ACTIVE',
  Completed = 'COMPLETED'
}

export type StarsRankingQueryVariables = Exact<{
  order?: InputMaybe<RankOrder>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;


export type StarsRankingQuery = { __typename?: 'Query', globalRanks: Array<{ __typename?: 'RankGlobal', githubId: string, contributedStars: number, contributedStarsM?: number | null, followersCount: number, followersCountM?: number | null, ownedStars: number, ownedStarsM?: number | null, user?: { __typename?: 'User', login: string, avatarUrl?: string | null, ownedStars?: number | null, contributedStars?: number | null, followersCount?: number | null, location?: string | null } | null }> };


export const StarsRankingDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"StarsRanking"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"order"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"RankOrder"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"globalRanks"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"order"},"value":{"kind":"Variable","name":{"kind":"Name","value":"order"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"githubId"}},{"kind":"Field","name":{"kind":"Name","value":"contributedStars"}},{"kind":"Field","name":{"kind":"Name","value":"contributedStarsM"}},{"kind":"Field","name":{"kind":"Name","value":"followersCount"}},{"kind":"Field","name":{"kind":"Name","value":"followersCountM"}},{"kind":"Field","name":{"kind":"Name","value":"ownedStars"}},{"kind":"Field","name":{"kind":"Name","value":"ownedStarsM"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"ownedStars"}},{"kind":"Field","name":{"kind":"Name","value":"contributedStars"}},{"kind":"Field","name":{"kind":"Name","value":"followersCount"}},{"kind":"Field","name":{"kind":"Name","value":"location"}}]}}]}}]}}]} as unknown as DocumentNode<StarsRankingQuery, StarsRankingQueryVariables>;