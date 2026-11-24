// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { HOME_NOW, homeProducts } from './__fixtures__/products-block';
import { ProductsBlock } from './products-block';
import type { HomeProducts } from './products-block-words';

const LONG_DASH = String.fromCodePoint(0x2014);

function draw(products: HomeProducts | null) {
  const root = document.createElement('div');
  root.innerHTML = renderToStaticMarkup(<ProductsBlock products={products} now={HOME_NOW} />);
  const text = root.textContent ?? '';
  expect(text).not.toContain(LONG_DASH);
  expect(text.toLowerCase()).not.toContain('claim');
  expect(text).toContain('Contribute to open source, and learn from it');
  expect(text).toContain('Both work with your own coding agent, on real issues in real projects.');
  const card = (product: string) => root.querySelector<HTMLAnchorElement>(`[data-home-card="${product}"]`);
  return { root, text, contribute: card('CONTRIBUTE'), learn: card('LEARN') };
}

describe('ProductsBlock', () => {
  it('promotes both products to a visitor, each card one link', () => {
    const { contribute, learn } = draw(homeProducts.visitor);
    expect(contribute?.getAttribute('href')).toBe('/contribute');
    expect(contribute?.textContent).toContain('Beta');
    expect(contribute?.textContent).toContain('Start contributing');
    expect(learn?.getAttribute('href')).toBe('/learn');
    expect(learn?.textContent).toContain('New');
    expect(learn?.textContent).toContain('Learn one idea in two minutes');
    expect(contribute?.className).toContain('min-h-[176px]');
  });

  it('is the same for someone who uses neither', () => {
    expect(draw(homeProducts.neither).text).toBe(draw(homeProducts.visitor).text);
  });

  it('makes Learn’s card a learner’s own, and keeps Contribute’s promotion', () => {
    const { contribute, learn } = draw(homeProducts.learner);
    expect(learn?.textContent).toContain('6 lessons to repeat today');
    expect(learn?.textContent).toContain('Then your next lesson: Count things with a hash map.');
    expect(learn?.textContent).not.toContain('New');
    expect(learn?.hasAttribute('data-personal')).toBe(true);
    expect(contribute?.textContent).toContain('Fix issues in the open source you build on');
  });

  it('makes Contribute’s card a contributor’s own, and keeps Learn’s promotion', () => {
    const { contribute, learn } = draw(homeProducts.contributor);
    expect(contribute?.textContent).toContain('2 pull requests need you');
    expect(contribute?.textContent).toContain('Round 2: something to answer, in kelp-db/kelp, and 1 more.');
    expect(contribute?.getAttribute('href')).toBe('/my/pull-requests');
    expect(contribute?.textContent).not.toContain('Beta');
    expect(learn?.textContent).toContain('Start learning');
  });

  it('draws both cards for someone of both, and the later states', () => {
    expect(draw(homeProducts.both).root.querySelectorAll('[data-personal]')).toHaveLength(2);
    const open = draw(homeProducts.open);
    expect(open.contribute?.textContent).toContain('3 pull requests are open');
    expect(open.learn?.textContent).toContain('Algorithms and data structures · Hash maps and sets');
    const quiet = draw(homeProducts.quiet);
    expect(quiet.contribute?.textContent).toContain('New issues are ready for you');
    expect(quiet.learn?.textContent).toContain('Your next review is in 2 days, with 3 lessons.');
  });

  it('keeps the promotion, leading into Learn, for a learner with nothing to show', () => {
    const { learn } = draw(homeProducts.learnerNothing);
    expect(learn?.textContent).toContain('Learn one idea in two minutes');
    expect(learn?.textContent).toContain('Open Learn');
    expect(learn?.textContent).not.toContain('New');
  });
});
