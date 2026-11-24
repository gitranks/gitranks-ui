import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { highlightedOf, plainCodeOf } from './code-tokens';
import { highlightCodes } from './highlight';

const text = (lines: { text: string }[][]) => lines.map((line) => line.map((token) => token.text).join(''));

describe('highlightCodes', () => {
  it('highlights every language of a course, keeping each line’s text', async () => {
    const codes = [
      { language: 'python', code: 'def f(x):\n    return x + 1\n' },
      { language: 'go', code: 'func f(x int) int {\n\treturn x + 1\n}\n' },
      { language: 'ruby', code: "puts 'hi'" },
    ];
    const highlighted = await highlightCodes(codes);
    expect(highlighted.map((code) => code.language)).toEqual(['python', 'go', 'ruby']);
    expect(text(highlighted[0].lines)).toEqual(['def f(x):', '    return x + 1']);
    expect(text(highlighted[1].lines)).toEqual(['func f(x int) int {', '\treturn x + 1', '}']);
    // A keyword has its colours, in both themes.
    const def = highlighted[0].lines[0][0];
    expect(def.text).toBe('def');
    expect(def.light).toMatch(/^#[0-9a-f]{6}$/);
    expect(def.dark).toMatch(/^#[0-9a-f]{6}$/);
  }, 20_000);

  it('joins neighbours of one colour, and leaves the theme’s own text colour out', async () => {
    const [code] = await highlightCodes([{ language: 'python', code: 'x = 1' }]);
    for (let index = 1; index < code.lines[0].length; index++) {
      const [before, token] = [code.lines[0][index - 1], code.lines[0][index]];
      expect(before.light === token.light && before.dark === token.dark).toBe(false);
    }
  }, 20_000);

  it('highlights shell commands', async () => {
    const [code] = await highlightCodes([{ language: 'shell', code: 'git commit -m "Fix it"  # a comment\n' }]);
    expect(code.language).toBe('shell');
    expect(text(code.lines)).toEqual(['git commit -m "Fix it"  # a comment']);
    expect(code.lines[0].length).toBeGreaterThan(1);
  }, 20_000);

  it('sends a language it does not know as plain lines', async () => {
    const highlighted = await highlightCodes([{ language: 'cobol', code: 'DISPLAY "HI".\nSTOP RUN.' }]);
    expect(highlighted).toEqual([{ language: 'cobol', lines: [[{ text: 'DISPLAY "HI".' }], [{ text: 'STOP RUN.' }]] }]);
  });
});

describe('plainCodeOf and highlightedOf', () => {
  it('keeps an empty line as a line with no tokens', () => {
    expect(plainCodeOf({ language: 'python', code: 'a\n\nb\n' }).lines).toEqual([[{ text: 'a' }], [], [{ text: 'b' }]]);
  });

  it('falls back to the first language', () => {
    const codes = [plainCodeOf({ language: 'python', code: 'a' }), plainCodeOf({ language: 'go', code: 'b' })];
    expect(highlightedOf(codes, 'go')?.language).toBe('go');
    expect(highlightedOf(codes, 'rust')?.language).toBe('python');
    expect(highlightedOf([], 'go')).toBeNull();
  });
});
