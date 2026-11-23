import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import PackageMethodologyPage from './page';

// The page as it reads once every registry in the table is listed: one paragraph a registry, built from the table.
vi.mock('@/lib/packages/registries', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/packages/registries')>();
  actual.REGISTRY_IDS.splice(0, actual.REGISTRY_IDS.length, ...actual.ALL_REGISTRY_IDS);
  return actual;
});
vi.mock('@/components/header/header', () => ({ Header: () => null }));

describe('how package rankings work, with every registry listed', () => {
  const html = renderToStaticMarkup(<PackageMethodologyPage />);
  const text = html.replace(/<[^>]+>/g, '').replaceAll('&#x27;', "'");

  it("names each registry's dependency file and how each counts downloads", () => {
    expect(text).toContain(
      'lists the package in a dependency file of its own, as GitHub reports them: package.json for npm, requirements.txt or pyproject.toml for PyPI, go.mod for Go, Cargo.toml for crates.io, pubspec.yaml for pub.dev, composer.json for Packagist, pom.xml or build.gradle for Maven Central, .csproj or packages.config for NuGet and Gemfile or .gemspec for RubyGems.',
    );
    expect(text).toContain(
      'npm and crates.io: vs last week, against the 7 days before. PyPI and Packagist: vs the month before.',
    );
    expect(text).toContain('Go and Maven Central publish no download counts, so they have no downloads ranking.');
    // pub.dev counts downloads, but its first month is not read yet: no downloads ranking until then.
    expect(text).toContain(
      "pub.dev's first monthly download count comes in early December 2026; until then it has no downloads ranking.",
    );
    // NuGet's and RubyGems' first month is the difference between two monthly reads of their running counts.
    expect(text).toContain(
      "NuGet's first monthly download count comes in early January 2027; until then it has no downloads ranking.",
    );
    expect(text).toContain(
      "RubyGems' first monthly download count comes in early January 2027; until then it has no downloads ranking.",
    );
  });

  it('has one paragraph a registry, each linking to its rankings, by dependents’ stars where there are no downloads', () => {
    expect(text).toContain(
      "A module's facts come from the Go module proxy and pkg.go.dev. Go publishes no download counts",
    );
    expect(text).toContain("crates.io's public database dump, read every day, with downloads counted by the day");
    expect(text).toContain(
      "pub.dev's API. Its downloads are pub.dev's 30-day count, read in the first days of each month and scaled to the calendar month.",
    );
    expect(text).toContain('its addresses use the lower-case form with an underscore.');
    expect(text).not.toContain('`');
    expect(text).toContain('packagist.org, with its downloads counted a month at a time, past months included');
    expect(text).toContain("An artifact's facts come from deps.dev");
    expect(text).toContain(
      "NuGet publishes a running count of all downloads, read in the first days of each month: a month's downloads are the difference between two reads, scaled to the calendar month. NuGet reads ids without case, so GitRanks' addresses use the lower-case form.",
    );
    expect(text).toContain("A gem's facts come from rubygems.org's API. RubyGems publishes a running count");
    expect(text).toContain("A gem's name is kept as written, capitals included.");
    for (const [registry, order] of [
      ['go', 'dependents-stars'],
      ['crates', 'downloads'],
      ['pub', 'dependents-stars'],
      ['packagist', 'downloads'],
      ['maven', 'dependents-stars'],
      ['nuget', 'dependents-stars'],
      ['rubygems', 'dependents-stars'],
    ]) {
      expect(html).toContain(`href="/packages/${registry}/${order}/1"`);
    }
  });
});
