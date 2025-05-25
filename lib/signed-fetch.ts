import 'server-only';
import jwt from 'jsonwebtoken';

export async function signedFetch(path: string, init: RequestInit = {}) {
  const payload = {
    iss: 'nextjs-frontend',
    sub: 'service-call',
    iat: Math.floor(Date.now() / 1000),
  };

  const token = jwt.sign(payload, process.env.INTERNAL_JWT_SECRET!, { expiresIn: '2m' });

  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);

  return fetch(`${process.env.URI_GITRANKS}${path}`, { ...init, headers });
}
