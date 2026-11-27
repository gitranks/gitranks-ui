import { INTERVIEWS_REPORT_MINE_PATH } from '@/lib/interviews/paths';

/** One "This is wrong" as the browser sends it: the fact's key, and the plan it was sent from (none on a company's page). */
export type WrongReport = { company: string; plan: string | null; fact: string };

/** How a send ended: taken, refused for a session that is gone, refused past the day's limit, or anything else. */
export type WrongSent = 'sent' | 'signed_out' | 'limited' | 'failed';

/** Sends one "This is wrong" with its note; never throws. */
export async function sendWrongReport(report: WrongReport, note: string): Promise<WrongSent> {
  try {
    const res = await fetch(INTERVIEWS_REPORT_MINE_PATH, {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...report, note }),
    });
    if (res.ok) return 'sent';
    if (res.status === 401) return 'signed_out';
    if (res.status === 429) return 'limited';
    return 'failed';
  } catch {
    return 'failed';
  }
}
