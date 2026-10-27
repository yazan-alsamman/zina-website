import { AboutSection } from "@/components/landing/AboutSection";
import { ConstellationSection } from "@/components/landing/ConstellationSection";
import { EditSection } from "@/components/landing/EditSection";
import { HeroSection } from "@/components/landing/HeroSection";
import { InstagramSection } from "@/components/landing/InstagramSection";
import { LandingStage } from "@/components/landing/LandingStage";
import { OrderingSection } from "@/components/landing/OrderingSection";
import { Preloader } from "@/components/landing/Preloader";
import { ScrollRefresh } from "@/components/motion/ScrollRefresh";
import { getConstellationBrandNames } from "@/lib/brand-names";
import { getInstagramFeed } from "@/lib/instagram/feed";
import { getFeaturedProducts } from "@/lib/shop/catalog";

export default async function HomePage() {
  const [houseNames, featured, instagram] = await Promise.all([
    getConstellationBrandNames(),
    getFeaturedProducts(),
    getInstagramFeed(6),
  ]);

  return (
    <>
      <Preloader />
      <LandingStage houseNames={houseNames} />
      {/* Header switches to its light tone over the night hero via :has(). */}
      <main id="main" data-header-tone="light" className="relative z-10 flex-1">
        <HeroSection />
        <ConstellationSection houseNames={houseNames} />
        <AboutSection />
        <EditSection products={featured} />
        <OrderingSection />
        <InstagramSection posts={instagram} />
      </main>
      <ScrollRefresh />
    </>
  );
}
