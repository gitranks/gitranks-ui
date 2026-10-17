import type { Session } from 'next-auth';
import { SessionProvider } from 'next-auth/react';
import { isValidElement, type ReactElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import type { StarsReviewReportState } from '../utils/stars-review';
import { StarsReviewReport, StarsReviewReportView } from './stars-review-report';

const { signIn } = vi.hoisted(() => ({ signIn: vi.fn() }));

vi.mock('next-auth/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next-auth/react')>()),
  signIn,
}));

const decode = (html: string) => html.replaceAll('&#x27;', "'");

/** The text of an element tree as written, including a closed dialog's content, which renders nothing. */
const textOf = (node: ReactNode): string => {
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(textOf).join('');
  }
  if (isValidElement(node)) {
    return textOf((node.props as { children?: ReactNode }).children);
  }
  return '';
};

const view = (state: StarsReviewReportState, onReport = vi.fn()) =>
  StarsReviewReportView({ view: state, login: 'octocat', onReport }) as ReactElement<{
    onClick?: () => void;
    disabled?: boolean;
  }> | null;

const render = (state: StarsReviewReportState) =>
  decode(renderToStaticMarkup(<StarsReviewReportView view={state} login="octocat" onReport={() => {}} />));

const session = (githubLogin: string): Session => ({
  user: { githubLogin, name: githubLogin },
  expires: '2099-01-01T00:00:00.000Z',
});

const renderReport = (value: Session | null | undefined, reportable = true) =>
  renderToStaticMarkup(
    <SessionProvider session={value}>
      <StarsReviewReport login="octocat" reportable={reportable} />
    </SessionProvider>,
  );

describe('StarsReviewReportView', () => {
  it('renders nothing when there is nothing to report', () => {
    expect(render({ kind: 'none' })).toBe('');
  });

  it('renders a disabled button while waiting', () => {
    const html = render({ kind: 'button', action: 'wait' });

    expect(html).toContain('This is a mistake');
    expect(html).toContain(' disabled=""');
  });

  it('sends a signed-out visitor to the sign-in flow, which brings them back to this page', () => {
    const button = view({ kind: 'button', action: 'signIn' });

    expect(render({ kind: 'button', action: 'signIn' })).not.toContain(' disabled=""');
    button?.props.onClick?.();
    expect(signIn).toHaveBeenCalledWith('github');
  });

  it('tells another account to sign in as the owner', () => {
    const dialog = view({ kind: 'button', action: 'switchAccount' });

    expect(render({ kind: 'button', action: 'switchAccount' })).toContain('aria-haspopup="dialog"');
    expect(textOf(dialog)).toContain('To report this, sign in as @octocat.');
  });

  it('sends the owner report', () => {
    const onReport = vi.fn();
    const button = view({ kind: 'button', action: 'report' }, onReport);

    expect(button?.props.disabled).toBe(false);
    button?.props.onClick?.();
    expect(onReport).toHaveBeenCalledTimes(1);
  });

  it('shows the owner the date of their request, with no button', () => {
    const html = render({ kind: 'submitted', submittedAt: '2026-10-17T09:30:00.000Z' });

    expect(html).toBe('<p>Your request was submitted on 17 Oct 2026.</p>');
  });

  it('shows the owner the date their request was declined, with no button', () => {
    const html = render({ kind: 'declined', decidedAt: '2026-10-18T12:00:00.000Z' });

    expect(html).toBe('<p>Your request was reviewed and declined on 18 Oct 2026.</p>');
  });
});

describe('StarsReviewReport', () => {
  it('renders the button disabled until the session is known, as in the cached page', () => {
    expect(renderReport(undefined)).toContain(' disabled=""');
  });

  it('offers the button to a signed-out visitor', () => {
    const html = renderReport(null);

    expect(html).toContain('This is a mistake');
    expect(html).not.toContain(' disabled=""');
  });

  it('offers another account the dialog', () => {
    expect(renderReport(session('someone'))).toContain('aria-haspopup="dialog"');
  });

  it('keeps the button disabled for the owner until their state arrives', () => {
    const html = renderReport(session('OctoCat'));

    expect(html).toContain(' disabled=""');
    expect(html).not.toContain('aria-haspopup');
  });

  it('shows no button to anyone when the review is not reportable', () => {
    for (const value of [undefined, null, session('someone')]) {
      expect(renderReport(value, false)).toBe('');
    }
  });
});
