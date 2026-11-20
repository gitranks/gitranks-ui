'use client';

import { Bell, Check, ExternalLink, Mail, MessageCircle, Send } from 'lucide-react';
import { signIn } from 'next-auth/react';
import { type ReactNode, useEffect, useId, useState } from 'react';
import { SiGithub } from 'react-icons/si';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { IDENTITY_PROVIDER } from '@/lib/auth-providers';
import {
  FOLLOW_CHANNELS,
  type FollowChannel,
  type FollowChannelOption,
  type FollowChannelsView,
  type FollowEvents,
  type FollowFailure,
  type FollowPackage,
  type FollowRow,
} from '@/lib/follow/follow.types';
import { fetchFollowChannels, fetchFollowState, postFollowChange, postFollowStart } from '@/lib/follow/follow-client';
import {
  CHANNEL_LABELS,
  channelHint,
  EMAIL_SIGN_IN_NOTE,
  EMAIL_SIGN_IN_TEXT,
  EMAIL_UNVERIFIED_HINT,
  EMAIL_UNVERIFIED_TEXT,
  eventSwitches,
  FOLLOW_DIALOG_LEAD,
  FOLLOW_DIALOG_NOTE,
  FOLLOW_DIALOG_NOTE_NO_SETTINGS,
  type FollowNote,
  type FollowOutcomeView,
  failureView,
  GITHUB_EMAIL_SETTINGS,
  outcomeView,
} from '@/lib/follow/follow-copy';
import { followReturnPathOf } from '@/lib/follow/follow-return';
import { activeFollowsOf, followsAll, sameEvents, startingEvents, withChanged } from '@/lib/follow/follow-state';
import { LINK_PAGES } from '@/lib/link-token/link-token';

export type FollowDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  packages: FollowPackage[];
  label: string;
  /** The signed-in viewer; undefined for a visitor. */
  login?: string;
  /** The signed-in viewer's follows of the packages, as the slot read them. */
  follows: FollowRow[];
  onFollowsChange: (follows: FollowRow[]) => void;
};

const CHANNEL_ICONS: Record<FollowChannel, ReactNode> = {
  email: <Mail aria-hidden className="size-4" />,
  telegram: <Send aria-hidden className="size-4" />,
  whatsapp: <MessageCircle aria-hidden className="size-4" />,
};

/** Where Settings in the small print goes: the email settings page. */
const SETTINGS_PATH = LINK_PAGES.settings;

export type FollowLoaded = { ok: true; data: FollowChannelsView } | { ok: false; failure: FollowFailure } | null;

/**
 * The channels a press of Follow starts on by default: email at a signed-in viewer's verified address, and a chat the
 * viewer's account already has.
 */
function startingChannels(view: FollowChannelsView, followed: (channel: FollowChannel) => boolean): Set<FollowChannel> {
  return new Set(
    view.channels
      .filter((option) => option.open && !followed(option.channel))
      .filter((option) => (option.channel === 'email' ? !!view.verifiedEmail : option.linked === true))
      .map((option) => option.channel),
  );
}

/**
 * The GitHub sign-in, back to this page with this slot's dialog open again (`followReturnPathOf`). Signed in already,
 * it reads the account's verified email again.
 */
function signInForEmail(label: string) {
  return signIn(IDENTITY_PROVIDER, { redirectTo: followReturnPathOf(window.location.href, label) });
}

/**
 * The Follow dialog: what to send (three switches), where (a row per channel open to this viewer), and Follow. Email
 * goes only to a signed-in viewer's GitHub-verified address: a visitor's Connect opens the Email row in place with why
 * and the GitHub sign-in, which brings them back here with the dialog open. Chats work signed out too; a signed-in
 * viewer's account's chats follow at once, and the channels they already follow on show "Following" with Unfollow.
 * After the press it says what became of each channel: followed, a chat to open, or why not.
 */
export function FollowDialog({
  open,
  onOpenChange,
  packages,
  label,
  login,
  follows,
  onFollowsChange,
}: Readonly<FollowDialogProps>) {
  const [loaded, setLoaded] = useState<FollowLoaded>(null);
  const [events, setEvents] = useState<FollowEvents>(() => startingEvents(packages, follows));
  const [selected, setSelected] = useState<Set<FollowChannel>>(new Set());
  const [emailOpen, setEmailOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [outcome, setOutcome] = useState<FollowOutcomeView | null>(null);
  const [rowProblem, setRowProblem] = useState<string | null>(null);
  // The person changed a switch or a channel: follows that arrive late no longer reset the form.
  const [touched, setTouched] = useState(false);
  const one = packages.length === 1 ? packages[0] : null;
  const followed = (channel: FollowChannel) => !!login && followsAll(packages, follows, channel);

  // Each opening starts afresh: the channels asked again, the switches from the viewer's follows.
  // biome-ignore lint/correctness/useExhaustiveDependencies: read once per opening, not at every change of a follow.
  useEffect(() => {
    if (!open) return;
    setLoaded(null);
    setOutcome(null);
    setRowProblem(null);
    setEmailOpen(false);
    setTouched(false);
    setEvents(startingEvents(packages, follows));
    let live = true;
    fetchFollowChannels(one).then((answer) => {
      if (!live) return;
      setLoaded(answer);
      setSelected(answer.ok ? startingChannels(answer.data, followed) : new Set());
    });
    return () => {
      live = false;
    };
  }, [open]);

  // Follows read after the dialog opened (a press before the slot's read answered): the form starts from them, unless
  // the person already changed it.
  // biome-ignore lint/correctness/useExhaustiveDependencies: only a change of the follows re-seeds the form.
  useEffect(() => {
    if (!open || touched) return;
    setEvents(startingEvents(packages, follows));
    if (loaded?.ok) setSelected(startingChannels(loaded.data, followed));
  }, [follows]);

  const options = loaded?.ok ? loaded.data.channels.filter((option) => option.open) : [];
  const verifiedEmail = loaded?.ok ? loaded.data.verifiedEmail : null;
  const existing = login ? activeFollowsOf(packages, follows) : [];
  // A channel followed already is never started again: its row offers Unfollow.
  const newChannels = options
    .map(({ channel }) => channel)
    .filter((channel) => selected.has(channel) && !followed(channel));
  const eventsChanged = existing.length > 0 && existing.some((row) => !sameEvents(row.events, events));
  const anyEvent = events.notable || events.digest || events.milestones;
  const canSubmit = !sending && anyEvent && (newChannels.length > 0 || eventsChanged);

  const toggle = (channel: FollowChannel, on: boolean) => {
    setTouched(true);
    setSelected((now) => {
      const next = new Set(now);
      if (on) next.add(channel);
      else next.delete(channel);
      return next;
    });
  };

  /** The viewer's follows again, after a press changed them: the slot then shows "Following". */
  const refreshFollows = async () => {
    if (!login) return;
    const answer = await fetchFollowState(packages);
    if (answer.ok) onFollowsChange(answer.data);
  };

  const unfollow = async (channel: FollowChannel) => {
    setSending(true);
    setRowProblem(null);
    const rows = existing.filter((row) => row.channel === channel);
    const answers = await Promise.all(rows.map((row) => postFollowChange({ followId: row.id, remove: true })));
    const changed = answers.flatMap((answer) => (answer.ok && answer.data ? [answer.data] : []));
    onFollowsChange(withChanged(follows, changed));
    if (answers.some((answer) => !answer.ok)) {
      setRowProblem(`Not unfollowed on ${CHANNEL_LABELS[channel]}. Try again in a few minutes.`);
    } else {
      toggle(channel, false);
    }
    setSending(false);
  };

  const submit = async () => {
    setSending(true);
    const notes: FollowNote[] = [];

    if (eventsChanged) {
      const answers = await Promise.all(existing.map((row) => postFollowChange({ followId: row.id, events })));
      const changed = answers.flatMap((answer) => (answer.ok && answer.data ? [answer.data] : []));
      onFollowsChange(withChanged(follows, changed));
      notes.push(
        answers.every((answer) => answer.ok)
          ? { channel: null, tone: 'done', text: 'What we send is updated on the channels you follow on.' }
          : {
              channel: null,
              tone: 'problem',
              text: 'Some of your follows were not updated. Try again in a few minutes.',
            },
      );
    }

    let view: FollowOutcomeView = { title: 'Saved', notes: [] };
    if (newChannels.length > 0) {
      const answer = await postFollowStart({ packages, events, channels: newChannels });
      view = answer.ok ? outcomeView(answer.data, label, verifiedEmail) : failureView(answer.failure);
      await refreshFollows();
    }

    setOutcome({ title: view.title, notes: [...view.notes, ...notes] });
    setSending(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-5 sm:max-w-[520px]">
        <DialogHeader className="text-left">
          <DialogTitle className="text-xl [overflow-wrap:anywhere]">
            {outcome ? outcome.title : `Follow ${label}`}
          </DialogTitle>
          <DialogDescription>{outcome ? label : FOLLOW_DIALOG_LEAD}</DialogDescription>
        </DialogHeader>
        <FollowDialogBody
          close={() => onOpenChange(false)}
          outcome={outcome}
          onBack={() => setOutcome(null)}
          loaded={loaded}
          oneNumbers={!!one}
          events={events}
          onEvents={(next) => {
            setTouched(true);
            setEvents(next);
          }}
          signedIn={!!login}
          selected={selected}
          followed={followed}
          emailOpen={emailOpen}
          onEmailOpen={setEmailOpen}
          sending={sending}
          canSubmit={canSubmit}
          saveOnly={newChannels.length === 0 && eventsChanged}
          rowProblem={rowProblem}
          onToggle={toggle}
          onUnfollow={unfollow}
          onSubmit={submit}
          onSignIn={() => signInForEmail(label)}
        />
      </DialogContent>
    </Dialog>
  );
}

export type FollowDialogBodyProps = {
  close: () => void;
  outcome: FollowOutcomeView | null;
  onBack: () => void;
  loaded: FollowLoaded;
  /** One package: the first switch says how many of its dependents have 1,000+ stars. */
  oneNumbers: boolean;
  events: FollowEvents;
  onEvents: (events: FollowEvents) => void;
  signedIn: boolean;
  selected: ReadonlySet<FollowChannel>;
  followed: (channel: FollowChannel) => boolean;
  /** A visitor pressed Connect on Email: the row is open with why and the sign-in. */
  emailOpen: boolean;
  onEmailOpen: (open: boolean) => void;
  sending: boolean;
  canSubmit: boolean;
  /** Nothing new to follow, only the switches of existing follows changed: the button says Save. */
  saveOnly: boolean;
  rowProblem: string | null;
  onToggle: (channel: FollowChannel, on: boolean) => void;
  onUnfollow: (channel: FollowChannel) => void;
  onSubmit: () => void;
  onSignIn: () => Promise<unknown>;
};

/** What the dialog shows under its title: the form, or what a press became. Drawn from its props alone. */
export function FollowDialogBody(props: Readonly<FollowDialogBodyProps>) {
  const { close, outcome, onBack, loaded, oneNumbers, events, onEvents, sending, canSubmit, saveOnly } = props;
  if (outcome) {
    return (
      <OutcomeBody
        outcome={outcome}
        onBack={onBack}
        onClose={close}
        backable={outcome.notes.some((note) => note.tone === 'problem')}
      />
    );
  }

  const options = loaded?.ok ? loaded.data.channels.filter((option) => option.open) : [];
  const primaryLabel = saveOnly ? 'Save' : 'Follow';
  return (
    <>
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          What to send
        </legend>
        {eventSwitches(oneNumbers && loaded?.ok ? loaded.data : null).map((item) => (
          // biome-ignore lint/a11y/noLabelWithoutControl: the checkbox inside is the control.
          <label key={item.name} className="flex items-start gap-3 text-sm">
            <Checkbox
              className="mt-0.5"
              checked={events[item.name]}
              onCheckedChange={(checked) => onEvents({ ...events, [item.name]: checked === true })}
            />
            <span className="flex flex-col">
              <span className="font-medium">{item.title}</span>
              <span className="text-xs text-muted-foreground">{item.text}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">Where</legend>
        {loaded === null && <p className="text-sm text-muted-foreground">Loading…</p>}
        {loaded && !loaded.ok && (
          <p className="text-sm text-muted-foreground">{failureView(loaded.failure).notes[0].text}</p>
        )}
        {loaded?.ok && options.length === 0 && (
          <p className="text-sm text-muted-foreground">No channel takes follows right now. Try again later.</p>
        )}
        {loaded?.ok &&
          FOLLOW_CHANNELS.flatMap((channel) => options.filter((option) => option.channel === channel)).map((option) => (
            <ChannelRow key={option.channel} option={option} verifiedEmail={loaded.data.verifiedEmail} {...props} />
          ))}
        {props.rowProblem && <p className="text-sm text-destructive">{props.rowProblem}</p>}
      </fieldset>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button type="button" variant="ghost" onClick={close}>
          Cancel
        </Button>
        <Button type="button" onClick={props.onSubmit} disabled={!canSubmit}>
          <Bell aria-hidden />
          {sending ? `${primaryLabel}…` : primaryLabel}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        {loaded?.ok && loaded.data.settingsLink ? (
          <>
            {FOLLOW_DIALOG_NOTE.split('Settings')[0]}
            <a href={SETTINGS_PATH} className="underline underline-offset-2">
              Settings
            </a>
            {FOLLOW_DIALOG_NOTE.split('Settings')[1]}
          </>
        ) : (
          FOLLOW_DIALOG_NOTE_NO_SETTINGS
        )}
      </p>
    </>
  );
}

type ChannelRowProps = Readonly<FollowDialogBodyProps & { option: FollowChannelOption; verifiedEmail: string | null }>;

/** One channel: its name and state, and On, Connect or Unfollow; the Email row also says why when it needs more. */
function ChannelRow({ option, verifiedEmail, ...props }: ChannelRowProps) {
  const { channel } = option;
  const label = CHANNEL_LABELS[channel];
  const selected = props.selected.has(channel);
  const followed = props.followed(channel);
  const disabled = props.sending;
  const [signingIn, setSigningIn] = useState(false);
  const moreId = useId();
  const signInButton = (text: string, variant: 'default' | 'outline') => (
    <Button
      type="button"
      size="sm"
      variant={variant}
      disabled={signingIn}
      onClick={() => {
        setSigningIn(true);
        props.onSignIn().catch(() => setSigningIn(false));
      }}
    >
      <SiGithub aria-hidden />
      {text}
    </Button>
  );

  let hint = channelHint(option, followed, verifiedEmail);
  let control: ReactNode;
  let more: ReactNode = null;

  const connect = (pressed: boolean, onPress: () => void) => (
    <Button type="button" variant="outline" size="sm" aria-pressed={pressed} disabled={disabled} onClick={onPress}>
      {pressed && <Check aria-hidden />}
      Connect
    </Button>
  );
  const onBox = (
    // biome-ignore lint/a11y/noLabelWithoutControl: the checkbox inside is the control.
    <label className="flex items-center gap-2 text-sm">
      <Checkbox
        checked={selected}
        disabled={disabled}
        onCheckedChange={(checked) => props.onToggle(channel, checked === true)}
        aria-label={`${label}: on`}
      />
      On
    </label>
  );

  if (followed) {
    control = (
      <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={() => props.onUnfollow(channel)}>
        Unfollow
      </Button>
    );
  } else if (channel === 'email' && !props.signedIn) {
    // A visitor: the same Connect as the chats, which opens the row in place with why email asks for a sign-in. It
    // opens a part of the row, it connects nothing: `aria-expanded`, no check.
    control = (
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-expanded={props.emailOpen}
        aria-controls={moreId}
        disabled={disabled}
        onClick={() => props.onEmailOpen(!props.emailOpen)}
      >
        Connect
      </Button>
    );
    if (props.emailOpen) {
      hint = 'Needs a GitHub sign-in';
      more = (
        <div id={moreId} className="flex flex-col gap-3 border-t pt-3">
          <p className="text-sm">{EMAIL_SIGN_IN_TEXT}</p>
          <div className="flex flex-wrap items-center gap-3">
            {signInButton('Sign in with GitHub', 'default')}
            <span className="text-xs text-muted-foreground">{EMAIL_SIGN_IN_NOTE}</span>
          </div>
        </div>
      );
    }
  } else if (channel === 'email' && !verifiedEmail) {
    // Signed in, but the sign-in carried no verified email (none on GitHub, a sign-in from before we read it, or
    // GitHub slow to answer): signing in again reads it again.
    hint = EMAIL_UNVERIFIED_HINT;
    control = signInButton('Sign in again', 'outline');
    more = (
      <div className="flex flex-col gap-3 border-t pt-3">
        <p className="text-sm text-muted-foreground">{EMAIL_UNVERIFIED_TEXT}</p>
        <Button asChild variant="link" size="sm" className="self-start px-0">
          <a href={GITHUB_EMAIL_SETTINGS} target="_blank" rel="noopener noreferrer">
            GitHub email settings
            <ExternalLink aria-hidden />
          </a>
        </Button>
      </div>
    );
  } else if (channel !== 'email' && !option.linked) {
    if (selected) hint = `You finish in ${label} after Follow`;
    control = connect(selected, () => props.onToggle(channel, !selected));
  } else {
    control = onBox;
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border p-3" data-channel={channel}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="text-muted-foreground">{CHANNEL_ICONS[channel]}</span>
          <div className="flex min-w-0 flex-col">
            <span className="text-sm font-medium">{label}</span>
            {hint && <span className="text-xs text-muted-foreground [overflow-wrap:anywhere]">{hint}</span>}
          </div>
        </div>
        {control}
      </div>
      {more}
    </div>
  );
}

/** What a press became: one line per channel, a chat's link to open, and Close (or Back, after a refusal). */
function OutcomeBody({
  outcome,
  onBack,
  onClose,
  backable,
}: {
  outcome: FollowOutcomeView;
  onBack: () => void;
  onClose: () => void;
  backable: boolean;
}) {
  return (
    <>
      <ul className="flex flex-col gap-3">
        {outcome.notes.map((note) => (
          <li key={`${note.channel}-${note.text}`} className="flex flex-col gap-2 rounded-md border p-3 text-sm">
            <span className="flex items-start gap-3">
              {note.channel && <span className="mt-0.5 text-muted-foreground">{CHANNEL_ICONS[note.channel]}</span>}
              <span className={note.tone === 'problem' ? 'text-destructive' : undefined}>{note.text}</span>
            </span>
            {note.link && (
              <Button asChild variant="outline" size="sm" className="self-start">
                <a href={note.link.href} target="_blank" rel="noopener noreferrer">
                  {note.link.label}
                </a>
              </Button>
            )}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center justify-end gap-2">
        {backable && (
          <Button type="button" variant="ghost" onClick={onBack}>
            Back
          </Button>
        )}
        <Button type="button" onClick={onClose}>
          Close
        </Button>
      </div>
    </>
  );
}
