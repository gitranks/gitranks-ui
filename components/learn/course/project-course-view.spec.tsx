// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { CourseView, type CourseViewProps } from './course-view';
import { ProjectLanguage } from '@/components/learn/courses/course-card';
import { CoursesView } from '@/components/learn/courses/courses-view';
import {
  courseCards,
  djangoCourse,
  goCourse,
  kubernetesCourse,
  lessonList,
  otherCourses,
} from '@/lib/learn/__fixtures__/course';

const LONG_DASH = String.fromCodePoint(0x2014);
const calls = { onSignIn: () => {}, onRate: async () => true };

function draw(props: Partial<CourseViewProps> = {}) {
  const page = document.createElement('div');
  page.innerHTML = renderToStaticMarkup(
    <CourseView course={djangoCourse} mine={null} others={otherCourses} calls={calls} hints {...props} />,
  );
  return page;
}

const hrefOf = (page: Element, selector: string) => page.querySelector(selector)?.getAttribute('href') ?? null;

describe("a repository's course page", () => {
  const page = draw({ projectIssues: 9 });

  it('names its kind and its language, and links the project on GitHub, on GitRanks and its open issues', () => {
    expect(page.querySelector('h1')?.textContent).toBe('Django, from the inside');
    expect(page.textContent).toContain('Repository course');
    expect(page.textContent).toContain('Python');
    expect(hrefOf(page, '[data-project-link="github"]')).toBe('https://github.com/django/django');
    expect(page.querySelector('[data-project-link="github"]')?.getAttribute('target')).toBe('_blank');
    expect(hrefOf(page, '[data-project-link="gitranks"]')).toBe('/repo/django/django');
    expect(page.querySelector('[data-project-link="gitranks"]')?.textContent).toBe('Django on GitRanks');
    expect(hrefOf(page, '[data-project-link="issues"]')).toBe('/learn/issues?repo=django/django');
    expect(page.querySelector('[data-project-link="issues"]')?.textContent).toBe('9 open issues to fix');
  });

  it('says who wrote it and when it was last checked against the code', () => {
    expect(page.querySelector('[data-project-author]')?.textContent).toBe(
      'Written by GitRanks from the project’s docs and code. Not an official Django course. Last checked against the code on 12 Nov 2026.',
    );
  });

  it('leads "Fix a real issue" to the project’s issues', () => {
    expect(
      [...page.querySelectorAll('a')].some((a) => a.getAttribute('href') === '/learn/issues?repo=django/django'),
    ).toBe(true);
  });

  it('ends with the foot for its maintainers and its Markdown copy at its project’s address', () => {
    const foot = page.querySelector('[data-project-foot]');
    expect(foot?.textContent).toContain('Written by GitRanks, not by the project');
    expect(foot?.textContent).toContain(
      'Do you maintain Django? Tell us what to correct, or ask us to take this course down',
    );
    expect(foot?.querySelector('a[href="/learn/repos/django/django.md"]')).not.toBeNull();
    expect(foot?.querySelector('a[href="/contribute/maintainers#learn"]')).not.toBeNull();
    expect(page.textContent).not.toContain(LONG_DASH);
  });

  it('shows no count and no GitRanks link when there is none', () => {
    const project = djangoCourse.project ?? null;
    if (!project) throw new Error('the fixture names its project');
    const bare = draw({ course: { ...djangoCourse, project: { ...project, onGitranks: false } } });
    expect(bare.querySelector('[data-project-link="issues"]')).toBeNull();
    expect(bare.querySelector('[data-project-link="gitranks"]')).toBeNull();
    expect(bare.querySelector('[data-project-link="github"]')).not.toBeNull();
  });
});

describe("an organisation's course page", () => {
  const page = draw({ course: kubernetesCourse });

  it('says which repositories it covers, and names each group’s repository', () => {
    expect(page.textContent).toContain('Org course');
    expect(page.querySelector('[data-project-author]')?.textContent).toBe(
      'Written by GitRanks from the project’s docs and code. Not an official Kubernetes course. It covers 3 repositories: kubernetes, kubectl and website.',
    );
    expect(page.querySelector('[data-group-repo="kubernetes/kubernetes"]')?.textContent).toBe('kubernetes/kubernetes');
    expect(hrefOf(page, '[data-project-link="github"]')).toBe('https://github.com/kubernetes');
  });
});

describe('any other course', () => {
  it('has none of a project’s parts', () => {
    const page = draw({ course: goCourse });
    for (const part of ['[data-project-link]', '[data-project-author]', '[data-project-foot]', '[data-group-repo]']) {
      expect(page.querySelector(part), part).toBeNull();
    }
  });

  it('shows a project course’s language beside its name in the list, and nothing for another course', () => {
    expect(renderToStaticMarkup(<ProjectLanguage course={djangoCourse} />)).toContain('>Python<');
    expect(renderToStaticMarkup(<ProjectLanguage course={goCourse} />)).toBe('');
  });
});

describe('all courses with a project course', () => {
  it('adds the group "Projects, from the inside", each course at its project’s address with its language', () => {
    const page = document.createElement('div');
    page.innerHTML = renderToStaticMarkup(
      <CoursesView courses={[...courseCards, djangoCourse]} lessons={lessonList} mine={null} depths={null} hints />,
    );
    const sections = [...page.querySelectorAll('section h2')].map((h2) => h2.textContent);
    expect(sections).toEqual(['Topics, in any language', 'Languages', 'Projects, from the inside']);
    const card = page.querySelector('[data-course-card="django"]');
    expect(card?.closest('a')?.getAttribute('href') ?? card?.querySelector('a')?.getAttribute('href')).toBe(
      '/learn/repos/django/django',
    );
    expect(card?.textContent).toContain('Python');
  });
});
