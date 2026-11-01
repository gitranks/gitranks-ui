import type { RepoRankingsQuery } from '@/types/generated/graphql';

type Row = RepoRankingsQuery['repoRankings'][number];

const row = (
  rank: number,
  rankM: number,
  nameWithOwner: string,
  description: string,
  language: string | null,
  stars: number,
  gainedThisMonth: number,
  starsCheck: NonNullable<Row['repo']>['starsCheck'] = null,
): Row => {
  const [owner, name] = nameWithOwner.split('/');
  return {
    githubId: `R_${owner}_${name}`,
    s: rank,
    sM: rankM,
    l: null,
    lM: null,
    tier: { tier: 5, level: 3 },
    languageTier: null,
    repo: {
      githubId: `R_${owner}_${name}`,
      owner,
      name,
      nameWithOwner,
      ownerAvatarUrl: `https://avatars.githubusercontent.com/${owner}?v=4`,
      description,
      language,
      stars,
      starsCheck,
      gainedThisMonth,
    },
  };
};

/**
 * Page 40 of the repository ranking (#3,901 to #3,912), made-up repositories a few dozen stars apart. `promptdeck`
 * ranks by its honest 6,140 stars: GitHub shows 9,860, 3,720 of them from suspected fake accounts.
 */
export const repoRankingPage: Row[] = [
  row(3_901, 3_884, 'lumen-dev/lumen', 'A static site generator that reads Markdown and Typst.', 'Rust', 6_212, 84),
  row(3_902, 3_910, 'quietpeak/shelf', 'Self-hosted bookmarks with full-text search.', 'Go', 6_204, 61),
  row(3_903, 3_871, 'orbitcraft/telemetry-kit', 'OpenTelemetry helpers for small services.', 'TypeScript', 6_190, 22),
  row(3_904, 3_903, 'mossbyte/pixelate', 'Image dithering in the browser.', 'JavaScript', 6_177, 40),
  row(3_905, 3_940, 'harborlabs/kite', 'A tiny HTTP router for Bun and Node.', 'TypeScript', 6_166, 102),
  row(3_906, 3_906, 'cindervale/promptdeck', 'Prompt templates as cards you can test and share.', 'Python', 6_140, 31, {
    notCounted: 3_720,
    githubStars: 9_860,
  }),
  row(3_907, 3_899, 'fjordsoft/ledger-cli-ui', 'A terminal UI for plain-text accounting.', 'Rust', 6_131, 18),
  row(3_908, 3_921, 'tallgrass/forms', 'Typed forms for React with no runtime.', 'TypeScript', 6_120, 57),
  row(3_909, 3_877, 'bramblehq/nightjar', 'Scheduled jobs for Postgres.', 'Go', 6_118, 9),
  row(3_910, 3_915, 'saltmarsh/geo-tiles', 'Vector tiles from OpenStreetMap extracts.', 'C++', 6_102, 26),
  row(3_911, 3_896, 'emberline/dotfiles-kit', 'Dotfiles with a one-line install.', 'Shell', 6_097, 12),
  row(3_912, 3_930, 'northwind-oss/sqlfmt', 'An opinionated SQL formatter.', 'Python', 6_085, 44),
];
