'use client';

import { signIn, useSession } from 'next-auth/react';
import { type FC, useEffect, useState } from 'react';
import { toast } from 'sonner';

import {
  formatReviewDate,
  loadStarsReviewOwnerState,
  rereadOwnerState,
  type StarsReviewOwnerLoad,
  type StarsReviewReportState,
  sendStarsReviewReport,
  starsReviewReportState,
  starsReviewViewer,
} from '../utils/stars-review';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { IDENTITY_PROVIDER } from '@/lib/auth-providers';

const BUTTON_LABEL = 'This is a mistake';

// The trigger reads as a link at the end of the note's sentence.
const LINK_CLASS =
  'inline cursor-pointer underline underline-offset-2 decoration-muted-foreground/60 hover:text-foreground hover:decoration-foreground disabled:cursor-default disabled:opacity-60';

const onDate = (iso: string) => {
  const date = formatReviewDate(iso);
  return date ? ` on ${date}` : '';
};

type StarsReviewReportViewProps = {
  view: StarsReviewReportState;
  login: string;
  onReport: () => void;
};

export const StarsReviewReportView: FC<StarsReviewReportViewProps> = ({ view, login, onReport }) => {
  if (view.kind === 'none') {
    return null;
  }

  if (view.kind === 'submitted') {
    return <span>{`Your request was submitted${onDate(view.submittedAt)}.`}</span>;
  }

  if (view.kind === 'declined') {
    return <span>{`Your request was reviewed and declined${onDate(view.decidedAt)}.`}</span>;
  }

  if (view.action === 'switchAccount') {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <button type="button" className={LINK_CLASS}>
            {BUTTON_LABEL}
          </button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{BUTTON_LABEL}?</DialogTitle>
            <DialogDescription>To report this, sign in as @{login}.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                OK
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // A report only needs to know who the owner is: the light sign-in, no token.
  const onClick = { wait: undefined, signIn: () => signIn(IDENTITY_PROVIDER), report: onReport }[view.action];

  return (
    <button type="button" className={LINK_CLASS} onClick={onClick} disabled={view.action === 'wait'}>
      {BUTTON_LABEL}
    </button>
  );
};

type StarsReviewReportProps = {
  login: string;
  reportable: boolean;
};

/** The "This is a mistake" button, and what the profile's owner sees once they used it. */
export const StarsReviewReport: FC<StarsReviewReportProps> = ({ login, reportable }) => {
  const { data: session, status } = useSession();
  const viewer = starsReviewViewer(status, session?.user?.githubLogin, login);
  const [owner, setOwner] = useState<StarsReviewOwnerLoad>('loading');
  const [sentAt, setSentAt] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Read outside the page cache, and only by the profile's owner.
  useEffect(() => {
    const load = loadStarsReviewOwnerState(viewer, login);

    if (!load) {
      return;
    }

    let current = true;
    load.then((state) => {
      if (current) {
        setOwner(state);
      }
    });

    return () => {
      current = false;
    };
  }, [viewer, login]);

  const report = async () => {
    setPending(true);

    try {
      const result = await sendStarsReviewReport(login);

      if (result.outcome === 'sent') {
        setSentAt(result.submittedAt);
        return;
      }

      setOwner((previous) => rereadOwnerState(previous, result.owner));
      toast.error(
        result.outcome === 'failed'
          ? 'Could not send your request. Please try again later.'
          : 'This review has changed since the page loaded.',
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <StarsReviewReportView
      view={starsReviewReportState({ reportable, viewer, owner, sentAt, pending })}
      login={login}
      onReport={report}
    />
  );
};
