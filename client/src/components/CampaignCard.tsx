// Re-export the enhanced campaign card as the default
export { EnhancedCampaignCard as CampaignCard } from './EnhancedCampaignCard';

// Keep the original interface for backward compatibility
export interface CampaignCardProps {
  campaign: any; // Use any for flexibility with database schema
  featured?: boolean;
  showStats?: boolean;
  size?: 'small' | 'medium' | 'large';
  interactive?: boolean;
  onLike?: (campaignId: string) => void;
  onShare?: (campaign: any) => void;
  className?: string;
}