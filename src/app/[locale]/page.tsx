import { AboutSection } from "@/components/landing/AboutSection";
import { ConstellationSection } from "@/components/landing/ConstellationSection";
import { EditSection } from "@/components/landing/EditSection";
import { HeroSection } from "@/components/landing/HeroSection";
import { InstagramSection } from "@/components/landing/InstagramSection";
import { LandingStage } from "@/components/landing/LandingStage";
import { OrderingSection } from "@/components/landing/OrderingSection";
import { Preloader } from "@/components/landing/Preloader";
import { ScrollRefresh } from "@/components/motion/ScrollRefresh";

export default function HomePage() {
  return (
    <>
      <Preloader />
      <LandingStage />
      {/* Header switches to its light tone over the night hero via :has(). */}
      <main id="main" data-header-tone="light" className="relative z-10 flex-1">
        <HeroSection />
        <ConstellationSection />
        <AboutSection />
        <EditSection />
        <OrderingSection />
        <InstagramSection />
      </main>
      <ScrollRefresh />
    </>
  );
}
