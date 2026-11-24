import { connection } from 'next/server';

import { oldLearnCardResponse } from '@/components/skills/skills-card-response';
import { loadSkillsCard } from '@/lib/skills/skills-card.data';

/**
 * A developer's old Learn picture, which a README may show: it is their Skills picture now, a redirect to its current
 * address, and not found where there is no public Skills page. Answered on request.
 */
export async function GET(_req: Request, { params }: RouteContext<'/badge/user/[login]/learn-card.png'>) {
  await connection();
  const { login } = await params;
  return oldLearnCardResponse(login, loadSkillsCard);
}
