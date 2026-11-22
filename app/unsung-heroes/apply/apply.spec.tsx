import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { AMBIGUOUS, applicationOf, MY_PACKAGES, NOT_FOUND, VISITOR_VIEW, viewOf, WEEK_46 } from './__fixtures__/apply';
import type { ApplyFormStart } from './components/apply-form';
import type { HeroApplyView } from '@/lib/unsung-hero/apply.types';
import { APPLY_RULES } from '@/lib/unsung-hero/apply-prompt';

vi.mock('server-only', () => ({}));
vi.mock('@/components/header/header', () => ({ Header: () => null }));
vi.mock('./actions', () => ({
  resolveApplyPackage: vi.fn(),
  sendApplication: vi.fn(),
  cancelApplication: vi.fn(),
}));

const { HeroApplyScreen } = await import('./components/hero-apply-screen');

const text = (html: string) =>
  html
    .replace(/<!-- -->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&#x27;', "'")
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replace(/\s+/g, ' ')
    .trim();

const render = (
  view: HeroApplyView | null,
  { signedIn = true, start }: { signedIn?: boolean; start?: ApplyFormStart } = {},
) => text(renderToStaticMarkup(<HeroApplyScreen view={view} signedIn={signedIn} start={start} />));

describe('/unsung-heroes/apply for a visitor', () => {
  const words = render(VISITOR_VIEW, { signedIn: false });

  it('says it is free, what we look for and the registries from the API, and asks to sign in', () => {
    expect(words).toContain('Think a package belongs here?');
    expect(words).toContain('It is free. Always. We never ask for money, stars or anything else in exchange');
    expect(words).toContain(
      'What we look for Packages from npm, PyPI, crates.io, Packagist, pub.dev, Maven Central and Go. We check every application ourselves; a person makes the call.',
    );
    for (const { title, text: rule } of APPLY_RULES) expect(words).toContain(`${title} ${rule}`);
    expect(words).toContain('One hero a week, so most good packages wait their turn.');
    expect(words).toContain('Sign in to apply');
    expect(words).toContain('Questions or ideas? Write to hello@gitranks.com .');
  });

  it('with the API down: the rules without the registries, and still the sign-in', () => {
    const down = render(null, { signedIn: false });
    expect(down).toContain('What we look for We check every application ourselves');
    expect(down).toContain('Sign in to apply');
  });
});

describe('signed in', () => {
  it('no application: the viewer’s packages to choose from, and Nominate another package', () => {
    const words = render(viewOf());
    expect(words).toContain('1. Choose a package Packages published from repositories your account owns.');
    expect(words).toContain('tiny-clamp npm octocat/tiny-clamp 2.4M a week');
    expect(words).toContain('tidy-env PyPI octocat/tidy-env 4.5M a month');
    expect(words).toContain('clamp-rs crates.io octocat/clamp-rs');
    expect(words).toContain('Nominate another package →');
    // Nothing chosen yet: no prompt, no note.
    expect(words).not.toContain('Check it with your agent');
    expect(words).not.toContain('Send application');
  });

  it('no packages of their own: the nomination field at once', () => {
    const words = render(viewOf({ packages: [] }));
    expect(words).toContain('We found no packages published from repositories your account owns.');
    expect(words).toContain('Another package: its name or a link to it');
  });

  it('a package chosen: the prompt to copy, collapsed, and the note with its count', () => {
    const words = render(viewOf(), { start: { chosen: 'NPM/tiny-clamp', note: 'Used everywhere.' } });
    expect(words).toContain('Check it with your agent (optional)');
    expect(words).toContain('it checks tiny-clamp against the rules and suggests fixes. Copy prompt Show the prompt');
    expect(words).not.toContain('Prompt for your agent');
    expect(words).toContain('2. Tell us about tiny-clamp A note for us (optional) 16/500');
    expect(words).toContain('One open application per account. Send application');
  });

  it('a nomination in two registries: the matches to pick from', () => {
    const words = render(viewOf(), { start: { nominate: { typed: 'pathlike', resolved: AMBIGUOUS } } });
    expect(words).toContain('That name is in more than one registry. Which one do you mean?');
    expect(words).toContain('pathlike npm mona/pathlike');
    expect(words).toContain('pathlike PyPI hubot/pathlike');
    expect(words).not.toContain('2. Tell us about');
  });

  it('a nomination we could not find can still be sent as typed', () => {
    const words = render(viewOf(), {
      start: { nominate: { typed: 'left-padder', resolved: NOT_FOUND }, promptOpen: true },
    });
    expect(words).toContain('We could not find it. You can still send it as typed');
    expect(words).toContain('Check whether the package left-padder fits');
    expect(words).toContain('2. Tell us about left-padder');
  });

  it('in review: the status, the package, when it was sent, the note, and Cancel', () => {
    const words = render(viewOf({ application: applicationOf() }));
    expect(words).toContain('Your application In review');
    expect(words).toContain('We have your application');
    expect(words).toContain(
      'Package tiny-clamp npm Sent Oct 27, 2026 Your note Most date pickers use it for clamping.',
    );
    expect(words).toContain('Cancel application');
    expect(words).not.toContain('1. Choose a package');
  });

  it('scheduled: the week, nothing to cancel, past heroes', () => {
    const words = render(viewOf({ application: applicationOf({ status: 'SCHEDULED', week: WEEK_46 }) }));
    expect(words).toContain('Scheduled · Nov 9 – 15');
    expect(words).toContain('tiny-clamp is the Unsung hero for Nov 9 – 15');
    expect(words).toContain('From Monday, November 9, the home page features it for a week.');
    expect(words).toContain('See past heroes');
    expect(words).toContain('Scheduled applications cannot be cancelled here.');
    expect(words).not.toContain('Cancel application');
  });

  it('not picked: says so, and offers a new application', () => {
    const words = render(viewOf({ application: applicationOf({ status: 'NOT_PICKED' }) }));
    expect(words).toContain('Not picked We did not pick tiny-clamp this time');
    expect(words).toContain('Send a new application');
  });

  it('a nomination we could not find shows as typed', () => {
    const words = render(viewOf({ application: applicationOf({ package: null, typed: 'left-padder' }) }));
    expect(words).toContain('Package “left-padder” Sent');
  });

  it('a profile still being set up, and an API that did not answer', () => {
    expect(render(viewOf({ viewer: null }))).toContain('Your GitRanks profile is still being set up.');
    expect(render(null)).toContain('Applications are not available right now.');
  });

  it('draws every package it was given', () => {
    const words = render(viewOf());
    for (const pkg of MY_PACKAGES) expect(words).toContain(pkg.repository as string);
  });
});
