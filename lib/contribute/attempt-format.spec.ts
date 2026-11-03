import { describe, expect, it } from 'vitest';

import { editableBodyOf, footerPreviewOf } from './attempt-format';

const FOOTER =
  '<sub>Made with [GitRanks Contribute](https://gitranks.com) and Codex (GPT) · Reviewed and submitted by @octocat</sub>';
const SENTENCE = 'This PR was written in part with the assistance of generative AI.';

describe('editableBodyOf', () => {
  it('takes out our footer, the old wording and the new, whatever page it links', () => {
    expect(editableBodyOf(`Done.\n\n${FOOTER}`)).toBe('Done.');
    expect(
      editableBodyOf('Done.\n\n🤖 Made with Claude via [gitranks.com](https://gitranks.com) · reviewed by @x'),
    ).toBe('Done.');
    expect(
      editableBodyOf(
        'Done.\n\n<sub>Made with [GitRanks Contribute](https://gitranks.com/maintainers) and Cursor</sub>',
      ),
    ).toBe('Done.');
    expect(editableBodyOf('Made with GitRanks Contribute, then edited by hand.')).toBe(
      'Made with GitRanks Contribute, then edited by hand.',
    );
  });
});

describe('footerPreviewOf', () => {
  it("shows the repo's sentence above the footer, unless the body says it already", () => {
    expect(footerPreviewOf(FOOTER, 'Done.')).toEqual({ text: FOOTER, sentence: false });
    expect(footerPreviewOf(`${SENTENCE}\n\n${FOOTER}`, 'Done.')).toEqual({
      text: `${SENTENCE}\n\n${FOOTER}`,
      sentence: true,
    });
    expect(
      footerPreviewOf(
        `${SENTENCE}\n\n${FOOTER}`,
        `Done.\n\nthis PR was written in part with\nthe assistance of generative AI.`,
      ),
    ).toEqual({
      text: FOOTER,
      sentence: false,
    });
  });
});
