import { describe, expect, it } from 'vitest';

import { interviewsHome, northwindPage } from './__fixtures__/companies';
import { northwindSeniorPlan } from './__fixtures__/plans';
import {
  interviewCompanyMarkdownResponse,
  interviewPlanMarkdownResponse,
  interviewsHomeMarkdownResponse,
} from './markdown-response';
import type { InterviewShareState } from './share';
import type { InterviewCompanyPage, InterviewPlanPage } from './types';

const company = (state: InterviewShareState<InterviewCompanyPage>) => async () => state;
const plan = (state: InterviewShareState<InterviewPlanPage>) => async () => state;

describe("Interviews' Markdown copies, as answered", () => {
  it('answers the home with its companies, naming the page as the canonical, kept nowhere while closed', async () => {
    const response = await interviewsHomeMarkdownResponse(async () => interviewsHome);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/markdown; charset=utf-8');
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(response.headers.get('x-robots-tag')).toBe('noindex');
    expect(response.headers.get('link')).toBe('</interviews>; rel="canonical"');
    expect(await response.text()).toContain('## Companies');
  });

  it('answers the home with its words alone when the read fails', async () => {
    const response = await interviewsHomeMarkdownResponse(async () => {
      throw new Error('down');
    });
    expect(response.status).toBe(200);
    expect(await response.text()).not.toContain('## Companies');
  });

  it("answers a live company's and plan's copy, each naming its page", async () => {
    const one = await interviewCompanyMarkdownResponse(company({ kind: 'live', page: northwindPage }));
    expect(one.status).toBe(200);
    expect(one.headers.get('link')).toBe('</interviews/northwind>; rel="canonical"');
    expect(await one.text()).toMatch(/^# Northwind interviews\n/);
    const two = await interviewPlanMarkdownResponse(plan({ kind: 'live', page: northwindSeniorPlan }));
    expect(two.status).toBe(200);
    expect(two.headers.get('link')).toBe('</interviews/northwind/senior-software-engineer>; rel="canonical"');
    expect(await two.text()).toMatch(/^# Northwind · Senior software engineer\n/);
  });

  it("follows the page's state: moved to its new copy, gone 410, missing 404, a failed read 503", async () => {
    const moved = await interviewPlanMarkdownResponse(
      plan({ kind: 'moved', path: '/interviews/northwind/senior-engineer' as never }),
    );
    expect([moved.status, moved.headers.get('location')]).toEqual([308, '/interviews/northwind/senior-engineer.md']);
    expect((await interviewCompanyMarkdownResponse(company({ kind: 'gone' }))).status).toBe(410);
    expect((await interviewCompanyMarkdownResponse(company({ kind: 'missing' }))).status).toBe(404);
    expect((await interviewCompanyMarkdownResponse(company({ kind: 'unavailable' }))).status).toBe(503);
    const thrown = await interviewPlanMarkdownResponse(async () => {
      throw new Error('down');
    });
    expect([thrown.status, thrown.headers.get('cache-control')]).toEqual([503, 'private, no-store']);
  });
});
