import type { ContributorsWall } from './facts';

/** A contributors wall: 14 avatars a row of 36 px with 6 px gaps, 800 px wide (spec §3.8). */
export const WALL_COLUMNS = 14;
export const WALL_AVATAR = 36;
export const WALL_GAP = 6;
export const WALL_WIDTH = 800;

/**
 * How a wall lays out for the rows asked: the people it shows, its rows, how many it leaves to "and N more", and its
 * drawing size. Shared by the drawing and by pages that reserve its space.
 */
export function wallLayout(wall: ContributorsWall, rowsAsked: number) {
  const shown = wall.entries.slice(0, WALL_COLUMNS * rowsAsked);
  const rows = Math.ceil(shown.length / WALL_COLUMNS);
  const more = Math.max(0, wall.total - shown.length);
  // Padding, eyebrow, grid, footer lines.
  const height = 21 + 16 + 16 + rows * WALL_AVATAR + (rows - 1) * WALL_GAP + 16 + 18 + (more ? 20 : 0) + 21;
  return { shown, rows, more, width: WALL_WIDTH, height };
}
