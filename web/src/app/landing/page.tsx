"use client"
import { HeroSection } from "./components/hero-section"
import { StatsAndLogosSection } from "./components/stats-logos-section"
import { FeaturesSection } from "./components/features-section"
import { FooterSection } from "./components/footer-section"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#020617] selection:bg-[#0369A1] selection:text-white relative overflow-hidden">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none"></div>
      
      <HeroSection />
      <StatsAndLogosSection />
      <FeaturesSection />
      <FooterSection />
    </div>
  )
}
