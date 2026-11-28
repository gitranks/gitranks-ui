// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { HOME_NOW, homeProducts } from './__fixtures__/products-block';
import { ProductsBlockGrow } from './products-block-grow';
import type { HomeProducts } from './products-block-words';

const LONG_DASH = String.fromCodePoint(0x2014);

function draw(products: HomeProducts | null) {
  const root = document.createElement('div');
  root.innerHTML = renderToStaticMarkup(<ProductsBlockGrow products={products} now={HOME_NOW} />);
  const text = root.textContent ?? '';
  expect(text).not.toContain(LONG_DASH);
  expect(text.toLowerCase()).not.toContain('claim');
  expect(text).toContain('Learn, build, and contribute to open source');
  expect(text).toContain('All three work with your own coding agent, on real code.');
  const card = (product: string) => root.querySelector<HTMLAnchorElement>(`[data-home-card="${product}"]`);
  return { root, text, contribute: card('CONTRIBUTE'), learn: card('LEARN') };
}

describe("the home page's Learn and Contribute cards", () => {
  it('promotes both products to a visitor, each card one link', () => {
    const { contribute, learn } = draw(homeProducts.visitor);
    expect(contribute?.getAttribute('href')).toBe('/contribute');
    expect(contribute?.textContent).not.toMatch(/beta/i);
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
    expect(contribute?.textContent).not.toMatch(/beta/i);
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

  it('keeps the promotion’s words under a person’s own, hidden, so the card keeps its size', () => {
    const { contribute, learn } = draw(homeProducts.both);
    for (const card of [contribute, learn]) {
      const layers = [...(card?.querySelectorAll<HTMLElement>('[data-promo-layer]') ?? [])];
      expect(layers).toHaveLength(3);
      for (const layer of layers) {
        expect(layer.getAttribute('aria-hidden')).toBe('true');
        expect(layer.className).toContain('invisible');
        expect(layer.className).toContain('row-start-1');
        expect(layer.previousElementSibling?.className).toContain('row-start-1');
      }
    }
    const hiddenText = (card: HTMLElement | null | undefined) =>
      [...(card?.querySelectorAll('[data-promo-layer]') ?? [])].map((layer) => layer.textContent).join('|');
    expect(hiddenText(contribute)).toBe(
      'Fix issues in the open source you build on|Contribute finds issues that fit you. Your coding agent writes the fix, you review it, and the pull request opens in your name.|Start contributing',
    );
    expect(hiddenText(learn)).toContain('Learn one idea in two minutes');
  });

  it('gives screen readers only the shown words', () => {
    const { contribute } = draw(homeProducts.contributor);
    const spoken = contribute?.cloneNode(true) as HTMLElement;
    for (const hidden of spoken.querySelectorAll('[aria-hidden="true"]')) hidden.remove();
    expect(spoken.textContent).toBe(
      'GitRanks Contribute2 pull requests need youRound 2: something to answer, in kelp-db/kelp, and 1 more.Open your pull requests',
    );
  });

  it('draws no hidden layer on a promotion', () => {
    const { root } = draw(homeProducts.visitor);
    expect(root.querySelectorAll('[data-promo-layer]')).toHaveLength(0);
    const learner = draw(homeProducts.learnerNothing).learn;
    expect([...(learner?.querySelectorAll('[data-promo-layer]') ?? [])].map((layer) => layer.textContent)).toEqual([
      'Start learning',
    ]);
  });

  it('takes its own id for a board that draws it twice', () => {
    const root = document.createElement('div');
    root.innerHTML = renderToStaticMarkup(<ProductsBlockGrow products={null} now={HOME_NOW} id="products-two" />);
    expect(root.querySelector('section')?.getAttribute('aria-labelledby')).toBe('products-two');
    expect(root.querySelector('#products-two')?.tagName).toBe('H2');
    expect(root.querySelector('#products')).toBeNull();
  });
});

describe("the home page's Learn line", () => {
  const live = [
    { slug: 'algorithms', name: 'Algorithms and data structures' },
    { slug: 'javascript-and-typescript', name: 'JavaScript and TypeScript' },
    { slug: 'python', name: 'Python' },
    { slug: 'contributing-to-open-source', name: 'Contributing to open source' },
    { slug: 'working-with-llm-apis', name: 'Working with LLM APIs' },
  ];
  const learnOf = (courses?: typeof live) => {
    const root = document.createElement('div');
    root.innerHTML = renderToStaticMarkup(<ProductsBlockGrow products={null} now={HOME_NOW} courses={courses} />);
    return root.querySelector('[data-home-card="LEARN"]')?.textContent ?? '';
  };

  it('names the live courses it is given, and no course that is not live', () => {
    const text = learnOf(live);
    expect(text).toContain('Short lessons on algorithms, JavaScript and TypeScript, Python, open source and LLM APIs.');
    expect(text).not.toMatch(/databases|design patterns|seven languages/);
  });

  it('keeps a plain line with no course', () => {
    expect(learnOf()).toContain('Short lessons on programming. Then fix a real issue with what you learned.');
    expect(learnOf([])).toBe(learnOf());
  });
});
