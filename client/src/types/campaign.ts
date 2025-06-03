export type CampaignType = 'enhanced_token_info' | 'advertising' | 'boost';

export type CampaignStatus = 'active' | 'funded' | 'completed' | 'failed' | 'refunding' | 'cancelled';

export interface Campaign {
  id: string;
  tokenAddress: string;
  tokenName: string;
  tokenSymbol: string;
  tokenLogoUrl?: string;
  bannerUrl?: string;
  campaignType: CampaignType;
  targetAmount: number;
  currentAmount: number;
  deadline: Date;
  status: CampaignStatus;
  walletAddress: string;
  description: string;
  creatorAddress: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  serviceDetails?: any;
  contributorCount?: number;
}

export interface Contribution {
  id: string;
  campaignId: string;
  contributorAddress: string;
  amount: number;
  transactionHash: string;
  timestamp: Date;
  status: 'pending' | 'confirmed' | 'failed';
  refunded?: boolean;
  refundTxHash?: string;
}

export interface CreateCampaignData {
  tokenAddress: string;
  tokenName: string;
  tokenSymbol: string;
  tokenLogoUrl?: string;
  bannerUrl?: string;
  campaignType: CampaignType;
  targetAmount: number;
  deadline: string;
  description: string;
  creatorAddress: string;
}