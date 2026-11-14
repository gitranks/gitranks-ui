'use client';

import { useSession } from 'next-auth/react';
import { type FC, type ReactNode, useEffect, useState } from 'react';

import { ContributeSection } from './contribute-section';
import { LearnSectionView } from './learn-section';
import { dismissLearnPromo } from '@/app/learn/actions';
import { reportPromo } from '@/app/learn/components/use-promo-report';
import type { ShownPromo } from '@/lib/learn/learn-promo';
import { readLearnPromo } from '@/lib/learn/learn-promo-read';

/**
 * The home page's one suggestion, as drawn: Learn's own section for a user it may suit (`promo`), in the Contribute
 * section's place; else Contribute's section, followed by Learn's for visitors (`learnForVisitors`) unless the viewer is
 * signed in (it is for visitors; a signed-in user it suits gets their own) or has just turned Learn down.
 */
export const LandingPromosView: FC<{
  learnForVisitors: ReactNode;
  promo: ShownPromo | null;
  signedIn: boolean;
  dismissed: boolean;
  onDismiss?: () => void;
}> = ({ learnForVisitors, promo, signedIn, dismissed, onDismiss }) => {
  if (promo) return <LearnSectionView promo={promo} onDismiss={onDismiss} />;
  return (
    <>
      <ContributeSection />
      {signedIn || dismissed ? null : learnForVisitors}
    </>
  );
};

/**
 * The home page's one suggestion: GitRanks Contribute's section, followed by `learnForVisitors` (Learn's section, the
 * same for everyone, rendered with the cached page). For a signed-in user Learn may suit, read in the browser after
 * the page, Learn's own suggestion takes the Contribute section's place. "Not for me" brings Contribute back.
 * `promo`: the answer to draw with, instead of asking (the design catalogue).
 */
export const LandingPromos: FC<{ learnForVisitors: ReactNode; promo?: ShownPromo }> = ({
  learnForVisitors,
  promo: given,
}) => {
  const { data: session, status } = useSession();
  const viewer = session && !session.error ? session.user?.githubLogin : undefined;
  const [promo, setPromo] = useState<ShownPromo | null>(given ?? null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (given) return;
    setPromo(null);
    if (!viewer) return;
    let live = true;
    readLearnPromo('LANDING', viewer).then((got) => {
      if (live) setPromo(got);
    });
    return () => {
      live = false;
    };
  }, [viewer, given]);

  const dismiss = () => {
    reportPromo('promo_dismissed', 'learn_promo_signed_in');
    setPromo(null);
    setDismissed(true);
    void dismissLearnPromo().catch(() => {});
  };

  return (
    <LandingPromosView
      learnForVisitors={learnForVisitors}
      promo={promo}
      signedIn={status === 'authenticated' && !!viewer}
      dismissed={dismissed}
      onDismiss={dismiss}
    />
  );
};
