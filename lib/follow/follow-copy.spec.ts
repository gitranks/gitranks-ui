import { describe, expect, it } from 'vitest';

import type { FollowChannelOption, FollowStartAnswer, FollowStartOutcome } from './follow.types';
import { channelHint, chatLinkOf, eventSwitches, failureView, outcomeView } from './follow-copy';

const pkg = (name: string) => ({ registry: 'npm', name });
const outcome = (
  channel: FollowStartOutcome['channel'],
  name: string,
  result: FollowStartOutcome['result'],
  extra: Partial<FollowStartOutcome> = {},
): FollowStartOutcome => ({ channel, package: pkg(name), result, url: null, limit: null, ...extra });
const answer = (results: FollowStartOutcome[]): FollowStartAnswer => ({ refusal: null, notHeld: [], results });
const option = (over: Partial<FollowChannelOption>): FollowChannelOption => ({
  channel: 'telegram',
  open: true,
  limit: 20,
  linked: null,
  addressHint: null,
  rankUpdates: null,
  ...over,
});

describe('the Follow dialog’s words', () => {
  it('say how many dependents have 1,000+ stars today only when the numbers came', () => {
    expect(eventSwitches({ dependents: 16, notable: 4 })[0].text).toBe(
      'Right away. Today 4 of its 16 dependents have 1,000+ stars.',
    );
    expect(eventSwitches({ dependents: 1, notable: 1 })[0].text).toBe(
      'Right away. Today 1 of its 1 dependent has 1,000+ stars.',
    );
    expect(eventSwitches({ dependents: null, notable: null })[0].text).toBe('Right away.');
    expect(eventSwitches({ dependents: 0, notable: 0 })[0].text).toBe('Right away.');
    expect(eventSwitches(null).map(({ name }) => name)).toEqual(['notable', 'digest', 'milestones']);
  });

  it('describe each channel row', () => {
    expect(channelHint(option({ linked: false }), false)).toBe('Not connected');
    expect(channelHint(option({ linked: true, rankUpdates: true }), false)).toBe(
      'Connected · you get rank updates here',
    );
    expect(channelHint(option({ linked: true, rankUpdates: false }), false)).toBe('Connected');
    expect(channelHint(option({ channel: 'email', addressHint: 'm•••@gmail.com' }), true)).toBe(
      'Following · m•••@gmail.com',
    );
    expect(channelHint(option({ channel: 'email' }), false, 'octo@example.com')).toBe(
      'octo@example.com · verified on GitHub',
    );
    expect(channelHint(option({ channel: 'email' }), false)).toBe('Not connected');
  });

  it('open a chat link only on the chat app’s own site', () => {
    expect(chatLinkOf('telegram', 'https://t.me/somebot?start=f_abc')).toBe('https://t.me/somebot?start=f_abc');
    expect(chatLinkOf('whatsapp', 'https://wa.me/1?text=Follow%20x')).toBe('https://wa.me/1?text=Follow%20x');
    expect(chatLinkOf('telegram', 'https://wa.me/1')).toBeNull();
    expect(chatLinkOf('telegram', 'http://t.me/x')).toBeNull();
    expect(chatLinkOf('telegram', 'javascript:alert(1)')).toBeNull();
    expect(chatLinkOf('email', 'https://t.me/x')).toBeNull();
  });
});

describe('what a press of Follow became', () => {
  it('says where an email follow writes', () => {
    expect(outcomeView(answer([outcome('email', 'x', 'active')]), 'x', 'octo@example.com')).toEqual({
      title: 'You follow x',
      notes: [{ channel: 'email', tone: 'done', text: 'Following on Email. We write to octo@example.com.' }],
    });
  });

  it('gives Telegram’s link from the code, to finish in the chat', () => {
    const url = 'https://t.me/somebot?start=f_code';
    const view = outcomeView(answer([outcome('telegram', 'x', 'connect', { url })]), 'x');
    expect(view.title).toBe('One more step');
    expect(view.notes[0]).toMatchObject({ tone: 'next', link: { href: url, label: 'Open Telegram' } });
  });

  it('says a chat link that is not the chat app’s own is not available', () => {
    const view = outcomeView(answer([outcome('telegram', 'x', 'connect', { url: 'https://example.com' })]), 'x');
    expect(view.notes[0]).toMatchObject({ tone: 'problem' });
    expect(view.notes[0].link).toBeUndefined();
  });

  it('says followed when every package is active', () => {
    expect(outcomeView(answer([outcome('telegram', 'x', 'active')]), 'x')).toEqual({
      title: 'You follow x',
      notes: [{ channel: 'telegram', tone: 'done', text: 'Following on Telegram.' }],
    });
  });

  it('says how many of the slot a full chat took', () => {
    const results = [
      ...['a', 'b', 'c'].map((name) => outcome('whatsapp', name, 'active')),
      ...['d', 'e'].map((name) => outcome('whatsapp', name, 'full', { limit: 3 })),
    ];
    expect(outcomeView(answer(results), 'nebula/ui packages').notes).toEqual([
      { channel: 'whatsapp', tone: 'problem', text: 'Followed 3 of 5 on WhatsApp: a chat can follow 3 packages.' },
    ]);
  });

  it.each([
    ['limit', 'too many follow requests'],
    ['closed', "isn't open here yet"],
    ['sign_in', 'GitHub has verified'],
  ] as const)('explains a %s refusal', (result, words) => {
    const view = outcomeView(answer([outcome('email', 'x', result)]), 'x');
    expect(view.title).toBe('Not followed');
    expect(view.notes[0].tone).toBe('problem');
    expect(view.notes[0].text.toLowerCase()).toContain(words.toLowerCase());
  });

  it('names the packages GitRanks has no data for, and says when following is unavailable', () => {
    expect(outcomeView({ refusal: 'not_held', notHeld: [pkg('ghost')], results: [] }, 'ghost').notes[0].text).toBe(
      "GitRanks has no data for ghost yet, so it can't be followed.",
    );
    expect(outcomeView({ refusal: 'unavailable', notHeld: [], results: [] }, 'x')).toEqual(failureView('unavailable'));
  });

  it('keeps the channels in the dialog’s order', () => {
    const view = outcomeView(
      answer([outcome('whatsapp', 'x', 'active'), outcome('email', 'x', 'active'), outcome('telegram', 'x', 'active')]),
      'x',
    );
    expect(view.notes.map(({ channel }) => channel)).toEqual(['email', 'telegram', 'whatsapp']);
  });
});
