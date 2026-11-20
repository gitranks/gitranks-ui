import type { Route } from 'next';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { Pagination } from './pagination';

const hrefOf = (page: number) => `/list?page=${page}` as Route;
const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

describe('Pagination', () => {
  it('says which rows show of how many, with Previous and Next where there are pages', () => {
    const middle = renderToStaticMarkup(<Pagination page={2} total={46} noun="pull request" hrefOf={hrefOf} />);
    expect(text(middle)).toBe('21–40 of 46 pull requests Previous Next');
    expect(middle).toContain('href="/list?page=1"');
    expect(middle).toContain('href="/list?page=3"');
    const first = renderToStaticMarkup(<Pagination page={1} total={46} noun="pull request" hrefOf={hrefOf} />);
    expect(text(first)).toBe('1–20 of 46 pull requests Next');
    const last = renderToStaticMarkup(<Pagination page={3} total={46} noun="pull request" hrefOf={hrefOf} />);
    expect(text(last)).toBe('41–46 of 46 pull requests Previous');
  });

  it('is absent when every row fits on one page', () => {
    expect(renderToStaticMarkup(<Pagination page={1} total={20} noun="run" hrefOf={hrefOf} />)).toBe('');
  });

  it('says the range alone on one page when asked to, and nothing for an empty list', () => {
    const one = renderToStaticMarkup(<Pagination page={1} total={7} noun="lesson" hrefOf={hrefOf} always />);
    expect(text(one)).toBe('1–7 of 7 lessons');
    expect(one).not.toContain('href=');
    expect(renderToStaticMarkup(<Pagination page={1} total={0} noun="lesson" hrefOf={hrefOf} always />)).toBe('');
  });
});
