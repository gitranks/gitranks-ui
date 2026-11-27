import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const { bigStep, removedFileStep, sketchStep } = await import('./__fixtures__/step-cases');
const { codeLanguageOfPath, highlightQuestionCodes, highlightStepCodes } = await import('./step-code');
const { linesOf } = await import('@/lib/workspace/learn-question');

const text = (lines: { text: string }[][]) => lines.map((line) => line.map((token) => token.text).join(''));

describe("a step's code, highlighted", () => {
  it('names the highlighter’s language by a file’s extension, plain for any other', () => {
    expect(codeLanguageOfPath('server.ts')).toBe('typescript');
    expect(codeLanguageOfPath('tools/roll_dice.py')).toBe('python');
    expect(codeLanguageOfPath('.gitranks/check.mjs')).toBe('javascript');
    expect(codeLanguageOfPath('package.json')).toBe('text');
  });

  it('highlights each changed file whole after the step, and the old side its diff shows, keeping every line', async () => {
    const codes = await highlightStepCodes(bigStep);
    expect(codes.map((side) => side.language)).toEqual(['typescript', 'python']);
    const server = codes[0].files.find((file) => file.path === 'server.ts');
    const after = bigStep.languages[0].files.find((file) => file.path === 'server.ts')?.text ?? '';
    expect(text(server?.after?.lines ?? [])).toEqual(linesOf(after));
    expect(server?.after?.lines.flat().some((token) => token.light)).toBe(true);
    expect(server?.before?.lines.length).toBeGreaterThan(0);
    const added = codes[0].files.find((file) => file.path === 'tools/tool.ts');
    expect(added?.before).toBeNull();
    expect(codes[1].files.map((file) => file.path)).toEqual(['tools/roll_dice.py', 'tools/flip_coin.py', 'server.py']);
  });

  it('has no whole file for a removed one', async () => {
    const [side] = await highlightStepCodes(removedFileStep);
    const removed = side.files.find((file) => file.path === 'log.ts');
    expect(removed?.after).toBeNull();
    expect(text(removed?.before?.lines ?? [])[0]).toBe('export function log(text: string) {');
  });

  it('highlights the question’s code in each language', async () => {
    const codes = await highlightQuestionCodes(sketchStep);
    expect(codes.map((code) => code.language)).toEqual(['typescript', 'python']);
    expect(await highlightQuestionCodes(bigStep)).toEqual([]);
  });
});
