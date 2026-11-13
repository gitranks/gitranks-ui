'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { removeLesson } from '../actions';
import { Figure } from './lesson-summary';
import { ConfirmDialog } from '@/app/contribute/components/confirm-dialog';
import { CopyButton } from '@/app/contribute/components/copy-button';
import { HEADING } from '@/app/contribute/components/primitives';
import { Button } from '@/components/ui/button';
import { contributeErrorMessage } from '@/lib/contribute/errors';
import type { LessonCounts } from '@/lib/learn/learn.types';

/** An address as the card shows it: without its scheme. */
const shownUrl = (url: string) => url.replace(/^https?:\/\//, '');

function LinkRow({ label, url, note }: { label: string; url: string; note?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex flex-wrap items-center gap-2">
        <span className="min-w-0 flex-1 truncate rounded-md border border-input px-3 py-2 font-mono text-xs shadow-xs">
          {shownUrl(url)}
        </span>
        <CopyButton text={url} label="Copy" />
      </div>
      {note ? <span className="text-xs text-muted-foreground">{note}</span> : null}
    </div>
  );
}

/**
 * The author's public lesson: its two links to copy (the lesson, for others to take, and their result, which the pull
 * request links to), how it is doing, and "Take it down".
 */
export function LessonShare({
  slug,
  shareUrl,
  resultUrl,
  counts,
}: {
  slug: string;
  shareUrl: string | null;
  resultUrl: string | null;
  counts: LessonCounts | null;
}) {
  return (
    <>
      <section className="flex flex-col gap-3 rounded-xl border bg-card p-5" data-lesson-share="">
        <h2 className={HEADING.card}>Share this lesson</h2>
        {shareUrl ? <LinkRow label="Lesson link: others take it, without the answers" url={shareUrl} /> : null}
        {resultUrl ? (
          <LinkRow
            label="Your result: the lesson with the answers and how you did, per step"
            url={resultUrl}
            note="This is the link in your pull request."
          />
        ) : null}
        {counts ? (
          <dl className="grid grid-cols-2 gap-4 border-t pt-3 sm:grid-cols-4">
            <Figure value={String(counts.opens)} label="opened it" />
            <Figure value={String(counts.passes)} label="passed it" />
            <Figure
              value={String(counts.reactionsYes)}
              label={counts.reactionsYes === 1 ? 'maintainer said it helped' : 'maintainers said it helped'}
            />
            <Figure
              value={String(counts.reported)}
              label={counts.reported === 1 ? 'question reported' : 'questions reported'}
            />
          </dl>
        ) : null}
      </section>
      <TakeDown slug={slug} />
    </>
  );
}

/** "Take the lesson down": for good, after a confirmation. */
export function TakeDown({ slug }: { slug: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const confirm = () =>
    startTransition(async () => {
      setError(null);
      const result = await removeLesson(slug);
      if (!result.ok) {
        setError(contributeErrorMessage(result.error, result.message));
        return;
      }
      setOpen(false);
      router.refresh();
    });
  return (
    <section className="flex flex-col gap-2 rounded-xl border bg-card p-4.5" data-take-down="">
      <h2 className={HEADING.block}>Take the lesson down</h2>
      <p className="text-sm text-muted-foreground">
        Both links then say the lesson was removed by its author. The pull request stays as it is on GitHub. This cannot
        be undone.
      </p>
      <ConfirmDialog
        trigger={
          <Button
            type="button"
            variant="outline"
            className="self-start border-destructive text-destructive max-sm:min-h-11"
          >
            Take it down
          </Button>
        }
        open={open}
        onOpenChange={setOpen}
        title="Take this lesson down?"
        description="Both links will say the lesson was removed by its author, for good. The pull request stays as it is."
        action="Take it down"
        pendingAction="Taking it down…"
        pending={pending}
        error={error}
        onConfirm={confirm}
      />
    </section>
  );
}
