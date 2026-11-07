import { SmoothScroll } from '@/components/ui/SmoothScroll';
import { Navbar }  from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import  Hero  from '@/components/sections/Hero';
import HowItWorks from "@/components/sections/HowItWorks";
import Pricing from '@/components/sections/Pricing';
import ModelFragmentation from "@/components/sections/ModelFragmentation";
import ProductDemo from "@/components/sections/ProductDemo";
import WhyAttentra from "@/components/sections/WhyAttentra";
import DeveloperIntegration from "@/components/sections/DeveloperIntegration";
import FinalCTA from "@/components/sections/FinalCTA";

/*
 * Narrative — one job per section:
 *   Hero (what is it) → ModelFragmentation (why) → HowItWorks (how) →
 *   ProductDemo (example) → WhyAttentra (benefits) →
 *   DeveloperIntegration (try it) → Pricing (business model) → FinalCTA.
 */
export default function Home() {
  return (
    <SmoothScroll>
      <main className="min-h-screen bg-[var(--color-background)] text-[var(--color-foreground)]">
        <Navbar />
        <Hero />
        <ModelFragmentation />
        <HowItWorks />
        <ProductDemo />
        <WhyAttentra />
        <DeveloperIntegration />
        <Pricing />
        <FinalCTA />
        <Footer />
      </main>
    </SmoothScroll>
  );
}
