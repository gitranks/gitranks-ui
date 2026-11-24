import jwt from 'jsonwebtoken';
import { revalidateTag } from 'next/cache';
import { type NextRequest, NextResponse } from 'next/server';

import { isLearnTag, learnFixTagOf } from '@/lib/learn/paths';
import { packageCacheTag } from '@/lib/packages/package-paths';
import { ALL_REGISTRY_IDS, isRegistryRow, type RegistryId, registryOf } from '@/lib/packages/registries';
import { isSkillsTag } from '@/lib/skills/paths';
import { UNSUNG_HERO_CACHE_TAG } from '@/lib/unsung-hero/unsung-hero';

/** The one caller allowed to expire cached data: the API, which names itself in its token. */
const ALLOWED_SOURCE = 'gitranks';

/** A repository's or a profile's cache tag, as `getRepoCacheTag` and `profileCacheTag` write them. */
const TAG = /^(repo|profile):[a-z0-9._/-]{1,140}$/;

/** The characters of a package's name in its cache tag, lower case (older npm names hold `~'!()*`). */
const NAME_CHARACTERS = "a-z0-9@/._~'!()*";

/** One registry's tags: its name in URLs, then a name of up to its longest, in the characters above and its `join`. */
function registryTagOf(id: RegistryId) {
  const { path, nameMaxLength } = registryOf(id);
  const join = path.join === ':' ? ':' : '';
  return `${id}\\/[${NAME_CHARACTERS}${join}-]{1,${nameMaxLength}}`;
}

/**
 * A package's cache tag, as `packageCacheTag` writes it: `package:<registry>/<name>`, lower case, for every row of the
 * registry table, the site showing it yet or not, so the API can expire a registry's pages before they are listed
 * (npm: a name of up to 214 characters, `@scope/name` included).
 */
const PACKAGE_TAG = new RegExp(`^package:(?:${ALL_REGISTRY_IDS.map(registryTagOf).join('|')})$`);

/** Tags of one shared read each, named in full. */
const PLAIN_TAGS: ReadonlySet<unknown> = new Set([UNSUNG_HERO_CACHE_TAG]);

const isTag = (tag: unknown) =>
  typeof tag === 'string' &&
  (TAG.test(tag) || PACKAGE_TAG.test(tag) || isLearnTag(tag) || isSkillsTag(tag) || PLAIN_TAGS.has(tag));

const MAX_TAGS = 100;

/** How old a token may be, whatever end date it names; a token with no end date is refused. */
const TOKEN_MAX_AGE = '10m';

const NO_STORE = { 'Cache-Control': 'private, no-store' };

const refuse = (status: number, message: string) => NextResponse.json({ message }, { status, headers: NO_STORE });

/** The claims of a bearer token signed with the secret this site signs its own API calls with; `null` otherwise. */
function verifiedClaims(request: NextRequest): Record<string, unknown> | null {
  const secret = process.env.INTERNAL_JWT_SECRET;
  const token = /^Bearer (\S+)$/.exec(request.headers.get('authorization') ?? '')?.[1];
  if (!secret || !token) {
    return null;
  }

  try {
    const claims = jwt.verify(token, secret, { algorithms: ['HS256'], maxAge: TOKEN_MAX_AGE });
    return typeof claims === 'object' && typeof claims.exp === 'number' ? (claims as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/**
 * The tag a package's or a fix's cached pages carry for a tag as sent: the spelling the site's addresses use (PyPI's
 * `package:pypi/zope-interface` for `package:pypi/zope.interface`; a fix's pull request in lower case), so another
 * spelling still expires them. Any other tag as it is.
 */
function expiredTagOf(tag: string): string {
  const fix = learnFixTagOf(tag);
  if (fix) return fix;
  const match = /^package:([^/]+)\/(.+)$/.exec(tag);
  return match && isRegistryRow(match[1]) ? packageCacheTag(match[1], match[2]) : tag;
}

const isTagList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.length >= 1 && value.length <= MAX_TAGS && value.every(isTag);

/**
 * Expires the cached data of repositories, profiles, packages, Learn's courses, lessons, fixes and project cards, and
 * Skills pages whose data changed, and of the Unsung heroes: `{ tags }`, 1 to `MAX_TAGS` tags of a repository, a
 * profile, a package, a Learn page (`learn:courses`, `learn:course:<slug>`, `learn:lesson:<slug>`, `learn:fixes`,
 * `learn:fix:<owner>/<repo>#<number>`, `learn:entity:repo:<owner>/<name>`, `learn:entity:org:<login>`), a Skills page
 * (`skills:<login>`), or `unsung-hero`. Only a call signed with
 * the internal secret and naming the API as its source is served; a visitor's own refresh goes through
 * `/api/revalidate` instead.
 */
export async function POST(request: NextRequest) {
  const claims = verifiedClaims(request);
  if (!claims) {
    return refuse(401, 'Unauthorized');
  }
  if (claims.source !== ALLOWED_SOURCE) {
    return refuse(403, 'Forbidden');
  }

  const body = await request.json().catch(() => null);
  const tags: unknown = body?.tags;
  if (!isTagList(tags)) {
    return refuse(400, `Expected 1 to ${MAX_TAGS} repository, profile, package, Learn, Skills or Unsung hero tags`);
  }

  // `expire: 0`: the next read gets the new data, never the stale copy served while a fresh one is made.
  const expired = new Set(tags.map(expiredTagOf));
  for (const tag of expired) {
    revalidateTag(tag, { expire: 0 });
  }
  return NextResponse.json({ expired: expired.size }, { headers: NO_STORE });
}
