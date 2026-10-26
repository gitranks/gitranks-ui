import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { RepoPulseSections } from './repo-pulse-sections';
import { facts } from '@/components/pulse/pulse.fixtures';

const render = (pulse = facts) =>
  renderToStaticMarkup(<RepoPulseSections owner="octo-org" name="hello.world" pulse={pulse} />)
    .replaceAll('&#x27;', "'")
    .replaceAll('&amp;', '&');

describe('RepoPulseSections', () => {
  it('renders the code and contributor facts under their own section ids', () => {
    const html = render();

    expect(html).toContain('id="repo-pulse-code"');
    expect(html).toContain('id="repo-pulse-contributors"');
    expect(html).toContain('Lines of code by type, Sep 2026');
    expect(html).toContain('Files over 100 KB (1.2%)');
    expect(html).toContain('href="/profile/octo-dev"');
  });

  it("names the countries as the top contributors' only", () => {
    const html = render();

    expect(html).toContain("Top contributors' countries");
    expect(html).toContain('Other contributors are not counted here.');
    expect(html).toContain('Germany');
    expect(html).not.toContain('Contributors by country');
  });

  it('has no shared contributors section', () => {
    expect(render()).not.toContain('Shared contributors');
  });

  it('leaves the countries out when there are none', () => {
    expect(render({ ...facts, countries: [] })).not.toContain('repo-pulse-countries');
  });
});
