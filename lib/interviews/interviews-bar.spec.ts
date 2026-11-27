import { describe, expect, it } from 'vitest';

import {
  INTERVIEWS_BAR_TABS,
  interviewsBarPlaceOf,
  interviewsBarViewOf,
  MINE_INTERVIEWS_BAR,
  VISITOR_INTERVIEWS_BAR,
} from './interviews-bar';

describe("Interviews' bar: what it draws", () => {
  it('gives a visitor, a person Interviews is closed to and a failed read Companies and How it works', () => {
    expect(interviewsBarViewOf(null)).toEqual(VISITOR_INTERVIEWS_BAR);
    expect(interviewsBarViewOf(undefined).tabs).toEqual(['companies', 'about']);
    expect(interviewsBarViewOf({ mine: false }).tabs).toEqual(['companies', 'about']);
  });

  it('adds My interviews between them for a person with a plan', () => {
    expect(interviewsBarViewOf({ mine: true })).toEqual(MINE_INTERVIEWS_BAR);
    expect(MINE_INTERVIEWS_BAR.tabs).toEqual(['companies', 'mine', 'about']);
  });

  it('names the tabs and where they lead', () => {
    expect(INTERVIEWS_BAR_TABS.companies).toEqual({ label: 'Companies', href: '/interviews' });
    expect(INTERVIEWS_BAR_TABS.mine).toEqual({ label: 'My interviews', href: '/interviews/mine' });
    expect(INTERVIEWS_BAR_TABS.about).toEqual({ label: 'How it works', href: '/interviews/about' });
  });
});

describe("Interviews' bar: the current tab", () => {
  it('marks Companies on Interviews home, a company and a plan', () => {
    expect(interviewsBarPlaceOf('/interviews')).toBe('companies');
    expect(interviewsBarPlaceOf('/interviews/')).toBe('companies');
    expect(interviewsBarPlaceOf('/interviews/northwind')).toBe('companies');
    expect(interviewsBarPlaceOf('/interviews/northwind/senior-software-engineer')).toBe('companies');
  });

  it('marks My interviews and How it works on their own pages', () => {
    expect(interviewsBarPlaceOf('/interviews/mine')).toBe('mine');
    expect(interviewsBarPlaceOf('/interviews/about')).toBe('about');
  });

  it('marks nothing on the connecting screen, a logo, the Markdown copy, or an address that cannot be read', () => {
    expect(interviewsBarPlaceOf('/interviews/northwind/sre/next')).toBeNull();
    expect(interviewsBarPlaceOf('/interviews/northwind/logo-64.png')).toBeNull();
    expect(interviewsBarPlaceOf('/interviews.md')).toBeNull();
    expect(interviewsBarPlaceOf('/interviews/%E0%A4%A')).toBeNull();
    expect(interviewsBarPlaceOf('/learn')).toBeNull();
  });
});
