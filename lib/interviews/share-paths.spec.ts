import { describe, expect, it } from 'vitest';

import {
  INTERVIEWS_HOME_CARD_PATH,
  INTERVIEWS_HOME_MARKDOWN_PATH,
  interviewCompanyCardPath,
  interviewCompanyMarkdownPath,
  interviewPlanCardPath,
  interviewPlanMarkdownPath,
  interviewsMarkdownRouteOf,
  isInterviewsPath,
} from './paths';

describe("the addresses of Interviews' pictures and Markdown copies", () => {
  it("are the page's own address with /card.png or .md, all closed by the gate", () => {
    const paths = [
      INTERVIEWS_HOME_CARD_PATH,
      interviewCompanyCardPath('northwind'),
      interviewPlanCardPath('northwind', 'senior-software-engineer'),
      INTERVIEWS_HOME_MARKDOWN_PATH,
      interviewCompanyMarkdownPath('northwind'),
      interviewPlanMarkdownPath('northwind', 'senior-software-engineer'),
    ];
    expect(paths).toEqual([
      '/interviews/card.png',
      '/interviews/northwind/card.png',
      '/interviews/northwind/senior-software-engineer/card.png',
      '/interviews.md',
      '/interviews/northwind.md',
      '/interviews/northwind/senior-software-engineer.md',
    ]);
    for (const path of paths) expect(isInterviewsPath(path), path).toBe(true);
  });

  it('answers each copy from its route under the page, for slugs a company and a plan can have only', () => {
    expect(interviewsMarkdownRouteOf('/interviews.md')).toBe('/interviews/copy.md');
    expect(interviewsMarkdownRouteOf('/interviews/northwind.md')).toBe('/interviews/northwind/copy.md');
    expect(interviewsMarkdownRouteOf('/interviews/northwind/senior-software-engineer.md')).toBe(
      '/interviews/northwind/senior-software-engineer/copy.md',
    );
    for (const path of [
      '/interviews',
      '/interviews/northwind',
      '/interviews/about.md',
      '/interviews/mine.md',
      '/interviews/Northwind.md',
      '/interviews/northwind/next.md',
      '/interviews/northwind/senior-software-engineer/next.md',
      '/interviews/northwind/card.png',
      '/learn/courses/algorithms.md',
      '/interviews.md/x',
    ]) {
      expect(interviewsMarkdownRouteOf(path), path).toBeNull();
    }
  });
});
