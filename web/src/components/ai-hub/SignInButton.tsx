'use client';
import type { ViewerState } from '@/lib/access';

export function SignInButton({ label }: { state: ViewerState; label: string }) {
  return (
    <button type="button" data-testid="hub-signin" className="inline-flex min-h-11 items-center rounded-full bg-accent px-4 text-sm font-semibold whitespace-nowrap text-bg">
      {label}
    </button>
  );
}
