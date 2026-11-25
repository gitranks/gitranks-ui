import { dayLabel } from './format';

/*
 * The words of the Claude key's three notices, written once: the Agent tab's notices (`noticeCopyOf`) and Contribute
 * home's agent box both read them, so the two never say a key's state in different words.
 */

/** A notice about the person's Claude key: it stopped working, its credits are used up, or its workspace's limit. */
export type KeyNotice =
  | { kind: 'key-invalid' }
  | { kind: 'exhausted'; until: string | null }
  | { kind: 'limit-reached'; until: string | null };

export type KeyNoticeKind = KeyNotice['kind'];

export const KEY_NOTICE_KINDS: readonly KeyNoticeKind[] = ['key-invalid', 'exhausted', 'limit-reached'];

const untilText = (until: string | null, fallback: string) => (until ? `on ${dayLabel(until)}` : fallback);

/** A key notice's title and its sentence, with its date when the notice has one. */
export function keyNoticeWordsOf(notice: KeyNotice): { title: string; text: string } {
  switch (notice.kind) {
    case 'key-invalid':
      return {
        title: 'Your Claude key stopped working',
        text: 'Anthropic refused it: it was deleted, or it is not the key you meant. Contributing is paused until you connect a working one.',
      };
    case 'exhausted':
      return {
        title: 'Your credits are used up for this cycle',
        text: `Nothing starts until they renew ${untilText(notice.until, 'on your renewal day')}. Nothing is spent beyond them.`,
      };
    case 'limit-reached':
      return {
        title: "Your workspace's spend limit is reached",
        text: `The Claude Console stopped this workspace at its monthly limit. Work starts again ${untilText(notice.until, 'when the limit resets on the 1st')}, or raise the limit in the Console.`,
      };
  }
}
