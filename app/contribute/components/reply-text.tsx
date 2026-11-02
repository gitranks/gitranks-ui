import { CopyIcon } from './code-block';
import type { ContributeReplyDraft } from '@/lib/contribute/contribute.types';
import { type OrgAccess, replyCopyOf, replyLinkOf } from '@/lib/contribute/org-access';
import { cn } from '@/lib/utils';

type CopyDraft = Pick<ContributeReplyDraft, 'state' | 'text' | 'prefix' | 'body' | 'comment' | 'commentUrl'>;

/** Said where a reply cannot be copied yet: its prefix waits for the commit the push makes. */
const NOT_YET = 'You can copy it once its commits are on the pull request.';

function ReplyLink({ draft }: { draft: CopyDraft }) {
  const link = replyLinkOf(draft);
  return link ? (
    <a
      href={link.href}
      target="_blank"
      rel="noopener noreferrer"
      data-reply-link
      className="self-start text-sm font-semibold text-link"
    >
      {link.label}
    </a>
  ) : null;
}

/**
 * A reply's words in a box with a copy icon: what the box shows is what is copied, and what GitHub would get, so the
 * user can post it themselves. While it is not posted, the link to where it goes sits under it. `label` names the
 * reply for the copy icon ("Copy the reply to mo on src/a.ts:3").
 */
export function ReplyText({ draft, label, className }: { draft: CopyDraft; label: string; className?: string }) {
  const { words, copyable } = replyCopyOf(draft);
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div data-reply-text className="flex items-start rounded-lg bg-muted/60">
        <p className={cn('min-w-0 flex-1 py-3 pl-3 text-sm break-words whitespace-pre-wrap', !copyable && 'pr-3')}>
          {words}
        </p>
        {copyable ? <CopyIcon text={words} label={label} /> : null}
      </div>
      {copyable ? null : <span className="text-xs text-muted-foreground">{NOT_YET}</span>}
      <ReplyLink draft={draft} />
    </div>
  );
}

/**
 * Under a reply the user is editing: a copy icon for it as GitHub would get it (`text`: the words in the field), and
 * the link to where it goes.
 */
export function ReplyCopyBar({ draft, text, label }: { draft: CopyDraft; text: string; label: string }) {
  const { words, copyable } = replyCopyOf(draft, text);
  return (
    <div data-reply-copy className="flex flex-wrap items-center gap-x-2">
      {!copyable ? (
        <span className="text-xs text-muted-foreground">{NOT_YET}</span>
      ) : words.trim() ? (
        <CopyIcon text={words} label={label} />
      ) : null}
      <ReplyLink draft={draft} />
    </div>
  );
}

/**
 * How the user gets past an organization that has not approved the app: ask it on GitHub, from the app's page (a Request
 * button by each organization), or from their list of apps when the app's page is not known here.
 */
export function OrgAccessLink({ access }: { access: OrgAccess }) {
  return (
    <span data-org-access={access.app ? 'app' : 'apps'} className="text-sm">
      {access.app ? (
        <a href={access.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-link">
          Request access for the organization ↗
        </a>
      ) : (
        <>
          Open{' '}
          <a href={access.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-link">
            your authorized apps on GitHub ↗
          </a>
          , choose the app GitRanks opens pull requests with, and press Request next to the organization.
        </>
      )}
    </span>
  );
}
