'use client';

import { Bell, BellRing } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

import { FollowDialog } from './follow-dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { FollowRow } from '@/lib/follow/follow.types';
import { fetchFollowState } from '@/lib/follow/follow-client';
import { FOLLOW_CARD_TEXT, FOLLOW_CARD_TITLE, FOLLOW_SLOT_LEAD } from '@/lib/follow/follow-copy';
import { followsAll } from '@/lib/follow/follow-state';
import { usePackagesOpen } from '@/lib/packages/packages-open';

export type FollowSlotProps = {
  /** The packages one press follows: one, or every package of a repository. */
  packages: { registry: 'npm'; name: string }[];
  /** "react-resize-detector", "@nebula/ui", or "nebula/ui packages". */
  label: string;
  placement: 'package-page' | 'used-by' | 'used-by-empty';
};

/**
 * Following packages: on a package's page, in its left column above Refresh (`package-page`); at the end of a
 * repository's Used by tab (`used-by`); and beside "Package page" in that tab's empty state (`used-by-empty`). Drawn
 * only for a viewer package pages are open to, asked in the browser as pages are cached for everyone. For a signed-in
 * viewer it asks once per page load whether they follow the packages already ("Following"); a visitor has nothing to
 * ask. The button opens the dialog.
 */
export function FollowSlot({ packages, label, placement }: Readonly<FollowSlotProps>) {
  const open = usePackagesOpen();
  const { data: session } = useSession();
  const login = (session && !session.error ? session.user?.githubLogin : undefined) || undefined;
  const [follows, setFollows] = useState<FollowRow[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const names = packages.map(({ name }) => name).join('\n');

  // biome-ignore lint/correctness/useExhaustiveDependencies: `names` stands for `packages`, a new array each render.
  useEffect(() => {
    setFollows([]);
    if (!open || !login) return;
    let live = true;
    fetchFollowState(packages).then((answer) => {
      if (live && answer.ok) setFollows(answer.data);
    });
    return () => {
      live = false;
    };
  }, [open, login, names]);

  if (!open) return null;

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
      sessionEmail={login ? (session?.user?.email ?? undefined) : undefined}
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
