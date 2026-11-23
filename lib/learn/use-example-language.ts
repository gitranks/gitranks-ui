'use client';

import { useCallback, useState, useSyncExternalStore } from 'react';

/**
 * The language a topic course's examples show in: the learner's main language when the course has it, else
 * the last one picked on a lesson (kept in this browser), else Python, else the course's first. The server renders
 * the course's first language; the page changes the code in place when the person's differs.
 */
export const EXAMPLE_LANGUAGE_KEY = 'gitranks:learn:language:v1';

const listeners = new Set<() => void>();

function readPicked(): string | null {
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
 * The language to show among the course's, and the way to pick another. The server and the first paint show the
 * course's first language, so the page matches what was served until the browser knows better. A tab picked on
 * the page wins on that page, even over the main language, and is kept for the next pages.
 */
export function useExampleLanguage(
  languages: readonly string[],
  main?: string | null,
): [string | null, (language: string) => void] {
  const picked = useSyncExternalStore(subscribe, readPicked, () => null);
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const [here, setHere] = useState<string | null>(null);
  const language =
    here && languages.includes(here)
      ? here
      : hydrated
        ? exampleLanguageOf(languages, { main, picked })
        : (languages[0] ?? null);
  const pick = useCallback((next: string) => {
    setHere(next);
    pickExampleLanguage(next);
  }, []);
  return [language, pick];
}
