import { connection } from 'next/server';

import { oldLearnCardResponse } from '@/components/skills/skills-card-response';
import { loadSkillsCard } from '@/lib/skills/skills-card.data';

/**
 * A developer's old Learn picture, which a README may show: it answers their Skills picture at its own address, from
 * the Skills page's cached read, and not found where there is no public Skills page. Answered on request.
 */
export async function GET(_req: Request, { params }: RouteContext<'/badge/user/[login]/learn-card.png'>) {
  await connection();
  const { login } = await params;
  return oldLearnCardResponse(login, loadSkillsCard);
}
