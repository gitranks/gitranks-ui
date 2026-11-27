import type { CodeToken, HighlightedCode } from '@/lib/workspace/code-tokens';

/*
 * A step's changed file as its page draws it: the unified diff the API sends, read into lines, and the rows the page
 * shows, with the runs of lines that did not change folded into one row each, and a long run of removed lines folded
 * after its first few.
 */

/** One line of a diff: kept, added or removed, with its number in the file before and after the step. */
export type DiffLine = {
  kind: 'context' | 'added' | 'removed';
  text: string;
  /** Its number in the file before the step; null for an added line. */
  old: number | null;
  /** Its number in the file after the step; null for a removed line. */
  new: number | null;
  /** Its place among the lines of the file before (kept and removed), in the diff's order: the old side's code. */
  before: number | null;
};

/** One hunk: where it starts on each side, and its lines. */
export type DiffHunk = { oldStart: number; newStart: number; lines: DiffLine[] };

const HUNK = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/;

/**
 * The hunks of a unified diff. The file headers (`---`, `+++`) and "No newline at end of file" are skipped. A hunk ends
 * when its counts are met, so a removed line that reads like a header stays a line; a kept line written with no
 * leading space (an empty line some writers send as nothing) is a kept empty line.
 */
export function parseDiff(diff: string): DiffHunk[] {
  const hunks: DiffHunk[] = [];
  const lines = diff.replace(/\r\n?/g, '\n').split('\n');
  let index = 0;
  let before = 0;
  while (index < lines.length) {
    const head = HUNK.exec(lines[index]);
    index += 1;
    if (!head) continue;
    const oldStart = Number(head[1]);
    const newStart = Number(head[3]);
    let oldLeft = head[2] === undefined ? 1 : Number(head[2]);
    let newLeft = head[4] === undefined ? 1 : Number(head[4]);
    let oldNo = oldStart;
    let newNo = newStart;
    const hunk: DiffHunk = { oldStart, newStart, lines: [] };
    while (index < lines.length && (oldLeft > 0 || newLeft > 0)) {
      const line = lines[index];
      index += 1;
      if (line.startsWith('\\')) continue;
      const mark = line[0];
      const text = line.slice(1);
      if (mark === '+' && newLeft > 0) {
        hunk.lines.push({ kind: 'added', text, old: null, new: newNo, before: null });
        newNo += 1;
        newLeft -= 1;
      } else if (mark === '-' && oldLeft > 0) {
        hunk.lines.push({ kind: 'removed', text, old: oldNo, new: null, before });
        before += 1;
        oldNo += 1;
        oldLeft -= 1;
      } else if ((mark === ' ' || line === '') && oldLeft > 0 && newLeft > 0) {
        hunk.lines.push({ kind: 'context', text, old: oldNo, new: newNo, before });
        before += 1;
        oldNo += 1;
        newNo += 1;
        oldLeft -= 1;
        newLeft -= 1;
      } else {
        // A line the counts do not allow: the hunk is cut short here.
        index -= 1;
        break;
      }
    }
    hunks.push(hunk);
  }
  return hunks;
}

/** How many lines a diff added and removed. */
export function diffCountsOf(hunks: readonly DiffHunk[]): { added: number; removed: number } {
  let added = 0;
  let removed = 0;
  for (const hunk of hunks) {
    for (const line of hunk.lines) {
      if (line.kind === 'added') added += 1;
      else if (line.kind === 'removed') removed += 1;
    }
  }
  return { added, removed };
}

/** The code of the file before the step that the diff shows (its kept and removed lines, in order), for the highlighter. */
export const beforeCodeOf = (hunks: readonly DiffHunk[]): string =>
  hunks
    .flatMap((hunk) => hunk.lines.filter((line) => line.kind !== 'added'))
    .map((line) => line.text)
    .join('\n');

/** The numbers of the lines a diff added, in the file after the step. */
export const addedLinesOf = (hunks: readonly DiffHunk[]): Set<number> =>
  new Set(hunks.flatMap((hunk) => hunk.lines.flatMap((line) => (line.kind === 'added' && line.new ? [line.new] : []))));

/** Where a run of lines that did not change sits: before the first change, between two, or after the last. */
export type UnchangedPlace = 'above' | 'between' | 'below';

/**
 * A row of a file's diff: a line; a run of lines that did not change (`from` to `to`, numbers in the file after the
 * step); or the rest of a long run of removed lines.
 */
export type DiffRow =
  | { kind: 'line'; line: DiffLine }
  | { kind: 'unchanged'; id: string; place: UnchangedPlace; from: number; to: number }
  | { kind: 'more-removed'; id: string; lines: DiffLine[] };

/** A run of removed lines longer than this shows its first `REMOVED_SHOWN` lines, then one row for the rest. */
export const REMOVED_FOLD_OVER = 5;
export const REMOVED_SHOWN = 3;

/**
 * The rows a file's diff shows. `lineCount`: how many lines the file has after the step, to count the lines below the
 * last change; null when not known (a removed file), and nothing is said below.
 */
export function diffRowsOf(hunks: readonly DiffHunk[], lineCount: number | null): DiffRow[] {
  const rows: DiffRow[] = [];
  let lastNew = 0;
  hunks.forEach((hunk, at) => {
    const firstNew = hunk.lines.find((line) => line.new !== null)?.new ?? hunk.newStart;
    if (firstNew - 1 > lastNew) {
      rows.push({
        kind: 'unchanged',
        id: `u${at}`,
        place: at === 0 ? 'above' : 'between',
        from: lastNew + 1,
        to: firstNew - 1,
      });
    }
    let run: DiffLine[] = [];
    const flush = () => {
      if (run.length > REMOVED_FOLD_OVER) {
        for (const line of run.slice(0, REMOVED_SHOWN)) rows.push({ kind: 'line', line });
        rows.push({ kind: 'more-removed', id: `r${at}-${run[0].old}`, lines: run.slice(REMOVED_SHOWN) });
      } else {
        for (const line of run) rows.push({ kind: 'line', line });
      }
      run = [];
    };
    for (const line of hunk.lines) {
      if (line.kind === 'removed') {
        run.push(line);
        continue;
      }
      flush();
      rows.push({ kind: 'line', line });
      if (line.new !== null) lastNew = line.new;
    }
    flush();
  });
  if (lineCount !== null && lineCount > lastNew && hunks.length) {
    rows.push({ kind: 'unchanged', id: 'below', place: 'below', from: lastNew + 1, to: lineCount });
  }
  return rows;
}

/** What a folded run of lines says. */
export function unchangedWordsOf(place: UnchangedPlace, count: number): string {
  const lines = count === 1 ? '1 line' : `${count} lines`;
  if (place === 'above') return `${lines} above did not change`;
  if (place === 'below') return `${lines} below did not change`;
  return `${lines} did not change`;
}

/** What the rest of a long run of removed lines says. */
export const moreRemovedWordsOf = (count: number) =>
  count === 1 ? '1 more removed line' : `${count} more removed lines`;

/** How many lines a text has, as a file's lines are counted: a last line end ends the last line. */
export const lineCountOf = (text: string): number => {
  if (!text) return 0;
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  return lines.at(-1) === '' ? lines.length - 1 : lines.length;
};

/** The code of a file, highlighted, for each of its two sides, so a page draws each line in colour. */
export type BuildFileCode = {
  path: string;
  /** The whole file after the step; null for a removed file. */
  after: HighlightedCode | null;
  /** The lines of the file before the step that the diff shows, in order (`DiffLine.before`). */
  before: HighlightedCode | null;
};

/** The highlighted code of each changed file of a step, in each language. */
export type BuildStepCodes = { language: string; files: BuildFileCode[] }[];

/**
 * A diff line's tokens: a line of the file after the step from its whole highlighted text, a removed one from the
 * highlighted old side; the line's own text, uncoloured, when neither has it.
 */
export function tokensOfLine(line: DiffLine, code: BuildFileCode | null): CodeToken[] {
  const same = (tokens: CodeToken[] | undefined): tokens is CodeToken[] =>
    !!tokens && tokens.map((token) => token.text).join('') === line.text;
  const after = line.new !== null ? code?.after?.lines[line.new - 1] : undefined;
  if (line.kind !== 'removed' && same(after)) return after;
  const before = line.before !== null ? code?.before?.lines[line.before] : undefined;
  if (same(before)) return before;
  return line.text ? [{ text: line.text }] : [];
}
