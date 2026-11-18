'use client';

import { Bell, Check, Mail, MessageCircle, Send } from 'lucide-react';
import { type ReactNode, useEffect, useId, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  FOLLOW_CHANNELS,
  type FollowChannel,
  type FollowChannelOption,
  type FollowChannels,
  type FollowEvents,
  type FollowFailure,
  type FollowPackage,
  type FollowRow,
} from '@/lib/follow/follow.types';
import { fetchFollowChannels, fetchFollowState, postFollowChange, postFollowStart } from '@/lib/follow/follow-client';
import {
  CHANNEL_LABELS,
  channelHint,
  eventSwitches,
  FOLLOW_DIALOG_LEAD,
  FOLLOW_DIALOG_NOTE,
  type FollowNote,
  type FollowOutcomeView,
  failureView,
  outcomeView,
} from '@/lib/follow/follow-copy';
import { EMAIL_MAX_LENGTH, isEmailShape } from '@/lib/follow/follow-request';
import { activeFollowsOf, followsAll, sameEvents, startingEvents, withChanged } from '@/lib/follow/follow-state';
import { LINK_PAGES } from '@/lib/link-token/link-token';

export type FollowDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  packages: FollowPackage[];
  label: string;
  /** The signed-in viewer; undefined for a visitor. */
  login?: string;
  /** The signed-in viewer's email, offered as the address of an email follow. */
  sessionEmail?: string;
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

type Loaded = { ok: true; data: FollowChannels } | { ok: false; failure: FollowFailure } | null;

/** The channels a press of Follow starts on by default: email, and a chat the viewer's account already has. */
function startingChannels(options: FollowChannelOption[], followed: (channel: FollowChannel) => boolean) {
  return new Set(
    options
      .filter((option) => option.open && !followed(option.channel))
      .filter((option) => option.channel === 'email' || option.linked === true)
      .map((option) => option.channel),
  );
}

/**
 * The Follow dialog: what to send (three switches), where (a row per channel open to this viewer), and Follow. A
 * visitor types an email address or connects a chat; a signed-in viewer's account's chats follow at once, and the
 * channels they already follow on show "Following" with Unfollow. After the press it says what became of each channel:
 * a confirmation email sent, a chat to open, followed, or why not.
 */
export function FollowDialog({
  open,
  onOpenChange,
  packages,
  label,
  login,
  sessionEmail,
  follows,
  onFollowsChange,
}: Readonly<FollowDialogProps>) {
  const [loaded, setLoaded] = useState<Loaded>(null);
  const [events, setEvents] = useState<FollowEvents>(() => startingEvents(packages, follows));
  const [selected, setSelected] = useState<Set<FollowChannel>>(new Set());
  const [email, setEmail] = useState(sessionEmail ?? '');
  const [sending, setSending] = useState(false);
  const [outcome, setOutcome] = useState<FollowOutcomeView | null>(null);
  const [rowProblem, setRowProblem] = useState<string | null>(null);
  const emailId = useId();
  const one = packages.length === 1 ? packages[0] : null;
  const followed = (channel: FollowChannel) => !!login && followsAll(packages, follows, channel);

  // Each opening starts afresh: the channels asked again, the switches from the viewer's follows.
  // biome-ignore lint/correctness/useExhaustiveDependencies: read once per opening, not at every change of a follow.
  useEffect(() => {
    if (!open) return;
    setLoaded(null);
    setOutcome(null);
    setRowProblem(null);
    setEvents(startingEvents(packages, follows));
    setEmail(sessionEmail ?? '');
    let live = true;
    fetchFollowChannels(one).then((answer) => {
      if (!live) return;
      setLoaded(answer);
      setSelected(answer.ok ? startingChannels(answer.data.channels, followed) : new Set());
    });
    return () => {
      live = false;
    };
  }, [open]);

  const options = loaded?.ok ? loaded.data.channels.filter((option) => option.open) : [];
  const existing = login ? activeFollowsOf(packages, follows) : [];
  const newChannels = options.map(({ channel }) => channel).filter((channel) => selected.has(channel));
  const eventsChanged = existing.length > 0 && existing.some((row) => !sameEvents(row.events, events));
  const anyEvent = events.notable || events.digest || events.milestones;
  const emailReady = !newChannels.includes('email') || isEmailShape(email.trim());
  const canSubmit = !sending && anyEvent && emailReady && (newChannels.length > 0 || eventsChanged);
  const primaryLabel = newChannels.length === 0 && eventsChanged ? 'Save' : 'Follow';

  const toggle = (channel: FollowChannel, on: boolean) =>
    setSelected((now) => {
      const next = new Set(now);
      if (on) next.add(channel);
      else next.delete(channel);
      return next;
    });

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
      const answer = await postFollowStart({
        packages,
        events,
        channels: newChannels,
        ...(newChannels.includes('email') ? { email: email.trim() } : {}),
      });
      view = answer.ok ? outcomeView(answer.data, label) : failureView(answer.failure);
      await refreshFollows();
    }

    setOutcome({ title: view.title, notes: [...view.notes, ...notes] });
    setSending(false);
  };

  const body = outcome ? (
    <OutcomeBody
      outcome={outcome}
      onBack={() => setOutcome(null)}
      backable={outcome.notes.some((note) => note.tone === 'problem')}
    />
  ) : (
    <>
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          What to send
        </legend>
        {eventSwitches(one && loaded?.ok ? loaded.data : null).map((item) => (
          // biome-ignore lint/a11y/noLabelWithoutControl: the checkbox inside is the control.
          <label key={item.name} className="flex items-start gap-3 text-sm">
            <Checkbox
              className="mt-0.5"
              checked={events[item.name]}
              onCheckedChange={(checked) => setEvents((now) => ({ ...now, [item.name]: checked === true }))}
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
        {FOLLOW_CHANNELS.flatMap((channel) => options.filter((option) => option.channel === channel)).map((option) => (
          <ChannelRow
            key={option.channel}
            option={option}
            followed={followed(option.channel)}
            selected={selected.has(option.channel)}
            disabled={sending}
            onToggle={(on) => toggle(option.channel, on)}
            onUnfollow={() => unfollow(option.channel)}
          >
            {option.channel === 'email' && selected.has('email') && !followed('email') && (
              <div className="flex flex-col gap-1">
                <label htmlFor={emailId} className="sr-only">
                  Email address
                </label>
                <Input
                  id={emailId}
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="you@example.com"
                  maxLength={EMAIL_MAX_LENGTH}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  aria-invalid={email.trim() !== '' && !isEmailShape(email.trim())}
                />
              </div>
            )}
          </ChannelRow>
        ))}
        {rowProblem && <p className="text-sm text-destructive">{rowProblem}</p>}
      </fieldset>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <DialogClose asChild>
          <Button type="button" variant="ghost">
            Cancel
          </Button>
        </DialogClose>
        <Button type="button" onClick={submit} disabled={!canSubmit}>
          <Bell aria-hidden />
          {sending ? `${primaryLabel}…` : primaryLabel}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        {FOLLOW_DIALOG_NOTE.split('Settings')[0]}
        <a href={SETTINGS_PATH} className="underline underline-offset-2">
          Settings
        </a>
        {FOLLOW_DIALOG_NOTE.split('Settings')[1]}
      </p>
    </>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-5 sm:max-w-[520px]">
        <DialogHeader className="text-left">
          <DialogTitle className="text-xl [overflow-wrap:anywhere]">
            {outcome ? outcome.title : `Follow ${label}`}
          </DialogTitle>
          <DialogDescription>{outcome ? label : FOLLOW_DIALOG_LEAD}</DialogDescription>
        </DialogHeader>
        {body}
      </DialogContent>
    </Dialog>
  );
}

type ChannelRowProps = {
  option: FollowChannelOption;
  followed: boolean;
  selected: boolean;
  disabled: boolean;
  onToggle: (on: boolean) => void;
  onUnfollow: () => void;
  children?: ReactNode;
};

/** One channel: its name and state, and On, Connect or Unfollow. */
function ChannelRow({ option, followed, selected, disabled, onToggle, onUnfollow, children }: ChannelRowProps) {
  const label = CHANNEL_LABELS[option.channel];
  const chatToConnect = option.channel !== 'email' && !option.linked;
  const hint =
    chatToConnect && selected && !followed ? `You finish in ${label} after Follow` : channelHint(option, followed);

  let control: ReactNode;
  if (followed) {
    control = (
      <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={onUnfollow}>
        Unfollow
      </Button>
    );
  } else if (chatToConnect) {
    control = (
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-pressed={selected}
        disabled={disabled}
        onClick={() => onToggle(!selected)}
      >
        {selected && <Check aria-hidden />}
        Connect
      </Button>
    );
  } else {
    control = (
      // biome-ignore lint/a11y/noLabelWithoutControl: the checkbox inside is the control.
      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={selected}
          disabled={disabled}
          onCheckedChange={(checked) => onToggle(checked === true)}
          aria-label={`${label}: on`}
        />
        On
      </label>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border p-3" data-channel={option.channel}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="text-muted-foreground">{CHANNEL_ICONS[option.channel]}</span>
          <div className="flex min-w-0 flex-col">
            <span className="text-sm font-medium">{label}</span>
            {hint && <span className="text-xs text-muted-foreground [overflow-wrap:anywhere]">{hint}</span>}
          </div>
        </div>
        {control}
      </div>
      {children}
    </div>
  );
}

/** What a press became: one line per channel, a chat's link to open, and Close (or Back, after a refusal). */
function OutcomeBody({
  outcome,
  onBack,
  backable,
}: {
  outcome: FollowOutcomeView;
  onBack: () => void;
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
        <DialogClose asChild>
          <Button type="button">Close</Button>
        </DialogClose>
      </div>
    </>
  );
}
