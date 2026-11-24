import type { PullRequestApproval } from './pull-request-page.types';

/**
 * The words and rules of Approve, one screen for Learn and Contribute: what is needed before sending, the card's one
 * note and its button, and the one key that sends.
 */

/** The title starts with the prefix the project asks for (any case, spaces before it ignored); true with no prefix. */
export function titleHasPrefix(title: string, prefix: string | null): boolean {
  if (!prefix?.trim()) return true;
  return title.trimStart().toLowerCase().startsWith(prefix.trim().toLowerCase());
}

/** The title with the project's prefix in front: "fix: Cap the retry list". */
export function withPrefix(title: string, prefix: string): string {
  const trimmed = prefix.trim();
  return titleHasPrefix(title, trimmed) ? title : `${trimmed} ${title.trimStart()}`;
}

/** What the person fills in on the screen: the title, and the sign-off tick. */
export type ApproveDraft = { title: string; signOff: boolean };

/** What is still needed before the button sends, in the card's words; empty when nothing is. */
export function neededOf(approval: Pick<PullRequestApproval, 'titlePrefix' | 'signOffNeeded'>, draft: ApproveDraft) {
  const needs: string[] = [];
  if (!draft.title.trim()) needs.push('a title');
  else if (!titleHasPrefix(draft.title, approval.titlePrefix)) {
    needs.push(`a title that starts with “${approval.titlePrefix?.trim()}”`);
  }
  if (approval.signOffNeeded && !draft.signOff) needs.push('the sign-off');
  return needs;
}

/** "Needed before sending: a title that starts with “fix:”, and the sign-off." */
export const neededLineOf = (needs: string[]) =>
  needs.length > 1 ? `${needs.slice(0, -1).join(', ')}, and ${needs[needs.length - 1]}.` : `${needs[0] ?? ''}.`;

/** Where the card stands: one note and its button. `sending`: the press went through and waits for the answer. */
export type ApproveCardState = 'ready' | 'sending' | 'failed';

/** `walkthrough`: the lead is a link to the walkthrough, when the page gives its address. */
export type ApproveNote = {
  tone: 'plain' | 'warning' | 'error';
  lead: string | null;
  text: string;
  link?: 'walkthrough';
};

export const PUBLIC_PAGE_NOTE =
  'Nothing has reached GitHub yet. Once it is sent, it opens in your name, the project’s maintainers see it, and GitRanks shows on a public page how it was made.';

/**
 * The card's note and button, in order of what blocks the send: a send under way, the walkthrough not passed (Learn),
 * something needed, a send that failed, GitHub's permission, then the plain note about the public page.
 */
export function approveCardOf(
  approval: Pick<PullRequestApproval, 'titlePrefix' | 'signOffNeeded' | 'githubAllowed' | 'walkthroughPassed'>,
  draft: ApproveDraft,
  state: ApproveCardState,
): { note: ApproveNote; button: string; ready: boolean } {
  const needs = neededOf(approval, draft);
  if (state === 'sending') {
    return { note: { tone: 'plain', lead: null, text: PUBLIC_PAGE_NOTE }, button: 'Sending…', ready: false };
  }
  if (approval.walkthroughPassed === false) {
    return {
      note: {
        tone: 'warning',
        lead: 'Finish the walkthrough first:',
        text: 'the pull request is sent after it.',
        link: 'walkthrough',
      },
      button: 'Send the pull request',
      ready: false,
    };
  }
  if (needs.length) {
    return {
      note: { tone: 'warning', lead: 'Needed before sending:', text: neededLineOf(needs) },
      button: 'Send the pull request',
      ready: false,
    };
  }
  if (state === 'failed') {
    return {
      note: {
        tone: 'error',
        lead: null,
        text: 'GitHub could not be reached. Nothing was sent, and your text is kept.',
      },
      button: 'Send it again',
      ready: true,
    };
  }
  if (!approval.githubAllowed) {
    return {
      note: {
        tone: 'plain',
        lead: null,
        text: 'GitHub asks you once for permission to open pull requests in your name. You come back here, and it is sent.',
      },
      button: 'Allow on GitHub and send',
      ready: true,
    };
  }
  return { note: { tone: 'plain', lead: null, text: PUBLIC_PAGE_NOTE }, button: 'Send the pull request', ready: true };
}

/**
 * The one key that sends, on Approve and for a round: Ctrl + Enter, or ⌘ + Enter on a Mac. Enter alone, or with Shift
 * or Alt, does nothing, and nor does the Enter that ends a word being composed (an input method's).
 */
export const isSendKey = (
  event: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey'> &
    Partial<Pick<KeyboardEvent, 'isComposing' | 'keyCode'>>,
) =>
  event.key === 'Enter' &&
  (event.ctrlKey || event.metaKey) &&
  !event.shiftKey &&
  !event.altKey &&
  !event.isComposing &&
  event.keyCode !== 229;

/** The key's name beside Enter: ⌘ on a Mac, Ctrl elsewhere. */
export const sendKeyNameOf = (platform: string) => (/mac|iphone|ipad/i.test(platform) ? '⌘' : 'Ctrl');
