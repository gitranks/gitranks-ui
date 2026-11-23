'use client';

import { useCallback, useSyncExternalStore } from 'react';

/**
 * The language a topic course's examples show in: the learner's main language when the course has it, else
 * the last one picked on a lesson (kept in this browser), else Python, else the course's first. The server renders
 * the rule without the browser's pick; the page changes the code in place when the person's differs.
 */
export const EXAMPLE_LANGUAGE_KEY = 'gitranks:learn:language:v1';

const listeners = new Set<() => void>();

/** The language picked on this page: every example of the page shows it, until the page changes. */
let pagePick: { path: string; language: string } | null = null;

const readPagePick = (): string | null =>
  pagePick && pagePick.path === window.location.pathname ? pagePick.language : null;

/** The language last picked on an example in this browser; none when nothing was, or the browser keeps nothing. */
export function readPicked(): string | null {
  try {
    const value = window.localStorage.getItem(EXAMPLE_LANGUAGE_KEY);
    return value && /^[a-z+#-]{1,20}$/.test(value) ? value : null;
  } catch {
    return null;
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === EXAMPLE_LANGUAGE_KEY) listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

/** The rule, pure: which of the course's languages to show. */
export function exampleLanguageOf(
  languages: readonly string[],
  { main, picked }: { main: string | null | undefined; picked: string | null },
): string | null {
  if (main && languages.includes(main)) return main;
  if (picked && languages.includes(picked)) return picked;
  if (languages.includes('python')) return 'python';
  return languages[0] ?? null;
}

/** Keeps a language picked on a lesson, for every page of this browser. */
export function pickExampleLanguage(language: string): void {
  try {
    window.localStorage.setItem(EXAMPLE_LANGUAGE_KEY, language);
  } catch {
    // A browser that keeps nothing still shows the language picked on this page.
  }
  for (const listener of listeners) listener();
}

/**
 * The language to show among the course's, and the way to pick another. The server and the first paint apply the rule
 * without the browser's pick (the main language, else Python, else the first), so the page matches what was served;
 * the pick kept in this browser applies once it is read. A tab picked on the page wins on that page, in every example
 * of it and even over the main language, and is kept for the next pages.
 */
export function useExampleLanguage(
  languages: readonly string[],
  main?: string | null,
): [string | null, (language: string) => void] {
  const picked = useSyncExternalStore(subscribe, readPicked, () => null);
  const here = useSyncExternalStore(subscribe, readPagePick, () => null);
  const language = here && languages.includes(here) ? here : exampleLanguageOf(languages, { main, picked });
  const pick = useCallback((next: string) => {
    pagePick = { path: window.location.pathname, language: next };
    pickExampleLanguage(next);
  }, []);
  return [language, pick];
}
