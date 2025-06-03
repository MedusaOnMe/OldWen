import React, { useState, useMemo, useCallback } from 'react';
import { useLocation } from 'wouter';
import { 
  TrendingUp, 
  Users, 
  Clock, 
  DollarSign, 
  Star, 
  Shield, 
  Zap,
  ExternalLink,
  Heart,
  Share2,
  MoreVertical,
  CheckCircle,
  AlertTriangle,
  Target
} from 'lucide-react';

import { Card, CardContent, CardHeader } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from './ui/dropdown-menu';

import { Campaign } from '../services/database';
import { formatCampaignDeadline, formatRelativeTime } from '../utils/timestamp';

interface EnhancedCampaignCardProps {
  campaign: Campaign;
  featured?: boolean;
  showStats?: boolean;
  size?: 'small' | 'medium' | 'large';
  interactive?: boolean;
  onLike?: (campaignId: string) => void;
  onShare?: (campaign: Campaign) => void;
  className?: string;
}

export const EnhancedCampaignCard: React.FC<EnhancedCampaignCardProps> = ({
  campaign,
  featured = false,
  showStats = true,
  size = 'medium',
  interactive = true,
  onLike,
  onShare,
  className = ''
}) => {
  const [, setLocation] = useLocation();
  const [isLiked, setIsLiked] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Calculate campaign metrics
  const metrics = useMemo(() => {
    const progress = Math.min((campaign.currentAmount / campaign.targetAmount) * 100, 100);
    const deadline = formatCampaignDeadline(campaign.deadline || campaign.createdAt);
    const isExpired = deadline.isExpired;
    const timeRemaining = deadline.timeRemaining;
    
    return {
      progress,
      isExpired,
      timeRemaining,
      urgency: deadline.urgency,
      isNearlyFunded: progress >= 80,
      isFunded: progress >= 100,
      fundingVelocity: campaign.currentAmount / Math.max(1, 
        Math.floor((Date.now() - new Date(campaign.createdAt).getTime()) / (24 * 60 * 60 * 1000))
      )
    };
  }, [campaign]);

  // Get campaign type configuration
  const campaignTypeConfig = useMemo(() => {
    const actionType = campaign.postFundingAction?.type || 'none';
    switch (actionType) {
      case 'boosts':
        return {
          icon: Zap,
          color: 'from-yellow-500 to-orange-600',
          bgColor: 'bg-yellow-500/20',
          textColor: 'text-yellow-400',
          label: 'With Boosts'
        };
      case 'advertising':
        return {
          icon: Star,
          color: 'from-purple-500 to-indigo-600',
          bgColor: 'bg-purple-500/20',
          textColor: 'text-purple-400',
          label: 'With Advertising'
        };
      default:
        return {
          icon: Shield,
          color: 'from-green-500 to-emerald-600',
          bgColor: 'bg-green-500/20',
          textColor: 'text-green-400',
          label: 'Enhanced Info'
        };
    }
  }, [campaign.postFundingAction?.type]);

  // Size configurations
  const sizeConfig = useMemo(() => {
    switch (size) {
      case 'small':
        return {
          cardHeight: 'h-full min-h-[320px]',
          bannerHeight: 'h-24',
          logoSize: 'w-12 h-12',
          titleSize: 'text-base',
          descriptionLines: 'line-clamp-2',
          padding: 'p-4'
        };
      case 'large':
        return {
          cardHeight: 'h-full min-h-[420px]',
          bannerHeight: 'h-32',
          logoSize: 'w-16 h-16',
          titleSize: 'text-xl',
          descriptionLines: 'line-clamp-3',
          padding: 'p-6'
        };
      default: // medium
        return {
          cardHeight: 'h-full min-h-[380px]',
          bannerHeight: 'h-28',
          logoSize: 'w-14 h-14',
          titleSize: 'text-lg',
          descriptionLines: 'line-clamp-2',
          padding: 'p-4'
        };
    }
  }, [size]);

  // Status badge configuration
  const statusConfig = useMemo(() => {
    if (metrics.isFunded) {
      return {
        label: 'Funded',
        variant: 'default' as const,
        className: 'bg-green-500 text-white'
      };
    }
    
    if (metrics.isExpired) {
      return {
        label: 'Expired',
        variant: 'destructive' as const,
        className: 'bg-red-500 text-white'
      };
    }
    
    if (campaign.status === 'processing') {
      return {
        label: 'Processing',
        variant: 'secondary' as const,
        className: 'bg-blue-500 text-white'
      };
    }
    
    return {
      label: 'Active',
      variant: 'outline' as const,
      className: 'bg-green-500/20 text-green-400 border-green-500/50'
    };
  }, [metrics, campaign.status]);

  // Event handlers
  const handleCardClick = useCallback((e: React.MouseEvent) => {
    if (!interactive) return;
    
    // Don't navigate if clicking on interactive elements
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('[role="button"]')) {
      return;
    }
    
    setLocation(`/campaign/${campaign.id}`);
  }, [interactive, setLocation, campaign.id]);

  const handleLike = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLiked(!isLiked);
    onLike?.(campaign.id!);
  }, [isLiked, onLike, campaign.id]);

  const handleShare = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onShare?.(campaign);
  }, [onShare, campaign]);

  const TypeIcon = campaignTypeConfig.icon;

  return (
    <div 
      className={`
        ${sizeConfig.cardHeight} 
        bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden
        ${featured ? 'ring-2 ring-purple-500' : ''}
        ${interactive ? 'cursor-pointer hover:scale-105 hover:shadow-2xl hover:border-purple-500/50' : ''}
        transition-all duration-300 group shadow-xl
        ${className}
      `}
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Status Badge */}
      <div className="absolute top-4 right-4 z-20">
        <div className={`px-3 py-1 rounded-full text-xs font-bold ${
          campaign.status === 'active' ? 'bg-green-500 text-white' :
          campaign.status === 'funded' ? 'bg-blue-500 text-white' :
          'bg-red-500 text-white'
        }`}>
          {statusConfig.label}
        </div>
      </div>

      {/* Banner Section - Clean and Simple */}
      <div className="h-32 bg-gradient-to-r from-purple-600 to-indigo-600 relative">
        {campaign.bannerUrl && 
         campaign.bannerUrl !== '/placeholder-banner.jpg' ? (
          <img
            src={campaign.bannerUrl}
            alt={`${campaign.tokenMetadata.name} banner`}
            className="w-full h-full object-cover opacity-90"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : null}
      </div>

      {/* Content Section */}
      <div className="p-6 flex flex-col flex-1">
        {/* Token Header with Large Logo */}
        <div className="flex items-center space-x-4 mb-4 -mt-8 relative z-10">
          <div className="w-24 h-24 rounded-full border-4 border-gray-900 shadow-2xl bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-center overflow-hidden">
            {campaign.logoUrl && 
             campaign.logoUrl !== '/placeholder-token.png' ? (
              <img 
                src={campaign.logoUrl} 
                alt={campaign.tokenMetadata.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <div className="text-white font-bold text-2xl">
                {campaign.tokenMetadata.symbol?.slice(0, 2) || 'TK'}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-bold text-white mb-1 truncate">
              {campaign.tokenMetadata?.name || campaign.tokenName || 'Unknown Token'}
            </h3>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-1 bg-purple-600 text-white text-sm font-medium rounded">
                ${campaign.tokenMetadata.symbol}
              </span>
              {campaign.tokenMetadata.verified && (
                <CheckCircle className="w-4 h-4 text-blue-400" />
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        <p className="text-gray-400 text-sm mb-4 line-clamp-2">
          {campaign.description}
        </p>

        {/* Funding Progress */}
        <div className="space-y-3 mb-4">
          <div className="flex justify-between items-center">
            <span className="text-2xl font-bold text-white">
              ${campaign.currentAmount.toFixed(0)}
            </span>
            <span className="text-gray-400">
              of ${campaign.targetAmount.toFixed(0)}
            </span>
          </div>

          <div className="w-full bg-gray-800 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(metrics.progress, 100)}%` }}
            ></div>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-sm font-bold text-white">{campaign.contributorCount || 0}</div>
              <div className="text-xs text-gray-500">Contributors</div>
            </div>
            <div>
              <div className="text-sm font-bold text-purple-400">{metrics.progress.toFixed(0)}%</div>
              <div className="text-xs text-gray-500">Funded</div>
            </div>
            <div>
              <div className={`text-sm font-bold ${
                metrics.urgency === 'high' ? 'text-red-400' : 
                metrics.urgency === 'medium' ? 'text-yellow-400' : 
                'text-green-400'
              }`}>
                {metrics.timeRemaining.split(' ')[0]}
              </div>
              <div className="text-xs text-gray-500">Days Left</div>
            </div>
          </div>
        </div>

        {/* Spacer to push button to bottom */}
        <div className="flex-1" />
        
        {/* Single Action Button */}
        <button
          className={`w-full py-3 rounded-xl font-semibold transition-all duration-200 ${
            metrics.isFunded 
              ? 'bg-green-600 hover:bg-green-700 text-white' 
              : metrics.isExpired 
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white hover:scale-105'
          }`}
          disabled={metrics.isExpired}
          onClick={(e) => {
            e.stopPropagation();
            setLocation(`/campaign/${campaign.id}`);
          }}
        >
          {metrics.isFunded ? 'View Campaign' : 
           metrics.isExpired ? 'Expired' : 
           'Contribute Now'}
        </button>
      </div>

    </div>
  );
};

export default EnhancedCampaignCard;