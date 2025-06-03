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
    <section className="py-20 bg-dark-gradient">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="space-y-8">
          <h2 className="text-3xl lg:text-4xl font-bold text-white">
            Ready to Transform DeFi Funding?
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Join thousands of innovators and investors building the future of decentralized finance through our crowdfunding platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleGetStarted}
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 shadow-xl flex items-center justify-center"
            >
              <ArrowRight className="mr-2" size={18} />
              Get Started Today
            </button>
            <button
              onClick={handleLearnMore}
              className="px-8 py-4 border-2 border-purple-500 text-purple-400 rounded-xl font-semibold hover:bg-purple-500 hover:text-white transition-all duration-200 flex items-center justify-center"
            >
              <Book className="mr-2" size={18} />
              Learn More
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
