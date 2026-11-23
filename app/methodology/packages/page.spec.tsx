import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import PackageMethodologyPage, { metadata } from './page';

vi.mock('@/components/header/header', () => ({ Header: () => null }));

describe('how package rankings work', () => {
  it('has its own title and canonical', () => {
    expect(metadata.title).toBe('How package rankings work');
    expect(metadata.alternates?.canonical).toBe('/methodology/packages');
  });

  it('explains dependents, what does not count, the three rankings and the reads, for npm, PyPI, Go, crates.io, pub.dev, Packagist, Maven Central, NuGet and RubyGems', () => {
    const html = renderToStaticMarkup(<PackageMethodologyPage />);

    for (const heading of [
      'What a dependent is',
      'What does not count',
      'The three rankings',
      'How often the numbers are read',
      'Registries',
    ]) {
      expect(html).toContain(`>${heading}</h2>`);
    }
    for (const order of ['downloads', 'dependents-stars', 'dependents']) {
      expect(html).toContain(`href="/packages/npm/${order}/1"`);
    }
    expect(html).toContain('href="/packages/pypi/downloads/1"');
    expect(html).toContain('href="/packages/go/dependents-stars/1"');
    expect(html).not.toContain('href="/packages/go/downloads/1"');
    expect(html).toContain('href="/packages/crates/downloads/1"');
    // pub.dev's first download count is not read yet: its rankings open on dependents' stars.
    expect(html).toContain('href="/packages/pub/dependents-stars/1"');
    expect(html).not.toContain('href="/packages/pub/downloads/1"');
    expect(html).toContain('href="/packages/packagist/downloads/1"');
    expect(html).toContain('href="/packages/maven/dependents-stars/1"');
    expect(html).not.toContain('href="/packages/maven/downloads/1"');
    // NuGet's first download count is not read yet either.
    expect(html).toContain('href="/packages/nuget/dependents-stars/1"');
    expect(html).not.toContain('href="/packages/nuget/downloads/1"');
    // And RubyGems'.
    expect(html).toContain('href="/packages/rubygems/dependents-stars/1"');
    expect(html).not.toContain('href="/packages/rubygems/downloads/1"');
    const text = html.replace(/<[^>]+>/g, '').replaceAll('&#x27;', "'");
    expect(text).toContain("A project's facts come from PyPI's JSON API");
    expect(text).toContain(
      "Its downloads come from PyPI's public download statistics, counted one calendar month at a time",
    );
    expect(text).toContain(
      'lists the package in a dependency file of its own, as GitHub reports them: package.json for npm, requirements.txt or pyproject.toml for PyPI, go.mod for Go, Cargo.toml for crates.io, pubspec.yaml for pub.dev, composer.json for Packagist, pom.xml or build.gradle for Maven Central, .csproj or packages.config for NuGet and Gemfile or .gemspec for RubyGems.',
    );
    expect(text).toContain("A gem's facts come from rubygems.org's API.");
    expect(text).toContain("A gem's name is kept as written, capitals included.");
    expect(text).toContain('Go and Maven Central publish no download counts, so they have no downloads ranking.');
    expect(text).toContain("An artifact's facts come from deps.dev, which reads Maven Central.");
    expect(text).toContain(
      'An artifact is named groupId:artifactId, and its address on GitRanks is groupId/artifactId.',
    );
    // pub.dev counts downloads: it is not said to publish none, and its month is not ranked before its first is read.
    expect(text).toContain(
      "pub.dev's first monthly download count comes in early December 2026; until then it has no downloads ranking.",
    );
    expect(text).toContain(
      "NuGet's first monthly download count comes in early January 2027; until then it has no downloads ranking.",
    );
    expect(text).toContain(
      "RubyGems' first monthly download count comes in early January 2027; until then it has no downloads ranking.",
    );
    expect(text).toContain("NuGet reads ids without case, so GitRanks' addresses use the lower-case form.");
    expect(text).not.toContain('pub.dev publishes no download counts');
    expect(text).not.toContain('NuGet publishes no download counts');
    expect(text).not.toContain('RubyGems publishes no download counts');
    expect(text).not.toContain('Go and pub.dev');
    expect(text).toContain('over the last whole calendar month on PyPI and Packagist;');
    expect(text).toContain('Zope.Interface, zope.interface and zope-interface as one name');
    expect(text).toContain('crates.io takes Serde-JSON and serde_json as one name');
    expect(text).toContain('packagist.org, with its downloads counted a month at a time, past months included');
    expect(text).toContain(
      'npm and crates.io: vs last week, against the 7 days before. PyPI and Packagist: vs the month before.',
    );
    expect(text).toContain('This month: against the monthly read before');
  });
});
