import { describe, expect, it } from 'vitest';

import { filesAfter, projectPathsOf, staleLiveFilesOf } from './design-canvas-files.mjs';

const LISTING = `Published files of the canvas, 8 files by path:
- "SKILL.md"  text/markdown  17478 bytes
- "artifact-type/app.js"  text/javascript  4936944 bytes
- "project/canvas.json"  application/json  103875 bytes
- "project/current/gitranks.css"  text/css  171690 bytes
- "project/current/img/org--top-0.svg"  image/svg+xml  12588 bytes
- "project/current/org/org--top.dc.html"  text/html  56192 bytes
- "project/proposals/honest-stars/img/org-totals-0.svg"  image/svg+xml  12588 bytes
- "project/current/a b.dc.html"  text/html  10 bytes`;

describe('the canvas files', () => {
  it('reads the canvas own files from a listing, not the type files', () => {
    expect(projectPathsOf(LISTING)).toEqual([
      'project/canvas.json',
      'project/current/a b.dc.html',
      'project/current/gitranks.css',
      'project/current/img/org--top-0.svg',
      'project/current/org/org--top.dc.html',
      'project/proposals/honest-stars/img/org-totals-0.svg',
    ]);
    expect(projectPathsOf('- "project/a.svg"  x\n- "project/a.svg"  x')).toEqual(['project/a.svg']);
  });

  it('refuses a listing that holds fewer lines than its header says', () => {
    expect(() => projectPathsOf(LISTING.replace('8 files by path', '9 files by path'))).toThrow(/whole listing/);
  });

  it('removes live images and boards the publish no longer sends, and keeps proposals', () => {
    const publish = {
      'project/current/gitranks.css': 'project/current/gitranks.css',
      'project/current/org/org--top.dc.html': 'project/current/org/org--top.dc.html',
      'project/current/img/3f2a9c1b7d4e.svg': 'project/current/img/3f2a9c1b7d4e.svg',
    };
    expect(staleLiveFilesOf(projectPathsOf(LISTING), publish)).toEqual([
      'project/current/a b.dc.html',
      'project/current/img/org--top-0.svg',
    ]);
  });

  it('counts the canvas files after the publish', () => {
    const listed = projectPathsOf(LISTING);
    const publish = {
      'project/current/img/3f2a9c1b7d4e.svg': 'project/current/img/3f2a9c1b7d4e.svg',
      'project/current/gitranks.css': 'project/current/gitranks.css',
      'project/current/img/org--top-0.svg': null,
    };
    expect(filesAfter(listed, publish)).toBe(6);
  });
});
