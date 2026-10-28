import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

type Rule = { allow: boolean; path: string };

/** The groups of `public/robots.txt`: each user agent with the rules of its group. */
function readGroups(): Map<string, Rule[]> {
  const groups = new Map<string, Rule[]>();
  let agents: string[] = [];
  let inRules = false;

  for (const raw of readFileSync(join(process.cwd(), 'public/robots.txt'), 'utf8').split('\n')) {
    const line = raw.replace(/#.*/, '').trim();
    const [key, ...rest] = line.split(':');
    const value = rest.join(':').trim();
    const field = key.trim().toLowerCase();

    if (field === 'user-agent') {
      if (inRules) agents = [];
      inRules = false;
      agents.push(value.toLowerCase());
      groups.set(value.toLowerCase(), []);
    } else if (field === 'allow' || field === 'disallow') {
      inRules = true;
      for (const agent of agents) groups.get(agent)?.push({ allow: field === 'allow', path: value });
    }
  }
  return groups;
}

/** RFC 9309: the longest matching rule decides, `Allow` on a tie; no match allows. The file uses plain prefixes. */
function allowed(rules: Rule[], url: string): boolean {
  const matches = rules.filter(({ path }) => path && url.startsWith(path));
  if (!matches.length) return true;
  const longest = Math.max(...matches.map(({ path }) => path.length));
  return matches.some(({ path, allow }) => path.length === longest && allow);
}

/** Images pages draw and sitemaps and structured data list: avatars, badges, link-preview cards. */
const IMAGES = [
  '/api/avatar/torvalds',
  '/badge/user/torvalds/rank.svg?theme=light',
  '/badge/user/torvalds/profile-card.png?size=social',
  '/badge/repo/torvalds/linux/rank.svg?theme=light',
  '/badge/repo/torvalds/linux/rank-card.png?size=social',
  '/badge/org/vercel/org-card.svg?theme=light',
];

describe('robots.txt', () => {
  const groups = readGroups();
  const crawlers = ['googlebot', 'bingbot', 'applebot', 'yandexbot', 'oai-searchbot', '*'];

  it.each(crawlers)('lets %s fetch every image the entity pages list', (agent) => {
    const rules = groups.get(agent);

    expect(rules?.length).toBeGreaterThan(0);
    for (const image of IMAGES) {
      expect(allowed(rules ?? [], image), image).toBe(true);
    }
  });

  it.each(crawlers)("keeps %s out of the builder's states and its data", (agent) => {
    const rules = groups.get(agent) ?? [];

    expect(allowed(rules, '/badge/builder?repo=torvalds/linux')).toBe(false);
    expect(allowed(rules, '/api/badge/v3/repo/torvalds/linux')).toBe(false);
    expect(allowed(rules, '/badge/builder')).toBe(true);
  });
});
