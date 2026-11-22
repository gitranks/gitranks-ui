'use client';

import { Bell, BellRing } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

import { FollowDialog } from './follow-dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { FollowPackage, FollowRow } from '@/lib/follow/follow.types';
import { fetchFollowState } from '@/lib/follow/follow-client';
import { FOLLOW_CARD_TEXT, FOLLOW_CARD_TITLE, FOLLOW_SLOT_LEAD } from '@/lib/follow/follow-copy';
import { followReturnOf } from '@/lib/follow/follow-return';
import { followsAll } from '@/lib/follow/follow-state';

export type FollowSlotProps = {
  /** The packages one press follows: one, or every package of a repository. */
  packages: FollowPackage[];
  /** "react-resize-detector", "@nebula/ui", or "nebula/ui packages". */
  label: string;
  placement: 'package-page' | 'used-by' | 'used-by-empty';
};

/**
 * Following packages: on a package's page, in its left column above Refresh (`package-page`); at the end of a
 * repository's Used by tab (`used-by`); and beside "Package page" in that tab's empty state (`used-by-empty`). For a
 * signed-in viewer it asks once per page load whether they follow the packages already ("Following"); a visitor has nothing to
 * ask. The button opens the dialog; so does a return from the Email row's sign-in (`?follow=email:<label>`), once signed in.
 */
export function FollowSlot({ packages, label, placement }: Readonly<FollowSlotProps>) {
  const { data: session, status } = useSession();
  const login = (session && !session.error ? session.user?.githubLogin : undefined) || undefined;
  const [follows, setFollows] = useState<FollowRow[]>([]);
  // Whether the viewer's follows were asked for this login and these packages (answered or not).
  const [followsRead, setFollowsRead] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  // Back from the Email row's sign-in, waiting for the follows before the dialog opens.
  const [returning, setReturning] = useState(false);
  const names = packages.map(({ name }) => name).join('\n');

  // biome-ignore lint/correctness/useExhaustiveDependencies: `names` stands for `packages`, a new array each render.
  useEffect(() => {
    setFollows([]);
    setFollowsRead(false);
    if (!login) return;
    let live = true;
    fetchFollowState(packages).then((answer) => {
      if (!live) return;
      if (answer.ok) setFollows(answer.data);
      setFollowsRead(true);
    });
    return () => {
      live = false;
    };
  }, [login, names]);

  // Back from the Email row's sign-in: the mark leaves the address, and the dialog opens again for a signed-in viewer
  // once their follows are in, so it starts from what they follow already. Waits for the session, so a viewer just
  // signed in is not taken for a visitor.
  useEffect(() => {
    if (status === 'loading') return;
    const { returned, cleaned } = followReturnOf(window.location.href, label);
    if (cleaned === null) return;
    window.history.replaceState(window.history.state, '', cleaned);
    if (returned && login) setReturning(true);
  }, [status, login, label]);

  useEffect(() => {
    if (!returning || !followsRead) return;
    setReturning(false);
    setDialogOpen(true);
  }, [returning, followsRead]);

  const following = !!login && followsAll(packages, follows);
  const Icon = following ? BellRing : Bell;
  const button = (variant: 'default' | 'outline', text: string) => (
    <Button type="button" variant={variant} onClick={() => setDialogOpen(true)}>
      <Icon aria-hidden />
      {text}
    </Button>
  );

  const dialog = (
    <FollowDialog
      open={dialogOpen}
      onOpenChange={setDialogOpen}
      packages={packages}
      label={label}
      login={login}
      follows={follows}
      onFollowsChange={setFollows}
    />
  );

  if (placement === 'package-page') {
    return (
      <div className="flex flex-col gap-2">
        {button(following ? 'outline' : 'default', following ? 'Following' : 'Follow')}
        <p className="text-xs text-muted-foreground">{FOLLOW_SLOT_LEAD}</p>
        {dialog}
      </div>
    );
  }

  const outlined = button('outline', `${following ? 'Following' : 'Follow'} ${label}`);
  if (placement === 'used-by-empty') {
    return (
      <>
        {outlined}
        {dialog}
      </>
    );
  }

  return (
    <Card className="w-full flex-row flex-wrap items-center justify-between gap-3 p-4 dark:shadow-none">
      <div className="flex flex-col gap-0.5">
        <span className="font-medium">{FOLLOW_CARD_TITLE}</span>
        <span className="text-sm text-muted-foreground">{FOLLOW_CARD_TEXT}</span>
      </div>
      {outlined}
      {dialog}
    </Card>
  );
}
