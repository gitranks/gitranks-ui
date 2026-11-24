import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { nebulaOrg } from '../__fixtures__/org';
import { OrgScreen } from './org-screen';
import { MIN_VALUE } from '@/app/app.consts';
import { orgBig } from '@/badge/v3/fixtures';
import { entityCards } from '@/lib/learn/__fixtures__/entity-card';
import type { LearnEntityCard } from '@/lib/learn/entity-card';

const render = (s: number | null, learnCard: LearnEntityCard | null = null, login = 'nebula', badges = false) =>
  renderToStaticMarkup(
    <OrgScreen
      now={new Date('2026-11-24T00:00:00Z')}
      login={login}
      org={{ ...nebulaOrg, s }}
      badgeFacts={badges ? orgBig : null}
      learnCard={learnCard}
    />,
  );

describe('OrgScreen Learn card', () => {
  it('draws the Learn card above Badges, named for the org, with links by its login', () => {
    const html = render(MIN_VALUE, entityCards.orgEverything, 'NEBULA', true);
    const learn = html.indexOf('<h2>Learn from this org’s projects</h2>');
    expect(learn).toBeGreaterThan(-1);
    expect(html.indexOf('Badges')).toBeGreaterThan(learn);
    expect(html).toContain('A course about Nebula');
    expect(html).toContain('href="/learn/orgs/nebula"');
    expect(html).toContain('href="/learn/issues?org=nebula&amp;fixed=1"');
  });

  it('draws nothing in its place when Learn has nothing to show', () => {
    expect(render(MIN_VALUE, null)).toBe(render(MIN_VALUE, entityCards.repoIssuesOnly));
    expect(render(MIN_VALUE, null)).not.toContain('Learn from');
  });
});

describe('OrgScreen stars rank', () => {
  it.each([
    ['no stars', null],
    ['no stars counted', 0],
    ['fewer stars than the ranking needs', MIN_VALUE - 1],
  ])('says the organization is not ranked with %s', (_, s) => {
    const html = render(s);

    expect(html).toContain(`An organization needs ${MIN_VALUE}+ stars on repositories it owns to be ranked.`);
    expect(html).not.toContain('Position:');
    expect(html).not.toContain('/repositories">repositories');
  });

  it('shows the position once the organization has the stars the ranking needs', () => {
    const html = render(MIN_VALUE);

    expect(html).toMatch(/Position: <span[^>]*>#12<\/span>/);
    expect(html).not.toContain('to be ranked.');
  });
});
