import { describe, expect, it } from 'vitest';

import {
  emailHintOf,
  emailSettingsInputOf,
  keepLabelOf,
  NEEDS_YOU_COVERS,
  needsYouLineOf,
  withoutEmailHint,
  zoneCityOf,
} from './email-settings';

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

  it('says what the row covers, then what each choice sends, the summary with its city', () => {
    expect(NEEDS_YOU_COVERS).toBe(
      'A fix to approve, a change or a comment from a maintainer, or a step only you can do.',
    );
    expect(needsYouLineOf('AFTER_30_MINUTES', 'Europe/Warsaw')).toBe(NEEDS_YOU_COVERS);
    expect(needsYouLineOf('ONCE_A_DAY', 'Europe/Warsaw')).toBe(
      `${NEEDS_YOU_COVERS} One summary a day at 8:00 in the morning, Warsaw time, while something waits.`,
    );
    expect(needsYouLineOf('OFF', 'UTC')).toBe(
      `${NEEDS_YOU_COVERS} No email for these: they still show under Pull requests.`,
    );
    expect(keepLabelOf('ONCE_A_DAY')).toBe('Keep once a day');
  });

  it('leaves the zone to the Time zone row where there is one', () => {
    expect(needsYouLineOf('ONCE_A_DAY', null)).toBe(
      `${NEEDS_YOU_COVERS} One summary a day at 8:00 in the morning, while something waits.`,
    );
  });

  it('names a zone by its city', () => {
    expect(zoneCityOf('America/New_York')).toBe('New York');
    expect(zoneCityOf('America/Argentina/Buenos_Aires')).toBe('Buenos Aires');
    expect(zoneCityOf('UTC')).toBe('UTC');
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
