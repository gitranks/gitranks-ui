import { describe, expect, it } from 'vitest';

import { emailHintOf, emailSettingsInputOf, keepLabelOf, needsYouLineOf, withoutEmailHint } from './email-settings';

describe('the Email rows’ words and inputs', () => {
  it('reads the switch hint of an email link, and nothing else', () => {
    expect(emailHintOf('daily')).toBe('ONCE_A_DAY');
    expect(emailHintOf('after-30')).toBe('AFTER_30_MINUTES');
    expect(emailHintOf(['daily', 'after-30'])).toBe('ONCE_A_DAY');
    expect(emailHintOf('off')).toBeNull();
    expect(emailHintOf(undefined)).toBeNull();
  });

  it('takes the hint out of the address and lands on the Email group, keeping the rest', () => {
    expect(withoutEmailHint('https://gitranks.com/my/settings?email=daily#email')).toBe('/my/settings#email');
    expect(withoutEmailHint('/my/settings?utm_source=email&email=after-30')).toBe(
      '/my/settings?utm_source=email#email',
    );
  });

  it('says each choice in a line, the summary with its zone', () => {
    expect(needsYouLineOf('ONCE_A_DAY', 'Europe/Warsaw')).toBe(
      'One summary at 8:00 in the morning, Europe/Warsaw time, while something waits.',
    );
    expect(needsYouLineOf('OFF', 'UTC')).toBe('No email when something needs you. It still shows under Pull requests.');
    expect(keepLabelOf('ONCE_A_DAY')).toBe('Keep once a day');
  });

  it('keeps only the fields given and well-formed', () => {
    expect(emailSettingsInputOf({ needsYou: 'OFF', ended: true, timeZone: ' Asia/Tokyo ' })).toEqual({
      needsYou: 'OFF',
      ended: true,
      timeZone: 'Asia/Tokyo',
    });
    expect(emailSettingsInputOf({ needsYou: 'toString' as never, timeZone: '   ' })).toEqual({});
    expect(emailSettingsInputOf({ timeZone: 'x'.repeat(65) })).toEqual({});
    expect(emailSettingsInputOf(null as never)).toEqual({});
  });
});
