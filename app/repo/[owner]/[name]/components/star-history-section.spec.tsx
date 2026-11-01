import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { youngRepo } from '../__fixtures__/repo';
import { StarHistorySection } from './star-history-section';

// The caption: the paragraph that names the current count's date.
const caption = (html: string) => html.match(/<p>((?:(?!<p>).)*? on Oct 27, 2026\.[^<]*)<\/p>/)?.[1] ?? '';
const text = (html: string) => html.replace(/<[^>]+>/g, '');

describe('StarHistorySection', () => {
  it('captions the plain count while every star counts', () => {
    const html = renderToStaticMarkup(<StarHistorySection repo={{ ...youngRepo, starsCheck: null }} />);

    expect(caption(html)).toBe('13 stars on Oct 27, 2026.');
  });

  it("strikes GitHub's count through before the honest one in the caption", () => {
    const html = caption(renderToStaticMarkup(<StarHistorySection repo={youngRepo} />));

    expect(html).toMatch(
      /<s [^>]*>.*219.*<\/s><span class="font-mono tabular-nums">13<\/span><\/span> stars<\/button> on Oct 27, 2026\./,
    );
    expect(text(html)).not.toContain('bought');
  });

  it('keeps the notes after the count', () => {
    const html = renderToStaticMarkup(
      <StarHistorySection
        repo={{ ...youngRepo, history: youngRepo.history && { ...youngRepo.history, complete: false } }}
      />,
    );

    expect(text(html)).toContain('on Oct 27, 2026. The earliest months are estimates.');
  });
});
