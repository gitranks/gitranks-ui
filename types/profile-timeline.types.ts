import { PageProfileOverviewQuery } from './generated/graphql';

export type SocialAccountChangeItem = NonNullable<PageProfileOverviewQuery['user']>['socialAccounts'];
export type OrganizationChangeItem = { name?: string; login?: string };

export type ChangeItemType = string | number | boolean | SocialAccountChangeItem | OrganizationChangeItem;

export type ChangeSetItemType = {
  a: ChangeItemType;
  b: ChangeItemType;
};

export type TimelineItemType = {
  createdAt: string;
  changes: {
    [key: string]: ChangeSetItemType;
  };
};
