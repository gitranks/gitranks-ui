import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { AdaptiveTooltip, HOVER_POINTER_QUERY } from './adaptive-tooltip';

const queries = vi.hoisted(() => [] as string[]);
vi.mock('usehooks-ts', () => ({
  useMediaQuery: (query: string) => {
    queries.push(query);
    return true;
  },
}));

describe('AdaptiveTooltip', () => {
  it('chooses by whether the pointer can hover, not by the screen width, so touch tablets get the popover', () => {
    renderToStaticMarkup(<AdaptiveTooltip trigger={<button type="button">?</button>}>Hint</AdaptiveTooltip>);

    expect(HOVER_POINTER_QUERY).toBe('(hover: hover) and (pointer: fine)');
    expect(queries).toContain(HOVER_POINTER_QUERY);
    expect(queries.join()).not.toContain('width');
  });

  it('renders the popover on the server and the first render, even for a hover pointer', () => {
    const html = renderToStaticMarkup(
      <AdaptiveTooltip trigger={<button type="button">?</button>}>Hint</AdaptiveTooltip>,
    );

    expect(html).toContain('data-slot="popover-trigger"');
    expect(html).not.toContain('tooltip-trigger');
  });
});
