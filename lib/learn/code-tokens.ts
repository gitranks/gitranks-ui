import { type LearnCode, linesOf } from './learn-question';

/**
 * Code as the server highlights it, ready for any page to draw: one language's lines, each a run of tokens. A token's
 * colours are the light and the dark theme's; a token in the theme's own text colour has none, and takes the page's.
 */
export type CodeToken = { text: string; light?: string; dark?: string };
export type HighlightedCode = { language: string; lines: CodeToken[][] };

/** Code with no colours: what a page draws when a language cannot be highlighted. */
export const plainCodeOf = ({ language, code }: LearnCode): HighlightedCode => ({
  language,
  lines: linesOf(code).map((line) => (line ? [{ text: line }] : [])),
});

/** The highlighted code of the language asked for, or else of the first language there is. */
export const highlightedOf = (codes: readonly HighlightedCode[], language: string | null): HighlightedCode | null =>
  codes.find((code) => code.language === language) ?? codes[0] ?? null;
