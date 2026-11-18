import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { BADGE_CHECK_COPY } from '../utils/badge-check';
import { EmbedStep } from './embed-step';
import { findBadge } from '@/badge/v3/catalogue';
import { NOW, repoHero, repoMid } from '@/badge/v3/fixtures';

describe('EmbedStep', () => {
  it('stamps the preview of a pending entity but never the code to copy', () => {
    const html = renderToStaticMarkup(
      <EmbedStep
        headingRef={{ current: null }}
        facts={repoMid}
        badge={findBadge('repo', 'star-history')!}
        style={{}}
        now={NOW}
        editHref="/badge/builder"
        onEdit={() => {}}
      />,
    ).replaceAll('&amp;', '&');

    expect(html).toMatch(/<img src="[^"]*star-history\.svg\?theme=light&pending=[0-9a-z]+"/);
    const code = [...html.matchAll(/<code[^>]*>([\s\S]*?)<\/code>/g)].map(([, text]) => text).join('\n');
    expect(code).toContain('/badge/repo/acme/fastqueue/star-history.svg');
    expect(code).not.toContain('pending');
  });

  it.each([
    ['rank', true],
    ['contribute', false],
    ['unsung-hero', false],
  ])('%s: shows the daily updates card only for a badge whose numbers change', (id, shown) => {
    const html = renderToStaticMarkup(
      <EmbedStep
        headingRef={{ current: null }}
        facts={repoHero}
        badge={findBadge('repo', id)!}
        style={{}}
        now={NOW}
        editHref="/badge/builder"
        onEdit={() => {}}
      />,
    );

    expect(html.includes(BADGE_CHECK_COPY.heading)).toBe(shown);
  });
});
