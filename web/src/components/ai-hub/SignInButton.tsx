'use client';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { SignInDialog } from './SignInDialog';

export function SignInButton({ label }: { label: string }) {
  const [isOpen, setOpen] = useState(false);
  const from = usePathname();
  return (
    <>
      <button type="button" data-testid="hub-signin" onClick={() => setOpen(true)} className="relative before:absolute before:inset-x-0 before:-inset-y-1.5 before:content-[''] inline-flex h-8 items-center rounded-full bg-accent px-3 text-sm font-semibold whitespace-nowrap text-bg">
        {label}
      </button>
      {isOpen ? <SignInDialog open onClose={() => setOpen(false)} state="signedOut" from={from} member={null} /> : null}
    </>
  );
}
