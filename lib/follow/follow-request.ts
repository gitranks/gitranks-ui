import {
  FOLLOW_CHANNELS,
  FOLLOW_EVENTS,
  FOLLOW_PACKAGES_MAX,
  type FollowChangeBody,
  type FollowChannel,
  type FollowEvents,
  type FollowPackage,
  type FollowStartBody,
} from './follow.types';
import { isNpmPackageName } from '@/lib/packages/npm-package-name';

// What the follow routes take from the browser, checked before anything is asked: a body of another shape is refused
// whole. Who is asking is never read from a body: the route reads it from the session.

/** The longest email address taken. */
export const EMAIL_MAX_LENGTH = 254;

/** An address's shape, as the dialog checks it before sending; the final word on an address is not the site's. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** A follow's id as the API answers it. */
const FOLLOW_ID = /^[A-Za-z0-9_-]{1,64}$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Whether a text looks like an email address. */
export const isEmailShape = (value: string): boolean => value.length <= EMAIL_MAX_LENGTH && EMAIL.test(value);

/** 1 to `FOLLOW_PACKAGES_MAX` npm packages by name, each once, in their order; null for anything else. */
export function packagesOf(value: unknown): FollowPackage[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > FOLLOW_PACKAGES_MAX) return null;
  const packages: FollowPackage[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (!isRecord(item) || item.registry !== 'npm' || typeof item.name !== 'string' || !isNpmPackageName(item.name)) {
      return null;
    }
    if (!seen.has(item.name)) {
      seen.add(item.name);
      packages.push({ registry: 'npm', name: item.name });
    }
  }
  return packages;
}

/** The three switches, each a boolean; null for anything else. */
export function eventsOf(value: unknown): FollowEvents | null {
  if (!isRecord(value)) return null;
  if (!FOLLOW_EVENTS.every((name) => typeof value[name] === 'boolean')) return null;
  return {
    notable: value.notable as boolean,
    digest: value.digest as boolean,
    milestones: value.milestones as boolean,
  };
}

/** A Follow press: packages, switches with one on at least, channels, and an address when email is one. */
export function startBodyOf(value: unknown): FollowStartBody | null {
  if (!isRecord(value)) return null;
  const packages = packagesOf(value.packages);
  const events = eventsOf(value.events);
  if (!packages || !events || !FOLLOW_EVENTS.some((name) => events[name])) return null;

  const { channels } = value;
  if (!Array.isArray(channels) || channels.length === 0 || channels.length > FOLLOW_CHANNELS.length) return null;
  if (!channels.every((channel) => (FOLLOW_CHANNELS as readonly unknown[]).includes(channel))) return null;
  const unique = [...new Set(channels as FollowChannel[])];

  if (!unique.includes('email')) return { packages, events, channels: unique };
  const email = typeof value.email === 'string' ? value.email.trim() : '';
  if (!isEmailShape(email)) return null;
  return { packages, events, channels: unique, email };
}

/** A change of one follow: its id with new switches, `remove`, or `undo` (one of the last two at most). */
export function changeBodyOf(value: unknown): FollowChangeBody | null {
  if (!isRecord(value) || typeof value.followId !== 'string' || !FOLLOW_ID.test(value.followId)) return null;
  const body: FollowChangeBody = { followId: value.followId };
  if (value.events !== undefined) {
    const events = eventsOf(value.events);
    if (!events) return null;
    body.events = events;
  }
  for (const flag of ['remove', 'undo'] as const) {
    if (value[flag] === undefined) continue;
    if (typeof value[flag] !== 'boolean') return null;
    body[flag] = value[flag];
  }
  if (body.remove && body.undo) return null;
  if (body.events === undefined && body.remove === undefined && body.undo === undefined) return null;
  return body;
}
