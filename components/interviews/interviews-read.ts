/*
 * How the browser reads the signed-in person's side of Interviews: one key of a personal route's JSON answer, never
 * kept, within a wait.
 */

/** The longest the browser waits for each of the person's reads about Interviews; a later answer is not known. */
export const INTERVIEWS_READ_WAIT_MS = 3_000;

/** One key of the JSON answer of one of the person's routes; undefined on any failure. */
export async function readInterviewsKey(path: string, key: string, signal?: AbortSignal): Promise<unknown> {
  try {
    const res = await fetch(path, { cache: 'no-store', ...(signal ? { signal } : {}) });
    if (!res.ok) return undefined;
    return ((await res.json()) as Record<string, unknown> | null)?.[key];
  } catch {
    return undefined;
  }
}

/** `readInterviewsKey` within `waitMs`: later, undefined, and the read stops. */
export async function readInterviewsKeyWithin(
  path: string,
  key: string,
  waitMs = INTERVIEWS_READ_WAIT_MS,
): Promise<unknown> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<undefined>((resolve) => {
    timer = setTimeout(() => {
      controller.abort();
      resolve(undefined);
    }, waitMs);
  });
  try {
    return await Promise.race([readInterviewsKey(path, key, controller.signal), late]);
  } finally {
    clearTimeout(timer);
  }
}
