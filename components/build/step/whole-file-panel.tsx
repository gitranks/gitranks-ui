'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { ExternalLink, X } from 'lucide-react';

import { CodeLines, CodeRow } from './step-file';
import { buildFileUrlOf } from '@/lib/build/step-page';
import type { HighlightedCode } from '@/lib/workspace/code-tokens';
import { linesOf } from '@/lib/workspace/learn-question';

/*
 * The whole file of a changed file, after the step, in a panel beside the page: its path, what it shows, "Open on
 * GitHub" and Close; every line numbered, the lines the step added marked. Closing it leaves the page where it was.
 */

/** A file the panel shows: its path and text after the step, highlighted, and the lines the step added. */
export type WholeFile = {
  path: string;
  text: string;
  code: HighlightedCode | null;
  added: ReadonlySet<number>;
};

/** The panel's contents, drawn open; the catalogue draws them as the page shows them. */
export function WholeFileBody({ file, stepNumber, commit }: { file: WholeFile; stepNumber: number; commit: string }) {
  const lines = linesOf(file.text);
  return (
    <>
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <span className="flex min-w-0 flex-col">
          <DialogPrimitive.Title className="m-0 truncate font-mono text-sm font-semibold">
            {file.path}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="m-0 text-xs text-muted-foreground">
            The whole file after step {stepNumber}. The lines this step changed are marked.
          </DialogPrimitive.Description>
        </span>
        <span className="flex shrink-0 items-center gap-3">
          <a
            href={buildFileUrlOf(commit, file.path)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-link hover:underline"
          >
            Open on GitHub <ExternalLink className="size-3" aria-hidden="true" />
          </a>
          <DialogPrimitive.Close
            className="inline-flex size-8 items-center justify-center rounded-md outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50"
            aria-label="Close"
          >
            <X className="size-4" aria-hidden="true" />
          </DialogPrimitive.Close>
        </span>
      </div>
      <CodeLines className="flex-1 overflow-y-auto py-2.5">
        {lines.map((line, index) => {
          const number = index + 1;
          const tokens = file.code?.lines[index] ?? (line ? [{ text: line }] : []);
          return (
            <CodeRow
              // Lines never move: the number is the line.
              key={number}
              number={number}
              kind={file.added.has(number) ? 'added' : 'context'}
              tokens={tokens}
              sign={false}
            />
          );
        })}
      </CodeLines>
    </>
  );
}

const PANEL =
  'fixed inset-y-0 right-0 z-50 flex w-full max-w-[640px] flex-col border-l bg-background shadow-lg outline-none motion-safe:data-[state=open]:animate-in motion-safe:data-[state=open]:slide-in-from-right-8 motion-safe:data-[state=open]:fade-in-0';

/** The panel beside the page, open while a file is named; Escape, the backdrop and Close close it. */
export function WholeFilePanel({
  file,
  stepNumber,
  commit,
  onClose,
}: {
  file: WholeFile | null;
  stepNumber: number;
  commit: string;
  onClose: () => void;
}) {
  return (
    <DialogPrimitive.Root open={file !== null} onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-foreground/35" />
        <DialogPrimitive.Content className={PANEL} data-build-whole-file-panel="">
          {file ? <WholeFileBody file={file} stepNumber={stepNumber} commit={commit} /> : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/**
 * The panel as the catalogue draws it: open over the page, with no portal, since a board is drawn as the server sends
 * the page.
 */
export function WholeFileDrawn({ file, stepNumber, commit }: { file: WholeFile; stepNumber: number; commit: string }) {
  return (
    <DialogPrimitive.Root open>
      <div aria-hidden="true" className="absolute inset-0 bg-foreground/35">
        <aside className="absolute inset-y-0 right-0 flex w-full max-w-[640px] flex-col border-l bg-background shadow-lg">
          <WholeFileBody file={file} stepNumber={stepNumber} commit={commit} />
        </aside>
      </div>
    </DialogPrimitive.Root>
  );
}
