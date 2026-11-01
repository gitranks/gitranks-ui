import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { builtBy, siblings } from '../__fixtures__/repo';
import { WhoBuildsItCard } from './who-builds-it-card';

vi.mock('next/image', () => ({ default: (props: { alt: string }) => <img alt={props.alt} /> }));

describe('WhoBuildsItCard', () => {
  it('opens on Siblings with a toggle when both views exist', () => {
    const html = renderToStaticMarkup(
      <WhoBuildsItCard nameWithOwner="react/react" stars={250_000} siblings={siblings} builtBy={builtBy} />,
    );

    expect(html).toContain('Who builds it');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toMatch(/A third of the people building react also commit to/);
    expect(html).toContain('href="/repo/vercel/next.js"');
  });

  it('shows Built by alone, without a toggle, under 3 siblings', () => {
    const html = renderToStaticMarkup(
      <WhoBuildsItCard nameWithOwner="react/react" stars={250_000} siblings={siblings.slice(0, 2)} builtBy={builtBy} />,
    );

    expect(html).not.toContain('aria-pressed');
    expect(html).toContain('2 Legends and 10 Experts');
    expect(html).toContain('+11 more');
  });

  it('says the data is not read yet for a repository with analytics, and renders nothing for a smaller one', () => {
    expect(
      renderToStaticMarkup(<WhoBuildsItCard nameWithOwner="a/b" stars={1_500} siblings={[]} builtBy={null} />),
    ).toContain('read who builds this repository yet');
    expect(renderToStaticMarkup(<WhoBuildsItCard nameWithOwner="a/b" stars={50} siblings={[]} builtBy={null} />)).toBe(
      '',
    );
  });

  it('names each top developer’s tier for screen readers', () => {
    const html = renderToStaticMarkup(
      <WhoBuildsItCard nameWithOwner="react/react" stars={250_000} siblings={[]} builtBy={builtBy} />,
    );

    expect(html).toContain('alt="ana, Legend 5"');
  });
});
