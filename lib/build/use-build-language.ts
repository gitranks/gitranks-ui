'use client';

import { useCallback, useEffect, useState } from 'react';

import { type BuildLanguage, isBuildLanguage } from './types';

/*
 * The language Build's pages show code in, kept in the browser: the one the person picked last, else the language of
 * their build, else the first one the page has. The page renders on the server with the first one, and moves to the
 * kept one once it is up.
 */

/** Where the browser keeps the language picked last. */
export const BUILD_LANGUAGE_KEY = 'gitranks:build-language';

/** The language picked last in this browser; none when nothing was picked, or storage cannot be read. */
export function readBuildLanguage(): BuildLanguage | null {
  try {
    const kept = window.localStorage.getItem(BUILD_LANGUAGE_KEY);
    return isBuildLanguage(kept) ? kept : null;
  } catch {
    return null;
  }
}

/** Keeps a language as the one picked last; a storage that refuses it changes nothing on the page. */
export function keepBuildLanguage(language: BuildLanguage) {
  try {
    window.localStorage.setItem(BUILD_LANGUAGE_KEY, language);
  } catch {
    // Kept for this page only.
  }
}

/** The language to show, of those a page has: the picked one, else the build's, else the first. */
export function shownLanguageOf(
  languages: readonly BuildLanguage[],
  picked: BuildLanguage | null,
  build: BuildLanguage | null,
): BuildLanguage | null {
  if (picked && languages.includes(picked)) return picked;
  if (build && languages.includes(build)) return build;
  return languages[0] ?? null;
}

/**
 * The language a page shows, and the switch that changes it. `build`: the language of the person's build, read in the
 * browser; `start`: a language to start at instead of the kept one (the catalogue's).
 */
export function useBuildLanguage(
  languages: readonly BuildLanguage[],
  build: BuildLanguage | null,
  start: BuildLanguage | null = null,
): { language: BuildLanguage | null; pick: (language: BuildLanguage) => void } {
  const [picked, setPicked] = useState<BuildLanguage | null>(start);
  useEffect(() => {
    if (start) return;
    const kept = readBuildLanguage();
    if (kept) setPicked(kept);
  }, [start]);
  const pick = useCallback((language: BuildLanguage) => {
    setPicked(language);
    keepBuildLanguage(language);
  }, []);
  return { language: shownLanguageOf(languages, picked, build), pick };
}
