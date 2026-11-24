import { describe, expect, it } from 'vitest';

import {
  CONTRIBUTE_RULES_PATH,
  choiceLabelOf,
  fairUseAnswerPathOf,
  fairUseMessagePartsOf,
  fairUseNoticeIdOf,
  fairUseTextLabelOf,
  isAccessClosed,
  rulesBannerPartsOf,
} from './fair-use';
import {
  accessClosedNotice,
  blockNotice,
  claimRatioWarning,
  fairUseNotice,
  outsideFixNotice,
  rulesBanner,
  warningNotice,
} from '@/lib/contribute/__fixtures__/fair-use';

describe('a message in pieces', () => {
  it('links the pull requests it names and keeps every word', () => {
    const parts = fairUseMessagePartsOf(fairUseNotice().text, fairUseNotice().vars.prs);
    expect(parts.map(({ text }) => text).join('')).toBe(fairUseNotice().text);
    expect(parts.filter(({ kind }) => kind === 'pr')).toEqual([
      { kind: 'pr', text: 'acme/widgets#412', url: 'https://github.com/acme/widgets/pull/412' },
    ]);
    expect(parts.some(({ kind }) => kind === 'answer')).toBe(false);
  });

  it('marks "tell us here" and "answer here" as the answer page', () => {
    expect(fairUseMessagePartsOf(warningNotice.text, warningNotice.vars.prs).at(-2)).toEqual({
      kind: 'answer',
      text: 'tell us here',
    });
    expect(fairUseMessagePartsOf(blockNotice.text, blockNotice.vars.prs).at(-2)).toEqual({
      kind: 'answer',
      text: 'answer here',
    });
  });

  it('links several pull requests, names with dots and dashes too', () => {
    const prs = [
      { name: 'a.b/c-d#1', url: 'https://github.com/a.b/c-d/pull/1' },
      { name: 'x/y#22', url: 'https://github.com/x/y/pull/22' },
    ];
    const parts = fairUseMessagePartsOf('Found: a.b/c-d#1, x/y#22. Why?', prs);
    expect(parts).toEqual([
      { kind: 'text', text: 'Found: ' },
      { kind: 'pr', text: 'a.b/c-d#1', url: 'https://github.com/a.b/c-d/pull/1' },
      { kind: 'text', text: ', ' },
      { kind: 'pr', text: 'x/y#22', url: 'https://github.com/x/y/pull/22' },
      { kind: 'text', text: '. Why?' },
    ]);
  });

  it('leaves a message without pull requests as it is', () => {
    expect(fairUseMessagePartsOf('Do you need help?', null)).toEqual([{ kind: 'text', text: 'Do you need help?' }]);
  });
});

describe('the Terms banner', () => {
  it('takes its first sentence as the title, without the full stop', () => {
    expect(rulesBannerPartsOf(rulesBanner?.text ?? '')).toEqual({
      title: 'We updated our Terms of service',
      rest: 'GitRanks Contribute has a new rule. By continuing to use Contribute you agree to it.',
    });
    expect(rulesBannerPartsOf('One sentence only.')).toEqual({ title: null, rest: 'One sentence only.' });
  });
});

describe('the answer page', () => {
  it('is at the message’s own address, and the rule at its anchor in the Terms', () => {
    expect(fairUseAnswerPathOf('583231-outsidePr-1-1')).toBe('/contribute/answer/583231-outsidePr-1-1');
    expect(fairUseAnswerPathOf('a/b=-viewing-2-3')).toBe('/contribute/answer/a%2Fb%3D-viewing-2-3');
    expect(CONTRIBUTE_RULES_PATH).toBe('/terms#contribute-rules');
  });

  it('takes only the ids the API gives, escaped or not', () => {
    expect(fairUseNoticeIdOf('583231-outsidePr-1-1')).toBe('583231-outsidePr-1-1');
    expect(fairUseNoticeIdOf('a%2Fb%3D-viewing-2-3')).toBe('a/b=-viewing-2-3');
    for (const bad of ['', 'x', '583231-other-1-1', '583231-outsidePr-4-1', '583231-viewing-1-x', '%E0%A4%A', null]) {
      expect(fairUseNoticeIdOf(bad)).toBeNull();
    }
  });

  it('asks for a choice and optional words on the first step, the words alone after it', () => {
    expect(fairUseTextLabelOf(fairUseNotice())).toEqual({ label: 'Anything to add', optional: true });
    expect(fairUseTextLabelOf(warningNotice)).toEqual({ label: 'Tell us what is in your way', optional: false });
    expect(fairUseTextLabelOf(blockNotice)).toEqual({ label: 'If this is a mistake, tell us why', optional: false });
    expect(choiceLabelOf('approval took too long')).toBe('Approval took too long');
  });

  it('takes the ids of the rules of today, each step', () => {
    for (const id of ['583231-outsideFix-1-1', '583231-outsideFix-3-2', '583231-claimRatio-2-1']) {
      expect(fairUseNoticeIdOf(id)).toBe(id);
    }
    expect(fairUseNoticeIdOf('583231-claimRatio-4-1')).toBeNull();
  });

  it('tells a closed access of the rules of today from every other message', () => {
    expect(isAccessClosed(accessClosedNotice)).toBe(true);
    for (const notice of [outsideFixNotice, claimRatioWarning, blockNotice, fairUseNotice()]) {
      expect(isAccessClosed(notice)).toBe(false);
    }
    expect(fairUseTextLabelOf(outsideFixNotice)).toEqual({ label: 'Anything to add', optional: true });
    expect(fairUseTextLabelOf(claimRatioWarning)).toEqual({ label: 'Tell us what is in your way', optional: false });
  });
});
