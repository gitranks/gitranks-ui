import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

// The site's address, read once as the modules load, is the same wherever the spec runs.
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_URI = 'https://gitranks.com';
});

import { SkillsBlock } from './skills-block';
import { SkillsPageView } from './skills-page-view';
import { SkillsStart } from './skills-start';
import { SkillsStrip } from './skills-strip';
import {
  bothPage,
  contributorPage,
  firstFixPage,
  firstLessonPage,
  learnerPage,
  longPage,
  SKILLS_LOGIN,
  SKILLS_NOW,
  skillsMine,
} from '@/lib/skills/__fixtures__/skills';
import { skillsMetadataOf } from '@/lib/skills/seo';
import type { SkillsMine, SkillsPage } from '@/lib/skills/skills.types';
import { skillsMarkdownOf } from '@/lib/skills/skills-markdown';
import { otherBoxOf } from '@/lib/skills/skills-owner';
import { skillsCardOf } from '@/lib/skills/skills-share-card';

/*
 * A Skills page with nothing of Build in its answer, compared with the page served before Build's "Built" section came,
 * byte for byte: the page, the owner's view of it, the profile's block, the Markdown copy, the share picture and the
 * metadata. Until Build is open to everyone the API sends every public page that way, so everyone gets exactly
 * today's page. `__fixtures__/skills-today.json` keeps each case's SHA-256; to save them again after a change made on
 * purpose to today's page, run this spec with `WRITE_TODAY=1`.
 */

const PAGES: [name: string, page: SkillsPage][] = [
  ['contributor', contributorPage],
  ['first fix', firstFixPage],
  ['learner', learnerPage],
  ['first lesson', firstLessonPage],
  ['both', bothPage],
  ['long', longPage],
];

const MINES: [name: string, mine: SkillsMine][] = Object.entries(skillsMine);

const hashOf = (text: string) => createHash('sha256').update(text).digest('hex');

/** Every case's text, by name. */
function casesOf(): Record<string, string> {
  const cases: Record<string, string> = {};
  for (const [name, page] of PAGES) {
    cases[`page: ${name}`] = renderToStaticMarkup(<SkillsPageView page={page} now={SKILLS_NOW} />);
    cases[`block: ${name}`] = renderToStaticMarkup(<SkillsBlock login={SKILLS_LOGIN} numbers={page.numbers} />);
    cases[`markdown: ${name}`] = skillsMarkdownOf(page, { now: SKILLS_NOW });
    cases[`card: ${name}`] = JSON.stringify(skillsCardOf(page));
    cases[`metadata: ${name}`] = JSON.stringify(skillsMetadataOf(page, { name: 'The Octocat' }));
  }
  for (const [name, mine] of MINES) {
    const strip = <SkillsStrip mine={mine} href="/profile/octocat/skills" onHide={() => {}} onShow={() => {}} />;
    cases[`owner: ${name}`] = mine.page
      ? renderToStaticMarkup(
          <SkillsPageView page={mine.page} now={SKILLS_NOW} strip={strip} other={otherBoxOf(mine)} />,
        )
      : renderToStaticMarkup(
          <>
            {strip}
            <SkillsStart mine={mine} />
          </>,
        );
  }
  return cases;
}

const FILE = join(import.meta.dirname, '__fixtures__', 'skills-today.json');

describe("a Skills page with nothing of Build is today's page", () => {
  if (process.env.WRITE_TODAY) {
    it('saves the markup', () => {
      const today = Object.fromEntries(Object.entries(casesOf()).map(([name, text]) => [name, hashOf(text)]));
      writeFileSync(FILE, `${JSON.stringify(today, null, 2)}\n`);
    });
    return;
  }

  const today = JSON.parse(readFileSync(FILE, 'utf8')) as Record<string, string>;
  const cases = casesOf();

  it('has every case saved', () => {
    expect(Object.keys(cases).sort()).toEqual(Object.keys(today).sort());
  });

  it.each(Object.keys(today))('%s, byte for byte', (name) => {
    expect(hashOf(cases[name] ?? '')).toBe(today[name]);
  });

  it('names nothing of Build', () => {
    for (const text of Object.values(cases)) {
      expect(text).not.toContain('/build');
      expect(text).not.toContain('GitRanks Build');
      expect(text).not.toMatch(/\bBuilt\b|projects? built/);
    }
  });
});
