import axios from 'axios';
import { Campaign, Contribution, CreateCampaignData } from '../types/campaign';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Transform server campaign data to match client expectations
const transformCampaign = (campaign: any): any => {
  return {
    ...campaign,
    // Ensure id is always set
    id: campaign.id,
    tokenMetadata: {
      name: campaign.tokenMetadata?.name || campaign.tokenName || 'Unknown Token',
      symbol: campaign.tokenMetadata?.symbol || campaign.tokenSymbol || 'UNKNOWN',
      description: campaign.tokenMetadata?.description || campaign.description || '',
      image: campaign.tokenMetadata?.image || campaign.logoUrl || '',
      verified: campaign.tokenMetadata?.verified || false
    },
    logoUrl: campaign.logoUrl || campaign.tokenMetadata?.image || '/placeholder-token.png',
    tokenLogoUrl: campaign.tokenLogoUrl || campaign.logoUrl || campaign.tokenMetadata?.image || '/placeholder-token.png',
    bannerUrl: campaign.bannerUrl || '/placeholder-banner.jpg',
    contractAddress: campaign.contractAddress || campaign.tokenAddress,
    tokenAddress: campaign.contractAddress || campaign.tokenAddress,
    creatorAddress: campaign.createdBy || campaign.creatorAddress,
    contributorCount: campaign.contributorCount || 0,
    socialLinks: campaign.socialLinks || {},
    postFundingAction: campaign.postFundingAction || { type: 'none' },
    trending: campaign.trending || false,
    featured: campaign.featured || false,
    // Convert dates (handle both Firestore Timestamp and ISO strings)
    createdAt: campaign.createdAt?._seconds 
      ? new Date(campaign.createdAt._seconds * 1000) 
      : new Date(campaign.createdAt),
    updatedAt: campaign.updatedAt?._seconds 
      ? new Date(campaign.updatedAt._seconds * 1000) 
      : new Date(campaign.updatedAt),
    deadline: campaign.deadline?._seconds 
      ? new Date(campaign.deadline._seconds * 1000) 
      : new Date(campaign.deadline)
  };
};

export const campaignAPI = {
  create: async (data: CreateCampaignData) => {
    const response = await api.post<{ success: boolean; campaign: Campaign }>('/campaigns', data);
    if (response.data.success && response.data.campaign) {
      response.data.campaign = transformCampaign(response.data.campaign);
    }
    return response.data;
  },

  list: async (filters?: {
    status?: string;
    tokenAddress?: string;
    campaignType?: string;
  }) => {
    const response = await api.get<{ success: boolean; campaigns: Campaign[] }>('/campaigns', {
      params: filters,
    });
    if (response.data.success && response.data.campaigns) {
      response.data.campaigns = response.data.campaigns.map(transformCampaign);
    }
    return response.data;
  },

  get: async (id: string) => {
    const response = await api.get<{ success: boolean; campaign: Campaign }>(`/campaigns/${id}`);
    if (response.data.success && response.data.campaign) {
      response.data.campaign = transformCampaign(response.data.campaign);
    }
    return response.data;
  },

  getContributions: async (campaignId: string) => {
    const response = await api.get<{ success: boolean; contributions: Contribution[] }>(
      `/campaigns/${campaignId}/contributions`
    );
    return response.data;
  },

  contribute: async (campaignId: string, data: {
    contributorAddress: string;
    amount: number;
    transactionHash: string;
  }) => {
    const response = await api.post<{ success: boolean; contribution: Contribution }>(
      `/campaigns/${campaignId}/contribute`,
      data
    );
    return response.data;
  },
};

export const balanceAPI = {
  getBalance: async (wallet: string) => {
    const response = await api.get<{ success: boolean; balance: number; wallet: string }>(
      `/balances/${wallet}`
    );
    return response.data;
  },

  getTransactions: async (wallet: string, limit = 20) => {
    const response = await api.get<{ success: boolean; transactions: any[]; wallet: string }>(
      `/transactions/${wallet}`,
      { params: { limit } }
    );
    return response.data;
  },
};