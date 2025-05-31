import { BarChart, Shield, Users, Plug, Network, Search } from "lucide-react";

const features = [
  {
    icon: BarChart,
    title: "Real-time Analytics",
    description: "Track project performance with live data integration from DexScreener and comprehensive funding analytics.",
    color: "indigo"
  },
  {
    icon: Shield,
    title: "Secure Funding",
    description: "Smart contract-based escrow system ensures funds are protected and released based on milestone achievements.",
    color: "emerald"
  },
  {
    icon: Users,
    title: "Community Driven",
    description: "Governance tokens allow community members to vote on project listings and platform improvements.",
    color: "amber"
  },
  {
    icon: Plug,
    title: "DexScreener Integration",
    description: "Seamless integration with DexScreener for live market data, token analytics, and trading insights.",
    color: "purple"
  },
  {
    icon: Network,
    title: "Multi-Chain Support",
    description: "Support for Ethereum, BSC, Polygon, and other major blockchains for maximum accessibility.",
    color: "blue"
  },
  {
    icon: Search,
    title: "Project Vetting",
    description: "Comprehensive due diligence process including smart contract audits and team verification.",
    color: "red"
  }
];

const colorClasses = {
  indigo: {
    bg: "bg-indigo-100",
    hoverBg: "group-hover:bg-indigo-600",
    text: "text-indigo-600",
    hoverText: "group-hover:text-white",
    border: "hover:border-indigo-600"
  },
  emerald: {
    bg: "bg-emerald-100",
    hoverBg: "group-hover:bg-emerald-600",
    text: "text-emerald-600",
    hoverText: "group-hover:text-white",
    border: "hover:border-emerald-600"
  },
  amber: {
    bg: "bg-amber-100",
    hoverBg: "group-hover:bg-amber-600",
    text: "text-amber-600",
    hoverText: "group-hover:text-white",
    border: "hover:border-amber-600"
  },
  purple: {
    bg: "bg-purple-100",
    hoverBg: "group-hover:bg-purple-600",
    text: "text-purple-600",
    hoverText: "group-hover:text-white",
    border: "hover:border-purple-600"
  },
  blue: {
    bg: "bg-blue-100",
    hoverBg: "group-hover:bg-blue-600",
    text: "text-blue-600",
    hoverText: "group-hover:text-white",
    border: "hover:border-blue-600"
  },
  red: {
    bg: "bg-red-100",
    hoverBg: "group-hover:bg-red-600",
    text: "text-red-600",
    hoverText: "group-hover:text-white",
    border: "hover:border-red-600"
  }
};

export default function Features() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900">
            Why Choose Wendex?
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Built for the DeFi ecosystem with advanced analytics, secure funding mechanisms, and seamless integration with DexScreener data.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            const colors = colorClasses[feature.color as keyof typeof colorClasses];
            
            return (
              <div
                key={index}
                className={`group p-6 bg-white rounded-xl border border-gray-200 ${colors.border} hover:shadow-lg transition-all duration-300`}
              >
                <div className="space-y-4">
                  <div className={`w-12 h-12 ${colors.bg} rounded-lg flex items-center justify-center ${colors.hoverBg} transition-all duration-300`}>
                    <Icon className={`${colors.text} ${colors.hoverText} text-xl transition-all duration-300`} size={24} />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">{feature.title}</h3>
                  <p className="text-gray-600">
                    {feature.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
