import { Button } from "@/components/ui/button";
import { ArrowRight, Book } from "lucide-react";

export default function CTA() {
  const handleGetStarted = () => {
    console.log("Get started clicked");
  };

  const handleLearnMore = () => {
    console.log("Learn more clicked");
  };

  return (
    <section className="py-20 bg-gradient-crypto">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="space-y-8">
          <h2 className="text-3xl lg:text-4xl font-bold text-white">
            Ready to Transform DeFi Funding?
          </h2>
          <p className="text-xl text-white/90 max-w-2xl mx-auto">
            Join thousands of innovators and investors building the future of decentralized finance through our crowdfunding platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={handleGetStarted}
              size="lg"
              className="bg-white text-indigo-600 hover:bg-gray-100 shadow-lg transition-all duration-200"
            >
              <ArrowRight className="mr-2" size={18} />
              Get Started Today
            </Button>
            <Button
              onClick={handleLearnMore}
              variant="outline"
              size="lg"
              className="border-2 border-white text-white hover:bg-white hover:text-indigo-600 transition-all duration-200"
            >
              <Book className="mr-2" size={18} />
              Learn More
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
