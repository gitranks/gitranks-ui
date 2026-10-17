import type { PageProfileOverviewQuery } from './generated/graphql';

export type SocialAccountChangeItem = NonNullable<PageProfileOverviewQuery['user']>['socialAccounts'];
export type OrganizationChangeItem = { name?: string; login?: string };

export type ChangeItemType = string | number | boolean | SocialAccountChangeItem | OrganizationChangeItem;

export type ChangeSetItemType = {
  a: ChangeItemType;
  b: ChangeItemType;
  /** "Repo Removed" entries: how many repos and stars in total, when `b` names only the top ones. */
  count?: number;
  stars?: number;
};

export type TimelineItemType = {
  createdAt: string;
  changes: {
    [key: string]: ChangeSetItemType;
  };
};
