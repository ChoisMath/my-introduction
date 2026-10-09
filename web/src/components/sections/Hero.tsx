import Image from 'next/image';
import type { Locale, Profile, Ui } from '@me/content';
import { Section } from '../Section';
import { HeroStage } from '../motion/HeroStage';
import { Typewriter } from '../motion/Typewriter';
import { VideoDialog } from '../VideoDialog';

export function Hero({ profile, ui, locale }: { profile: Profile; ui: Ui; locale: Locale }) {
  return (
    <Section id="hero">
      <div className="relative -mx-2 -mt-10 flex overflow-hidden min-h-[calc(100dvh-var(--nav-h))] flex-col justify-center gap-6 px-2 py-10 sm:-mx-3 sm:px-3 md:-mx-4 md:px-4 lg:-mx-6 lg:-mt-16 lg:flex-row lg:items-center lg:px-6">
        <HeroStage video={{ srcMp4: '/video/hero-loop.mp4', srcWebm: '/video/hero-loop.webm', poster: '/video/hero-poster.jpg', playLabel: ui.hero.playVideo }}>
        <div className="pointer-events-none relative z-[1] flex-1 [&_a]:pointer-events-auto [&_button]:pointer-events-auto">
          <Typewriter as="p" text={`${profile.affiliation} · ${profile.role}`} startMs={300} msPerChar={70} className="font-mono text-sm text-accent" />
          <Typewriter as="h1" text={profile.name} startMs={1300} msPerChar={220} className="mt-2 text-5xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl" />
          <Typewriter as="p" text={profile.tagline} startMs={2100} msPerChar={80} className="mt-2 text-xl text-muted sm:text-2xl" />
          <p className="mt-6 max-w-2xl text-base leading-relaxed sm:text-lg">{profile.intro}</p>
          <div className="mt-8"><VideoDialog src={`/video/intro-${locale}.mp4`} openLabel={ui.hero.watchVideo} closeLabel={ui.hero.closeVideo} /></div>
          <p className="mt-6 font-mono text-xs text-muted">↓ {ui.hero.scrollHint}</p>
        </div>
        <div className="pointer-events-none relative z-[1] flex justify-center lg:w-80">
          <Image src={profile.pictogram} alt={profile.name} width={320} height={320} priority className="w-48 rounded-2xl sm:w-64 lg:w-80" />
        </div>
        </HeroStage>
      </div>
    </Section>
  );
}
