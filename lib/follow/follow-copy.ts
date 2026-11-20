import {
  FOLLOW_CHANNELS,
  type FollowChannel,
  type FollowChannelOption,
  type FollowEventName,
  type FollowFailure,
  type FollowStartAnswer,
  type FollowStartOutcome,
} from './follow.types';

// The Follow slot's and dialog's words, and what a press's answer says, kept apart from the components so each case
// can be tested on its own.

export const CHANNEL_LABELS: Record<FollowChannel, string> = {
  email: 'Email',
  telegram: 'Telegram',
  whatsapp: 'WhatsApp',
};

/** What one address on each channel is called. */
const ADDRESS_NOUNS: Record<FollowChannel, string> = {
  email: 'an address',
  telegram: 'a chat',
  whatsapp: 'a chat',
};

/** The line under the Follow button on a package's page. */
export const FOLLOW_SLOT_LEAD = 'Get a message when a 1,000+ star repository starts using it, plus a monthly digest.';

/** The Used by tab's card. */
export const FOLLOW_CARD_TITLE = 'Know when a big project starts using it';
export const FOLLOW_CARD_TEXT =
  'Email, Telegram or WhatsApp: new 1,000+ star dependents, a monthly digest, milestones.';

export const FOLLOW_DIALOG_LEAD = 'We message you only when one of these happens.';
/** The dialog's small print; "Settings" is a link where that page will open. */
export const FOLLOW_DIALOG_NOTE = 'Unfollow any time from a message or from Settings. Anyone can follow any package.';
/** The same, where Settings would not open: a visitor with no email settings link opened lately. */
export const FOLLOW_DIALOG_NOTE_NO_SETTINGS = 'Unfollow any time from a message. Anyone can follow any package.';

const formatCount = (value: number) => value.toLocaleString('en-US');

/**
 * The switches, in the dialog's order, with their sentences. For one package whose numbers came, the first one says
 * how many of its dependents have 1,000+ stars today.
 */
export function eventSwitches(numbers?: { dependents: number | null; notable: number | null } | null) {
  const { dependents, notable } = numbers ?? { dependents: null, notable: null };
  const today =
    dependents !== null && notable !== null && dependents > 0
      ? ` Today ${formatCount(notable)} of its ${formatCount(dependents)} ${dependents === 1 ? 'dependent' : 'dependents'} ${notable === 1 ? 'has' : 'have'} 1,000+ stars.`
      : '';
  const switches: { name: FollowEventName; title: string; text: string }[] = [
    { name: 'notable', title: 'A 1,000+ star repository starts using it', text: `Right away.${today}` },
    { name: 'digest', title: 'Monthly digest', text: 'After each monthly read: dependents, downloads, changes.' },
    {
      name: 'milestones',
      title: 'Milestones',
      text: 'Like 100 dependents with 100+ stars, or 10M downloads in a month.',
    },
  ];
  return switches;
}

/** The Email row signed out, after Connect: why email asks for a sign-in. */
export const EMAIL_SIGN_IN_TEXT =
  'Sign in with GitHub to follow by email. We only email the address GitHub has verified for your account, so nobody can sign someone else up, and our emails stay out of spam.';
export const EMAIL_SIGN_IN_NOTE = 'You come back to this page to finish.';
/** The Email row of a signed-in account with no verified email on GitHub. */
export const EMAIL_UNVERIFIED_HINT = 'No verified email from your GitHub sign-in';
export const EMAIL_UNVERIFIED_TEXT =
  'We only email an address GitHub has verified, and we read it when you sign in. Sign in again; if GitHub has none, add or verify one in your GitHub email settings first. Telegram and WhatsApp work without it.';
/** A press's email answer when the API found no verified email for the session. */
const EMAIL_SIGN_IN_PROBLEM =
  'Email needs a GitHub sign-in with a verified email. Sign in again and try once more; Telegram and WhatsApp work without it.';
/** Where GitHub's email settings are. */
export const GITHUB_EMAIL_SETTINGS = 'https://github.com/settings/emails';

/**
 * A channel row's second line, before Follow is pressed. `verifiedEmail` is the signed-in viewer's verified address,
 * the one an email follow uses.
 */
export function channelHint(
  option: FollowChannelOption,
  followed: boolean,
  verifiedEmail: string | null = null,
): string {
  if (followed) return option.addressHint ? `Following · ${option.addressHint}` : 'Following';
  if (option.channel === 'email') return verifiedEmail ? `${verifiedEmail} · verified on GitHub` : 'Not connected';
  if (!option.linked) return 'Not connected';
  return option.rankUpdates ? 'Connected · you get rank updates here' : 'Connected';
}

/** Where a chat's link may point: the chat apps' own sites, nothing else. */
const CHAT_HOSTS: Record<Exclude<FollowChannel, 'email'>, string> = {
  telegram: 't.me',
  whatsapp: 'wa.me',
};

/** The chat link of a `connect` answer, when it opens that channel's own app; null for anything else. */
export function chatLinkOf(channel: FollowChannel, url: string | null): string | null {
  if (channel === 'email' || !url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && parsed.host === CHAT_HOSTS[channel] ? parsed.toString() : null;
  } catch {
    return null;
  }
}

export type FollowNote = {
  channel: FollowChannel | null;
  /** `done`: followed. `next`: one more step, by the person. `problem`: not followed. */
  tone: 'done' | 'next' | 'problem';
  text: string;
  link?: { href: string; label: string };
};

export type FollowOutcomeView = { title: string; notes: FollowNote[] };

const UNAVAILABLE_TEXT = "Following isn't available right now. Try again in a few minutes.";

/** What the dialog says when a request failed before any answer about the packages. */
export function failureView(failure: FollowFailure): FollowOutcomeView {
  const text: Record<FollowFailure, string> = {
    not_found: "Following isn't available right now.",
    sign_in: 'Your session has ended. Sign in again and try once more.',
    invalid: 'Something in the request was off. Try again.',
    unavailable: UNAVAILABLE_TEXT,
    failed: UNAVAILABLE_TEXT,
  };
  return { title: 'Not followed', notes: [{ channel: null, tone: 'problem', text: text[failure] }] };
}

const KNOWN_RESULTS: ReadonlySet<string> = new Set(['active', 'connect', 'closed', 'limit', 'full', 'sign_in']);

/**
 * One channel's answers as what the person reads, in that order: what to do next first, then what was followed.
 * `verifiedEmail` is the address an email follow went to.
 */
function channelNotes(
  channel: FollowChannel,
  outcomes: FollowStartOutcome[],
  total: number,
  verifiedEmail: string | null,
): FollowNote[] {
  const label = CHANNEL_LABELS[channel];
  const count = (result: FollowStartOutcome['result']) => outcomes.filter((one) => one.result === result).length;
  const notes: FollowNote[] = [];

  const connect = outcomes.find((one) => one.result === 'connect');
  if (connect) {
    const href = chatLinkOf(channel, connect.url);
    notes.push(
      href
        ? {
            channel,
            tone: 'next',
            text:
              channel === 'telegram'
                ? 'Open Telegram and press Follow in the chat to finish.'
                : 'Open WhatsApp and send the message it fills in to finish.',
            link: { href, label: `Open ${label}` },
          }
        : { channel, tone: 'problem', text: `${label} isn't available right now.` },
    );
  }

  if (count('sign_in') > 0) {
    notes.push({ channel, tone: 'problem', text: EMAIL_SIGN_IN_PROBLEM });
  }
  // An answer this page does not know (an API newer or older than it): never a silent result.
  if (outcomes.some((one) => !KNOWN_RESULTS.has(one.result))) {
    notes.push({ channel, tone: 'problem', text: `Not followed on ${label}. Try again in a few minutes.` });
  }
  if (count('closed') > 0) {
    notes.push({ channel, tone: 'problem', text: `Following by ${label} isn't open here yet.` });
  }
  if (count('limit') > 0) {
    notes.push({
      channel,
      tone: 'problem',
      text: 'There have been too many follow requests for now. Try again tomorrow.',
    });
  }

  const active = count('active');
  const full = outcomes.find((one) => one.result === 'full');
  if (full) {
    const limit = full.limit ?? 0;
    const rule = `${ADDRESS_NOUNS[channel]} can follow ${formatCount(limit)} ${limit === 1 ? 'package' : 'packages'}`;
    const followed = active + count('connect');
    notes.push({
      channel,
      tone: 'problem',
      text:
        followed > 0
          ? `Followed ${followed} of ${total} on ${label}: ${rule}.`
          : `Not followed on ${label}: ${rule}, and it follows that many already.`,
    });
  } else if (active > 0) {
    const following =
      total > 1 && active < total ? `Following ${active} of ${total} on ${label}.` : `Following on ${label}.`;
    const where = channel === 'email' && verifiedEmail ? ` We write to ${verifiedEmail}.` : '';
    notes.push({ channel, tone: 'done', text: `${following}${where}` });
  }
  return notes;
}

/**
 * What a press of Follow became, as the dialog says it once the answer is in. `verifiedEmail`: the address an email
 * follow went to.
 */
export function outcomeView(
  answer: FollowStartAnswer,
  label: string,
  verifiedEmail: string | null = null,
): FollowOutcomeView {
  if (answer.refusal === 'not_held') {
    const names = answer.notHeld.map(({ name }) => name).join(', ');
    return {
      title: 'Not followed',
      notes: [
        {
          channel: null,
          tone: 'problem',
          text: `GitRanks has no data for ${names || 'this package'} yet, so it can't be followed.`,
        },
      ],
    };
  }
  if (answer.refusal === 'unavailable' || answer.results.length === 0) return failureView('unavailable');

  const total = new Set(answer.results.map(({ package: pkg }) => `${pkg.registry}/${pkg.name}`)).size;
  const notes = FOLLOW_CHANNELS.flatMap((channel) => {
    const outcomes = answer.results.filter((one) => one.channel === channel);
    return outcomes.length ? channelNotes(channel, outcomes, total, verifiedEmail) : [];
  });

  const results = new Set(answer.results.map(({ result }) => result));
  const title = results.has('connect')
    ? 'One more step'
    : results.has('active')
      ? `You follow ${label}`
      : 'Not followed';
  return { title, notes };
}
