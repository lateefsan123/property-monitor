import { AbsoluteFill, Sequence } from "remotion";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { Hero } from "./scenes/Hero";
import { ConceptSlide } from "./scenes/ConceptSlide";
import { CTA } from "./scenes/CTA";
import { theme } from "./theme";

loadInter();

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

const s = (seconds: number) => Math.round(seconds * FPS);

type Scene = { from: number; duration: number };

const SCENES: Record<string, Scene> = {
  hero: { from: s(0), duration: s(7) },
  forWhom: { from: s(7), duration: s(6) },
  sellers: { from: s(13), duration: s(7) },
  listings: { from: s(20), duration: s(7) },
  spreadsheets: { from: s(27), duration: s(7) },
  mobile: { from: s(34), duration: s(7) },
  close: { from: s(41), duration: s(8) },
  cta: { from: s(49), duration: s(11) },
};

export const DURATION_IN_FRAMES = s(60);

export const SellerSignalVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: theme.bg }}>
      <Sequence from={SCENES.hero.from} durationInFrames={SCENES.hero.duration}>
        <Hero />
      </Sequence>

      <Sequence from={SCENES.forWhom.from} durationInFrames={SCENES.forWhom.duration}>
        <ConceptSlide
          eyebrow="For Dubai real estate"
          line="Built for brokers who track dozens of buildings."
        />
      </Sequence>

      <Sequence from={SCENES.sellers.from} durationInFrames={SCENES.sellers.duration}>
        <ConceptSlide
          eyebrow="One"
          line="Every prospect. Every follow-up. One place."
        />
      </Sequence>

      <Sequence from={SCENES.listings.from} durationInFrames={SCENES.listings.duration}>
        <ConceptSlide
          eyebrow="Two"
          line="Listings that actually matter."
          sub="Price drops and new activity across the towers you care about."
        />
      </Sequence>

      <Sequence from={SCENES.spreadsheets.from} durationInFrames={SCENES.spreadsheets.duration}>
        <ConceptSlide
          eyebrow="Three"
          line="Spreadsheets without the mess."
        />
      </Sequence>

      <Sequence from={SCENES.mobile.from} durationInFrames={SCENES.mobile.duration}>
        <ConceptSlide
          eyebrow="Four"
          line="On your phone, on the way to a viewing."
        />
      </Sequence>

      <Sequence from={SCENES.close.from} durationInFrames={SCENES.close.duration}>
        <ConceptSlide
          line="A calmer way to work your pipeline."
          size="xl"
        />
      </Sequence>

      <Sequence from={SCENES.cta.from} durationInFrames={SCENES.cta.duration}>
        <CTA />
      </Sequence>
    </AbsoluteFill>
  );
};
