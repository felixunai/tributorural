import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/landing/HeroSection";
import { StatsBar } from "@/components/landing/StatsBar";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { AiAssistantSection } from "@/components/landing/AiAssistantSection";
import { PricingSection } from "@/components/landing/PricingSection";
import { CtaSection } from "@/components/landing/CtaSection";

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1">
        <HeroSection />
        <StatsBar />
        <FeaturesSection />
        <AiAssistantSection />
        <section className="py-20">
          <PricingSection />
        </section>
        <CtaSection />
      </main>
      <Footer />
    </div>
  );
}
