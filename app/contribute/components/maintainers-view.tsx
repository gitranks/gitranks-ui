import type { ReactNode } from 'react';

import { signInAsMaintainer } from '../maintainers/actions';
import { MaintainerReposForm } from './maintainer-repos-form';
import { Eyebrow, Panel, PanelTitle } from './primitives';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MAINTAINERS_PATH } from '@/lib/contribute/contribute-path';
import { type MaintainerErrorCode, maintainerErrorMessage } from '@/lib/contribute/errors';
import type { MaintainerReposView } from '@/lib/contribute/maintainers.data';
import { CONTACT_EMAIL } from '@/lib/legal';

const RULES = [
  { count: '1', title: 'open PR at a time', text: 'and at most 4 in a month, across all our users' },
  { count: '2', title: 'closed in a row pause us', text: 'for 60 days, without anyone having to ask' },
  { count: '0', title: 'changes to workflows or CI', text: 'and none to license files or unrelated lockfiles' },
];

const PROMISES = [
  'We only take issues a maintainer agreed should be fixed, with nobody assigned and no PR yet',
  'We skip any repo whose CONTRIBUTING or AI policy says no to AI contributions',
  'Every PR says it was made with AI, and says whether its author reviewed it line by line',
  'Tests were run before the PR opened, and the author answers your review, not a bot',
];

export const OPT_OUT_TITLE = 'Opt out with your GitHub account';
const OPT_OUT_TEXT =
  'We check with GitHub that you can administer or maintain each repo, then stop at once. Open PRs stay as they are; close them if you like.';

/** The page for maintainers: what Contribute does in their repo, and the three ways to keep it out. */
export function MaintainersScreen({ repos }: { repos: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 flex flex-col gap-9 pt-10 pb-16">
      <div className="flex max-w-3xl flex-col gap-3">
        <Eyebrow className="text-primary">For maintainers</Eyebrow>
        <h1 className="text-4xl font-bold tracking-tight text-balance">
          Pull requests from GitRanks, and how to stop them
        </h1>
        <p className="text-lg text-muted-foreground">
          Developers on GitRanks spend their own AI credits on issues in open-source repos: an agent works on the issue,
          the developer reviews the change, and the pull request opens in their name. These are the rules every one of
          those pull requests follows in your repo.
        </p>
      </div>

      <ul className="grid gap-3.5 sm:grid-cols-3">
        {RULES.map(({ count, title, text }) => (
          <li key={title} className="flex min-w-0 flex-col gap-1.5 rounded-xl bg-muted/50 p-5">
            <span className="font-mono text-2xl font-bold text-primary">{count}</span>
            <span className="font-semibold">{title}</span>
            <span className="text-sm text-muted-foreground">{text}</span>
          </li>
        ))}
      </ul>

      <ul className="grid gap-x-7 gap-y-3 md:grid-cols-2">
        {PROMISES.map((promise) => (
          <li key={promise} className="flex gap-2.5">
            <span aria-hidden="true" className="text-positive">
              ✓
            </span>
            <span>{promise}</span>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-stretch gap-5">
        <div className="flex min-w-0 flex-[1_1_440px] flex-col">{repos}</div>
        <FileOptions />
      </div>
    </main>
  );
}

/** Opting out without signing in: the file, or the repo's own AI policy. */
function FileOptions() {
  return (
    <section className="flex min-w-0 flex-[1_1_380px] flex-col gap-3 rounded-xl bg-muted/50 p-5 sm:p-6">
      <PanelTitle
        title="Or add a file to the repo"
        text="We read it before every PR. Removing it later lets us back in."
      />
      <pre className="dark overflow-x-auto rounded-lg bg-background px-4 py-3.5 font-mono text-sm leading-relaxed text-foreground">
        <code>
          <span className="text-muted-foreground"># .github/gitranks.yml</span>
          {'\n'}contribute: off
        </code>
      </pre>
      <p className="text-sm text-muted-foreground">
        A clear &ldquo;no AI contributions&rdquo; line in CONTRIBUTING.md, or an AI_POLICY.md that says so, works too.
      </p>
      <p className="text-xs text-muted-foreground">
        Questions, or a bad PR to report:{' '}
        <a href={`mailto:${CONTACT_EMAIL}`} className="font-mono text-foreground/80 hover:underline">
          {CONTACT_EMAIL}
        </a>
      </p>
    </section>
  );
}

/** The light GitHub sign-in, back to this page. */
export function MaintainerSignIn({ label = 'Sign in with GitHub' }: { label?: string }) {
  return (
    <form action={signInAsMaintainer} className="flex flex-col items-start gap-2">
      <Button type="submit" className="min-h-11 px-5 font-semibold">
        {label}
      </Button>
      <span className="text-xs text-muted-foreground">
        This signs you in to GitRanks with GitHub, which lets us read your profile and email addresses. We use that
        access only on this page, to list your repos and check your role in them, and no longer use it after an hour. If
        you are signed in to GitRanks as another account, you switch to the GitHub account you sign in with.
      </span>
    </form>
  );
}

function OptOutPanel({ children }: { children: ReactNode }) {
  return <Panel className="h-full border-primary/40">{children}</Panel>;
}

/** While the visitor's repositories are read from GitHub. */
export function MaintainerReposLoading() {
  return (
    <OptOutPanel>
      <PanelTitle title={OPT_OUT_TITLE} text={OPT_OUT_TEXT} />
      <div className="flex flex-col gap-2" aria-busy="true">
        <span className="text-sm text-muted-foreground">Reading your repos from GitHub…</span>
        <Skeleton className="h-11 w-full rounded-lg" />
        <Skeleton className="h-11 w-full rounded-lg" />
        <Skeleton className="h-11 w-full rounded-lg" />
      </div>
    </OptOutPanel>
  );
}

/** The opt-out: a sign-in, the repositories to choose from, or why they could not be read. */
export function MaintainerReposPanel({ view }: { view: MaintainerReposView }) {
  if (view.state === 'listed') {
    return (
      <OptOutPanel>
        <MaintainerReposForm
          title={OPT_OUT_TITLE}
          text={OPT_OUT_TEXT}
          login={view.data.login}
          repos={view.data.repos}
          truncated={view.data.truncated}
        />
      </OptOutPanel>
    );
  }

  const error = view.state === 'failed' ? view.error : null;
  return (
    <OptOutPanel>
      <PanelTitle
        title={OPT_OUT_TITLE}
        text={`Sign in with GitHub and we list the public repos you administer or maintain. ${OPT_OUT_TEXT}`}
      />
      {error ? (
        <p role="alert" data-error={error} className="text-sm text-destructive">
          {maintainerErrorMessage(error)}
        </p>
      ) : null}
      <NextStep error={error} />
    </OptOutPanel>
  );
}

/** A sign-in when there is none or GitHub refused it; after an outage, another try; nothing for what is not there. */
function NextStep({ error }: { error: MaintainerErrorCode | null }) {
  if (!error) return <MaintainerSignIn />;
  if (error === 'SIGNED_OUT') return <MaintainerSignIn label="Sign in again" />;
  if (error === 'NOT_AVAILABLE_YET') return null;
  return (
    <Button asChild variant="outline" className="min-h-11 self-start">
      <a href={MAINTAINERS_PATH}>Try again</a>
    </Button>
  );
}
