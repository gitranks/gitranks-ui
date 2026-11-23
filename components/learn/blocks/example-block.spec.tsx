// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ExampleBlock } from './example-block';
import { hasDuplicateCodes } from '@/lib/learn/__fixtures__/player';
import { EXAMPLE_LANGUAGE_KEY, exampleLanguageOf } from '@/lib/learn/use-example-language';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('which language the examples show', () => {
  const languages = ['javascript', 'python', 'go'];

  it('shows the main language, else the last picked, else Python, else the first', () => {
    expect(exampleLanguageOf(languages, { main: 'go', picked: 'javascript' })).toBe('go');
    expect(exampleLanguageOf(languages, { main: 'rust', picked: 'javascript' })).toBe('javascript');
    expect(exampleLanguageOf(languages, { main: null, picked: 'ruby' })).toBe('python');
    expect(exampleLanguageOf(['go', 'rust'], { main: undefined, picked: null })).toBe('go');
    expect(exampleLanguageOf([], { main: 'go', picked: 'go' })).toBeNull();
  });
});

describe('the example block', () => {
  let root: Root;
  let host: HTMLDivElement;

  let page = 0;

  beforeEach(() => {
    // Each spec on a page of its own: a pick holds for its page only.
    page += 1;
    window.history.replaceState(null, '', `/learn/lessons/page-${page}`);
    window.localStorage.clear();
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
  });

  afterEach(() => {
    act(() => root.unmount());
    host.remove();
  });

  const shown = (at = 0) => host.querySelectorAll('[data-code-language]')[at]?.getAttribute('data-code-language');
  const tab = (language: string, at = 0) =>
    host
      .querySelectorAll('[data-block="example"]')
      [at].querySelector<HTMLButtonElement>(`[data-language="${language}"]`)!;

  it('shows the main language, then the tab picked, and keeps the pick for the next pages', () => {
    act(() => root.render(<ExampleBlock codes={hasDuplicateCodes} main="go" />));
    expect(shown()).toBe('go');
    expect(tab('go').getAttribute('aria-selected')).toBe('true');
    act(() => tab('javascript').click());
    expect(shown()).toBe('javascript');
    expect(window.localStorage.getItem(EXAMPLE_LANGUAGE_KEY)).toBe('javascript');
  });

  it('moves between the tabs with the arrow keys, round the ends, and focuses the new one', () => {
    act(() => root.render(<ExampleBlock codes={hasDuplicateCodes} main="python" />));
    expect(shown()).toBe('python');
    act(() => {
      tab('python').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    });
    expect(shown()).toBe('go');
    expect(document.activeElement).toBe(tab('go'));
    act(() => {
      tab('go').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    });
    expect(shown()).toBe('python');
  });

  it('shows one pick in every example of the page', () => {
    act(() =>
      root.render(
        <>
          <ExampleBlock codes={hasDuplicateCodes} main="python" />
          <ExampleBlock codes={hasDuplicateCodes} main="python" />
        </>,
      ),
    );
    act(() => tab('go', 0).click());
    expect([shown(0), shown(1)]).toEqual(['go', 'go']);
  });

  it('lets the main language win again on the next page', () => {
    act(() => root.render(<ExampleBlock codes={hasDuplicateCodes} main="python" />));
    act(() => tab('go').click());
    act(() => root.unmount());
    window.history.replaceState(null, '', '/learn/lessons/another');
    root = createRoot(host);
    act(() => root.render(<ExampleBlock codes={hasDuplicateCodes} main="python" />));
    expect(shown()).toBe('python');
    act(() => root.render(<ExampleBlock codes={hasDuplicateCodes} />));
    expect(shown()).toBe('go');
  });

  it('names the one language of a course of one, with no tabs', () => {
    act(() => root.render(<ExampleBlock codes={hasDuplicateCodes.slice(0, 1)} />));
    expect(host.querySelector('[role="tablist"]')).toBeNull();
    expect(host.textContent).toContain('Example · Python');
  });
});
