'use client';

import { sendGAEvent } from '@next/third-parties/google';
import { XIcon } from 'lucide-react';
import { type ReactNode, useLayoutEffect } from 'react';

import { hideLaunchBar, type LaunchBarId } from './launch-bar.consts';
import { Button } from '@/components/ui/button';

/** A bar's X: hides that bar in this browser for good. A 44px target on phones. */
export function LaunchBarDismiss({ bar }: { bar: LaunchBarId }) {
  return (
    <Button
      variant="ghost"
      size="icon-xs"
      aria-label="Hide this announcement"
      className="text-muted-foreground max-md:-mr-3.5 max-md:size-11"
      onClick={() => {
        sendGAEvent('event', 'launch_bar_dismiss', { bar });
        hideLaunchBar(bar, 'dismissed');
        // The X is gone with the bar: keyboard focus moves to the page's first link, the logo.
        document.querySelector<HTMLElement>('header a')?.focus();
      }}
    >
      <XIcon />
    </Button>
  );
}

/** A Product Hunt bar's link: opens Product Hunt in a new tab and counts the click. */
export function ProductHuntBarLink({
  bar,
  href,
  className,
  children,
}: {
  bar: LaunchBarId;
  href: string;
  className: string;
  children: ReactNode;
}) {
  return (
    // `noopener` without `noreferrer`: Product Hunt sees the visit came from gitranks.com.
    <a
      href={href}
      target="_blank"
      rel="noopener"
      className={className}
      onClick={() => sendGAEvent('event', 'launch_bar_click', { bar })}
    >
      {children}
    </a>
  );
}

/**
 * On Contribute's pages: this browser has seen Contribute, so Contribute's bar stays hidden from now on. Before paint,
 * so a move into Contribute never shows it for a frame. The Product Hunt bars stay. Renders nothing.
 */
export function LaunchBarSeen() {
  useLayoutEffect(() => {
    hideLaunchBar('contribute', 'seen');
  }, []);
  return null;
}
