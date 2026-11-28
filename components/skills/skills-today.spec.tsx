import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { type DocumentNode, print } from 'graphql';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

// The site's address, read once as the modules load, is the same wherever the spec runs.
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_URI = 'https://gitranks.com';
});

const api = vi.hoisted(() => ({ page: null as unknown }));
vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ cacheLife: () => {}, cacheTag: () => {} }));
// The API's answer for a person with no build: a document that asks the Built rows gets none.
vi.mock('@/lib/graphql/graphql-direct', () => ({
  graphqlDirect: async (document: DocumentNode) => {
    const page = api.page as Record<string, unknown>;
    return { skillsPage: /\bbuilt\s*\{/.test(print(document)) ? { ...page, built: [] } : page };
  },
}));
// A visitor, signed out: the public screen as the route serves it.
vi.mock('next-auth/react', () => ({ useSession: () => ({ data: null, status: 'unauthenticated' }) }));
vi.mock('@/app/profile/[login]/components/skills-hidden.actions', () => ({ setSkillsHiddenAction: () => {} }));

const { SkillsScreen } = await import('@/app/profile/[login]/components/skills-screen');
const { SkillsBlock } = await import('./skills-block');
const { SkillsPageView } = await import('./skills-page-view');
const { SkillsStart } = await import('./skills-start');
const { SkillsStrip } = await import('./skills-strip');
const fixtures = await import('@/lib/skills/__fixtures__/skills');
const { skillsMetadataOf } = await import('@/lib/skills/seo');
const { loadSkillsPage } = await import('@/lib/skills/skills.data');
const { skillsMarkdownOf } = await import('@/lib/skills/skills-markdown');
const { otherBoxOf } = await import('@/lib/skills/skills-owner');
const { skillsCardOf } = await import('@/lib/skills/skills-share-card');

type Page = typeof fixtures.contributorPage;
type Mine = (typeof fixtures.skillsMine)[keyof typeof fixtures.skillsMine];

/*
 * A Skills page with nothing of Build in its answer (a person with no build), compared with the page served before
 * Build's "Built" section came, byte for byte: the page's data as the route hands it to the browser, the screen it
 * serves, the page with "Show 20 more", the owner's view of it, the profile's block, the Markdown copy, the share
 * picture and the metadata. Only the owner's page with nothing on it yet names Build: its three boxes.
 * `__fixtures__/skills-today.json` keeps each case's SHA-256; to save them again after a change made on purpose to
 * today's page, run this spec with `WRITE_TODAY=1`.
 */

const PAGES: [name: string, page: Page][] = [
  ['contributor', fixtures.contributorPage],
  ['first fix', fixtures.firstFixPage],
  ['learner', fixtures.learnerPage],
  ['first lesson', fixtures.firstLessonPage],
  ['both', fixtures.bothPage],
  ['long', fixtures.longPage],
];

const MINES: [name: string, mine: Mine][] = Object.entries(fixtures.skillsMine);

const hashOf = (text: string) => createHash('sha256').update(text).digest('hex');
const noop = () => {};

/** Every case's text, by name. */
async function casesOf(): Promise<Record<string, string>> {
  const cases: Record<string, string> = {};
  const now = fixtures.SKILLS_NOW;
  for (const [name, fixture] of PAGES) {
    api.page = fixture;
    const read = await loadSkillsPage(fixtures.SKILLS_LOGIN);
    const page = read.value as Page;
    cases[`data: ${name}`] = JSON.stringify(read);
    cases[`screen: ${name}`] = renderToStaticMarkup(
      <SkillsScreen login={fixtures.SKILLS_LOGIN} page={page} now={now} />,
    );
    cases[`page: ${name}`] = renderToStaticMarkup(<SkillsPageView page={page} now={now} onMore={noop} />);
    cases[`block: ${name}`] = renderToStaticMarkup(
      <SkillsBlock login={fixtures.SKILLS_LOGIN} numbers={page.numbers} />,
    );
    cases[`markdown: ${name}`] = skillsMarkdownOf(page, { now });
    cases[`card: ${name}`] = JSON.stringify(skillsCardOf(page));
    cases[`metadata: ${name}`] = JSON.stringify(skillsMetadataOf(page, { name: 'The Octocat' }));
  }
  for (const [name, mine] of MINES) {
    const strip = <SkillsStrip mine={mine} href="/profile/octocat/skills" onHide={noop} onShow={noop} />;
    if (mine.page) {
      cases[`owner: ${name}`] = renderToStaticMarkup(
        <SkillsPageView page={mine.page} now={now} strip={strip} other={otherBoxOf(mine)} />,
      );
    } else {
      cases[`owner start: ${name}`] = renderToStaticMarkup(
        <>
          {strip}
          <SkillsStart mine={mine} />
        </>,
      );
    }
  }
  return cases;
}

const FILE = join(import.meta.dirname, '__fixtures__', 'skills-today.json');

describe("a Skills page with nothing of Build is today's page", () => {
  if (process.env.WRITE_TODAY) {
    it('saves the markup', async () => {
      const cases = await casesOf();
      const today = Object.fromEntries(Object.entries(cases).map(([name, text]) => [name, hashOf(text)]));
      writeFileSync(FILE, `${JSON.stringify(today, null, 2)}\n`);
    });
    return;
  }

  const today = JSON.parse(readFileSync(FILE, 'utf8')) as Record<string, string>;
  const cases = casesOf();

  it('has every case saved', async () => {
    expect(Object.keys(await cases).sort()).toEqual(Object.keys(today).sort());
  });

  it.each(Object.keys(today))('%s, byte for byte', async (name) => {
    expect(hashOf((await cases)[name] ?? '')).toBe(today[name]);
  });

  it("names nothing of Build but on the owner's page with nothing on it yet", async () => {
    for (const [name, text] of Object.entries(await cases)) {
      if (name.startsWith('owner start: ')) continue;
      expect(text).not.toContain('/build');
      expect(text).not.toContain('GitRanks Build');
      expect(text).not.toMatch(/\bBuilt\b|projects? built|"built"/);
    }
  });

  it('draws "Show 20 more" for a long list', async () => {
    expect((await cases)['page: long']).toContain('Show 20 more');
    expect((await cases)['screen: long']).toContain('Show 20 more');
  });
});
