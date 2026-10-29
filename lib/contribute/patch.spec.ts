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
