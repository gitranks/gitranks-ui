import { BUILD_ZONE_MINE_PATH } from './paths';
import { isTimeZone } from './zone';
import { setContributeEmailSettings } from '@/lib/workspace/actions';
import { browserTimeZone, rememberSentTimeZone, sentTimeZone } from '@/lib/workspace/email-settings';

/** How long a page of Build waits for the browser's zone to be saved before it reads the person's side anyway. */
export const ZONE_SEND_WAIT_MS = 2_000;

/** The save of the browser's zone in flight, shared by every part of the page that reads the person's side. */
let sending: Promise<void> | null = null;

/**
 * Settles once the browser's time zone is saved, when this browser has not sent it yet (a first visit, or after a
 * move): the same save the zone note makes, started here first so the person's side and the zone are read after it,
 * and the very first page writes its dates in the browser's zone. Settles at once when there is nothing to send, so no
 * request is made then; the note that comes after finds the zone sent and sends nothing. A save that fails or takes
 * longer than `waitMs` does not hold the page: it reads what is stored.
 */
export function zoneSent(waitMs = ZONE_SEND_WAIT_MS): Promise<void> {
  if (!sending) {
    const zone = browserTimeZone();
    if (!zone || zone === sentTimeZone()) return Promise.resolve();
    sending = setContributeEmailSettings({ timeZone: zone })
      .then((result) => {
        if (result.ok || result.error === 'INVALID') rememberSentTimeZone(zone);
      })
      .catch(() => {})
      .finally(() => {
        sending = null;
      });
  }
  const saved = sending;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, waitMs);
  });
  return Promise.race([saved, late]).finally(() => clearTimeout(timer));
}

/**
 * The zone a page of Build writes the person's dates in: the one the API counts their days in, read from its route;
 * the browser's own when that cannot be read (none: the runtime's).
 */
export async function readBuildZone(): Promise<string | undefined> {
  try {
    const res = await fetch(BUILD_ZONE_MINE_PATH, { cache: 'no-store' });
    if (res.ok) {
      const { zone } = (await res.json()) as { zone?: unknown };
      if (isTimeZone(zone)) return zone;
    }
  } catch {
    // Not read: the browser's zone below.
  }
  return browserTimeZone() ?? undefined;
}
