import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { campaignAPI } from '../services/api';
import { CampaignCard } from '../components/CampaignCard';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Loader2, Plus, Search } from 'lucide-react';
import { useLocation } from 'wouter';
import { Layout } from '../components/Layout';

export function CampaignsPage() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [campaignType, setCampaignType] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data, isLoading, error } = useQuery({
    queryKey: ['campaigns', statusFilter, campaignType],
    queryFn: () => campaignAPI.list({
      status: statusFilter !== 'all' ? statusFilter : undefined,
      campaignType: campaignType !== 'all' ? campaignType : undefined,
    }),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const campaigns = data?.campaigns || [];

  const filteredCampaigns = campaigns.filter(campaign => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        (campaign.tokenMetadata?.name || campaign.tokenName || '').toLowerCase().includes(search) ||
        (campaign.tokenMetadata?.symbol || campaign.tokenSymbol || '').toLowerCase().includes(search) ||
        (campaign.contractAddress || campaign.tokenAddress || '').toLowerCase().includes(search)
      );
    }
    return true;
  });

  const activeCampaigns = filteredCampaigns.filter(c => {
    if (c.status !== 'active') return false;
    // Check if campaign is expired
    const deadline = new Date(c.deadline);
    return deadline > new Date();
  });
  const fundedCampaigns = filteredCampaigns.filter(c => c.status === 'funded' || c.status === 'completed');
  const failedCampaigns = filteredCampaigns.filter(c => {
    if (c.status === 'failed' || c.status === 'cancelled') return true;
    // Include expired campaigns in failed tab
    if (c.status === 'active') {
      const deadline = new Date(c.deadline);
      return deadline <= new Date();
    }
    return false;
  });

  return (
    <Layout>
      <div className="min-h-screen bg-dark-gradient">
        <div className="container mx-auto px-6 py-12 space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="heading-dark-1">Active Campaigns</h1>
          <p className="text-lg text-gray-400 mt-2">
            Browse and contribute to DexScreener service crowdfunding campaigns
          </p>
        </div>
        <button 
          onClick={() => setLocation('/create-campaign')}
          className="btn-dark-primary"
        >
          <Plus className="mr-2 h-4 w-4 inline" />
          Create Campaign
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            placeholder="Search by token name, symbol, or address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-dark pl-10 w-full"
          />
        </div>
        <Select value={campaignType} onValueChange={setCampaignType}>
          <SelectTrigger className="w-full sm:w-[180px] bg-gray-900/50 border-gray-800 text-gray-300">
            <SelectValue placeholder="Campaign Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="enhanced_token_info">Enhanced Info</SelectItem>
            <SelectItem value="advertising">Advertising</SelectItem>
            <SelectItem value="boost">Boost</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-gray-400">Failed to load campaigns. Please try again.</p>
        </div>
      ) : (
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-gray-900/50 border border-gray-800">
            <TabsTrigger value="active" className="data-[state=active]:bg-purple-600/20 data-[state=active]:text-white text-gray-400">
              Active ({activeCampaigns.length})
            </TabsTrigger>
            <TabsTrigger value="funded" className="data-[state=active]:bg-purple-600/20 data-[state=active]:text-white text-gray-400">
              Funded ({fundedCampaigns.length})
            </TabsTrigger>
            <TabsTrigger value="failed" className="data-[state=active]:bg-purple-600/20 data-[state=active]:text-white text-gray-400">
              Failed ({failedCampaigns.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-6">
            {activeCampaigns.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-fr">
                {activeCampaigns.map(campaign => (
                  <CampaignCard key={campaign.id} campaign={campaign} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-400">No active campaigns found.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="funded" className="mt-6">
            {fundedCampaigns.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-fr">
                {fundedCampaigns.map(campaign => (
                  <CampaignCard key={campaign.id} campaign={campaign} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-400">No funded campaigns yet.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="failed" className="mt-6">
            {failedCampaigns.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-fr">
                {failedCampaigns.map(campaign => (
                  <CampaignCard key={campaign.id} campaign={campaign} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-400">No failed campaigns.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
        </div>
      </div>
    </Layout>
  );
}