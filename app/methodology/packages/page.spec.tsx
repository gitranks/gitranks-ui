import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import PackageMethodologyPage, { metadata } from './page';

vi.mock('@/components/header/header', () => ({ Header: () => null }));

describe('how package rankings work', () => {
  it('has its own title and canonical', () => {
    expect(metadata.title).toBe('How package rankings work');
    expect(metadata.alternates?.canonical).toBe('/methodology/packages');
  });

  it('explains dependents, what does not count, the three rankings and the reads, for every registry', () => {
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
    const text = html.replace(/<[^>]+>/g, '').replaceAll('&#x27;', "'");
    expect(text).toContain("A project's facts come from PyPI's JSON API");
    expect(text).toContain(
      "Its downloads come from PyPI's public download statistics, counted one calendar month at a time",
    );
    expect(text).toContain(
      'lists the package in a dependency file of its own, as GitHub reports them: package.json for npm, requirements.txt or pyproject.toml for PyPI, go.mod for Go, Cargo.toml for crates.io, pubspec.yaml for pub.dev, composer.json for Packagist and pom.xml or build.gradle for Maven Central.',
    );
    expect(text).toContain('Zope.Interface, zope.interface and zope-interface as one name');
    expect(text).toContain(
      'npm and crates.io: vs last week, against the 7 days before. PyPI, pub.dev and Packagist: vs the month before.',
    );
    expect(text).toContain('Go and Maven Central publish no download counts, so they have no downloads ranking.');
    // One paragraph a registry, each with its rankings: by dependents' stars where there are no downloads.
    expect(text).toContain(
      "A module's facts come from the Go module proxy and pkg.go.dev. Go publishes no download counts",
    );
    expect(text).toContain("crates.io's public database dump, read every day, with downloads counted by the day");
    expect(text).toContain("pub.dev's API, and its downloads are pub.dev's 30-day count, read once a month");
    expect(text).toContain('packagist.org, with its downloads counted a month at a time, past months included');
    expect(text).toContain("An artifact's facts come from deps.dev");
    for (const [registry, order] of [
      ['go', 'dependents-stars'],
      ['crates', 'downloads'],
      ['pub', 'downloads'],
      ['packagist', 'downloads'],
      ['maven', 'dependents-stars'],
    ]) {
      expect(html).toContain(`href="/packages/${registry}/${order}/1"`);
    }
    expect(text).toContain('This month: against the monthly read before');
  });
});
