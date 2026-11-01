import type { CountryQuery, GlobalRankingsQuery } from '@/types/generated/graphql';

type Row = GlobalRankingsQuery['globalRankings'][number];
export type RankingKey = 's' | 'c' | 'f';

/** The countries the made-up developers live in, as the country list names them. */
export const countries: NonNullable<CountryQuery['country']> = [
  { name: 'Ukraine', flag: '🇺🇦' },
  { name: 'Germany', flag: '🇩🇪' },
  { name: 'United States', flag: '🇺🇸' },
  { name: 'India', flag: '🇮🇳' },
  { name: 'China', flag: '🇨🇳' },
  { name: 'Japan', flag: '🇯🇵' },
  { name: 'Brazil', flag: '🇧🇷' },
  { name: 'France', flag: '🇫🇷' },
  { name: 'Poland', flag: '🇵🇱' },
  { name: 'Canada', flag: '🇨🇦' },
];

/** Where they say they are, and the country that reads as; a few say nothing. */
const PLACES: [string | null, string | null][] = [
  ['Kyiv, Ukraine', 'Ukraine'],
  ['Berlin', 'Germany'],
  ['San Francisco, CA', 'United States'],
  ['Bengaluru, India', 'India'],
  ['Shanghai', 'China'],
  [null, null],
  ['Tokyo', 'Japan'],
  ['São Paulo, Brazil', 'Brazil'],
  ['Paris', 'France'],
  ['Warsaw, Poland', 'Poland'],
  ['Toronto, ON', 'Canada'],
  ['Remote', null],
];

const NAMES = ['ana', 'bo', 'cy', 'di', 'ed', 'fay', 'gus', 'hal', 'ivy', 'jo', 'kai', 'lu', 'mo', 'ned', 'ola', 'pim'];
const SUFFIXES = ['dev', 'codes', 'labs', 'rs', 'js', 'hq', 'py'];

/** The leader's score in each ranking; the rest fall off from it. */
const TOP: Record<RankingKey, number> = { s: 264_651, c: 98_420, f: 241_300 };

/** The made-up developer at a position: a login, a place, and a score that falls with the position. */
export const developerAt = (position: number, by: RankingKey) => {
  const index = position - 1;
  const [location, country] = PLACES[index % PLACES.length];
  const score = Math.round(TOP[by] / (1 + index * 0.35));
  return {
    login: `${NAMES[index % NAMES.length]}-${SUFFIXES[(index * 3 + 'sfc'.indexOf(by)) % SUFFIXES.length]}${index >= NAMES.length ? Math.floor(index / NAMES.length) : ''}`,
    avatarUrl: `https://avatars.githubusercontent.com/u/${by}${position}?v=4`,
    location,
    country,
    s: by === 's' ? score : Math.round(score / 3),
    c: by === 'c' ? score : Math.round(score / 4),
    f: by === 'f' ? score : Math.round(score / 5),
  };
};

/** How far a position moved since last month: most rows a little, some not at all. */
const previousOf = (position: number) => {
  const shift = [0, 1, -2, 0, 3, -1, 0, 12, -4, 0][position % 10];
  return position === 1 ? 1 : Math.max(1, position + shift);
};

/** A page of a global ranking, as the API returns it. */
export const globalRankings = (by: RankingKey, offset = 0, count = 100): Row[] =>
  Array.from({ length: count }, (_, index) => {
    const position = offset + index + 1;
    const user = developerAt(position, by);
    return { githubId: `U_${by}${position}`, [by]: position, [`${by}M`]: previousOf(position), user } as Row;
  });

/** How many developers each ranking holds worldwide. */
export const rankedCounts = { sUsers: 1_657_241, cUsers: 1_101_747, fUsers: 3_303_658 };

/** The three leading languages by stars, from the October summary. */
export const leadingLanguages = ['TypeScript', 'Python', 'Rust'].map((language) => ({
  language,
  date: '2026-10-01',
  usersCount: 600_000,
}));
