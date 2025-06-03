import Header from "@/components/header";
import Hero from "@/components/hero";
import Features from "@/components/features";
import CTA from "@/components/cta";
import Footer from "@/components/footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-dark-gradient">
      {/* Top Warning Banner */}
      <div className="bg-red-600 text-white py-2 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-sm font-medium">
            ⚠️ <strong>IMPORTANT:</strong> All contributions are FINAL and NON-REFUNDABLE. No refunds provided under any circumstances. Read full disclaimer before contributing.
          </p>
        </div>
      </div>
      
      <Header />
      <Hero />
      <Features />
      <CTA />
      <Footer />
    </div>
  );
}
