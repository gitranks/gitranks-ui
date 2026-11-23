import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { packageSearchesOf, parsePackageSearch } from '@/app/badge/builder/[[...login]]/utils/builder-state';
import { rankedPackage } from '@/app/package/[registry]/[...name]/__fixtures__/package';
import { PackageScreen } from '@/app/package/[registry]/[...name]/components/package-screen';
import { buildPackageSEO } from '@/app/package/[registry]/[...name]/seo';
import { parsePackageParams } from '@/app/package/[registry]/[...name]/utils/package-params';
import { buildPackageSummary } from '@/app/package/[registry]/[...name]/utils/package-summary';
import { packageRankingFirstOrder, packageRankingOrdersOf } from '@/app/packages/package-rankings';
import { UsedByScreen } from '@/app/repo/[owner]/[name]/(tabs)/used-by/components/used-by-screen';
import { firstPage, onePackage } from '@/components/dependents/dependents.fixtures';
import type { PackagePage } from '@/graphql/package-page';
import type { RepoPackage } from '@/graphql/repo-packages';
import { packageMarkdownOf } from '@/lib/packages/package-markdown';
import { packageCacheTag } from '@/lib/packages/package-paths';
import {
  canonicalNameOf,
  isNameSegmentCount,
  isPackageName,
  nameOfSegments,
  REGISTRIES,
  type RegistryId,
  registryDownloadsText,
  registryHasDownloads,
  segmentsOfName,
} from '@/lib/packages/registries';
import { REGISTRY_ICONS } from '@/lib/packages/registry-icons';
import { isImpossibleEntityPath } from '@/lib/routing/entity-routes';
import { isInvalidRankingPath } from '@/lib/routing/ranking-routes';
import { packagePath } from '@/utils/package-paths';

// Every row of the table listed, as once NuGet and RubyGems go live too (the site does not list them yet).
vi.mock('@/lib/packages/registries', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/packages/registries')>();
  actual.REGISTRY_IDS.splice(0, actual.REGISTRY_IDS.length, ...actual.ALL_REGISTRY_IDS);
  return actual;
});
vi.mock('@/components/header/header', () => ({ Header: () => null }));
vi.mock('@/components/package-follow/follow-slot', () => ({ FollowSlot: () => null }));
vi.mock('@/app/package/[registry]/[...name]/components/package-updates-button', () => ({
  PackageUpdatesButton: () => null,
}));
vi.mock('@/app/package/[registry]/[...name]/components/package-badge-section', () => ({
  PackageBadgeSection: () => null,
}));
vi.mock('@/app/package/[registry]/[...name]/components/downloads-chart', () => ({ default: () => null }));
vi.mock('next/navigation', () => ({ usePathname: () => '/x', useRouter: () => ({ push: vi.fn() }) }));

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&#x27;', "'")
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' ')
    .trim();

const BATCH: readonly RegistryId[] = ['go', 'crates', 'pub', 'packagist', 'maven'];

describe('the five registries in the table', () => {
  it('each has its label, its API name, its unit, its file, its icon, and examples its own rule takes', () => {
    expect(BATCH.map((id) => [REGISTRIES[id].label, REGISTRIES[id].api, REGISTRIES[id].downloads])).toEqual([
      ['Go', 'GO', null],
      ['crates.io', 'CRATES', 'week'],
      ['pub.dev', 'PUB', 'month'],
      ['Packagist', 'PACKAGIST', 'month'],
      ['Maven Central', 'MAVEN', null],
    ]);
    expect(BATCH.map((id) => REGISTRIES[id].manifest)).toEqual([
      'go.mod',
      'Cargo.toml',
      'pubspec.yaml',
      'composer.json',
      'pom.xml or build.gradle',
    ]);
    for (const id of BATCH) {
      expect(REGISTRY_ICONS[id], id).toBeTypeOf('function');
      for (const example of REGISTRIES[id].examples) expect(isPackageName(id, example), example).toBe(true);
    }
  });

  it("links to each package's page on its registry's site", () => {
    expect(REGISTRIES.go.pageUrl('github.com/gin-gonic/gin')).toBe('https://pkg.go.dev/github.com/gin-gonic/gin');
    expect(REGISTRIES.crates.pageUrl('serde_json')).toBe('https://crates.io/crates/serde_json');
    expect(REGISTRIES.pub.pageUrl('http')).toBe('https://pub.dev/packages/http');
    expect(REGISTRIES.packagist.pageUrl('laravel/framework')).toBe('https://packagist.org/packages/laravel/framework');
    expect(REGISTRIES.maven.pageUrl('org.slf4j:slf4j-api')).toBe(
      'https://central.sonatype.com/artifact/org.slf4j/slf4j-api',
    );
  });
});

describe('Go module paths', () => {
  it("take Go's rule, case kept, any number of segments", () => {
    for (const name of [
      'github.com/gin-gonic/gin',
      'github.com/BurntSushi/toml',
      'golang.org/x/net',
      'go.opentelemetry.io/otel/trace',
      'github.com/jackc/pgx/v5',
      'gopkg.in/yaml.v3',
      'k8s.io/api',
    ]) {
      expect(isPackageName('go', name), name).toBe(true);
    }
    for (const name of [
      'cert',
      'potionDB/shared',
      '../common',
      'GitHub.com/x/y',
      'github.com/x/y/v1',
      'github.com/x/y/v01',
      'example.com/x',
      'corp.internal/x',
      'gopkg.in/yaml',
      'github.com/x/.hidden',
      'github.com/x//y',
      'github.com/x/CON.go',
      'github.com/a b/c',
      `github.com/${'x'.repeat(500)}`,
    ]) {
      expect(isPackageName('go', name), name).toBe(false);
    }
  });

  it('read from any number of segments, joined by `/`, and are never folded', () => {
    expect(nameOfSegments('go', ['github.com', 'jackc', 'pgx', 'v5'])).toBe('github.com/jackc/pgx/v5');
    expect(segmentsOfName('go', 'golang.org/x/net')).toEqual(['golang.org', 'x', 'net']);
    expect(isNameSegmentCount('go', ['a', 'b', 'c', 'd', 'e'])).toBe(true);
    expect(canonicalNameOf('go', 'github.com/BurntSushi/toml')).toBe('github.com/BurntSushi/toml');
    expect(parsePackageParams('go', ['github.com', 'gin-gonic', 'gin'])).toEqual({
      registry: 'go',
      name: 'github.com/gin-gonic/gin',
    });
    expect(packagePath('github.com/gin-gonic/gin', 'go')).toBe('/package/go/github.com/gin-gonic/gin');
    expect(isImpossibleEntityPath('/package/go/github.com/gin-gonic/gin')).toBe(false);
    expect(isImpossibleEntityPath('/package/go/cert')).toBe(true);
  });
});

describe('crates.io names', () => {
  it('take any spelling crates.io takes, and fold to its own: lower case, `_` for `-`', () => {
    for (const name of ['serde', 'serde_json', 'Serde-JSON', 'proc-macro2', 'a', 'x'.repeat(64)]) {
      expect(isPackageName('crates', name), name).toBe(true);
    }
    for (const name of ['', '1abc', '_serde', '-x', 'serde.json', 'a/b', 'x'.repeat(65)]) {
      expect(isPackageName('crates', name), name).toBe(false);
    }
    expect(canonicalNameOf('crates', 'Serde-JSON')).toBe('serde_json');
    expect(canonicalNameOf('crates', 'proc-macro2')).toBe('proc_macro2');
    expect(packageCacheTag('crates', 'Serde-JSON')).toBe('package:crates/serde_json');
    expect(nameOfSegments('crates', ['serde', 'json'])).toBeNull();
  });
});

describe('pub.dev names', () => {
  it('take lower-case Dart identifiers alone, with nothing to fold', () => {
    for (const name of ['http', 'provider', 'flutter_bloc', '_private', 'a1']) {
      expect(isPackageName('pub', name), name).toBe(true);
    }
    for (const name of ['Http', '1http', 'flutter-bloc', 'a.b', '', 'x'.repeat(65)]) {
      expect(isPackageName('pub', name), name).toBe(false);
    }
    expect(canonicalNameOf('pub', 'flutter_bloc')).toBe('flutter_bloc');
  });
});

describe('Packagist names', () => {
  it("take Composer's vendor/package rule in any case, two segments, folded to lower case", () => {
    for (const name of ['laravel/framework', 'Symfony/Console', 'phpunit/php-code-coverage', 'a.b/c--d', 'a_b/c.d']) {
      expect(isPackageName('packagist', name), name).toBe(true);
    }
    for (const name of ['php', 'ext-json', 'laravel', 'a/b/c', '-a/b', 'a/b---c', 'a /b', `a/${'x'.repeat(254)}`]) {
      expect(isPackageName('packagist', name), name).toBe(false);
    }
    expect(canonicalNameOf('packagist', 'Symfony/Console')).toBe('symfony/console');
    expect(nameOfSegments('packagist', ['laravel', 'framework'])).toBe('laravel/framework');
    expect(nameOfSegments('packagist', ['laravel'])).toBeNull();
    expect(packagePath('laravel/framework', 'packagist')).toBe('/package/packagist/laravel/framework');
  });
});

describe('Maven Central names', () => {
  it('take groupId:artifactId, case kept, two segments in the address', () => {
    for (const name of ['org.slf4j:slf4j-api', 'com.google.guava:guava', 'io.Netty:netty-All']) {
      expect(isPackageName('maven', name), name).toBe(true);
    }
    for (const name of ['guava', 'a:b:c', '..:x', 'org.slf4j/slf4j-api', 'a b:c', ':x']) {
      expect(isPackageName('maven', name), name).toBe(false);
    }
    expect(canonicalNameOf('maven', 'io.Netty:netty-All')).toBe('io.Netty:netty-All');
    expect(segmentsOfName('maven', 'org.slf4j:slf4j-api')).toEqual(['org.slf4j', 'slf4j-api']);
    expect(packagePath('org.slf4j:slf4j-api', 'maven')).toBe('/package/maven/org.slf4j/slf4j-api');
  });
});

describe('a pasted page address or requirement, in the badge builder', () => {
  it("reads each registry's page address, the page's own path after the name left out", () => {
    expect(parsePackageSearch('https://pkg.go.dev/github.com/gin-gonic/gin')).toBe('go/github.com/gin-gonic/gin');
    expect(parsePackageSearch('pkg.go.dev/github.com/gin-gonic/gin@v1.9.1#section-readme')).toBe(
      'go/github.com/gin-gonic/gin',
    );
    expect(parsePackageSearch('https://crates.io/crates/Serde-JSON/1.0.0')).toBe('crates/serde_json');
    expect(parsePackageSearch('https://pub.dev/packages/http/versions')).toBe('pub/http');
    expect(parsePackageSearch('https://packagist.org/packages/Laravel/Framework#v11.0.0')).toBe(
      'packagist/laravel/framework',
    );
    expect(parsePackageSearch('https://central.sonatype.com/artifact/org.slf4j/slf4j-api/2.0.9/overview')).toBe(
      'maven/org.slf4j:slf4j-api',
    );
  });

  it('reads the requirements each registry writes, without their version', () => {
    expect(packageSearchesOf('github.com/gin-gonic/gin v1.9.1')).toEqual(['go/github.com/gin-gonic/gin']);
    expect(packageSearchesOf('serde = "1.0"')).toEqual(expect.arrayContaining(['crates/serde']));
    expect(packageSearchesOf('serde = { version = "1", features = ["derive"] }')).toEqual(
      expect.arrayContaining(['crates/serde']),
    );
    // A PyPI pin is no Cargo requirement: `==` is not Cargo's `=`.
    expect(packageSearchesOf('django==5.0')).not.toContain('crates/django');
    expect(parsePackageSearch('crates:tokio = { version = "1" }')).toBe('crates/tokio');
    expect(packageSearchesOf('laravel/framework:^11.0')).toEqual(['packagist/laravel/framework']);
    expect(packageSearchesOf('"symfony/console": "^7.0"')).toEqual(['packagist/symfony/console']);
    expect(packageSearchesOf('org.slf4j:slf4j-api:2.0.9')).toEqual(['maven/org.slf4j:slf4j-api']);
    expect(parsePackageSearch("maven:implementation 'com.google.guava:guava:33.0-jre'")).toBe(
      'maven/com.google.guava:guava',
    );
    expect(parsePackageSearch('pub:http: ^1.2.0')).toBe('pub/http');
    expect(packageSearchesOf('http: ^1.2.0')).toContain('pub/http');
    expect(packageSearchesOf('http: any')).toContain('pub/http');
    // A `:` with a word or `//` straight after it is no pubspec's: an address or another registry's prefix.
    expect(packageSearchesOf('https://example.com/http')).not.toContain('pub/https');
    expect(packageSearchesOf('maven:com.google.guava:guava')).not.toContain('pub/maven');
  });

  it('reads both Gradle forms of a Maven coordinate, never joining the configuration to it', () => {
    expect(parsePackageSearch('maven:implementation("com.google.guava:guava:33.0-jre")')).toBe(
      'maven/com.google.guava:guava',
    );
    expect(parsePackageSearch("maven:implementation 'com.google.guava:guava:33.0-jre'")).toBe(
      'maven/com.google.guava:guava',
    );
    expect(packageSearchesOf('implementation("org.slf4j:slf4j-api:2.0.9")')).toEqual(['maven/org.slf4j:slf4j-api']);
    expect(packageSearchesOf("testImplementation('org.slf4j:slf4j-api:2.0.9')")).toEqual(['maven/org.slf4j:slf4j-api']);
  });

  it('takes a registry prefix with spaces around its colon', () => {
    expect(parsePackageSearch('npm : react')).toBe('npm/react');
    expect(parsePackageSearch('pypi : Django')).toBe('pypi/django');
    expect(parsePackageSearch('crates :serde = "1.0"')).toBe('crates/serde');
    expect(parsePackageSearch(' maven: org.slf4j:slf4j-api:2.0.9')).toBe('maven/org.slf4j:slf4j-api');
  });

  it("reads the module a pkg.go.dev page of a package inside it is in, where the host's rule is known", () => {
    expect(parsePackageSearch('https://pkg.go.dev/golang.org/x/net/html')).toBe('go/golang.org/x/net');
    expect(parsePackageSearch('https://pkg.go.dev/github.com/gin-gonic/gin/binding')).toBe(
      'go/github.com/gin-gonic/gin',
    );
    expect(parsePackageSearch('pkg.go.dev/github.com/jackc/pgx/v5/pgxpool')).toBe('go/github.com/jackc/pgx/v5');
    expect(parsePackageSearch('pkg.go.dev/gitlab.com/owner/repo/sub/pkg')).toBe('go/gitlab.com/owner/repo');
    expect(parsePackageSearch('pkg.go.dev/bitbucket.org/owner/repo/v2/x')).toBe('go/bitbucket.org/owner/repo/v2');
    expect(parsePackageSearch('pkg.go.dev/gopkg.in/yaml.v3')).toBe('go/gopkg.in/yaml.v3');
    expect(parsePackageSearch('https://pkg.go.dev/github.com/gin-gonic/gin@v1.9.1/binding')).toBe(
      'go/github.com/gin-gonic/gin',
    );
    // A host whose rule is not known: the whole path, as the page names it.
    expect(parsePackageSearch('pkg.go.dev/go.opentelemetry.io/otel/trace')).toBe('go/go.opentelemetry.io/otel/trace');
    expect(parsePackageSearch('pkg.go.dev/k8s.io/client-go/kubernetes')).toBe('go/k8s.io/client-go/kubernetes');
  });
});

describe('Go and Maven Central publish no download counts', () => {
  const goModule: PackagePage = {
    ...rankedPackage,
    registry: 'GO',
    name: 'github.com/gin-gonic/gin',
    downloads: null,
    ranks: { downloads: { rank: 3 }, dependentsStars: { rank: 1 }, dependents: { rank: 2 } },
  };

  it('have rankings by dependents alone, opening on dependents’ stars', () => {
    for (const id of ['go', 'maven'] as const) {
      expect(registryHasDownloads(id)).toBe(false);
      expect(packageRankingOrdersOf(id)).toEqual(['dependents-stars', 'dependents']);
      expect(packageRankingFirstOrder(id)).toBe('dependents-stars');
      expect(isInvalidRankingPath(`/packages/${id}/downloads/1`)).toBe(true);
      expect(registryDownloadsText(id)).toBe(`${REGISTRIES[id].label} downloads`);
    }
  });

  it('draw a package page that promises no downloads: no card, no ranking tile, no sentence', () => {
    const html = renderToStaticMarkup(<PackageScreen registry="go" name={goModule.name} pkg={goModule} />);
    const page = text(html);

    expect(page).not.toMatch(/download/i);
    expect(html).toContain('aria-label="Open on pkg.go.dev"');
    expect(page).toContain('Go package');
    // "Ranks on Go": the dependents' rankings alone, though the ranks hold a downloads rank.
    expect(page).toContain('Ranks on Go Beta All ranks #1 Dependents’ stars #2 Dependents Used by');
    expect(html).toContain('href="https://pkg.go.dev/github.com/gin-gonic/gin"');
    expect(buildPackageSEO(goModule, goModule.name, [], 'go').metadata.description).not.toMatch(/download/i);
    expect(packageMarkdownOf(goModule, 'go')).toContain('- Downloads: Go publishes no download counts.');
    const summary = buildPackageSummary('go', goModule)
      .map((part) => (typeof part === 'string' ? part : part.text))
      .join('');
    expect(summary).toMatch(/^github\.com\/gin-gonic\/gin is a Go package\. /);
  });

  it("credit deps.dev for Maven Central's facts", () => {
    const artifact: PackagePage = { ...goModule, registry: 'MAVEN', name: 'org.slf4j:slf4j-api' };
    const html = renderToStaticMarkup(<PackageScreen registry="maven" name={artifact.name} pkg={artifact} />);
    expect(text(html)).toContain('Facts from deps.dev');
    expect(html).toContain('href="https://deps.dev/"');
    expect(html).toContain('href="https://central.sonatype.com/artifact/org.slf4j/slf4j-api"');
    expect(packageMarkdownOf(artifact, 'maven')).toContain('- Facts from: https://deps.dev/');
  });

  it("say nothing of downloads on a repository's Used by tab when its packages are on them alone", () => {
    const module: RepoPackage = {
      registry: 'GO',
      name: 'github.com/gin-gonic/gin',
      dependents: 214,
      downloadsLastWeek: null,
    };
    const packages = { ...onePackage, items: [module], downloadsLastWeek: 0, downloadsLastMonth: 0 };
    const page = text(
      renderToStaticMarkup(<UsedByScreen nameWithOwner="gin-gonic/gin" packages={packages} firstPage={firstPage} />),
    );
    expect(page).toContain("Forks, lockfiles and example folders don't count. Read monthly.");
    expect(page).not.toMatch(/download/i);
  });
});
