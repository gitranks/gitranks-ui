import type { OrgPulseContributorSort, OrgPulsePeriod } from '@/types/generated/graphql';

/** What the top contributors table is read by. */
export type ContributorsQuery = { period: OrgPulsePeriod; sortBy: OrgPulseContributorSort; label: string | null };
