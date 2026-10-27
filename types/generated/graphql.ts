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
  /** A date-time string at UTC, such as 2019-12-03T09:54:33Z, compliant with the date-time format. */
  DateTime: { input: any; output: any; }
  /** The `JSON` scalar type represents JSON values as specified by [ECMA-404](http://www.ecma-international.org/publications/files/ECMA-ST/ECMA-404.pdf). */
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
  summary?: Maybe<CountrySummaryBasic>;
  /** Top 5 biggest cities by population */
  topCities: Array<Scalars['String']['output']>;
};

export type CountryBasic = {
  __typename?: 'CountryBasic';
  code: Scalars['String']['output'];
  flag: Scalars['String']['output'];
  name: Scalars['String']['output'];
};

export type CountryLanguageSummary = {
  __typename?: 'CountryLanguageSummary';
  country: Scalars['String']['output'];
  date: Scalars['String']['output'];
  language: Scalars['String']['output'];
  languageData?: Maybe<Language>;
  score: Scalars['Float']['output'];
  size: Scalars['Float']['output'];
  topUser?: Maybe<UserBasic>;
  usersCount: Scalars['Int']['output'];
};

export type CountrySummary = {
  __typename?: 'CountrySummary';
  c: Scalars['Float']['output'];
  country: Scalars['String']['output'];
  countryData: CountryBasic;
  date: Scalars['String']['output'];
  f: Scalars['Float']['output'];
  s: Scalars['Float']['output'];
  topUsers?: Maybe<CountryTopUsers>;
  usersCount: Scalars['Int']['output'];
};

export type CountrySummaryBasic = {
  __typename?: 'CountrySummaryBasic';
  c: Scalars['Float']['output'];
  country: Scalars['String']['output'];
  date: Scalars['String']['output'];
  f: Scalars['Float']['output'];
  s: Scalars['Float']['output'];
  topUsers?: Maybe<CountryTopUsers>;
  usersCount: Scalars['Int']['output'];
};

export enum CountrySummaryOrder {
  Contributions = 'CONTRIBUTIONS',
  Followers = 'FOLLOWERS',
  Stars = 'STARS',
  Users = 'USERS'
}

export type CountryTopUsers = {
  __typename?: 'CountryTopUsers';
  c?: Maybe<UserBasic>;
  f?: Maybe<UserBasic>;
  s?: Maybe<UserBasic>;
};

export type Entities = {
  __typename?: 'Entities';
  links?: Maybe<Scalars['JSON']['output']>;
  mentions?: Maybe<Scalars['JSON']['output']>;
};

export enum InsightCategory {
  CountryAnalysis = 'COUNTRY_ANALYSIS',
  CountryTrends = 'COUNTRY_TRENDS',
  LanguageAnalysis = 'LANGUAGE_ANALYSIS',
  LanguageTrends = 'LANGUAGE_TRENDS',
  MonthInNumbers = 'MONTH_IN_NUMBERS',
  OrgScoreChange = 'ORG_SCORE_CHANGE',
  ProfileScoreChange = 'PROFILE_SCORE_CHANGE',
  RepoAnniversary = 'REPO_ANNIVERSARY',
  RisingRepos = 'RISING_REPOS',
  ScoreMilestone = 'SCORE_MILESTONE',
  StarBurst = 'STAR_BURST',
  Top_100Climber = 'TOP_100_CLIMBER',
  TopStarGainers = 'TOP_STAR_GAINERS'
}

export type InsightPost = {
  __typename?: 'InsightPost';
  category: InsightCategory;
  createdAt: Scalars['DateTime']['output'];
  entities?: Maybe<Entities>;
  id: Scalars['ID']['output'];
  replies: Array<InsightReply>;
  segments: Array<Segment>;
  socialPosts?: Maybe<Scalars['JSON']['output']>;
};

export type InsightReply = {
  __typename?: 'InsightReply';
  createdAt: Scalars['DateTime']['output'];
  entities?: Maybe<Entities>;
  segments: Array<Segment>;
  socialPosts?: Maybe<Scalars['JSON']['output']>;
};

export type Language = {
  __typename?: 'Language';
  color?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
};

export type LanguageEntity = {
  __typename?: 'LanguageEntity';
  color?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  size: Scalars['Float']['output'];
};

export type LanguageSummary = {
  __typename?: 'LanguageSummary';
  date: Scalars['String']['output'];
  language: Scalars['String']['output'];
  languageData?: Maybe<Language>;
  score: Scalars['Float']['output'];
  size: Scalars['Float']['output'];
  topUser?: Maybe<UserBasic>;
  usersCount: Scalars['Int']['output'];
};

export enum LanguageSummaryOrder {
  Score = 'SCORE',
  Size = 'SIZE',
  Users = 'USERS'
}

export enum OrgActivityGroupBy {
  Kind = 'KIND',
  Language = 'LANGUAGE',
  Type = 'TYPE'
}

export type OrgPulseContributor = {
  __typename?: 'OrgPulseContributor';
  activeMonths: Scalars['Int']['output'];
  avatarUrl: Scalars['String']['output'];
  commits: Scalars['Int']['output'];
  githubId?: Maybe<Scalars['ID']['output']>;
  hasProfile: Scalars['Boolean']['output'];
  linesAdded: Scalars['Float']['output'];
  linesDeleted: Scalars['Float']['output'];
  login: Scalars['String']['output'];
  pullRequests: Scalars['Int']['output'];
  topLabels: Array<Scalars['String']['output']>;
};

export type OrgPulseContributorPage = {
  __typename?: 'OrgPulseContributorPage';
  items: Array<OrgPulseContributor>;
  labels: Array<Scalars['String']['output']>;
  total: Scalars['Int']['output'];
  unlinkedAuthors: Scalars['Int']['output'];
};

export enum OrgPulseContributorSort {
  Commits = 'COMMITS',
  Lines = 'LINES',
  PullRequests = 'PULL_REQUESTS'
}

export type OrgPulseCountry = {
  __typename?: 'OrgPulseCountry';
  contributors: Scalars['Int']['output'];
  country?: Maybe<Scalars['String']['output']>;
  flag?: Maybe<Scalars['String']['output']>;
  group: OrgPulseCountryGroup;
};

export enum OrgPulseCountryGroup {
  Country = 'COUNTRY',
  NotOnGitranks = 'NOT_ON_GITRANKS',
  NoLocation = 'NO_LOCATION'
}

export type OrgPulseFacts = {
  __typename?: 'OrgPulseFacts';
  computedAt: Scalars['DateTime']['output'];
  countries: Array<OrgPulseCountry>;
  last12: OrgPulseTotals;
  lastMonth: Scalars['String']['output'];
  scopeNote: Scalars['String']['output'];
  sharedContributorOrgs: Array<OrgPulseSharedOrg>;
  snapshot: Array<OrgPulseLabelLines>;
  topContributors: Array<OrgPulseContributor>;
  unlinkedAuthors12: Scalars['Int']['output'];
};

export type OrgPulseLabelLines = {
  __typename?: 'OrgPulseLabelLines';
  label: Scalars['String']['output'];
  lines: Scalars['Float']['output'];
  share: Scalars['Float']['output'];
};

export enum OrgPulsePeriod {
  Last_3Months = 'LAST_3_MONTHS',
  Last_12Months = 'LAST_12_MONTHS',
  Last_60Months = 'LAST_60_MONTHS'
}

export type OrgPulseSeries = {
  __typename?: 'OrgPulseSeries';
  activeAnonymous: Array<Scalars['Int']['output']>;
  activeLinked: Array<Scalars['Int']['output']>;
  added: Array<Array<Scalars['Float']['output']>>;
  commits: Array<Scalars['Int']['output']>;
  crossLines: Array<Scalars['Float']['output']>;
  deleted: Array<Array<Scalars['Float']['output']>>;
  labels: Array<Scalars['String']['output']>;
  largestChange: Array<Scalars['Float']['output']>;
  largestChangeShare: Array<Scalars['Float']['output']>;
  months: Array<Scalars['String']['output']>;
  newContributors: Array<Maybe<Scalars['Int']['output']>>;
  pullRequests: Array<Scalars['Int']['output']>;
  snapshot: Array<Array<Scalars['Float']['output']>>;
};

export type OrgPulseSharedOrg = {
  __typename?: 'OrgPulseSharedOrg';
  login: Scalars['String']['output'];
  organization?: Maybe<Organization>;
  share: Scalars['Float']['output'];
  sharedContributors: Scalars['Int']['output'];
};

export type OrgPulseTotals = {
  __typename?: 'OrgPulseTotals';
  activeContributors: Scalars['Int']['output'];
  added: Scalars['Float']['output'];
  commits: Scalars['Int']['output'];
  deleted: Scalars['Float']['output'];
  net: Scalars['Float']['output'];
  newContributors: Scalars['Int']['output'];
  pullRequests: Scalars['Int']['output'];
};

export type Organization = {
  __typename?: 'Organization';
  avatarUrl?: Maybe<Scalars['String']['output']>;
  country?: Maybe<Scalars['String']['output']>;
  countryFlag?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  email?: Maybe<Scalars['String']['output']>;
  githubCreatedAt?: Maybe<Scalars['DateTime']['output']>;
  githubId: Scalars['ID']['output'];
  githubUpdatedAt?: Maybe<Scalars['DateTime']['output']>;
  hasActivity: Scalars['Boolean']['output'];
  isVerified?: Maybe<Scalars['Boolean']['output']>;
  location?: Maybe<Scalars['String']['output']>;
  login?: Maybe<Scalars['String']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  pulse?: Maybe<OrgPulseFacts>;
  pulseContributors?: Maybe<OrgPulseContributorPage>;
  pulseSeries?: Maybe<OrgPulseSeries>;
  rankOrg?: Maybe<RankOrgWithoutOrganization>;
  reposCount?: Maybe<Scalars['Int']['output']>;
  s?: Maybe<Scalars['Int']['output']>;
  snapshots?: Maybe<Scalars['JSON']['output']>;
  topRepos: Array<Repo>;
  twitterUsername?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['DateTime']['output'];
  usersCount?: Maybe<Scalars['Int']['output']>;
  websiteUrl?: Maybe<Scalars['String']['output']>;
};


export type OrganizationPulseContributorsArgs = {
  first?: Scalars['Int']['input'];
  label?: InputMaybe<Scalars['String']['input']>;
  offset?: Scalars['Int']['input'];
  period?: OrgPulsePeriod;
  sortBy?: OrgPulseContributorSort;
};


export type OrganizationPulseSeriesArgs = {
  groupBy?: OrgActivityGroupBy;
};


export type OrganizationTopReposArgs = {
  first?: Scalars['Int']['input'];
};

export type OrganizationBasic = {
  __typename?: 'OrganizationBasic';
  avatarUrl?: Maybe<Scalars['String']['output']>;
  country?: Maybe<Scalars['String']['output']>;
  isVerified?: Maybe<Scalars['Boolean']['output']>;
  location?: Maybe<Scalars['String']['output']>;
  login?: Maybe<Scalars['String']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  s?: Maybe<Scalars['Int']['output']>;
};

export type ProfileForSitemap = {
  __typename?: 'ProfileForSitemap';
  avatarUrl?: Maybe<Scalars['String']['output']>;
  c?: Maybe<Scalars['Int']['output']>;
  f?: Maybe<Scalars['Int']['output']>;
  login: Scalars['String']['output'];
  s?: Maybe<Scalars['Int']['output']>;
};

export type Query = {
  __typename?: 'Query';
  /** List of countries */
  country?: Maybe<Array<Country>>;
  countryLanguageRankings: Array<RankCountryLanguageWithUser>;
  countryLanguageSummary: Array<CountryLanguageSummary>;
  countryRankByLogin?: Maybe<RankCountry>;
  countryRankings: Array<RankCountry>;
  countrySummary: Array<CountrySummary>;
  globalRankByLogin?: Maybe<RankGlobal>;
  globalRankings: Array<RankGlobal>;
  /** Single top-level scheduled insight post with replies by id */
  insight?: Maybe<InsightPost>;
  /** List of top-level scheduled insights (posts) with their replies, where scheduleFor <= now */
  insights: Array<InsightPost>;
  languageRankings: Array<RankLanguageWithUser>;
  languageSummary: Array<LanguageSummary>;
  orgRankings: Array<RankOrg>;
  organization?: Maybe<Organization>;
  profilesForSitemap: Array<ProfileForSitemap>;
  rankTiersByName?: Maybe<RankTier>;
  repo?: Maybe<Repo>;
  repoLanguages: Array<RepoLanguageSummary>;
  repoRankings: Array<RankRepo>;
  repoSitemapParts: Scalars['Int']['output'];
  reposForSitemap: Array<Scalars['String']['output']>;
  user?: Maybe<User>;
  users?: Maybe<Array<User>>;
};


export type QueryCountryLanguageRankingsArgs = {
  country: Scalars['String']['input'];
  language: Scalars['String']['input'];
  limit?: Scalars['Int']['input'];
  offset?: Scalars['Int']['input'];
};


export type QueryCountryLanguageSummaryArgs = {
  country: Scalars['String']['input'];
  date?: InputMaybe<Scalars['String']['input']>;
  limit?: Scalars['Int']['input'];
  offset?: Scalars['Int']['input'];
  order?: LanguageSummaryOrder;
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


export type QueryCountrySummaryArgs = {
  date?: InputMaybe<Scalars['String']['input']>;
  order?: CountrySummaryOrder;
};


export type QueryGlobalRankByLoginArgs = {
  login: Scalars['String']['input'];
};


export type QueryGlobalRankingsArgs = {
  limit?: Scalars['Int']['input'];
  offset?: Scalars['Int']['input'];
  order?: RankOrder;
};


export type QueryInsightArgs = {
  id: Scalars['ID']['input'];
};


export type QueryInsightsArgs = {
  limit?: Scalars['Int']['input'];
  skip?: Scalars['Int']['input'];
};


export type QueryLanguageRankingsArgs = {
  language: Scalars['String']['input'];
  limit?: Scalars['Int']['input'];
  offset?: Scalars['Int']['input'];
};


export type QueryLanguageSummaryArgs = {
  date?: InputMaybe<Scalars['String']['input']>;
  limit?: Scalars['Int']['input'];
  offset?: Scalars['Int']['input'];
  order?: LanguageSummaryOrder;
};


export type QueryOrgRankingsArgs = {
  limit?: Scalars['Int']['input'];
  offset?: Scalars['Int']['input'];
};


export type QueryOrganizationArgs = {
  login: Scalars['String']['input'];
};


export type QueryRankTiersByNameArgs = {
  name: Scalars['String']['input'];
};


export type QueryRepoArgs = {
  name: Scalars['String']['input'];
  owner: Scalars['String']['input'];
};


export type QueryRepoRankingsArgs = {
  language?: InputMaybe<Scalars['String']['input']>;
  limit?: Scalars['Int']['input'];
  noLanguage?: InputMaybe<Scalars['Boolean']['input']>;
  offset?: Scalars['Int']['input'];
};


export type QueryReposForSitemapArgs = {
  part: Scalars['Int']['input'];
};


export type QueryUserArgs = {
  login: Scalars['String']['input'];
};


export type QueryUsersArgs = {
  logins: Array<Scalars['String']['input']>;
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

export type RankCountryLanguage = {
  __typename?: 'RankCountryLanguage';
  country: Scalars['String']['output'];
  githubId: Scalars['String']['output'];
  language: Scalars['String']['output'];
  s?: Maybe<Scalars['Int']['output']>;
  sD?: Maybe<Scalars['Int']['output']>;
  sM?: Maybe<Scalars['Int']['output']>;
  snapshots?: Maybe<Scalars['JSON']['output']>;
};

export type RankCountryLanguageWithUser = {
  __typename?: 'RankCountryLanguageWithUser';
  country: Scalars['String']['output'];
  githubId: Scalars['String']['output'];
  language: Scalars['String']['output'];
  s?: Maybe<Scalars['Int']['output']>;
  sD?: Maybe<Scalars['Int']['output']>;
  sM?: Maybe<Scalars['Int']['output']>;
  snapshots?: Maybe<Scalars['JSON']['output']>;
  user?: Maybe<UserWithLanguageScore>;
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

export type RankLanguage = {
  __typename?: 'RankLanguage';
  githubId: Scalars['String']['output'];
  language: Scalars['String']['output'];
  s?: Maybe<Scalars['Int']['output']>;
  sD?: Maybe<Scalars['Int']['output']>;
  sM?: Maybe<Scalars['Int']['output']>;
  snapshots?: Maybe<Scalars['JSON']['output']>;
};

export type RankLanguageWithUser = {
  __typename?: 'RankLanguageWithUser';
  githubId: Scalars['String']['output'];
  language: Scalars['String']['output'];
  s?: Maybe<Scalars['Int']['output']>;
  sD?: Maybe<Scalars['Int']['output']>;
  sM?: Maybe<Scalars['Int']['output']>;
  snapshots?: Maybe<Scalars['JSON']['output']>;
  user?: Maybe<UserWithLanguageScore>;
};

export enum RankOrder {
  Contributions = 'CONTRIBUTIONS',
  Followers = 'FOLLOWERS',
  Stars = 'STARS'
}

export type RankOrg = {
  __typename?: 'RankOrg';
  githubId: Scalars['String']['output'];
  organization?: Maybe<OrganizationBasic>;
  s?: Maybe<Scalars['Int']['output']>;
  sD?: Maybe<Scalars['Int']['output']>;
  sM?: Maybe<Scalars['Int']['output']>;
  snapshots?: Maybe<Scalars['JSON']['output']>;
};

export type RankOrgWithoutOrganization = {
  __typename?: 'RankOrgWithoutOrganization';
  githubId: Scalars['String']['output'];
  s?: Maybe<Scalars['Int']['output']>;
  sD?: Maybe<Scalars['Int']['output']>;
  sM?: Maybe<Scalars['Int']['output']>;
  snapshots?: Maybe<Scalars['JSON']['output']>;
};

export type RankRepo = {
  __typename?: 'RankRepo';
  githubId: Scalars['String']['output'];
  l?: Maybe<Scalars['Int']['output']>;
  lD?: Maybe<Scalars['Int']['output']>;
  lM?: Maybe<Scalars['Int']['output']>;
  language?: Maybe<Scalars['String']['output']>;
  repo?: Maybe<Repo>;
  s?: Maybe<Scalars['Int']['output']>;
  sD?: Maybe<Scalars['Int']['output']>;
  sM?: Maybe<Scalars['Int']['output']>;
};

export type RankTier = {
  __typename?: 'RankTier';
  cTiers: Array<Tier>;
  cUsers: Scalars['Int']['output'];
  entityName: Scalars['String']['output'];
  entityType: Scalars['String']['output'];
  fTiers: Array<Tier>;
  fUsers: Scalars['Int']['output'];
  sTiers: Array<Tier>;
  sUsers: Scalars['Int']['output'];
};

export type Repo = {
  __typename?: 'Repo';
  burstMonths?: Maybe<Array<Scalars['String']['output']>>;
  createdAt?: Maybe<Scalars['DateTime']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  gainedThisMonth?: Maybe<Scalars['Int']['output']>;
  githubId: Scalars['String']['output'];
  history?: Maybe<RepoHistory>;
  isArchived?: Maybe<Scalars['Boolean']['output']>;
  isInOrganization?: Maybe<Scalars['Boolean']['output']>;
  language?: Maybe<Scalars['String']['output']>;
  monthStarts?: Maybe<Scalars['JSON']['output']>;
  name: Scalars['String']['output'];
  nameWithOwner: Scalars['String']['output'];
  owner: Scalars['String']['output'];
  ownerAvatarUrl?: Maybe<Scalars['String']['output']>;
  ownerId?: Maybe<Scalars['String']['output']>;
  pull?: Maybe<RepoPull>;
  pulse?: Maybe<RepoPulseFacts>;
  /** The repository's top contributors: the union of the top 100 of each period by lines, commits and pull requests. A label table, and which labels are listed, rank only that union, so a contributor outside it is missing even when among the top of a label. */
  pulseContributors?: Maybe<OrgPulseContributorPage>;
  pulseSeries?: Maybe<OrgPulseSeries>;
  pushedAt?: Maybe<Scalars['DateTime']['output']>;
  rank?: Maybe<RankRepo>;
  renamedTo?: Maybe<Scalars['String']['output']>;
  stars: Scalars['Int']['output'];
  starsAt?: Maybe<Scalars['DateTime']['output']>;
};


export type RepoPulseContributorsArgs = {
  first?: Scalars['Int']['input'];
  label?: InputMaybe<Scalars['String']['input']>;
  offset?: Scalars['Int']['input'];
  period?: OrgPulsePeriod;
  sortBy?: OrgPulseContributorSort;
};


export type RepoPulseSeriesArgs = {
  groupBy?: OrgActivityGroupBy;
};

export type RepoHistory = {
  __typename?: 'RepoHistory';
  complete: Scalars['Boolean']['output'];
  current: RepoStarPoint;
  points: Array<RepoStarPoint>;
  readAt: Scalars['DateTime']['output'];
};

export type RepoLanguageSummary = {
  __typename?: 'RepoLanguageSummary';
  language?: Maybe<Scalars['String']['output']>;
  repos: Scalars['Int']['output'];
  stars: Scalars['Float']['output'];
  topRepo?: Maybe<Repo>;
  topRepoId: Scalars['String']['output'];
};

export type RepoPull = {
  __typename?: 'RepoPull';
  failure?: Maybe<Scalars['String']['output']>;
  finishedAt?: Maybe<Scalars['DateTime']['output']>;
  requestedAt: Scalars['DateTime']['output'];
  status: Scalars['String']['output'];
  via: Scalars['String']['output'];
};

export type RepoPulseFacts = {
  __typename?: 'RepoPulseFacts';
  computedAt: Scalars['DateTime']['output'];
  /** Countries of the repository's top contributors active in the last 12 months (the union of the top 100 of each period by lines, commits and pull requests), not of every contributor: the top 10 countries, then "no location" and "not on gitranks". */
  countries: Array<OrgPulseCountry>;
  last12: OrgPulseTotals;
  lastMonth: Scalars['String']['output'];
  scopeNote: Scalars['String']['output'];
  snapshot: Array<OrgPulseLabelLines>;
  topContributors: Array<OrgPulseContributor>;
  unlinkedAuthors12: Scalars['Int']['output'];
};

export type RepoStarPoint = {
  __typename?: 'RepoStarPoint';
  date: Scalars['DateTime']['output'];
  stars: Scalars['Int']['output'];
};

export type Repository = {
  __typename?: 'Repository';
  createdAt?: Maybe<Scalars['DateTime']['output']>;
  forkCount?: Maybe<Scalars['Int']['output']>;
  githubId: Scalars['String']['output'];
  isArchived?: Maybe<Scalars['Boolean']['output']>;
  languages?: Maybe<Array<LanguageEntity>>;
  name?: Maybe<Scalars['String']['output']>;
  pushedAt?: Maybe<Scalars['DateTime']['output']>;
  rank?: Maybe<RankRepo>;
  releasesCount?: Maybe<Scalars['Int']['output']>;
  stargazerCount: Scalars['Int']['output'];
  url: Scalars['String']['output'];
};

export type Segment = {
  __typename?: 'Segment';
  display?: Maybe<Scalars['String']['output']>;
  entityKey?: Maybe<Scalars['String']['output']>;
  text?: Maybe<Scalars['String']['output']>;
  type: SegmentType;
};

export enum SegmentType {
  Link = 'LINK',
  Mention = 'MENTION',
  Text = 'TEXT'
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

export type StarsReview = {
  __typename?: 'StarsReview';
  reportable: Scalars['Boolean']['output'];
  repositories: Scalars['Int']['output'];
  stars: Scalars['Int']['output'];
  status: StarsReviewStatus;
};

export enum StarsReviewStatus {
  NotCounted = 'NOT_COUNTED',
  Reviewing = 'REVIEWING'
}

export type Tier = {
  __typename?: 'Tier';
  level: Scalars['Int']['output'];
  maxRank: Scalars['Int']['output'];
  minRank: Scalars['Int']['output'];
  minValue: Scalars['Int']['output'];
  tier: Scalars['Int']['output'];
};

export type Timeline = {
  __typename?: 'Timeline';
  changes: Scalars['JSON']['output'];
  createdAt: Scalars['DateTime']['output'];
};

export type User = {
  __typename?: 'User';
  avatarUrl?: Maybe<Scalars['String']['output']>;
  c?: Maybe<Scalars['Int']['output']>;
  cD?: Maybe<Scalars['Int']['output']>;
  cLangs?: Maybe<Array<UserLanguage>>;
  company?: Maybe<Scalars['String']['output']>;
  contributedRepoCount?: Maybe<Scalars['Int']['output']>;
  contributions?: Maybe<Array<Contribution>>;
  country?: Maybe<Scalars['String']['output']>;
  countryFlag?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  email?: Maybe<Scalars['String']['output']>;
  f?: Maybe<Scalars['Int']['output']>;
  fD?: Maybe<Scalars['Int']['output']>;
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
  primaryLanguages?: Maybe<Array<Scalars['String']['output']>>;
  rankCountry?: Maybe<RankCountryWithoutUser>;
  rankGlobal?: Maybe<RankGlobalWithoutUser>;
  repositories?: Maybe<Array<Repository>>;
  repositoriesCount?: Maybe<Scalars['Int']['output']>;
  s?: Maybe<Scalars['Int']['output']>;
  sD?: Maybe<Scalars['Int']['output']>;
  sLangs?: Maybe<Array<UserLanguage>>;
  snapshots?: Maybe<Scalars['JSON']['output']>;
  socialAccounts?: Maybe<SocialAccount>;
  starsReview?: Maybe<StarsReview>;
  tiersCountry?: Maybe<RankTier>;
  tiersGlobal?: Maybe<RankTier>;
  timeline?: Maybe<Array<Timeline>>;
  updatedAt: Scalars['DateTime']['output'];
  websiteUrl?: Maybe<Scalars['String']['output']>;
};


export type UserCLangsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: Scalars['Int']['input'];
};


export type UserContributionsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: Scalars['Int']['input'];
};


export type UserRepositoriesArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: Scalars['Int']['input'];
};


export type UserSLangsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: Scalars['Int']['input'];
};


export type UserSnapshotsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: Scalars['Int']['input'];
};


export type UserTimelineArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: Scalars['Int']['input'];
};

export type UserBasic = {
  __typename?: 'UserBasic';
  avatarUrl?: Maybe<Scalars['String']['output']>;
  c?: Maybe<Scalars['Int']['output']>;
  cLangs?: Maybe<Array<UserLanguageBasic>>;
  country?: Maybe<Scalars['String']['output']>;
  f?: Maybe<Scalars['Int']['output']>;
  followersCount?: Maybe<Scalars['Int']['output']>;
  githubId: Scalars['ID']['output'];
  location?: Maybe<Scalars['String']['output']>;
  login: Scalars['String']['output'];
  s?: Maybe<Scalars['Int']['output']>;
  sLangs?: Maybe<Array<UserLanguageBasic>>;
};

export enum UserFetchingStatus {
  Completed = 'COMPLETED',
  Fetching = 'FETCHING'
}

export type UserLanguage = {
  __typename?: 'UserLanguage';
  color?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  rankCountry?: Maybe<RankCountryLanguage>;
  rankGlobal?: Maybe<RankLanguage>;
  score: Scalars['Int']['output'];
  size: Scalars['Float']['output'];
  sources?: Maybe<Array<UserLanguageSource>>;
  tiersCountry?: Maybe<RankTier>;
  tiersGlobal?: Maybe<RankTier>;
};

export type UserLanguageBasic = {
  __typename?: 'UserLanguageBasic';
  color?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  score: Scalars['Int']['output'];
  size: Scalars['Float']['output'];
  sources?: Maybe<Array<UserLanguageSource>>;
};

export type UserLanguageSource = {
  __typename?: 'UserLanguageSource';
  githubId: Scalars['String']['output'];
  linesAdded?: Maybe<Scalars['Int']['output']>;
  linesRemoved?: Maybe<Scalars['Int']['output']>;
  name: Scalars['String']['output'];
  percentage: Scalars['Float']['output'];
  prsCount?: Maybe<Scalars['Int']['output']>;
  stargazerCount: Scalars['Int']['output'];
  url?: Maybe<Scalars['String']['output']>;
  year?: Maybe<Scalars['Int']['output']>;
};

export type UserWithLanguageScore = {
  __typename?: 'UserWithLanguageScore';
  avatarUrl?: Maybe<Scalars['String']['output']>;
  country?: Maybe<Scalars['String']['output']>;
  languageScore?: Maybe<Scalars['Int']['output']>;
  location?: Maybe<Scalars['String']['output']>;
  login: Scalars['String']['output'];
};

export type AvatarByLoginQueryVariables = Exact<{
  login: Scalars['String']['input'];
}>;


export type AvatarByLoginQuery = { __typename?: 'Query', user?: { __typename?: 'User', avatarUrl?: string | null } | null };

export type BadgeProfileWithRanksQueryVariables = Exact<{
  login: Scalars['String']['input'];
  includeRankGlobal?: Scalars['Boolean']['input'];
  includeRankCountry?: Scalars['Boolean']['input'];
}>;


export type BadgeProfileWithRanksQuery = { __typename?: 'Query', user?: { __typename?: 'User', githubId: string, avatarUrl?: string | null, country?: string | null, f?: number | null, s?: number | null, c?: number | null, snapshots?: any | null, rankGlobal?: { __typename?: 'RankGlobalWithoutUser', s?: number | null, sProvisional?: number | null, sM?: number | null, c?: number | null, cProvisional?: number | null, cM?: number | null, f?: number | null, fProvisional?: number | null, fM?: number | null } | null, rankCountry?: { __typename?: 'RankCountryWithoutUser', s?: number | null, sProvisional?: number | null, sM?: number | null, c?: number | null, cProvisional?: number | null, cM?: number | null, f?: number | null, fProvisional?: number | null, fM?: number | null } | null } | null };

export type BadgeRepoQueryVariables = Exact<{
  owner: Scalars['String']['input'];
  name: Scalars['String']['input'];
}>;


export type BadgeRepoQuery = { __typename?: 'Query', repo?: { __typename?: 'Repo', nameWithOwner: string, stars: number, gainedThisMonth?: number | null, history?: { __typename?: 'RepoHistory', points: Array<{ __typename?: 'RepoStarPoint', date: any, stars: number }>, current: { __typename?: 'RepoStarPoint', date: any, stars: number } } | null } | null };

export type BadgeTiersQueryVariables = Exact<{
  tiersName: Scalars['String']['input'];
  includeSTiers?: Scalars['Boolean']['input'];
  includeCTiers?: Scalars['Boolean']['input'];
  includeFTiers?: Scalars['Boolean']['input'];
}>;


export type BadgeTiersQuery = { __typename?: 'Query', rankTiersByName?: { __typename?: 'RankTier', sUsers: number, cUsers: number, fUsers: number, sTiers?: Array<{ __typename?: 'Tier', tier: number, level: number, minRank: number, maxRank: number, minValue: number }>, fTiers?: Array<{ __typename?: 'Tier', tier: number, level: number, minRank: number, maxRank: number, minValue: number }>, cTiers?: Array<{ __typename?: 'Tier', tier: number, level: number, minRank: number, maxRank: number, minValue: number }> } | null };

export type CountryLanguageFactsQueryVariables = Exact<{
  country: Scalars['String']['input'];
  order?: InputMaybe<LanguageSummaryOrder>;
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type CountryLanguageFactsQuery = { __typename?: 'Query', countryLanguageSummary: Array<{ __typename?: 'CountryLanguageSummary', language: string, date: string, usersCount: number }> };

export type CountryLanguageRankingQueryVariables = Exact<{
  offset?: InputMaybe<Scalars['Int']['input']>;
  language: Scalars['String']['input'];
  country: Scalars['String']['input'];
}>;


export type CountryLanguageRankingQuery = { __typename?: 'Query', countryLanguageRankings: Array<{ __typename?: 'RankCountryLanguageWithUser', githubId: string, s?: number | null, sM?: number | null, user?: { __typename?: 'UserWithLanguageScore', login: string, avatarUrl?: string | null, location?: string | null, country?: string | null, s?: number | null } | null }> };

export type CountryLanguageSummaryQueryVariables = Exact<{
  country: Scalars['String']['input'];
  order?: InputMaybe<LanguageSummaryOrder>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type CountryLanguageSummaryQuery = { __typename?: 'Query', countryLanguageSummary: Array<{ __typename?: 'CountryLanguageSummary', language: string, country: string, date: string, usersCount: number, score: number, size: number, topUser?: { __typename?: 'UserBasic', login: string, avatarUrl?: string | null, country?: string | null } | null, languageData?: { __typename?: 'Language', color?: string | null } | null }> };

export type CountryQueryVariables = Exact<{ [key: string]: never; }>;


export type CountryQuery = { __typename?: 'Query', country?: Array<{ __typename?: 'Country', name: string, flag: string }> | null };

export type CountryRankingsQueryVariables = Exact<{
  order?: InputMaybe<RankOrder>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  country: Scalars['String']['input'];
}>;


export type CountryRankingsQuery = { __typename?: 'Query', countryRankings: Array<{ __typename?: 'RankCountry', githubId: string, c?: number | null, cM?: number | null, f?: number | null, fM?: number | null, s?: number | null, sM?: number | null, user?: { __typename?: 'UserBasic', login: string, avatarUrl?: string | null, location?: string | null, country?: string | null, s?: number | null, c?: number | null, f?: number | null } | null }> };

export type CountrySummaryQueryVariables = Exact<{
  order?: InputMaybe<CountrySummaryOrder>;
}>;


export type CountrySummaryQuery = { __typename?: 'Query', countrySummary: Array<{ __typename?: 'CountrySummary', country: string, usersCount: number, date: string, s: number, c: number, f: number, topUsers?: { __typename?: 'CountryTopUsers', s?: { __typename?: 'UserBasic', login: string, avatarUrl?: string | null } | null, c?: { __typename?: 'UserBasic', login: string, avatarUrl?: string | null } | null, f?: { __typename?: 'UserBasic', login: string, avatarUrl?: string | null } | null } | null, countryData: { __typename?: 'CountryBasic', code: string, name: string, flag: string } }> };

export type ContributionFieldsFragment = { __typename?: 'Contribution', year: number, prsCount?: number | null, mergedPrsCount?: number | null, linesAdded?: number | null, linesRemoved?: number | null, repository?: { __typename?: 'Repository', name?: string | null, url: string, createdAt?: any | null, pushedAt?: any | null, releasesCount?: number | null, stargazerCount: number, isArchived?: boolean | null, forkCount?: number | null, languages?: Array<{ __typename?: 'LanguageEntity', name: string, color?: string | null, size: number }> | null, rank?: { __typename?: 'RankRepo', s?: number | null } | null } | null };

export type UserBaseFieldsFragment = { __typename?: 'User', githubId: string, login: string, name?: string | null, avatarUrl?: string | null, location?: string | null, country?: string | null, countryFlag?: string | null, company?: string | null, email?: string | null, f?: number | null, followingCount?: number | null, githubCreatedAt?: any | null, githubFetchedAt?: any | null, websiteUrl?: string | null, socialAccounts?: { __typename?: 'SocialAccount', totalCount: number, nodes?: Array<{ __typename?: 'SocialAccountNodeEntity', displayName?: string | null, provider: string, url: string }> | null } | null, organizations?: Array<{ __typename?: 'Organization', login?: string | null, avatarUrl?: string | null, name?: string | null }> | null };

export type UserTiersCountryFragment = { __typename?: 'User', tiersCountry?: { __typename?: 'RankTier', sUsers: number, cUsers: number, fUsers: number, sTiers: Array<{ __typename?: 'Tier', tier: number, level: number, minRank: number, maxRank: number, minValue: number }>, fTiers: Array<{ __typename?: 'Tier', tier: number, level: number, minRank: number, maxRank: number, minValue: number }>, cTiers: Array<{ __typename?: 'Tier', tier: number, level: number, minRank: number, maxRank: number, minValue: number }> } | null };

export type UserFetchingStatusFragment = { __typename?: 'User', fetchingStatus?: UserFetchingStatus | null, fetchingUpdatedAt?: number | null };

export type UserTiersGlobalFragment = { __typename?: 'User', tiersGlobal?: { __typename?: 'RankTier', sUsers: number, cUsers: number, fUsers: number, sTiers: Array<{ __typename?: 'Tier', tier: number, level: number, minRank: number, maxRank: number, minValue: number }>, fTiers: Array<{ __typename?: 'Tier', tier: number, level: number, minRank: number, maxRank: number, minValue: number }>, cTiers: Array<{ __typename?: 'Tier', tier: number, level: number, minRank: number, maxRank: number, minValue: number }> } | null };

export type UserSeoFragment = { __typename?: 'User', s?: number | null, c?: number | null, f?: number | null, repositoriesCount?: number | null, contributedRepoCount?: number | null };

export type PulseSeriesFieldsFragment = { __typename?: 'OrgPulseSeries', months: Array<string>, labels: Array<string>, snapshot: Array<Array<number>>, added: Array<Array<number>>, deleted: Array<Array<number>>, largestChange: Array<number>, largestChangeShare: Array<number>, crossLines: Array<number>, commits: Array<number>, pullRequests: Array<number>, activeLinked: Array<number>, activeAnonymous: Array<number>, newContributors: Array<number | null> };

export type PulseContributorFieldsFragment = { __typename?: 'OrgPulseContributor', githubId?: string | null, login: string, hasProfile: boolean, avatarUrl: string, linesAdded: number, linesDeleted: number, commits: number, pullRequests: number, activeMonths: number, topLabels: Array<string> };

export type PulseContributorPageFieldsFragment = { __typename?: 'OrgPulseContributorPage', total: number, unlinkedAuthors: number, labels: Array<string>, items: Array<{ __typename?: 'OrgPulseContributor', githubId?: string | null, login: string, hasProfile: boolean, avatarUrl: string, linesAdded: number, linesDeleted: number, commits: number, pullRequests: number, activeMonths: number, topLabels: Array<string> }> };

export type PulseLabelLinesFieldsFragment = { __typename?: 'OrgPulseLabelLines', label: string, lines: number, share: number };

export type PulseTotalsFieldsFragment = { __typename?: 'OrgPulseTotals', added: number, deleted: number, net: number, commits: number, pullRequests: number, activeContributors: number, newContributors: number };

export type PulseCountryFieldsFragment = { __typename?: 'OrgPulseCountry', group: OrgPulseCountryGroup, country?: string | null, flag?: string | null, contributors: number };

export type RepoRowFieldsFragment = { __typename?: 'Repo', githubId: string, owner: string, name: string, nameWithOwner: string, ownerAvatarUrl?: string | null, description?: string | null, language?: string | null, stars: number, gainedThisMonth?: number | null };

export type RepositoryLanguageFieldsFragment = { __typename?: 'LanguageEntity', name: string, color?: string | null, size: number };

export type RepositoryFieldsFragment = { __typename?: 'Repository', name?: string | null, url: string, createdAt?: any | null, pushedAt?: any | null, releasesCount?: number | null, stargazerCount: number, isArchived?: boolean | null, forkCount?: number | null, languages?: Array<{ __typename?: 'LanguageEntity', name: string, color?: string | null, size: number }> | null, rank?: { __typename?: 'RankRepo', s?: number | null } | null };

export type TierFieldsFragment = { __typename?: 'Tier', tier: number, level: number, minRank: number, maxRank: number, minValue: number };

export type GlobalRankByLoginQueryVariables = Exact<{
  login: Scalars['String']['input'];
}>;


export type GlobalRankByLoginQuery = { __typename?: 'Query', globalRankByLogin?: { __typename?: 'RankGlobal', githubId: string, c?: number | null, cM?: number | null, f?: number | null, fM?: number | null, s?: number | null, sM?: number | null, user?: { __typename?: 'UserBasic', login: string, avatarUrl?: string | null, s?: number | null, c?: number | null, f?: number | null, location?: string | null } | null } | null };

export type GlobalRankingsQueryVariables = Exact<{
  order?: InputMaybe<RankOrder>;
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GlobalRankingsQuery = { __typename?: 'Query', globalRankings: Array<{ __typename?: 'RankGlobal', githubId: string, c?: number | null, cM?: number | null, f?: number | null, fM?: number | null, s?: number | null, sM?: number | null, user?: { __typename?: 'UserBasic', login: string, avatarUrl?: string | null, location?: string | null, country?: string | null, s?: number | null, c?: number | null, f?: number | null } | null }> };

export type InsightsQueryVariables = Exact<{
  skip: Scalars['Int']['input'];
  limit: Scalars['Int']['input'];
}>;


export type InsightsQuery = { __typename?: 'Query', insights: Array<{ __typename?: 'InsightPost', id: string, category: InsightCategory, createdAt: any, socialPosts?: any | null, segments: Array<{ __typename?: 'Segment', type: SegmentType, text?: string | null, entityKey?: string | null, display?: string | null }>, entities?: { __typename?: 'Entities', mentions?: any | null, links?: any | null } | null, replies: Array<{ __typename?: 'InsightReply', createdAt: any, socialPosts?: any | null, segments: Array<{ __typename?: 'Segment', type: SegmentType, text?: string | null, entityKey?: string | null, display?: string | null }>, entities?: { __typename?: 'Entities', mentions?: any | null, links?: any | null } | null }> }> };

export type InsightQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type InsightQuery = { __typename?: 'Query', insight?: { __typename?: 'InsightPost', id: string, category: InsightCategory, createdAt: any, socialPosts?: any | null, segments: Array<{ __typename?: 'Segment', type: SegmentType, text?: string | null, entityKey?: string | null, display?: string | null }>, entities?: { __typename?: 'Entities', mentions?: any | null, links?: any | null } | null, replies: Array<{ __typename?: 'InsightReply', createdAt: any, socialPosts?: any | null, segments: Array<{ __typename?: 'Segment', type: SegmentType, text?: string | null, entityKey?: string | null, display?: string | null }>, entities?: { __typename?: 'Entities', mentions?: any | null, links?: any | null } | null }> } | null };

export type LanguageFactsQueryVariables = Exact<{
  order?: InputMaybe<LanguageSummaryOrder>;
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type LanguageFactsQuery = { __typename?: 'Query', languageSummary: Array<{ __typename?: 'LanguageSummary', language: string, date: string, usersCount: number }> };

export type LanguageRankingQueryVariables = Exact<{
  offset?: InputMaybe<Scalars['Int']['input']>;
  language: Scalars['String']['input'];
}>;


export type LanguageRankingQuery = { __typename?: 'Query', languageRankings: Array<{ __typename?: 'RankLanguageWithUser', githubId: string, s?: number | null, sM?: number | null, user?: { __typename?: 'UserWithLanguageScore', login: string, avatarUrl?: string | null, location?: string | null, country?: string | null, s?: number | null } | null }> };

export type LanguageSummaryQueryVariables = Exact<{
  order?: InputMaybe<LanguageSummaryOrder>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type LanguageSummaryQuery = { __typename?: 'Query', languageSummary: Array<{ __typename?: 'LanguageSummary', language: string, date: string, usersCount: number, score: number, size: number, topUser?: { __typename?: 'UserBasic', login: string, avatarUrl?: string | null, country?: string | null } | null, languageData?: { __typename?: 'Language', color?: string | null } | null }> };

export type OrgIdByLoginQueryVariables = Exact<{
  login: Scalars['String']['input'];
}>;


export type OrgIdByLoginQuery = { __typename?: 'Query', organization?: { __typename?: 'Organization', githubId: string } | null };

export type OrgPulseContributorsQueryVariables = Exact<{
  login: Scalars['String']['input'];
  period: OrgPulsePeriod;
  sortBy: OrgPulseContributorSort;
  label?: InputMaybe<Scalars['String']['input']>;
  first: Scalars['Int']['input'];
  offset: Scalars['Int']['input'];
}>;


export type OrgPulseContributorsQuery = { __typename?: 'Query', organization?: { __typename?: 'Organization', pulseContributors?: { __typename?: 'OrgPulseContributorPage', total: number, unlinkedAuthors: number, labels: Array<string>, items: Array<{ __typename?: 'OrgPulseContributor', githubId?: string | null, login: string, hasProfile: boolean, avatarUrl: string, linesAdded: number, linesDeleted: number, commits: number, pullRequests: number, activeMonths: number, topLabels: Array<string> }> } | null } | null };

export type OrgPulseSeriesQueryVariables = Exact<{
  login: Scalars['String']['input'];
  groupBy: OrgActivityGroupBy;
}>;


export type OrgPulseSeriesQuery = { __typename?: 'Query', organization?: { __typename?: 'Organization', pulseSeries?: { __typename?: 'OrgPulseSeries', months: Array<string>, labels: Array<string>, snapshot: Array<Array<number>>, added: Array<Array<number>>, deleted: Array<Array<number>>, largestChange: Array<number>, largestChangeShare: Array<number>, crossLines: Array<number>, commits: Array<number>, pullRequests: Array<number>, activeLinked: Array<number>, activeAnonymous: Array<number>, newContributors: Array<number | null> } | null } | null };

export type OrgRankingsQueryVariables = Exact<{
  offset?: InputMaybe<Scalars['Int']['input']>;
}>;


export type OrgRankingsQuery = { __typename?: 'Query', orgRankings: Array<{ __typename?: 'RankOrg', githubId: string, s?: number | null, sM?: number | null, organization?: { __typename?: 'OrganizationBasic', login?: string | null, name?: string | null, avatarUrl?: string | null, location?: string | null, country?: string | null, isVerified?: boolean | null, s?: number | null } | null }> };

export type PageOrgQueryVariables = Exact<{
  login: Scalars['String']['input'];
}>;


export type PageOrgQuery = { __typename?: 'Query', organization?: { __typename?: 'Organization', login?: string | null, name?: string | null, githubId: string, avatarUrl?: string | null, email?: string | null, location?: string | null, countryFlag?: string | null, twitterUsername?: string | null, websiteUrl?: string | null, isVerified?: boolean | null, githubCreatedAt?: any | null, githubUpdatedAt?: any | null, s?: number | null, reposCount?: number | null, usersCount?: number | null, updatedAt: any, hasActivity: boolean, rankOrg?: { __typename?: 'RankOrgWithoutOrganization', s?: number | null, sM?: number | null } | null, topRepos: Array<{ __typename?: 'Repo', githubId: string, owner: string, name: string, nameWithOwner: string, ownerAvatarUrl?: string | null, description?: string | null, language?: string | null, stars: number, gainedThisMonth?: number | null, rank?: { __typename?: 'RankRepo', s?: number | null } | null }>, pulse?: { __typename?: 'OrgPulseFacts', lastMonth: string, unlinkedAuthors12: number, scopeNote: string, computedAt: any, snapshot: Array<{ __typename?: 'OrgPulseLabelLines', label: string, lines: number, share: number }>, last12: { __typename?: 'OrgPulseTotals', added: number, deleted: number, net: number, commits: number, pullRequests: number, activeContributors: number, newContributors: number }, topContributors: Array<{ __typename?: 'OrgPulseContributor', githubId?: string | null, login: string, hasProfile: boolean, avatarUrl: string, linesAdded: number, linesDeleted: number, commits: number, pullRequests: number, activeMonths: number, topLabels: Array<string> }>, countries: Array<{ __typename?: 'OrgPulseCountry', group: OrgPulseCountryGroup, country?: string | null, flag?: string | null, contributors: number }>, sharedContributorOrgs: Array<{ __typename?: 'OrgPulseSharedOrg', login: string, sharedContributors: number, share: number, organization?: { __typename?: 'Organization', login?: string | null, name?: string | null, avatarUrl?: string | null } | null }> } | null } | null };

export type PageProfileLanguagesQueryVariables = Exact<{
  login: Scalars['String']['input'];
  isGlobalContext?: Scalars['Boolean']['input'];
}>;


export type PageProfileLanguagesQuery = { __typename?: 'Query', user?: { __typename?: 'User', firstSeenAt?: any | null, githubId: string, login: string, name?: string | null, avatarUrl?: string | null, location?: string | null, country?: string | null, countryFlag?: string | null, company?: string | null, email?: string | null, f?: number | null, followingCount?: number | null, githubCreatedAt?: any | null, githubFetchedAt?: any | null, websiteUrl?: string | null, fetchingStatus?: UserFetchingStatus | null, fetchingUpdatedAt?: number | null, s?: number | null, c?: number | null, repositoriesCount?: number | null, contributedRepoCount?: number | null, sLangs?: Array<{ __typename?: 'UserLanguage', name: string, color?: string | null, size: number, score: number, rankGlobal?: { __typename?: 'RankLanguage', s?: number | null, sM?: number | null } | null, tiersGlobal?: { __typename?: 'RankTier', sUsers: number, sTiers: Array<{ __typename?: 'Tier', tier: number, level: number, minRank: number, maxRank: number, minValue: number }> } | null, rankCountry?: { __typename?: 'RankCountryLanguage', s?: number | null, sM?: number | null } | null, tiersCountry?: { __typename?: 'RankTier', sUsers: number, sTiers: Array<{ __typename?: 'Tier', tier: number, level: number, minRank: number, maxRank: number, minValue: number }> } | null }> | null, socialAccounts?: { __typename?: 'SocialAccount', totalCount: number, nodes?: Array<{ __typename?: 'SocialAccountNodeEntity', displayName?: string | null, provider: string, url: string }> | null } | null, organizations?: Array<{ __typename?: 'Organization', login?: string | null, avatarUrl?: string | null, name?: string | null }> | null } | null };

export type PageProfileOverviewQueryVariables = Exact<{
  login: Scalars['String']['input'];
  isGlobalContext?: Scalars['Boolean']['input'];
}>;


export type PageProfileOverviewQuery = { __typename?: 'Query', user?: { __typename?: 'User', firstSeenAt?: any | null, snapshots?: any | null, githubId: string, login: string, name?: string | null, avatarUrl?: string | null, location?: string | null, country?: string | null, countryFlag?: string | null, company?: string | null, email?: string | null, f?: number | null, followingCount?: number | null, githubCreatedAt?: any | null, githubFetchedAt?: any | null, websiteUrl?: string | null, fetchingStatus?: UserFetchingStatus | null, fetchingUpdatedAt?: number | null, s?: number | null, c?: number | null, repositoriesCount?: number | null, contributedRepoCount?: number | null, rankGlobal?: { __typename?: 'RankGlobalWithoutUser', s?: number | null, sProvisional?: number | null, sM?: number | null, c?: number | null, cProvisional?: number | null, cM?: number | null, f?: number | null, fProvisional?: number | null, fM?: number | null, snapshots?: any | null } | null, rankCountry?: { __typename?: 'RankCountryWithoutUser', s?: number | null, sProvisional?: number | null, sM?: number | null, c?: number | null, cProvisional?: number | null, cM?: number | null, f?: number | null, fProvisional?: number | null, fM?: number | null, snapshots?: any | null } | null, sLangs?: Array<{ __typename?: 'UserLanguage', name: string, color?: string | null, size: number, score: number, sources?: Array<{ __typename?: 'UserLanguageSource', name: string, stargazerCount: number, percentage: number, year?: number | null }> | null }> | null, cLangs?: Array<{ __typename?: 'UserLanguage', name: string, color?: string | null, size: number, sources?: Array<{ __typename?: 'UserLanguageSource', name: string, stargazerCount: number, percentage: number, year?: number | null, linesAdded?: number | null, linesRemoved?: number | null, prsCount?: number | null, url?: string | null }> | null }> | null, starsReview?: { __typename?: 'StarsReview', status: StarsReviewStatus, stars: number, repositories: number, reportable: boolean } | null, repositories?: Array<{ __typename?: 'Repository', name?: string | null, url: string, createdAt?: any | null, pushedAt?: any | null, releasesCount?: number | null, stargazerCount: number, isArchived?: boolean | null, forkCount?: number | null, languages?: Array<{ __typename?: 'LanguageEntity', name: string, color?: string | null, size: number }> | null, rank?: { __typename?: 'RankRepo', s?: number | null } | null }> | null, contributions?: Array<{ __typename?: 'Contribution', year: number, prsCount?: number | null, mergedPrsCount?: number | null, linesAdded?: number | null, linesRemoved?: number | null, repository?: { __typename?: 'Repository', name?: string | null, url: string, createdAt?: any | null, pushedAt?: any | null, releasesCount?: number | null, stargazerCount: number, isArchived?: boolean | null, forkCount?: number | null, languages?: Array<{ __typename?: 'LanguageEntity', name: string, color?: string | null, size: number }> | null, rank?: { __typename?: 'RankRepo', s?: number | null } | null } | null }> | null, timeline?: Array<{ __typename?: 'Timeline', changes: any, createdAt: any }> | null, socialAccounts?: { __typename?: 'SocialAccount', totalCount: number, nodes?: Array<{ __typename?: 'SocialAccountNodeEntity', displayName?: string | null, provider: string, url: string }> | null } | null, organizations?: Array<{ __typename?: 'Organization', login?: string | null, avatarUrl?: string | null, name?: string | null }> | null, tiersGlobal?: { __typename?: 'RankTier', sUsers: number, cUsers: number, fUsers: number, sTiers: Array<{ __typename?: 'Tier', tier: number, level: number, minRank: number, maxRank: number, minValue: number }>, fTiers: Array<{ __typename?: 'Tier', tier: number, level: number, minRank: number, maxRank: number, minValue: number }>, cTiers: Array<{ __typename?: 'Tier', tier: number, level: number, minRank: number, maxRank: number, minValue: number }> } | null, tiersCountry?: { __typename?: 'RankTier', sUsers: number, cUsers: number, fUsers: number, sTiers: Array<{ __typename?: 'Tier', tier: number, level: number, minRank: number, maxRank: number, minValue: number }>, fTiers: Array<{ __typename?: 'Tier', tier: number, level: number, minRank: number, maxRank: number, minValue: number }>, cTiers: Array<{ __typename?: 'Tier', tier: number, level: number, minRank: number, maxRank: number, minValue: number }> } | null } | null };

export type PageProfileRanksQueryVariables = Exact<{
  login: Scalars['String']['input'];
  isGlobalContext?: Scalars['Boolean']['input'];
}>;


export type PageProfileRanksQuery = { __typename?: 'Query', user?: { __typename?: 'User', githubId: string, login: string, name?: string | null, avatarUrl?: string | null, location?: string | null, country?: string | null, countryFlag?: string | null, company?: string | null, email?: string | null, f?: number | null, followingCount?: number | null, githubCreatedAt?: any | null, githubFetchedAt?: any | null, websiteUrl?: string | null, fetchingStatus?: UserFetchingStatus | null, fetchingUpdatedAt?: number | null, s?: number | null, c?: number | null, repositoriesCount?: number | null, contributedRepoCount?: number | null, rankGlobal?: { __typename?: 'RankGlobalWithoutUser', s?: number | null, sProvisional?: number | null, sM?: number | null, c?: number | null, cProvisional?: number | null, cM?: number | null, f?: number | null, fProvisional?: number | null, fM?: number | null } | null, rankCountry?: { __typename?: 'RankCountryWithoutUser', s?: number | null, sProvisional?: number | null, sM?: number | null, c?: number | null, cProvisional?: number | null, cM?: number | null, f?: number | null, fProvisional?: number | null, fM?: number | null } | null, socialAccounts?: { __typename?: 'SocialAccount', totalCount: number, nodes?: Array<{ __typename?: 'SocialAccountNodeEntity', displayName?: string | null, provider: string, url: string }> | null } | null, organizations?: Array<{ __typename?: 'Organization', login?: string | null, avatarUrl?: string | null, name?: string | null }> | null, tiersGlobal?: { __typename?: 'RankTier', sUsers: number, cUsers: number, fUsers: number, sTiers: Array<{ __typename?: 'Tier', tier: number, level: number, minRank: number, maxRank: number, minValue: number }>, fTiers: Array<{ __typename?: 'Tier', tier: number, level: number, minRank: number, maxRank: number, minValue: number }>, cTiers: Array<{ __typename?: 'Tier', tier: number, level: number, minRank: number, maxRank: number, minValue: number }> } | null, tiersCountry?: { __typename?: 'RankTier', sUsers: number, cUsers: number, fUsers: number, sTiers: Array<{ __typename?: 'Tier', tier: number, level: number, minRank: number, maxRank: number, minValue: number }>, fTiers: Array<{ __typename?: 'Tier', tier: number, level: number, minRank: number, maxRank: number, minValue: number }>, cTiers: Array<{ __typename?: 'Tier', tier: number, level: number, minRank: number, maxRank: number, minValue: number }> } | null } | null };

export type PageProfileRepositoriesQueryVariables = Exact<{
  login: Scalars['String']['input'];
}>;


export type PageProfileRepositoriesQuery = { __typename?: 'Query', user?: { __typename?: 'User', repositoriesCount?: number | null, githubId: string, login: string, name?: string | null, avatarUrl?: string | null, location?: string | null, country?: string | null, countryFlag?: string | null, company?: string | null, email?: string | null, f?: number | null, followingCount?: number | null, githubCreatedAt?: any | null, githubFetchedAt?: any | null, websiteUrl?: string | null, fetchingStatus?: UserFetchingStatus | null, fetchingUpdatedAt?: number | null, s?: number | null, c?: number | null, contributedRepoCount?: number | null, repositories?: Array<{ __typename?: 'Repository', name?: string | null, url: string, createdAt?: any | null, pushedAt?: any | null, releasesCount?: number | null, stargazerCount: number, isArchived?: boolean | null, forkCount?: number | null, languages?: Array<{ __typename?: 'LanguageEntity', name: string, color?: string | null, size: number }> | null, rank?: { __typename?: 'RankRepo', s?: number | null } | null }> | null, contributions?: Array<{ __typename?: 'Contribution', year: number, prsCount?: number | null, mergedPrsCount?: number | null, linesAdded?: number | null, linesRemoved?: number | null, repository?: { __typename?: 'Repository', name?: string | null, url: string, createdAt?: any | null, pushedAt?: any | null, releasesCount?: number | null, stargazerCount: number, isArchived?: boolean | null, forkCount?: number | null, languages?: Array<{ __typename?: 'LanguageEntity', name: string, color?: string | null, size: number }> | null, rank?: { __typename?: 'RankRepo', s?: number | null } | null } | null }> | null, socialAccounts?: { __typename?: 'SocialAccount', totalCount: number, nodes?: Array<{ __typename?: 'SocialAccountNodeEntity', displayName?: string | null, provider: string, url: string }> | null } | null, organizations?: Array<{ __typename?: 'Organization', login?: string | null, avatarUrl?: string | null, name?: string | null }> | null } | null };

export type PageRepoQueryVariables = Exact<{
  owner: Scalars['String']['input'];
  name: Scalars['String']['input'];
}>;


export type PageRepoQuery = { __typename?: 'Query', repo?: { __typename?: 'Repo', isArchived?: boolean | null, createdAt?: any | null, renamedTo?: string | null, burstMonths?: Array<string> | null, githubId: string, owner: string, name: string, nameWithOwner: string, ownerAvatarUrl?: string | null, description?: string | null, language?: string | null, stars: number, gainedThisMonth?: number | null, rank?: { __typename?: 'RankRepo', language?: string | null, s?: number | null, sM?: number | null, l?: number | null, lM?: number | null } | null, history?: { __typename?: 'RepoHistory', complete: boolean, readAt: any, points: Array<{ __typename?: 'RepoStarPoint', date: any, stars: number }>, current: { __typename?: 'RepoStarPoint', date: any, stars: number } } | null, pull?: { __typename?: 'RepoPull', status: string, requestedAt: any, finishedAt?: any | null } | null } | null };

export type ProfileContributionsQueryVariables = Exact<{
  login: Scalars['String']['input'];
  offset?: InputMaybe<Scalars['Int']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type ProfileContributionsQuery = { __typename?: 'Query', user?: { __typename?: 'User', contributions?: Array<{ __typename?: 'Contribution', year: number, prsCount?: number | null, mergedPrsCount?: number | null, linesAdded?: number | null, linesRemoved?: number | null, repository?: { __typename?: 'Repository', name?: string | null, url: string, createdAt?: any | null, pushedAt?: any | null, releasesCount?: number | null, stargazerCount: number, isArchived?: boolean | null, forkCount?: number | null, languages?: Array<{ __typename?: 'LanguageEntity', name: string, color?: string | null, size: number }> | null, rank?: { __typename?: 'RankRepo', s?: number | null } | null } | null }> | null } | null };

export type ProfileFetchingStatusQueryVariables = Exact<{
  login: Scalars['String']['input'];
}>;


export type ProfileFetchingStatusQuery = { __typename?: 'Query', user?: { __typename?: 'User', login: string, fetchingStatus?: UserFetchingStatus | null, fetchingUpdatedAt?: number | null } | null };

export type ProfileIdByLoginQueryVariables = Exact<{
  login: Scalars['String']['input'];
}>;


export type ProfileIdByLoginQuery = { __typename?: 'Query', globalRankByLogin?: { __typename?: 'RankGlobal', githubId: string, s?: number | null, sProvisional?: number | null, c?: number | null, cProvisional?: number | null, f?: number | null, fProvisional?: number | null, user?: { __typename?: 'UserBasic', login: string, s?: number | null, c?: number | null, f?: number | null, country?: string | null } | null } | null, countryRankByLogin?: { __typename?: 'RankCountry', s?: number | null, sProvisional?: number | null, c?: number | null, cProvisional?: number | null, f?: number | null, fProvisional?: number | null } | null };

export type ProfileRepositoriesQueryVariables = Exact<{
  login: Scalars['String']['input'];
  offset?: InputMaybe<Scalars['Int']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type ProfileRepositoriesQuery = { __typename?: 'Query', user?: { __typename?: 'User', repositoriesCount?: number | null, repositories?: Array<{ __typename?: 'Repository', name?: string | null, url: string, createdAt?: any | null, pushedAt?: any | null, releasesCount?: number | null, stargazerCount: number, isArchived?: boolean | null, forkCount?: number | null, languages?: Array<{ __typename?: 'LanguageEntity', name: string, color?: string | null, size: number }> | null, rank?: { __typename?: 'RankRepo', s?: number | null } | null }> | null } | null };

export type ProfilesForSitemapQueryVariables = Exact<{ [key: string]: never; }>;


export type ProfilesForSitemapQuery = { __typename?: 'Query', profilesForSitemap: Array<{ __typename?: 'ProfileForSitemap', login: string, s?: number | null, c?: number | null, f?: number | null }> };

export type RepoLanguagesQueryVariables = Exact<{ [key: string]: never; }>;


export type RepoLanguagesQuery = { __typename?: 'Query', repoLanguages: Array<{ __typename?: 'RepoLanguageSummary', language?: string | null, repos: number, stars: number, topRepo?: { __typename?: 'Repo', githubId: string, owner: string, name: string, nameWithOwner: string, ownerAvatarUrl?: string | null, description?: string | null, language?: string | null, stars: number, gainedThisMonth?: number | null } | null }> };

export type RepoSitemapPartsQueryVariables = Exact<{ [key: string]: never; }>;


export type RepoSitemapPartsQuery = { __typename?: 'Query', repoSitemapParts: number };

export type ReposForSitemapQueryVariables = Exact<{
  part: Scalars['Int']['input'];
}>;


export type ReposForSitemapQuery = { __typename?: 'Query', reposForSitemap: Array<string> };

export type RepoPulseContributorsQueryVariables = Exact<{
  owner: Scalars['String']['input'];
  name: Scalars['String']['input'];
  period: OrgPulsePeriod;
  sortBy: OrgPulseContributorSort;
  label?: InputMaybe<Scalars['String']['input']>;
  first: Scalars['Int']['input'];
  offset: Scalars['Int']['input'];
}>;


export type RepoPulseContributorsQuery = { __typename?: 'Query', repo?: { __typename?: 'Repo', pulseContributors?: { __typename?: 'OrgPulseContributorPage', total: number, unlinkedAuthors: number, labels: Array<string>, items: Array<{ __typename?: 'OrgPulseContributor', githubId?: string | null, login: string, hasProfile: boolean, avatarUrl: string, linesAdded: number, linesDeleted: number, commits: number, pullRequests: number, activeMonths: number, topLabels: Array<string> }> } | null } | null };

export type RepoPulseFactsQueryVariables = Exact<{
  owner: Scalars['String']['input'];
  name: Scalars['String']['input'];
}>;


export type RepoPulseFactsQuery = { __typename?: 'Query', repo?: { __typename?: 'Repo', pulse?: { __typename?: 'RepoPulseFacts', lastMonth: string, unlinkedAuthors12: number, scopeNote: string, computedAt: any, snapshot: Array<{ __typename?: 'OrgPulseLabelLines', label: string, lines: number, share: number }>, last12: { __typename?: 'OrgPulseTotals', added: number, deleted: number, net: number, commits: number, pullRequests: number, activeContributors: number, newContributors: number }, topContributors: Array<{ __typename?: 'OrgPulseContributor', githubId?: string | null, login: string, hasProfile: boolean, avatarUrl: string, linesAdded: number, linesDeleted: number, commits: number, pullRequests: number, activeMonths: number, topLabels: Array<string> }>, countries: Array<{ __typename?: 'OrgPulseCountry', group: OrgPulseCountryGroup, country?: string | null, flag?: string | null, contributors: number }> } | null } | null };

export type RepoPulseSeriesQueryVariables = Exact<{
  owner: Scalars['String']['input'];
  name: Scalars['String']['input'];
  groupBy: OrgActivityGroupBy;
}>;


export type RepoPulseSeriesQuery = { __typename?: 'Query', repo?: { __typename?: 'Repo', pulseSeries?: { __typename?: 'OrgPulseSeries', months: Array<string>, labels: Array<string>, snapshot: Array<Array<number>>, added: Array<Array<number>>, deleted: Array<Array<number>>, largestChange: Array<number>, largestChangeShare: Array<number>, crossLines: Array<number>, commits: Array<number>, pullRequests: Array<number>, activeLinked: Array<number>, activeAnonymous: Array<number>, newContributors: Array<number | null> } | null } | null };

export type RepoRankingsQueryVariables = Exact<{
  offset?: InputMaybe<Scalars['Int']['input']>;
  language?: InputMaybe<Scalars['String']['input']>;
  noLanguage?: InputMaybe<Scalars['Boolean']['input']>;
}>;


export type RepoRankingsQuery = { __typename?: 'Query', repoRankings: Array<{ __typename?: 'RankRepo', githubId: string, s?: number | null, sM?: number | null, l?: number | null, lM?: number | null, repo?: { __typename?: 'Repo', githubId: string, owner: string, name: string, nameWithOwner: string, ownerAvatarUrl?: string | null, description?: string | null, language?: string | null, stars: number, gainedThisMonth?: number | null } | null }> };

export type TopLanguagesQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type TopLanguagesQuery = { __typename?: 'Query', languageSummary: Array<{ __typename?: 'LanguageSummary', language: string }> };

export const RepositoryLanguageFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"RepositoryLanguageFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"LanguageEntity"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"size"}}]}}]} as unknown as DocumentNode<RepositoryLanguageFieldsFragment, unknown>;
export const RepositoryFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"RepositoryFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Repository"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"pushedAt"}},{"kind":"Field","name":{"kind":"Name","value":"releasesCount"}},{"kind":"Field","name":{"kind":"Name","value":"stargazerCount"}},{"kind":"Field","name":{"kind":"Name","value":"isArchived"}},{"kind":"Field","name":{"kind":"Name","value":"forkCount"}},{"kind":"Field","name":{"kind":"Name","value":"languages"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"RepositoryLanguageFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"rank"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"s"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"RepositoryLanguageFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"LanguageEntity"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"size"}}]}}]} as unknown as DocumentNode<RepositoryFieldsFragment, unknown>;
export const ContributionFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ContributionFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Contribution"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"year"}},{"kind":"Field","name":{"kind":"Name","value":"prsCount"}},{"kind":"Field","name":{"kind":"Name","value":"mergedPrsCount"}},{"kind":"Field","name":{"kind":"Name","value":"linesAdded"}},{"kind":"Field","name":{"kind":"Name","value":"linesRemoved"}},{"kind":"Field","name":{"kind":"Name","value":"repository"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"RepositoryFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"RepositoryLanguageFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"LanguageEntity"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"size"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"RepositoryFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Repository"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"pushedAt"}},{"kind":"Field","name":{"kind":"Name","value":"releasesCount"}},{"kind":"Field","name":{"kind":"Name","value":"stargazerCount"}},{"kind":"Field","name":{"kind":"Name","value":"isArchived"}},{"kind":"Field","name":{"kind":"Name","value":"forkCount"}},{"kind":"Field","name":{"kind":"Name","value":"languages"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"RepositoryLanguageFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"rank"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"s"}}]}}]}}]} as unknown as DocumentNode<ContributionFieldsFragment, unknown>;
export const UserBaseFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserBaseFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"githubId"}},{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"location"}},{"kind":"Field","name":{"kind":"Name","value":"country"}},{"kind":"Field","name":{"kind":"Name","value":"countryFlag"}},{"kind":"Field","name":{"kind":"Name","value":"company"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"f"}},{"kind":"Field","name":{"kind":"Name","value":"followingCount"}},{"kind":"Field","name":{"kind":"Name","value":"githubCreatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"githubFetchedAt"}},{"kind":"Field","name":{"kind":"Name","value":"websiteUrl"}},{"kind":"Field","name":{"kind":"Name","value":"socialAccounts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalCount"}},{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"provider"}},{"kind":"Field","name":{"kind":"Name","value":"url"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"organizations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]} as unknown as DocumentNode<UserBaseFieldsFragment, unknown>;
export const TierFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"TierFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Tier"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tier"}},{"kind":"Field","name":{"kind":"Name","value":"level"}},{"kind":"Field","name":{"kind":"Name","value":"minRank"}},{"kind":"Field","name":{"kind":"Name","value":"maxRank"}},{"kind":"Field","name":{"kind":"Name","value":"minValue"}}]}}]} as unknown as DocumentNode<TierFieldsFragment, unknown>;
export const UserTiersCountryFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserTiersCountry"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tiersCountry"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sUsers"}},{"kind":"Field","name":{"kind":"Name","value":"cUsers"}},{"kind":"Field","name":{"kind":"Name","value":"fUsers"}},{"kind":"Field","name":{"kind":"Name","value":"sTiers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TierFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"fTiers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TierFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"cTiers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TierFields"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"TierFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Tier"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tier"}},{"kind":"Field","name":{"kind":"Name","value":"level"}},{"kind":"Field","name":{"kind":"Name","value":"minRank"}},{"kind":"Field","name":{"kind":"Name","value":"maxRank"}},{"kind":"Field","name":{"kind":"Name","value":"minValue"}}]}}]} as unknown as DocumentNode<UserTiersCountryFragment, unknown>;
export const UserFetchingStatusFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserFetchingStatus"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"fetchingStatus"}},{"kind":"Field","name":{"kind":"Name","value":"fetchingUpdatedAt"}}]}}]} as unknown as DocumentNode<UserFetchingStatusFragment, unknown>;
export const UserTiersGlobalFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserTiersGlobal"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tiersGlobal"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sUsers"}},{"kind":"Field","name":{"kind":"Name","value":"cUsers"}},{"kind":"Field","name":{"kind":"Name","value":"fUsers"}},{"kind":"Field","name":{"kind":"Name","value":"sTiers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TierFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"fTiers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TierFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"cTiers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TierFields"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"TierFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Tier"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tier"}},{"kind":"Field","name":{"kind":"Name","value":"level"}},{"kind":"Field","name":{"kind":"Name","value":"minRank"}},{"kind":"Field","name":{"kind":"Name","value":"maxRank"}},{"kind":"Field","name":{"kind":"Name","value":"minValue"}}]}}]} as unknown as DocumentNode<UserTiersGlobalFragment, unknown>;
export const UserSeoFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserSeo"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"c"}},{"kind":"Field","name":{"kind":"Name","value":"f"}},{"kind":"Field","name":{"kind":"Name","value":"repositoriesCount"}},{"kind":"Field","name":{"kind":"Name","value":"contributedRepoCount"}}]}}]} as unknown as DocumentNode<UserSeoFragment, unknown>;
export const PulseSeriesFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PulseSeriesFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"OrgPulseSeries"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"months"}},{"kind":"Field","name":{"kind":"Name","value":"labels"}},{"kind":"Field","name":{"kind":"Name","value":"snapshot"}},{"kind":"Field","name":{"kind":"Name","value":"added"}},{"kind":"Field","name":{"kind":"Name","value":"deleted"}},{"kind":"Field","name":{"kind":"Name","value":"largestChange"}},{"kind":"Field","name":{"kind":"Name","value":"largestChangeShare"}},{"kind":"Field","name":{"kind":"Name","value":"crossLines"}},{"kind":"Field","name":{"kind":"Name","value":"commits"}},{"kind":"Field","name":{"kind":"Name","value":"pullRequests"}},{"kind":"Field","name":{"kind":"Name","value":"activeLinked"}},{"kind":"Field","name":{"kind":"Name","value":"activeAnonymous"}},{"kind":"Field","name":{"kind":"Name","value":"newContributors"}}]}}]} as unknown as DocumentNode<PulseSeriesFieldsFragment, unknown>;
export const PulseContributorFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PulseContributorFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"OrgPulseContributor"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"githubId"}},{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"hasProfile"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"linesAdded"}},{"kind":"Field","name":{"kind":"Name","value":"linesDeleted"}},{"kind":"Field","name":{"kind":"Name","value":"commits"}},{"kind":"Field","name":{"kind":"Name","value":"pullRequests"}},{"kind":"Field","name":{"kind":"Name","value":"activeMonths"}},{"kind":"Field","name":{"kind":"Name","value":"topLabels"}}]}}]} as unknown as DocumentNode<PulseContributorFieldsFragment, unknown>;
export const PulseContributorPageFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PulseContributorPageFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"OrgPulseContributorPage"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}},{"kind":"Field","name":{"kind":"Name","value":"unlinkedAuthors"}},{"kind":"Field","name":{"kind":"Name","value":"labels"}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PulseContributorFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PulseContributorFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"OrgPulseContributor"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"githubId"}},{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"hasProfile"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"linesAdded"}},{"kind":"Field","name":{"kind":"Name","value":"linesDeleted"}},{"kind":"Field","name":{"kind":"Name","value":"commits"}},{"kind":"Field","name":{"kind":"Name","value":"pullRequests"}},{"kind":"Field","name":{"kind":"Name","value":"activeMonths"}},{"kind":"Field","name":{"kind":"Name","value":"topLabels"}}]}}]} as unknown as DocumentNode<PulseContributorPageFieldsFragment, unknown>;
export const PulseLabelLinesFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PulseLabelLinesFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"OrgPulseLabelLines"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"lines"}},{"kind":"Field","name":{"kind":"Name","value":"share"}}]}}]} as unknown as DocumentNode<PulseLabelLinesFieldsFragment, unknown>;
export const PulseTotalsFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PulseTotalsFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"OrgPulseTotals"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"added"}},{"kind":"Field","name":{"kind":"Name","value":"deleted"}},{"kind":"Field","name":{"kind":"Name","value":"net"}},{"kind":"Field","name":{"kind":"Name","value":"commits"}},{"kind":"Field","name":{"kind":"Name","value":"pullRequests"}},{"kind":"Field","name":{"kind":"Name","value":"activeContributors"}},{"kind":"Field","name":{"kind":"Name","value":"newContributors"}}]}}]} as unknown as DocumentNode<PulseTotalsFieldsFragment, unknown>;
export const PulseCountryFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PulseCountryFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"OrgPulseCountry"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"group"}},{"kind":"Field","name":{"kind":"Name","value":"country"}},{"kind":"Field","name":{"kind":"Name","value":"flag"}},{"kind":"Field","name":{"kind":"Name","value":"contributors"}}]}}]} as unknown as DocumentNode<PulseCountryFieldsFragment, unknown>;
export const RepoRowFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"RepoRowFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Repo"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"githubId"}},{"kind":"Field","name":{"kind":"Name","value":"owner"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"nameWithOwner"}},{"kind":"Field","name":{"kind":"Name","value":"ownerAvatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"language"}},{"kind":"Field","name":{"kind":"Name","value":"stars"}},{"kind":"Field","name":{"kind":"Name","value":"gainedThisMonth"}}]}}]} as unknown as DocumentNode<RepoRowFieldsFragment, unknown>;
export const AvatarByLoginDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AvatarByLogin"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"login"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"user"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"login"},"value":{"kind":"Variable","name":{"kind":"Name","value":"login"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}}]}}]}}]} as unknown as DocumentNode<AvatarByLoginQuery, AvatarByLoginQueryVariables>;
export const BadgeProfileWithRanksDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"BadgeProfileWithRanks"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"login"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"includeRankGlobal"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}},"defaultValue":{"kind":"BooleanValue","value":true}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"includeRankCountry"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}},"defaultValue":{"kind":"BooleanValue","value":true}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"user"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"login"},"value":{"kind":"Variable","name":{"kind":"Name","value":"login"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"githubId"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"country"}},{"kind":"Field","name":{"kind":"Name","value":"f"}},{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"c"}},{"kind":"Field","name":{"kind":"Name","value":"snapshots"}},{"kind":"Field","name":{"kind":"Name","value":"rankGlobal"},"directives":[{"kind":"Directive","name":{"kind":"Name","value":"include"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"if"},"value":{"kind":"Variable","name":{"kind":"Name","value":"includeRankGlobal"}}}]}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"sProvisional"}},{"kind":"Field","name":{"kind":"Name","value":"sM"}},{"kind":"Field","name":{"kind":"Name","value":"c"}},{"kind":"Field","name":{"kind":"Name","value":"cProvisional"}},{"kind":"Field","name":{"kind":"Name","value":"cM"}},{"kind":"Field","name":{"kind":"Name","value":"f"}},{"kind":"Field","name":{"kind":"Name","value":"fProvisional"}},{"kind":"Field","name":{"kind":"Name","value":"fM"}}]}},{"kind":"Field","name":{"kind":"Name","value":"rankCountry"},"directives":[{"kind":"Directive","name":{"kind":"Name","value":"include"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"if"},"value":{"kind":"Variable","name":{"kind":"Name","value":"includeRankCountry"}}}]}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"sProvisional"}},{"kind":"Field","name":{"kind":"Name","value":"sM"}},{"kind":"Field","name":{"kind":"Name","value":"c"}},{"kind":"Field","name":{"kind":"Name","value":"cProvisional"}},{"kind":"Field","name":{"kind":"Name","value":"cM"}},{"kind":"Field","name":{"kind":"Name","value":"f"}},{"kind":"Field","name":{"kind":"Name","value":"fProvisional"}},{"kind":"Field","name":{"kind":"Name","value":"fM"}}]}}]}}]}}]} as unknown as DocumentNode<BadgeProfileWithRanksQuery, BadgeProfileWithRanksQueryVariables>;
export const BadgeRepoDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"BadgeRepo"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"owner"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"name"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"repo"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"owner"},"value":{"kind":"Variable","name":{"kind":"Name","value":"owner"}}},{"kind":"Argument","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"name"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nameWithOwner"}},{"kind":"Field","name":{"kind":"Name","value":"stars"}},{"kind":"Field","name":{"kind":"Name","value":"gainedThisMonth"}},{"kind":"Field","name":{"kind":"Name","value":"history"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"points"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"date"}},{"kind":"Field","name":{"kind":"Name","value":"stars"}}]}},{"kind":"Field","name":{"kind":"Name","value":"current"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"date"}},{"kind":"Field","name":{"kind":"Name","value":"stars"}}]}}]}}]}}]}}]} as unknown as DocumentNode<BadgeRepoQuery, BadgeRepoQueryVariables>;
export const BadgeTiersDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"BadgeTiers"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"tiersName"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"includeSTiers"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}},"defaultValue":{"kind":"BooleanValue","value":true}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"includeCTiers"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}},"defaultValue":{"kind":"BooleanValue","value":true}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"includeFTiers"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}},"defaultValue":{"kind":"BooleanValue","value":true}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"rankTiersByName"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"tiersName"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sUsers"}},{"kind":"Field","name":{"kind":"Name","value":"cUsers"}},{"kind":"Field","name":{"kind":"Name","value":"fUsers"}},{"kind":"Field","name":{"kind":"Name","value":"sTiers"},"directives":[{"kind":"Directive","name":{"kind":"Name","value":"include"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"if"},"value":{"kind":"Variable","name":{"kind":"Name","value":"includeSTiers"}}}]}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tier"}},{"kind":"Field","name":{"kind":"Name","value":"level"}},{"kind":"Field","name":{"kind":"Name","value":"minRank"}},{"kind":"Field","name":{"kind":"Name","value":"maxRank"}},{"kind":"Field","name":{"kind":"Name","value":"minValue"}}]}},{"kind":"Field","name":{"kind":"Name","value":"fTiers"},"directives":[{"kind":"Directive","name":{"kind":"Name","value":"include"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"if"},"value":{"kind":"Variable","name":{"kind":"Name","value":"includeFTiers"}}}]}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tier"}},{"kind":"Field","name":{"kind":"Name","value":"level"}},{"kind":"Field","name":{"kind":"Name","value":"minRank"}},{"kind":"Field","name":{"kind":"Name","value":"maxRank"}},{"kind":"Field","name":{"kind":"Name","value":"minValue"}}]}},{"kind":"Field","name":{"kind":"Name","value":"cTiers"},"directives":[{"kind":"Directive","name":{"kind":"Name","value":"include"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"if"},"value":{"kind":"Variable","name":{"kind":"Name","value":"includeCTiers"}}}]}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tier"}},{"kind":"Field","name":{"kind":"Name","value":"level"}},{"kind":"Field","name":{"kind":"Name","value":"minRank"}},{"kind":"Field","name":{"kind":"Name","value":"maxRank"}},{"kind":"Field","name":{"kind":"Name","value":"minValue"}}]}}]}}]}}]} as unknown as DocumentNode<BadgeTiersQuery, BadgeTiersQueryVariables>;
export const CountryLanguageFactsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"CountryLanguageFacts"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"country"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"order"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"LanguageSummaryOrder"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}},"defaultValue":{"kind":"IntValue","value":"24"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"countryLanguageSummary"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"order"},"value":{"kind":"Variable","name":{"kind":"Name","value":"order"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"country"},"value":{"kind":"Variable","name":{"kind":"Name","value":"country"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"language"}},{"kind":"Field","name":{"kind":"Name","value":"date"}},{"kind":"Field","name":{"kind":"Name","value":"usersCount"}}]}}]}}]} as unknown as DocumentNode<CountryLanguageFactsQuery, CountryLanguageFactsQueryVariables>;
export const CountryLanguageRankingDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"CountryLanguageRanking"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"language"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"country"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"countryLanguageRankings"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"language"},"value":{"kind":"Variable","name":{"kind":"Name","value":"language"}}},{"kind":"Argument","name":{"kind":"Name","value":"country"},"value":{"kind":"Variable","name":{"kind":"Name","value":"country"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"githubId"}},{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"sM"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"s"},"name":{"kind":"Name","value":"languageScore"}},{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"location"}},{"kind":"Field","name":{"kind":"Name","value":"country"}}]}}]}}]}}]} as unknown as DocumentNode<CountryLanguageRankingQuery, CountryLanguageRankingQueryVariables>;
export const CountryLanguageSummaryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"CountryLanguageSummary"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"country"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"order"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"LanguageSummaryOrder"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}},"defaultValue":{"kind":"IntValue","value":"0"}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}},"defaultValue":{"kind":"IntValue","value":"24"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"countryLanguageSummary"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"order"},"value":{"kind":"Variable","name":{"kind":"Name","value":"order"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}},{"kind":"Argument","name":{"kind":"Name","value":"country"},"value":{"kind":"Variable","name":{"kind":"Name","value":"country"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"language"}},{"kind":"Field","name":{"kind":"Name","value":"country"}},{"kind":"Field","name":{"kind":"Name","value":"date"}},{"kind":"Field","name":{"kind":"Name","value":"usersCount"}},{"kind":"Field","name":{"kind":"Name","value":"score"}},{"kind":"Field","name":{"kind":"Name","value":"size"}},{"kind":"Field","name":{"kind":"Name","value":"topUser"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"country"}}]}},{"kind":"Field","name":{"kind":"Name","value":"languageData"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"color"}}]}}]}}]}}]} as unknown as DocumentNode<CountryLanguageSummaryQuery, CountryLanguageSummaryQueryVariables>;
export const CountryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Country"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"country"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"flag"}}]}}]}}]} as unknown as DocumentNode<CountryQuery, CountryQueryVariables>;
export const CountryRankingsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"CountryRankings"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"order"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"RankOrder"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"country"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"countryRankings"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"order"},"value":{"kind":"Variable","name":{"kind":"Name","value":"order"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}},{"kind":"Argument","name":{"kind":"Name","value":"country"},"value":{"kind":"Variable","name":{"kind":"Name","value":"country"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"githubId"}},{"kind":"Field","name":{"kind":"Name","value":"c"}},{"kind":"Field","name":{"kind":"Name","value":"cM"}},{"kind":"Field","name":{"kind":"Name","value":"f"}},{"kind":"Field","name":{"kind":"Name","value":"fM"}},{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"sM"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"location"}},{"kind":"Field","name":{"kind":"Name","value":"country"}},{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"c"}},{"kind":"Field","name":{"kind":"Name","value":"f"}}]}}]}}]}}]} as unknown as DocumentNode<CountryRankingsQuery, CountryRankingsQueryVariables>;
export const CountrySummaryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"CountrySummary"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"order"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"CountrySummaryOrder"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"countrySummary"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"order"},"value":{"kind":"Variable","name":{"kind":"Name","value":"order"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"country"}},{"kind":"Field","name":{"kind":"Name","value":"usersCount"}},{"kind":"Field","name":{"kind":"Name","value":"date"}},{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"c"}},{"kind":"Field","name":{"kind":"Name","value":"f"}},{"kind":"Field","name":{"kind":"Name","value":"topUsers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"s"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}}]}},{"kind":"Field","name":{"kind":"Name","value":"c"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}}]}},{"kind":"Field","name":{"kind":"Name","value":"f"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"countryData"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"code"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"flag"}}]}}]}}]}}]} as unknown as DocumentNode<CountrySummaryQuery, CountrySummaryQueryVariables>;
export const GlobalRankByLoginDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GlobalRankByLogin"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"login"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"globalRankByLogin"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"login"},"value":{"kind":"Variable","name":{"kind":"Name","value":"login"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"githubId"}},{"kind":"Field","name":{"kind":"Name","value":"c"}},{"kind":"Field","name":{"kind":"Name","value":"cM"}},{"kind":"Field","name":{"kind":"Name","value":"f"}},{"kind":"Field","name":{"kind":"Name","value":"fM"}},{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"sM"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"c"}},{"kind":"Field","name":{"kind":"Name","value":"f"}},{"kind":"Field","name":{"kind":"Name","value":"location"}}]}}]}}]}}]} as unknown as DocumentNode<GlobalRankByLoginQuery, GlobalRankByLoginQueryVariables>;
export const GlobalRankingsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GlobalRankings"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"order"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"RankOrder"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"globalRankings"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"order"},"value":{"kind":"Variable","name":{"kind":"Name","value":"order"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"githubId"}},{"kind":"Field","name":{"kind":"Name","value":"c"}},{"kind":"Field","name":{"kind":"Name","value":"cM"}},{"kind":"Field","name":{"kind":"Name","value":"f"}},{"kind":"Field","name":{"kind":"Name","value":"fM"}},{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"sM"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"location"}},{"kind":"Field","name":{"kind":"Name","value":"country"}},{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"c"}},{"kind":"Field","name":{"kind":"Name","value":"f"}}]}}]}}]}}]} as unknown as DocumentNode<GlobalRankingsQuery, GlobalRankingsQueryVariables>;
export const InsightsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Insights"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"skip"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"insights"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"skip"},"value":{"kind":"Variable","name":{"kind":"Name","value":"skip"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"segments"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"text"}},{"kind":"Field","name":{"kind":"Name","value":"entityKey"}},{"kind":"Field","name":{"kind":"Name","value":"display"}}]}},{"kind":"Field","name":{"kind":"Name","value":"entities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"mentions"}},{"kind":"Field","name":{"kind":"Name","value":"links"}}]}},{"kind":"Field","name":{"kind":"Name","value":"replies"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"segments"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"text"}},{"kind":"Field","name":{"kind":"Name","value":"entityKey"}},{"kind":"Field","name":{"kind":"Name","value":"display"}}]}},{"kind":"Field","name":{"kind":"Name","value":"entities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"mentions"}},{"kind":"Field","name":{"kind":"Name","value":"links"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"socialPosts"}}]}},{"kind":"Field","name":{"kind":"Name","value":"socialPosts"}}]}}]}}]} as unknown as DocumentNode<InsightsQuery, InsightsQueryVariables>;
export const InsightDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Insight"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"insight"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"segments"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"text"}},{"kind":"Field","name":{"kind":"Name","value":"entityKey"}},{"kind":"Field","name":{"kind":"Name","value":"display"}}]}},{"kind":"Field","name":{"kind":"Name","value":"entities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"mentions"}},{"kind":"Field","name":{"kind":"Name","value":"links"}}]}},{"kind":"Field","name":{"kind":"Name","value":"replies"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"segments"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"text"}},{"kind":"Field","name":{"kind":"Name","value":"entityKey"}},{"kind":"Field","name":{"kind":"Name","value":"display"}}]}},{"kind":"Field","name":{"kind":"Name","value":"entities"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"mentions"}},{"kind":"Field","name":{"kind":"Name","value":"links"}}]}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"socialPosts"}}]}},{"kind":"Field","name":{"kind":"Name","value":"socialPosts"}}]}}]}}]} as unknown as DocumentNode<InsightQuery, InsightQueryVariables>;
export const LanguageFactsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"LanguageFacts"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"order"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"LanguageSummaryOrder"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}},"defaultValue":{"kind":"IntValue","value":"24"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"languageSummary"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"order"},"value":{"kind":"Variable","name":{"kind":"Name","value":"order"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"language"}},{"kind":"Field","name":{"kind":"Name","value":"date"}},{"kind":"Field","name":{"kind":"Name","value":"usersCount"}}]}}]}}]} as unknown as DocumentNode<LanguageFactsQuery, LanguageFactsQueryVariables>;
export const LanguageRankingDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"LanguageRanking"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"language"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"languageRankings"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"language"},"value":{"kind":"Variable","name":{"kind":"Name","value":"language"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"githubId"}},{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"sM"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","alias":{"kind":"Name","value":"s"},"name":{"kind":"Name","value":"languageScore"}},{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"location"}},{"kind":"Field","name":{"kind":"Name","value":"country"}}]}}]}}]}}]} as unknown as DocumentNode<LanguageRankingQuery, LanguageRankingQueryVariables>;
export const LanguageSummaryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"LanguageSummary"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"order"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"LanguageSummaryOrder"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}},"defaultValue":{"kind":"IntValue","value":"0"}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}},"defaultValue":{"kind":"IntValue","value":"24"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"languageSummary"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"order"},"value":{"kind":"Variable","name":{"kind":"Name","value":"order"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"language"}},{"kind":"Field","name":{"kind":"Name","value":"date"}},{"kind":"Field","name":{"kind":"Name","value":"usersCount"}},{"kind":"Field","name":{"kind":"Name","value":"score"}},{"kind":"Field","name":{"kind":"Name","value":"size"}},{"kind":"Field","name":{"kind":"Name","value":"topUser"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"country"}}]}},{"kind":"Field","name":{"kind":"Name","value":"languageData"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"color"}}]}}]}}]}}]} as unknown as DocumentNode<LanguageSummaryQuery, LanguageSummaryQueryVariables>;
export const OrgIdByLoginDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"OrgIdByLogin"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"login"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"organization"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"login"},"value":{"kind":"Variable","name":{"kind":"Name","value":"login"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"githubId"}}]}}]}}]} as unknown as DocumentNode<OrgIdByLoginQuery, OrgIdByLoginQueryVariables>;
export const OrgPulseContributorsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"OrgPulseContributors"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"login"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"period"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"OrgPulsePeriod"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"sortBy"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"OrgPulseContributorSort"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"label"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"first"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"organization"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"login"},"value":{"kind":"Variable","name":{"kind":"Name","value":"login"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"pulseContributors"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"period"},"value":{"kind":"Variable","name":{"kind":"Name","value":"period"}}},{"kind":"Argument","name":{"kind":"Name","value":"sortBy"},"value":{"kind":"Variable","name":{"kind":"Name","value":"sortBy"}}},{"kind":"Argument","name":{"kind":"Name","value":"label"},"value":{"kind":"Variable","name":{"kind":"Name","value":"label"}}},{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"Variable","name":{"kind":"Name","value":"first"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PulseContributorPageFields"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PulseContributorFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"OrgPulseContributor"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"githubId"}},{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"hasProfile"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"linesAdded"}},{"kind":"Field","name":{"kind":"Name","value":"linesDeleted"}},{"kind":"Field","name":{"kind":"Name","value":"commits"}},{"kind":"Field","name":{"kind":"Name","value":"pullRequests"}},{"kind":"Field","name":{"kind":"Name","value":"activeMonths"}},{"kind":"Field","name":{"kind":"Name","value":"topLabels"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PulseContributorPageFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"OrgPulseContributorPage"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}},{"kind":"Field","name":{"kind":"Name","value":"unlinkedAuthors"}},{"kind":"Field","name":{"kind":"Name","value":"labels"}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PulseContributorFields"}}]}}]}}]} as unknown as DocumentNode<OrgPulseContributorsQuery, OrgPulseContributorsQueryVariables>;
export const OrgPulseSeriesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"OrgPulseSeries"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"login"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"groupBy"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"OrgActivityGroupBy"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"organization"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"login"},"value":{"kind":"Variable","name":{"kind":"Name","value":"login"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"pulseSeries"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"groupBy"},"value":{"kind":"Variable","name":{"kind":"Name","value":"groupBy"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PulseSeriesFields"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PulseSeriesFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"OrgPulseSeries"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"months"}},{"kind":"Field","name":{"kind":"Name","value":"labels"}},{"kind":"Field","name":{"kind":"Name","value":"snapshot"}},{"kind":"Field","name":{"kind":"Name","value":"added"}},{"kind":"Field","name":{"kind":"Name","value":"deleted"}},{"kind":"Field","name":{"kind":"Name","value":"largestChange"}},{"kind":"Field","name":{"kind":"Name","value":"largestChangeShare"}},{"kind":"Field","name":{"kind":"Name","value":"crossLines"}},{"kind":"Field","name":{"kind":"Name","value":"commits"}},{"kind":"Field","name":{"kind":"Name","value":"pullRequests"}},{"kind":"Field","name":{"kind":"Name","value":"activeLinked"}},{"kind":"Field","name":{"kind":"Name","value":"activeAnonymous"}},{"kind":"Field","name":{"kind":"Name","value":"newContributors"}}]}}]} as unknown as DocumentNode<OrgPulseSeriesQuery, OrgPulseSeriesQueryVariables>;
export const OrgRankingsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"OrgRankings"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"orgRankings"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"githubId"}},{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"sM"}},{"kind":"Field","name":{"kind":"Name","value":"organization"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"location"}},{"kind":"Field","name":{"kind":"Name","value":"country"}},{"kind":"Field","name":{"kind":"Name","value":"isVerified"}},{"kind":"Field","name":{"kind":"Name","value":"s"}}]}}]}}]}}]} as unknown as DocumentNode<OrgRankingsQuery, OrgRankingsQueryVariables>;
export const PageOrgDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"PageOrg"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"login"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"organization"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"login"},"value":{"kind":"Variable","name":{"kind":"Name","value":"login"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"rankOrg"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"sM"}}]}},{"kind":"Field","name":{"kind":"Name","value":"githubId"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"location"}},{"kind":"Field","name":{"kind":"Name","value":"countryFlag"}},{"kind":"Field","name":{"kind":"Name","value":"twitterUsername"}},{"kind":"Field","name":{"kind":"Name","value":"websiteUrl"}},{"kind":"Field","name":{"kind":"Name","value":"isVerified"}},{"kind":"Field","name":{"kind":"Name","value":"githubCreatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"githubUpdatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"reposCount"}},{"kind":"Field","name":{"kind":"Name","value":"usersCount"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"hasActivity"}},{"kind":"Field","name":{"kind":"Name","value":"topRepos"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"RepoRowFields"}},{"kind":"Field","name":{"kind":"Name","value":"rank"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"s"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"pulse"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"lastMonth"}},{"kind":"Field","name":{"kind":"Name","value":"snapshot"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PulseLabelLinesFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"last12"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PulseTotalsFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"topContributors"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PulseContributorFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"unlinkedAuthors12"}},{"kind":"Field","name":{"kind":"Name","value":"countries"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PulseCountryFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"sharedContributorOrgs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"sharedContributors"}},{"kind":"Field","name":{"kind":"Name","value":"share"}},{"kind":"Field","name":{"kind":"Name","value":"organization"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"scopeNote"}},{"kind":"Field","name":{"kind":"Name","value":"computedAt"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"RepoRowFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Repo"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"githubId"}},{"kind":"Field","name":{"kind":"Name","value":"owner"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"nameWithOwner"}},{"kind":"Field","name":{"kind":"Name","value":"ownerAvatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"language"}},{"kind":"Field","name":{"kind":"Name","value":"stars"}},{"kind":"Field","name":{"kind":"Name","value":"gainedThisMonth"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PulseLabelLinesFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"OrgPulseLabelLines"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"lines"}},{"kind":"Field","name":{"kind":"Name","value":"share"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PulseTotalsFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"OrgPulseTotals"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"added"}},{"kind":"Field","name":{"kind":"Name","value":"deleted"}},{"kind":"Field","name":{"kind":"Name","value":"net"}},{"kind":"Field","name":{"kind":"Name","value":"commits"}},{"kind":"Field","name":{"kind":"Name","value":"pullRequests"}},{"kind":"Field","name":{"kind":"Name","value":"activeContributors"}},{"kind":"Field","name":{"kind":"Name","value":"newContributors"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PulseContributorFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"OrgPulseContributor"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"githubId"}},{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"hasProfile"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"linesAdded"}},{"kind":"Field","name":{"kind":"Name","value":"linesDeleted"}},{"kind":"Field","name":{"kind":"Name","value":"commits"}},{"kind":"Field","name":{"kind":"Name","value":"pullRequests"}},{"kind":"Field","name":{"kind":"Name","value":"activeMonths"}},{"kind":"Field","name":{"kind":"Name","value":"topLabels"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PulseCountryFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"OrgPulseCountry"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"group"}},{"kind":"Field","name":{"kind":"Name","value":"country"}},{"kind":"Field","name":{"kind":"Name","value":"flag"}},{"kind":"Field","name":{"kind":"Name","value":"contributors"}}]}}]} as unknown as DocumentNode<PageOrgQuery, PageOrgQueryVariables>;
export const PageProfileLanguagesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"PageProfileLanguages"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"login"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"isGlobalContext"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}},"defaultValue":{"kind":"BooleanValue","value":true}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"user"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"login"},"value":{"kind":"Variable","name":{"kind":"Name","value":"login"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"firstSeenAt"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserBaseFields"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFetchingStatus"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserSeo"}},{"kind":"Field","name":{"kind":"Name","value":"sLangs"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"IntValue","value":"10"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"size"}},{"kind":"Field","name":{"kind":"Name","value":"score"}},{"kind":"Field","name":{"kind":"Name","value":"rankGlobal"},"directives":[{"kind":"Directive","name":{"kind":"Name","value":"include"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"if"},"value":{"kind":"Variable","name":{"kind":"Name","value":"isGlobalContext"}}}]}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"sM"}}]}},{"kind":"Field","name":{"kind":"Name","value":"tiersGlobal"},"directives":[{"kind":"Directive","name":{"kind":"Name","value":"include"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"if"},"value":{"kind":"Variable","name":{"kind":"Name","value":"isGlobalContext"}}}]}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sTiers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TierFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"sUsers"}}]}},{"kind":"Field","name":{"kind":"Name","value":"rankCountry"},"directives":[{"kind":"Directive","name":{"kind":"Name","value":"skip"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"if"},"value":{"kind":"Variable","name":{"kind":"Name","value":"isGlobalContext"}}}]}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"sM"}}]}},{"kind":"Field","name":{"kind":"Name","value":"tiersCountry"},"directives":[{"kind":"Directive","name":{"kind":"Name","value":"skip"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"if"},"value":{"kind":"Variable","name":{"kind":"Name","value":"isGlobalContext"}}}]}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sTiers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TierFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"sUsers"}}]}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserBaseFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"githubId"}},{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"location"}},{"kind":"Field","name":{"kind":"Name","value":"country"}},{"kind":"Field","name":{"kind":"Name","value":"countryFlag"}},{"kind":"Field","name":{"kind":"Name","value":"company"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"f"}},{"kind":"Field","name":{"kind":"Name","value":"followingCount"}},{"kind":"Field","name":{"kind":"Name","value":"githubCreatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"githubFetchedAt"}},{"kind":"Field","name":{"kind":"Name","value":"websiteUrl"}},{"kind":"Field","name":{"kind":"Name","value":"socialAccounts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalCount"}},{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"provider"}},{"kind":"Field","name":{"kind":"Name","value":"url"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"organizations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserFetchingStatus"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"fetchingStatus"}},{"kind":"Field","name":{"kind":"Name","value":"fetchingUpdatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserSeo"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"c"}},{"kind":"Field","name":{"kind":"Name","value":"f"}},{"kind":"Field","name":{"kind":"Name","value":"repositoriesCount"}},{"kind":"Field","name":{"kind":"Name","value":"contributedRepoCount"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"TierFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Tier"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tier"}},{"kind":"Field","name":{"kind":"Name","value":"level"}},{"kind":"Field","name":{"kind":"Name","value":"minRank"}},{"kind":"Field","name":{"kind":"Name","value":"maxRank"}},{"kind":"Field","name":{"kind":"Name","value":"minValue"}}]}}]} as unknown as DocumentNode<PageProfileLanguagesQuery, PageProfileLanguagesQueryVariables>;
export const PageProfileOverviewDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"PageProfileOverview"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"login"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"isGlobalContext"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}},"defaultValue":{"kind":"BooleanValue","value":true}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"user"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"login"},"value":{"kind":"Variable","name":{"kind":"Name","value":"login"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"firstSeenAt"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserBaseFields"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFetchingStatus"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserSeo"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserTiersGlobal"},"directives":[{"kind":"Directive","name":{"kind":"Name","value":"include"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"if"},"value":{"kind":"Variable","name":{"kind":"Name","value":"isGlobalContext"}}}]}]},{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserTiersCountry"},"directives":[{"kind":"Directive","name":{"kind":"Name","value":"skip"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"if"},"value":{"kind":"Variable","name":{"kind":"Name","value":"isGlobalContext"}}}]}]},{"kind":"Field","name":{"kind":"Name","value":"rankGlobal"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"sProvisional"}},{"kind":"Field","name":{"kind":"Name","value":"sM"}},{"kind":"Field","name":{"kind":"Name","value":"c"}},{"kind":"Field","name":{"kind":"Name","value":"cProvisional"}},{"kind":"Field","name":{"kind":"Name","value":"cM"}},{"kind":"Field","name":{"kind":"Name","value":"f"}},{"kind":"Field","name":{"kind":"Name","value":"fProvisional"}},{"kind":"Field","name":{"kind":"Name","value":"fM"}},{"kind":"Field","name":{"kind":"Name","value":"snapshots"}}]}},{"kind":"Field","name":{"kind":"Name","value":"rankCountry"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"sProvisional"}},{"kind":"Field","name":{"kind":"Name","value":"sM"}},{"kind":"Field","name":{"kind":"Name","value":"c"}},{"kind":"Field","name":{"kind":"Name","value":"cProvisional"}},{"kind":"Field","name":{"kind":"Name","value":"cM"}},{"kind":"Field","name":{"kind":"Name","value":"f"}},{"kind":"Field","name":{"kind":"Name","value":"fProvisional"}},{"kind":"Field","name":{"kind":"Name","value":"fM"}},{"kind":"Field","name":{"kind":"Name","value":"snapshots"}}]}},{"kind":"Field","name":{"kind":"Name","value":"sLangs"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"IntValue","value":"4"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"size"}},{"kind":"Field","name":{"kind":"Name","value":"score"}},{"kind":"Field","name":{"kind":"Name","value":"sources"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"stargazerCount"}},{"kind":"Field","name":{"kind":"Name","value":"percentage"}},{"kind":"Field","name":{"kind":"Name","value":"year"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"cLangs"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"IntValue","value":"4"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"size"}},{"kind":"Field","name":{"kind":"Name","value":"sources"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"stargazerCount"}},{"kind":"Field","name":{"kind":"Name","value":"percentage"}},{"kind":"Field","name":{"kind":"Name","value":"year"}},{"kind":"Field","name":{"kind":"Name","value":"linesAdded"}},{"kind":"Field","name":{"kind":"Name","value":"linesRemoved"}},{"kind":"Field","name":{"kind":"Name","value":"prsCount"}},{"kind":"Field","name":{"kind":"Name","value":"url"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"snapshots"}},{"kind":"Field","name":{"kind":"Name","value":"starsReview"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"stars"}},{"kind":"Field","name":{"kind":"Name","value":"repositories"}},{"kind":"Field","name":{"kind":"Name","value":"reportable"}}]}},{"kind":"Field","name":{"kind":"Name","value":"repositories"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"IntValue","value":"5"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"RepositoryFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"contributions"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"IntValue","value":"5"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ContributionFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"timeline"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"IntValue","value":"5"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"changes"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"TierFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Tier"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tier"}},{"kind":"Field","name":{"kind":"Name","value":"level"}},{"kind":"Field","name":{"kind":"Name","value":"minRank"}},{"kind":"Field","name":{"kind":"Name","value":"maxRank"}},{"kind":"Field","name":{"kind":"Name","value":"minValue"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"RepositoryLanguageFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"LanguageEntity"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"size"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"RepositoryFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Repository"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"pushedAt"}},{"kind":"Field","name":{"kind":"Name","value":"releasesCount"}},{"kind":"Field","name":{"kind":"Name","value":"stargazerCount"}},{"kind":"Field","name":{"kind":"Name","value":"isArchived"}},{"kind":"Field","name":{"kind":"Name","value":"forkCount"}},{"kind":"Field","name":{"kind":"Name","value":"languages"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"RepositoryLanguageFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"rank"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"s"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserBaseFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"githubId"}},{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"location"}},{"kind":"Field","name":{"kind":"Name","value":"country"}},{"kind":"Field","name":{"kind":"Name","value":"countryFlag"}},{"kind":"Field","name":{"kind":"Name","value":"company"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"f"}},{"kind":"Field","name":{"kind":"Name","value":"followingCount"}},{"kind":"Field","name":{"kind":"Name","value":"githubCreatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"githubFetchedAt"}},{"kind":"Field","name":{"kind":"Name","value":"websiteUrl"}},{"kind":"Field","name":{"kind":"Name","value":"socialAccounts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalCount"}},{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"provider"}},{"kind":"Field","name":{"kind":"Name","value":"url"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"organizations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserFetchingStatus"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"fetchingStatus"}},{"kind":"Field","name":{"kind":"Name","value":"fetchingUpdatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserSeo"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"c"}},{"kind":"Field","name":{"kind":"Name","value":"f"}},{"kind":"Field","name":{"kind":"Name","value":"repositoriesCount"}},{"kind":"Field","name":{"kind":"Name","value":"contributedRepoCount"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserTiersGlobal"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tiersGlobal"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sUsers"}},{"kind":"Field","name":{"kind":"Name","value":"cUsers"}},{"kind":"Field","name":{"kind":"Name","value":"fUsers"}},{"kind":"Field","name":{"kind":"Name","value":"sTiers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TierFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"fTiers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TierFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"cTiers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TierFields"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserTiersCountry"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tiersCountry"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sUsers"}},{"kind":"Field","name":{"kind":"Name","value":"cUsers"}},{"kind":"Field","name":{"kind":"Name","value":"fUsers"}},{"kind":"Field","name":{"kind":"Name","value":"sTiers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TierFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"fTiers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TierFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"cTiers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TierFields"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ContributionFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Contribution"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"year"}},{"kind":"Field","name":{"kind":"Name","value":"prsCount"}},{"kind":"Field","name":{"kind":"Name","value":"mergedPrsCount"}},{"kind":"Field","name":{"kind":"Name","value":"linesAdded"}},{"kind":"Field","name":{"kind":"Name","value":"linesRemoved"}},{"kind":"Field","name":{"kind":"Name","value":"repository"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"RepositoryFields"}}]}}]}}]} as unknown as DocumentNode<PageProfileOverviewQuery, PageProfileOverviewQueryVariables>;
export const PageProfileRanksDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"PageProfileRanks"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"login"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"isGlobalContext"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}},"defaultValue":{"kind":"BooleanValue","value":true}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"user"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"login"},"value":{"kind":"Variable","name":{"kind":"Name","value":"login"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserBaseFields"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFetchingStatus"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserSeo"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserTiersGlobal"},"directives":[{"kind":"Directive","name":{"kind":"Name","value":"include"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"if"},"value":{"kind":"Variable","name":{"kind":"Name","value":"isGlobalContext"}}}]}]},{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserTiersCountry"},"directives":[{"kind":"Directive","name":{"kind":"Name","value":"skip"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"if"},"value":{"kind":"Variable","name":{"kind":"Name","value":"isGlobalContext"}}}]}]},{"kind":"Field","name":{"kind":"Name","value":"rankGlobal"},"directives":[{"kind":"Directive","name":{"kind":"Name","value":"include"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"if"},"value":{"kind":"Variable","name":{"kind":"Name","value":"isGlobalContext"}}}]}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"sProvisional"}},{"kind":"Field","name":{"kind":"Name","value":"sM"}},{"kind":"Field","name":{"kind":"Name","value":"c"}},{"kind":"Field","name":{"kind":"Name","value":"cProvisional"}},{"kind":"Field","name":{"kind":"Name","value":"cM"}},{"kind":"Field","name":{"kind":"Name","value":"f"}},{"kind":"Field","name":{"kind":"Name","value":"fProvisional"}},{"kind":"Field","name":{"kind":"Name","value":"fM"}}]}},{"kind":"Field","name":{"kind":"Name","value":"rankCountry"},"directives":[{"kind":"Directive","name":{"kind":"Name","value":"skip"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"if"},"value":{"kind":"Variable","name":{"kind":"Name","value":"isGlobalContext"}}}]}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"sProvisional"}},{"kind":"Field","name":{"kind":"Name","value":"sM"}},{"kind":"Field","name":{"kind":"Name","value":"c"}},{"kind":"Field","name":{"kind":"Name","value":"cProvisional"}},{"kind":"Field","name":{"kind":"Name","value":"cM"}},{"kind":"Field","name":{"kind":"Name","value":"f"}},{"kind":"Field","name":{"kind":"Name","value":"fProvisional"}},{"kind":"Field","name":{"kind":"Name","value":"fM"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"TierFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Tier"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tier"}},{"kind":"Field","name":{"kind":"Name","value":"level"}},{"kind":"Field","name":{"kind":"Name","value":"minRank"}},{"kind":"Field","name":{"kind":"Name","value":"maxRank"}},{"kind":"Field","name":{"kind":"Name","value":"minValue"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserBaseFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"githubId"}},{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"location"}},{"kind":"Field","name":{"kind":"Name","value":"country"}},{"kind":"Field","name":{"kind":"Name","value":"countryFlag"}},{"kind":"Field","name":{"kind":"Name","value":"company"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"f"}},{"kind":"Field","name":{"kind":"Name","value":"followingCount"}},{"kind":"Field","name":{"kind":"Name","value":"githubCreatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"githubFetchedAt"}},{"kind":"Field","name":{"kind":"Name","value":"websiteUrl"}},{"kind":"Field","name":{"kind":"Name","value":"socialAccounts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalCount"}},{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"provider"}},{"kind":"Field","name":{"kind":"Name","value":"url"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"organizations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserFetchingStatus"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"fetchingStatus"}},{"kind":"Field","name":{"kind":"Name","value":"fetchingUpdatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserSeo"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"c"}},{"kind":"Field","name":{"kind":"Name","value":"f"}},{"kind":"Field","name":{"kind":"Name","value":"repositoriesCount"}},{"kind":"Field","name":{"kind":"Name","value":"contributedRepoCount"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserTiersGlobal"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tiersGlobal"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sUsers"}},{"kind":"Field","name":{"kind":"Name","value":"cUsers"}},{"kind":"Field","name":{"kind":"Name","value":"fUsers"}},{"kind":"Field","name":{"kind":"Name","value":"sTiers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TierFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"fTiers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TierFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"cTiers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TierFields"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserTiersCountry"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"tiersCountry"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sUsers"}},{"kind":"Field","name":{"kind":"Name","value":"cUsers"}},{"kind":"Field","name":{"kind":"Name","value":"fUsers"}},{"kind":"Field","name":{"kind":"Name","value":"sTiers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TierFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"fTiers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TierFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"cTiers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"TierFields"}}]}}]}}]}}]} as unknown as DocumentNode<PageProfileRanksQuery, PageProfileRanksQueryVariables>;
export const PageProfileRepositoriesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"PageProfileRepositories"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"login"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"user"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"login"},"value":{"kind":"Variable","name":{"kind":"Name","value":"login"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserBaseFields"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserFetchingStatus"}},{"kind":"FragmentSpread","name":{"kind":"Name","value":"UserSeo"}},{"kind":"Field","name":{"kind":"Name","value":"repositoriesCount"}},{"kind":"Field","name":{"kind":"Name","value":"repositories"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"IntValue","value":"10"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"RepositoryFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"contributions"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"IntValue","value":"10"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ContributionFields"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"RepositoryLanguageFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"LanguageEntity"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"size"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"RepositoryFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Repository"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"pushedAt"}},{"kind":"Field","name":{"kind":"Name","value":"releasesCount"}},{"kind":"Field","name":{"kind":"Name","value":"stargazerCount"}},{"kind":"Field","name":{"kind":"Name","value":"isArchived"}},{"kind":"Field","name":{"kind":"Name","value":"forkCount"}},{"kind":"Field","name":{"kind":"Name","value":"languages"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"RepositoryLanguageFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"rank"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"s"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserBaseFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"githubId"}},{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"location"}},{"kind":"Field","name":{"kind":"Name","value":"country"}},{"kind":"Field","name":{"kind":"Name","value":"countryFlag"}},{"kind":"Field","name":{"kind":"Name","value":"company"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"f"}},{"kind":"Field","name":{"kind":"Name","value":"followingCount"}},{"kind":"Field","name":{"kind":"Name","value":"githubCreatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"githubFetchedAt"}},{"kind":"Field","name":{"kind":"Name","value":"websiteUrl"}},{"kind":"Field","name":{"kind":"Name","value":"socialAccounts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalCount"}},{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"provider"}},{"kind":"Field","name":{"kind":"Name","value":"url"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"organizations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserFetchingStatus"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"fetchingStatus"}},{"kind":"Field","name":{"kind":"Name","value":"fetchingUpdatedAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UserSeo"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"User"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"c"}},{"kind":"Field","name":{"kind":"Name","value":"f"}},{"kind":"Field","name":{"kind":"Name","value":"repositoriesCount"}},{"kind":"Field","name":{"kind":"Name","value":"contributedRepoCount"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ContributionFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Contribution"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"year"}},{"kind":"Field","name":{"kind":"Name","value":"prsCount"}},{"kind":"Field","name":{"kind":"Name","value":"mergedPrsCount"}},{"kind":"Field","name":{"kind":"Name","value":"linesAdded"}},{"kind":"Field","name":{"kind":"Name","value":"linesRemoved"}},{"kind":"Field","name":{"kind":"Name","value":"repository"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"RepositoryFields"}}]}}]}}]} as unknown as DocumentNode<PageProfileRepositoriesQuery, PageProfileRepositoriesQueryVariables>;
export const PageRepoDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"PageRepo"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"owner"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"name"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"repo"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"owner"},"value":{"kind":"Variable","name":{"kind":"Name","value":"owner"}}},{"kind":"Argument","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"name"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"RepoRowFields"}},{"kind":"Field","name":{"kind":"Name","value":"isArchived"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"renamedTo"}},{"kind":"Field","name":{"kind":"Name","value":"rank"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"language"}},{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"sM"}},{"kind":"Field","name":{"kind":"Name","value":"l"}},{"kind":"Field","name":{"kind":"Name","value":"lM"}}]}},{"kind":"Field","name":{"kind":"Name","value":"burstMonths"}},{"kind":"Field","name":{"kind":"Name","value":"history"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"points"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"date"}},{"kind":"Field","name":{"kind":"Name","value":"stars"}}]}},{"kind":"Field","name":{"kind":"Name","value":"current"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"date"}},{"kind":"Field","name":{"kind":"Name","value":"stars"}}]}},{"kind":"Field","name":{"kind":"Name","value":"complete"}},{"kind":"Field","name":{"kind":"Name","value":"readAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"pull"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"requestedAt"}},{"kind":"Field","name":{"kind":"Name","value":"finishedAt"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"RepoRowFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Repo"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"githubId"}},{"kind":"Field","name":{"kind":"Name","value":"owner"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"nameWithOwner"}},{"kind":"Field","name":{"kind":"Name","value":"ownerAvatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"language"}},{"kind":"Field","name":{"kind":"Name","value":"stars"}},{"kind":"Field","name":{"kind":"Name","value":"gainedThisMonth"}}]}}]} as unknown as DocumentNode<PageRepoQuery, PageRepoQueryVariables>;
export const ProfileContributionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ProfileContributions"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"login"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"user"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"login"},"value":{"kind":"Variable","name":{"kind":"Name","value":"login"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"contributions"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"ContributionFields"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"RepositoryLanguageFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"LanguageEntity"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"size"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"RepositoryFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Repository"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"pushedAt"}},{"kind":"Field","name":{"kind":"Name","value":"releasesCount"}},{"kind":"Field","name":{"kind":"Name","value":"stargazerCount"}},{"kind":"Field","name":{"kind":"Name","value":"isArchived"}},{"kind":"Field","name":{"kind":"Name","value":"forkCount"}},{"kind":"Field","name":{"kind":"Name","value":"languages"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"RepositoryLanguageFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"rank"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"s"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"ContributionFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Contribution"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"year"}},{"kind":"Field","name":{"kind":"Name","value":"prsCount"}},{"kind":"Field","name":{"kind":"Name","value":"mergedPrsCount"}},{"kind":"Field","name":{"kind":"Name","value":"linesAdded"}},{"kind":"Field","name":{"kind":"Name","value":"linesRemoved"}},{"kind":"Field","name":{"kind":"Name","value":"repository"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"RepositoryFields"}}]}}]}}]} as unknown as DocumentNode<ProfileContributionsQuery, ProfileContributionsQueryVariables>;
export const ProfileFetchingStatusDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ProfileFetchingStatus"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"login"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"user"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"login"},"value":{"kind":"Variable","name":{"kind":"Name","value":"login"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"fetchingStatus"}},{"kind":"Field","name":{"kind":"Name","value":"fetchingUpdatedAt"}}]}}]}}]} as unknown as DocumentNode<ProfileFetchingStatusQuery, ProfileFetchingStatusQueryVariables>;
export const ProfileIdByLoginDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ProfileIdByLogin"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"login"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"globalRankByLogin"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"login"},"value":{"kind":"Variable","name":{"kind":"Name","value":"login"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"githubId"}},{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"sProvisional"}},{"kind":"Field","name":{"kind":"Name","value":"c"}},{"kind":"Field","name":{"kind":"Name","value":"cProvisional"}},{"kind":"Field","name":{"kind":"Name","value":"f"}},{"kind":"Field","name":{"kind":"Name","value":"fProvisional"}},{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"c"}},{"kind":"Field","name":{"kind":"Name","value":"f"}},{"kind":"Field","name":{"kind":"Name","value":"country"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"countryRankByLogin"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"login"},"value":{"kind":"Variable","name":{"kind":"Name","value":"login"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"sProvisional"}},{"kind":"Field","name":{"kind":"Name","value":"c"}},{"kind":"Field","name":{"kind":"Name","value":"cProvisional"}},{"kind":"Field","name":{"kind":"Name","value":"f"}},{"kind":"Field","name":{"kind":"Name","value":"fProvisional"}}]}}]}}]} as unknown as DocumentNode<ProfileIdByLoginQuery, ProfileIdByLoginQueryVariables>;
export const ProfileRepositoriesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ProfileRepositories"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"login"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"user"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"login"},"value":{"kind":"Variable","name":{"kind":"Name","value":"login"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"repositoriesCount"}},{"kind":"Field","name":{"kind":"Name","value":"repositories"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}},{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"RepositoryFields"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"RepositoryLanguageFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"LanguageEntity"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"size"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"RepositoryFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Repository"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"pushedAt"}},{"kind":"Field","name":{"kind":"Name","value":"releasesCount"}},{"kind":"Field","name":{"kind":"Name","value":"stargazerCount"}},{"kind":"Field","name":{"kind":"Name","value":"isArchived"}},{"kind":"Field","name":{"kind":"Name","value":"forkCount"}},{"kind":"Field","name":{"kind":"Name","value":"languages"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"RepositoryLanguageFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"rank"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"s"}}]}}]}}]} as unknown as DocumentNode<ProfileRepositoriesQuery, ProfileRepositoriesQueryVariables>;
export const ProfilesForSitemapDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ProfilesForSitemap"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"profilesForSitemap"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"c"}},{"kind":"Field","name":{"kind":"Name","value":"f"}}]}}]}}]} as unknown as DocumentNode<ProfilesForSitemapQuery, ProfilesForSitemapQueryVariables>;
export const RepoLanguagesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"RepoLanguages"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"repoLanguages"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"language"}},{"kind":"Field","name":{"kind":"Name","value":"repos"}},{"kind":"Field","name":{"kind":"Name","value":"stars"}},{"kind":"Field","name":{"kind":"Name","value":"topRepo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"RepoRowFields"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"RepoRowFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Repo"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"githubId"}},{"kind":"Field","name":{"kind":"Name","value":"owner"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"nameWithOwner"}},{"kind":"Field","name":{"kind":"Name","value":"ownerAvatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"language"}},{"kind":"Field","name":{"kind":"Name","value":"stars"}},{"kind":"Field","name":{"kind":"Name","value":"gainedThisMonth"}}]}}]} as unknown as DocumentNode<RepoLanguagesQuery, RepoLanguagesQueryVariables>;
export const RepoSitemapPartsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"RepoSitemapParts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"repoSitemapParts"}}]}}]} as unknown as DocumentNode<RepoSitemapPartsQuery, RepoSitemapPartsQueryVariables>;
export const ReposForSitemapDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ReposForSitemap"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"part"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"reposForSitemap"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"part"},"value":{"kind":"Variable","name":{"kind":"Name","value":"part"}}}]}]}}]} as unknown as DocumentNode<ReposForSitemapQuery, ReposForSitemapQueryVariables>;
export const RepoPulseContributorsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"RepoPulseContributors"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"owner"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"name"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"period"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"OrgPulsePeriod"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"sortBy"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"OrgPulseContributorSort"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"label"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"first"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"repo"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"owner"},"value":{"kind":"Variable","name":{"kind":"Name","value":"owner"}}},{"kind":"Argument","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"name"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"pulseContributors"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"period"},"value":{"kind":"Variable","name":{"kind":"Name","value":"period"}}},{"kind":"Argument","name":{"kind":"Name","value":"sortBy"},"value":{"kind":"Variable","name":{"kind":"Name","value":"sortBy"}}},{"kind":"Argument","name":{"kind":"Name","value":"label"},"value":{"kind":"Variable","name":{"kind":"Name","value":"label"}}},{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"Variable","name":{"kind":"Name","value":"first"}}},{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PulseContributorPageFields"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PulseContributorFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"OrgPulseContributor"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"githubId"}},{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"hasProfile"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"linesAdded"}},{"kind":"Field","name":{"kind":"Name","value":"linesDeleted"}},{"kind":"Field","name":{"kind":"Name","value":"commits"}},{"kind":"Field","name":{"kind":"Name","value":"pullRequests"}},{"kind":"Field","name":{"kind":"Name","value":"activeMonths"}},{"kind":"Field","name":{"kind":"Name","value":"topLabels"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PulseContributorPageFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"OrgPulseContributorPage"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}},{"kind":"Field","name":{"kind":"Name","value":"unlinkedAuthors"}},{"kind":"Field","name":{"kind":"Name","value":"labels"}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PulseContributorFields"}}]}}]}}]} as unknown as DocumentNode<RepoPulseContributorsQuery, RepoPulseContributorsQueryVariables>;
export const RepoPulseFactsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"RepoPulseFacts"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"owner"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"name"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"repo"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"owner"},"value":{"kind":"Variable","name":{"kind":"Name","value":"owner"}}},{"kind":"Argument","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"name"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"pulse"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"lastMonth"}},{"kind":"Field","name":{"kind":"Name","value":"snapshot"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PulseLabelLinesFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"last12"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PulseTotalsFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"topContributors"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PulseContributorFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"unlinkedAuthors12"}},{"kind":"Field","name":{"kind":"Name","value":"countries"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PulseCountryFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"scopeNote"}},{"kind":"Field","name":{"kind":"Name","value":"computedAt"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PulseLabelLinesFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"OrgPulseLabelLines"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"lines"}},{"kind":"Field","name":{"kind":"Name","value":"share"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PulseTotalsFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"OrgPulseTotals"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"added"}},{"kind":"Field","name":{"kind":"Name","value":"deleted"}},{"kind":"Field","name":{"kind":"Name","value":"net"}},{"kind":"Field","name":{"kind":"Name","value":"commits"}},{"kind":"Field","name":{"kind":"Name","value":"pullRequests"}},{"kind":"Field","name":{"kind":"Name","value":"activeContributors"}},{"kind":"Field","name":{"kind":"Name","value":"newContributors"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PulseContributorFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"OrgPulseContributor"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"githubId"}},{"kind":"Field","name":{"kind":"Name","value":"login"}},{"kind":"Field","name":{"kind":"Name","value":"hasProfile"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"linesAdded"}},{"kind":"Field","name":{"kind":"Name","value":"linesDeleted"}},{"kind":"Field","name":{"kind":"Name","value":"commits"}},{"kind":"Field","name":{"kind":"Name","value":"pullRequests"}},{"kind":"Field","name":{"kind":"Name","value":"activeMonths"}},{"kind":"Field","name":{"kind":"Name","value":"topLabels"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PulseCountryFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"OrgPulseCountry"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"group"}},{"kind":"Field","name":{"kind":"Name","value":"country"}},{"kind":"Field","name":{"kind":"Name","value":"flag"}},{"kind":"Field","name":{"kind":"Name","value":"contributors"}}]}}]} as unknown as DocumentNode<RepoPulseFactsQuery, RepoPulseFactsQueryVariables>;
export const RepoPulseSeriesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"RepoPulseSeries"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"owner"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"name"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"groupBy"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"OrgActivityGroupBy"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"repo"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"owner"},"value":{"kind":"Variable","name":{"kind":"Name","value":"owner"}}},{"kind":"Argument","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"name"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"pulseSeries"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"groupBy"},"value":{"kind":"Variable","name":{"kind":"Name","value":"groupBy"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PulseSeriesFields"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PulseSeriesFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"OrgPulseSeries"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"months"}},{"kind":"Field","name":{"kind":"Name","value":"labels"}},{"kind":"Field","name":{"kind":"Name","value":"snapshot"}},{"kind":"Field","name":{"kind":"Name","value":"added"}},{"kind":"Field","name":{"kind":"Name","value":"deleted"}},{"kind":"Field","name":{"kind":"Name","value":"largestChange"}},{"kind":"Field","name":{"kind":"Name","value":"largestChangeShare"}},{"kind":"Field","name":{"kind":"Name","value":"crossLines"}},{"kind":"Field","name":{"kind":"Name","value":"commits"}},{"kind":"Field","name":{"kind":"Name","value":"pullRequests"}},{"kind":"Field","name":{"kind":"Name","value":"activeLinked"}},{"kind":"Field","name":{"kind":"Name","value":"activeAnonymous"}},{"kind":"Field","name":{"kind":"Name","value":"newContributors"}}]}}]} as unknown as DocumentNode<RepoPulseSeriesQuery, RepoPulseSeriesQueryVariables>;
export const RepoRankingsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"RepoRankings"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"offset"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"language"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"noLanguage"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"repoRankings"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"offset"},"value":{"kind":"Variable","name":{"kind":"Name","value":"offset"}}},{"kind":"Argument","name":{"kind":"Name","value":"language"},"value":{"kind":"Variable","name":{"kind":"Name","value":"language"}}},{"kind":"Argument","name":{"kind":"Name","value":"noLanguage"},"value":{"kind":"Variable","name":{"kind":"Name","value":"noLanguage"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"githubId"}},{"kind":"Field","name":{"kind":"Name","value":"s"}},{"kind":"Field","name":{"kind":"Name","value":"sM"}},{"kind":"Field","name":{"kind":"Name","value":"l"}},{"kind":"Field","name":{"kind":"Name","value":"lM"}},{"kind":"Field","name":{"kind":"Name","value":"repo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"RepoRowFields"}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"RepoRowFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Repo"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"githubId"}},{"kind":"Field","name":{"kind":"Name","value":"owner"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"nameWithOwner"}},{"kind":"Field","name":{"kind":"Name","value":"ownerAvatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"language"}},{"kind":"Field","name":{"kind":"Name","value":"stars"}},{"kind":"Field","name":{"kind":"Name","value":"gainedThisMonth"}}]}}]} as unknown as DocumentNode<RepoRankingsQuery, RepoRankingsQueryVariables>;
export const TopLanguagesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"TopLanguages"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"limit"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}},"defaultValue":{"kind":"IntValue","value":"10"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"languageSummary"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"limit"},"value":{"kind":"Variable","name":{"kind":"Name","value":"limit"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"language"}}]}}]}}]} as unknown as DocumentNode<TopLanguagesQuery, TopLanguagesQueryVariables>;