import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { choiceLabelOf, StyleStep } from './style-step';
import { findBadge } from '@/badge/v3/catalogue';
import { NOW, userMid } from '@/badge/v3/fixtures';

describe('StyleStep', () => {
  it('renders the language and the extra as design-system dropdowns whose triggers say the pick', () => {
    const html = renderToStaticMarkup(
      <StyleStep
        headingRef={{ current: null }}
        facts={userMid}
        badge={findBadge('user', 'language-rank')!}
        style={{}}
        now={NOW}
        onStyle={() => {}}
        onDone={() => {}}
      />,
    );
    const triggers = [
      ...html.matchAll(/role="combobox"[^>]*><span data-slot="select-value"[^>]*>([^<]*)<\/span>/g),
    ].map(([, label]) => label);

    // Radix keeps a hidden native select for forms; none is shown.
    expect(html).not.toMatch(/<select(?![^>]*aria-hidden="true")/);
    expect(triggers).toEqual(['Rust (#14,002)', 'List size (of 610,207)']);
  });

  it('says a choice with its sample where it has one', () => {
    expect(choiceLabelOf({ value: 'Go', name: 'Go', sample: '#12' })).toBe('Go (#12)');
    expect(choiceLabelOf({ value: 'none', name: 'None' })).toBe('None');
    expect(choiceLabelOf(undefined)).toBeUndefined();
  });
});
