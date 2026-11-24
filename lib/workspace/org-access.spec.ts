import { describe, expect, it } from 'vitest';

import { GITHUB_APPS_URL, orgAccessOf } from './org-access';

describe('orgAccessOf', () => {
  it("links the app's own page, where each organization has a Request button", () => {
    expect(orgAccessOf('Ov23liAbc.1-x_2')).toEqual({
      url: 'https://github.com/settings/connections/applications/Ov23liAbc.1-x_2',
      app: true,
    });
  });

  it("falls back to the user's list of apps without an id, or with one that is not an id", () => {
    expect(orgAccessOf(undefined)).toEqual({ url: GITHUB_APPS_URL, app: false });
    expect(orgAccessOf('  ')).toEqual({ url: GITHUB_APPS_URL, app: false });
    expect(orgAccessOf('a/../b')).toEqual({ url: GITHUB_APPS_URL, app: false });
  });
});
