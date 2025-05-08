import { NextRequest } from 'next/server';

export const rejectWrongOrigin = (req: NextRequest) => {
  const origin = req.headers.get('origin') || req.headers.get('referer');
  const host = req.headers.get('host');
  const expectedHost = process.env.NEXT_PUBLIC_URI!;

  // Block if:
  // - No origin/referer (i.e., not from browser)
  // - AND host isn't your domain (i.e., not internal server-side call either)
  if (!origin && host !== expectedHost.replace(/^https?:\/\//, '')) {
    return true;
  }

  // If origin exists, validate it matches expected domain
  if (origin && !origin.startsWith(expectedHost)) {
    return true;
  }
};
