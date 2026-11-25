import { describe, expect, it } from 'vitest';

import {
  ISSUE_SETUP_LINES,
  issuePageProductOf,
  issueSetupHrefOf,
  issueSetupOf,
  issueStartSignsOf,
} from './issue-page-signs';
import { learnBackOf } from './paths';

const NONE = { contribute: false, learn: false };
const CONTRIBUTE = { contribute: true, learn: false };
const LEARN = { contribute: false, learn: true };
const BOTH = { contribute: true, learn: true };
const UNKNOWN = { contribute: null, learn: null };

describe('which product the page of one issue is opened from', () => {
  it('follows `from` when it names a product, whatever the signs', () => {
    for (const signs of [NONE, CONTRIBUTE, LEARN, BOTH, UNKNOWN]) {
      expect(issuePageProductOf('learn', signs)).toBe('learn');
      expect(issuePageProductOf('contribute', signs)).toBe('contribute');
    }
  });

  it.each([['email'], ['agent'], ['profile'], [undefined]])(
    'for a `from` of %s, the signs decide: Learn only for the Learn sign without the Contribute sign',
    (from) => {
      expect(issuePageProductOf(from, LEARN)).toBe('learn');
      expect(issuePageProductOf(from, { contribute: null, learn: true })).toBe('learn');
      expect(issuePageProductOf(from, NONE)).toBe('contribute');
      expect(issuePageProductOf(from, CONTRIBUTE)).toBe('contribute');
      expect(issuePageProductOf(from, BOTH)).toBe('contribute');
      expect(issuePageProductOf(from, UNKNOWN)).toBe('contribute');
    },
  );
});

describe('the onboarding a fix needs first', () => {
  it('from Contribute: Contribute’s, only while its sign is known to be missing', () => {
    expect(issueSetupOf('contribute', NONE)).toBe('contribute');
    expect(issueSetupOf('contribute', LEARN)).toBe('contribute');
    expect(issueSetupOf('contribute', CONTRIBUTE)).toBeNull();
    expect(issueSetupOf('contribute', BOTH)).toBeNull();
    expect(issueSetupOf('contribute', UNKNOWN)).toBeNull();
  });

  it('from Learn: Learn’s, only while its sign is known to be missing; the Contribute sign is not needed', () => {
    expect(issueSetupOf('learn', NONE)).toBe('learn');
    expect(issueSetupOf('learn', CONTRIBUTE)).toBe('learn');
    expect(issueSetupOf('learn', LEARN)).toBeNull();
    expect(issueSetupOf('learn', BOTH)).toBeNull();
    expect(issueSetupOf('learn', UNKNOWN)).toBeNull();
  });
});

describe('what the start form offers by the signs', () => {
  it('"Just fix it" only with the Contribute sign', () => {
    expect(issueStartSignsOf(BOTH, false).justFix).toBe(true);
    expect(issueStartSignsOf(CONTRIBUTE, false).justFix).toBe(true);
    expect(issueStartSignsOf(LEARN, false).justFix).toBe(false);
    expect(issueStartSignsOf(UNKNOWN, true).justFix).toBe(false);
  });

  it('the walkthrough line by the Learn sign, today’s rule only while it is not known', () => {
    expect(issueStartSignsOf(BOTH, false).walkthrough).toBe(true);
    expect(issueStartSignsOf(CONTRIBUTE, true).walkthrough).toBe(false);
    expect(issueStartSignsOf(UNKNOWN, true).walkthrough).toBe(true);
    expect(issueStartSignsOf(UNKNOWN, false).walkthrough).toBe(false);
  });
});

describe('where "Start fixing it" leads without the sign', () => {
  it('Contribute’s onboarding with the issue as its way back, naming no project', () => {
    expect(issueSetupHrefOf('contribute', 'q7k2m9xa')).toBe('/contribute/start?issue=q7k2m9xa');
  });

  it('Learn’s onboarding, back to this page from Learn with its view', () => {
    const href = issueSetupHrefOf('learn', 'q7k2m9xa', 'language=python');
    const back = new URL(href, 'https://x.invalid').searchParams.get('back');
    expect(href.startsWith('/learn/setup?back=')).toBe(true);
    expect(back).toBe('/my/issues/q7k2m9xa?from=learn&language=python');
    expect(learnBackOf(back)).toBe(back);
    expect(issueSetupHrefOf('learn', 'q7k2m9xa')).toBe(
      `/learn/setup?back=${encodeURIComponent('/my/issues/q7k2m9xa?from=learn')}`,
    );
  });

  it('says the setup takes two minutes and comes back here, for each product', () => {
    expect(ISSUE_SETUP_LINES.contribute).toBe(
      'First time here? A 2-minute setup shows how Contribute works, then you come back to this issue.',
    );
    expect(ISSUE_SETUP_LINES.learn).toBe(
      'First time here? A 2-minute setup shows how Learn works, then you come back to this issue.',
    );
  });
});
