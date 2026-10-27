import { RANK_NAME } from '@/badge/badge.consts';

// Must be 7 categories
export const TIER_NAMES = ['Beginner', 'Adept', 'Advanced', 'Expert', 'Master', 'Elite', 'Legend'] as const;
// Repository tiers, the same 7 shares and tier-1…7 colours as developers: Stardust (bottom 50%) to Supernova (top 1%).
export const REPO_TIER_NAMES = ['Stardust', 'Comet', 'Moon', 'Planet', 'Nova', 'Galaxy', 'Supernova'] as const;
// Share of ranked profiles in each tier, Beginner to Legend. Display only.
export const TIER_FRACTIONS = [0.5, 0.25, 0.13, 0.06, 0.03, 0.02, 0.01] as const;
export const TOP_LEVEL_FRACTIONS = [0.5, 0.3, 0.15, 0.04, 0.01] as const;

export const MIN_VALUE = 5;
export const MIN_PROFILES_THRESHOLD = 100;

export const ITEMS_PER_PAGE = 100;

/** A repository is ranked, and shows its ranks and tier, from this many stars (as developers). */
export const REPO_MIN_RANK_STARS = 5;
/** A ranked repository's page is indexed by search engines from this many stars; below, it is a thin page. */
export const REPO_INDEX_MIN_STARS = 100;
/** A repository has a page from this many stars. */
export const REPO_PAGE_MIN_STARS = 5;
/** A repository has code and contributor analytics from this many stars. */
export const REPO_PULSE_MIN_STARS = 1000;
/** The top contributors table's page size; the API holds at most 100 rows a period and sort. */
export const CONTRIBUTORS_PAGE_SIZE = 25;

// The rank update bots.
export const TELEGRAM_BOT_URL = 'https://t.me/gitranksbot';
export const WHATSAPP_BOT_URL = 'https://wa.me/48730654976?text=%2Fmenu';
export const MAX_PAGES = 50;

export const NOT_AVAILABLE = `Tiers are available for rankings with ${MIN_PROFILES_THRESHOLD} or more profiles.`;

export const RANK_DESCRIPTIONS = {
  s: {
    title: RANK_NAME.s,
    descriptionList: `Rank is based on the total number of stars across repositories owned by a user.`,
    descriptionProfile: `Counts stars on repositories owned by the profile. The ranking includes only profiles with ${MIN_VALUE}+ stars in total.`,
    entityName: 'star',
    notRankedMessage: `A profile needs ${MIN_VALUE}+ stars on repositories it owns to be ranked.`,
  },
  c: {
    title: RANK_NAME.c,
    descriptionList: 'Ranks count stars from repos where a developer has merged PRs — excluding their own.',
    descriptionProfile: `Counts stars on repos owned by others with merged PRs from this profile. Listed only if those repos have ${MIN_VALUE}+ stars in total.`,
    entityName: 'star',
    notRankedMessage: `Profiles need ${MIN_VALUE}+ stars in total on others' repos they have merged PRs in to be ranked.`,
  },
  f: {
    title: RANK_NAME.f,
    descriptionList: 'Rank is based on the number of followers the user has on GitHub.',
    descriptionProfile: `Counts users who follow this profile. The ranking includes only profiles that have ${MIN_VALUE}+ followers.`,
    entityName: 'follower',
    notRankedMessage: `A profile needs at least ${MIN_VALUE} followers to be ranked.`,
  },
};

export const LANGUAGE = {
  description:
    'See which programming languages are the most popular worldwide. Browse detailed summaries by stars and code size - and dive into rankings for each language, globally or by country.',
  order: {
    stars:
      "Calculated from repository stars, weighted by each repo's language breakdown. For example, if a repo has 100 stars and is 60% JavaScript, then JavaScript receives 60 stars from that repo. We aggregate this across the public repositories of developers on GitRanks.",
    size: 'The total code size of the language, summed across the public repositories of developers on GitRanks.',
    users: 'How many developers on GitRanks have this language among their top 5.',
  },
};

export const DEFAULT_LANGUAGE_COLOR = '#64748B';
export const ORIGINAL_USER_AGENT_HEADER = 'x-original-user-agent';
