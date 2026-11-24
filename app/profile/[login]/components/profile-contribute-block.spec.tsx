import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }) }));
vi.mock('@/lib/workspace/masked-issue.actions', () => ({
  lookAtIssue: vi.fn(),
  signInToSeeIssue: vi.fn(),
  skipMaskedIssue: vi.fn(),
}));

import { CONNECTED_ISSUES, NOT_CONNECTED_ISSUES } from '../__fixtures__/contribute-owner';
import { ProfileContributeBlock } from './profile-contribute-block';
import { maskedIssue } from '@/lib/workspace/__fixtures__/masked-issue';

const text = (html: string) => html.replace(/<[^>]+>/g, '').replace(/&#x27;/g, "'");

describe("the Contribute block on the owner's own profile", () => {
  it('before they connect: what it is, the ready count, and the way to connect their agent', () => {
    const html = renderToStaticMarkup(
      <ProfileContributeBlock
        state="not_connected"
        issues={NOT_CONNECTED_ISSUES}
        readyIssues={3105}
        matchedTo="TypeScript and JavaScript"
      />,
    );
    const plain = text(html);
    expect(plain).toContain('GitRanks Contribute · Only you see this');
    expect(plain).toContain('Issues for you to fix');
    expect(plain).toContain('Picked for your TypeScript and JavaScript from 3,105 open-source issues ready');
    expect(plain).toContain('Connect my agent');
    expect(html).toContain('href="/contribute/start/agent/own?from=profile"');
    expect(html).toContain('data-contribute-source="profile_issues_block"');
    expect(html.match(/data-issue=/g)).toHaveLength(3);
    expect(html).toContain('background-color:#3178c6');
    expect(plain).toContain('TypeScript');
    expect(plain).not.toMatch(/Size [SML]/);
  });

  it('once connected: their own picks, best first, and the way to all of them', () => {
    const html = renderToStaticMarkup(<ProfileContributeBlock state="connected" issues={CONNECTED_ISSUES} />);
    const plain = text(html);
    expect(plain).toContain('Picked for you, best first');
    expect(plain).toContain('All my issues');
    expect(html).toContain('href="/contribute#issues"');
    expect(plain).toContain('kunchenguid/gh-axi #195');
    expect(plain).toContain('A maintainer asked for this change');
  });

  it('shows a masked pick as its masked row, with the foot under the rows, and names nothing of it', () => {
    const masked = { ...maskedIssue(), title: 'Tags show twice' };
    const issues = [{ ...CONNECTED_ISSUES[0], repo: 'hidden-org/hidden-repo', masked }, ...CONNECTED_ISSUES.slice(1)];
    const html = renderToStaticMarkup(<ProfileContributeBlock state="connected" issues={issues} />);
    const plain = text(html);
    expect(html).toContain('data-masked-row="q7k2m9xa"');
    expect(plain).toContain('Tags show twice');
    expect(plain).toContain('See the full issue');
    expect(plain).not.toContain('hidden-org/hidden-repo');
    expect(html.match(/data-issue=/g)).toHaveLength(CONNECTED_ISSUES.slice(1, 3).length);
    expect(html).toContain('data-masked-foot');
    expect(plain).toContain('Why do we hide issue details?');
    // The profile's foot says no day: the block is not a list of the day's issues.
    expect(html).not.toContain('data-looks-line');
  });

  it("is today's block, with no foot, when no pick is masked", () => {
    const html = renderToStaticMarkup(<ProfileContributeBlock state="connected" issues={CONNECTED_ISSUES} />);
    expect(html).not.toContain('data-masked-row');
    expect(html).not.toContain('data-masked-foot');
  });

  it('renders nothing without issues', () => {
    expect(renderToStaticMarkup(<ProfileContributeBlock state="connected" issues={[]} />)).toBe('');
  });
});
