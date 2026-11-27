import { describe, expect, it } from 'vitest';

import { interviewsHome, northwindPage, tallgrassPage } from './__fixtures__/companies';
import { northwindSeniorPlan, tallgrassSrePlan } from './__fixtures__/plans';
import { interviewCompanyMarkdownOf, interviewPlanMarkdownOf, interviewsHomeMarkdownOf } from './markdown';
import { SITE_URL as SITE } from '@/lib/seo/site';

/** The long dash (U+2014) and the en dash (U+2013). */
const DASHES = new RegExp(`[${String.fromCharCode(0x2014, 0x2013)}]`);

/** The copy rules every copy keeps: no long dash, never a count of nothing, nothing of a person (the copy check reads every word). */
function expectCopyRules(text: string) {
  expect(text).not.toMatch(DASHES);
  expect(text).not.toMatch(/\b0 (plan|round|lesson|source|position|course)s?\b/);
  expect(text).not.toMatch(/Your plan|You are here|in progress/i);
  expect(text.endsWith('\n')).toBe(true);
  expect(text).not.toMatch(/\n{3}/);
}

/** The headings of a copy, in order. */
const headingsOf = (text: string) => text.split('\n').filter((line) => /^#{1,3} /.test(line));

describe("Interviews home's copy", () => {
  it('says what a plan is and where the facts come from, then each company with its plans, each linked to its copy', () => {
    const text = interviewsHomeMarkdownOf(interviewsHome);
    expect(headingsOf(text)).toEqual(['# Interview plans for engineers', '## Companies']);
    expect(text).toContain(`The page: ${SITE}/interviews\n`);
    expect(text).toContain(`How it works: ${SITE}/interviews/about\n`);
    expect(text).toContain('These are not official pages of the companies.');
    expect(text).toContain(`- [Northwind](${SITE}/interviews/northwind.md): 7 plans\n`);
    expect(text).toContain(
      `  - [Senior software engineer, N3](${SITE}/interviews/northwind/senior-software-engineer.md): 5 rounds · 65 lessons\n`,
    );
    expect(text).toContain(`- [Tallgrass](${SITE}/interviews/tallgrass.md): 1 plan\n`);
    expect(text).toContain(
      `  - [Site reliability engineer, all levels](${SITE}/interviews/tallgrass/site-reliability-engineer.md)`,
    );
    expect(text.indexOf('Northwind')).toBeLessThan(text.indexOf('Tallgrass'));
    expectCopyRules(text);
  });

  it('keeps its words alone when no company could be read', () => {
    const text = interviewsHomeMarkdownOf({ companies: [] });
    expect(headingsOf(text)).toEqual(['# Interview plans for engineers']);
    expect(text).toContain('not official pages');
    expectCopyRules(text);
  });
});

describe("a company's copy", () => {
  it("follows the page's order, with the notice and the day of the last check on top", () => {
    const text = interviewCompanyMarkdownOf(northwindPage);
    expect(headingsOf(text)).toEqual([
      '# Northwind interviews',
      '## Plans',
      '### Software engineer',
      '### Site reliability engineer',
      '### Engineering manager',
      '## How Northwind hires',
      '## What Northwind looks for',
      "## Northwind's own pages",
      '## Northwind on GitRanks',
      '## Sources',
    ]);
    expect(text).toContain('7 plans · 3 positions · last checked 26 Nov 2026.\n');
    expect(text).toContain('Not an official Northwind page. Built from public sources.\n');
    expect(text).toContain(`All companies: ${SITE}/interviews.md`);
    expectCopyRules(text);
  });

  it('lists each plan linked to its copy, with "All levels" or the company\'s own names, and its size', () => {
    const text = interviewCompanyMarkdownOf(northwindPage);
    expect(text).toContain(
      `- [Senior software engineer](${SITE}/interviews/northwind/senior-software-engineer.md): N3 · 5 rounds · 65 lessons`,
    );
    expect(text).toContain(
      `- [Engineering manager](${SITE}/interviews/northwind/engineering-manager.md): All levels · 4 rounds · 29 lessons`,
    );
    expect(interviewCompanyMarkdownOf(tallgrassPage)).toContain(
      `- [Site reliability engineer](${SITE}/interviews/tallgrass/site-reliability-engineer.md): All levels · 3 rounds · 16 lessons`,
    );
    expect(text).toContain('No plan for data engineer yet');
  });

  it('says who states each fact, and which numbered sources it rests on', () => {
    const text = interviewCompanyMarkdownOf(northwindPage);
    expect(text).toContain(
      '- Help from AI: Not allowed in live rounds. Northwind says any use ends the interview. Northwind states. Source: 2.',
    );
    expect(text).toContain('Northwind and candidates. Sources: 1 and 4.');
    expect(text).toContain('- How long it takes: 4 to 8 weeks. From the first call to the offer. Candidates report.');
    expect(text).toContain(
      '1. [How we interview](https://careers.northwind.example/interviews) · careers.northwind.example',
    );
    expect(text).toContain("· A candidate's report · Mar 2026 · read through search results");
    expect(text).toContain('Sources disagree on 3 points, for example');
  });

  it('names its own course, its own pages, and its doors on GitRanks', () => {
    const text = interviewCompanyMarkdownOf(northwindPage);
    expect(text).toContain(
      `Northwind's own course: [Interviewing at Northwind](${SITE}/learn/courses/interviewing-at-northwind.md).`,
    );
    expect(text).toContain(
      '- [How we interview](https://careers.northwind.example/interviews) (careers.northwind.example · May 2026). What each round checks',
    );
    expect(text).toContain(`- [Courses for Northwind's interviews](${SITE}/learn/courses?q=Northwind): 4 courses`);
    expect(text).toContain(`- [Northwind's open-source projects](${SITE}/org/northwind-example)`);
  });

  it('leaves out every section with nothing in it, heading included', () => {
    const text = interviewCompanyMarkdownOf(tallgrassPage);
    expect(headingsOf(text)).toEqual([
      '# Tallgrass interviews',
      '## Plans',
      '### Site reliability engineer',
      '## How Tallgrass hires',
      "## Tallgrass's own pages",
      '## Tallgrass on GitRanks',
      '## Sources',
    ]);
    expectCopyRules(text);
    const bare = interviewCompanyMarkdownOf({
      ...tallgrassPage,
      process: [],
      official: [],
      sources: [],
      courses: 0,
      githubOrg: null,
      disagreements: null,
    });
    expect(headingsOf(bare)).toEqual(['# Tallgrass interviews', '## Plans', '### Site reliability engineer']);
    expectCopyRules(bare);
  });
});

describe("a plan's copy", () => {
  it("follows the page's order: what it is with the notice, the rounds, what comes after, sources, other plans", () => {
    const text = interviewPlanMarkdownOf(northwindSeniorPlan);
    expect(headingsOf(text)).toEqual([
      '# Northwind · Senior software engineer',
      '## The rounds',
      '### Round 1: Recruiter call',
      '### Round 2: Online assessment',
      '### Round 3: Coding interviews',
      '### Round 4: System design',
      '### Round 5: Values interview',
      '## After the interviews',
      '## Sources',
      '## Other plans at Northwind',
    ]);
    expect(text).toContain(
      'Level N3 · 5 rounds to prepare · 65 lessons · 4 to 8 weeks from the first call to the offer.',
    );
    expect(text).toContain('Not an official Northwind page. Built from public sources, last checked 26 Nov 2026.');
    expect(text).toContain(`Northwind: ${SITE}/interviews/northwind.md`);
    expectCopyRules(text);
  });

  it("writes each round's facts with who states them, and links what prepares for it to Learn's copies", () => {
    const text = interviewPlanMarkdownOf(northwindSeniorPlan);
    expect(text).toContain(
      [
        '### Round 3: Coding interviews',
        '',
        '2 or 3 rounds, 45 to 60 minutes each.',
        'What it checks: Whether you turn a problem into working code and explain your choices as you go.',
        'Where: A shared editor. The code does not run.',
        'AI help: Not allowed.',
        'Northwind and candidates. Sources: 1, 4, 5 and 6.',
        '',
        'To prepare:',
        `- [Graphs](${SITE}/learn/lessons/what-a-graph-is.md) · [Algorithms and data structures](${SITE}/learn/courses/algorithms.md) · 11 lessons`,
      ].join('\n'),
    );
    expect(text).toContain('Thin: this round rests on one guide.');
  });

  it('writes what happens after the interviews as facts, each with who states it', () => {
    const text = interviewPlanMarkdownOf(northwindSeniorPlan);
    expect(text).toContain(
      '- Hiring committee: 1 meeting. A group that did not interview you decides, and at which level. Northwind and candidates. Sources: 1 and 4.',
    );
    expect(text).toContain('- Offer: A call with the recruiter, then the offer in writing. Candidates report.');
  });

  it('draws a round with nothing to prepare as facts, a count from zero as "Up to", and nothing after when none', () => {
    const text = interviewPlanMarkdownOf(tallgrassSrePlan);
    expect(text).toContain(
      [
        '### Round 2: Take-home project',
        '',
        'Up to 1 round.',
        'What it checks: Whether you fix a small broken service and explain what you changed.',
        'Where: At home, in your own time, within a week.',
        'AI help: Allowed.',
        'Tallgrass and candidates. Sources: 1 and 2.',
        '',
        'Nothing to prepare with us for this round yet.',
      ].join('\n'),
    );
    expect(headingsOf(text)).not.toContain('## After the interviews');
    expect(headingsOf(text)).not.toContain('## Other plans at Tallgrass');
    expect(text).toContain('Sources do not tell the levels apart.');
    expectCopyRules(text);
  });

  it('keeps a name that would break a link or start a heading on one line', () => {
    const text = interviewPlanMarkdownOf({
      ...northwindSeniorPlan,
      name: 'Senior [software]\nengineer',
      others: [{ ...northwindSeniorPlan.others[0], name: 'Entry ]level[' }],
    });
    expect(text.split('\n')[0]).toBe('# Northwind · Senior [software] engineer');
    expect(text).toContain('- [Entry level](');
  });
});
