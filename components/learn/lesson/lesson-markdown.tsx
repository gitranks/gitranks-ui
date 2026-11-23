import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * A lesson's text in Markdown, as the format allows it: paragraphs, bold and italics, `code`, short lists. Never HTML:
 * raw HTML is dropped. The format has no links, images or headings (the page gives the lesson its one title), so a
 * link reads as its words, an image as nothing, and a heading as a bold paragraph.
 */
const COMPONENTS: Components = {
  p: ({ children }) => <p className="m-0">{children}</p>,
  strong: ({ children }) => <b className="font-semibold">{children}</b>,
  em: ({ children }) => <i>{children}</i>,
  ul: ({ children }) => <ul className="m-0 flex list-disc flex-col gap-1 pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="m-0 flex list-decimal flex-col gap-1 pl-5">{children}</ol>,
  a: ({ children }) => <>{children}</>,
  img: () => null,
  h1: ({ children }) => <p className="m-0 font-semibold">{children}</p>,
  h2: ({ children }) => <p className="m-0 font-semibold">{children}</p>,
  h3: ({ children }) => <p className="m-0 font-semibold">{children}</p>,
  h4: ({ children }) => <p className="m-0 font-semibold">{children}</p>,
  h5: ({ children }) => <p className="m-0 font-semibold">{children}</p>,
  h6: ({ children }) => <p className="m-0 font-semibold">{children}</p>,
  pre: ({ children }) => (
    <pre className="m-0 overflow-x-auto rounded-lg border bg-muted/50 p-4 font-mono text-sm leading-relaxed">
      {children}
    </pre>
  ),
  code: ({ children, node }) =>
    // A fenced block spans its fences' lines; inline code sits on one line.
    node?.position && node.position.start.line !== node.position.end.line ? (
      <code>{children}</code>
    ) : (
      <code className="whitespace-break-spaces rounded-sm bg-muted px-1 py-0.5 font-mono text-[0.85em]">
        {children}
      </code>
    ),
};

export function LessonMarkdown({ markdown }: { markdown: string }) {
  return (
    <div className="flex max-w-[62ch] flex-col gap-3 text-base leading-relaxed" data-lesson-text="">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={COMPONENTS} skipHtml>
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
