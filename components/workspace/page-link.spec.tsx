// @vitest-environment jsdom
import type { Route } from 'next';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { PageLink } from './page-link';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const drawn = async (href: string) => {
  await act(async () => root.render(<PageLink href={href as Route}>Read it</PageLink>));
  return container.querySelector('a');
};

describe('a link a page part is given', () => {
  it('opens GitHub in a new tab, saying so', async () => {
    const link = await drawn('https://github.com/acme/widgets/pull/57/files');
    expect(link?.getAttribute('target')).toBe('_blank');
    expect(link?.getAttribute('rel')).toBe('noopener noreferrer');
    expect(link?.textContent).toBe('Read it ↗ (opens GitHub)');
  });

  it('opens another site in a new tab without naming GitHub', async () => {
    const link = await drawn('https://gitranks.com/learn/fixes/acme/widgets/57');
    expect(link?.getAttribute('target')).toBe('_blank');
    expect(link?.textContent).toBe('Read it ↗ (opens in a new tab)');
  });

  it('keeps our own pages in this tab, unmarked', async () => {
    const link = await drawn('/my/pull-requests/acme/widgets/42/approve');
    expect(link?.getAttribute('target')).toBeNull();
    expect(link?.textContent).toBe('Read it');
  });
});
