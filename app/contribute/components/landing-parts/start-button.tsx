import Link from 'next/link';

import { buttonVariants } from '@/components/ui/button';
import { ResumeLink } from '@/components/workspace/getting-in/resume-link';
import { cn } from '@/lib/utils';
import { contributeSource } from '@/lib/workspace/click-tracking';
import type { LandingStart } from '@/lib/workspace/getting-in';
import { WORKSPACE_PATHS } from '@/lib/workspace/paths';

/**
 * The landing's one button, in the head and again at the foot. Full width on a phone. Start contributing, into the
 * flow; for a member reading how it works, Go to your issues, back to Contribute home.
 */
export function LandingStartButton({ start }: { start: LandingStart }) {
  const classes = cn(buttonVariants({ size: 'lg' }), 'min-h-11.5 px-5 text-base font-semibold max-sm:flex-[1_1_100%]');
  if ('member' in start) {
    return (
      // Unmarked: a member going back to their issues is no start, and the landing's mark counts starts.
      <Link href={WORKSPACE_PATHS.contribute} prefetch={false} className={classes} data-landing-start="">
        Go to your issues
      </Link>
    );
  }
  return (
    <ResumeLink
      side="contribute"
      href={start.href}
      signedIn={start.signedIn}
      className={classes}
      data-landing-start=""
      {...contributeSource('contribute_landing')}
    >
      Start contributing
    </ResumeLink>
  );
}
