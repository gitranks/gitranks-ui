import { revalidateTag } from 'next/cache';
import { type NextRequest, NextResponse } from 'next/server';

import { claimExpiry, readStatus, readUpstream } from './refresh-status';
import type { AuthRequest } from '@/app/api/profile/[login]/route';
import { parseDecodedPackageParams } from '@/app/package/[registry]/[...name]/utils/package-params';
import type {
  PackageRefreshResult,
  PackageRefreshStatus,
} from '@/app/package/[registry]/[...name]/utils/package-refresh.types';
import { auth } from '@/auth';
import { DEPENDENTS_MAX_OFFSET, DEPENDENTS_PAGE_SIZE } from '@/components/dependents/dependents.consts';
import { fetchPackage, fetchPackageDependents, PACKAGE_UNAVAILABLE } from '@/graphql/helpers/fetch-package';
import { accountEmailOf } from '@/lib/account-email';
import { packageMarkdownOf, packageMarkdownPath } from '@/lib/packages/package-markdown';
import { packageCacheTag } from '@/lib/packages/package-paths';
import { packagesPublic, requestMaySeePackages } from '@/lib/packages/packages-gate';
import { signedFetch } from '@/lib/signed-fetch';

// A package's reads and its refresh, for its page in the browser: `/api/packages/npm/<name>/dependents` and
// `/api/packages/npm/<name>/refresh`, `<name>` being `x` or `@scope/x` (no static segment may follow a catch-all, so
// the action is the last segment); and its facts in markdown, `/api/packages/npm/<name>/facts.md`, which the proxy
// answers `/package/npm/<name>/facts.md` with. Only for a visitor who may see package pages; anyone else gets the
// not-found answer.

/** While package pages are not open to everyone, an answer is never kept by a shared cache: it was decided per viewer. */
const PRIVATE = 'private, no-store';
/** Once they are, a page of dependents as the repository's other reads: the browser five minutes, a shared cache an hour. */
const PUBLIC = 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400';

/** A refresh that landed this long ago or less may not be on the cached page yet: its status expires it. */
const LANDED_WINDOW_MS = 10 * 60_000;

const answer = (body: unknown, status: number, cacheControl = PRIVATE) =>
  NextResponse.json(body, { status, headers: { 'Cache-Control': cacheControl } });

const notFound = () => answer({ message: 'Not found' }, 404);

type Action = 'dependents' | 'refresh' | 'facts.md';
const ACTIONS: ReadonlySet<string> = new Set<Action>(['dependents', 'refresh', 'facts.md']);

/** Once package pages are open to everyone, the facts as the page: the browser five minutes, a shared cache an hour. */
const MARKDOWN_PUBLIC = 'public, max-age=300, s-maxage=3600';

/** A markdown answer. Never indexed: the page itself is, and this is its copy for agents. */
const markdown = (body: string, status: number, cacheControl = PRIVATE) =>
  new Response(body, {
    status,
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': cacheControl,
      'X-Content-Type-Options': 'nosniff',
      'X-Robots-Tag': 'noindex',
    },
  });

/**
 * A package's facts in markdown. A name the registry does not have, and one nobody has read yet, answer 404; package
 * data that cannot be read now 503; the registry's own spelling, when it differs, a 308 to its address.
 */
async function facts(req: NextRequest, name: string) {
  const isPublic = await packagesPublic();
  const pkg = await fetchPackage(name);
  if (pkg === PACKAGE_UNAVAILABLE) {
    return markdown('Package data is not available right now. Try again in a few minutes.\n', 503);
  }
  if (!pkg || pkg.state === 'NOT_READ') {
    return markdown(`No npm package ${name} has been read here yet.\n`, 404);
  }
  if (pkg.name !== name) {
    return NextResponse.redirect(new URL(packageMarkdownPath(pkg.name), req.url), {
      status: 308,
      headers: { 'Cache-Control': PRIVATE },
    });
  }
  return markdown(packageMarkdownOf(pkg), 200, isPublic && !pkg.refreshRunning ? MARKDOWN_PUBLIC : PRIVATE);
}

/** The package and the action the path names; `null` for any other path. */
async function targetOf(params: Promise<unknown> | undefined): Promise<{ name: string; action: Action } | null> {
  const { registry, rest } = ((await params) ?? {}) as { registry?: unknown; rest?: unknown };
  if (typeof registry !== 'string' || !Array.isArray(rest) || rest.some((part) => typeof part !== 'string')) {
    return null;
  }
  const action = rest.at(-1) as string | undefined;
  if (!action || !ACTIONS.has(action)) {
    return null;
  }
  // A route handler's params arrive decoded: they are taken as they are.
  const pkg = parseDecodedPackageParams(registry, rest.slice(0, -1));
  return pkg && { name: pkg.name, action: action as Action };
}

/** The query of a read of dependents: `offset` (a multiple of the page size) and `archived=0`; `null` for anything else. */
function dependentsQueryOf(search: URLSearchParams): { offset: number; hideArchived: boolean } | null {
  const offsetParam = search.get('offset') ?? '0';
  if (!/^\d{1,4}$/.test(offsetParam)) return null;
  const offset = Number(offsetParam);
  if (offset > DEPENDENTS_MAX_OFFSET || offset % DEPENDENTS_PAGE_SIZE !== 0) return null;
  const archived = search.get('archived');
  if (archived !== null && archived !== '0') return null;
  return { offset, hideArchived: archived === '0' };
}

/** One page of the package's dependents, for "Show more" and "Hide archived": `{ page }`. */
async function dependents(req: NextRequest, name: string) {
  const isPublic = await packagesPublic();
  const query = dependentsQueryOf(req.nextUrl.searchParams);
  if (!query) {
    return answer({ message: 'Invalid query' }, 400);
  }
  try {
    const page = await fetchPackageDependents(name, query);
    if (page === PACKAGE_UNAVAILABLE) {
      return answer({ message: 'Package data is not available right now' }, 503);
    }
    return page ? answer({ page }, 200, isPublic ? PUBLIC : PRIVATE) : notFound();
  } catch {
    return answer({ message: 'Failed to load the repositories' }, 502);
  }
}

/**
 * The package's refresh as its row has it: `{ running, lastUpdatedAt, dependentsChecked }`. A refresh that landed
 * lately expires the cached page once, so the reload after it shows the new numbers.
 */
async function refreshStatus(name: string) {
  const now = Date.now();
  const read = await readStatus(name, now);
  if (!read.ok) {
    return answer({ message: 'Failed to load the refresh' }, read.status === 404 ? 404 : 502);
  }

  const { running, lastUpdatedAt, dependentsChecked } = read.body;
  const status: PackageRefreshStatus = {
    running: running === true,
    lastUpdatedAt: typeof lastUpdatedAt === 'string' ? lastUpdatedAt : null,
    dependentsChecked: dependentsChecked !== false,
  };
  const landed = status.lastUpdatedAt ? new Date(status.lastUpdatedAt).getTime() : Number.NaN;
  const tag = packageCacheTag(name);
  if (
    status.lastUpdatedAt &&
    !status.running &&
    now - landed <= LANDED_WINDOW_MS &&
    claimExpiry(tag, status.lastUpdatedAt)
  ) {
    revalidateTag(tag, { expire: 0 });
  }
  return answer(status, 200);
}

export async function GET(req: NextRequest, { params }: RouteContext<'/api/packages/[registry]/[...rest]'>) {
  if (!(await requestMaySeePackages(req))) {
    return notFound();
  }
  const target = await targetOf(params);
  if (!target) {
    return notFound();
  }
  switch (target.action) {
    case 'dependents':
      return dependents(req, target.name);
    case 'facts.md':
      return facts(req, target.name);
    default:
      return refreshStatus(target.name);
  }
}

/** "Refresh now" on a package that updates every day, for the signed-in visitor. */
export const POST = auth(async function POST(req: AuthRequest, { params }) {
  if (!(await requestMaySeePackages(req))) {
    return notFound();
  }
  const target = await targetOf(params);
  if (!target || target.action !== 'refresh') {
    return notFound();
  }
  const githubLogin = req.auth?.user.githubLogin;
  if (!githubLogin) {
    return answer({ message: 'Not authenticated' }, 401);
  }

  const accountEmail = accountEmailOf(req.auth?.user.email);
  const init: RequestInit = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ registry: 'npm', name: target.name }),
    cache: 'no-store',
  };
  const read = await readUpstream<PackageRefreshResult>(() =>
    accountEmail
      ? signedFetch('/packages/refresh', init, 'client', githubLogin, accountEmail)
      : signedFetch('/packages/refresh', init, 'client', githubLogin),
  );
  if (!read.ok) {
    return answer({ message: 'The refresh failed' }, read.status);
  }

  // A refresh is under way now, or comes at the next round: a reload shows it instead of the cached page.
  if (read.body.status === 'started' || read.body.status === 'queued') {
    revalidateTag(packageCacheTag(target.name), { expire: 0 });
  }
  return answer(read.body, 200);
});
