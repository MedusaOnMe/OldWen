import React, { useState, useCallback } from 'react';
import { Check, DollarSign, Zap, Star, AlertCircle } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';

interface PostFundingOptionProps {
  type: 'none' | 'boosts' | 'advertising';
  title: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
  showAmountInput?: boolean;
  amount?: number;
  onAmountChange?: (amount: number) => void;
  className?: string;
}

const OPTION_CONFIGS = {
  none: {
    icon: Check,
    color: 'from-green-500 to-emerald-600',
    borderColor: 'border-green-500/50',
    bgColor: 'bg-green-500/10',
    hoverColor: 'hover:bg-green-500/20',
    selectedColor: 'bg-green-500/30 border-green-400',
    minAmount: 0,
    maxAmount: 0,
    suggestedAmounts: []
  },
  boosts: {
    icon: Zap,
    color: 'from-yellow-500 to-orange-600',
    borderColor: 'border-yellow-500/50',
    bgColor: 'bg-yellow-500/10',
    hoverColor: 'hover:bg-yellow-500/20',
    selectedColor: 'bg-yellow-500/30 border-yellow-400',
    minAmount: 100,
    maxAmount: 5000,
    suggestedAmounts: [299, 599, 999, 1499]
  },
  advertising: {
    icon: Star,
    color: 'from-purple-500 to-indigo-600',
    borderColor: 'border-purple-500/50',
    bgColor: 'bg-purple-500/10',
    hoverColor: 'hover:bg-purple-500/20',
    selectedColor: 'bg-purple-500/30 border-purple-400',
    minAmount: 500,
    maxAmount: 10000,
    suggestedAmounts: [999, 1999, 3999, 7499]
  }
};

const OPTION_DETAILS = {
  none: {
    features: [
      'Enhanced Token Info only',
      'Campaign completes at $299',
      'No additional funding required'
    ],
    timeline: 'Immediate completion'
  },
  boosts: {
    features: [
      'Enhanced Token Info + Boosts',
      'Trending placement',
      'Increased visibility',
      'Community momentum'
    ],
    timeline: '24-48 hours after funding'
  },
  advertising: {
    features: [
      'Enhanced Token Info + Advertising',
      'Premium placement',
      'Featured listings',
      'Maximum exposure'
    ],
    timeline: '48-72 hours after funding'
  }
};

export const PostFundingOption: React.FC<PostFundingOptionProps> = ({
  type,
  title,
  description,
  selected,
  onSelect,
  showAmountInput = false,
  amount,
  onAmountChange,
  className = ''
}) => {
  const [amountError, setAmountError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const config = OPTION_CONFIGS[type];
  const details = OPTION_DETAILS[type];
  const IconComponent = config.icon;

  const validateAmount = useCallback((value: number): boolean => {
    if (type === 'none') return true;

    if (value < config.minAmount) {
      setAmountError(`Minimum amount is $${config.minAmount}`);
      return false;
    }

    if (value > config.maxAmount) {
      setAmountError(`Maximum amount is $${config.maxAmount}`);
      return false;
    }

    setAmountError(null);
    return true;
  }, [type, config.minAmount, config.maxAmount]);

  const handleAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 0;
    
    if (onAmountChange) {
      onAmountChange(value);
    }

    // Debounced validation
    setTimeout(() => {
      validateAmount(value);
    }, 300);
  }, [onAmountChange, validateAmount]);

  const handleSuggestedAmount = useCallback((suggestedAmount: number) => {
    if (onAmountChange) {
      onAmountChange(suggestedAmount);
      validateAmount(suggestedAmount);
    }
  }, [onAmountChange, validateAmount]);

  return (
    <div className={`space-y-4 ${className}`}>
      <div
        className={`
          relative p-6 rounded-xl border-2 transition-all duration-300 cursor-pointer
          ${selected 
            ? `${config.selectedColor} shadow-lg scale-105` 
            : `${config.borderColor} ${config.bgColor} ${config.hoverColor}`
          }
          backdrop-blur-sm
        `}
        onClick={onSelect}
      >
        {/* Selection Indicator */}
        {selected && (
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg">
            <Check className="h-4 w-4 text-white" />
          </div>
        )}

        {/* Header */}
        <div className="flex items-start space-x-4">
          <div className={`
            w-12 h-12 rounded-lg bg-gradient-to-r ${config.color} 
            flex items-center justify-center shadow-lg
          `}>
            <IconComponent className="h-6 w-6 text-white" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-white text-lg font-semibold">{title}</h3>
            <p className="text-gray-300 text-sm mt-1">{description}</p>
          </div>
        </div>

        {/* Features List */}
        <div className="mt-4 space-y-2">
          {details.features.map((feature, index) => (
            <div key={index} className="flex items-center space-x-2">
              <div className="w-1.5 h-1.5 bg-white/50 rounded-full" />
              <span className="text-white/80 text-sm">{feature}</span>
            </div>
          ))}
        </div>

        {/* Timeline */}
        <div className="mt-4 p-3 bg-white/5 rounded-lg">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
            <span className="text-blue-300 text-sm font-medium">Timeline: {details.timeline}</span>
          </div>
        </div>

        {/* Show Details Button */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setShowDetails(!showDetails);
          }}
          className="mt-3 text-white/70 hover:text-white"
        >
          {showDetails ? 'Hide Details' : 'Show Details'}
        </Button>
      </div>

      {/* Detailed Information */}
      {showDetails && selected && (
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
          <h4 className="text-white font-semibold mb-3">What's Included</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {type === 'none' && (
              <div className="space-y-2">
                <p className="text-green-300 font-medium">✓ Enhanced Token Info</p>
                <p className="text-white/70 text-sm">Professional token listing with verified metadata, social links, and community information displayed on DexScreener.</p>
              </div>
            )}
            
            {type === 'boosts' && (
              <>
                <div className="space-y-2">
                  <p className="text-green-300 font-medium">✓ Enhanced Token Info</p>
                  <p className="text-white/70 text-sm">Complete professional listing</p>
                </div>
                <div className="space-y-2">
                  <p className="text-yellow-300 font-medium">✓ DexScreener Boosts</p>
                  <p className="text-white/70 text-sm">Trending placement and increased visibility</p>
                </div>
              </>
            )}
            
            {type === 'advertising' && (
              <>
                <div className="space-y-2">
                  <p className="text-green-300 font-medium">✓ Enhanced Token Info</p>
                  <p className="text-white/70 text-sm">Complete professional listing</p>
                </div>
                <div className="space-y-2">
                  <p className="text-purple-300 font-medium">✓ Premium Advertising</p>
                  <p className="text-white/70 text-sm">Featured placement and maximum exposure</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Amount Input Section */}
      {showAmountInput && selected && type !== 'none' && (
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10 space-y-4">
          <h4 className="text-white font-semibold">Additional Funding Target</h4>
          
          {/* Suggested Amounts */}
          <div className="space-y-2">
            <label className="text-white/80 text-sm font-medium">Suggested Amounts</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {config.suggestedAmounts.map((suggestedAmount) => (
                <Button
                  key={suggestedAmount}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleSuggestedAmount(suggestedAmount)}
                  className={`
                    bg-white/10 border-white/30 text-white hover:bg-white/20
                    ${amount === suggestedAmount ? 'bg-purple-500/30 border-purple-400' : ''}
                  `}
                >
                  ${suggestedAmount}
                </Button>
              ))}
            </div>
          </div>

          {/* Custom Amount Input */}
          <div className="space-y-2">
            <label className="text-white/80 text-sm font-medium">
              Custom Amount (${config.minAmount} - ${config.maxAmount})
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                <DollarSign className="h-5 w-5 text-white/70" />
              </div>
              <Input
                type="number"
                min={config.minAmount}
                max={config.maxAmount}
                value={amount || ''}
                onChange={handleAmountChange}
                placeholder={`Enter amount (${config.minAmount}-${config.maxAmount})`}
                className="pl-10 bg-white/10 border-white/30 text-white placeholder-gray-300 focus:border-purple-500"
              />
            </div>
          </div>

          {amountError && (
            <Alert variant="destructive" className="bg-red-500/20 border-red-500/50">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-red-200">
                {amountError}
              </AlertDescription>
            </Alert>
          )}

          {/* Total Amount Display */}
          {amount && !amountError && (
            <div className="bg-gradient-to-r from-purple-500/20 to-indigo-500/20 rounded-lg p-4 border border-purple-500/30">
              <div className="flex items-center justify-between">
                <span className="text-white font-medium">Total Campaign Target:</span>
                <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400">
                  ${299 + amount}
                </span>
              </div>
              <div className="text-white/70 text-sm mt-1">
                $299 for Enhanced Token Info + ${amount} for {type === 'boosts' ? 'Boosts' : 'Advertising'}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PostFundingOption;