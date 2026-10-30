import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const actions = vi.hoisted(() => ({ noteProviderInterest: vi.fn(), withdrawProviderInterest: vi.fn() }));
const { toast } = vi.hoisted(() => ({ toast: { error: vi.fn() } }));
vi.mock('../actions', () => actions);
vi.mock('sonner', () => ({ toast }));
vi.mock('next-auth/react', () => ({ signIn: vi.fn() }));

const { ComingSoon, PROVIDER_ICONS, comingSoonNoteOf, comingSoonStatusOf, flipInterest, withInterest } = await import(
  './coming-soon'
);
const { COMING_SOON } = await import('@/lib/contribute/format');

import type { ContributeComingSoonProvider } from '@/lib/contribute/contribute.types';

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&#x27;', "'")
    .replaceAll('&quot;', '"')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' ');

const count = (html: string, needle: string) => html.split(needle).length - 1;

const DIALOG_TRIGGER = 'aria-haspopup="dialog"';

describe('the coming-soon cards', () => {
  it('are the eight of the design, in its order, with their kinds, initials and lines', () => {
    expect(COMING_SOON.map(({ provider }) => provider)).toEqual([
      'CHATGPT',
      'COPILOT',
      'GEMINI',
      'CURSOR',
      'JULES',
      'OPENAI',
      'XAI',
      'OPENROUTER',
    ]);
    expect(COMING_SOON.map(({ kind }) => kind)).toEqual([
      'Plan',
      'Plan',
      'Plan',
      'Cloud agent',
      'Cloud agent',
      'API key',
      'API key',
      'API key',
    ]);
    expect(COMING_SOON.map(({ mono }) => mono)).toEqual(['CG', 'GC', 'GE', 'CU', 'JU', 'OA', 'XG', 'OR']);

    const plain = text(renderToStaticMarkup(<ComingSoon viewer="signed-in" />));
    const at = COMING_SOON.map(({ title, text: line }) => {
      expect(plain).toContain(line);
      return plain.indexOf(title);
    });
    expect(at.every((index) => index >= 0)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
  });

  it('show each provider its mark, and OpenRouter, which has none, its initials', () => {
    expect(COMING_SOON.filter(({ provider }) => !PROVIDER_ICONS[provider]).map(({ provider }) => provider)).toEqual([
      'OPENROUTER',
    ]);
    const html = renderToStaticMarkup(<ComingSoon viewer="signed-in" />);
    expect(html.match(/<svg[^>]*class="[^"]*size-\[18px\]/g)).toHaveLength(7);
    expect(html).toMatch(/data-provider="OPENROUTER".*?>OR<\/span>/);
    expect(html).not.toMatch(/>(CG|GC|GE|CU|JU|OA|XG)<\/span>/);
  });

  it('says what is coming and that the most asked for comes first', () => {
    const plain = text(renderToStaticMarkup(<ComingSoon viewer="signed-in" />));

    expect(plain).toContain('Coming soon');
    expect(plain).toContain('More ways to spend credits you already have');
    expect(plain).toContain('we count every request, and the most asked for comes first');
    expect(plain).toContain("We'll email you once, when it opens");
  });

  it("opens the sign-in from every one of a visitor's buttons, with nothing noted", () => {
    const html = renderToStaticMarkup(<ComingSoon viewer="visitor" noted={['COPILOT']} />);
    const plain = text(html);

    expect(count(html, DIALOG_TRIGGER)).toBe(8);
    expect(html).not.toContain('aria-pressed');
    expect(html).toContain('aria-label="Notify me when Gemini opens"');
    expect(count(plain, 'Notify me')).toBe(8);
    expect(plain).not.toContain('On the list');
    expect(plain).toContain('Sign in with GitHub to be told when one opens');
    expect(html).toMatch(/<p role="status"[^>]*><\/p>/);
  });

  it.each(['signed-in', 'mid-setup'] as const)(
    "gives a %s user a toggle on every card, those on the user's list pressed",
    (viewer) => {
      const html = renderToStaticMarkup(<ComingSoon viewer={viewer} noted={['COPILOT']} />);

      expect(html).not.toContain(DIALOG_TRIGGER);
      expect(count(html, 'aria-pressed="false"')).toBe(7);
      expect(count(html, 'aria-pressed="true"')).toBe(1);
      expect(html).toMatch(
        /data-provider="COPILOT".*?aria-pressed="true" aria-label="Notify me when GitHub Copilot opens"[^>]*>.*?On the list<\/button>/,
      );
      expect(html).toContain('aria-label="Notify me when ChatGPT plan opens"');
      expect(text(html)).toContain("You're on the list for GitHub Copilot. We'll email you once, when it opens.");
    },
  );

  it('keeps every animation behind motion-safe', () => {
    const html = renderToStaticMarkup(<ComingSoon viewer="signed-in" noted={['COPILOT']} />);
    const classes = [...html.matchAll(/class="([^"]*)"/g)].flatMap(([, list]) => list.split(' '));

    expect(classes).toContain('motion-safe:animate-in');
    expect(classes).toContain('motion-safe:animate-contribute-pop');
    expect(classes.filter((name) => /(^|:)(animate-|transition|delay-|duration-)/.test(name))).toEqual(
      classes.filter(
        (name) => /(^|:)(animate-|transition|delay-|duration-)/.test(name) && name.startsWith('motion-safe:'),
      ),
    );
  });
});

describe('the status line', () => {
  const of = (...providers: ContributeComingSoonProvider[]) => comingSoonStatusOf(new Set(providers));

  it('names the one provider noted, counts several, and says nothing for none', () => {
    expect(of()).toBe('');
    expect(of('JULES')).toBe("You're on the list for Jules. We'll email you once, when it opens.");
    expect(of('JULES', 'XAI', 'GEMINI')).toBe(
      "You're on the list for 3 of these. We'll email you once, when each one opens.",
    );
  });

  it('counts only the cards shown', () => {
    expect(of('MISTRAL')).toBe('');
    expect(of('MISTRAL', 'XAI')).toBe("You're on the list for xAI Grok. We'll email you once, when it opens.");
  });

  it("asks a visitor to sign in, and tells a user they're emailed once", () => {
    expect(comingSoonNoteOf('visitor')).toBe('Sign in with GitHub to be told when one opens');
    expect(comingSoonNoteOf('signed-in')).toBe("We'll email you once, when it opens");
    expect(comingSoonNoteOf('mid-setup')).toBe("We'll email you once, when it opens");
  });
});

describe('a press of "Notify me"', () => {
  let noted: ReadonlySet<ContributeComingSoonProvider>;
  const update = (change: (current: typeof noted) => typeof noted) => {
    noted = change(noted);
  };

  beforeEach(() => {
    noted = new Set(['COPILOT']);
    actions.noteProviderInterest.mockReset();
    actions.withdrawProviderInterest.mockReset();
    toast.error.mockReset();
  });

  it('puts the provider on the list at once, and keeps it once the API takes it', async () => {
    let answer: (value: unknown) => void = () => {};
    actions.noteProviderInterest.mockReturnValue(new Promise((resolve) => (answer = resolve)));

    const done = flipInterest('GEMINI', true, update);
    expect(noted.has('GEMINI')).toBe(true);
    answer({ ok: true, data: true });

    expect(await done).toBe(true);
    expect(actions.noteProviderInterest).toHaveBeenCalledWith('GEMINI');
    expect(actions.withdrawProviderInterest).not.toHaveBeenCalled();
    expect([...noted].sort()).toEqual(['COPILOT', 'GEMINI']);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('takes it off with the withdrawal', async () => {
    actions.withdrawProviderInterest.mockResolvedValue({ ok: true, data: true });

    expect(await flipInterest('COPILOT', false, update)).toBe(true);
    expect(actions.withdrawProviderInterest).toHaveBeenCalledWith('COPILOT');
    expect(noted.size).toBe(0);
  });

  it('rolls back and says why when the call fails', async () => {
    actions.noteProviderInterest.mockResolvedValue({ ok: false, error: 'FAILED' });
    expect(await flipInterest('XAI', true, update)).toBe(false);
    expect([...noted]).toEqual(['COPILOT']);
    expect(toast.error).toHaveBeenLastCalledWith('Something went wrong. Try again in a minute.');

    actions.withdrawProviderInterest.mockResolvedValue({ ok: false, error: 'NOT_AVAILABLE_YET' });
    expect(await flipInterest('COPILOT', false, update)).toBe(false);
    expect([...noted]).toEqual(['COPILOT']);
    expect(toast.error).toHaveBeenLastCalledWith('This is not available yet. It is coming soon.');
  });

  it('rolls back and says why when the call never answers', async () => {
    actions.noteProviderInterest.mockRejectedValue(new TypeError('Failed to fetch'));
    expect(await flipInterest('XAI', true, update)).toBe(false);
    expect([...noted]).toEqual(['COPILOT']);
    expect(toast.error).toHaveBeenLastCalledWith('Something went wrong. Try again in a minute.');
  });

  it("rolls back only the card that failed, not another's change made meanwhile", async () => {
    let answer: (value: unknown) => void = () => {};
    actions.noteProviderInterest.mockReturnValue(new Promise((resolve) => (answer = resolve)));

    const done = flipInterest('XAI', true, update);
    update((current) => withInterest(current, 'JULES', true));
    answer({ ok: false, error: 'FAILED' });
    await done;

    expect([...noted].sort()).toEqual(['COPILOT', 'JULES']);
  });
});
