import type { Route } from 'next';

export function getLanguageRankingPath(language: string, country: string, page: number | string = 1) {
  return `/language/${encodeURIComponent(language)}/${encodeURIComponent(country)}/${page}` as Route;
}
