import { Button } from "@/components/ui/button";
import { ChartLine, Menu, X, Rocket, Zap } from "lucide-react";
import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useLocation } from "wouter";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { connected } = useWallet();
  const [location, setLocation] = useLocation();

  const isActive = (path: string) => location === path;

  const navItems = [
    { href: '/', label: 'Home', icon: ChartLine },
    { href: '/campaigns', label: 'Browse', icon: Menu },
    { href: '/create-campaign', label: 'Create', icon: Zap },
  ];

  return (
    <>
      {/* Backdrop blur for glassmorphism effect */}
      <div className="fixed top-0 left-0 right-0 h-20 bg-gray-900/30 backdrop-blur-xl border-b border-gray-800/50 z-40" />
      
      <header className="fixed top-0 left-0 right-0 z-50">
        <nav className="container mx-auto px-6">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <div 
              className="flex items-center space-x-3 cursor-pointer group" 
              onClick={() => setLocation("/")}
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-xl blur-lg" />
                <div className="relative bg-gradient-to-r from-purple-600 to-pink-600 p-2 rounded-xl">
                  <Rocket className="h-6 w-6 text-white transition-transform group-hover:rotate-12" />
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-black bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  Wendex
                </span>
                <span className="text-xs text-purple-400 font-medium -mt-1">
                  CROWDFUNDING
                </span>
              </div>
            </div>

            {/* Navigation Links - Desktop */}
            <div className="hidden lg:flex items-center space-x-1">
              {navItems.map((item) => {
                const IconComponent = item.icon;
                return (
                  <a 
                    key={item.href}
                    href={item.href} 
                    className={`relative flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all duration-300 group ${
                      isActive(item.href)
                        ? 'text-white bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                    onClick={(e) => { e.preventDefault(); setLocation(item.href); }}
                  >
                    <IconComponent className="w-4 h-4" />
                    <span>{item.label}</span>
                    {isActive(item.href) && (
                      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-purple-400 rounded-full" />
                    )}
                  </a>
                );
              })}
            </div>

            {/* Actions - Desktop */}
            <div className="hidden lg:flex items-center space-x-4">
              <button
                className="relative px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl overflow-hidden group transition-all duration-300 hover:shadow-2xl hover:shadow-purple-600/25 hover:scale-105"
                onClick={() => setLocation("/create-campaign")}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-700 to-pink-700 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative flex items-center space-x-2">
                  <Zap className="w-4 h-4" />
                  <span>Launch Campaign</span>
                </div>
              </button>
              
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-xl blur-lg" />
                <WalletMultiButton className="relative !bg-gray-900/50 !border !border-gray-700 !text-white hover:!bg-gray-800/50 hover:!border-gray-600 !rounded-xl !font-medium !px-6 !py-3 !backdrop-blur-sm !transition-all" />
              </div>
            </div>

            {/* Mobile menu button */}
            <button
              className="lg:hidden relative p-3 rounded-xl bg-gray-900/50 border border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800/50 transition-all"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </nav>

        {/* Mobile Navigation Menu */}
        {isMenuOpen && (
          <div className="lg:hidden mt-2 mx-6 mb-6">
            <div className="bg-gray-900/90 backdrop-blur-xl border border-gray-800 rounded-2xl p-6 space-y-4">
              {navItems.map((item) => {
                const IconComponent = item.icon;
                return (
                  <a 
                    key={item.href}
                    href={item.href} 
                    className={`flex items-center space-x-3 p-4 rounded-xl transition-all ${
                      isActive(item.href)
                        ? 'bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 text-white'
                        : 'text-gray-400 hover:bg-white/5 hover:text-white'
                    }`}
                    onClick={(e) => { e.preventDefault(); setLocation(item.href); setIsMenuOpen(false); }}
                  >
                    <IconComponent className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </a>
                );
              })}
              
              <div className="pt-4 border-t border-gray-800 space-y-3">
                <button
                  className="w-full flex items-center justify-center space-x-2 p-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all"
                  onClick={() => { setLocation("/create-campaign"); setIsMenuOpen(false); }}
                >
                  <Zap className="w-5 h-5" />
                  <span>Launch Campaign</span>
                </button>
                
                <div className="px-2">
                  <WalletMultiButton className="!w-full !bg-gray-800/50 !border !border-gray-700 !text-white hover:!bg-gray-700/50 !rounded-xl !font-medium !px-6 !py-3" />
                </div>
              </div>
            </div>
          </div>
        )}
      </header>
    </>
  );
}