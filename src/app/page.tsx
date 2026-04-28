import Navbar from "@/components/landing/Navbar"
import Hero from "@/components/landing/Hero"
import Features from "@/components/landing/Features"
import HowItWorks from "@/components/landing/HowItWorks"
import Pricing from "@/components/landing/Pricing"
import Testimonials from "@/components/landing/Testimonials"
import FAQ from "@/components/landing/FAQ"
import CTA from "@/components/landing/CTA"
import Footer from "@/components/landing/Footer"

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <Features />
        <HowItWorks />
        <Pricing />
        <Testimonials />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </div>
  )
}
