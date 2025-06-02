import React, { useEffect, useState } from 'react';
import { useParams } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Campaign, Contribution } from '../types/campaign';
import { campaignAPI } from '../services/api';
import { wsService } from '../services/websocket';
import { ContributeModal } from '../components/ContributeModal';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Clock, Copy, DollarSign, ExternalLink, Loader2, Users, Wallet } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { useToast } from '../hooks/use-toast';
import { Layout } from '../components/Layout';

export function CampaignDetailPage() {
  const { id } = useParams();
  const { toast } = useToast();
  const [showContributeModal, setShowContributeModal] = useState(false);

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

  useEffect(() => {
    if (!id) return;

    // Subscribe to campaign updates
    wsService.subscribeToCampaign(id);

    const handleCampaignUpdate = (campaign: Campaign) => {
      if (campaign.id === id) {
        refetch();
      }
    };

    const handleNewContribution = (contribution: Contribution) => {
      if (contribution.campaignId === id) {
        refetchContributions();
        refetch();
      }
    };

    wsService.on('campaign_update', handleCampaignUpdate);
    wsService.on('new_contribution', handleNewContribution);

    return () => {
      wsService.unsubscribeFromCampaign(id);
      wsService.off('campaign_update', handleCampaignUpdate);
      wsService.off('new_contribution', handleNewContribution);
    };
  }, [id, refetch, refetchContributions]);

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
  const timeLeft = new Date(campaign.deadline) > new Date() 
    ? formatDistanceToNow(new Date(campaign.deadline), { addSuffix: true })
    : 'Ended';

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    toast({
      title: 'Address Copied',
      description: 'Address copied to clipboard',
    });
  };

  return (
    <Layout>
      <div className="container mx-auto py-8 space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  {campaign.tokenLogoUrl && (
                    <img 
                      src={campaign.tokenLogoUrl} 
                      alt={campaign.tokenSymbol} 
                      className="w-16 h-16 rounded-full"
                    />
                  )}
                  <div>
                    <CardTitle className="text-2xl">{campaign.tokenName}</CardTitle>
                    <CardDescription className="text-lg">${campaign.tokenSymbol}</CardDescription>
                  </div>
                </div>
                <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'}>
                  {campaign.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-6">{campaign.description}</p>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Campaign Type</p>
                  <p className="font-medium">
                    {campaign.campaignType.split('_').map(w => 
                      w.charAt(0).toUpperCase() + w.slice(1)
                    ).join(' ')}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="font-medium">
                    {format(new Date(campaign.createdAt), 'PPP')}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Token Address</p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs">{campaign.tokenAddress.slice(0, 8)}...</code>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => copyAddress(campaign.tokenAddress)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Creator</p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs">{campaign.creatorAddress.slice(0, 8)}...</code>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => copyAddress(campaign.creatorAddress)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="contributions" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="contributions">Contributions</TabsTrigger>
              <TabsTrigger value="updates">Updates</TabsTrigger>
            </TabsList>
            
            <TabsContent value="contributions" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Contributors</CardTitle>
                  <CardDescription>
                    {contributions.length} total contributions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {contributions.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Contributor</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Time</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {contributions.map((contribution) => (
                          <TableRow key={contribution.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Wallet className="h-4 w-4 text-muted-foreground" />
                                <code className="text-xs">
                                  {contribution.contributorAddress.slice(0, 8)}...
                                  {contribution.contributorAddress.slice(-6)}
                                </code>
                              </div>
                            </TableCell>
                            <TableCell>${contribution.amount.toFixed(2)}</TableCell>
                            <TableCell>
                              {formatDistanceToNow(new Date(contribution.timestamp), { 
                                addSuffix: true 
                              })}
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={contribution.status === 'confirmed' ? 'default' : 'secondary'}
                              >
                                {contribution.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      No contributions yet. Be the first to support this campaign!
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="updates" className="space-y-4">
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground py-8">
                    No updates yet. Check back later for campaign progress updates.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Funding Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-2xl font-bold">
                    ${campaign.currentAmount.toFixed(2)}
                  </span>
                  <span className="text-muted-foreground">
                    of ${campaign.targetAmount.toFixed(2)}
                  </span>
                </div>
                <Progress value={progress} className="h-3" />
                <p className="text-sm text-muted-foreground mt-2">
                  {progress.toFixed(1)}% funded
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="text-center">
                  <div className="flex items-center justify-center mb-1">
                    <Users className="h-4 w-4 mr-1" />
                    <span className="font-semibold">{contributions.length}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Contributors</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center mb-1">
                    <Clock className="h-4 w-4 mr-1" />
                    <span className="font-semibold">{timeLeft}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Time left</p>
                </div>
              </div>

              {campaign.status === 'active' && (
                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={() => setShowContributeModal(true)}
                >
                  <DollarSign className="mr-2 h-4 w-4" />
                  Contribute Now
                </Button>
              )}

              <div className="space-y-2 pt-4 border-t">
                <p className="text-sm font-medium">Campaign Wallet</p>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-muted p-2 rounded flex-1 overflow-hidden text-ellipsis">
                    {campaign.walletAddress}
                  </code>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => copyAddress(campaign.walletAddress)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <a
                  href={`https://solscan.io/account/${campaign.walletAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  View on Solscan
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </CardContent>
          </Card>

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