import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { Footer } from './footer';

describe('Footer', () => {
  it('links the package rankings, right after the repository rankings, in the HTML every visitor is served', () => {
    const html = renderToStaticMarkup(<Footer />);
    const labels = [...html.matchAll(/<a [^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/g)].map(([, href, label]) => [
      label,
      href,
    ]);
    const repos = labels.findIndex(([label]) => label === 'Repository Rankings');

    expect(repos).toBeGreaterThanOrEqual(0);
    expect(labels[repos + 1]).toEqual(['Package Rankings', '/packages/npm/downloads/1']);
  });
});
