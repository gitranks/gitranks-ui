import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { packageSearchesOf, parsePackageSearch } from '@/app/badge/builder/[[...login]]/utils/builder-state';
import { rankedPackage } from '@/app/package/[registry]/[...name]/__fixtures__/package';
import { PackageScreen } from '@/app/package/[registry]/[...name]/components/package-screen';
import { buildPackageSEO, packageTitle } from '@/app/package/[registry]/[...name]/seo';
import { parsePackageParams } from '@/app/package/[registry]/[...name]/utils/package-params';
import { packageRankingFirstOrder, packageRankingOrdersOf } from '@/app/packages/package-rankings';
import type { PackagePage } from '@/graphql/package-page';
import { packageMarkdownOf } from '@/lib/packages/package-markdown';
import { packageCacheTag } from '@/lib/packages/package-paths';
import {
  canonicalNameOf,
  downloadsUnitOf,
  isPackageName,
  nameOfSegments,
  REGISTRIES,
  type RegistryId,
  segmentsOfName,
} from '@/lib/packages/registries';
import { REGISTRY_ICONS } from '@/lib/packages/registry-icons';
import { isImpossibleEntityPath } from '@/lib/routing/entity-routes';
import { isInvalidRankingPath } from '@/lib/routing/ranking-routes';
import { llmsTxtOf } from '@/lib/seo/llms-txt';
import { packagePath } from '@/utils/package-paths';

// Every row of the table listed, as once RubyGems goes live too (the site lists NuGet, not RubyGems yet).
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

const BATCH: readonly RegistryId[] = ['nuget', 'rubygems'];

describe('NuGet and RubyGems in the table', () => {
  it('each has its label, its API name, its unit, its files, its icon, and examples its own rule takes', () => {
    expect(BATCH.map((id) => [REGISTRIES[id].label, REGISTRIES[id].api, REGISTRIES[id].downloads])).toEqual([
      ['NuGet', 'NUGET', 'month'],
      ['RubyGems', 'RUBYGEMS', 'month'],
    ]);
    expect(BATCH.map((id) => REGISTRIES[id].manifest)).toEqual(['.csproj or packages.config', 'Gemfile or .gemspec']);
    for (const id of BATCH) {
      expect(REGISTRY_ICONS[id], id).toBeTypeOf('function');
      for (const example of REGISTRIES[id].examples) expect(isPackageName(id, example), example).toBe(true);
      // The first example is prerendered: it is already the spelling the site's addresses use.
      expect(canonicalNameOf(id, REGISTRIES[id].examples[0])).toBe(REGISTRIES[id].examples[0]);
    }
  });

  it("links to each package's page on its registry's site", () => {
    expect(REGISTRIES.nuget.pageUrl('newtonsoft.json')).toBe('https://www.nuget.org/packages/newtonsoft.json');
    expect(REGISTRIES.rubygems.pageUrl('ZenTest')).toBe('https://rubygems.org/gems/ZenTest');
  });
});

describe('NuGet ids', () => {
  it("take NuGet's rule in any case, one segment, folded to lower case", () => {
    for (const name of ['Newtonsoft.Json', 'serilog', 'Microsoft.Extensions.Logging', 'xunit.runner.visualstudio']) {
      expect(isPackageName('nuget', name), name).toBe(true);
    }
    for (const name of [
      '',
      '.x',
      'x.',
      'a..b',
      'a.-b',
      'a b',
      'a/b',
      '$(CorePackage)',
      'Newtonsoft.Json@13.0.3',
      'é',
      'x'.repeat(129),
    ]) {
      expect(isPackageName('nuget', name), name).toBe(false);
    }
    expect(isPackageName('nuget', 'x'.repeat(128))).toBe(true);
    expect(canonicalNameOf('nuget', 'Newtonsoft.Json')).toBe('newtonsoft.json');
    expect(packageCacheTag('nuget', 'Newtonsoft.Json')).toBe('package:nuget/newtonsoft.json');
    expect(nameOfSegments('nuget', ['newtonsoft', 'json'])).toBeNull();
    expect(parsePackageParams('nuget', ['newtonsoft.json'])).toEqual({ registry: 'nuget', name: 'newtonsoft.json' });
    expect(packagePath('newtonsoft.json', 'nuget')).toBe('/package/nuget/newtonsoft.json');
    expect(isImpossibleEntityPath('/package/nuget/newtonsoft.json')).toBe(false);
  });
});

describe('RubyGems names', () => {
  it('take rubygems.org’s rule as written, case kept, one segment', () => {
    for (const name of ['rails', 'ZenTest', 'http_parser.rb', 'net-http', 'aws-sdk-s3', '-', 'x'.repeat(255)]) {
      expect(isPackageName('rubygems', name), name).toBe(true);
    }
    for (const name of ['', '1', '..', '_', 'a b', 'a/b', 'é', 'rails:7', 'x'.repeat(256)]) {
      expect(isPackageName('rubygems', name), name).toBe(false);
    }
    expect(canonicalNameOf('rubygems', 'ZenTest')).toBe('ZenTest');
    expect(segmentsOfName('rubygems', 'http_parser.rb')).toEqual(['http_parser.rb']);
    expect(nameOfSegments('rubygems', ['a', 'b'])).toBeNull();
    expect(parsePackageParams('rubygems', ['ZenTest'])).toEqual({ registry: 'rubygems', name: 'ZenTest' });
    expect(packagePath('rails', 'rubygems')).toBe('/package/rubygems/rails');
    expect(isImpossibleEntityPath('/package/rubygems/rails')).toBe(false);
  });
});

describe('a pasted page address or requirement, in the badge builder', () => {
  it("reads each registry's page address, the page's own path after the name left out", () => {
    expect(parsePackageSearch('https://www.nuget.org/packages/Newtonsoft.Json/13.0.3')).toBe('nuget/newtonsoft.json');
    expect(parsePackageSearch('nuget.org/packages/Serilog#readme-body-tab')).toBe('nuget/serilog');
    expect(parsePackageSearch('https://rubygems.org/gems/rails/versions/7.1.0')).toBe('rubygems/rails');
    expect(parsePackageSearch('rubygems.org/gems/ZenTest')).toBe('rubygems/ZenTest');
  });

  it('reads the requirements each registry writes, without their version', () => {
    expect(packageSearchesOf('<PackageReference Include="Newtonsoft.Json" Version="13.0.3" />')).toEqual([
      'nuget/newtonsoft.json',
    ]);
    expect(packageSearchesOf('<package id="Serilog" version="3.1.1" targetFramework="net48" />')).toEqual([
      'nuget/serilog',
    ]);
    expect(packageSearchesOf('dotnet add package Serilog --version 3.1.1')).toContain('nuget/serilog');
    expect(packageSearchesOf('dotnet add App.csproj package Serilog')).toContain('nuget/serilog');
    expect(packageSearchesOf('Install-Package Newtonsoft.Json -Version 13.0.3')).toContain('nuget/newtonsoft.json');
    // nuget.org's own install tabs.
    expect(packageSearchesOf('NuGet\\Install-Package Newtonsoft.Json -Version 13.0.3')).toContain(
      'nuget/newtonsoft.json',
    );
    expect(packageSearchesOf('paket add Serilog --version 3.1.1')).toContain('nuget/serilog');
    expect(packageSearchesOf('#r "nuget: Serilog, 3.1.1"')).toContain('nuget/serilog');
    expect(packageSearchesOf('#:package Serilog@3.1.1')).toContain('nuget/serilog');
    expect(packageSearchesOf('<PackageVersion Update="Serilog" Version="3.1.1" />')).toEqual(['nuget/serilog']);
    expect(parsePackageSearch('nuget:Newtonsoft.Json')).toBe('nuget/newtonsoft.json');
    expect(parsePackageSearch('nuget : <PackageReference Include="Serilog" />')).toBe('nuget/serilog');
    expect(packageSearchesOf("gem 'rails', '~> 7.1'")).toEqual(['rubygems/rails']);
    expect(packageSearchesOf('gem "ZenTest"')).toEqual(['rubygems/ZenTest']);
    expect(packageSearchesOf('spec.add_dependency "rack", ">= 2"')).toEqual(['rubygems/rack']);
    expect(packageSearchesOf("s.add_development_dependency('rspec', '~> 3.0')")).toEqual(['rubygems/rspec']);
    expect(packageSearchesOf('gem install rails -v 7.1.0')).toContain('rubygems/rails');
    expect(packageSearchesOf('bundle add sidekiq')).toContain('rubygems/sidekiq');
    expect(packageSearchesOf('rails (7.1.0)')).toContain('rubygems/rails');
    expect(parsePackageSearch('rubygems:ZenTest')).toBe('rubygems/ZenTest');
    expect(parsePackageSearch("rubygems: gem 'rails'")).toBe('rubygems/rails');
  });

  it("never cuts another registry's spelling down to a NuGet id or a gem name", () => {
    for (const input of [
      'django==5.0',
      'serde = "1.0"',
      'http: ^1.2.0',
      'https://example.com/http',
      'laravel/framework:^11.0',
      'org.slf4j:slf4j-api:2.0.9',
      'github.com/gin-gonic/gin v1.9.1',
      "implementation 'com.google.guava:guava:33.0-jre'",
      '<Compile Include="Program.cs" />',
      'id = "org.jetbrains.kotlin.jvm"',
    ]) {
      const found = packageSearchesOf(input);
      expect(
        found.filter((key) => key.startsWith('nuget/') || key.startsWith('rubygems/')),
        input,
      ).toEqual([]);
    }
    // A name with another registry's prefix is that registry's alone.
    expect(packageSearchesOf('npm:react')).toEqual(['npm/react']);
    expect(packageSearchesOf('pypi:Django')).toEqual(['pypi/django']);
    // `vendor/package` is a Packagist name, never a gem's or a NuGet id.
    expect(packageSearchesOf('acme/fastqueue')).toEqual(['packagist/acme/fastqueue']);
    // A bare name is looked for on every registry that takes it, these two included.
    expect(packageSearchesOf('rails')).toEqual(expect.arrayContaining(['nuget/rails', 'rubygems/rails']));
  });
});

describe("NuGet and RubyGems before their first month's download count is read", () => {
  // A NuGet package as the API may answer it, its downloads and a downloads rank included: the site still shows none.
  const nugetPackage: PackagePage = {
    ...rankedPackage,
    registry: 'NUGET',
    name: 'newtonsoft.json',
    displayName: 'Newtonsoft.Json',
    ranks: { downloads: { rank: 3 }, dependentsStars: { rank: 1 }, dependents: { rank: 2 } },
  };

  it('have rankings by dependents alone, opening on dependents’ stars', () => {
    for (const id of BATCH) {
      expect(downloadsUnitOf(id), id).toBeNull();
      expect(packageRankingOrdersOf(id)).toEqual(['dependents-stars', 'dependents']);
      expect(packageRankingFirstOrder(id)).toBe('dependents-stars');
      expect(isInvalidRankingPath(`/packages/${id}/downloads/1`)).toBe(true);
      expect(isInvalidRankingPath(`/packages/${id}/dependents-stars/1`)).toBe(false);
    }
  });

  it('draw a package page that says nothing of downloads, linking to the package on its registry', () => {
    expect(packageTitle('Newtonsoft.Json', 'nuget')).toBe('Newtonsoft.Json - NuGet package dependents and ranks');
    expect(buildPackageSEO(nugetPackage, nugetPackage.name, [], 'nuget').metadata.description).not.toMatch(/download/i);
    const html = renderToStaticMarkup(<PackageScreen registry="nuget" name={nugetPackage.name} pkg={nugetPackage} />);
    const page = text(html);

    expect(page).not.toMatch(/download/i);
    expect(page).toContain('Ranks on NuGet Beta All ranks #1 Dependents’ stars #2 Dependents Used by');
    expect(html).toContain('aria-label="Open on NuGet"');
    expect(html).toContain('href="https://www.nuget.org/packages/newtonsoft.json"');
    expect(page).toContain('.csproj or packages.config');
    const markdown = packageMarkdownOf(nugetPackage, 'nuget');
    expect(markdown).not.toMatch(/download/i);

    const gem: PackagePage = { ...nugetPackage, registry: 'RUBYGEMS', name: 'rails', displayName: null };
    const gemHtml = renderToStaticMarkup(<PackageScreen registry="rubygems" name="rails" pkg={gem} />);
    expect(text(gemHtml)).not.toMatch(/download/i);
    expect(gemHtml).toContain('href="https://rubygems.org/gems/rails"');
  });

  it('are listed in llms.txt by dependents alone, with the form of their names in an address', () => {
    const llms = llmsTxtOf({ contribute: false });
    const nuget = llms.split('\n').filter((line) => line.includes('/nuget/'));
    expect(nuget).toHaveLength(3);
    expect(nuget[0]).toContain('/packages/nuget/dependents-stars/1');
    expect(nuget[1]).toContain('/package/nuget/{name} ({name} in lower case)');
    const rubygems = llms.split('\n').filter((line) => line.includes('/rubygems/'));
    expect(rubygems).toHaveLength(3);
    expect(rubygems[1]).toContain('/package/rubygems/{name} —');
    for (const line of [...nuget, ...rubygems]) expect(line).not.toMatch(/download/i);
  });
});
