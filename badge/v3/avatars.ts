/** Avatars are drawn at 32px or less; 64px keeps them sharp in the 2× PNG and small in the SVG. */
export const AVATAR_FETCH_SIZE = 64;
export const AVATAR_TIMEOUT_MS = 2_000;
const AVATAR_HOST = 'https://avatars.githubusercontent.com/';

/** The avatar URL at 64px. */
export function sizedAvatarUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.searchParams.set('s', String(AVATAR_FETCH_SIZE));
    return parsed.toString();
  } catch {
    return url;
  }
}

/**
 * An avatar as a data URI, embedded so the image needs nothing else; `null` when it cannot be fetched in time, and
 * the drawing shows a grey disk instead.
 */
export async function fetchAvatar(url: string | null | undefined): Promise<string | null> {
  // Only GitHub's avatar host: the image server fetches nothing else.
  if (!url?.startsWith(AVATAR_HOST)) {
    return null;
  }
  try {
    const response = await fetch(sizedAvatarUrl(url), { signal: AbortSignal.timeout(AVATAR_TIMEOUT_MS) });
    const type = response.headers.get('content-type') ?? '';
    if (!response.ok || !/^image\/(png|jpeg|gif)/.test(type)) {
      return null;
    }
    const body = Buffer.from(await response.arrayBuffer());
    return `data:${type.split(';')[0]};base64,${body.toString('base64')}`;
  } catch {
    return null;
  }
}

/** Every avatar of a list, in order, fetched together. */
export const fetchAvatars = (urls: (string | null | undefined)[]) => Promise.all(urls.map(fetchAvatar));
