import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { BLOCK_STATS, OWN_PICKS, TYPESCRIPT_PROFILE, VISITOR_PICKS } from '../__fixtures__/contribute-block';
import { ProfileContributeBlock } from './profile-contribute-block';

const text = (html: string) => html.replace(/<[^>]+>/g, '').replace(/&#x27;/g, "'");

describe('the Contribute block on a profile not connected (copy A)', () => {
  it("tells the owner what it is, the pool's true numbers, the steps and why, for them alone", () => {
    const html = renderToStaticMarkup(
      <ProfileContributeBlock audience="own" picks={OWN_PICKS} stats={BLOCK_STATS} language={TYPESCRIPT_PROFILE} />,
    );
    const plain = text(html);
    expect(plain).toContain('Open-source issues your agent can fix today');
    expect(plain).toContain('screened 78,611 active repositories and read 2.4 million of their issues');
    expect(plain).toContain('3,105 are ready for an AI agent today');
    expect(plain).toContain('Picked for your JavaScript / TypeScript, Go and Rust');
    expect(plain).toContain('Only you see this');
    expect(plain).toContain('Why: Your language: Go');
    expect(plain).toContain('Let my agent fix one');
    expect(plain).toContain('Contributor rank');
    expect(html.match(/data-issue=/g)).toHaveLength(3);
    expect(html).toContain('href="/contribute?start=agent"');
    expect(html).toContain('data-contribute-source="profile_visitor_block"');
    expect(plain).not.toContain('Is this your profile?');
  });

  it("never says 'for you' to a visitor: it names the profile's language, and offers the owner a sign-in", () => {
    const html = renderToStaticMarkup(
      <ProfileContributeBlock
        audience="visitor"
        picks={VISITOR_PICKS}
        stats={BLOCK_STATS}
        language={TYPESCRIPT_PROFILE}
        onSignIn={() => {}}
      />,
    );
    const plain = text(html);
    expect(plain).toContain('TypeScript issues an AI agent can fix today');
    expect(plain).toContain("today's best in TypeScript, the main language on this profile");
    expect(plain).toContain("Today's best in JavaScript / TypeScript");
    expect(plain).toContain('Fix one with your agent');
    expect(plain).toContain('Is this your profile? Sign in to see issues picked for you');
    expect(plain.replace('Sign in to see issues picked for you', '')).not.toMatch(/for you|your stack|Only you/);
  });

  it('words the pool without numbers when they could not be read', () => {
    const plain = text(
      renderToStaticMarkup(
        <ProfileContributeBlock audience="visitor" picks={VISITOR_PICKS} stats={null} language={TYPESCRIPT_PROFILE} />,
      ),
    );
    expect(plain).toContain('keeps the ones ready for an AI agent');
    expect(plain).not.toContain('million');
  });

  it('renders nothing without picks, or for a visitor of a profile with no pool language', () => {
    const none = <ProfileContributeBlock audience="own" picks={[]} stats={BLOCK_STATS} language={TYPESCRIPT_PROFILE} />;
    expect(renderToStaticMarkup(none)).toBe('');
    const noLanguage = (
      <ProfileContributeBlock audience="visitor" picks={VISITOR_PICKS} stats={BLOCK_STATS} language={null} />
    );
    expect(renderToStaticMarkup(noLanguage)).toBe('');
  });
});
