import { codeSpansOf } from '@/lib/workspace/blocks/code-spans';

/** Plain text with `code` spans, as a lesson writes it: never HTML. */
export function RichText({ text }: { text: string }) {
  return (
    <>
      {codeSpansOf(text).map((part, index) =>
        part.code ? (
          // Parts never move: the index is the part. Spaces in code mean something ('a  b' is not 'a b'): kept, and
          // wrapped only where they are.
          <code key={index} className="whitespace-break-spaces rounded-sm bg-muted px-1 py-0.5 font-mono text-[0.85em]">
            {part.text}
          </code>
        ) : (
          part.text
        ),
      )}
    </>
  );
}
