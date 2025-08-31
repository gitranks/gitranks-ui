import { RANK_NAME } from '@/badge/badge.consts';

// Must be 7 categories
export const TIER_NAMES = ['Beginner', 'Adept', 'Advanced', 'Expert', 'Master', 'Elite', 'Legend'] as const;
// duplicated from api
export const TIER_FRACTIONS = [0.5, 0.25, 0.13, 0.06, 0.03, 0.02, 0.01] as const;
export const TOP_LEVEL_FRACTIONS = [0.5, 0.3, 0.15, 0.04, 0.01] as const;

const MIN_VALUE = 5;
const MIN_PROFILES_THRESHOLD = 100;

export const NOT_AVAILABLE = `Tiers are available for rankings with over ${MIN_PROFILES_THRESHOLD} profiles.`;

export const RANK_DESCRIPTIONS = {
  s: {
    title: RANK_NAME.s,
    descriptionList: `Rank is based on the total number of stars across repositories owned by a user.`,
    descriptionProfile: `Counts stars on repositories owned by the profile. The ranking includes only profiles that have at least one repository with ${MIN_VALUE}+ stars.`,
    entityName: 'star',
    notRankedMessage: `A profile must own at least one repository with ${MIN_VALUE}+ stars to be ranked.`,
  },
  c: {
    title: RANK_NAME.c,
    descriptionList: 'Ranks count stars from repos where a developer has merged PRs — excluding their own.',
    descriptionProfile: `Counts stars on repos owned by others with merged PRs from this profile. Listed only if it has contributed to at least one repo with ${MIN_VALUE}+ stars.`,
    entityName: 'star',
    notRankedMessage: `Profiles need a merged PR in a repo with ${MIN_VALUE}+ stars to be ranked.`,
  },
  f: {
    title: RANK_NAME.f,
    descriptionList: 'Rank is based on the number of followers the user has on GitHub.',
    descriptionProfile: `Counts users who follow this profile. The ranking includes only profiles that have ${MIN_VALUE}+ followers.`,
    entityName: 'follower',
    notRankedMessage: `A profile needs at least ${MIN_VALUE} followers to be ranked.`,
  },
};

export const DEFAULT_LANGUAGE_COLOR = '#64748B';

export const LANGUAGE = {
  description:
    'See which programming languages are the most popular worldwide. Browse detailed summaries by stars and code size - and dive into rankings for each language, globally or by country.',
  order: {
    stars:
      "Calculated from repository stars, weighted by each repo's language breakdown. For example, if a repo has 100 stars and is 60% JavaScript, then JavaScript receives 60 stars from that repo. We aggregate this across all public repos with 5+ stars",
    size: 'The total code size of the language, summed across all public repositories with 5+ stars.',
    users:
      'How many users with at least one public repo with 5+ stars have this language in their public repositories.',
  },
};
