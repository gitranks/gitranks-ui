import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { Pill } from './pill';

const classesOf = (html: string) => (html.match(/class="([^"]*)"/)?.[1] ?? '').split(' ').sort();

describe('Pill', () => {
  it('is a badge on a soft fill of its tone, neutral when none is named', () => {
    const neutral = renderToStaticMarkup(<Pill>Archived</Pill>);
    expect(neutral).toContain('data-slot="badge"');
    expect(neutral).toContain('bg-muted text-foreground/80');
    expect(neutral).toContain('>Archived</span>');

    expect(renderToStaticMarkup(<Pill tone="green">Done</Pill>)).toContain('bg-positive/10 text-positive-strong');
    expect(renderToStaticMarkup(<Pill tone="violet">Now</Pill>)).toContain('bg-brand-soft text-brand-soft-foreground');
    expect(renderToStaticMarkup(<Pill tone="amber">Held</Pill>)).toContain(
      'bg-warning-soft text-warning-soft-foreground',
    );
    expect(renderToStaticMarkup(<Pill tone="red">Failed</Pill>)).toContain('bg-negative/10 text-negative-strong');
  });

  it("is the menu's mark when small: a plain span, the classes the menu items wrote out", () => {
    const html = renderToStaticMarkup(
      <Pill tone="violet" size="small">
        Beta
      </Pill>,
    );
    expect(html).toMatch(/^<span class="[^"]*">Beta<\/span>$/);
    expect(classesOf(html)).toEqual(
      'rounded-full bg-brand-soft px-1.5 py-px text-[11px] font-semibold text-brand-soft-foreground'.split(' ').sort(),
    );
  });
});
