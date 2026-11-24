import { describe, expect, it } from 'vitest';

import { codeSpansOf } from './code-spans';

describe('codeSpansOf', () => {
  it('splits `code` spans out of plain text, never reading anything else as markup', () => {
    expect(codeSpansOf('Are `/docs/` and `/docs` <b>one</b>?')).toEqual([
      { code: false, text: 'Are ' },
      { code: true, text: '/docs/' },
      { code: false, text: ' and ' },
      { code: true, text: '/docs' },
      { code: false, text: ' <b>one</b>?' },
    ]);
    expect(codeSpansOf('a lone ` tick')).toEqual([{ code: false, text: 'a lone ` tick' }]);
  });
});
