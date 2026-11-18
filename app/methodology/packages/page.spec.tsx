import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import PackageMethodologyPage, { metadata } from './page';

vi.mock('@/components/header/header', () => ({ Header: () => null }));

describe('how package rankings work', () => {
  it('has its own title and canonical', () => {
    expect(metadata.title).toBe('How package rankings work');
    expect(metadata.alternates?.canonical).toBe('/methodology/packages');
  });

  it('explains dependents, what does not count, the three rankings and the reads, npm only', () => {
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
    expect(html).toContain('Only npm for now.');
  });
});
