import { CodeBox } from './code-lines';
import type { HighlightedCode } from '@/lib/learn/code-tokens';
import type { LearnCodeSource } from '@/lib/learn/lesson-page';
import { quoteFileWordsOf, quoteLineOf, quoteUrlOf } from '@/lib/learn/project-course';

/**
 * A quote of a project's own code in a lesson: the file and its lines as a link to that exact version on GitHub, the
 * code as the project wrote it, and the line on the pinned version. One language, so no tabs, and the learner's
 * preferred language does not apply.
 */
export function QuoteBlock({
  code,
  source,
  project,
}: {
  code: HighlightedCode;
  source: LearnCodeSource;
  /** The project's name, when the page knows it; its repository otherwise. */
  project: string | null;
}) {
  return (
    <figure className="m-0 flex min-w-0 flex-col gap-2" data-block="quote">
      <a
        href={quoteUrlOf(source)}
        target="_blank"
        rel="noopener noreferrer"
        className="self-start font-mono text-xs font-semibold break-all text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
      >
        {quoteFileWordsOf(source)}
      </a>
      <CodeBox code={code} />
      <figcaption className="text-xs text-muted-foreground">{quoteLineOf(source, project)}</figcaption>
    </figure>
  );
}
