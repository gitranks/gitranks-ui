import { describe, expect, it } from 'vitest';

import { LANDING_PR_FOOTER, prFooterTextOf } from './landing-copy';

describe("the pull request's footer, as the landing's band quotes it", () => {
  it('holds the words a pull request sent with a person’s own agent ends with', () => {
    expect(LANDING_PR_FOOTER.map(prFooterTextOf)).toEqual([
      'Made with GitRanks Contribute and Claude Code (Opus) · Reviewed and submitted by @mira-dev',
      'Something off? Tell us or opt out in one step. Maintainers are always in control.',
    ]);
  });

  it('links the same words GitHub shows as links', () => {
    expect(LANDING_PR_FOOTER.map(({ link }) => link)).toEqual([
      'GitRanks Contribute',
      'Tell us or opt out in one step',
    ]);
    // As the footer is written: "Something off? [Tell us or opt out in one step](…). Maintainers are always in control."
    const [, say] = LANDING_PR_FOOTER;
    expect(`${say.before}[${say.link}](https://gitranks.com/contribute/maintainers)${say.after}`).toBe(
      'Something off? [Tell us or opt out in one step](https://gitranks.com/contribute/maintainers). Maintainers are always in control.',
    );
  });

  it('has no long dash and no hyphen standing in for one', () => {
    for (const line of LANDING_PR_FOOTER.map(prFooterTextOf)) expect(line).not.toMatch(/—|–| - /);
  });
});
