import type { NextRequest } from 'next/server';

const normalizeHost = (value: string | null) => {
  if (!value) {
    return null;
  }

  try {
    // Handle full origins like "https://gitranks.com/".
    const parsed = new URL(value);
    return parsed.host.toLowerCase();
  } catch {
    // Handle plain hosts like "gitranks.com" or "gitranks.com/".
    return value.replace(/^https?:\/\//, '').replace(/\/+$/, '').toLowerCase();
  }
};

export const rejectWrongOrigin = (req: NextRequest) => {
  const origin = req.headers.get('origin') || req.headers.get('referer');
  const host = normalizeHost(req.headers.get('host'));
  const expectedHost = normalizeHost(process.env.NEXT_PUBLIC_URI!);

  // Block if:
  // - No origin/referer (i.e., not from browser)
  // - AND host isn't your domain (i.e., not internal server-side call either)
  if (!origin && host !== expectedHost) {
    return true;
  }

  // If origin exists, validate it matches expected domain
  if (origin) {
    const originHost = normalizeHost(origin);
    if (originHost !== expectedHost) {
      return true;
    }
  }

  if (!expectedHost) {
    return true;
  }
};
