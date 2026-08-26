import { SmoothScroll } from '@/components/ui/SmoothScroll';
import { Navbar }  from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import  Hero  from '@/components/sections/Hero';
import HowItWorks from "@/components/sections/HowItWorks";
import Pricing from '@/components/sections/Pricing';
import ModelFragmentation from "@/components/sections/ModelFragmentation";
import Architecture from "@/components/sections/Architecture";
import ProductDemo from "@/components/sections/ProductDemo";
import WhyAttentra from "@/components/sections/WhyAttentra";
import UseCases from "@/components/sections/UseCases";
import DeveloperIntegration from "@/components/sections/DeveloperIntegration";
import CostIntelligence from "@/components/sections/CostIntelligence";
import FinalCTA from "@/components/sections/FinalCTA";

export default function Home() {
  return (
    <SmoothScroll>
      <main className="min-h-screen bg-[var(--color-background)] text-[var(--color-foreground)]">
        <Navbar />
        <Hero />
        <ModelFragmentation />
        <HowItWorks />
        <Architecture />
        <ProductDemo />
        <WhyAttentra />
        <UseCases />
        <CostIntelligence />
        <DeveloperIntegration />
        <Pricing />
        <FinalCTA />
        <Footer />
      </main>
    </SmoothScroll>
  );
}
