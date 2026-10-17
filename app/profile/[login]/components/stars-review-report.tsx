'use client';

import { signIn, useSession } from 'next-auth/react';
import { type FC, useEffect, useState } from 'react';
import { toast } from 'sonner';

import {
  fetchStarsReviewOwnerState,
  formatReviewDate,
  type StarsReviewOwnerLoad,
  type StarsReviewReportState,
  starsReviewReportState,
  starsReviewViewer,
  submitStarsReviewReport,
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

const BUTTON_LABEL = 'This is a mistake';

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
    return <p>Your request was submitted on {formatReviewDate(view.submittedAt)}.</p>;
  }

  if (view.kind === 'declined') {
    return <p>Your request was reviewed and declined on {formatReviewDate(view.decidedAt)}.</p>;
  }

  if (view.action === 'switchAccount') {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button size="sm" variant="outline">
            {BUTTON_LABEL}
          </Button>
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

  const onClick = { wait: undefined, signIn: () => signIn('github'), report: onReport }[view.action];

  return (
    <Button size="sm" variant="outline" onClick={onClick} disabled={view.action === 'wait'}>
      {BUTTON_LABEL}
    </Button>
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
  const [pending, setPending] = useState(false);

  // Read outside the page cache, and only by the profile's owner.
  useEffect(() => {
    if (viewer !== 'owner') {
      return;
    }

    let current = true;
    fetchStarsReviewOwnerState(login).then((state) => {
      if (current) {
        setOwner(state ?? 'public');
      }
    });

    return () => {
      current = false;
    };
  }, [viewer, login]);

  const report = async () => {
    setPending(true);
    const submittedAt = await submitStarsReviewReport(login);

    if (submittedAt) {
      setOwner((state) => (typeof state === 'object' ? { ...state, report: { submittedAt } } : state));
    } else {
      toast.error('Could not send your request. Please try again later.');
      // The review may have changed since the page loaded.
      setOwner((await fetchStarsReviewOwnerState(login)) ?? 'public');
    }

    setPending(false);
  };

  return (
    <StarsReviewReportView
      view={starsReviewReportState({ reportable, viewer, owner, pending })}
      login={login}
      onReport={report}
    />
  );
};
