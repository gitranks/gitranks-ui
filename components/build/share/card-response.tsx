import 'server-only';

import { BuildShareCard } from './build-cards';
import { BUILD_OPEN_TO_EVERYONE } from '@/lib/build/built-parts';
import {
  BUILD_HOME_CARD_URL,
  type BuildSharedRow,
  buildProjectCardPath,
  buildStepCardPath,
  builtRowFor,
  HOME_CARD,
  personCardOf,
  personCardQueryOf,
  personCardVersionOf,
  projectCardOf,
  projectCardVersionOf,
  stepCardOf,
  stepCardVersionOf,
} from '@/lib/build/share-card';
import type { BuildProjectPage, BuildStepPage } from '@/lib/build/types';
import { drawSocialCard } from '@/lib/social-card/social-card';
import { isGithubLogin } from '@/utils/profile-refresh';

/*
 * The answers of Build's pictures. Each is drawn under exactly its current query (`?v=<version>`, and `?by=<login>&v=`
 * for a person's build): any other query is a 308 to its current address, so no query makes it draw again. A person's
 * build is drawn only from the person's public Skills page, the rows everyone reads; without a Built row for the
 * project there, the address goes to the project's picture. The pages' gate closes them while Build is closed.
 */

/** What draws the PNG: the site's link-preview cards, or a spec's stand-in. */
type Draw = typeof drawSocialCard;

/** No one keeps an answer that is not a picture. */
const NOT_KEPT = { 'Cache-Control': 'private, no-store' } as const;

/**
 * How a picture is kept. Once Build is open to everyone, as Learn's pictures are: five minutes in a browser and ten in
 * a shared cache, and its address changes with what it draws. Until then by no one, as the gate's 404 is, so a shared
 * cache never hands it to a visitor the gate closes it to.
 */
export function buildCardHeadersOf(openToEveryone = BUILD_OPEN_TO_EVERYONE): Record<string, string> {
  return openToEveryone
    ? {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=300',
        'Cloudflare-CDN-Cache-Control': 'max-age=600',
      }
    : { 'Content-Type': 'image/png', ...NOT_KEPT };
}

const plain = (status: number, text: string, headers: Record<string, string> = {}) =>
  new Response(`${text}\n`, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', ...NOT_KEPT, ...headers },
  });

/** The picture could not be drawn now: asked again in a minute. */
const unavailable = () => plain(503, 'The picture could not be drawn. Try again in a minute.', { 'Retry-After': '60' });

/** No live project or step has this address. */
const missing = () => plain(404, 'There is no picture at this address.');

const moved = (location: string) => new Response(null, { status: 308, headers: { Location: location, ...NOT_KEPT } });

/** A picture under exactly `query`, else a 308 to it. */
async function versionedCard(
  path: string,
  query: string,
  search: string,
  draw: () => Promise<Uint8Array<ArrayBuffer>>,
): Promise<Response> {
  if (search !== query) return moved(`${path}${query}`);
  try {
    return new Response(await draw(), { headers: buildCardHeadersOf() });
  } catch (error) {
    console.error('Error drawing a Build card:', error);
    return unavailable();
  }
}

/** Reads a person's public Built rows: null when they have no public page, `failed` when it could not be read. */
type BuiltOf = (login: string) => Promise<{ value: readonly BuildSharedRow[] | null; failed: boolean }>;

/**
 * A project's picture, or with `?by=<login>` the picture of that person's build of it: drawn only when their public
 * Skills page lists the project as built, else the project's own picture.
 */
export async function projectCardResponse(
  search: string,
  by: string | null,
  project: () => Promise<BuildProjectPage | null>,
  builtOf: BuiltOf,
  draw: Draw = drawSocialCard,
): Promise<Response> {
  let page: BuildProjectPage | null;
  try {
    page = await project();
  } catch {
    return unavailable();
  }
  if (!page) return missing();
  const path = buildProjectCardPath(page.slug);
  if (by && isGithubLogin(by)) {
    let read: Awaited<ReturnType<BuiltOf>>;
    try {
      read = await builtOf(by);
    } catch {
      return unavailable();
    }
    // A read that failed is not "never built": the person's picture is asked again later, not swapped.
    if (read.failed) return unavailable();
    const row = builtRowFor(read.value, page.slug);
    if (row) {
      const query = personCardQueryOf(by, personCardVersionOf(page, by, row));
      const words = personCardOf(page, by, row);
      return versionedCard(path, query, search, () => draw(<BuildShareCard words={words} />));
    }
  }
  const words = projectCardOf(page);
  return versionedCard(path, `?v=${projectCardVersionOf(page)}`, search, () => draw(<BuildShareCard words={words} />));
}

/** A step's picture. */
export async function stepCardResponse(
  search: string,
  step: () => Promise<BuildStepPage | null>,
  draw: Draw = drawSocialCard,
): Promise<Response> {
  let page: BuildStepPage | null;
  try {
    page = await step();
  } catch {
    return unavailable();
  }
  if (!page) return missing();
  const words = stepCardOf(page);
  return versionedCard(
    buildStepCardPath(page.project.slug, page.step.slug),
    `?v=${stepCardVersionOf(page)}`,
    search,
    () => draw(<BuildShareCard words={words} />),
  );
}

/** Build home's picture: the same words for everyone. */
export function homeCardResponse(search: string, draw: Draw = drawSocialCard): Promise<Response> {
  const [path, query] = BUILD_HOME_CARD_URL.split('?') as [string, string];
  return versionedCard(path, `?${query}`, search, () => draw(<BuildShareCard words={HOME_CARD} />));
}
