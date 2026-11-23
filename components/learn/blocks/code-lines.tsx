import type { CSSProperties } from 'react';

import type { CodeToken, HighlightedCode } from '@/lib/learn/code-tokens';
import { cn } from '@/lib/utils';

/** A token's colours: the light theme's, and the dark theme's under `.dark`. A missing one takes the page's text. */
const TOKEN = 'text-(--shiki-light) dark:text-(--shiki-dark)';

/** One line of highlighted code, its tokens in order. An empty line keeps its height. */
export function CodeLine({ tokens }: { tokens: readonly CodeToken[] }) {
  if (!tokens.length) return <> </>;
  return (
    <>
      {tokens.map((token, index) =>
        token.light || token.dark ? (
          <span
            // Tokens never move: the index is the token.
            key={index}
            className={TOKEN}
            style={{ '--shiki-light': token.light, '--shiki-dark': token.dark } as CSSProperties}
          >
            {token.text}
          </span>
        ) : (
          <span key={index}>{token.text}</span>
        ),
      )}
    </>
  );
}

/** Highlighted code in a box, as the boards draw an example: lines kept as written, scrolled sideways when long. */
export function CodeBox({ code, className }: { code: HighlightedCode; className?: string }) {
  return (
    <pre
      className={cn(
        'm-0 overflow-x-auto rounded-lg border bg-muted/50 p-4 font-mono text-sm leading-relaxed',
        className,
      )}
      data-code-language={code.language}
    >
      <code>
        {code.lines.map((tokens, index) => (
          // Lines never move: the index is the line.
          <span key={index} className="block whitespace-pre">
            <CodeLine tokens={tokens} />
          </span>
        ))}
      </code>
    </pre>
  );
}
