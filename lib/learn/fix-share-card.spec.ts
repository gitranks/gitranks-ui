import { describe, expect, it, vi } from 'vitest';

import { longFix, mergedFix, noLessonFix, openFix } from './__fixtures__/fix-share';
import {
  fixCardAddressOf,
  fixCardAddressSize,
  fixCardAgentOf,
  fixCardDayOf,
  fixCardEyebrowOf,
  fixCardProjectOf,
  fixCardProjectSize,
  fixCardStatusOf,
  fixCardTitleOf,
  fixCardTitleSize,
  fixCardUrlOf,
  fixCardVersionOf,
  fixPreviewOf,
  fixShareDescriptionOf,
  fixShareTitleOf,
  hasFixCard,
} from './fix-share-card';

// The site's address is read once, as the module loads: vitest runs this before the imports.
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_URI = 'https://gitranks.com';
});

const LONG_DASH = String.fromCodePoint(0x2014);

describe("a fix's picture", () => {
  it('is drawn for a merged or an open pull request, never a closed one', () => {
    expect(hasFixCard(mergedFix)).toBe(true);
    expect(hasFixCard(openFix)).toBe(true);
    expect(hasFixCard({ state: 'CLOSED' })).toBe(false);
  });

  it('says its state, the project and the issue, and who fixed it with which agent', () => {
    expect(fixCardEyebrowOf(mergedFix)).toBe('Fix merged');
    expect(fixCardEyebrowOf(openFix)).toBe('Pull request open');
    expect(fixCardProjectOf(mergedFix)).toBe('harbor-kit/relay #431');
    expect(fixCardAgentOf(mergedFix)).toBe('with Claude Code');
    expect(fixCardAgentOf({ agent: null })).toBeNull();
    expect(fixCardAgentOf({ agent: '  ' })).toBeNull();
  });

  it('says when it merged and the lesson it used, only when it has one and Learn may name it', () => {
    expect(fixCardStatusOf(mergedFix, true)).toEqual({ text: 'Merged on 20 Nov 2026', lesson: 'Bound every retry' });
    expect(fixCardStatusOf(mergedFix, false)).toEqual({ text: 'Merged on 20 Nov 2026', lesson: null });
    expect(fixCardStatusOf(noLessonFix, true)).toEqual({ text: 'Merged on 14 Oct 2026', lesson: null });
    expect(fixCardStatusOf({ ...mergedFix, mergedAt: null }, true).text).toBe('Merged');
    expect(fixCardStatusOf(openFix, true)).toEqual({ text: 'Waiting for the project’s review', lesson: null });
  });

  it('writes a day in UTC with its year, and nothing for a time it cannot read', () => {
    expect(fixCardDayOf('2026-11-20T23:30:00.000Z')).toBe('20 Nov 2026');
    expect(fixCardDayOf('not a time')).toBeNull();
    expect(fixCardDayOf(null)).toBeNull();
  });

  it('keeps a long title to three lines: smaller in two steps, cut at a word past 130 characters', () => {
    expect(fixCardTitleOf(mergedFix)).toBe(mergedFix.title);
    expect(fixCardTitleOf({ title: null, number: 436 })).toBe('Pull request #436');
    expect(fixCardTitleOf({ title: '  The help\n text  ', number: 1 })).toBe('The help text');
    const long = fixCardTitleOf(longFix);
    expect(long.length).toBeLessThanOrEqual(130);
    expect(long.endsWith('every…')).toBe(true);
    expect(fixCardTitleSize('A slow client could hold a worker forever')).toBe(56);
    expect(fixCardTitleSize(mergedFix.title ?? '')).toBe(48);
    expect(fixCardTitleSize(long)).toBe(40);
  });

  it("prints its page's address, smaller for a long one, and the project smaller for a long name", () => {
    expect(fixCardAddressOf(mergedFix)).toBe('gitranks.com/contribute/pr/harbor-kit/relay/436');
    expect(fixCardAddressSize(fixCardAddressOf(mergedFix))).toBe(24);
    expect(fixCardAddressSize(fixCardAddressOf(longFix))).toBe(16);
    expect(fixCardProjectSize(fixCardProjectOf(mergedFix))).toBe(28);
    expect(fixCardProjectSize(fixCardProjectOf(longFix))).toBe(20);
  });

  it('lives beside its page under a version that changes with anything it draws', () => {
    const version = fixCardVersionOf(mergedFix, true);
    expect(version).toMatch(/^[0-9a-z]{1,7}$/);
    expect(fixCardUrlOf(mergedFix, true)).toBe(`/contribute/pr/harbor-kit/relay/436/card.png?v=${version}`);
    expect(fixCardVersionOf({ ...mergedFix }, true)).toBe(version);
    expect(fixCardVersionOf(mergedFix, false)).not.toBe(version);
    expect(fixCardVersionOf({ ...mergedFix, agent: 'Codex' }, true)).not.toBe(version);
    expect(fixCardVersionOf({ ...mergedFix, title: 'Another title' }, true)).not.toBe(version);
    expect(fixCardVersionOf({ ...mergedFix, state: 'OPEN', mergedAt: null }, true)).not.toBe(version);
    // How it was made is not drawn: it changes nothing.
    expect(fixCardVersionOf({ ...mergedFix, made: 'CONTRIBUTE' }, true)).toBe(version);
    // A fix with no lesson draws the same whether Learn is open or not.
    expect(fixCardVersionOf(noLessonFix, false)).toBe(fixCardVersionOf(noLessonFix, true));
  });
});

describe("a fix's posted link", () => {
  it('is its title, then the project and the issue, and who fixed it, how and when', () => {
    expect(fixShareTitleOf(mergedFix)).toBe(
      'The retry list grows without limit when a webhook keeps failing · harbor-kit/relay #431',
    );
    expect(fixShareDescriptionOf(mergedFix)).toBe(
      'Fixed by octocat with Claude Code, merged on 20 Nov 2026. See how the fix was made.',
    );
    expect(fixShareDescriptionOf(openFix)).toBe(
      'Fixed by octocat with Codex. Waiting for the project’s review. See how the fix was made.',
    );
    expect(fixShareDescriptionOf({ ...noLessonFix, agent: null, mergedAt: null })).toBe(
      'Fixed by octocat, merged. See how the fix was made.',
    );
    expect(fixShareTitleOf({ ...openFix, title: null })).toBe('Pull request #3925 · gin-gonic/gin #3921');
    for (const text of [fixShareTitleOf(mergedFix), fixShareDescriptionOf(openFix)]) {
      expect(text).not.toContain(LONG_DASH);
    }
  });

  it('shows the picture at 1,200 by 630, and none without a fix or for a closed one', () => {
    expect(fixPreviewOf({ fix: mergedFix, learnOpen: true })).toEqual({
      title: fixShareTitleOf(mergedFix),
      description: fixShareDescriptionOf(mergedFix),
      images: [
        {
          url: `https://gitranks.com${fixCardUrlOf(mergedFix, true)}`,
          width: 1200,
          height: 630,
          alt: 'The retry list grows without limit when a webhook keeps failing',
        },
      ],
    });
    expect(fixPreviewOf({ fix: null, learnOpen: true })).toBeNull();
    expect(fixPreviewOf({ fix: { ...mergedFix, state: 'CLOSED' }, learnOpen: true })).toBeNull();
  });
});
