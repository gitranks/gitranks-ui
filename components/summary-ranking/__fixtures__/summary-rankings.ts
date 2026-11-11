import { developerAt } from '@/components/ranking-table/__fixtures__/global-rankings';
import type { CountryLanguageSummaryQuery, CountrySummaryQuery, LanguageSummaryQuery } from '@/types/generated/graphql';

/** The monthly snapshot the fixtures stand for, and the one before it. */
export const SNAPSHOT = '2026-10-01';
export const PREVIOUS_SNAPSHOT = '2026-09-01';

type CountryRow = CountrySummaryQuery['countrySummary'][number];

/** Countries by stars: [name, flag, stars, contribution stars, followers, developers, last month's position]. */
const COUNTRIES: [string, string, number, number, number, number, number][] = [
  ['United States', '🇺🇸', 45_507_227, 9_509_325_949, 17_599_492, 533_998, 1],
  ['China', '🇨🇳', 32_301_436, 2_885_405_475, 6_999_763, 164_974, 2],
  ['Germany', '🇩🇪', 10_399_865, 2_784_274_091, 3_195_459, 134_426, 4],
  ['United Kingdom', '🇬🇧', 9_627_144, 2_097_113_772, 3_294_997, 109_221, 3],
  ['India', '🇮🇳', 6_809_787, 3_015_706_319, 4_635_054, 222_644, 6],
  ['Canada', '🇨🇦', 6_022_188, 1_510_247_761, 2_284_279, 92_408, 7],
  ['France', '🇫🇷', 5_947_089, 1_435_668_657, 1_854_790, 78_810, 5],
  ['Japan', '🇯🇵', 5_175_381, 1_032_262_789, 1_634_790, 43_796, 8],
  ['Netherlands', '🇳🇱', 3_775_539, 928_093_699, 1_146_544, 41_970, 10],
  ['Australia', '🇦🇺', 3_674_930, 852_980_492, 1_091_856, 42_359, 9],
  ['Brazil', '🇧🇷', 3_360_784, 1_020_513_009, 4_224_435, 125_326, 11],
  ['Spain', '🇪🇸', 3_147_635, 659_628_185, 1_215_913, 47_703, 12],
  ['Italy', '🇮🇹', 2_496_712, 460_205_118, 750_544, 31_843, 15],
  ['Poland', '🇵🇱', 2_440_893, 653_290_437, 703_560, 39_924, 14],
  ['Singapore', '🇸🇬', 2_358_412, 296_367_379, 737_345, 15_105, 13],
  ['Sweden', '🇸🇪', 2_265_069, 500_277_913, 668_064, 27_755, 16],
  ['Switzerland', '🇨🇭', 2_140_110, 514_136_910, 755_847, 24_919, 17],
  ['South Korea', '🇰🇷', 2_007_895, 512_449_294, 1_118_824, 38_410, 18],
  ['Taiwan', '🇹🇼', 1_552_215, 283_089_484, 432_805, 13_600, 19],
  ['Turkey', '🇹🇷', 1_345_290, 259_441_909, 1_102_328, 27_268, 21],
  ['Russia', '🇷🇺', 1_256_967, 378_223_115, 564_702, 47_528, 22],
  ['Finland', '🇫🇮', 1_213_827, 231_474_002, 314_533, 13_840, 20],
  ['Hong Kong', '🇭🇰', 1_166_503, 106_529_381, 260_197, 7_081, 24],
  ['Austria', '🇦🇹', 1_135_952, 289_699_128, 355_743, 13_616, 23],
  ['Ukraine', '🇺🇦', 1_097_418, 274_200_913, 355_724, 24_228, 25],
  ['Norway', '🇳🇴', 1_025_060, 233_836_478, 310_531, 14_531, 26],
  ['Israel', '🇮🇱', 966_838, 232_900_029, 171_957, 9_772, 27],
  ['Indonesia', '🇮🇩', 909_689, 263_765_564, 759_410, 29_340, 31],
  ['Belgium', '🇧🇪', 903_827, 269_745_694, 319_981, 14_305, 29],
  ['Denmark', '🇩🇰', 812_841, 237_349_984, 306_634, 13_940, 28],
];

const leaderAt = (position: number, by: 's' | 'c' | 'f') => {
  const { login, avatarUrl } = developerAt(position, by);
  return { login, avatarUrl };
};

/** This month's country summaries by stars, as the API returns them. */
export const countrySummaries: CountryRow[] = COUNTRIES.map(([name, flag, s, c, f, usersCount], i) => ({
  country: name,
  usersCount,
  date: SNAPSHOT,
  s,
  c,
  f,
  topUsers: { s: leaderAt(i + 1, 's'), c: leaderAt(i + 1, 'c'), f: leaderAt(i + 1, 'f') },
  countryData: { code: name.slice(0, 2).toUpperCase(), name, flag },
}));

/** Last month's order by stars. */
export const previousCountries = COUNTRIES.toSorted((a, b) => a[6] - b[6]).map(([country]) => ({ country }));

type RankRow = { language: string; date: string; usersCount: number; score: number; size: number };

/** [language, colour, stars, bytes of code, developers, last month's position]. */
type LanguageFixture = [string, string, number, number, number, number];

const GB = 1024 ** 3;

const WORLD: LanguageFixture[] = [
  ['Python', '#3572A5', 53_224_331, 1_982 * GB, 1_413_418, 1],
  ['JavaScript', '#f1e05a', 36_183_680, 1_348 * GB, 1_599_204, 2],
  ['TypeScript', '#3178c6', 20_832_179, 594 * GB, 644_633, 3],
  ['Java', '#b07219', 14_451_160, 963 * GB, 581_666, 4],
  ['C++', '#f34b7d', 11_892_028, 1_960 * GB, 448_417, 5],
  ['Go', '#00ADD8', 11_566_849, 198 * GB, 145_949, 6],
  ['HTML', '#e34c26', 10_384_409, 3_225 * GB, 1_362_562, 8],
  ['C', '#555555', 10_329_919, 6_440 * GB, 338_477, 7],
  ['Shell', '#89e051', 8_906_581, 55 * GB, 357_839, 9],
  ['C#', '#178600', 7_542_880, 535 * GB, 272_598, 10],
  ['Jupyter Notebook', '#DA5B0B', 7_366_454, 3_067 * GB, 367_423, 11],
  ['Rust', '#dea584', 7_343_333, 152 * GB, 95_459, 12],
  ['Swift', '#F05138', 5_221_937, 35 * GB, 82_020, 13],
  ['CSS', '#663399', 5_064_007, 203 * GB, 1_146_908, 14],
  ['PHP', '#4F5D95', 4_784_669, 440 * GB, 236_671, 15],
  ['Kotlin', '#A97BFF', 3_941_078, 45 * GB, 86_082, 17],
  ['Objective-C', '#438eff', 3_891_276, 62 * GB, 68_956, 16],
  ['Ruby', '#701516', 3_251_396, 59 * GB, 145_512, 18],
  ['Vue', '#41b883', 2_438_677, 24 * GB, 102_860, 19],
  ['Dart', '#00B4AB', 2_095_180, 54 * GB, 79_083, 20],
  ['Lua', '#000080', 1_957_170, 74 * GB, 49_125, 21],
  ['PowerShell', '#012456', 1_188_908, 18 * GB, 43_297, 22],
  ['Vim Script', '#199f4b', 1_119_359, 5 * GB, 14_957, 23],
  ['TeX', '#3D6117', 893_395, 49 * GB, 65_432, 24],
];

const BELGIUM: LanguageFixture[] = [
  ['Python', '#3572A5', 148_359, 4.19 * GB, 2_803, 1],
  ['JavaScript', '#f1e05a', 115_777, 2.88 * GB, 3_373, 2],
  ['Lua', '#000080', 83_259, 0.054 * GB, 159, 3],
  ['PHP', '#4F5D95', 54_459, 2.42 * GB, 1_097, 4],
  ['TypeScript', '#3178c6', 47_725, 0.95 * GB, 1_260, 5],
  ['Shell', '#89e051', 39_844, 0.22 * GB, 1_080, 10],
  ['Go', '#00ADD8', 37_286, 0.37 * GB, 301, 6],
  ['C#', '#178600', 35_156, 0.89 * GB, 776, 7],
  ['Java', '#b07219', 34_199, 3.4 * GB, 1_131, 8],
  ['C++', '#f34b7d', 33_859, 4.74 * GB, 1_004, 9],
  ['Jupyter Notebook', '#DA5B0B', 23_812, 5.55 * GB, 717, 11],
  ['C', '#555555', 17_754, 15.89 * GB, 863, 12],
  ['HTML', '#e34c26', 17_363, 12.27 * GB, 2_855, 13],
  ['CSS', '#663399', 16_106, 0.61 * GB, 2_214, 16],
  ['Rust', '#dea584', 15_014, 0.34 * GB, 299, 14],
  ['Ruby', '#701516', 13_743, 0.14 * GB, 352, 15],
  ['Kotlin', '#A97BFF', 9_016, 0.07 * GB, 150, 18],
  ['Swift', '#F05138', 8_795, 0.05 * GB, 137, 17],
  ['PowerShell', '#012456', 7_723, 0.03 * GB, 163, 19],
  ['Dart', '#00B4AB', 7_191, 0.51 * GB, 109, 20],
];

const ranksOf = (rows: LanguageFixture[]): RankRow[] =>
  rows.map(([language, , score, size, usersCount]) => ({ language, date: SNAPSHOT, usersCount, score, size }));

const previousOf = (rows: LanguageFixture[]): RankRow[] =>
  rows
    .toSorted((a, b) => a[5] - b[5])
    .map(([language, , score, size, usersCount]) => ({ language, date: PREVIOUS_SNAPSHOT, usersCount, score, size }));

const pageRowsOf = (rows: LanguageFixture[], country?: string) =>
  rows.map(([language, color, score, size, usersCount], i) => ({
    language,
    ...(country ? { country } : {}),
    date: SNAPSHOT,
    usersCount,
    score,
    size,
    topUser: { ...leaderAt(i + 1, 's'), country: country ?? null },
    languageData: { color },
  }));

/** Every language worldwide this month and last, by stars. */
export const worldLanguages = ranksOf(WORLD);
export const previousWorldLanguages = previousOf(WORLD);
/** Page 1 of the worldwide ranking, with leaders and colours. */
export const worldLanguagePage = pageRowsOf(WORLD) as LanguageSummaryQuery['languageSummary'];

/** Every language in Belgium this month and last, by stars. */
export const belgiumLanguages = ranksOf(BELGIUM);
export const previousBelgiumLanguages = previousOf(BELGIUM);
/** Page 1 of Belgium's ranking, with leaders and colours. */
export const belgiumLanguagePage = pageRowsOf(
  BELGIUM,
  'Belgium',
) as CountryLanguageSummaryQuery['countryLanguageSummary'];

/** The scope picker's countries. */
export const pickerCountries = COUNTRIES.map(([name, flag]) => ({ name, flag })).toSorted((a, b) =>
  a.name.localeCompare(b.name),
);
