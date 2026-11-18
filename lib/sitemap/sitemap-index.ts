import { startOfMonth } from 'date-fns';

import { fetchOrgSitemapParts } from '@/graphql/helpers/fetch-org-sitemap-parts';
import { fetchRepoSitemapParts } from '@/graphql/helpers/fetch-repo-sitemap-parts';
import { apiRegistryOf, DEFAULT_REGISTRY, REGISTRY_IDS, type RegistryId } from '@/lib/packages/registries';
import { fetchPackageSitemapParts, fetchRepoTabSitemapParts } from '@/lib/sitemap/package-sitemap-data';
import { packagesPublicNow } from '@/lib/sitemap/packages-public';
import {
  packageSitemapIdOf,
  SITEMAP_ORG_PARTS_MAX,
  SITEMAP_PACKAGE_PARTS_MAX,
  SITEMAP_REPO_PARTS_MAX,
  SITEMAP_REPO_TAB_PARTS_MAX,
  SITEMAP_SEGMENTS,
  type SitemapSegment,
} from '@/lib/sitemap/sitemap.consts';
import { absoluteSitemapUrl } from '@/lib/sitemap/sitemap-url';
import { RepoSitemapTab } from '@/types/generated/graphql';

export function childSitemapLoc(segment: SitemapSegment): string {
  return absoluteSitemapUrl(`/sitemaps/${segment}/sitemap.xml`);
}

/** The repository sitemap of one part, as `generateSitemaps` names it. */
export function repoSitemapLoc(part: number): string {
  return absoluteSitemapUrl(`/sitemaps/repos/sitemap/${part}.xml`);
}

/** The organization-page sitemap of one part, as `generateSitemaps` names it. */
export function orgSitemapLoc(part: number): string {
  return absoluteSitemapUrl(`/sitemaps/orgs/pages/sitemap/${part}.xml`);
}

/** The package rankings' pages. */
export function packageRankingsSitemapLoc(): string {
  return absoluteSitemapUrl('/sitemaps/packages/rankings/sitemap.xml');
}

/** The package-page sitemap of one part, as `generateSitemaps` names it; a registry's own run of parts. */
export function packageSitemapLoc(part: number, registry: RegistryId = DEFAULT_REGISTRY): string {
  return absoluteSitemapUrl(`/sitemaps/packages/sitemap/${packageSitemapIdOf(registry, part)}.xml`);
}

/** How many package-page parts each registry has: a number is the default registry's alone. */
type PackageParts = number | Readonly<Partial<Record<RegistryId, number>>>;

/** A repository tab's sitemap of one part, as `generateSitemaps` names it. */
export function repoTabSitemapLoc(tab: 'used-by' | 'contributors', part: number): string {
  return absoluteSitemapUrl(`/sitemaps/repo-${tab}/sitemap/${part}.xml`);
}

/** `count` parts, at most `max`: a count that cannot be trusted lists none or the most there can be. */
const partsOf = (count: number, max: number, loc: (part: number) => string) =>
  Array.from({ length: Math.max(0, Math.min(Math.floor(count), max)) }, (_, part) => loc(part));

/**
 * Every child sitemap: the fixed segments, then the first `repoParts` repository parts and the first `orgParts`
 * organization-page parts.
 */
export function listChildSitemapLocs(repoParts = 0, orgParts = 0): string[] {
  return [
    ...SITEMAP_SEGMENTS.map(childSitemapLoc),
    ...partsOf(repoParts, SITEMAP_REPO_PARTS_MAX, repoSitemapLoc),
    ...partsOf(orgParts, SITEMAP_ORG_PARTS_MAX, orgSitemapLoc),
  ];
}

/**
 * The package sitemaps: the package rankings, then each registry's first `packageParts` package-page parts, the first
 * `usedByParts` parts of the repositories' Used by tab and the first `contributorsParts` of their Contributors tab.
 */
export function listPackageSitemapLocs(
  packageParts: PackageParts = 0,
  usedByParts = 0,
  contributorsParts = 0,
): string[] {
  const parts = typeof packageParts === 'number' ? { [DEFAULT_REGISTRY]: packageParts } : packageParts;
  return [
    packageRankingsSitemapLoc(),
    ...REGISTRY_IDS.flatMap((registry) =>
      partsOf(parts[registry] ?? 0, SITEMAP_PACKAGE_PARTS_MAX, (part) => packageSitemapLoc(part, registry)),
    ),
    ...partsOf(usedByParts, SITEMAP_REPO_TAB_PARTS_MAX, (part) => repoTabSitemapLoc('used-by', part)),
    ...partsOf(contributorsParts, SITEMAP_REPO_TAB_PARTS_MAX, (part) => repoTabSitemapLoc('contributors', part)),
  ];
}

/**
 * The package sitemaps once package pages are open to everyone; none before, so the index is then exactly what it was
 * without them (whoever asks: a preview list of viewers lists nothing).
 */
async function packageSitemapLocs(): Promise<string[]> {
  if (!(await packagesPublicNow())) {
    return [];
  }
  const [registryParts, usedByParts, contributorsParts] = await Promise.all([
    Promise.all(REGISTRY_IDS.map((registry) => fetchPackageSitemapParts(apiRegistryOf(registry)))),
    fetchRepoTabSitemapParts(RepoSitemapTab.UsedBy),
    fetchRepoTabSitemapParts(RepoSitemapTab.Contributors),
  ]);
  const packageParts = Object.fromEntries(REGISTRY_IDS.map((registry, i) => [registry, registryParts[i]]));
  return listPackageSitemapLocs(packageParts, usedByParts, contributorsParts);
}

/**
 * `lastmod` must reflect real content change. Stamping request time on every fetch
 * makes crawlers distrust the signal, so anchor it to the month like the child sitemaps.
 */
export function buildSitemapIndexXml(locs: string[], lastModified = startOfMonth(new Date())): string {
  const lastmod = lastModified.toISOString();
  const entries = locs
    .map(
      (loc) => `  <sitemap>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
  </sitemap>`,
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</sitemapindex>
`;
}

export async function sitemapIndexResponse(): Promise<Response> {
  // The locs resolve the base URL and throw on misconfig.
  const [repoParts, orgParts] = await Promise.all([fetchRepoSitemapParts(), fetchOrgSitemapParts()]);
  const locs = [...listChildSitemapLocs(repoParts, orgParts), ...(await packageSitemapLocs())];
  return new Response(buildSitemapIndexXml(locs), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
