// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { LiveStatus } from './live-status';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('a live region drawn before its words', () => {
  it('is drawn empty, then filled once on the page, and follows its words', () => {
    expect(renderToStaticMarkup(<LiveStatus text="Loading…" />)).toBe(
      '<span role="status" data-live-status=""></span>',
    );
    const host = document.createElement('div');
    const root = createRoot(host);
    act(() => root.render(<LiveStatus text="Loading…" className="sr-only" />));
    const region = host.querySelector('[role="status"]')!;
    expect(region.textContent).toBe('Loading…');
    act(() => root.render(<LiveStatus text="Still loading…" className="sr-only" />));
    expect(host.querySelector('[role="status"]')).toBe(region);
    expect(region.textContent).toBe('Still loading…');
    act(() => root.unmount());
  });
});
