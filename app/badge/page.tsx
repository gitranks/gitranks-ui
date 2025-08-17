import { redirect } from 'next/navigation';

export default async function BadgePage() {
  redirect(`/badge/gallery`);
}
