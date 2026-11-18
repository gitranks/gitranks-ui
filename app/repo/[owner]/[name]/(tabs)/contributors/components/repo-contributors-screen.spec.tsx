import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { bigRepo, bigRepoPulse, youngRepo } from '../../../__fixtures__/repo';
import { RepoContributorsSections } from '../../../components/repo-contributors-sections';
import { RepoContributorsScreen } from './repo-contributors-screen';

vi.mock('next/navigation', () => ({
  usePathname: () => '/repo/nebula/ui/contributors',
  useRouter: () => ({ push: vi.fn() }),
}));

const render = (html: string) => html.replace(/_R_[0-9a-z]+_/g, '_R_');

describe('RepoContributorsScreen', () => {
  it("draws the summary, today's analytics sections and the questions, in that order", () => {
    const html = render(renderToStaticMarkup(<RepoContributorsScreen repo={bigRepo} pulse={bigRepoPulse} />));
    const sections = render(renderToStaticMarkup(<RepoContributorsSections repo={bigRepo} pulse={bigRepoPulse} />));

    expect(html).toContain(sections);
    expect(html.indexOf('nebula/ui had 12 active contributors')).toBeLessThan(html.indexOf(sections));
    expect(html.indexOf(sections)).toBeLessThan(html.indexOf('>Questions<'));
    expect(html).toContain('Is nebula/ui actively maintained?');
    expect(html).toContain('"@type":"FAQPage"');
  });

  it("is today's note alone without analytics", () => {
    const html = renderToStaticMarkup(<RepoContributorsScreen repo={youngRepo} pulse={null} />);

    expect(html).toBe(
      '<p class="text-sm text-muted-foreground">Code and contributor analytics appear for repositories with 1,000+ stars.</p>',
    );
  });
});
