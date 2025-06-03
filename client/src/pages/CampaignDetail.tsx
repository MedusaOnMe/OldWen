import React, { useEffect, useState } from 'react';
import { useParams } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Campaign, Contribution } from '../types/campaign';
import { campaignAPI } from '../services/api';
import { wsService } from '../services/websocket';
import { ContributeModal } from '../components/ContributeModal';
import { CampaignChat } from '../components/CampaignChat';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Clock, Copy, DollarSign, ExternalLink, Loader2, Users, Wallet } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { formatDetailedTimeRemaining } from '../utils/timestamp';
import { formatContribution } from '../utils/currency';
import { useToast } from '../hooks/use-toast';
import { Layout } from '../components/Layout';

export function CampaignDetailPage() {
  const { id } = useParams();
  const { toast } = useToast();
  const [showContributeModal, setShowContributeModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'contributions' | 'chat'>('contributions');

  const { data: campaignData, isLoading, error, refetch } = useQuery({
    queryKey: ['campaign', id],
    queryFn: () => campaignAPI.get(id!),
    enabled: !!id,
  });

  const { data: contributionsData, refetch: refetchContributions } = useQuery({
    queryKey: ['contributions', id],
    queryFn: () => campaignAPI.getContributions(id!),
    enabled: !!id,
  });

  // Temporarily disabled WebSocket connection - using Helius webhooks instead
  // useEffect(() => {
  //   if (!id) return;

  //   // Subscribe to campaign updates
  //   wsService.subscribeToCampaign(id);

  //   const handleCampaignUpdate = (campaign: Campaign) => {
  //     if (campaign.id === id) {
  //       refetch();
  //     }
  //   };

  //   const handleNewContribution = (contribution: Contribution) => {
  //     if (contribution.campaignId === id) {
  //       refetchContributions();
  //       refetch();
  //     }
  //   };

  //   wsService.on('campaign_update', handleCampaignUpdate);
  //   wsService.on('new_contribution', handleNewContribution);

  //   return () => {
  //     wsService.unsubscribeFromCampaign(id);
  //     wsService.off('campaign_update', handleCampaignUpdate);
  //     wsService.off('new_contribution', handleNewContribution);
  //   };
  // }, [id, refetch, refetchContributions]);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  if (error || !campaignData?.success) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-2">Campaign Not Found</h2>
          <p className="text-muted-foreground">The campaign you're looking for doesn't exist.</p>
        </div>
      </Layout>
    );
  }

  const campaign = campaignData.campaign;
  const contributions = contributionsData?.contributions || [];
  const progress = (campaign.currentAmount / campaign.targetAmount) * 100;
  const timeLeft = formatDetailedTimeRemaining(campaign.deadline);

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    toast({
      title: 'Address Copied',
      description: 'Address copied to clipboard',
    });
  };

  return (
    <Layout>
      <div className="min-h-screen bg-dark-gradient">
        <div className="container mx-auto px-6 py-12 space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="card-dark overflow-hidden">
                {/* Banner Section */}
                {campaign.bannerUrl && campaign.bannerUrl !== '/placeholder-banner.jpg' && (
                  <div className="h-48 bg-gradient-to-r from-purple-600 to-indigo-600 relative">
                    <img
                      src={campaign.bannerUrl}
                      alt={`${campaign.tokenMetadata?.name || campaign.tokenName} banner`}
                      className="w-full h-full object-cover opacity-90"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}
                
                <div className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  {campaign.tokenLogoUrl && (
                    <img 
                      src={campaign.tokenLogoUrl} 
                      alt={campaign.tokenSymbol} 
                      className="w-20 h-20 rounded-full border-2 border-gray-700"
                    />
                  )}
                  <div>
                    <h1 className="heading-dark-1">{campaign.tokenMetadata?.name || campaign.tokenName}</h1>
                    <p className="text-xl text-purple-400 font-semibold">${campaign.tokenMetadata?.symbol || campaign.tokenSymbol}</p>
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  campaign.status === 'active' ? 'bg-green-500/20 text-green-400' :
                  campaign.status === 'funded' ? 'bg-blue-500/20 text-blue-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  {campaign.status}
                </div>
              </div>
              
              <p className="text-gray-400 mb-6 leading-relaxed">{campaign.description}</p>
              
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div className="space-y-2">
                  <p className="text-sm text-gray-500">Campaign Type</p>
                  <p className="text-white font-medium">
                    {campaign.campaignType ? 
                      campaign.campaignType.split('_').map(w => 
                        w.charAt(0).toUpperCase() + w.slice(1)
                      ).join(' ') 
                      : 'Enhanced Token Info'
                    }
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-gray-500">Created</p>
                  <p className="text-white font-medium">
                    {campaign.createdAt && !isNaN(new Date(campaign.createdAt).getTime()) 
                      ? format(new Date(campaign.createdAt), 'PPP')
                      : 'Unknown'
                    }
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-gray-500">Token Address</p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-gray-800 px-3 py-2 rounded text-gray-300 flex-1 font-mono break-all">
                      {campaign.tokenAddress || campaign.contractAddress || 'Unknown'}
                    </code>
                    <button 
                      className="text-gray-400 hover:text-white transition-colors p-2" 
                      onClick={() => copyAddress(campaign.tokenAddress || campaign.contractAddress)}
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                  <a
                    href={`https://dexscreener.com/solana/${campaign.tokenAddress || campaign.contractAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    View on DexScreener
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-gray-500">Campaign Creator</p>
                  <div className="flex items-center gap-2">
                    <code className="text-sm bg-gray-800 px-3 py-2 rounded text-gray-300 flex-1">
                      {campaign.creatorAddress?.slice(0, 8) || 'Unknown'}...{campaign.creatorAddress?.slice(-8)}
                    </code>
                    <button 
                      className="text-gray-400 hover:text-white transition-colors p-2"
                      onClick={() => copyAddress(campaign.creatorAddress)}
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                  <a
                    href={`https://solscan.io/account/${campaign.creatorAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    View Creator on Solscan
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>
              </div>
            </div>

          <div className="card-dark">
            <div className="border-b border-gray-800">
              <div className="flex space-x-8 px-6">
                <button 
                  className={`py-4 px-2 border-b-2 font-medium transition-colors ${
                    activeTab === 'contributions' 
                      ? 'border-purple-500 text-purple-400' 
                      : 'border-transparent text-gray-400 hover:text-gray-300'
                  }`}
                  onClick={() => setActiveTab('contributions')}
                >
                  Contributions
                </button>
                <button 
                  className={`py-4 px-2 border-b-2 font-medium transition-colors ${
                    activeTab === 'chat' 
                      ? 'border-purple-500 text-purple-400' 
                      : 'border-transparent text-gray-400 hover:text-gray-300'
                  }`}
                  onClick={() => setActiveTab('chat')}
                >
                  Chat
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {activeTab === 'contributions' ? (
                <>
                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-white mb-2">Recent Contributors</h3>
                    <p className="text-gray-400">
                      {contributions.length} total contributions
                    </p>
                  </div>
                  {contributions.length > 0 ? (
                    <div className="space-y-4">
                        {contributions.map((contribution) => (
                          <div key={contribution.id} className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <Wallet className="h-5 w-5 text-purple-400" />
                              <div>
                                <code className="text-sm text-gray-300">
                                  {contribution.contributorAddress.slice(0, 8)}...{contribution.contributorAddress.slice(-6)}
                                </code>
                                <p className="text-xs text-gray-500">
                                  {contribution.timestamp && !isNaN(new Date(contribution.timestamp).getTime()) 
                                    ? formatDistanceToNow(new Date(contribution.timestamp), { addSuffix: true })
                                    : 'Just now'
                                  }
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              {(() => {
                                // Most contributions are SOL since that's what we primarily accept
                                // Default to SOL unless explicitly marked as USDC
                                const currency = contribution.currency || 'SOL';
                                const formatted = formatContribution(contribution.amount, currency);
                                return (
                                  <>
                                    <p className="text-lg font-semibold text-white">
                                      {formatted.primary}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {formatted.secondary}
                                    </p>
                                  </>
                                );
                              })()}
                              <div className={`text-xs px-2 py-1 rounded ${
                                contribution.status === 'confirmed' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                              }`}>
                                {contribution.status}
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-gray-400">
                        No contributions yet. Be the first to support this campaign!
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <CampaignChat campaignId={id!} />
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card-dark">
            <div className="p-6">
              <h3 className="text-xl font-bold text-white mb-6">Funding Progress</h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <span className="text-3xl font-bold text-white">
                    ${campaign.currentAmount.toFixed(2)}
                  </span>
                  <span className="text-gray-400">
                    of ${campaign.targetAmount.toFixed(2)}
                  </span>
                </div>
                
                <div className="space-y-2">
                  <div className="w-full bg-gray-800 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-400">
                    {progress.toFixed(1)}% funded
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 py-6 border-t border-gray-800 mt-6">
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Users className="h-5 w-5 mr-2 text-blue-400" />
                    <span className="text-xl font-bold text-white">{contributions.length}</span>
                  </div>
                  <p className="text-sm text-gray-400">Contributions</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Clock className="h-5 w-5 mr-2 text-purple-400" />
                  </div>
                  <div className="text-lg font-bold text-white mb-1">{timeLeft}</div>
                  <p className="text-sm text-gray-400">Time left</p>
                </div>
              </div>

              {campaign.status === 'active' && (
                <button 
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center mt-6"
                  onClick={() => setShowContributeModal(true)}
                >
                  <DollarSign className="mr-2 h-5 w-5" />
                  Contribute Now
                </button>
              )}

            </div>
          </div>

          {campaign.status === 'completed' && campaign.serviceDetails && (
            <Card>
              <CardHeader>
                <CardTitle>Service Status</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge className="mb-2">Active</Badge>
                <p className="text-sm text-muted-foreground">
                  The DexScreener service has been successfully purchased and activated.
                </p>
              </CardContent>
            </Card>
          )}
          </div>
        </div>
        </div>

      <ContributeModal
        campaign={campaign}
        isOpen={showContributeModal}
        onClose={() => setShowContributeModal(false)}
        onSuccess={() => {
          refetch();
          refetchContributions();
        }}
      />
      </div>
    </Layout>
  );
}