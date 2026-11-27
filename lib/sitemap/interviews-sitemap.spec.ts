import { beforeEach, describe, expect, it, vi } from 'vitest';

import { interviewsSitemapEntries } from './interviews-sitemap';
import { interviewsHome } from '@/lib/interviews/__fixtures__/companies';

describe('the Interviews sitemap', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_URI', 'https://example.test');
  });

  it('lists nothing at all while Interviews is not open to everyone', () => {
    expect(interviewsSitemapEntries(interviewsHome)).toEqual([]);
    expect(interviewsSitemapEntries(interviewsHome, false)).toEqual([]);
  });

  it('lists the home, How it works, then each company and its plans once open, nothing of a person', () => {
    const entries = interviewsSitemapEntries(interviewsHome, true);
    const urls = entries.map((entry) => [entry.url.replace('https://example.test', ''), entry.priority]);
    expect(urls.slice(0, 4)).toEqual([
      ['/interviews', 0.7],
      ['/interviews/about', 0.5],
      ['/interviews/northwind', 0.7],
      ['/interviews/northwind/entry-software-engineer', 0.6],
    ]);
    expect(urls).toContainEqual(['/interviews/tallgrass', 0.7]);
    expect(urls).toContainEqual(['/interviews/tallgrass/site-reliability-engineer', 0.6]);
    const plans = interviewsHome.companies.reduce((sum, card) => sum + card.plans.length, 0);
    expect(entries).toHaveLength(2 + interviewsHome.companies.length + plans);
    expect(urls.some(([url]) => String(url).startsWith('/interviews/mine'))).toBe(false);
  });

  it('lists the two pages alone when no company could be read, and leaves out a company with no plan', () => {
    expect(interviewsSitemapEntries(null, true)).toHaveLength(2);
    expect(interviewsSitemapEntries({ companies: [] }, true)).toHaveLength(2);
    const [northwind] = interviewsHome.companies;
    expect(interviewsSitemapEntries({ companies: [{ ...northwind, plans: [] }] }, true)).toHaveLength(2);
  });
});
