/**
 * The note after a refresh is shown once the page has reloaded, so it waits in the tab's session storage, one per
 * repository. Storage can be missing or refuse access (private modes, blocked site data): then there is no note.
 */

type StorageOf = () => Storage;

const sessionStorageOf: StorageOf = () => window.sessionStorage;

const noteKey = (owner: string, name: string) => `repo-pull-note:${owner}/${name}`.toLowerCase();

/** Keeps the note for the page after the reload. */
export function savePullNote(owner: string, name: string, note: string, storage: StorageOf = sessionStorageOf) {
  try {
    storage().setItem(noteKey(owner, name), note);
  } catch {
    // No storage, no note.
  }
}

/** The note kept for this repository, once: reading it removes it. */
export function takePullNote(owner: string, name: string, storage: StorageOf = sessionStorageOf): string | null {
  try {
    const store = storage();
    const key = noteKey(owner, name);
    const note = store.getItem(key);
    if (note !== null) {
      store.removeItem(key);
    }
    return note || null;
  } catch {
    return null;
  }
}
