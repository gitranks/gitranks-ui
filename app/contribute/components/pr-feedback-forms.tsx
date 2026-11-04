'use client';

import { type ReactNode, useEffect, useId, useRef, useState, useTransition } from 'react';

import { sendPrHelped, sendPrReport, signInAsMaintainer, undoPrAction } from '../maintainers/actions';
import { PrCard } from './pr-card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type {
  ContributeHelpedLike,
  ContributePrAction,
  ContributePrActionState,
  ContributePrCard,
  ContributePrFeedbackResult,
  ContributePrViewer,
  ContributeReportReason,
} from '@/lib/contribute/contribute.types';
import { isRetryablePrFeedbackError, type PrFeedbackErrorCode, prFeedbackErrorMessage } from '@/lib/contribute/errors';
import {
  actionChoicesOf,
  appliedActionText,
  HELPED_LIKES,
  hasErrors,
  helpedErrorsOf,
  maintainersSectionPath,
  PR_FEEDBACK_DETAILS_MAX,
  PR_FEEDBACK_REPLY_TO_MAX,
  type PrFeedbackFieldErrors,
  prUrlOf,
  REPORT_REASONS,
  reportErrorsOf,
  undoneActionText,
} from '@/lib/contribute/pr-feedback';
import { cn } from '@/lib/utils';

const TITLE = 'text-2xl font-semibold tracking-tight text-balance md:text-[32px] md:leading-tight';
const OPTIONAL = <span className="font-normal text-muted-foreground">optional</span>;

/** The visitor's role in the PR's repo, in plain words, as GitHub answered for their account. */
export function RoleBadge({ viewer, card }: { viewer: ContributePrViewer; card: ContributePrCard }) {
  const repo = card.nameWithOwner;
  if (viewer.roleConfirmed && viewer.role === 'MAINTAINER') {
    return (
      <Badge data-role="MAINTAINER" variant="secondary" className="bg-positive/15 px-3 py-1.5 text-[13px] font-medium">
        ✓ Maintainer of {repo} · confirmed with GitHub
      </Badge>
    );
  }
  if (viewer.roleConfirmed && viewer.role === 'COLLABORATOR') {
    return (
      <Badge data-role="COLLABORATOR" variant="secondary" className="px-3 py-1.5 text-[13px] font-medium">
        Collaborator in {repo} · can push code, not manage the repo
      </Badge>
    );
  }
  return (
    <Badge data-role="USER" variant="outline" className="px-3 py-1.5 text-[13px] font-medium whitespace-normal">
      {viewer.login ? `Signed in as ${viewer.login}` : 'Signed in'} ·{' '}
      {viewer.roleConfirmed ? `no role in ${repo}` : `role in ${repo} not confirmed`}
    </Badge>
  );
}

const WARNING = 'border-warning/40 bg-warning-soft text-warning-soft-foreground';

/** Why a report from this visitor applies nothing by itself: their role, or that GitHub could not confirm it. */
export function RoleAlert({
  viewer,
  card,
  returnTo,
  orgAccessUrl,
}: {
  viewer: ContributePrViewer;
  card: ContributePrCard;
  returnTo: string;
  orgAccessUrl: string;
}) {
  if (viewer.roleConfirmed && viewer.role === 'MAINTAINER') return null;
  const repo = card.nameWithOwner;
  const orgHint = viewer.restrictedOrg ? (
    <p data-org-hint="">
      If {viewer.restrictedOrg} restricts third-party apps, GitHub may hide your role from us. An org owner can approve
      GitRanks; until then you can still report.{' '}
      <a href={orgAccessUrl} target="_blank" rel="noopener noreferrer" className="text-link hover:underline">
        Ask for approval on GitHub ↗
      </a>
    </p>
  ) : null;

  if (!viewer.roleConfirmed) {
    return (
      <Alert data-role-alert="unconfirmed" className={WARNING}>
        <AlertTitle className="line-clamp-none">We couldn’t confirm your role in {repo}</AlertTitle>
        <AlertDescription className="text-current/90">
          <p>
            GitHub didn’t tell us, so nothing changes by itself. You can still report, and a person reviews it within
            one working day.
          </p>
          {orgHint}
        </AlertDescription>
      </Alert>
    );
  }
  if (viewer.role === 'COLLABORATOR') {
    return (
      <Alert data-role-alert="collaborator" className={WARNING}>
        <AlertTitle className="line-clamp-none">You can report, but not stop work here</AlertTitle>
        <AlertDescription className="text-current/90">
          <p>
            GitHub shows you can push code here but not manage the repo’s settings, and stopping our work takes that.
            Your report is marked as from the team and we look at it the same day. To stop work now, ask an admin.
          </p>
        </AlertDescription>
      </Alert>
    );
  }
  return (
    <Alert data-role-alert="user" className={WARNING}>
      <AlertTitle className="line-clamp-none">We can’t confirm you maintain {repo}</AlertTitle>
      <AlertDescription className="text-current/90">
        <p>
          GitHub shows this account isn’t on the repo’s team. You can still report: nothing changes by itself, and a
          person reviews it within one working day.
        </p>
        <div className="flex flex-wrap items-center gap-x-1">
          <span>Maintain the repo with another account?</span>
          <form action={signInAsMaintainer}>
            <input type="hidden" name="returnTo" value={returnTo} />
            <Button type="submit" variant="link" className="h-auto p-0 text-link">
              Sign in as that account
            </Button>
          </form>
        </div>
        {orgHint}
      </AlertDescription>
    </Alert>
  );
}

function CheckRow({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex min-h-11 items-center gap-2.5 sm:min-h-0">
      <Checkbox id={id} checked={checked} onCheckedChange={(value) => onChange(value === true)} />
      <Label htmlFor={id} className="font-normal">
        {label}
      </Label>
    </div>
  );
}

function CheckCard({
  id,
  title,
  text,
  checked,
  disabled,
  onChange,
}: {
  id: string;
  title: string;
  text: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <Label
      htmlFor={id}
      data-check-card={id}
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-lg border p-3.5 font-normal',
        checked && 'border-primary bg-primary/10',
        disabled && 'cursor-not-allowed opacity-55',
      )}
    >
      <Checkbox
        id={id}
        className="mt-0.5"
        checked={checked}
        disabled={disabled}
        onCheckedChange={(value) => onChange(value === true)}
      />
      <span className="flex flex-col gap-1">
        <span className="text-sm font-medium">{title}</span>
        <span className="text-sm text-muted-foreground">{text}</span>
      </span>
    </Label>
  );
}

function FieldError({ id, children }: { id: string; children?: string }) {
  return children ? (
    <p id={id} data-field-error="" className="text-sm text-destructive">
      {children}
    </p>
  ) : null;
}

/** A send that failed: why, in plain words, and the way on (another try keeps the form as it was). */
function SendError({ error, returnTo }: { error: PrFeedbackErrorCode; returnTo: string }) {
  return (
    <Alert variant="destructive" data-send-error={error}>
      <AlertTitle className="line-clamp-none">
        {isRetryablePrFeedbackError(error) ? 'Not finished' : 'Not sent'}
      </AlertTitle>
      <AlertDescription>
        <p>{prFeedbackErrorMessage(error)}</p>
        {error === 'SIGNED_OUT' ? (
          <form action={signInAsMaintainer}>
            <input type="hidden" name="returnTo" value={returnTo} />
            <Button type="submit" variant="outline" className="mt-1 min-h-11 sm:min-h-9">
              Sign in again
            </Button>
          </form>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}

function ReplyToField({
  id,
  value,
  onChange,
  error,
  hint,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>
        Reply to <span className="font-normal text-muted-foreground">{hint}</span>
      </Label>
      <Input
        id={id}
        type="email"
        value={value}
        maxLength={PR_FEEDBACK_REPLY_TO_MAX + 1}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error ${id}-help` : `${id}-help`}
        className="max-sm:min-h-11"
      />
      <FieldError id={`${id}-error`}>{error}</FieldError>
      <span id={`${id}-help`} className="text-xs text-muted-foreground">
        From your GitHub account; change it if you like.
      </span>
    </div>
  );
}

const toggled = <T,>(set: Set<T>, value: T, on: boolean) => {
  const next = new Set(set);
  if (on) next.add(value);
  else next.delete(value);
  return next;
};

/** Moves focus to the first field a check refused, in the form's order. */
const focusFirst = (ids: (string | false)[]) => {
  const first = ids.find((value): value is string => !!value);
  if (first) document.getElementById(first)?.focus();
};

/** A sent page's heading takes the focus the replaced form had, so a screen reader hears what happened. */
function useFocusOnMount<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => ref.current?.focus(), []);
  return ref;
}

export type PrReportInitial = { reasons?: ContributeReportReason[]; details?: string; actions?: ContributePrAction[] };

/** "Report this PR": what went wrong, the details, and for a maintainer what to stop at once. */
export function PrReportForm({
  card,
  viewer,
  returnTo,
  orgAccessUrl,
  initial,
}: {
  card: ContributePrCard;
  viewer: ContributePrViewer;
  returnTo: string;
  orgAccessUrl: string;
  /** The form as it starts: the catalogue draws it filled in. */
  initial?: PrReportInitial;
}) {
  const id = useId();
  const maintainer = viewer.roleConfirmed && viewer.role === 'MAINTAINER';
  const [reasons, setReasons] = useState(() => new Set(initial?.reasons ?? []));
  const [details, setDetails] = useState(initial?.details ?? '');
  const [actions, setActions] = useState(() => new Set(maintainer ? (initial?.actions ?? []) : []));
  const [replyTo, setReplyTo] = useState(viewer.replyTo ?? '');
  const [errors, setErrors] = useState<PrFeedbackFieldErrors>({});
  const [error, setError] = useState<PrFeedbackErrorCode | null>(null);
  const [sent, setSent] = useState<ContributePrFeedbackResult | null>(null);
  const [pending, startTransition] = useTransition();

  if (sent) {
    return (
      <ReportSent
        card={card}
        result={sent}
        requested={maintainer ? [...actions] : []}
        replyTo={replyTo.trim() || null}
      />
    );
  }

  const send = () => {
    const fields = { reasons: [...reasons], details, replyTo };
    const found = reportErrorsOf(fields);
    setErrors(found);
    if (hasErrors(found)) {
      focusFirst([
        !!found.reasons && `${id}-${REPORT_REASONS[0].value}`,
        !!found.details && `${id}-details`,
        !!found.replyTo && `${id}-reply`,
      ]);
      return;
    }
    startTransition(async () => {
      setError(null);
      const result = await sendPrReport({
        from: card.attemptId,
        ...fields,
        reasons: [...reasons],
        actions: maintainer ? [...actions] : [],
      });
      if (result.ok) setSent(result.data);
      else setError(result.error);
    });
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <RoleBadge viewer={viewer} card={card} />
      </div>
      <PrCard card={card} />
      <RoleAlert viewer={viewer} card={card} returnTo={returnTo} orgAccessUrl={orgAccessUrl} />
      <Card className="py-6">
        <CardContent className="flex flex-col gap-6">
          <form
            className="flex flex-col gap-6"
            onSubmit={(event) => {
              event.preventDefault();
              send();
            }}
          >
            <fieldset
              className="flex flex-col gap-3"
              aria-describedby={errors.reasons ? `${id}-reasons-error` : undefined}
            >
              <legend className="mb-3 text-sm font-medium">What went wrong</legend>
              <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                {REPORT_REASONS.map(({ value, label }) => (
                  <CheckRow
                    key={value}
                    id={`${id}-${value}`}
                    label={label}
                    checked={reasons.has(value)}
                    onChange={(on) => setReasons((current) => toggled(current, value, on))}
                  />
                ))}
              </div>
              <FieldError id={`${id}-reasons-error`}>{errors.reasons}</FieldError>
            </fieldset>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`${id}-details`}>Details {OPTIONAL}</Label>
              <Textarea
                id={`${id}-details`}
                value={details}
                maxLength={PR_FEEDBACK_DETAILS_MAX + 1}
                onChange={(event) => setDetails(event.target.value)}
                aria-invalid={!!errors.details}
                aria-describedby={errors.details ? `${id}-details-error` : undefined}
                placeholder="What happened, in a line or two"
              />
              <FieldError id={`${id}-details-error`}>{errors.details}</FieldError>
            </div>
            <fieldset className="flex flex-col gap-2.5">
              <legend className="mb-1.5 flex flex-col gap-1.5">
                <span className="text-sm font-medium">Want us to stop something right away? {OPTIONAL}</span>
                <span className="text-sm text-muted-foreground">
                  {maintainer
                    ? 'Pick any. They apply the moment you send the report, before we read it. Undo any of them later under Your repos.'
                    : `Only admins and maintainers of ${card.nameWithOwner} can do this. We check your report first, then decide.`}
                </span>
              </legend>
              {actionChoicesOf(card).map(({ value, title, text }) => (
                <CheckCard
                  key={value}
                  id={`${id}-${value}`}
                  title={title}
                  text={text}
                  checked={actions.has(value)}
                  disabled={!maintainer}
                  onChange={(on) => setActions((current) => toggled(current, value, on))}
                />
              ))}
            </fieldset>
            <ReplyToField
              id={`${id}-reply`}
              value={replyTo}
              onChange={setReplyTo}
              error={errors.replyTo}
              hint="we answer every report"
            />
            <Button type="submit" size="lg" className="min-h-11 self-start px-6 font-semibold" disabled={pending}>
              {pending ? 'Sending…' : maintainer && actions.size ? 'Send report and apply' : 'Send report'}
            </Button>
          </form>
          {error ? <SendError error={error} returnTo={returnTo} /> : null}
        </CardContent>
      </Card>
    </>
  );
}

const live = (actions: ContributePrActionState[]) => actions.filter(({ undoneAt }) => !undoneAt);

/** After a report: what applied at once (each with Undo), and what happens next. */
export function ReportSent({
  card,
  result,
  requested = [],
  replyTo,
}: {
  card: ContributePrCard;
  result: ContributePrFeedbackResult;
  /** What the visitor asked to stop at once: GitHub's answer at the send decides whether it applied. */
  requested?: ContributePrAction[];
  replyTo: string | null;
}) {
  // The role GitHub gave at the send, not the one the form was shown for.
  const maintainer = result.role === 'MAINTAINER';
  const dropped = requested.length > 0 && !maintainer;
  const heading = useFocusOnMount<HTMLHeadingElement>();
  const [actions, setActions] = useState(result.actions);
  const [undone, setUndone] = useState<ContributePrAction[]>([]);
  const [error, setError] = useState<PrFeedbackErrorCode | null>(null);
  const [pending, startTransition] = useTransition();
  const applied = live(actions);

  const undo = (kind: ContributePrAction) =>
    startTransition(async () => {
      setError(null);
      const answer = await undoPrAction({ feedbackId: result.feedbackId, repoId: card.repositoryId, kind });
      if (answer.ok) {
        setActions(answer.data.actions);
        setUndone((current) => [...current, kind]);
      } else setError(answer.error);
    });

  const contributor = card.contributorLogin ?? 'its author';
  return (
    <div data-sent={result.label} className="flex flex-col gap-5">
      <h1 ref={heading} tabIndex={-1} className={cn(TITLE, 'outline-none')}>
        {applied.length ? 'Thanks. It’s with us, and your choices already apply' : 'Thanks. It’s with us'}
      </h1>
      <PrCard card={card} />
      {dropped ? (
        <Alert data-dropped="" className="border-warning/40 bg-warning-soft text-warning-soft-foreground">
          <AlertTitle className="line-clamp-none">Nothing was applied</AlertTitle>
          <AlertDescription className="text-current/90">
            GitHub no longer confirms you maintain {card.nameWithOwner}, so nothing was applied; your report is with us.
          </AlertDescription>
        </Alert>
      ) : null}
      {applied.length || undone.length ? (
        <Alert data-applied="" className="border-positive/30 bg-positive/10">
          <AlertTitle>Done at once</AlertTitle>
          <AlertDescription className="text-foreground">
            {applied.map(({ kind }) => (
              <p key={kind} data-action={kind}>
                {appliedActionText(kind, card)}{' '}
                <Button
                  type="button"
                  variant="link"
                  className="h-auto p-0 text-link"
                  disabled={pending}
                  onClick={() => undo(kind)}
                >
                  Undo
                </Button>
              </p>
            ))}
            {undone.map((kind) => (
              <p key={`undone-${kind}`} data-undone={kind} className="text-muted-foreground">
                {undoneActionText(kind, card)}
              </p>
            ))}
            {error ? (
              <p role="alert" className="text-destructive">
                {prFeedbackErrorMessage(error, 'undo')}
              </p>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}
      <Card className="gap-3 p-5 shadow-none">
        <strong className="text-[15px] font-semibold">What happens next</strong>
        <NextStep n={1} title="A person reads it today">
          Report {result.label}
          {result.added ? ', with what you wrote before' : null}
        </NextStep>
        <NextStep n={2} title={`We check the PR, the agent’s run and what ${contributor} reviewed`}>
          and tell {contributor} what you reported, without your name
        </NextStep>
        {replyTo ? (
          <NextStep n={3} title={`We write to ${replyTo}`}>
            with what we found and what we changed
          </NextStep>
        ) : null}
      </Card>
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" className="min-h-11 sm:min-h-9">
          <a href={prUrlOf(card)}>Back to the PR on GitHub</a>
        </Button>
        {maintainer ? (
          <Button asChild variant="outline" className="min-h-11 sm:min-h-9">
            <a href={maintainersSectionPath('opt-out')}>Rules for {card.nameWithOwner}</a>
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function NextStep({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[36px_1fr] items-start gap-3">
      <span
        aria-hidden="true"
        className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary"
      >
        {n}
      </span>
      <div className="flex flex-col gap-0.5">
        <strong className="text-sm font-semibold">{title}</strong>
        <span className="text-[13px] text-muted-foreground">{children}</span>
      </div>
    </div>
  );
}

export type PrHelpedInitial = { likes?: ContributeHelpedLike[]; word?: string };

/** "This PR helped": what they liked, a word for its author, and whether we may quote it. */
export function PrHelpedForm({
  card,
  viewer,
  returnTo,
  orgAccessUrl,
  initial,
}: {
  card: ContributePrCard;
  viewer: ContributePrViewer;
  returnTo: string;
  orgAccessUrl: string;
  initial?: PrHelpedInitial;
}) {
  const id = useId();
  const [likes, setLikes] = useState(() => new Set(initial?.likes ?? []));
  const [word, setWord] = useState(initial?.word ?? '');
  const [mayQuote, setMayQuote] = useState(false);
  const [replyTo, setReplyTo] = useState(viewer.replyTo ?? '');
  const [errors, setErrors] = useState<PrFeedbackFieldErrors>({});
  const [error, setError] = useState<PrFeedbackErrorCode | null>(null);
  const [sent, setSent] = useState<ContributePrFeedbackResult | null>(null);
  const [pending, startTransition] = useTransition();
  const contributor = card.contributorLogin ?? 'its author';
  // A user's word reaches us alone; a maintainer's or collaborator's reaches the PR's author too.
  const wordShown = viewer.roleConfirmed && viewer.role !== 'USER';

  if (sent) return <HelpedSent card={card} />;

  const send = () => {
    const found = helpedErrorsOf({ word, replyTo });
    setErrors(found);
    if (hasErrors(found)) {
      focusFirst([!!found.details && `${id}-word`, !!found.replyTo && `${id}-reply`]);
      return;
    }
    startTransition(async () => {
      setError(null);
      const result = await sendPrHelped({ from: card.attemptId, likes: [...likes], word, mayQuote, replyTo });
      if (result.ok) setSent(result.data);
      else setError(result.error);
    });
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <RoleBadge viewer={viewer} card={card} />
      </div>
      <h1 className={TITLE}>Glad it helped. What worked?</h1>
      <PrCard card={card} />
      {viewer.roleConfirmed ? null : (
        <RoleAlert viewer={viewer} card={card} returnTo={returnTo} orgAccessUrl={orgAccessUrl} />
      )}
      <Card className="py-6">
        <CardContent className="flex flex-col gap-6">
          <form
            className="flex flex-col gap-6"
            onSubmit={(event) => {
              event.preventDefault();
              send();
            }}
          >
            <fieldset className="flex flex-col gap-3">
              <legend className="mb-3 text-sm font-medium">What you liked {OPTIONAL}</legend>
              <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                {HELPED_LIKES.map(({ value, label }) => (
                  <CheckRow
                    key={value}
                    id={`${id}-${value}`}
                    label={label}
                    checked={likes.has(value)}
                    onChange={(on) => setLikes((current) => toggled(current, value, on))}
                  />
                ))}
              </div>
            </fieldset>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`${id}-word`}>
                A word for {contributor} {OPTIONAL}
              </Label>
              <Textarea
                id={`${id}-word`}
                value={word}
                maxLength={PR_FEEDBACK_DETAILS_MAX + 1}
                onChange={(event) => setWord(event.target.value)}
                aria-invalid={!!errors.details}
                aria-describedby={errors.details ? `${id}-word-error ${id}-word-help` : `${id}-word-help`}
              />
              <FieldError id={`${id}-word-error`}>{errors.details}</FieldError>
              <span
                id={`${id}-word-help`}
                data-word-shown={wordShown ? 'yes' : 'no'}
                className="text-xs text-muted-foreground"
              >
                {wordShown
                  ? `We pass it on to ${contributor} on GitRanks, with your login.`
                  : `It reaches us. ${contributor} sees what you liked; only maintainers’ and collaborators’ words are passed on.`}
              </span>
            </div>
            <CheckCard
              id={`${id}-quote`}
              title="You may quote this on gitranks.com"
              text="With your login and the repo name. We ask again before anything goes up."
              checked={mayQuote}
              onChange={setMayQuote}
            />
            <ReplyToField
              id={`${id}-reply`}
              value={replyTo}
              onChange={setReplyTo}
              error={errors.replyTo}
              hint="optional, if you’d like an answer"
            />
            <Button type="submit" size="lg" className="min-h-11 self-start px-6 font-semibold" disabled={pending}>
              {pending ? 'Sending…' : 'Send'}
            </Button>
          </form>
          {error ? <SendError error={error} returnTo={returnTo} /> : null}
        </CardContent>
      </Card>
    </>
  );
}

/** After "This PR helped": it is on the author's page, and how to get more PRs like it. */
export function HelpedSent({ card }: { card: ContributePrCard }) {
  const contributor = card.contributorLogin ?? 'Its author';
  const heading = useFocusOnMount<HTMLHeadingElement>();
  return (
    <div data-sent="helped" className="flex flex-col gap-5">
      <h1 ref={heading} tabIndex={-1} className={cn(TITLE, 'outline-none')}>
        Noted. {contributor} will see it
      </h1>
      <PrCard card={card} />
      <Alert className="border-positive/30 bg-positive/10">
        <AlertTitle>Sent</AlertTitle>
        <AlertDescription className="text-foreground">
          Your note is on {card.contributorLogin ? `${card.contributorLogin}’s` : 'their'} contribution page. Good words
          also teach our checks what your repo likes.
        </AlertDescription>
      </Alert>
      <Card className="gap-2.5 p-5 shadow-none">
        <strong className="text-[15px] font-semibold">Want more PRs like this?</strong>
        <span className="text-sm text-muted-foreground">
          Add the badge to your README so contributors know {card.nameWithOwner} welcomes careful help, and set your
          rules in .github/gitranks.yml.
        </span>
        <div className="flex flex-wrap gap-2">
          <Button asChild className="min-h-11 sm:min-h-9">
            <a href={maintainersSectionPath('work-with-us', card.attemptId)}>Get the badge</a>
          </Button>
          <Button asChild variant="outline" className="min-h-11 sm:min-h-9">
            <a href={maintainersSectionPath('opt-out')}>Rules for {card.nameWithOwner}</a>
          </Button>
        </div>
      </Card>
      <Button asChild variant="outline" className="min-h-11 self-start sm:min-h-9">
        <a href={prUrlOf(card)}>Back to the PR on GitHub</a>
      </Button>
    </div>
  );
}
