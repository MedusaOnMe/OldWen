import { BarChart, Shield, Users, Rocket, TrendingUp, Zap } from "lucide-react";

const features = [
  {
    icon: TrendingUp,
    title: "Enhanced Token Info",
    description: "Get your token verified with enhanced information on DexScreener for increased visibility and trust.",
    gradient: "from-purple-500 to-indigo-600"
  },
  {
    icon: Zap,
    title: "Token Boosts",
    description: "Boost your token's ranking on DexScreener to reach more traders and increase exposure.",
    gradient: "from-yellow-500 to-orange-600"
  },
  {
    icon: Shield,
    title: "Secure Escrow",
    description: "All funds are held in secure escrow wallets until campaign goals are met, ensuring transparency.",
    gradient: "from-green-500 to-emerald-600"
  },
  {
    icon: Users,
    title: "Community Powered",
    description: "Rally your community to crowdfund DexScreener services together, making premium features accessible.",
    gradient: "from-blue-500 to-cyan-600"
  },
  {
    icon: BarChart,
    title: "Real-time Tracking",
    description: "Monitor campaign progress in real-time with transparent contribution tracking and updates.",
    gradient: "from-pink-500 to-rose-600"
  },
  {
    icon: Rocket,
    title: "Instant Activation",
    description: "Services are automatically purchased and activated once funding goals are reached.",
    gradient: "from-indigo-500 to-purple-600"
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
    <section className="py-24 bg-dark-gradient">
      <div className="container mx-auto px-6">
        {/* Section Header */}
        <div className="text-center space-y-6 mb-20">
          <h2 className="heading-dark-1">
            Everything You Need to
            <span className="block bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Boost Your Token</span>
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
            Leverage the power of community crowdfunding to unlock premium DexScreener features for your token
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            
            return (
              <div
                key={index}
                className="card-dark hover:scale-105 transition-all duration-300 group"
              >
                <div className="p-8 space-y-6">
                  {/* Icon */}
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-r ${feature.gradient} flex items-center justify-center shadow-lg`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  
                  <h3 className="text-2xl font-bold text-white group-hover:text-purple-300 transition-colors">{feature.title}</h3>
                  <p className="text-gray-400 leading-relaxed text-lg">
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
