// @vitest-environment jsdom
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
}));
const hint = vi.hoisted(() => ({ present: false }));
vi.mock('@/lib/session-hint', () => ({ hasSessionHint: () => hint.present }));

const { AboutView } = await import('./about-view');
const { INTERVIEWS_ABOUT_METADATA, INTERVIEWS_MINE_METADATA } = await import('@/lib/interviews/mine-about-seo');

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let host: HTMLDivElement;
const fetchMock = vi.fn();

async function draw() {
  await act(async () => {
    root.render(<AboutView />);
  });
  await act(async () => {});
}

const part = (id: string) => host.querySelector<HTMLElement>(`[data-interviews-about-part="${id}"]`);
const button = () => host.querySelector<HTMLAnchorElement>('[data-interviews-about-button]');

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
  hint.present = false;
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

describe('How it works', () => {
  it('says what a plan is in two sentences, then the parts in reading order', async () => {
    await draw();
    expect(host.querySelector('h1')?.textContent).toBe('How Interviews works');
    const lead = host.querySelector('h1 + p')?.textContent ?? '';
    expect(lead.split('. ')).toHaveLength(2);
    expect([...host.querySelectorAll('h2')].map((heading) => heading.textContent)).toEqual([
      'A plan, step by step',
      'Where the facts come from',
      'What is kept about you',
      'Questions',
    ]);
    expect(part('interviews-about-steps')?.querySelectorAll('li')).toHaveLength(3);
  });

  it('writes where the facts come from as six points in one format: a small heading and one paragraph', async () => {
    await draw();
    const facts = part('interviews-about-facts');
    const points = facts?.querySelectorAll('[data-interviews-about-fact]') ?? [];
    expect(points).toHaveLength(6);
    for (const point of points) {
      expect([...point.children].map((child) => child.tagName)).toEqual(['H3', 'P']);
    }
    expect(facts?.querySelector('table, ul, ol, dl')).toBeNull();
  });

  it('keeps what is kept about a person to one paragraph, with the owner’s wording and no setting named', async () => {
    await draw();
    const kept = part('interviews-about-kept');
    expect(kept?.querySelectorAll('p')).toHaveLength(1);
    expect(kept?.textContent).toContain('Your interview plans are not publicly visible.');
    expect(host.textContent).not.toMatch(/never share/i);
    expect(host.textContent).not.toMatch(/delete all data/i);
  });

  it('says nothing of how the work is done inside: how often, what it costs us, which tools', async () => {
    await draw();
    const words = host.textContent ?? '';
    expect(words).not.toMatch(/\b(daily|weekly|monthly|yearly|every (day|week|month|year)|once a)\b/i);
    expect(words).not.toMatch(/\b(model|opus|fable|claude|gpt|serper|scraper|crawler|search results)\b/i);
    expect(words).not.toMatch(/\$\d/);
  });

  it('opens a question in place, under its own line, and leaves the others closed', async () => {
    await draw();
    const questions = [...part('interviews-about-questions')!.querySelectorAll('button')];
    expect(questions.map((question) => question.textContent)).toEqual([
      'Is a plan official?',
      'Does anyone see which interview I prepare for?',
      'Do the lessons of a plan count in Learn?',
      'What if a fact is wrong?',
      'What does it cost?',
      'Why is my company not here?',
    ]);
    expect(questions.every((question) => question.getAttribute('aria-expanded') === 'false')).toBe(true);
    const learn = questions[2];
    await act(async () => learn.click());
    expect(learn.getAttribute('aria-expanded')).toBe('true');
    const answer = document.getElementById(learn.getAttribute('aria-controls') ?? '');
    expect(answer?.hidden).toBe(false);
    expect(answer?.previousElementSibling).toBe(learn);
    expect(answer?.textContent).toContain('three days later');
    expect(questions.filter((question) => question.getAttribute('aria-expanded') === 'true')).toEqual([learn]);
    await act(async () => learn.click());
    expect(answer?.hidden).toBe(true);
  });

  it('has one button: "See the companies" for a visitor, with nothing asked', async () => {
    await draw();
    expect(host.querySelectorAll('main > div:last-child a')).toHaveLength(1);
    expect(button()?.textContent).toBe('See the companies');
    expect(button()?.getAttribute('href')).toBe('/interviews');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('turns the button in place into "Back to your plans" for someone with plans', async () => {
    hint.present = true;
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ bar: { mine: true } })));
    await draw();
    expect(fetchMock).toHaveBeenCalledWith('/api/me/interviews/bar', { cache: 'no-store' });
    expect(button()?.textContent).toBe('Back to your plans');
    expect(button()?.getAttribute('href')).toBe('/interviews/mine');
  });

  it('keeps "See the companies" for a person with no plan, and when the read fails', async () => {
    hint.present = true;
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ bar: { mine: false } })));
    await draw();
    expect(button()?.textContent).toBe('See the companies');
    act(() => root.unmount());
    root = createRoot(host);
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 502 }));
    await draw();
    expect(button()?.textContent).toBe('See the companies');
  });
});

describe('what the two pages tell search engines', () => {
  it('never indexes My interviews, and How it works while Interviews is not open to everyone', () => {
    expect(INTERVIEWS_MINE_METADATA.robots).toEqual({ index: false, follow: false });
    expect(INTERVIEWS_MINE_METADATA.title).toBe('My interviews');
    expect(INTERVIEWS_ABOUT_METADATA.robots).toEqual({ index: false, follow: false });
    expect(INTERVIEWS_ABOUT_METADATA.title).toEqual({ absolute: 'How GitRanks Interviews works' });
    expect(INTERVIEWS_ABOUT_METADATA.alternates?.canonical).toBe('/interviews/about');
    expect(INTERVIEWS_ABOUT_METADATA.description).toContain('A plan follows the real rounds');
  });
});
