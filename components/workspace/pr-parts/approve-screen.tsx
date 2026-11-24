'use client';

import { CircleCheck, X } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DiffViewer } from '@/components/workspace/diff-viewer';
import { SendKey, useSendKey, useSendKeyName } from '@/components/workspace/pr-parts/send-key';
import { RefChips } from '@/components/workspace/ref-chips';
import { cn } from '@/lib/utils';
import { PR_BODY_MAX, PR_TITLE_MAX, prBodyPreview } from '@/lib/workspace/attempt-format';
import { SEND_BACK_NOTE_MAX } from '@/lib/workspace/mcp-setup';
import { type ApproveCardState, approveCardOf, titleHasPrefix, withPrefix } from '@/lib/workspace/pull-request-approve';
import type { LearnFixMade, PullRequestApproval } from '@/lib/workspace/pull-request-page.types';

/** What the person sends: the title and the description they wrote, and the sign-off tick. */
export type ApproveSend = { title: string; description: string; signOff: boolean };

export type ApproveScreenProps = {
  made: LearnFixMade;
  repo: string;
  issueNumber: number;
  issueTitle: string;
  approval: PullRequestApproval;
  /** The change as a unified diff, read file by file; left out when the page has none. */
  patch?: string | null;
  /** `walkthrough`: where "Finish the walkthrough first" leads, while it is not passed. */
  links?: { back?: Route | null; answers?: Route | null; lesson?: Route | null; walkthrough?: Route | null };
  state?: ApproveCardState;
  onSend?: (send: ApproveSend) => void;
  /** "Send it back to your agent", with what to change. */
  onSendBack?: (note: string) => void;
  /** The catalogue's states: the description's pane, the field for sending it back open, with its words. */
  initialPane?: 'write' | 'preview';
  initialSendBack?: string | null;
};

/** The description as GitHub shows it: Markdown, never HTML, without images. Links open in a new tab. */
const PREVIEW: Components = {
  a: ({ href, children }) => {
    const url = href && /^https?:\/\//.test(href) ? href : null;
    return url ? (
      <a href={url} target="_blank" rel="noopener noreferrer nofollow" className="text-link hover:underline">
        {children}
      </a>
    ) : (
      <span>{children}</span>
    );
  },
  code: ({ children }) => (
    <code className="rounded-sm bg-muted px-1 py-0.5 font-mono text-[0.85em] whitespace-break-spaces">{children}</code>
  ),
  ul: ({ children }) => <ul className="m-0 flex list-disc flex-col gap-1 ps-5">{children}</ul>,
  ol: ({ children }) => <ol className="m-0 flex list-decimal flex-col gap-1 ps-5">{children}</ol>,
  p: ({ children }) => <p className="m-0">{children}</p>,
};

const NOTE_TONES = {
  plain: 'bg-muted/50 text-foreground',
  warning: 'bg-warning-soft text-warning-soft-foreground',
  error: 'bg-negative/10 text-foreground',
} as const;

/**
 * Approve and send, one screen for Learn and Contribute, in the player's frame. Left, what is sent: the title (with
 * the project's prefix, when it wants one, added by one button), the description to write or preview, what GitRanks
 * adds under it, and the change read file by file. Right, one card with the one action; its parts keep their places
 * in every state: one note, and the button. Ctrl + Enter (⌘ + Enter on a Mac) sends; Enter alone does nothing.
 * "Send it back to your agent" opens a field in the note's place.
 */
export function ApproveScreen({
  made,
  repo,
  issueNumber,
  issueTitle,
  approval,
  patch,
  links = {},
  state = 'ready',
  onSend,
  onSendBack,
  initialPane = 'write',
  initialSendBack = null,
}: ApproveScreenProps) {
  const id = useId();
  const [title, setTitle] = useState(approval.title);
  const [description, setDescription] = useState(approval.description);
  const [signOff, setSignOff] = useState(approval.signOffOn);
  const [pane, setPane] = useState(initialPane);
  const [sendBack, setSendBack] = useState<string | null>(initialSendBack);
  const keyName = useSendKeyName();
  const backField = useRef<HTMLTextAreaElement>(null);
  const backButton = useRef<HTMLButtonElement>(null);
  const openedBack = useRef(false);

  useEffect(() => {
    if (sendBack !== null && openedBack.current) backField.current?.focus();
    if (sendBack === null && openedBack.current) backButton.current?.focus();
  }, [sendBack]);

  const card = approveCardOf(approval, { title, signOff }, state);
  // While a send is under way, nothing else goes: neither the send again nor sending it back.
  const sending = state === 'sending';
  const send = () => {
    if (card.ready) onSend?.({ title: title.trim(), description, signOff });
  };
  const back = () => {
    if (!sending && sendBack?.trim()) onSendBack?.(sendBack.trim());
  };

  // The one key that sends: Ctrl + Enter, wherever the focus is; Enter alone does nothing on this screen.
  useSendKey(() => (sendBack !== null ? back() : send()));

  const learn = made === 'LEARN';
  const needsPrefix = !!approval.titlePrefix && !titleHasPrefix(title, approval.titlePrefix);
  const stats = [
    `${approval.change.files} file${approval.change.files === 1 ? '' : 's'}`,
    `${approval.change.added} line${approval.change.added === 1 ? '' : 's'} added`,
    `${approval.change.removed} removed`,
  ];

  return (
    <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_27rem]" data-approve="">
      <article className="flex min-w-0 flex-col gap-8">
        <div className="flex flex-col gap-4">
          {links.back ? (
            <Link
              href={links.back}
              prefetch={false}
              className="self-start text-sm font-semibold text-link hover:underline"
            >
              ← Your pull request
            </Link>
          ) : null}
          <RefChips repo={repo} issue={issueNumber} />
          <h1 className="m-0 text-2xl font-bold tracking-tight text-balance">{issueTitle}</h1>
          {learn && approval.walkthroughPassed ? (
            <p className="m-0 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 text-foreground">
                <CircleCheck aria-hidden="true" className="size-4 text-positive" />
                You finished the walkthrough.
              </span>
              {links.answers ? (
                <Link className="font-semibold text-link hover:underline" href={links.answers} prefetch={false}>
                  See your answers
                </Link>
              ) : null}
            </p>
          ) : null}
        </div>

        <section className="flex flex-col gap-4" aria-labelledby={`${id}-pr`}>
          <h2 id={`${id}-pr`} className="m-0 text-xl font-semibold">
            Your pull request, as the project will see it
          </h2>
          <div className="flex flex-col gap-2">
            <label htmlFor={`${id}-title`} className="text-sm font-semibold text-foreground">
              Title
            </label>
            <Input
              id={`${id}-title`}
              value={title}
              maxLength={PR_TITLE_MAX}
              onChange={(event) => setTitle(event.target.value)}
              aria-invalid={needsPrefix || !title.trim() || undefined}
              aria-describedby={needsPrefix ? `${id}-prefix` : undefined}
              className="h-10"
            />
            {needsPrefix && approval.titlePrefix ? (
              <div
                id={`${id}-prefix`}
                className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg bg-warning-soft px-3 py-2 text-sm text-warning-soft-foreground"
                data-prefix=""
              >
                <span>
                  This project wants a title to start with <b className="font-semibold">{approval.titlePrefix}</b>
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2.5 text-xs max-sm:min-h-11"
                  onClick={() => setTitle(withPrefix(title, approval.titlePrefix ?? ''))}
                >
                  Add “{approval.titlePrefix}”
                </Button>
              </div>
            ) : null}
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label htmlFor={`${id}-body`} className="text-sm font-semibold text-foreground">
                Description
              </label>
              <fieldset
                aria-label="Write or preview"
                className="m-0 inline-flex gap-0.5 rounded-lg border bg-card p-0.5"
              >
                {(['write', 'preview'] as const).map((each) => (
                  <button
                    key={each}
                    type="button"
                    aria-pressed={pane === each}
                    className={cn(
                      'rounded-md px-3 py-1 text-xs whitespace-nowrap max-sm:min-h-11',
                      pane === each ? 'bg-muted font-semibold text-foreground' : 'font-medium text-muted-foreground',
                    )}
                    onClick={() => setPane(each)}
                  >
                    {each === 'write' ? 'Write' : 'Preview'}
                  </button>
                ))}
              </fieldset>
            </div>
            <Textarea
              id={`${id}-body`}
              hidden={pane !== 'write'}
              rows={10}
              value={description}
              maxLength={PR_BODY_MAX}
              onChange={(event) => setDescription(event.target.value)}
              className="field-sizing-fixed resize-y font-mono text-xs leading-normal md:text-xs"
            />
            {pane === 'preview' ? (
              <div
                className="flex flex-col gap-3 rounded-md border bg-background p-4 text-sm leading-relaxed text-foreground shadow-xs"
                data-preview=""
              >
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  skipHtml
                  disallowedElements={['img']}
                  unwrapDisallowed
                  components={PREVIEW}
                >
                  {prBodyPreview(description, issueNumber)}
                </ReactMarkdown>
              </div>
            ) : null}
          </div>
          <div className="flex flex-col gap-1.5 rounded-lg border border-dashed px-3.5 py-3" data-footer="">
            <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Added under your text
            </span>
            <span className="text-sm whitespace-pre-line text-muted-foreground">{approval.footer}</span>
          </div>
        </section>

        <section className="flex flex-col gap-3" aria-labelledby={`${id}-change`}>
          <h2 id={`${id}-change`} className="m-0 text-xl font-semibold">
            The change
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            {stats.map((stat) => (
              <span
                key={stat}
                className="rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap text-muted-foreground"
              >
                {stat}
              </span>
            ))}
            {approval.change.summary ? (
              <span className="text-sm text-muted-foreground">{approval.change.summary}</span>
            ) : null}
          </div>
          {patch ? <DiffViewer patch={patch} title="File by file" /> : null}
        </section>
      </article>

      <aside className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-6">
        <section
          className="flex flex-col gap-3.5 rounded-xl border-2 border-primary bg-card p-4.5"
          aria-labelledby={`${id}-send`}
          data-approve-card=""
        >
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Approve</span>
            <h2 id={`${id}-send`} className="m-0 text-base font-semibold text-balance">
              Send this pull request to {repo}
            </h2>
          </div>
          {sendBack !== null ? (
            <div className="flex flex-col gap-1.5" data-send-back="">
              <span className="flex items-center justify-between gap-2">
                <label htmlFor={`${id}-back`} className="text-sm font-medium text-foreground">
                  What should your agent change?
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="text-muted-foreground max-sm:size-11"
                  aria-label="Close without sending it back"
                  title="Close without sending it back"
                  onClick={() => setSendBack(null)}
                >
                  <X aria-hidden="true" />
                </Button>
              </span>
              <Textarea
                ref={backField}
                id={`${id}-back`}
                rows={3}
                value={sendBack}
                maxLength={SEND_BACK_NOTE_MAX}
                onChange={(event) => setSendBack(event.target.value)}
                className="min-h-21 text-sm"
              />
            </div>
          ) : (
            <>
              {approval.signOffNeeded ? (
                <label className="flex items-start gap-3 text-sm" htmlFor={`${id}-signoff`}>
                  <Checkbox
                    id={`${id}-signoff`}
                    checked={signOff}
                    onCheckedChange={(checked) => setSignOff(checked === true)}
                    className="mt-0.5"
                  />
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="font-medium text-foreground">Sign off the commits (DCO)</span>
                    <span className="text-muted-foreground">
                      This project checks every commit for it. You certify the Developer Certificate of Origin for this
                      change.
                    </span>
                  </span>
                </label>
              ) : null}
              <p
                role="status"
                className={cn('m-0 min-h-21 rounded-lg p-3 text-sm', NOTE_TONES[card.note.tone])}
                data-note={card.note.tone}
              >
                {card.note.lead && card.note.link === 'walkthrough' && links.walkthrough ? (
                  <Link className="font-semibold underline" href={links.walkthrough} prefetch={false}>
                    {card.note.lead}
                  </Link>
                ) : card.note.lead ? (
                  <b className="font-semibold">{card.note.lead}</b>
                ) : null}
                {card.note.lead ? ' ' : null}
                {card.note.text}
              </p>
            </>
          )}
          {sendBack !== null ? (
            <Button
              type="button"
              className="h-10 w-full px-6 font-semibold max-sm:min-h-11"
              disabled={sending || !sendBack.trim()}
              onClick={back}
            >
              Send it back
              <SendKey name={keyName} />
            </Button>
          ) : (
            <>
              <Button
                type="button"
                className="h-10 w-full px-6 font-semibold max-sm:min-h-11"
                disabled={!card.ready}
                onClick={send}
              >
                {card.button}
                <SendKey name={keyName} />
              </Button>
              {onSendBack ? (
                <Button
                  ref={backButton}
                  type="button"
                  variant="outline"
                  className="h-9 w-full max-sm:min-h-11"
                  disabled={sending}
                  onClick={() => {
                    openedBack.current = true;
                    setSendBack('');
                  }}
                >
                  Send it back to your agent
                </Button>
              ) : null}
            </>
          )}
        </section>
        {learn && approval.lessonLater ? (
          <p className="m-0 min-h-8 text-sm text-muted-foreground" data-lesson-later="">
            After it is sent: questions on{' '}
            {links.lesson ? (
              <Link href={links.lesson} prefetch={false} className="font-medium text-foreground hover:underline">
                {approval.lessonLater.title}
              </Link>
            ) : (
              <span className="font-medium text-foreground">{approval.lessonLater.title}</span>
            )}
            , if you want them.
          </p>
        ) : null}
      </aside>
    </div>
  );
}
