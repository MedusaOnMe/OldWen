import { ChartLine } from "lucide-react";
import { FaTwitter, FaDiscord, FaTelegram, FaGithub } from "react-icons/fa";

export default function Footer() {
  return (
    <footer className="bg-gray-800 text-white py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-crypto rounded-lg flex items-center justify-center">
                <ChartLine className="text-white text-sm" size={16} />
              </div>
              <span className="text-xl font-bold">Wendex</span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              The leading DexScreener-integrated crowdfunding platform for innovative DeFi projects and their supporters.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <FaTwitter size={20} />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <FaDiscord size={20} />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <FaTelegram size={20} />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <FaGithub size={20} />
              </a>
            </div>
          </div>

          {/* Platform */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Platform</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Browse Projects</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Submit Project</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Analytics</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Governance</a></li>
            </ul>
          </div>

          {/* Resources */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Resources</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Documentation</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">API Reference</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Smart Contracts</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Security</a></li>
            </ul>
          </div>

          {/* Company */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Company</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">About Us</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Careers</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Press Kit</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Contact</a></li>
            </ul>
          </div>
        </div>

        {/* Legal Disclaimer */}
        <div className="bg-gray-900/50 border border-gray-600/30 rounded-lg p-5 mt-12">
          <div className="text-gray-300 text-sm space-y-2 leading-relaxed">
            <h4 className="text-white font-semibold text-base mb-3">Platform Terms</h4>
            
            <p><strong>Service:</strong> Wendex operates as a crowdfunding platform facilitating community funding for DexScreener enhanced information services. We are an intermediary platform only.</p>
            
            <p><strong>Contributions:</strong> All contributions are final and non-refundable. We do not guarantee campaign success, service delivery, or token performance. Users participate voluntarily at their own risk.</p>
            
            <p><strong>Liability:</strong> Wendex disclaims liability for campaign outcomes, technical issues, or user losses. We do not provide financial advice.</p>
            
            <p><strong>Terms:</strong> Platform fees are non-refundable. By using this platform you agree to these terms.</p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-gray-700 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-400 text-sm">
            © 2024 Wendex. All rights reserved.
          </p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">Privacy Policy</a>
            <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">Terms of Service</a>
            <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">Cookie Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
