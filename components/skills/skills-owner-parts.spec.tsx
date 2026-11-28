// @vitest-environment jsdom
import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { SkillsProductBox, SkillsStart } from './skills-start';
import { SkillsStrip } from './skills-strip';
import { skillsMine } from '@/lib/skills/__fixtures__/skills';

const LONG_DASH = String.fromCodePoint(0x2014);
const HREF = 'https://gitranks.com/profile/octocat/skills';

function draw(node: ReactElement) {
  const root = document.createElement('div');
  root.innerHTML = renderToStaticMarkup(node);
  const text = root.textContent ?? '';
  expect(text).not.toContain(LONG_DASH);
  expect(text.toLowerCase()).not.toContain('claim');
  const buttons = [...root.querySelectorAll('button')].map((one) => one.textContent?.trim());
  return { root, text, buttons, hrefs: [...root.querySelectorAll('a')].map((a) => a.getAttribute('href')) };
}

describe('SkillsStrip', () => {
  it('offers "Copy link" and "Hide this page" on a page everyone sees, and the learner’s progress', () => {
    const { text, buttons, hrefs } = draw(<SkillsStrip mine={skillsMine.publicLearner} href={HREF} />);
    expect(text).toContain('Everyone can see this page.');
    expect(buttons).toEqual(expect.arrayContaining(['Hide this page']));
    expect(text).toContain('Copy link');
    expect(hrefs).toContain('/learn/progress');
  });

  it('offers "Show it to everyone" on a hidden page', () => {
    const drawn = draw(<SkillsStrip mine={skillsMine.hiddenLearner} href={HREF} />);
    expect(drawn.buttons).toEqual(['Show it to everyone']);
    expect(drawn.text).toContain('Only you can see this page.');
  });

  it('says until when an empty page is only theirs', () => {
    expect(draw(<SkillsStrip mine={skillsMine.new} href={HREF} />).text).toBe(
      'Only you can see this page, until you send a pull request, build a project or learn a lesson.',
    );
  });

  it('waits while a press is on its way', () => {
    const { root } = draw(<SkillsStrip mine={skillsMine.publicFirstFix} href={HREF} pending />);
    const hide = [...root.querySelectorAll('button')].find((one) => one.textContent === 'Hide this page');
    expect(hide?.hasAttribute('disabled')).toBe(true);
  });
});

describe('SkillsStart', () => {
  it('gives each product used its first step', () => {
    const both = draw(<SkillsStart mine={skillsMine.nothingYetBoth} />);
    expect(both.text).toContain('There are three ways to fill it, and you can use them all.');
    expect(both.text).toContain('No pull request sent yet. The first one you send shows here.');
    expect(both.text).toContain('No lesson learned yet. The first one you learn shows here.');
    expect(both.root.querySelector('[data-skills-numbers]')).toBeNull();
    expect(draw(<SkillsStart mine={skillsMine.nothingYetContributor} />).text).toContain('Pick an issue');
    expect(draw(<SkillsStart mine={skillsMine.nothingYetLearner} />).text).toContain('Start learning');
  });

  it('draws nothing for a page with something on it', () => {
    expect(renderToStaticMarkup(<SkillsStart mine={skillsMine.publicLearner} />)).toBe('');
  });

  it('draws someone new three boxes: Learn, Build, Contribute', () => {
    const { root, text, hrefs } = draw(<SkillsStart mine={skillsMine.new} />);
    expect(text).toContain('This page shows what you fix, build and learn with GitRanks');
    expect(text).not.toContain('We find the issues that really need a fix');
    expect([...root.querySelectorAll<HTMLElement>('[data-product-box]')].map((box) => box.dataset.productBox)).toEqual([
      'LEARN',
      'BUILD',
      'CONTRIBUTE',
    ]);
    expect(text).toContain('A short test at the end. Every project you build shows on this page.');
    expect(hrefs).toEqual(['/learn', '/build', '/contribute/about']);
  });
});

describe('SkillsProductBox', () => {
  it('marks the owner’s box about the other product', () => {
    const { text, root } = draw(<SkillsProductBox box={{ product: 'CONTRIBUTE', mode: 'promo', onlyYou: true }} />);
    expect(text).toContain('Only you see this');
    expect(text).toContain('See GitRanks Contribute');
    expect(root.querySelectorAll('li')).toHaveLength(2);
  });
});
