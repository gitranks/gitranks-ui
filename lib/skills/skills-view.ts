import type { SkillsBuilt, SkillsFixes, SkillsMine, SkillsPage, SkillsState } from './skills.types';

/*
 * What a Skills address draws once its owner's view is in, and how "Show 20 more" adds rows. Pure: the page's two
 * layers decide from these alone.
 */

/**
 * The owner's layer over a Skills address:
 * - `none`: not the owner, or their view could not be read: the address stays as everyone sees it;
 * - `strip`: a page everyone sees: the strip above it and, last, the box about the other product;
 * - `own`: no public page here: their own page takes the place of the "no Skills page" end, with its strip;
 * - `start`: nothing on the page yet: the strip and what fills it.
 */
export type OwnerLayer =
  | { kind: 'none' }
  | { kind: 'strip'; mine: SkillsMine }
  | { kind: 'own'; mine: SkillsMine; page: SkillsPage }
  | { kind: 'start'; mine: SkillsMine };

const EMPTY: readonly SkillsState[] = ['NEW', 'NOTHING_YET'];

/**
 * The layer for the owner's view, on an address that shows the public page (`publicPage`) or the "no Skills page" end.
 * A public page stays as it is under the strip whatever the view's state, so hiding and showing change only the strip.
 */
export function ownerLayerOf(mine: SkillsMine | null, publicPage: boolean): OwnerLayer {
  if (!mine) return { kind: 'none' };
  if (EMPTY.includes(mine.state)) return { kind: 'start', mine };
  if (publicPage) return { kind: 'strip', mine };
  return mine.page ? { kind: 'own', mine, page: mine.page } : { kind: 'none' };
}

/**
 * The Built rows a public page draws: its own, or, while the public answer has none, the owner's own rows from their
 * view (`layer`). Until Build is open to everyone only its owner's view carries their built projects, and only to them.
 */
export function builtShownOf(page: Pick<SkillsPage, 'built'>, layer: OwnerLayer): SkillsBuilt[] {
  const own = page.built ?? [];
  if (own.length || layer.kind !== 'strip') return own;
  return layer.mine.page?.built ?? own;
}

/** The owner's view after hiding or showing: the API's answer, with the tab's mark as this browser knows it. */
export const mineAfterOf = (before: SkillsMine, after: SkillsMine | null): SkillsMine =>
  after ? { ...after, tabNew: before.tabNew } : before;

/**
 * The fixes after "Show 20 more": the rows shown, then the new ones not shown yet (a fix merged in between can move
 * between pages), with the new total and cursor.
 */
export function moreFixesAfter(shown: SkillsFixes, next: SkillsFixes): SkillsFixes {
  const key = (fix: SkillsFixes['rows'][number]) => `${fix.repo.toLowerCase()}#${fix.number}`;
  const seen = new Set(shown.rows.map(key));
  return {
    rows: [...shown.rows, ...next.rows.filter((fix) => !seen.has(key(fix)))],
    total: next.total,
    next: next.next,
  };
}
