// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { WhoDoesTheWork } from './who-does-the-work';
import { startRead } from '@/lib/contribute/__fixtures__/wave-4-parts';
import { type StartWaysRead, startWaysOf } from '@/lib/contribute/start-ways';

vi.mock('next-auth/react', () => ({ signIn: vi.fn() }));

const draw = (read: Partial<StartWaysRead>) => {
  document.body.innerHTML = renderToStaticMarkup(<WhoDoesTheWork ways={startWaysOf(startRead(read))} />);
  return document.body;
};
/** What a person reads: each element's words apart, as the page lays them out. */
const text = (node: Element | null) =>
  node?.innerHTML
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() ?? '';

describe('WhoDoesTheWork', () => {
  it('draws how Contribute works, the head, the two boxes with their facts, and "More about Contribute"', () => {
    const page = draw({});
    expect([...page.querySelectorAll('[data-how-contribute-works] li')].map(text)).toEqual([
      '1 Your agent does the work. It takes an issue we picked for you, fixes it on its own copy of the project, and hands the change back.',
      '2 You approve every pull request. Nothing reaches GitHub until you read the change and press Approve on GitRanks. The pull request opens in your name.',
      '3 It is fair to maintainers. You can see 10 to 70 full issues a day, by your GitRanks tier, and 5 more for each pull request merged through GitRanks, up to 100. Every pull request says it was made with GitRanks and your agent.',
    ]);
    expect(text(page.querySelector('h2'))).toBe('Who does the work?');
    expect([...page.querySelectorAll('[data-start-way]')].map((box) => box.getAttribute('data-start-way'))).toEqual([
      'own',
      'key',
    ]);
    expect([...page.querySelectorAll('[data-start-way="own"] dt, [data-start-way="own"] dd')].map(text)).toEqual([
      'You bring',
      'A coding agent that speaks MCP',
      'It spends',
      'Nothing through us',
      'The pace',
      'Whenever you ask your agent',
      'Setup',
      'About a minute',
    ]);
    expect(page.querySelector('a[href="/contribute/start/agent/own"]')?.textContent).toBe('Connect your agent');
    expect(page.querySelector('a[href="/contribute/start/agent/key"]')?.textContent).toBe('Use a Claude key');
    expect(page.querySelector('a[href="/contribute/about"]')?.textContent).toBe('More about Contribute →');
    expect(page.querySelector('[data-from-issue]')).toBeNull();
  });

  it("gives a visitor GitHub's sign-in on both buttons and the line on why the account is needed", () => {
    const page = draw({ signedIn: false });
    const buttons = [...page.querySelectorAll('button[data-start-way-button]')];
    expect(buttons.map(text)).toEqual(['Sign in and connect your agent', 'Sign in and use a Claude key']);
    expect(buttons.every((button) => button.querySelector('svg'))).toBe(true);
    expect(page.textContent).toContain('Your GitHub account is needed from here');
    expect(page.querySelector('[data-start-way] a[data-start-way-button]')).toBeNull();
  });

  it('says the way back above the title only while the issue reads', () => {
    expect(text(draw({ issue: 'q7k2m9xa', issueReads: true }).querySelector('[data-from-issue]'))).toBe(
      'You opened an issue. After this setup you go back to it.',
    );
    expect(draw({ issue: 'q7k2m9xa', issueReads: false }).querySelector('[data-from-issue]')).toBeNull();
  });

  it('marks a connected way done with a tick and draws the other smaller, under it', () => {
    const page = draw({ own: 'Claude Code' });
    const done = page.querySelector('[data-way-top="done"]');
    expect(text(done)).toBe('Claude Code is connected.');
    expect(done?.querySelector('svg')).not.toBeNull();
    const small = page.querySelector('[data-start-way="key"][data-small]');
    expect(text(small)).toBe(
      'A hosted agent on your Claude key No terminal needed. You can add it later. Use a Claude key',
    );
    expect(small?.querySelector('dl')).toBeNull();
  });

  it('draws one Continue under both boxes when both are connected and the person has no sign', () => {
    const page = draw({ own: 'Claude Code', key: 'connected' });
    expect(page.querySelectorAll('[data-start-way] [data-start-way-button]')).toHaveLength(0);
    const next = [...page.querySelectorAll('a[data-start-way-button]')];
    expect(next.map((link) => [text(link), link.getAttribute('href')])).toEqual([
      ['Continue', '/contribute/start/issue'],
    ]);
  });

  it('says a key that stopped working in the warning colour', () => {
    const page = draw({ key: 'invalid' });
    expect(text(page.querySelector('[data-way-top="warning"]'))).toBe('Your Claude key stopped working.');
    expect(page.querySelector('[data-start-way="key"] a')?.textContent).toBe('Replace your key');
  });
});
