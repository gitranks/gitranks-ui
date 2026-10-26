import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { RepoPulseArea } from './repo-pulse-area';
import { facts } from '@/components/pulse/pulse.fixtures';

const render = (stars: number, pulse: typeof facts | null) =>
  renderToStaticMarkup(<RepoPulseArea repo={{ owner: 'octo', name: 'hello', stars }} pulse={pulse} />);

const NOTE = 'Code and contributor analytics appear for repositories with 1,000+ stars.';

describe('RepoPulseArea', () => {
  it('renders the analytics when there are some', () => {
    const html = render(50, facts);

    expect(html).toContain('id="repo-pulse-code"');
    expect(html).not.toContain(NOTE);
  });

  it('explains the threshold to a repository under it', () => {
    expect(render(999, null)).toBe(`<p class="text-sm text-muted-foreground">${NOTE}</p>`);
  });

  it('renders nothing for a repository over the threshold without analytics yet', () => {
    expect(render(1000, null)).toBe('');
  });
});
