import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { loadWorkspaceGate, loadContribute, cookies, search } = vi.hoisted(() => ({
  loadWorkspaceGate: vi.fn(),
  loadContribute: vi.fn(),
  cookies: vi.fn(),
  search: { value: new URLSearchParams() },
}));
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies }));
vi.mock('next/navigation', () => ({ useSearchParams: () => search.value }));
vi.mock('@/lib/workspace/gate.data', () => ({ loadWorkspaceGate }));
vi.mock('@/lib/workspace/contribute.data', () => ({ loadContribute }));
// The two headers as plain marks: which one is drawn is what is checked here.
vi.mock('@/components/header/header', () => ({
  Header: ({ section }: { section?: string }) => <header data-section={section ?? 'none'} />,
}));

const { OriginHeader } = await import('./origin-header');
const { OriginHeaderPick } = await import('./origin-header-pick');

type PickProps = Parameters<typeof OriginHeaderPick>[0];

const jarOf = (lastBar?: string) => ({
  get: (name: string) => (name === 'gr_last_bar' && lastBar ? { value: lastBar } : undefined),
});
const OPEN = { kind: 'open', entered: true, agents: { hosted: false, own: true }, learnOpen: true };

/** The header the layout's server part picks for, drawn with the address's query. */
async function headerFor(query = '') {
  search.value = new URLSearchParams(query);
  const element = (await OriginHeader()) as ReactElement<PickProps>;
  return { props: element.props, html: renderToStaticMarkup(element) };
}

beforeEach(() => {
  loadWorkspaceGate.mockReset().mockResolvedValue(OPEN);
  loadContribute.mockReset().mockResolvedValue({ sides: { contribute: true, learn: true } });
  cookies.mockReset().mockResolvedValue(jarOf());
});

describe("the header of a player's page under /my", () => {
  it("is Learn's for a link from Learn, Contribute's otherwise, for someone who uses both", async () => {
    expect((await headerFor('from=learn')).html).toContain('data-section="learn"');
    expect((await headerFor()).html).toContain('data-section="contribute"');
    expect((await headerFor('from=contribute')).html).toContain('data-section="contribute"');
  });

  it('follows the bar seen last, then the product the person uses', async () => {
    cookies.mockResolvedValue(jarOf('learn'));
    expect((await headerFor()).html).toContain('data-section="learn"');
    cookies.mockResolvedValue(jarOf());
    loadContribute.mockResolvedValue({ sides: { contribute: false, learn: true } });
    const learner = await headerFor();
    expect(learner.props.audience).toBe('learner');
    expect(learner.html).toContain('data-section="learn"');
  });

  it("is Contribute's wherever Learn is not open, the link from Learn too, and on a failed read", async () => {
    loadWorkspaceGate.mockResolvedValue({ ...OPEN, learnOpen: false });
    expect((await headerFor('from=learn')).html).toContain('data-section="contribute"');
    expect(loadContribute).not.toHaveBeenCalled();
    loadWorkspaceGate.mockResolvedValue({ kind: 'signed-out' });
    expect((await headerFor('from=learn')).html).toContain('data-section="contribute"');
    loadWorkspaceGate.mockRejectedValue(new Error('down'));
    expect((await headerFor('from=learn')).html).toContain('data-section="contribute"');
  });

  it("reads the product the person uses as both when it cannot be read, so the link's word decides", async () => {
    loadContribute.mockRejectedValue(new Error('down'));
    const { props, html } = await headerFor('from=learn');
    expect(props.audience).toBe('both');
    expect(html).toContain('data-section="learn"');
  });

  it("draws one header, never both, and the server's read of the bar seen last on the server", () => {
    search.value = new URLSearchParams();
    const html = renderToStaticMarkup(
      <OriginHeaderPick
        learnOpen
        audience="both"
        lastBar="learn"
        learn={<header data-section="learn" />}
        contribute={<header data-section="contribute" />}
      />,
    );
    expect(html).toBe('<header data-section="learn"></header>');
  });
});
