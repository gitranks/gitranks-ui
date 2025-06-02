'use server';
import jwt from 'jsonwebtoken';

export async function signedFetch(path: string, init: RequestInit = {}) {
  const token = jwt.sign({}, process.env.INTERNAL_JWT_SECRET!, { expiresIn: '2m' });

  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);

  return fetch(`${process.env.URI_GITRANKS}${path}`, { ...init, headers });
}
