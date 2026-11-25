import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/my/pull-requests',
  useSearchParams: () => new URLSearchParams(),
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));
vi.mock('@/lib/workspace/actions', () => ({}));
vi.mock('@/lib/contribute/actions', () => ({}));
// A marker where the page reads itself again, so the static markup shows it.
vi.mock('@/lib/workspace/contribute.data', () => ({
  loadContribute: vi.fn(),
  loadAttempt: vi.fn(),
  loadAttempts: vi.fn(),
  loadRepliesWaiting: vi.fn(),
}));
const {
  AUTOPILOT_CONFIRM_LINES,
  AUTOPILOT_LAUNCH_LINE,
  AutopilotConfirmLines,
  AutopilotHowItWorks,
  AutopilotRecord,
  autopilotErrorMessage,
} = await import('@/components/workspace/autopilot');
const { views } = await import('@/lib/contribute/__fixtures__/contribute-views');
const { followUpErrorMessage, handledErrorMessage } = await import('@/lib/workspace/follow-up-format');

import type { ContributeView } from '@/lib/workspace/contribute.types';

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&#x27;', "'")
    .replaceAll('&quot;', '"')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' ');

describe('a pull request that needs the user, on My contributions', () => {
  it('says why Mark as handled did not go through', () => {
    expect(handledErrorMessage('NOT_FOUND')).toContain('no longer yours');
    expect(handledErrorMessage('INVALID', 'the pull request is not open')).toContain('no longer open');
    expect(handledErrorMessage('INVALID', 'the pull request changed meanwhile: try again')).toContain(
      'changed just now',
    );
    expect(handledErrorMessage('INVALID', 'prId must match')).not.toContain('changed just now');
  });
});

describe('refusals, in plain words', () => {
  it.each([
    ['The pull request is not open', 'The pull request is no longer open'],
    ['A follow-up is already under way on this pull request', 'A follow-up is already running'],
    ['New sessions are paused on our side for now', 'New agent sessions are paused on our side'],
    ['Contributing is paused', 'Contributing is paused. Connect a working Claude key'],
    ['Your Claude key cannot start a session now', 'Your Claude key cannot start a session now: none is connected'],
    ['Your limits leave no room for another attempt now', 'Your spend limits leave no room'],
    ['The pull request has no branch of ours to add commits to', 'You opened this pull request yourself'],
    // The API's newer words: each still maps to its own, never an earlier pattern.
    ['The pull request is not open, so a run has nothing to add commits to', 'The pull request is no longer open'],
    [
      'You opened it by hand, so it has no branch of ours a run can add to: change it on GitHub',
      'You opened this pull request yourself',
    ],
    [
      'Contributing is paused: click Resume contributing on Overview or in Contribute settings (connect a working Claude key first if it asks), then start the run',
      'Contributing is paused. Connect a working Claude key',
    ],
    [
      'Your Claude key cannot start a session now (none connected, Anthropic refused it, or its credits ran out): connect a working key in Contribute settings, Keys and access, then start the run',
      'Your Claude key cannot start a session now',
    ],
    [
      'Your spend limits leave no room for another run now: raise them, or lower Each run, in Contribute settings, Budget and pacing, or wait until they reset',
      'Your spend limits leave no room',
    ],
    [
      "The repository's maintainers opted out of GitRanks Contribute (or do not accept AI-assisted changes): nothing more is sent there",
      "The repo's maintainers keep it out of GitRanks Contribute",
    ],
  ])('a follow-up refused as "%s"', (message, words) => {
    expect(followUpErrorMessage('INVALID', message)).toContain(words);
  });

  it('a follow-up refused with words this UI does not know keeps them, and a lost one says so', () => {
    expect(followUpErrorMessage('INVALID', 'Something new')).toBe('Something new');
    expect(followUpErrorMessage('NOT_FOUND')).toContain('no longer yours');
    expect(followUpErrorMessage('NOT_AVAILABLE_YET')).toBe('This is not available yet. It is coming soon.');
  });
});

describe('autopilot', () => {
  /** How autopilot works, as its dialog opens it on the Agent tab: the description and the record. */
  const howItWorks = (view: ContributeView) =>
    view.contributor
      ? renderToStaticMarkup(
          <>
            <AutopilotHowItWorks autopilot={view.contributor.autopilot} />
            <AutopilotRecord autopilot={view.contributor.autopilot} />
          </>,
        )
      : '';

  it('says it opens after launch month while it is not open, with the record', () => {
    const plain = text(howItWorks(views.autopilotComing));

    expect(plain).toContain(AUTOPILOT_LAUNCH_LINE);
    expect(plain).toContain('Merged through GitRanks 4');
    expect(plain).toContain('Still needed to unlock 1');
    expect(plain).toContain('Closed without merging in a row 1 of 2');
    expect(plain).toContain('4 of 5 merged PRs');
  });

  it('says every limit before it is on: when it submits, the hour, what it never does, follow-ups, GitHub, lock', () => {
    const plain = text(howItWorks(views.autopilotUnlocked));

    expect(plain).not.toContain(AUTOPILOT_LAUNCH_LINE);
    for (const heading of ['When it submits', 'An hour to stop it', 'What it never does', 'Follow-ups', 'On GitHub']) {
      expect(plain).toContain(heading);
    }
    expect(plain).toContain(
      'Submit on beginner issues (labels such as good first issue, first-timers-only, newcomers, easy)',
    );
    expect(plain).toContain("Submit on a repository whose maintainers don't allow autopilot");
    expect(plain).toContain('it may start up to 2 runs on that pull request, on your key');
    expect(plain).toContain("Opened by @you's autopilot, not reviewed by a human");
    expect(plain).toContain('It unlocks after 5 of your pull requests are merged through GitRanks. Two closed');
    expect(plain).toContain('Still needed to unlock none, unlocked');
  });

  it('asks before turning it on, in six lines that name the beginner issues', () => {
    const plain = text(renderToStaticMarkup(<AutopilotConfirmLines />));

    expect(AUTOPILOT_CONFIRM_LINES).toHaveLength(6);
    expect(plain).toContain("Never on beginner issues, or on repositories that don't allow autopilot");
    expect(plain).toContain('Up to 2 follow-up runs per pull request, on your key.');
  });

  it('says when it locked again, and says where the emails before each submission go', () => {
    expect(text(howItWorks(views.autopilotRelocked))).toContain(
      'Locked on Oct 20: two pull requests in a row were closed without merging.',
    );
    const mailed = {
      ...views.autopilotUnlocked,
      contributor: {
        ...views.autopilotUnlocked.contributor,
        autopilot: { ...views.autopilotUnlocked.contributor.autopilot, noticeTo: 'm•••@gmail.com' },
      },
    };
    expect(text(howItWorks(mailed))).toContain('Before each submission we email you at m•••@gmail.com.');
  });

  it('words the refusal to turn it on with no email', () => {
    expect(
      autopilotErrorMessage(
        'INVALID',
        'Autopilot emails you before each submission. Sign in again and share your GitHub email to turn it on',
      ),
    ).toContain('we have no email for you');
  });
});
