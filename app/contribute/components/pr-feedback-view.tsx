import Link from 'next/link';
import type { ReactNode } from 'react';

import { MaintainerSignIn } from './maintainers-view';
import { PrCard } from './pr-card';
import { PrHelpedForm, type PrHelpedInitial, PrReportForm, type PrReportInitial } from './pr-feedback-forms';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { isRetryablePrFeedbackError, prFeedbackErrorMessage } from '@/lib/contribute/errors';
import {
  maintainersSectionPath,
  type PrFeedbackFlow,
  type PrTarget,
  prRefText,
  reportPathOf,
} from '@/lib/contribute/pr-feedback';
import type { PrReportRead } from '@/lib/contribute/pr-feedback.data';
import { attemptPath } from '@/lib/contribute/sessions';
import { CONTACT_EMAIL } from '@/lib/legal';

const EYEBROW = 'text-xs font-semibold tracking-[0.08em] text-primary uppercase';
const TITLE = 'text-2xl font-semibold tracking-tight text-balance md:text-[32px] md:leading-tight';

/** The report pages' column, under the site header. */
function Column({ flow, children }: { flow: PrFeedbackFlow; children: ReactNode }) {
  return (
    <main data-pr-feedback={flow} className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 pt-8 pb-16">
      <span className={EYEBROW}>{flow === 'helped' ? 'This PR helped' : 'Report a pull request'}</span>
      {children}
    </main>
  );
}

const ROLES = [
  { title: 'Admin or maintain', text: 'Report + stop work' },
  { title: 'Write or triage', text: 'Report, marked as the team’s; we act first' },
  { title: 'Anyone else', text: 'Report or say it helped; we review it' },
];

/** The address the page is at, for the sign-in to come back to. */
const returnToOf = (target: PrTarget, flow: PrFeedbackFlow) => reportPathOf(target, flow) as string;

/**
 * The report page, or "This PR helped" (`flow`): the sign-in first, then the form for the visitor's role. The PR's
 * contributor gets a pointer to their own page instead; a link we can't read, or a PR we did not open, says so.
 */
export function PrFeedbackScreen({
  target,
  flow,
  read,
  orgAccessUrl,
  initial,
}: {
  target: PrTarget | null;
  flow: PrFeedbackFlow;
  read: PrReportRead | null;
  orgAccessUrl: string;
  /** The form as it starts: the catalogue draws it filled in. */
  initial?: PrReportInitial & PrHelpedInitial;
}) {
  if (!target || !read) {
    return (
      <Column flow={flow}>
        <h1 className={TITLE}>This link doesn’t name a pull request</h1>
        <p className="text-muted-foreground">
          Paste the PR’s link on the page for maintainers, or use the link in the PR’s footer.
        </p>
        <Button asChild variant="outline" className="min-h-11 self-start sm:min-h-9">
          <a href={maintainersSectionPath('feedback')}>Back to the page for maintainers</a>
        </Button>
      </Column>
    );
  }

  const returnTo = returnToOf(target, flow);

  if (read.state === 'signed-out') {
    const repo = read.card?.nameWithOwner ?? ('pr' in target ? target.pr.nameWithOwner : 'the repo');
    return (
      <Column flow={flow}>
        <h1 className={TITLE}>Thanks for taking a look. Let’s sign you in first</h1>
        {read.card ? (
          <PrCard card={read.card} />
        ) : 'pr' in target ? (
          <p className="font-mono text-sm">{prRefText(target.pr)}</p>
        ) : null}
        <Card className="py-6">
          <CardContent className="flex flex-col gap-3.5">
            <p className="text-[15px] leading-relaxed">
              Signing in with GitHub lets us see how you’re involved in {repo}, so we can show you the right options.
              The same step comes before {flow === 'helped' ? '“Report this PR”' : '“This PR helped”'}. If you help run
              the repo, you can also stop our work on the spot.
            </p>
            <ul className="grid gap-2.5 sm:grid-cols-3">
              {ROLES.map(({ title, text }) => (
                <li key={title} className="flex flex-col gap-1 rounded-xl bg-muted/50 p-3.5">
                  <strong className="text-[13px] font-semibold">{title}</strong>
                  <span className="text-[13px] text-muted-foreground">{text}</span>
                </li>
              ))}
            </ul>
            <MaintainerSignIn returnTo={returnTo} caption={false} />
            <span className="text-sm text-muted-foreground">
              We read your public profile and your permission on this one repo, once. We keep your login, your role and
              your note; nothing is posted on GitHub.
            </span>
          </CardContent>
        </Card>
        <p className="text-[13px] text-muted-foreground">
          Rather not sign in? Write to{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-link hover:underline">
            {CONTACT_EMAIL}
          </a>{' '}
          with the PR link.
        </p>
      </Column>
    );
  }

  if (read.state === 'failed') {
    return (
      <Column flow={flow}>
        {read.card ? <PrCard card={read.card} /> : null}
        <Alert variant="destructive" data-error={read.error}>
          <AlertTitle className="line-clamp-none">
            {read.error === 'NOT_OURS' ? 'Not one of our pull requests' : 'We couldn’t open this pull request'}
          </AlertTitle>
          <AlertDescription>
            <p>{prFeedbackErrorMessage(read.error)}</p>
          </AlertDescription>
        </Alert>
        {read.error === 'SIGNED_OUT' ? (
          <MaintainerSignIn label="Sign in again" returnTo={returnTo} caption={false} />
        ) : isRetryablePrFeedbackError(read.error) ? (
          <Button asChild variant="outline" className="min-h-11 self-start sm:min-h-9">
            <a href={returnTo}>Try again</a>
          </Button>
        ) : (
          <Button asChild variant="outline" className="min-h-11 self-start sm:min-h-9">
            <a href={maintainersSectionPath('feedback')}>Back to the page for maintainers</a>
          </Button>
        )}
      </Column>
    );
  }

  const { card, viewer } = read;
  if (card.isAuthor) {
    return (
      <Column flow={flow}>
        <h1 className={TITLE}>This is your own pull request</h1>
        <PrCard card={card} />
        <p className="text-muted-foreground">
          Notes on it come from other people: the maintainers’ show on your contribution’s page.
        </p>
        <Button asChild variant="outline" className="min-h-11 self-start sm:min-h-9">
          <Link href={attemptPath(card.attemptId)} prefetch={false}>
            Open your contribution
          </Link>
        </Button>
      </Column>
    );
  }

  return (
    <Column flow={flow}>
      {flow === 'helped' ? (
        <PrHelpedForm card={card} viewer={viewer} returnTo={returnTo} orgAccessUrl={orgAccessUrl} initial={initial} />
      ) : (
        <PrReportForm card={card} viewer={viewer} returnTo={returnTo} orgAccessUrl={orgAccessUrl} initial={initial} />
      )}
    </Column>
  );
}
