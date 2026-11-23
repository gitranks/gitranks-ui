import 'server-only';

import { createHighlighterCore, type HighlighterCore } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';

import { type CodeToken, type HighlightedCode, plainCodeOf } from './code-tokens';
import type { LearnCode } from './learn-question';

/**
 * Code highlighted on the server, in every language of a course, so the page sends colours, not a highlighter.
 * One highlighter for the process, with the course languages and the two themes only. A language it does not know is
 * sent plain.
 */

const LIGHT = 'github-light';
const DARK = 'github-dark';

const LANGUAGES = {
  python: () => import('shiki/langs/python.mjs'),
  javascript: () => import('shiki/langs/javascript.mjs'),
  typescript: () => import('shiki/langs/typescript.mjs'),
  go: () => import('shiki/langs/go.mjs'),
  rust: () => import('shiki/langs/rust.mjs'),
  java: () => import('shiki/langs/java.mjs'),
  php: () => import('shiki/langs/php.mjs'),
  ruby: () => import('shiki/langs/ruby.mjs'),
} as const;

const isKnown = (language: string): language is keyof typeof LANGUAGES => Object.hasOwn(LANGUAGES, language);

let highlighter: Promise<HighlighterCore> | null = null;

function highlighterOf(): Promise<HighlighterCore> {
  highlighter ??= createHighlighterCore({
    themes: [import('shiki/themes/github-light.mjs'), import('shiki/themes/github-dark.mjs')],
    langs: Object.values(LANGUAGES).map((load) => load()),
    engine: createJavaScriptRegexEngine(),
  }).catch((error: unknown) => {
    // A failed start is tried again on the next page, not kept.
    highlighter = null;
    throw error;
  });
  return highlighter;
}

/** One language's code as lines of tokens; neighbours of one colour joined, the themes' own text colour left out. */
function tokensOf(core: HighlighterCore, { language, code }: LearnCode): HighlightedCode {
  const lightText = core.getTheme(LIGHT).fg.toLowerCase();
  const darkText = core.getTheme(DARK).fg.toLowerCase();
  const { tokens } = core.codeToTokens(code.replace(/\r\n?/g, '\n').replace(/\n$/, ''), {
    lang: language,
    themes: { light: LIGHT, dark: DARK },
    defaultColor: false,
  });
  const lines = tokens.map((line) => {
    const out: CodeToken[] = [];
    for (const token of line) {
      const style = (token.htmlStyle ?? {}) as Record<string, string | undefined>;
      const light = style['--shiki-light']?.toLowerCase();
      const dark = style['--shiki-dark']?.toLowerCase();
      const next: CodeToken = {
        text: token.content,
        ...(light && light !== lightText ? { light } : {}),
        ...(dark && dark !== darkText ? { dark } : {}),
      };
      const last = out.at(-1);
      if (last && last.light === next.light && last.dark === next.dark) last.text += next.text;
      else out.push(next);
    }
    return out;
  });
  return { language, lines };
}

/** Every language's code, highlighted; plain where the language is unknown or the highlighter cannot start. */
export async function highlightCodes(codes: readonly LearnCode[]): Promise<HighlightedCode[]> {
  if (!codes.some((code) => isKnown(code.language))) return codes.map(plainCodeOf);
  const core = await highlighterOf().catch(() => null);
  return codes.map((code) => {
    if (!core || !isKnown(code.language)) return plainCodeOf(code);
    try {
      return tokensOf(core, code);
    } catch {
      return plainCodeOf(code);
    }
  });
}
