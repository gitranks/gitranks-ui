import { describe, expect, it } from 'vitest';

import { serializeJsonLd } from './json-ld';

describe('serializeJsonLd', () => {
  it('cannot close the script tag and still parses back unchanged', () => {
    const payload = { '@type': 'Person', name: '</script><script>alert(1)</script>' };
    const serialized = serializeJsonLd(payload);

    expect(serialized).not.toContain('<');
    expect(serialized).toContain('\\u003c/script>');
    expect(JSON.parse(serialized)).toEqual(payload);
  });
});
