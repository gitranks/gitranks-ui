import { LinkCard, LinkHead, LinkTroubleCard, PackageName } from '@/app/follow/components/link-page';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import type { FollowEvents, FollowSubscriber, PackageFollow } from '@/lib/link-token/follow-links.types';
import {
  FOLLOW_EVENT_LINES,
  packageLabelOf,
  type SettingsNotice,
  type SettingsState,
} from '@/lib/link-token/follow-pages';
import { cn } from '@/lib/utils';

/** What the page's presses call; left out where nothing can be pressed (the catalogue, a spec). */
export type FollowingHandlers = {
  onEvents?: (followId: string, events: FollowEvents) => void;
  onChange?: (followId: string, change: 'remove' | 'undo') => void;
  onResume?: (subscriberId: string) => void;
  onStopAll?: () => void;
  /** A new sign-in, after the session ended. */
  onSignIn?: () => void;
};

type FollowingViewProps = FollowingHandlers & {
  state: SettingsState;
  pending?: boolean;
  /** A signed-in viewer's own list, every channel of their account, rather than one address's by its email link. */
  session?: boolean;
};

const CHANNEL_NAMES: Record<FollowSubscriber['channel'], string> = {
  EMAIL: 'Email',
  TELEGRAM: 'Telegram',
  WHATSAPP: 'WhatsApp',
};

/** Where an address is, in a card's lead line. */
const placeOf = ({ channel, addressHint }: FollowSubscriber) =>
  channel === 'EMAIL' ? `At ${addressHint}` : `In the ${CHANNEL_NAMES[channel]} chat ${addressHint}`;

/** What an address is called on its card and in a notice: an email address, or a chat. */
const nounOf = (channel?: FollowSubscriber['channel']) => (channel && channel !== 'EMAIL' ? 'chat' : 'address');

const NOTICE_TEXT = (notice: SettingsNotice): string => {
  switch (notice.kind) {
    case 'stopped':
      return notice.count === 1
        ? 'Unfollowed 1 package. You can undo it below for 7 days.'
        : `Unfollowed ${notice.count.toLocaleString('en-US')} packages. You can undo each one below for 7 days.`;
    case 'undo-refused':
      return `Could not follow ${packageLabelOf(notice.package)} again: the ${nounOf(notice.channel)} may already follow as many packages as it can, or the follow is gone. Follow it again from its page on GitRanks.`;
    case 'resumed':
      return `We will send to this ${nounOf(notice.channel)} again.`;
    case 'link-gone':
      return 'That link no longer works; here is what your account follows.';
    case 'sign-in':
      return 'You are signed out. Sign in again to change what you follow.';
    default:
      return 'That did not go through. Try again in a few minutes.';
  }
};

/** Why an address is paused, and what brings it back, by channel. */
const PAUSED_TEXT: Record<FollowSubscriber['channel'], string> = {
  EMAIL: 'We stopped sending to this address: it refused our email twice.',
  TELEGRAM: 'Paused: this chat blocked our bot. Unblock it or write to it and updates start again.',
  WHATSAPP: "Paused: WhatsApp couldn't reach this number.",
};

/**
 * `/following` by an email's settings link: every package the address follows, its three switches, Unfollow (then
 * Undo for 7 days), and "Stop all package email". Every change is a press.
 */
export function FollowingView({ state, pending = false, session = false, ...handlers }: Readonly<FollowingViewProps>) {
  if (state.kind !== 'list') {
    return <LinkTroubleCard trouble={state} unknownText="Open Email settings from your latest email from us." />;
  }

  const following = state.subscribers.some((subscriber) =>
    subscriber.follows.some((follow) => follow.status !== 'REMOVED'),
  );

  return (
    <>
      {state.notice && (
        <p
          role="status"
          className={cn(
            'rounded-xl border p-4 text-sm',
            state.notice.kind === 'failed' || state.notice.kind === 'undo-refused' || state.notice.kind === 'sign-in'
              ? 'border-destructive/40 text-destructive'
              : 'border-transparent bg-muted text-foreground',
          )}
        >
          {NOTICE_TEXT(state.notice)}
          {state.notice.kind === 'sign-in' && handlers.onSignIn && (
            <Button type="button" size="sm" onClick={handlers.onSignIn} className="mt-3 flex max-sm:min-h-11">
              Sign in with GitHub
            </Button>
          )}
        </p>
      )}
      {state.subscribers.map((subscriber) => (
        <SubscriberCard key={subscriber.id} subscriber={subscriber} pending={pending} session={session} {...handlers} />
      ))}
      {session && state.subscribers.length === 0 && (
        <LinkCard>
          <LinkHead eyebrow="Following" title="Packages you follow" />
          <p className="text-sm">You follow no packages yet. Follow one from its page on GitRanks.</p>
        </LinkCard>
      )}
      {following && (
        <section className="flex flex-col gap-2 px-1">
          <Button
            type="button"
            variant="destructive-outline"
            disabled={pending}
            onClick={handlers.onStopAll}
            className="max-sm:min-h-11 sm:self-start"
          >
            {session ? 'Stop all package messages' : 'Stop all package email'}
          </Button>
          <p className="text-xs text-muted-foreground">
            {session ? 'Unfollows every package, on every channel.' : 'Unfollows every package at this address.'}
          </p>
        </section>
      )}
    </>
  );
}

function SubscriberCard({
  subscriber,
  pending,
  session,
  ...handlers
}: Readonly<FollowingHandlers & { subscriber: FollowSubscriber; pending: boolean; session: boolean }>) {
  return (
    <LinkCard>
      <LinkHead eyebrow={session ? CHANNEL_NAMES[subscriber.channel] : 'Email settings'} title="Packages you follow" />
      <p className="text-sm text-muted-foreground">
        {placeOf(subscriber)}. Choose what we send about each package, or unfollow it.
      </p>
      {subscriber.paused && (
        <div className="flex flex-col gap-3 rounded-xl border border-warning/40 bg-warning-soft p-4 text-sm text-warning-soft-foreground">
          <p>{PAUSED_TEXT[subscriber.channel]}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => handlers.onResume?.(subscriber.id)}
            className="max-sm:min-h-11 sm:self-start"
          >
            Send again
          </Button>
        </div>
      )}
      {subscriber.follows.length ? (
        <ul className="flex flex-col divide-y">
          {subscriber.follows.map((follow) => (
            <FollowRow key={follow.id} follow={follow} pending={pending} {...handlers} />
          ))}
        </ul>
      ) : (
        <p className="text-sm">You follow no packages at this address.</p>
      )}
    </LinkCard>
  );
}

function FollowRow({
  follow,
  pending,
  onEvents,
  onChange,
}: Readonly<FollowingHandlers & { follow: PackageFollow; pending: boolean }>) {
  const removed = follow.status === 'REMOVED';
  return (
    <li className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0" data-follow={follow.id}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <PackageName pkg={follow.package} className={cn(removed && 'text-muted-foreground')} />
          {follow.status === 'PENDING' && <span className="text-xs text-muted-foreground">Not confirmed yet</span>}
          {removed && <span className="text-xs text-muted-foreground">Unfollowed</span>}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => onChange?.(follow.id, removed ? 'undo' : 'remove')}
          className="max-sm:min-h-11"
        >
          {removed ? 'Undo' : 'Unfollow'}
        </Button>
      </div>
      {!removed && (
        <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:gap-x-5">
          {FOLLOW_EVENT_LINES.map(({ key, label }) => {
            const id = `follow-${follow.id}-${key}`;
            return (
              <div key={key} className="flex items-center gap-2 max-sm:min-h-11">
                <Checkbox
                  id={id}
                  checked={follow.events[key]}
                  disabled={pending}
                  onCheckedChange={(checked) => onEvents?.(follow.id, { ...follow.events, [key]: checked === true })}
                />
                <label htmlFor={id} className="text-sm">
                  {label}
                </label>
              </div>
            );
          })}
        </div>
      )}
    </li>
  );
}
