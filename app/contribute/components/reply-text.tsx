import { CopyIcon } from './code-block';
import type { ContributeReplyDraft } from '@/lib/contribute/contribute.types';
import { type OrgAccess, replyCopyOf, replyLinkOf } from '@/lib/contribute/org-access';
import { cn } from '@/lib/utils';

/**
 * A reply's words in a box with a copy icon: what the box shows is what is copied, so the user can post it on GitHub
 * themselves. While it is not posted, the link to where it goes sits under it.
 */
export function ReplyText({
  draft,
  className,
}: {
  draft: Pick<ContributeReplyDraft, 'state' | 'text' | 'prefix' | 'body' | 'comment' | 'commentUrl'>;
  className?: string;
}) {
  const words = replyCopyOf(draft);
  const link = replyLinkOf(draft);
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div data-reply-text className="flex items-start rounded-lg bg-muted/60">
        <p className="min-w-0 flex-1 py-3 pl-3 text-sm break-words whitespace-pre-wrap">{words}</p>
        <CopyIcon text={words} label="Copy the reply" />
      </div>
      {link ? (
        <a
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          data-reply-link
          className="self-start text-sm font-semibold text-link"
        >
          {link.label}
        </a>
      ) : null}
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
