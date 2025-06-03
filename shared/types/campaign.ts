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

export interface Transaction {
  id: string;
  campaignId: string;
  type: 'contribution' | 'refund' | 'service_purchase';
  amount: number;
  hash: string;
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: Date;
  blockNumber?: number;
  fromAddress: string;
  toAddress: string;
}

export interface Service {
  id: string;
  campaignId: string;
  serviceType: CampaignType;
  purchaseDetails: any;
  confirmationData: any;
  purchasedAt: Date;
  status: 'pending' | 'active' | 'failed';
}

export interface Refund {
  id: string;
  contributionId: string;
  campaignId: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  transactionHash?: string;
  processedAt?: Date;
  reason: string;
  recipientAddress: string;
}