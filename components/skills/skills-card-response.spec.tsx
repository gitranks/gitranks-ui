import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const { drawSkillsCard, oldLearnCardResponse, skillsCardResponse } = await import('./skills-card-response');
const { SkillsShareCard } = await import('./skills-share-card');

import {
  bothPage,
  contributorPage,
  firstFixPage,
  firstLessonPage,
  learnerPage,
} from '@/lib/skills/__fixtures__/skills';
import type { SkillsBrief } from '@/lib/skills/skills.types';
import type { SkillsCardRead } from '@/lib/skills/skills-card.data';
import { type SkillsCard, skillsCardOf, skillsCardUrlOf } from '@/lib/skills/skills-share-card';

const LONG_DASH = String.fromCodePoint(0x2014);
const LONG_LOGIN = 'a-very-long-github-login-of-39-chars-xy';

const briefOf = (page: SkillsBrief): SkillsBrief => ({ login: page.login, numbers: page.numbers });
const reading =
  (brief: SkillsBrief | null, extra: Partial<SkillsCardRead> = {}) =>
  async (): Promise<SkillsCardRead> => ({ brief, failed: false, ...extra });
const png = async () => new Uint8Array([1, 2, 3]);
const cardOf = (page: SkillsBrief) => skillsCardOf(page) as SkillsCard;
const bare = (page: SkillsBrief): SkillsBrief => ({
  login: page.login,
  numbers: { ...page.numbers, blockFigures: [] },
});

/** A PNG's width and height, from its header. */
const sizeOf = (bytes: Uint8Array) => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
};

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

describe('the Skills picture', () => {
  it('draws the sentence by kind, the figures and the address, with no zero and no long dash', () => {
    const html = text(renderToStaticMarkup(<SkillsShareCard card={cardOf(contributorPage)} />));
    expect(html).toBe(
      'gitranks SKILLS @octocat fixes real issues in open-source projects 5 fixes merged 41 days active 4 said a fix helped gitranks.com/profile/octocat/skills',
    );
    expect(text(renderToStaticMarkup(<SkillsShareCard card={cardOf(learnerPage)} />))).toContain(
      '@octocat is learning from real open-source fixes 103 lessons learned 2 mastered 64 days active',
    );
    const both = text(renderToStaticMarkup(<SkillsShareCard card={cardOf(bothPage)} />));
    expect(both).toContain('@octocat fixes real open-source issues and learns from them');
    expect(text(renderToStaticMarkup(<SkillsShareCard card={cardOf(firstFixPage)} />))).toContain(
      '1 fix merged 3 days active Claude Code AI agent used',
    );
    expect(both).not.toContain(LONG_DASH);
    expect(both).not.toMatch(/(^|\s)0(\s|$)/);
  });

  it('is drawn at 1200 × 630, a long login too', async () => {
    expect(sizeOf(await drawSkillsCard(cardOf(contributorPage)))).toEqual({ width: 1200, height: 630 });
    const long = cardOf({ ...briefOf(firstLessonPage), login: LONG_LOGIN });
    expect(sizeOf(await drawSkillsCard(long))).toEqual({ width: 1200, height: 630 });
  }, 30_000);

  it('draws a public page under its stored login and version, kept as a lesson picture is', async () => {
    const card = cardOf(contributorPage);
    const response = await skillsCardResponse(
      'octocat',
      skillsCardUrlOf(card).slice(skillsCardUrlOf(card).indexOf('?')),
      reading(briefOf(contributorPage)),
      png,
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/png');
    expect(response.headers.get('cache-control')).toBe('public, max-age=300');
  });

  it('sends any other query, and another spelling of the login, to its current address, kept nowhere', async () => {
    const url = skillsCardUrlOf(cardOf(contributorPage));
    const version = url.slice(url.indexOf('?'));
    for (const [login, search] of [
      ['octocat', ''],
      ['octocat', '?v=x'],
      ['octocat', `${version}&x=1`],
      ['OctoCat', version],
    ]) {
      const response = await skillsCardResponse(login, search, reading(briefOf(contributorPage)), png);
      expect(response.status, `${login}${search}`).toBe(308);
      expect(response.headers.get('location')).toBe(url);
      expect(response.headers.get('cache-control')).toBe('private, no-store');
    }
  });

  it('is not found for no public page, a page with nothing to draw, and anything that is not a login', async () => {
    for (const [login, read] of [
      ['octocat', reading(null)],
      ['octocat', reading(bare(learnerPage))],
      ['not a login', reading(briefOf(contributorPage))],
    ] as const) {
      const response = await skillsCardResponse(login, '?v=x', read, png);
      expect([response.status, response.headers.get('cache-control')], login).toEqual([404, 'private, no-store']);
    }
  });

  it('answers 503 for a minute when the page or the drawing fails, never a broken picture', async () => {
    const failed = await skillsCardResponse('octocat', '?v=x', reading(null, { failed: true }), png);
    expect([failed.status, failed.headers.get('retry-after')]).toEqual([503, '60']);
    const thrown = await skillsCardResponse(
      'octocat',
      '?v=x',
      async () => {
        throw new Error('down');
      },
      png,
    );
    expect(thrown.status).toBe(503);
    const url = skillsCardUrlOf(cardOf(contributorPage));
    vi.spyOn(console, 'error').mockImplementationOnce(() => undefined);
    const broken = await skillsCardResponse(
      'octocat',
      url.slice(url.indexOf('?')),
      reading(briefOf(contributorPage)),
      async () => {
        throw new Error('no font');
      },
    );
    expect(broken.status).toBe(503);
  });
});

describe('the old Learn picture', () => {
  it('answers the Skills picture itself at its own address, whatever its query, kept as the new picture is', async () => {
    let drawn: SkillsCard | null = null;
    const response = await oldLearnCardResponse('octocat', reading(briefOf(contributorPage)), async (card) => {
      drawn = card;
      return png();
    });
    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
    expect(response.headers.get('content-type')).toBe('image/png');
    expect(response.headers.get('cache-control')).toBe('public, max-age=300');
    expect(drawn).toEqual(cardOf(contributorPage));
  });

  it('is not found where there is no public page, and 503 when it cannot be read', async () => {
    const none = await oldLearnCardResponse('octocat', reading(null));
    expect([none.status, none.headers.get('cache-control')]).toEqual([404, 'private, no-store']);
    const empty = await oldLearnCardResponse('octocat', reading(bare(learnerPage)));
    expect(empty.status).toBe(404);
    expect((await oldLearnCardResponse('not a login', reading(briefOf(contributorPage)))).status).toBe(404);
    expect((await oldLearnCardResponse('octocat', reading(null, { failed: true }))).status).toBe(503);
  });
});
