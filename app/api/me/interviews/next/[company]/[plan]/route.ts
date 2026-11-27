import type { AuthRequest } from '@/app/api/profile/[login]/route';
import { auth } from '@/auth';
import { interviewsReadResponse, interviewsViewerOf } from '@/lib/interviews/interviews-route';
import { loadInterviewNext } from '@/lib/interviews/next.data';

/**
 * The connecting screen for the signed-in person, read in the browser after the screen is up: `{ next }`, what was
 * just done after the part `?after=` (its key), and their plan now. Null signed out (without asking the API), when
 * Interviews is not open to them, and on any failure. Never kept.
 */
export const GET = auth(async function GET(req: AuthRequest, { params }) {
  const { company, plan } = (await params) as { company: string; plan: string };
  const after = req.nextUrl.searchParams.get('after') ?? '';
  const viewer = interviewsViewerOf(req);
  return interviewsReadResponse('next', viewer ? await loadInterviewNext(viewer, company, plan, after) : null);
});
