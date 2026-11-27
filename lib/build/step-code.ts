import 'server-only';

import { type BuildFileCode, type BuildStepCodes, beforeCodeOf, parseDiff } from './step-diff';
import type { BuildStepPage } from './types';
import type { HighlightedCode } from '@/lib/workspace/code-tokens';
import { highlightCodes } from '@/lib/workspace/highlight';
import type { LearnCode } from '@/lib/workspace/learn-question';

/*
 * A step's code, highlighted on the server, so the page sends colours and no highlighter: for each changed file, the
 * whole file after the step and the old side its diff shows; and the question's code in each language.
 */

const BY_EXTENSION: Record<string, string> = {
  ts: 'typescript',
  mts: 'typescript',
  cts: 'typescript',
  tsx: 'typescript',
  js: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  py: 'python',
  sh: 'shell',
};

/** The highlighter's language for a file, by its extension; `text` (drawn plain) for any other. */
export function codeLanguageOfPath(path: string): string {
  const extension = /\.([a-z0-9]+)$/i.exec(path)?.[1]?.toLowerCase() ?? '';
  return BY_EXTENSION[extension] ?? 'text';
}

/**
 * Every changed file of every language of a step, highlighted: its whole text after the step (none for a removed
 * file), and the lines of the file before that its diff shows. Unknown languages, and a highlighter that cannot start,
 * give plain code.
 */
export async function highlightStepCodes(page: BuildStepPage): Promise<BuildStepCodes> {
  const codes: LearnCode[] = [];
  const slots: { language: string; path: string; after: number | null; before: number | null }[] = [];
  for (const side of page.languages) {
    const texts = new Map(side.files.map((file) => [file.path, file.text]));
    for (const file of side.changed) {
      const language = codeLanguageOfPath(file.path);
      const text = file.status === 'removed' ? undefined : texts.get(file.path);
      const after = text === undefined ? null : codes.push({ language, code: text }) - 1;
      const old = beforeCodeOf(parseDiff(file.diff));
      const before = old ? codes.push({ language, code: old }) - 1 : null;
      slots.push({ language: side.language, path: file.path, after, before });
    }
  }
  const lit = await highlightCodes(codes);
  const at = (index: number | null): HighlightedCode | null => (index === null ? null : (lit[index] ?? null));
  return page.languages.map((side) => ({
    language: side.language,
    files: slots
      .filter((slot) => slot.language === side.language)
      .map((slot): BuildFileCode => ({ path: slot.path, after: at(slot.after), before: at(slot.before) })),
  }));
}

/** The question's code in each language, highlighted: what a `predict-output` question shows. */
export const highlightQuestionCodes = (page: BuildStepPage): Promise<HighlightedCode[]> =>
  page.question.codes.length ? highlightCodes(page.question.codes) : Promise.resolve([]);
