import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { nebulaOrg } from '../__fixtures__/org';
import { OrgScreen } from './org-screen';
import { MIN_VALUE } from '@/app/app.consts';

const render = (s: number | null) =>
  renderToStaticMarkup(<OrgScreen login="nebula" org={{ ...nebulaOrg, s }} badgeFacts={null} />);

describe('OrgScreen stars rank', () => {
  it.each([
    ['no stars', null],
    ['no stars counted', 0],
    ['fewer stars than the ranking needs', MIN_VALUE - 1],
  ])('says the organization is not ranked with %s', (_, s) => {
    const html = render(s);

    expect(html).toContain(`An organization needs ${MIN_VALUE}+ stars on repositories it owns to be ranked.`);
    expect(html).not.toContain('Position:');
  });

  it('shows the position once the organization has the stars the ranking needs', () => {
    const html = render(MIN_VALUE);

    expect(html).toMatch(/Position: <span[^>]*>#12<\/span>/);
    expect(html).not.toContain('to be ranked.');
  });
});
