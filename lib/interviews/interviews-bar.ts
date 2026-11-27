import type { Route } from 'next';

import {
  INTERVIEWS_ABOUT_PATH,
  INTERVIEWS_HOME_PATH,
  INTERVIEWS_MINE_PATH,
  isInterviewsPath,
  RESERVED_COMPANY_SLUGS,
  RESERVED_PLAN_SLUGS,
} from './paths';
import type { InterviewsBar } from './types';

/*
 * Interviews' bar, as the approved designs draw it: Companies and How it works for everyone; My interviews between
 * them for a person with a plan in progress or finished. The connecting screen has no bar.
 */

/** The bar's tabs. */
export type InterviewsBarTab = 'companies' | 'mine' | 'about';

export const INTERVIEWS_BAR_TABS: Record<InterviewsBarTab, { label: string; href: Route }> = {
  companies: { label: 'Companies', href: INTERVIEWS_HOME_PATH },
  mine: { label: 'My interviews', href: INTERVIEWS_MINE_PATH },
  about: { label: 'How it works', href: INTERVIEWS_ABOUT_PATH },
};

/** What the bar draws: its tabs, in order. */
export type InterviewsBarView = { tabs: InterviewsBarTab[] };

/** A visitor's bar, and a bar whose read failed: Companies and How it works. */
export const VISITOR_INTERVIEWS_BAR: InterviewsBarView = { tabs: ['companies', 'about'] };

/** The bar of a person with a plan in progress or finished. */
export const MINE_INTERVIEWS_BAR: InterviewsBarView = { tabs: ['companies', 'mine', 'about'] };

/** The bar for the API's answer; a visitor's for none (signed out, Interviews closed to them, or a failed read). */
export function interviewsBarViewOf(read: InterviewsBar | null | undefined): InterviewsBarView {
  return read?.mine === true ? MINE_INTERVIEWS_BAR : VISITOR_INTERVIEWS_BAR;
}

/** The path's segments under `/interviews`, decoded; null for a segment that cannot be decoded. */
function segmentsOf(pathname: string): string[] | null {
  const rest = /^\/interviews\/(.*?)\/?$/.exec(pathname)?.[1];
  if (!rest) return [];
  try {
    return rest.split('/').map((segment) => decodeURIComponent(segment));
  } catch {
    return null;
  }
}

/**
 * The current tab for a path: Companies on Interviews home, a company and a plan; My interviews on My interviews; How
 * it works on How it works. None anywhere else: the connecting screen has no bar, and a logo is no page.
 */
export function interviewsBarPlaceOf(pathname: string): InterviewsBarTab | null {
  if (!isInterviewsPath(pathname) || pathname.endsWith('.md')) return null;
  const segments = segmentsOf(pathname);
  if (!segments) return null;
  if (segments.length === 0) return 'companies';
  const [company, plan] = segments;
  if (segments.length === 1) {
    if (company === 'mine') return 'mine';
    if (company === 'about') return 'about';
    return RESERVED_COMPANY_SLUGS.has(company) || company.endsWith('.png') ? null : 'companies';
  }
  if (segments.length === 2 && !RESERVED_PLAN_SLUGS.has(plan) && !plan.endsWith('.png')) return 'companies';
  return null;
}
