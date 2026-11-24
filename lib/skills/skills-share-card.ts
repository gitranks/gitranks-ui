import { skillsCardPath, skillsPath } from './paths';
import type { SkillsBrief, SkillsFigureKey, SkillsKind } from './skills.types';
import { figureWordsOf, shownFigures } from './skills-figures';

/*
 * The picture a posted link to a Skills page shows: one sentence about the person by kind, the block's figures (three
 * at most) and the page's address. Pure, from the public answer alone, so the card, the page's metadata and the
 * design catalogue use the same rules. No zero.
 */

/** A figure as the picture draws it: the big text and its label. A name (the agent) is not in mono. */
export type SkillsCardFigure = { key: SkillsFigureKey; value: string; label: string; mono: boolean };

/** What the picture draws. */
export type SkillsCard = { login: string; sentence: string; figures: SkillsCardFigure[]; address: string };

/** What the sentence says after the login, by kind. */
const SENTENCES: Record<SkillsKind, string> = {
  CONTRIBUTOR: 'fixes real issues in open-source projects',
  LEARNER: 'is learning from real open-source fixes',
  BOTH: 'fixes real open-source issues and learns from them',
};

/** The sentence after the login, by kind. */
export const skillsCardSentenceOf = (kind: SkillsKind) => SENTENCES[kind];

/** The address printed on the picture: the page, without the scheme. */
export const skillsCardAddressOf = (login: string) => `gitranks.com${skillsPath(login)}`;

/** The most figures a picture draws: the block's. */
const MOST_FIGURES = 3;

/** The picture of a public page; null when it has no figure to draw, so the picture is not served. */
export function skillsCardOf(brief: Pick<SkillsBrief, 'login' | 'numbers'>): SkillsCard | null {
  const { numbers } = brief;
  const figures = shownFigures(numbers.blockFigures)
    .slice(0, MOST_FIGURES)
    .map((figure): SkillsCardFigure => {
      const words = figureWordsOf(figure, numbers.kind, numbers.fixes);
      return { key: figure.key, value: words.value, label: words.label, mono: words.mono };
    });
  if (!figures.length) return null;
  return {
    login: brief.login,
    sentence: skillsCardSentenceOf(numbers.kind),
    figures,
    address: skillsCardAddressOf(brief.login),
  };
}

/** The sentence's size: smaller in two steps for a long login (39 characters at most), so nothing is cut. */
export const skillsCardSentenceSize = (login: string) => (login.length > 28 ? 44 : login.length > 16 ? 52 : 60);

/** The address's size: smaller for a long login, so it keeps to one line. */
export const skillsCardAddressSize = (login: string) => (login.length > 24 ? 20 : 24);

/** The picture's alt text: the sentence, as running text writes it. */
export const skillsCardAltOf = (card: Pick<SkillsCard, 'login' | 'sentence'>) => `${card.login} ${card.sentence}`;

/** A short, stable hash of a text (32-bit FNV-1a), in base 36. */
function hashOf(text: string): string {
  let hash = 0x811c9dc5;
  for (let at = 0; at < text.length; at++) {
    hash ^= text.charCodeAt(at);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(36);
}

/** A picture's version: a hash of everything it draws. A change to any of it is a new address a site fetches again. */
export function skillsCardVersionOf(card: SkillsCard): string {
  const figures = card.figures.map((figure) => `${figure.value} ${figure.label}`);
  return hashOf(['skills', card.login, card.sentence, ...figures, card.address].join('\n'));
}

/** The picture under its one current address. */
export const skillsCardUrlOf = (card: SkillsCard) => `${skillsCardPath(card.login)}?v=${skillsCardVersionOf(card)}`;
