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
          cardHeight: 'h-full min-h-[420px]',
          bannerHeight: 'h-20',
          logoSize: 'w-10 h-10',
          titleSize: 'text-base',
          descriptionLines: 'line-clamp-2',
          padding: 'p-4'
        };
      case 'large':
        return {
          cardHeight: 'h-full min-h-[540px]',
          bannerHeight: 'h-32',
          logoSize: 'w-16 h-16',
          titleSize: 'text-xl',
          descriptionLines: 'line-clamp-4',
          padding: 'p-6'
        };
      default: // medium
        return {
          cardHeight: 'h-full min-h-[480px]',
          bannerHeight: 'h-24',
          logoSize: 'w-12 h-12',
          titleSize: 'text-lg',
          descriptionLines: 'line-clamp-3',
          padding: 'p-5'
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
    <Card 
      className={`
        ${sizeConfig.cardHeight} card-dark flex flex-col
        ${featured ? 'glow-purple' : ''}
        ${className}
      `}
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Featured Badge */}
      {featured && (
        <div className="absolute top-4 left-4 z-20">
          <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-semibold shadow-lg">
            <Star className="w-3 h-3 mr-1" />
            Featured
          </Badge>
        </div>
      )}

      {/* Campaign Status */}
      <div className="absolute top-4 right-4 z-20">
        <Badge variant={statusConfig.variant} className={`${statusConfig.className} shadow-lg`}>
          {statusConfig.label}
        </Badge>
      </div>

      {/* Banner Image */}
      <div className={`${sizeConfig.bannerHeight} relative overflow-hidden`}>
        <img
          src={campaign.bannerUrl}
          alt={`${campaign.tokenMetadata.name} banner`}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/70 to-transparent" />
      </div>

      <CardContent className={`${sizeConfig.padding} flex flex-col flex-1 space-y-4 relative`}>
        {/* Token Header */}
        <div className="flex items-center space-x-3 -mt-8 relative z-10">
          <div className="relative">
            <Avatar className={`${sizeConfig.logoSize} border-2 border-gray-800 shadow-lg`}>
              <AvatarImage src={campaign.logoUrl} alt={campaign.tokenMetadata.name} />
              <AvatarFallback className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold">
                {campaign.tokenMetadata.symbol.slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            
            {/* Campaign Type Indicator */}
            <div className={`
              absolute -bottom-1 -right-1 w-6 h-6 rounded-full 
              bg-gradient-to-r ${campaignTypeConfig.color} 
              flex items-center justify-center shadow-lg
            `}>
              <TypeIcon className="w-3 h-3 text-white" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <h3 className={`${sizeConfig.titleSize} font-bold text-white truncate`}>
                {campaign.tokenMetadata.name}
              </h3>
              <Badge variant="secondary" className="bg-gray-800 text-gray-300 text-xs border-gray-700">
                {campaign.tokenMetadata.symbol}
              </Badge>
              {campaign.tokenMetadata.verified && (
                <CheckCircle className="w-4 h-4 text-blue-400 flex-shrink-0" />
              )}
            </div>
            
            <div className="flex items-center space-x-2 mt-1">
              <span className={`text-xs ${campaignTypeConfig.textColor} font-medium`}>
                {campaignTypeConfig.label}
              </span>
              {campaign.trending && (
                <Badge className="bg-red-500/20 text-red-400 text-xs">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  Trending
                </Badge>
              )}
            </div>
          </div>

          {/* Action Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-gray-400 hover:text-gray-300 hover:bg-gray-800 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-gray-900 border border-gray-800 shadow-xl">
              <DropdownMenuItem onClick={handleShare} className="text-gray-300 hover:bg-gray-800">
                <Share2 className="w-4 h-4 mr-2" />
                Share Campaign
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setLocation(`/campaign/${campaign.id}`)}
                className="text-gray-300 hover:bg-gray-800"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                View Details
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Description */}
        <p className={`text-gray-400 text-sm ${sizeConfig.descriptionLines}`}>
          {campaign.description}
        </p>

        {/* Progress Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Progress</span>
            <span className="text-white font-semibold">
              ${campaign.currentAmount.toFixed(0)} / ${campaign.targetAmount.toFixed(0)}
            </span>
          </div>

          <Progress 
            value={metrics.progress} 
            className={`h-2 ${
              metrics.isNearlyFunded ? 'bg-green-500/20' : 
              metrics.urgency === 'high' ? 'bg-red-500/20' : 
              'bg-white/20'
            }`}
          />

          {/* Campaign Stats */}
          {showStats && (
            <div className="grid grid-cols-3 gap-4 pt-2">
              <div className="text-center">
                <div className="flex items-center justify-center space-x-1">
                  <Users className="w-3 h-3 text-blue-400" />
                  <span className="text-xs text-blue-400 font-medium">
                    {campaign.contributorCount}
                  </span>
                </div>
                <span className="text-xs text-gray-500">Contributors</span>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center space-x-1">
                  <Target className="w-3 h-3 text-purple-400" />
                  <span className="text-xs text-purple-400 font-medium">
                    {metrics.progress.toFixed(0)}%
                  </span>
                </div>
                <span className="text-xs text-gray-500">Funded</span>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center space-x-1">
                  <Clock className={`w-3 h-3 ${
                    metrics.urgency === 'high' ? 'text-red-400' : 
                    metrics.urgency === 'medium' ? 'text-yellow-400' : 
                    'text-green-400'
                  }`} />
                  <span className={`text-xs font-medium ${
                    metrics.urgency === 'high' ? 'text-red-400' : 
                    metrics.urgency === 'medium' ? 'text-yellow-400' : 
                    'text-green-400'
                  }`}>
                    {metrics.timeRemaining.split(' ')[0]}
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  {metrics.timeRemaining.includes('day') ? 'Days' : 
                   metrics.timeRemaining.includes('hour') ? 'Hours' : 'Time'} Left
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Spacer to push buttons to bottom */}
        <div className="flex-1" />
        
        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2 mt-auto">
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              className={`text-gray-400 hover:text-gray-300 hover:bg-gray-800 transition-colors ${
                isLiked ? 'text-red-400' : ''
              }`}
            >
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
              className="text-gray-400 hover:text-gray-300 hover:bg-gray-800"
            >
              <Share2 className="w-4 h-4" />
            </Button>
          </div>

          <Button
            size="sm"
            className={`
              font-medium transition-all duration-200 rounded-lg
              ${metrics.isFunded 
                ? 'bg-green-600 hover:bg-green-700 text-white' 
                : metrics.isExpired 
                  ? 'bg-gray-700 hover:bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'btn-dark-primary'
              }
            `}
            disabled={metrics.isExpired}
            onClick={(e) => {
              e.stopPropagation();
              setLocation(`/campaign/${campaign.id}`);
            }}
          >
            {metrics.isFunded ? 'View Campaign' : 
             metrics.isExpired ? 'Expired' : 
             'Contribute'}
          </Button>
        </div>

        {/* Urgency Indicator */}
        {metrics.urgency === 'high' && !metrics.isFunded && !metrics.isExpired && (
          <div className="flex items-center space-x-2 p-2 bg-red-500/20 rounded-lg border border-red-500/30">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span className="text-red-400 text-xs font-medium">
              {metrics.timeRemaining.includes('day') && parseInt(metrics.timeRemaining) <= 1 
                ? 'Less than 24 hours remaining!' 
                : 'Ending soon!'}
            </span>
          </div>
        )}

        {/* Social Links Preview */}
        {Object.values(campaign.socialLinks).some(link => link) && (
          <div className="flex items-center space-x-1 opacity-70">
            {campaign.socialLinks.website && (
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
            )}
            {campaign.socialLinks.twitter && (
              <div className="w-1.5 h-1.5 bg-sky-400 rounded-full" />
            )}
            {campaign.socialLinks.telegram && (
              <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />
            )}
            <span className="text-xs text-gray-400 ml-1">Connected</span>
          </div>
        )}
      </CardContent>

      {/* Hover Overlay Effect */}
      <div className={`
        absolute inset-0 bg-gradient-to-br from-purple-500/10 to-indigo-500/10 
        opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none
      `} />
    </Card>
  );
};

export default EnhancedCampaignCard;