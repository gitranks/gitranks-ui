import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { FollowSlot } from './follow-slot';

describe('FollowSlot', () => {
  it('draws nothing yet, wherever it is placed', () => {
    for (const placement of ['package-page', 'used-by', 'used-by-empty'] as const) {
      const markup = renderToStaticMarkup(
        <FollowSlot packages={[{ registry: 'npm', name: '@nebula/ui' }]} label="@nebula/ui" placement={placement} />,
      );
      expect(markup).toBe('');
    }
  });
});
