import { Button } from "@/components/ui/button";
import { ArrowRight, BarChart3, Shield, Zap, TrendingUp, Users, DollarSign } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { campaignAPI } from "@/services/api";

export default function Hero() {
  const [, setLocation] = useLocation();
  
  const { data: campaignsData } = useQuery({
    queryKey: ['campaigns-stats'],
    queryFn: () => campaignAPI.list({ status: 'active' }),
  });

  const activeCampaigns = campaignsData?.campaigns?.length || 0;
  const totalFunded = campaignsData?.campaigns?.reduce((sum, c) => sum + c.currentAmount, 0) || 0;

  const stats = [
    { label: 'Active Campaigns', value: activeCampaigns.toString(), icon: TrendingUp },
    { label: 'Total Raised', value: totalFunded > 0 ? `$${(totalFunded / 1000).toFixed(1)}K` : '$0', icon: DollarSign },
    { label: 'Contributors', value: '0', icon: Users },
  ];

  return (
    <section className="relative overflow-hidden bg-dark-radial min-h-screen flex items-center pt-20 pb-20">
      {/* Complex background patterns */}
      <div className="absolute inset-0 grid-pattern opacity-10" />
      <div className="absolute top-20 left-1/4 w-72 h-72 bg-purple-600/15 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-1/4 w-72 h-72 bg-pink-600/15 rounded-full blur-3xl" />
      
      <div className="container mx-auto px-6 relative z-10 max-w-7xl">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Content */}
          <div className="space-y-10">
            <div className="space-y-8">
              <div className="inline-flex items-center px-5 py-3 rounded-full bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 text-purple-300 text-sm font-medium backdrop-blur-sm">
                <Zap className="w-4 h-4 mr-2" />
                Community Crowdfunding Platform
              </div>
              
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-black leading-tight">
                <span className="block text-white mb-2">Fund Your Token's</span>
                <span className="block animated-gradient bg-clip-text text-transparent">DexScreener Success</span>
              </h1>
              
              <p className="text-xl md:text-2xl text-gray-400 leading-relaxed max-w-xl">
                Join the decentralized crowdfunding platform that helps Solana tokens get Enhanced Info, 
                advertising, and boosts on DexScreener through community support.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-6">
              <button 
                className="btn-dark-primary group text-lg px-8 py-4"
                onClick={() => setLocation('/campaigns')}
              >
                Browse Campaigns
                <ArrowRight className="ml-3 h-6 w-6 inline transition-transform group-hover:translate-x-2" />
              </button>
              
              <button 
                className="btn-dark-secondary text-lg px-8 py-4"
                onClick={() => setLocation('/create-campaign')}
              >
                Start a Campaign
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 pt-12 mt-12 border-t border-gray-800">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-4xl font-bold text-white mb-2">{stat.value}</div>
                  <div className="text-base text-gray-400">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Visual */}
          <div className="relative lg:ml-16 mt-12 lg:mt-0">
            <div className="relative max-w-lg mx-auto">
              {/* Floating elements with glassmorphism */}
              <div className="absolute -top-8 -left-8 card-dark p-6 hover-lift-dark z-20">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-600/20 to-emerald-600/20 flex items-center justify-center backdrop-blur-sm">
                    <Shield className="w-6 h-6 text-green-400" />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-white">Enhanced Info</p>
                    <p className="text-sm text-gray-400">$299 Target</p>
                  </div>
                </div>
              </div>

              <div className="absolute -bottom-8 -right-8 card-dark p-6 hover-lift-dark z-20">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600/20 to-pink-600/20 flex items-center justify-center backdrop-blur-sm">
                    <BarChart3 className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-white">Token Boosted</p>
                    <p className="text-sm text-gray-400">+450% Visibility</p>
                  </div>
                </div>
              </div>

              {/* Main Card */}
              <div className="card-dark p-10 glow-purple relative z-10">
                <div className="space-y-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-bold text-white">Example Campaign</h3>
                      <p className="text-base text-gray-400 mt-1">Enhanced Token Info</p>
                    </div>
                    <div className="badge-dark badge-dark-active px-4 py-2">
                      Active
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between text-base">
                      <span className="text-gray-400">Progress</span>
                      <span className="font-bold text-white text-xl">$0 / $299</span>
                    </div>
                    <div className="progress-dark">
                      <div className="progress-dark-bar" style={{ width: '0%' }} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6 pt-6 border-t border-gray-800">
                    <div className="text-center">
                      <div className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">0</div>
                      <p className="text-base text-gray-400 mt-2">Contributors</p>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">30d</div>
                      <p className="text-base text-gray-400 mt-2">Time Left</p>
                    </div>
                  </div>

                  <button className="w-full btn-dark-primary text-lg py-4 mt-8">
                    View Campaign
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </section>
  );
}