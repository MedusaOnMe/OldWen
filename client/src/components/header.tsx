import { Button } from "@/components/ui/button";
import { ChartLine, Menu, Wallet } from "lucide-react";
import { useState } from "react";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleConnectWallet = () => {
    // Wallet connection logic would go here
    console.log("Connect wallet clicked");
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-50">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-crypto rounded-lg flex items-center justify-center">
              <ChartLine className="text-white text-sm" size={16} />
            </div>
            <span className="text-xl font-bold text-gray-900">Wendex</span>
          </div>

          {/* Navigation Links - Desktop */}
          <div className="hidden md:flex items-center space-x-8">
            <a href="#" className="text-gray-600 hover:text-indigo-600 transition-colors font-medium">
              Projects
            </a>
            <a href="#" className="text-gray-600 hover:text-indigo-600 transition-colors font-medium">
              Analytics
            </a>
            <a href="#" className="text-gray-600 hover:text-indigo-600 transition-colors font-medium">
              How it Works
            </a>
            <a href="#" className="text-gray-600 hover:text-indigo-600 transition-colors font-medium">
              About
            </a>
          </div>

          {/* Wallet Connect Button & Mobile Menu */}
          <div className="flex items-center space-x-4">
            <Button
              onClick={handleConnectWallet}
              variant="outline"
              className="hidden sm:inline-flex items-center border-indigo-600 text-indigo-600 hover:bg-indigo-600 hover:text-white"
            >
              <Wallet className="mr-2" size={16} />
              Connect Wallet
            </Button>
            
            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <Menu size={20} />
            </Button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-100">
            <div className="flex flex-col space-y-3">
              <a href="#" className="text-gray-600 hover:text-indigo-600 transition-colors font-medium px-2 py-1">
                Projects
              </a>
              <a href="#" className="text-gray-600 hover:text-indigo-600 transition-colors font-medium px-2 py-1">
                Analytics
              </a>
              <a href="#" className="text-gray-600 hover:text-indigo-600 transition-colors font-medium px-2 py-1">
                How it Works
              </a>
              <a href="#" className="text-gray-600 hover:text-indigo-600 transition-colors font-medium px-2 py-1">
                About
              </a>
              <Button
                onClick={handleConnectWallet}
                variant="outline"
                className="mt-2 border-indigo-600 text-indigo-600 hover:bg-indigo-600 hover:text-white"
              >
                <Wallet className="mr-2" size={16} />
                Connect Wallet
              </Button>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
