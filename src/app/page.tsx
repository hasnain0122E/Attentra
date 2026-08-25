import { SmoothScroll } from '@/components/ui/SmoothScroll';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Hero } from '@/components/sections/Hero';
import { HowItWorks } from '@/components/sections/HowItWorks';
import { TrustSection } from '@/components/sections/TrustSection';
import { SavingsCalculator } from '@/components/sections/SavingsCalculator';
import { Pricing } from '@/components/sections/Pricing';

export default function Home() {
  return (
    <SmoothScroll>
      <main className="min-h-screen bg-paper font-body text-ink selection:bg-gold selection:text-paper">
        <Navbar />
        <Hero />
        <HowItWorks />
        <TrustSection />
        <SavingsCalculator />
        <Pricing />
        <Footer />
      </main>
    </SmoothScroll>
  );
}
