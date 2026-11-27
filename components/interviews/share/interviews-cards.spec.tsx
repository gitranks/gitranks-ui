import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { CompanyShareCard, InterviewsShareCard, PlanShareCard } from './interviews-cards';
import { interviewsHome, LOGO_PNG_BASE64, northwindPage, tallgrassPage } from '@/lib/interviews/__fixtures__/companies';
import { northwindSeniorPlan, tallgrassSrePlan } from '@/lib/interviews/__fixtures__/plans';

/** The long dash (U+2014) and the en dash (U+2013). */
const DASHES = new RegExp(`[${String.fromCharCode(0x2014, 0x2013)}]`);

/** The words a picture draws, the tags' text joined. */
const wordsOf = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

function expectCopyRules(html: string) {
  expect(html).not.toMatch(DASHES);
  expect(wordsOf(html)).not.toMatch(/\b0 \w/);
}

describe("Interviews' picture", () => {
  it("draws the landing's headline, its line, the top five's logos and the address", () => {
    const logos = new Map([['northwind', LOGO_PNG_BASE64]]);
    const html = renderToStaticMarkup(<InterviewsShareCard top={interviewsHome.top} logos={logos} />);
    const words = wordsOf(html);
    for (const text of [
      'INTERVIEWS',
      'Prepare for the interview at the company you want',
      'Plans that follow the real rounds, with lessons and projects for each.',
      'gitranks.com/interviews',
    ]) {
      expect(words, text).toContain(text);
    }
    expect(html).toContain(`data:image/png;base64,${LOGO_PNG_BASE64}`);
    // Tallgrass has no logo: its first letter in the same square.
    expect(words).toContain(' T ');
    expectCopyRules(html);
  });

  it('draws no logos from an empty read, and no more than five', () => {
    expect(renderToStaticMarkup(<InterviewsShareCard top={[]} logos={new Map()} />)).not.toContain('<img');
    const top = Array.from({ length: 7 }, (_, at) => ({ slug: `c${at}`, name: `C${at}`, logo: true }));
    const logos = new Map(top.map((one) => [one.slug, LOGO_PNG_BASE64]));
    const html = renderToStaticMarkup(<InterviewsShareCard top={top} logos={logos} />);
    expect(html.match(/<img/g)).toHaveLength(5);
  });
});

describe("a company's picture", () => {
  it('draws the logo, the name, its plans for its positions, the notice and the address', () => {
    const html = renderToStaticMarkup(<CompanyShareCard page={northwindPage} logo={LOGO_PNG_BASE64} />);
    const words = wordsOf(html);
    for (const text of [
      'INTERVIEW PLANS',
      'Northwind interviews',
      '7 plans for 3 positions',
      'Not an official Northwind page',
      'gitranks.com/interviews/northwind',
    ]) {
      expect(words, text).toContain(text);
    }
    expect(html).toContain('font-size:62px');
    expect(html).toContain(`data:image/png;base64,${LOGO_PNG_BASE64}`);
    expectCopyRules(html);
  });

  it('draws the first letter for a company with no logo', () => {
    const html = renderToStaticMarkup(<CompanyShareCard page={tallgrassPage} logo={null} />);
    expect(html).not.toContain('<img');
    expect(wordsOf(html)).toContain('INTERVIEW PLANS T Tallgrass interviews');
    expect(wordsOf(html)).toContain('1 plan for 1 position');
  });
});

describe("a plan's picture", () => {
  it("draws the logo, the plan's name, its rounds in one line, the notice and the address cut after the company", () => {
    const html = renderToStaticMarkup(<PlanShareCard plan={northwindSeniorPlan} logo={LOGO_PNG_BASE64} />);
    const words = wordsOf(html);
    for (const text of [
      'INTERVIEW PLAN',
      'Northwind · Senior software engineer',
      '5 rounds, from the recruiter call to the values interview',
      'Not an official Northwind page',
      'gitranks.com/interviews/northwind/…',
    ]) {
      expect(words, text).toContain(text);
    }
    expect(html).toContain('font-size:50px');
    expectCopyRules(html);
  });

  it('draws the public plan alone: never a person’s plans or progress', () => {
    const html = renderToStaticMarkup(<PlanShareCard plan={tallgrassSrePlan} logo={null} />);
    expect(wordsOf(html)).toContain('3 rounds, from the recruiter call to the systems interview');
    expect(wordsOf(html)).not.toMatch(/Your plan|You are here|learned|done|round \d of/i);
  });
});
