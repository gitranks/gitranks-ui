import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { CONNECTED_ISSUES, NOT_CONNECTED_ISSUES } from '../__fixtures__/contribute-owner';
import { ProfileContributeBlock } from './profile-contribute-block';

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
    expect(html).toContain('href="/contribute?start=agent"');
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
    expect(html).toContain('href="/contribute/issues"');
    expect(plain).toContain('kunchenguid/gh-axi #195');
    expect(plain).toContain('A maintainer asked for this change');
  });

  it('renders nothing without issues', () => {
    expect(renderToStaticMarkup(<ProfileContributeBlock state="connected" issues={[]} />)).toBe('');
  });
});
