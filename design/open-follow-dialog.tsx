import type { ReactNode } from 'react';

import { FollowDialogBody, type FollowDialogBodyProps } from '@/components/package-follow/follow-dialog';
import type { FollowChannel, FollowChannelsView } from '@/lib/follow/follow.types';
import { FOLLOW_DIALOG_LEAD, type FollowOutcomeView } from '@/lib/follow/follow-copy';

const ALL = { notable: true, digest: true, milestones: true };
const noop = () => {};

/** The channels as the dialog reads them for a board: Email and Telegram open, WhatsApp linked when signed in. */
export const followChannelsOf = (signedIn: boolean, verifiedEmail: string | null = null): FollowChannelsView => ({
  channels: [
    { channel: 'email', open: true, limit: 50, linked: signedIn ? false : null, addressHint: null, rankUpdates: null },
    {
      channel: 'telegram',
      open: true,
      limit: 20,
      linked: signedIn ? false : null,
      addressHint: null,
      rankUpdates: null,
    },
    {
      channel: 'whatsapp',
      open: true,
      limit: 3,
      linked: signedIn ? true : null,
      addressHint: signedIn ? '+48 •••• 976' : null,
      rankUpdates: signedIn ? false : null,
    },
  ],
  dependents: 16,
  notable: 4,
  settingsLink: signedIn,
  verifiedEmail,
});

/**
 * The Follow dialog drawn open over its page: a portal renders nothing on the server, so the board draws the dialog's
 * box with the dialog's own body, from the state given.
 */
export function OpenFollowDialog({
  page,
  label,
  view,
  signedIn,
  selected = [],
  emailOpen = false,
  outcome = null,
}: {
  page: ReactNode;
  label: string;
  view: FollowChannelsView;
  signedIn: boolean;
  selected?: FollowChannel[];
  emailOpen?: boolean;
  outcome?: FollowOutcomeView | null;
}) {
  const props: FollowDialogBodyProps = {
    close: noop,
    outcome,
    onBack: noop,
    loaded: { ok: true, data: view },
    oneNumbers: true,
    events: ALL,
    onEvents: noop,
    signedIn,
    selected: new Set(selected),
    followed: () => false,
    emailOpen,
    onEmailOpen: noop,
    sending: false,
    canSubmit: selected.length > 0,
    saveOnly: false,
    rowProblem: null,
    onToggle: noop,
    onUnfollow: noop,
    onSubmit: noop,
    onSignIn: async () => undefined,
  };
  const title = outcome ? outcome.title : `Follow ${label}`;

  return (
    <div className="relative">
      {page}
      <div className="absolute inset-0 flex items-start justify-center bg-black/50 px-4 pt-28">
        <div
          role="dialog"
          aria-label={title}
          className="grid w-full max-w-[calc(100%-2rem)] gap-5 rounded-lg border bg-background p-6 shadow-lg sm:max-w-[520px]"
        >
          <div className="flex flex-col gap-2 text-left">
            <h2 className="text-xl leading-none font-semibold [overflow-wrap:anywhere]">{title}</h2>
            <p className="text-sm text-muted-foreground">{outcome ? label : FOLLOW_DIALOG_LEAD}</p>
          </div>
          <FollowDialogBody {...props} />
        </div>
      </div>
    </div>
  );
}
