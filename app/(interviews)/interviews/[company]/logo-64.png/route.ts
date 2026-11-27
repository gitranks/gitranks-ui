import { interviewLogoResponse } from '@/lib/interviews/logo-response';

/**
 * A company's logo, 64 px square, for a logo drawn at 16 or 20 px. The proxy's gate closes it as it closes every
 * Interviews address.
 */
export async function GET(_req: Request, { params }: RouteContext<'/interviews/[company]/logo-64.png'>) {
  const { company } = await params;
  return interviewLogoResponse(company, 64, Date.now());
}
