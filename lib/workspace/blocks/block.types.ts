/**
 * A lesson's drawn blocks (text, a diagram, a diff, code, a before-and-after, a table), as the API answers them: the
 * shape the shared block renderer draws.
 */

export type LessonBlockType = 'TEXT' | 'DIAGRAM' | 'DIFF' | 'CODE' | 'COMPARE' | 'TABLE';
export type LessonDiffLineKind = 'HUNK' | 'CTX' | 'ADD' | 'DEL';
export type LessonDiagramTone = 'PLAIN' | 'ACCENT' | 'WARN';
/** How a diagram is drawn: boxes and arrows, or a call sequence (actors left to right, calls top to bottom). */
export type LessonDiagramLayout = 'FLOW' | 'SEQUENCE';
/** What the two sides of a before-and-after are: small diagrams, or code excerpts. */
export type LessonCompareOf = 'DIAGRAM' | 'CODE';
export type LessonDiagramNode = {
  id: string;
  label: string;
  sub: string | null;
  tone: LessonDiagramTone;
  mono: boolean;
};
/**
 * An arrow, or in a sequence a call: `label` is drawn on it (a call's code, or what comes back), `reply` is a dashed
 * arrow back, `tone` ACCENT marks what the fix changed and WARN what is broken.
 */
export type LessonDiagramEdge = {
  from: string;
  to: string;
  label: string | null;
  reply: boolean;
  tone: LessonDiagramTone;
};
/** One side of a before-and-after: a small diagram's nodes and edges, or a code excerpt. */
export type LessonCompareSide = {
  nodes: LessonDiagramNode[] | null;
  edges: LessonDiagramEdge[] | null;
  path: string | null;
  fromLine: number | null;
  toLine: number | null;
  excerpt: string | null;
};
export type LessonDiffLine = { kind: LessonDiffLineKind; text: string };

/** One block of a step; the fields its type uses are set, the rest null. */
export type LessonBlock = {
  type: LessonBlockType;
  text: string | null;
  nodes: LessonDiagramNode[] | null;
  edges: LessonDiagramEdge[] | null;
  caption: string | null;
  /** A diagram's drawing: FLOW when the lesson gives none. */
  layout: LessonDiagramLayout | null;
  file: string | null;
  lines: LessonDiffLine[] | null;
  /** Indexes into `lines`: the lines to ring. */
  mark: number[] | null;
  repo: string | null;
  commit: string | null;
  path: string | null;
  fromLine: number | null;
  toLine: number | null;
  excerpt: string | null;
  /** A before-and-after: what its sides are, and the two sides (code: the file at `commit`, then after the fix). */
  compareOf: LessonCompareOf | null;
  before: LessonCompareSide | null;
  after: LessonCompareSide | null;
  /** A table: its heads, its rows (one cell per column, plain text with `code` spans), the index of the row to ring. */
  columns: string[] | null;
  rows: string[][] | null;
  ring: number | null;
};
