// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { open } = vi.hoisted(() => ({ open: { current: false } }));
vi.mock('@/lib/packages/packages-open', () => ({ usePackagesOpen: () => open.current }));

const { Footer } = await import('./footer');

const siteLinks = (container: ParentNode) =>
  [...container.querySelectorAll('nav[aria-label="Site"] a')].map((a) => [a.textContent, a.getAttribute('href')]);

describe('Footer', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    open.current = false;
    container = document.createElement('div');
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
  });

  it('has no package link in the HTML every visitor is served, nor for a viewer packages are closed to', async () => {
    expect(renderToStaticMarkup(<Footer />)).not.toContain('/packages/');

    await act(async () => root.render(<Footer />));
    expect(siteLinks(container).map(([label]) => label)).not.toContain('Package Rankings');
  });

  it('links the package rankings after the repository rankings for a viewer they are open to', async () => {
    open.current = true;
    await act(async () => root.render(<Footer />));

    const links = siteLinks(container);
    const repos = links.findIndex(([label]) => label === 'Repository Rankings');
    expect(links[repos + 1]).toEqual(['Package Rankings', '/packages/npm/downloads/1']);
  });
});
