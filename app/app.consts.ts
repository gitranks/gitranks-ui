// Must be 7 categories
export const TIER_NAMES = ['Beginner', 'Adept', 'Advanced', 'Expert', 'Master', 'Elite', 'Legend'];

const MIN_VALUE = 5;
const MIN_PROFILES_THRESHOLD = 100;

export const NOT_AVAILABLE = `Tiers are available for rankings with over ${MIN_PROFILES_THRESHOLD} profiles.`;

export const RANK_DESCRIPTIONS = {
  s: {
    title: 'Stars rank',
    descriptionList: `Rank is based on the total number of stars across repositories owned by a user.`,
    descriptionProfile: `Counts stars on repositories owned by the profile. The ranking includes only profiles that have at least one repository with ${MIN_VALUE} or more stars.`,
    entityName: 'star',
    notRankedMessage: `A profile must own at least one repository with ${MIN_VALUE}+ stars to be ranked.`,
  },
  c: {
    title: 'Contributor rank',
    descriptionList: 'Ranks count stars from repos where a developer has merged PRs — excluding their own.',
    descriptionProfile: `Counts stars on repos owned by others with merged PRs from this profile. Listed only if it has contributed to at least one repo with ${MIN_VALUE}+ stars.`,
    entityName: 'star',
    notRankedMessage: `To be ranked, you need a merged PR in a repository with ${MIN_VALUE}+ stars.`,
  },
  f: {
    title: 'Followers rank',
    descriptionList: 'Rank is based on the number of followers the user has on GitHub.',
    descriptionProfile: `Counts users who follow this profile. The ranking includes only profiles that have at least ${MIN_VALUE} followers.`,
    entityName: 'follower',
    notRankedMessage: `A profile needs at least ${MIN_VALUE} followers to be ranked.`,
  },
};
