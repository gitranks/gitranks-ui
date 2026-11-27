import { CopyButton } from '@/components/workspace/copy-button';

/**
 * The sentence a person says in their agent, with Copy: a build moves in the agent, so this is its "button". The line
 * under it says where to say it.
 */
export function SayRow({ sentence, note }: { sentence: string; note: string }) {
  return (
    <div className="flex flex-col gap-3" data-say-row="">
      <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/50 px-3 py-2">
        <code className="min-w-0 truncate font-mono text-[13px]">{sentence}</code>
        <CopyButton text={sentence} label="Copy" className="h-7 gap-1 px-2 text-xs sm:min-h-7" />
      </div>
      <p className="m-0 text-xs text-muted-foreground">{note}</p>
    </div>
  );
}
