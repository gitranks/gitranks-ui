import { interviewLogoResponse } from '@/lib/interviews/logo-response';

/**
 * A company's logo, 128 px square, for a logo drawn at 28 or 40 px. The proxy's gate closes it as it closes every
 * Interviews address.
 */
export async function GET(_req: Request, { params }: RouteContext<'/interviews/[company]/logo-128.png'>) {
  const { company } = await params;
  return interviewLogoResponse(company, 128, Date.now());
}
