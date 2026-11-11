'use client';

import { sendGAEvent } from '@next/third-parties/google';
import { XIcon } from 'lucide-react';
import { useLayoutEffect } from 'react';

import { hideLaunchBar } from './launch-bar.consts';
import { Button } from '@/components/ui/button';

/** The bar's X: hides it in this browser for good. A 44px target on phones. */
export function LaunchBarDismiss() {
  return (
    <Button
      variant="ghost"
      size="icon-xs"
      aria-label="Hide this announcement"
      className="text-muted-foreground max-md:-mr-3.5 max-md:size-11"
      onClick={() => {
        sendGAEvent('event', 'launch_bar_dismiss');
        hideLaunchBar('dismissed');
        // The X is gone with the bar: keyboard focus moves to the page's first link, the logo.
        document.querySelector<HTMLElement>('header a')?.focus();
      }}
    >
      <XIcon />
    </Button>
  );
}

/**
 * On Contribute's pages: this browser has seen Contribute, so the bar stays hidden from now on. Before paint, so a move
 * into Contribute never shows it for a frame. Renders nothing.
 */
export function LaunchBarSeen() {
  useLayoutEffect(() => {
    hideLaunchBar('seen');
  }, []);
  return null;
}
