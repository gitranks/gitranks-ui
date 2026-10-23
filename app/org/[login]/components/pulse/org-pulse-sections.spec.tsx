import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { facts } from './org-pulse.fixtures';
import { OrgPulseSections } from './org-pulse-sections';

const render = (pulse = facts) =>
  renderToStaticMarkup(
    <OrgPulseSections login="acme" avatarUrl="https://avatars.githubusercontent.com/u/9?v=4" pulse={pulse} />,
  )
    .replaceAll('&#x27;', "'")
    .replaceAll('&amp;', '&');

const shared = {
  ...facts,
  sharedContributorOrgs: [
    {
      login: 'neighbour',
      sharedContributors: 6,
      share: 0.25,
      organization: {
        login: 'neighbour',
        name: 'Neighbour Inc',
        avatarUrl: 'https://avatars.githubusercontent.com/u/7?v=4',
      },
    },
  ],
};

describe('OrgPulseSections', () => {
  it('renders the code facts as text: lines by type, last-12-month totals and the scope note', () => {
    const html = render();

    expect(html).toContain('Lines of code by type, Sep 2026');
    expect(html).toMatch(/Code<\/th><td>1,500<\/td><td>85\.2%<\/td>/);
    expect(html).toContain('+965');
    expect(html).toContain('−285');
    expect(html).toContain('+680');
    expect(html).toContain('Files over 100 KB (1.2%)');
    expect(html).toContain('Updated Oct 20, 2026.');
  });

  it('renders the contributor facts and the top contributors with links to their profiles', () => {
    const html = render();

    expect(html).toContain('Active contributors, last 12 months');
    expect(html).toContain('href="/profile/octo-dev"');
    expect(html).toContain('TypeScript, CSS');
    expect(html).toContain('4 unlinked authors (no GitHub account found) not listed.');
  });

  it('counts contributors by country with the no-location and not-on-gitranks groups', () => {
    const html = render();

    expect(html).toContain('Germany');
    expect(html).toContain('No location on gitranks');
    expect(html).toContain('Not on gitranks');
  });

  it('carries none of the 60-month series: the charts load in the browser', () => {
    const html = render();

    expect(html).toContain('Loading the lines charts');
    expect(html).not.toContain('Lines snapshot');
    expect(html).not.toContain('Largest single change');
    expect(html).not.toContain('recharts');
  });

  it('leaves out the switches and controls, which need a script', () => {
    const html = render();

    expect(html).not.toContain('aria-pressed');
    expect(html).not.toContain('Show more');
  });

  it('hides shared contributors when the list is empty and shows the orgs when it is not', () => {
    expect(render()).not.toContain('Shared contributors');

    const html = render(shared);
    expect(html).toContain('Shared contributors');
    expect(html).toContain('href="/org/neighbour"');
    expect(html).toContain("6 shared contributors (25.0% of this organization's)");
  });

  it('scales the country bars by countries only; the group rows get none', () => {
    const html = render({
      ...facts,
      countries: facts.countries.map((row) => (row.country ? row : { ...row, contributors: 30 })),
    });

    expect(html.match(/<i aria-hidden="true" style="width:[^"]*"/g)).toEqual([
      '<i aria-hidden="true" style="width:100%"',
    ]);
  });

  it('draws the shared-org graph only in the browser, keeping its space', () => {
    const html = render(shared);

    expect(html).not.toContain('<svg viewBox="0 0 240 240"');
    expect(html).toContain('aspect-square');
  });

  it('draws no headline, score or rank: data only', () => {
    expect(render(shared)).not.toMatch(/\b(score|rank|best|top performer)\b/i);
  });
});
