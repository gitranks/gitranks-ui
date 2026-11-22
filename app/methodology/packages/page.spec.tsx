import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import PackageMethodologyPage, { metadata } from './page';

vi.mock('@/components/header/header', () => ({ Header: () => null }));

describe('how package rankings work', () => {
  it('has its own title and canonical', () => {
    expect(metadata.title).toBe('How package rankings work');
    expect(metadata.alternates?.canonical).toBe('/methodology/packages');
  });

  it('explains dependents, what does not count, the three rankings and the reads, for npm and PyPI', () => {
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
    expect(text).toContain('Its dependents come from the dependency files GitHub reports for each repository.');
    expect(text).toContain('Zope.Interface, zope.interface and zope-interface as one name');
    expect(text).toContain('npm: vs last week, against the 7 days before. PyPI: vs the month before.');
    expect(text).toContain('This month: against the monthly read before');
  });
});
