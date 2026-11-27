import { describe, expect, it } from 'vitest';

import { listTheToolsStep } from './__fixtures__/step';
import { bigStep, longDiffStep, removedFileStep, smallStep } from './__fixtures__/step-cases';
import {
  addedLinesOf,
  beforeCodeOf,
  type DiffRow,
  diffCountsOf,
  diffRowsOf,
  lineCountOf,
  moreRemovedWordsOf,
  parseDiff,
  tokensOfLine,
  unchangedWordsOf,
} from './step-diff';
import type { BuildStepPage } from './types';

/** A file of a step's first language: its diff read, and its whole text after the step. */
function fileOf(page: BuildStepPage, path: string, language = 0) {
  const side = page.languages[language];
  const changed = side.changed.find((file) => file.path === path);
  if (!changed) throw new Error(`no ${path}`);
  return { hunks: parseDiff(changed.diff), text: side.files.find((file) => file.path === path)?.text ?? null };
}

/** The rows in short: a letter for each line (c, a, r), the folded runs in brackets. */
const shape = (rows: DiffRow[]) =>
  rows
    .map((row) =>
      row.kind === 'line'
        ? row.line.kind[0]
        : row.kind === 'unchanged'
          ? `[${row.place} ${row.from}-${row.to}]`
          : `[more ${row.lines.length}]`,
    )
    .join('');

describe('parseDiff', () => {
  it('reads a hunk, a kept empty line sent as nothing included, with both numbers of each line', () => {
    const [hunk, ...rest] = parseDiff(listTheToolsStep.languages[0].changed[0].diff);
    expect(rest).toEqual([]);
    expect(hunk.oldStart).toBe(1);
    expect(hunk.newStart).toBe(1);
    expect(hunk.lines.map((line) => line.kind[0]).join('')).toBe('ccaaaaaaccccracccaaacc');
    expect(hunk.lines[1]).toEqual({ kind: 'context', text: '', old: 2, new: 2, before: 1 });
    const removed = hunk.lines.find((line) => line.kind === 'removed');
    expect(removed).toMatchObject({ text: '      capabilities: {},', old: 7, new: null });
    const added = hunk.lines.filter((line) => line.kind === 'added');
    expect(added.at(-1)).toMatchObject({ text: '  }', new: 19, old: null, before: null });
  });

  it('counts what a diff added and removed', () => {
    expect(diffCountsOf(parseDiff(listTheToolsStep.languages[0].changed[0].diff))).toEqual({ added: 10, removed: 1 });
    expect(diffCountsOf(fileOf(smallStep, 'io.ts').hunks)).toEqual({ added: 1, removed: 1 });
  });

  it('reads a new file from nothing, and a removed one to nothing', () => {
    const added = fileOf(bigStep, 'tools/roll-dice.ts').hunks;
    expect(added).toHaveLength(1);
    expect(added[0].lines.every((line) => line.kind === 'added')).toBe(true);
    expect(added[0].lines.map((line) => line.new)).toEqual(Array.from({ length: 14 }, (_, at) => at + 1));
    const removed = fileOf(removedFileStep, 'log.ts').hunks;
    expect(removed[0].lines.every((line) => line.kind === 'removed')).toBe(true);
    expect(removed[0].lines.map((line) => line.before)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it('keeps a removed line that reads like a header, skips "No newline", and stops a hunk at its counts', () => {
    const diff =
      '--- a/x.ts\n+++ b/x.ts\n@@ -1,2 +1,2 @@\n--- old\n+new\n\\ No newline at end of file\n same\nnot a line\n';
    const [hunk] = parseDiff(diff);
    expect(hunk.lines.map((line) => [line.kind, line.text])).toEqual([
      ['removed', '-- old'],
      ['added', 'new'],
      ['context', 'same'],
    ]);
  });

  it('reads several hunks, numbering the old side across them', () => {
    const hunks = fileOf(bigStep, 'server.ts').hunks;
    expect(hunks.length).toBeGreaterThan(1);
    const before = hunks.flatMap((hunk) => hunk.lines.flatMap((line) => (line.before === null ? [] : [line.before])));
    expect(before).toEqual(before.map((_, at) => at));
    expect(beforeCodeOf(hunks).split('\n')).toHaveLength(before.length);
  });
});

describe('diffRowsOf', () => {
  it('folds the lines above the first change, counted from the file', () => {
    const { hunks, text } = fileOf(smallStep, 'io.ts');
    expect(shape(diffRowsOf(hunks, lineCountOf(text ?? '')))).toBe('[above 1-12]cccrac');
  });

  it('folds a run between two changes and the lines below the last, and the rest of a long run of removed lines', () => {
    const { hunks, text } = fileOf(bigStep, 'server.ts');
    expect(shape(diffRowsOf(hunks, lineCountOf(text ?? '')))).toBe(
      'crrr[more 7]aacrrraccc[between 9-12]cccraccraaaccccaaaaccc[below 33-44]',
    );
  });

  it('shows a short run of removed lines whole, and says nothing below a removed file', () => {
    expect(shape(diffRowsOf(fileOf(listTheToolsStep, 'server.ts').hunks, 21))).toBe('ccaaaaaaccccracccaaacc');
    expect(shape(diffRowsOf(fileOf(removedFileStep, 'log.ts').hunks, null))).toBe('rrr[more 4]');
  });

  it('draws a long new file whole', () => {
    const { hunks, text } = fileOf(longDiffStep, 'messages.test.ts');
    const rows = diffRowsOf(hunks, lineCountOf(text ?? ''));
    expect(rows.length).toBeGreaterThan(50);
    expect(rows.every((row) => row.kind === 'line' && row.line.kind === 'added')).toBe(true);
  });

  it('names its folds in plain words', () => {
    expect(unchangedWordsOf('above', 13)).toBe('13 lines above did not change');
    expect(unchangedWordsOf('between', 1)).toBe('1 line did not change');
    expect(unchangedWordsOf('below', 10)).toBe('10 lines below did not change');
    expect(moreRemovedWordsOf(5)).toBe('5 more removed lines');
    expect(moreRemovedWordsOf(1)).toBe('1 more removed line');
  });
});

describe('a diff line’s code', () => {
  const [hunk] = parseDiff(listTheToolsStep.languages[0].changed[0].diff);
  const added = hunk.lines[2];
  const removed = hunk.lines.find((line) => line.kind === 'removed');

  it('takes a kept or added line from the whole file, a removed one from the old side', () => {
    const code = {
      path: 'server.ts',
      after: { language: 'typescript', lines: [[], [], [{ text: 'const ROLL_DICE = {', light: '#d73a49' }]] },
      before: {
        language: 'typescript',
        lines: Array.from({ length: 13 }, (_, at) =>
          at === removed?.before ? [{ text: '      capabilities: {},', light: '#005cc5' }] : [],
        ),
      },
    };
    expect(tokensOfLine(added, code)).toEqual([{ text: 'const ROLL_DICE = {', light: '#d73a49' }]);
    expect(removed && tokensOfLine(removed, code)).toEqual([{ text: '      capabilities: {},', light: '#005cc5' }]);
  });

  it('falls back to the line’s own text when the code does not agree with it, or there is none', () => {
    const wrong = {
      path: 'server.ts',
      after: { language: 'typescript', lines: [[], [], [{ text: 'other' }]] },
      before: null,
    };
    expect(tokensOfLine(added, wrong)).toEqual([{ text: 'const ROLL_DICE = {' }]);
    expect(tokensOfLine(hunk.lines[1], null)).toEqual([]);
  });

  it('marks the lines a step added, by their number after it', () => {
    expect([...addedLinesOf([hunk])]).toEqual([3, 4, 5, 6, 7, 8, 13, 17, 18, 19]);
  });

  it('counts a file’s lines, a last line end ending the last line', () => {
    expect(lineCountOf('a\nb\n')).toBe(2);
    expect(lineCountOf('a\nb')).toBe(2);
    expect(lineCountOf('')).toBe(0);
  });
});
