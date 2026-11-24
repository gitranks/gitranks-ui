import type { Route } from 'next';

import { RichText } from '@/components/workspace/blocks/rich-text';
import { CopyButton } from '@/components/workspace/copy-button';
import { PageLink } from '@/components/workspace/page-link';
import { cn } from '@/lib/utils';
import {
  type CardWords,
  changeCardOf,
  type PullRequestLinks,
  walkthroughCardOf,
} from '@/lib/workspace/pull-request-page';
import type { PullRequestPage } from '@/lib/workspace/pull-request-page.types';

/** One card under the box: its name, one line, and its link, which keeps its place while it is not there yet. */
function Card({
  name,
  text,
  summary,
  link,
  quiet,
  card,
}: {
  name: string;
  text: string;
  summary?: string | null;
  link: { label: string; href: Route } | null;
  quiet: boolean;
  card: string;
}) {
  return (
    <div
      className={cn('flex min-w-0 flex-col gap-1 rounded-xl border p-4', quiet ? 'border-dashed' : 'bg-card')}
      data-card={card}
    >
      <span className={cn('text-sm font-semibold', quiet && 'text-muted-foreground')}>{name}</span>
      {summary ? (
        <span className="text-sm text-foreground">
          <RichText text={summary} />
        </span>
      ) : null}
      <span className="text-sm text-muted-foreground">{text}</span>
      <span className="min-h-5 text-sm">
        {link ? (
          <PageLink className="font-semibold text-link hover:underline" href={link.href}>
            {link.label}
          </PageLink>
        ) : null}
      </span>
    </div>
  );
}

const linkOf = (words: CardWords, label: string, href: Route | null | undefined) =>
  words.link && href ? { label, href } : null;

/**
 * The two cards under the box: the change (the agent's short words, its counts, "Read the change") and, for a Learn
 * fix, the walkthrough (where it stands, how many people read it, whether the answers are shared, "See your answers").
 * Contribute's second card is the pull request's text, when the page gives its link. Both are there from the start,
 * drawn quiet while they are empty.
 */
export function PullRequestCards({
  page,
  now,
  links = {},
}: {
  page: Pick<PullRequestPage, 'made' | 'box' | 'change' | 'walkthrough' | 'number'>;
  now: Date;
  links?: PullRequestLinks;
}) {
  const change = changeCardOf(page);
  const walkthrough = page.made === 'LEARN' ? walkthroughCardOf(page, now) : null;
  return (
    <div className="grid gap-3 sm:grid-cols-2" data-pr-cards="">
      <Card
        card="change"
        name="The change"
        summary={change.quiet ? null : page.change?.summary}
        text={change.text}
        link={linkOf(change, 'Read the change', links.change)}
        quiet={change.quiet}
      />
      {walkthrough ? (
        <Card
          card="walkthrough"
          name="The walkthrough"
          text={walkthrough.text}
          link={linkOf(walkthrough, 'See your answers', links.answers)}
          quiet={walkthrough.quiet}
        />
      ) : links.pullRequestText ? (
        <Card
          card="text"
          name="The pull request text"
          text="Its title and description, as the project sees them."
          link={{ label: 'Read or edit it', href: links.pullRequestText }}
          quiet={false}
        />
      ) : null}
    </div>
  );
}

/** The public page of the fix, once the pull request is open, with the button that copies its address. */
export function FixLinkLine({ url }: { url: string }) {
  const shown = url.replace(/^https?:\/\//, '');
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card px-4 py-3" data-fix-link="">
      <span className="text-sm font-medium">Show this fix</span>
      <a className="min-w-0 text-sm break-all text-muted-foreground hover:underline" href={url}>
        {shown}
      </a>
      <span className="ms-auto">
        <CopyButton text={url} label="Copy the link" className="h-9 sm:min-h-9" />
      </span>
    </div>
  );
}
