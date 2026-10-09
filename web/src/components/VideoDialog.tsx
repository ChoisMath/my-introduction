'use client';
import { useRef } from 'react';

export function VideoDialog({ src, openLabel, closeLabel }: { src: string; openLabel: string; closeLabel: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const open = () => { dialog.current?.showModal(); void video.current?.play(); };
  const close = () => { video.current?.pause(); dialog.current?.close(); };
  return (
    <>
      <button type="button" onClick={open} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold whitespace-nowrap text-bg" data-testid="open-video">
        ▶ {openLabel}
      </button>
      <dialog ref={dialog} onClose={close} className="m-auto w-[min(96vw,1200px)] rounded-2xl bg-dark-bg p-2 backdrop:bg-black/70">
        <video ref={video} controls preload="metadata" className="aspect-video w-full rounded-xl" src={src} />
        <button type="button" onClick={close} className="mt-2 inline-flex min-h-11 w-full items-center justify-center rounded-full border border-dark-muted text-sm whitespace-nowrap text-dark-fg">{closeLabel}</button>
      </dialog>
    </>
  );
}
