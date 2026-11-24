// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SkillsPrivacyGroup } from './skills-privacy-group';
import { skillsMine } from '@/lib/skills/__fixtures__/skills';
import type { SkillsMine } from '@/lib/skills/skills.types';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
const setHidden = vi.fn();

const draw = async (mine: SkillsMine | null | undefined) => {
  await act(async () => root.render(<SkillsPrivacyGroup login="octocat" mine={mine} setHidden={setHidden} />));
};
const button = (name: string) =>
  [...container.querySelectorAll('button')].find((element) => element.textContent === name);
const press = async (name: string) => {
  await act(async () => button(name)?.click());
};
const row = () => container.querySelector('[data-skills-privacy]');

beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  setHidden.mockReset();
});

describe('Settings\' "Your Skills page"', () => {
  it('links the page and offers Everyone or Only you, the choice made now pressed', async () => {
    await draw(skillsMine.publicLearner);
    expect(container.querySelector('#privacy')).not.toBeNull();
    expect(container.querySelector('a')?.getAttribute('href')).toBe('/profile/octocat/skills');
    expect(row()?.textContent).toContain('Everyone can see it.');
    expect(button('Everyone')?.getAttribute('aria-pressed')).toBe('true');
    expect(button('Only you')?.getAttribute('aria-pressed')).toBe('false');
  });

  it('hides the page, then shows the new choice', async () => {
    setHidden.mockResolvedValueOnce({ ok: true, mine: skillsMine.hiddenLearner });
    await draw(skillsMine.publicLearner);
    await press('Only you');
    expect(setHidden).toHaveBeenCalledWith(true);
    expect(row()?.textContent).toContain('Only you can see it.');
    expect(button('Only you')?.getAttribute('aria-pressed')).toBe('true');
  });

  it('does nothing on the choice already made', async () => {
    await draw(skillsMine.hiddenLearner);
    await press('Only you');
    expect(setHidden).not.toHaveBeenCalled();
  });

  it('says so when the change fails, keeping the choice as it was', async () => {
    setHidden.mockResolvedValueOnce({ ok: false, error: 'SIGNED_OUT' }).mockRejectedValueOnce(new Error('down'));
    await draw(skillsMine.hiddenLearner);
    await press('Everyone');
    expect(container.querySelector('[role="alert"]')?.textContent).toBe('Sign in again to change this.');
    await press('Everyone');
    expect(container.querySelector('[role="alert"]')?.textContent).toBe('That did not work. Try again.');
    expect(button('Only you')?.getAttribute('aria-pressed')).toBe('true');
  });

  it('offers no choice while nothing is on the page or only its owner may see it', async () => {
    await draw(skillsMine.new);
    expect(row()?.textContent).toContain('Nothing is on it yet.');
    expect(container.querySelector('button')).toBeNull();
    await draw(skillsMine.privateLearner);
    expect(container.querySelector('button')).toBeNull();
  });

  it('says who can see it could not be read when the view is missing', async () => {
    await draw(undefined);
    expect(row()?.getAttribute('data-skills-privacy')).toBe('unread');
    expect(row()?.textContent).toContain('Who can see it could not be read. Try again later.');
    expect(container.querySelector('button')).toBeNull();
  });
});
