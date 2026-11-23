// @vitest-environment jsdom
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({
  usePathname: () => '/my/settings',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}));
vi.mock('@/lib/workspace/actions', () => ({ readWorkspaceChanges: vi.fn(), readNeedsYouCount: vi.fn() }));
vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    prefetch: _prefetch,
    ...rest
  }: {
    href: string;
    children: ReactNode;
    prefetch?: unknown;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  useLinkStatus: () => ({ pending: false }),
}));
vi.mock('@/components/navigation-progress/navigation-progress', () => ({ useReportPendingNavigation: () => {} }));

const { WorkspaceTabsBar } = await import('./workspace-tabs-nav');

/** The boxes the browser would give: the tab list 360px wide, the current tab past its right edge. */
function layOut() {
  return vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    const [left, right] = this.tagName === 'UL' ? [0, 360] : this.getAttribute('aria-current') ? [330, 420] : [0, 0];
    return { left, right, top: 0, bottom: 0, width: right - left, height: 0, x: left, y: 0, toJSON: () => ({}) };
  });
}

describe('the tab bar in the browser', () => {
  let container: HTMLDivElement;
  let root: Root;
  let scrollIntoView: ReturnType<typeof vi.fn>;
  let scrollLeft: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView as unknown as Element['scrollIntoView'];
    scrollLeft = vi.spyOn(Element.prototype, 'scrollLeft', 'set');
    layOut();
    window.history.replaceState(null, '', '/my/settings');
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    document.getElementById('email')?.remove();
    vi.restoreAllMocks();
  });

  const mount = () =>
    act(() =>
      root.render(<WorkspaceTabsBar tabs={['contribute', 'pull-requests', 'agent', 'settings']} active="settings" />),
    );

  it("records Contribute's bar as the one seen last, but on the old Learn tab", () => {
    // biome-ignore lint/suspicious/noDocumentCookie: the spec starts with no bar recorded.
    document.cookie = 'gr_last_bar=learn; Path=/';
    act(() => root.render(<WorkspaceTabsBar tabs={['contribute', 'learn', 'settings']} active="learn" />));
    expect(document.cookie).toContain('gr_last_bar=learn');
    mount();
    expect(document.cookie).toContain('gr_last_bar=contribute');
  });

  it('shows the current tab by scrolling the tab list sideways, never the page', () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    const scrollBy = vi.spyOn(window, 'scrollBy').mockImplementation(() => {});
    mount();
    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(scrollTo).not.toHaveBeenCalled();
    expect(scrollBy).not.toHaveBeenCalled();
    expect(scrollLeft).toHaveBeenCalledTimes(1);
    expect(scrollLeft.mock.contexts[0]).toBe(container.querySelector('ul'));
    expect(scrollLeft).toHaveBeenCalledWith(60);
  });

  it("jumps to the link's section again when it streams in after the screen, so it does not push the section down", () => {
    const section = document.createElement('section');
    section.id = 'email';
    document.body.append(section);
    window.history.replaceState(null, '', '/my/settings#email');
    mount();
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView.mock.contexts[0]).toBe(section);
  });

  it('does nothing for a section the screen has not drawn yet: the screen jumps once it is there', () => {
    window.history.replaceState(null, '', '/my/settings#email');
    mount();
    expect(scrollIntoView).not.toHaveBeenCalled();
  });
});
