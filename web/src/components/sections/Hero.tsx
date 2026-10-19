import Image from 'next/image';
import type { Locale, Profile, Ui } from '@me/content';
import { HeroStage } from '../motion/HeroStage';
import { Typewriter } from '../motion/Typewriter';
import { VideoDialog } from '../VideoDialog';

// Section 을 쓰지 않는다: 배경(그리드·루프 영상)은 화면 끝까지 깔고, 글과 픽토그램만 site 폭 안에 둔다.
export function Hero({ profile, ui, locale }: { profile: Profile; ui: Ui; locale: Locale }) {
  return (
    <section id="hero" className="relative flex min-h-[calc(100dvh-var(--nav-h)-var(--footer-h))] scroll-mt-[var(--nav-h)] flex-col justify-center overflow-hidden gutter py-10">
      <HeroStage video={{ srcMp4: '/video/hero-loop.mp4', srcWebm: '/video/hero-loop.webm', poster: '/video/hero-poster.jpg', playLabel: ui.hero.playVideo }}>
        <div className="pointer-events-none relative z-[1] mx-auto flex w-full max-w-site flex-col gap-6 lg:flex-row lg:items-center">
          <div className="pointer-events-none flex-1 [&_a]:pointer-events-auto [&_button]:pointer-events-auto">
            <Typewriter as="p" text={`${profile.affiliation} · ${profile.role}`} startMs={300} msPerChar={70} className="font-mono text-sm text-accent" />
            <Typewriter as="h1" text={profile.name} startMs={1300} msPerChar={220} className="mt-2 text-5xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl" />
            <Typewriter as="p" text={profile.tagline} startMs={2100} msPerChar={80} className="mt-2 text-xl text-muted sm:text-2xl" />
            <p className="mt-6 max-w-2xl text-base leading-relaxed sm:text-lg">{profile.intro}</p>
            <div className="mt-8"><VideoDialog src={`/video/intro-${locale}.mp4`} openLabel={ui.hero.watchVideo} closeLabel={ui.hero.closeVideo} /></div>
            <p className="mt-6 font-mono text-xs text-muted">↓ {ui.hero.scrollHint}</p>
          </div>
          <div className="pointer-events-none flex justify-center lg:w-80">
            <Image src={profile.pictogram} alt={profile.name} width={320} height={320} priority className="w-48 rounded-2xl sm:w-64 lg:w-80" />
          </div>
        </div>
      </HeroStage>
    </section>
  );
}
