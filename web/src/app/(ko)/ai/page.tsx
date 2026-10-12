import { redirect } from 'next/navigation';
import { AI_TABS } from '@/lib/ai-tabs';

export default function AiHomePage() {
  redirect(AI_TABS[0]!.href);
}
