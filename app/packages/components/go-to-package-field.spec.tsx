// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GoToPackageField } from './go-to-package-field';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

let container: HTMLDivElement;
let root: Root;

const submit = async (value: string) => {
  const input = container.querySelector('input') as HTMLInputElement;
  await act(async () => {
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    setValue?.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await act(async () => {
    container.querySelector('form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });
};

describe('GoToPackageField', () => {
  beforeEach(async () => {
    push.mockReset();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    await act(async () => root.render(<GoToPackageField />));
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("opens a package's page, a scoped name as it is", async () => {
    await submit(' @orbit/fetch ');

    expect(push).toHaveBeenCalledWith('/package/npm/@orbit/fetch');
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });

  it('refuses a name npm never takes with a line read out to screen readers, and opens nothing', async () => {
    await submit('.env');

    const alert = container.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain('That is not an npm package name.');
    expect(container.querySelector('input')?.getAttribute('aria-invalid')).toBe('true');
    expect(container.querySelector('input')?.getAttribute('aria-describedby')).toBe(alert?.id);
    expect(push).not.toHaveBeenCalled();
  });
});
