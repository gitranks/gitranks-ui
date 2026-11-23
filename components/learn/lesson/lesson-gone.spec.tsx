// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { hint } = vi.hoisted(() => ({ hint: { present: false } }));
// The session's hint cookie, as the browser holds it.
vi.mock('@/lib/session-hint', () => ({ hasSessionHint: () => hint.present }));

import { LessonGoneView } from './lesson-gone';
import { LessonGoneLearner } from './lesson-gone-learner';
import { goneLearnerMine, pausedAddress } from '@/lib/learn/__fixtures__/lesson-gone';
import { lessonGoneTextOf } from '@/lib/learn/lesson-gone';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("a paused or removed lesson's page", () => {
  it('says what the address was, its state, one sentence, and leads to the course', () => {
    const html = renderToStaticMarkup(
      <LessonGoneView state="PAUSED" text={lessonGoneTextOf('PAUSED', pausedAddress)} course={pausedAddress.course} />,
    );
    const page = document.createElement('div');
    page.innerHTML = html;
    expect(page.querySelectorAll('h1')).toHaveLength(1);
    expect(page.querySelector('h1')!.textContent).toBe('This lesson is paused');
    expect(page.textContent).toContain('GitRanks Learn · A lesson');
    expect(page.querySelector('a')!.getAttribute('href')).toBe('/learn/courses/algorithms');
    expect(page.querySelector('a')!.textContent).toBe('Open the course');
    expect(page.querySelector('[data-lesson-gone-learner]')).toBeNull();
  });

  it('offers no way on when the course is not known', () => {
    const html = renderToStaticMarkup(
      <LessonGoneView
        state="REMOVED"
        text={lessonGoneTextOf('REMOVED', { title: null, course: null })}
        course={null}
      />,
    );
    expect(html).not.toContain('<a');
  });
});

describe("the learner's line", () => {
  let root: Root;
  let host: HTMLDivElement;
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
  });

  afterEach(() => {
    act(() => root.unmount());
    host.remove();
    hint.present = false;
    vi.unstubAllGlobals();
  });

  const draw = (state: 'PAUSED' | 'REMOVED') =>
    act(async () => {
      root.render(<LessonGoneLearner slug="sets" state={state} />);
    });

  it('asks for nothing without a session, and shows no box', async () => {
    await draw('PAUSED');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(host.innerHTML).toBe('');
  });

  it("shows a learner's line, with the learned square on a paused lesson only", async () => {
    hint.present = true;
    fetchMock.mockImplementation(async () => new Response(JSON.stringify({ mine: goneLearnerMine })));
    await draw('PAUSED');
    expect(fetchMock).toHaveBeenCalledWith('/api/me/learn/lessons/sets', { cache: 'no-store' });
    const box = host.querySelector('[data-lesson-gone-learner]')!;
    expect(box.textContent).toMatch(/^You learned it on 1[45] Nov\. That stays\./);
    expect(box.querySelector('[aria-hidden]')).not.toBeNull();
    await draw('REMOVED');
    expect(host.querySelector('[data-lesson-gone-learner]')!.textContent).toMatch(/It no longer counts in the course/);
    expect(host.querySelector('[data-lesson-gone-learner] [aria-hidden]')).toBeNull();
  });

  it('shows no box to a person who did not learn it, or whose side cannot be read', async () => {
    hint.present = true;
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ mine: { ...goneLearnerMine, depth: 'NONE' } })));
    await draw('PAUSED');
    expect(host.innerHTML).toBe('');
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 500 }));
    await draw('REMOVED');
    expect(host.innerHTML).toBe('');
  });
});
