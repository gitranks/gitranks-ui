/**
 * The note after a refresh is shown once the page has reloaded, so it waits in the tab's session storage, one per
 * repository. Storage can be missing or refuse access (private modes, blocked site data): then there is no note.
 */

type StorageOf = () => Storage;

const sessionStorageOf: StorageOf = () => window.sessionStorage;

/** How long a kept note waits for the reload; an older one is from an earlier visit and is dropped. */
export const PULL_NOTE_TTL = 60_000;

const noteKey = (owner: string, name: string) => `repo-pull-note:${owner}/${name}`.toLowerCase();

/** Keeps the note for the page after the reload. */
export function savePullNote(
  owner: string,
  name: string,
  note: string,
  storage: StorageOf = sessionStorageOf,
  now = Date.now(),
) {
  try {
    storage().setItem(noteKey(owner, name), JSON.stringify({ note, savedAt: now }));
  } catch {
    // No storage, no note.
  }
}

const freshNoteOf = (raw: string, now: number) => {
  const { note, savedAt } = (JSON.parse(raw) ?? {}) as { note?: unknown; savedAt?: unknown };
  if (typeof note !== 'string' || !note || typeof savedAt !== 'number') {
    return null;
  }

  const age = now - savedAt;
  return age >= 0 && age <= PULL_NOTE_TTL ? note : null;
};

/** The note kept for this repository lately, once: reading it removes it, and an old or broken one is dropped. */
export function takePullNote(
  owner: string,
  name: string,
  storage: StorageOf = sessionStorageOf,
  now = Date.now(),
): string | null {
  try {
    const store = storage();
    const key = noteKey(owner, name);
    const raw = store.getItem(key);
    if (raw === null) {
      return null;
    }

    store.removeItem(key);
    return freshNoteOf(raw, now);
  } catch {
    return null;
  }
}

export type PullNoteToast = { id: string; duration: number; closeButton: boolean };

/** How the note is shown: one per repository, with no timeout and a close button. */
export const pullNoteToastOf = (owner: string, name: string): PullNoteToast => ({
  id: noteKey(owner, name),
  duration: Infinity,
  closeButton: true,
});

/** Shows the note kept for this repository, if there is one. */
export function showKeptPullNote(
  owner: string,
  name: string,
  show: (note: string, options: PullNoteToast) => void,
  storage: StorageOf = sessionStorageOf,
  now = Date.now(),
) {
  const note = takePullNote(owner, name, storage, now);
  if (note) {
    show(note, pullNoteToastOf(owner, name));
  }
}

/** Reloads the page, keeping the note first when there is one, so the page after the reload can show it. */
export function reloadWithPullNote(
  owner: string,
  name: string,
  note: string | null,
  reload: () => void,
  storage: StorageOf = sessionStorageOf,
  now = Date.now(),
) {
  if (note) {
    savePullNote(owner, name, note, storage, now);
  }
  reload();
}
