import type { Route } from 'next';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }) }));
vi.mock('@/lib/workspace/issue-actions', () => ({ startIssue: vi.fn(), skipIssue: vi.fn() }));
vi.mock('@/lib/workspace/start/start-page.actions', () => ({ readStartPageAttempt: vi.fn() }));

const { StartControl } = await import('./start-control');
const { startControlOf } = await import('@/lib/workspace/issue-row');

const REF = { repo: 'acme/widgets', issue: 42 };
const noop = () => {};

describe('the Start control', () => {
  it('has five rows: by side and by the agents connected now', () => {
    expect(startControlOf('contribute', REF, { hosted: true, own: false })).toEqual({ kind: 'hosted', label: 'Start' });
    expect(startControlOf('contribute', REF, { hosted: false, own: true })).toEqual({
      kind: 'link',
      label: 'Start',
      href: '/my/start/acme/widgets/42',
    });
    expect(startControlOf('contribute', REF, { hosted: true, own: true })).toEqual({
      kind: 'menu',
      label: 'Start',
      ownHref: '/my/start/acme/widgets/42',
    });
    // Nothing connected now: the Start page, whose first step connects the own agent.
    expect(startControlOf('contribute', REF, { hosted: false, own: false })).toEqual({
      kind: 'link',
      label: 'Start',
      href: '/my/start/acme/widgets/42',
    });
    // Learn: always a link to the Start page with a lesson, never a menu, whatever is connected.
    for (const agents of [
      { hosted: true, own: true },
      { hosted: true, own: false },
      { hosted: false, own: false },
    ]) {
      expect(startControlOf('learn', REF, agents)).toEqual({
        kind: 'link',
        label: 'Start a lesson',
        href: '/my/start/acme/widgets/42?lesson=1',
      });
    }
    expect(
      startControlOf('learn', REF, { hosted: false, own: true }, '/learn/start/acme/widgets/42' as Route),
    ).toMatchObject({
      href: '/learn/start/acme/widgets/42',
    });
  });

  const render = (
    control: ReturnType<typeof startControlOf>,
    props: { primary?: boolean; sending?: boolean; disabled?: boolean } = {},
  ) => renderToStaticMarkup(<StartControl control={control} onHosted={noop} label="acme/widgets #42" {...props} />);

  it('is the primary button on the first row only, outline on every other', () => {
    const hosted = startControlOf('contribute', REF, { hosted: true, own: false });
    expect(render(hosted, { primary: true })).toContain('bg-primary');
    expect(render(hosted)).not.toContain('bg-primary text-primary-foreground');
    expect(render(hosted)).toContain('border');
    const link = startControlOf('contribute', REF, { hosted: false, own: true });
    const primaryLink = render(link, { primary: true });
    expect(primaryLink).toContain('href="/my/start/acme/widgets/42"');
    expect(primaryLink).toContain('bg-primary');
  });

  it('says Starting… and is off while its start is sent; off while another row sends one', () => {
    const hosted = startControlOf('contribute', REF, { hosted: true, own: false });
    expect(render(hosted, { sending: true })).toMatch(/<button[^>]*disabled=""[^>]*>Starting…/);
    const menu = startControlOf('contribute', REF, { hosted: true, own: true });
    expect(render(menu, { disabled: true })).toMatch(/<button[^>]*disabled=""/);
    // A link is drawn as an inert button while another row's start is sent.
    const link = startControlOf('contribute', REF, { hosted: false, own: true });
    const html = render(link, { disabled: true });
    expect(html).not.toContain('href=');
    expect(html).toContain('disabled=""');
  });

  it('names the issue for a screen reader, and draws the chevron for the two ways', () => {
    const menu = render(startControlOf('contribute', REF, { hosted: true, own: true }));
    expect(menu).toContain('<span class="sr-only"> <!-- -->acme/widgets #42</span>'.replace('<!-- -->', ''));
    expect(menu).toContain('data-start-control="menu"');
    expect(menu).toContain('aria-haspopup="menu"');
  });
});
