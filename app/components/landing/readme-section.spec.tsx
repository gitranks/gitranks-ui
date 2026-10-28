import type { Session } from 'next-auth';
import { SessionProvider } from 'next-auth/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { readmeContent } from './readme-badges';
import { ReadmeSection } from './readme-section';
import type { ReadmeShowcase } from './readme-showcase';
import { NOW, orgBig, repoBig, userBig } from '@/badge/v3/fixtures';

const showcase: ReadmeShowcase = {
  user: readmeContent(userBig, 'find', NOW),
  repo: readmeContent(repoBig, 'find', NOW),
  org: readmeContent(orgBig, 'find', NOW),
};

const session = (githubLogin: string): Session => ({
  user: { githubLogin, name: githubLogin },
  expires: '2099-01-01T00:00:00.000Z',
});

const render = (value: Session | null, content: ReadmeShowcase = showcase) =>
  renderToStaticMarkup(
    <SessionProvider session={value}>
      <ReadmeSection showcase={content} />
    </SessionProvider>,
  ).replaceAll('&amp;', '&');

describe('ReadmeSection', () => {
  it("shows today's #1 developer to a signed-out visitor, and the builder's first step", () => {
    const html = render(null);

    expect(html).toContain('Put your rank on your README');
    expect(html).toContain(`/badge/user/${userBig.login}/rank.svg?theme=light`);
    expect(html).toContain(`/badge/user/${userBig.login}/rank.svg?theme=dark`);
    expect(html).toContain(`/badge/user/${userBig.login}/profile-card.svg?theme=light`);
    expect(html).toContain(`alt="${userBig.login} on GitRanks: stars rank #13`);
    expect(html).toMatch(/<a [^>]*href="\/badge\/builder"[^>]*>Get your badge<\/a>/);
    expect(html).toContain('href="/badge/gallery"');
    expect(html).toContain('Find yourself');
    expect(html).toContain('Pick a badge');
    expect(html).toContain('Copy and paste');
  });

  it('marks every builder link nofollow', () => {
    const links = render(null).match(/<a [^>]*href="\/badge\/builder[^"]*"[^>]*>/g) ?? [];

    expect(links.length).toBeGreaterThan(1);
    for (const link of links) expect(link).toContain('rel="nofollow"');
  });

  it('offers the three kinds, Organization shortened on a phone', () => {
    const html = render(null);

    expect(html).toContain('>Developer</button>');
    expect(html).toContain('>Repository</button>');
    expect(html).toMatch(/aria-label="Organization"[^>]*><span class="sm:hidden">Org<\/span>/);
  });

  it("opens step 2 with a signed-in visitor's profile, and waits for their own badges", () => {
    const html = render(session('octo-dev'));

    expect(html).toMatch(/<a [^>]*href="\/badge\/builder\?user=octo-dev"[^>]*>Get your badge<\/a>/);
    expect(html).toContain('Loading your badges');
    expect(html).not.toContain(`/badge/user/${userBig.login}/rank.svg`);
  });

  it('leaves out a kind whose #1 could not be read', () => {
    const html = render(null, { ...showcase, org: null });

    expect(html).not.toContain('Organization');
    expect(html).toContain('>Repository</button>');
  });
});
