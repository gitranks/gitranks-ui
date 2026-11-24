import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { LessonArticle } from '@/components/learn/lesson/lesson-article';
import { setLesson } from '@/lib/learn/__fixtures__/lesson-page';

const source = {
  repo: 'django/django',
  path: 'django/core/handlers/base.py',
  commit: 'abc123',
  firstLine: 138,
  lastLine: 139,
  at: '2026-11-12',
};
const code = { language: 'python', code: 'def get_response(self, request):\n    pass', lines: [] };
const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

describe("a lesson's quote of a project's code", () => {
  it('links the file and its lines to that exact version, with the line on the pinned version and no tabs', () => {
    const html = renderToStaticMarkup(
      <LessonArticle
        lesson={{ ...setLesson, body: 'Read it.\n\n[[example: main]]' }}
        examples={[{ name: 'main', codes: [code, { ...code, language: 'go' }], source, project: 'Django' }]}
        mainLanguage="go"
      />,
    );
    expect(html).toContain('data-block="quote"');
    expect(html).not.toContain('data-block="example"');
    expect(html).not.toContain('role="tab"');
    expect(html).toContain(
      'href="https://github.com/django/django/blob/abc123/django/core/handlers/base.py#L138-L139"',
    );
    expect(text(html)).toContain('django/core/handlers/base.py, lines 138 to 139');
    expect(text(html)).toContain(
      'Django’s own code, as it was on 12 Nov 2026. The link opens this exact version on GitHub, so it still matches the lesson after the project changes the file.',
    );
  });

  it('names the repository when the project is not known, and leaves an example of ours as an example', () => {
    const quoted = renderToStaticMarkup(
      <LessonArticle
        lesson={{ ...setLesson, body: '[[example: main]]' }}
        examples={[{ name: 'main', codes: [code], source, project: null }]}
      />,
    );
    expect(text(quoted)).toContain('django/django’s own code');
    const ours = renderToStaticMarkup(
      <LessonArticle
        lesson={{ ...setLesson, body: '[[example: main]]' }}
        examples={[{ name: 'main', codes: [code] }]}
      />,
    );
    expect(ours).toContain('data-block="example"');
    expect(ours).not.toContain('data-block="quote"');
  });
});
