import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { EmbedStep } from './embed-step';
import { findBadge } from '@/badge/v3/catalogue';
import { NOW, repoMid } from '@/badge/v3/fixtures';

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
});
