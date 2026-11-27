import { BUILD_ZONE_MINE_PATH } from './paths';
import { isTimeZone } from './zone';
import { browserTimeZone } from '@/lib/workspace/email-settings';

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
