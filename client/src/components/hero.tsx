import { Button } from "@/components/ui/button";
import { Rocket, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function Hero() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/stats"],
  });

  const handleExploreProjects = () => {
    console.log("Explore projects clicked");
  };

  const handleSubmitProject = () => {
    console.log("Submit project clicked");
  };

  return (
    <section className="relative bg-gradient-hero overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Hero Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 leading-tight">
                <span className="text-gradient-crypto">Wendex</span>
                <br />
                DexScreener Crowdfunding Platform
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed max-w-lg">
                Discover, fund, and track the next generation of DeFi projects. Connect directly with innovative crypto startups through our integrated crowdfunding ecosystem.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                onClick={handleExploreProjects}
                size="lg"
                className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <Rocket className="mr-2" size={18} />
                Explore Projects
              </Button>
              <Button
                onClick={handleSubmitProject}
                variant="outline"
                size="lg"
                className="border-indigo-600 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all duration-200"
              >
                <Plus className="mr-2" size={18} />
                Submit Project
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 pt-8">
              <div className="text-center">
                <div className="text-2xl lg:text-3xl font-bold text-gray-900">
                  {isLoading ? "..." : stats?.totalFunded || "$0"}
                </div>
                <div className="text-sm text-gray-600">Total Funded</div>
              </div>
              <div className="text-center">
                <div className="text-2xl lg:text-3xl font-bold text-gray-900">
                  {isLoading ? "..." : stats?.activeProjects || "0"}
                </div>
                <div className="text-sm text-gray-600">Active Projects</div>
              </div>
              <div className="text-center">
                <div className="text-2xl lg:text-3xl font-bold text-gray-900">
                  {isLoading ? "..." : stats?.backers || "0"}
                </div>
                <div className="text-sm text-gray-600">Backers</div>
              </div>
            </div>
          </div>

          {/* Hero Image/Graphic - DeFi Dashboard Mockup */}
          <div className="relative">
            <div className="bg-white rounded-2xl shadow-2xl p-6 border border-gray-100">
              <div className="space-y-4">
                {/* Mock chart header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                    <span className="text-sm font-medium text-gray-700">Live Projects</span>
                  </div>
                  <span className="text-xs text-gray-500">Real-time</span>
                </div>
                
                {/* Mock chart area */}
                <div className="h-48 bg-gradient-to-br from-indigo-50 to-emerald-50 rounded-lg relative overflow-hidden">
                  {/* Chart bars simulation */}
                  <div className="absolute inset-0 flex items-end justify-between px-4 pb-4">
                    <div className="w-2 bg-indigo-600 rounded-t" style={{ height: "60%" }}></div>
                    <div className="w-2 bg-amber-500 rounded-t" style={{ height: "85%" }}></div>
                    <div className="w-2 bg-emerald-500 rounded-t" style={{ height: "45%" }}></div>
                    <div className="w-2 bg-indigo-600 rounded-t" style={{ height: "75%" }}></div>
                    <div className="w-2 bg-amber-500 rounded-t" style={{ height: "90%" }}></div>
                    <div className="w-2 bg-emerald-500 rounded-t" style={{ height: "65%" }}></div>
                    <div className="w-2 bg-indigo-600 rounded-t" style={{ height: "95%" }}></div>
                  </div>
                </div>

                {/* Mock project cards */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-indigo-600 rounded-full"></div>
                      <div>
                        <div className="text-sm font-medium">Project Alpha</div>
                        <div className="text-xs text-gray-500">Funding Goal</div>
                      </div>
                    </div>
                    <div className="text-emerald-600 font-medium text-sm">Active</div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-amber-500 rounded-full"></div>
                      <div>
                        <div className="text-sm font-medium">Project Beta</div>
                        <div className="text-xs text-gray-500">Funding Goal</div>
                      </div>
                    </div>
                    <div className="text-emerald-600 font-medium text-sm">Active</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
