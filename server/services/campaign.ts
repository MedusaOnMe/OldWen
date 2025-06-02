import { db, collections } from '../lib/firebase.js';
import { generateCampaignWallet, getUSDCBalance, monitorWalletBalance } from './solana.js';
import { Campaign, CampaignStatus, CampaignType, Contribution } from '../../shared/types/campaign.js';
import { FieldValue } from 'firebase-admin/firestore';
import { refundService } from './refund.js';
import { transactionVerificationService } from './TransactionVerification.js';
import { heliusWebhookService } from './HeliusWebhook.js';
import { tokenMetadataService } from './TokenMetadata.js';

export class CampaignService {
  async createCampaign(data: {
    tokenAddress: string;
    tokenName: string;
    tokenSymbol: string;
    tokenLogoUrl?: string;
    campaignType: CampaignType;
    targetAmount: number;
    deadline: Date;
    description: string;
    creatorAddress: string;
  }): Promise<Campaign> {
    const campaignRef = db.collection(collections.campaigns).doc();
    const walletInfo = await generateCampaignWallet(campaignRef.id);
    
    // Enhance token metadata if not provided
    let enhancedData = { ...data };
    try {
      const tokenMetadata = await tokenMetadataService.getTokenMetadata(data.tokenAddress);
      if (!data.tokenName && tokenMetadata.name) {
        enhancedData.tokenName = tokenMetadata.name;
      }
      if (!data.tokenSymbol && tokenMetadata.symbol) {
        enhancedData.tokenSymbol = tokenMetadata.symbol;
      }
      if (!data.tokenLogoUrl && tokenMetadata.image) {
        enhancedData.tokenLogoUrl = tokenMetadata.image;
      }
    } catch (error) {
      console.warn('Failed to enhance token metadata:', error);
    }
    
    const campaign: Campaign = {
      id: campaignRef.id,
      ...enhancedData,
      currentAmount: 0,
      status: 'active',
      walletAddress: walletInfo.publicKey,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await campaignRef.set(campaign);
    
    // Set up real-time monitoring
    await this.setupCampaignMonitoring(campaign.id, walletInfo.publicKey);
    
    return campaign;
  }
  
  async getCampaign(id: string): Promise<Campaign | null> {
    const doc = await db.collection(collections.campaigns).doc(id).get();
    if (!doc.exists) return null;
    return doc.data() as Campaign;
  }
  
  async listCampaigns(filters?: {
    status?: CampaignStatus;
    tokenAddress?: string;
    campaignType?: CampaignType;
  }): Promise<Campaign[]> {
    // Simple query without composite index requirement
    let query = db.collection(collections.campaigns);
    
    // Only apply one filter at a time to avoid composite index requirement
    if (filters?.status) {
      query = query.where('status', '==', filters.status);
    } else if (filters?.tokenAddress) {
      query = query.where('tokenAddress', '==', filters.tokenAddress);
    } else if (filters?.campaignType) {
      query = query.where('campaignType', '==', filters.campaignType);
    }
    
    // Order by createdAt only if no filters are applied
    if (!filters?.status && !filters?.tokenAddress && !filters?.campaignType) {
      query = query.orderBy('createdAt', 'desc');
    }
    
    const snapshot = await query.limit(50).get();
    
    // Sort in memory if needed
    const campaigns = snapshot.docs.map(doc => doc.data() as Campaign);
    return campaigns.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA; // Descending order
    });
  }
  
  async updateCampaignAmount(campaignId: string, newAmount: number): Promise<void> {
    const campaignRef = db.collection(collections.campaigns).doc(campaignId);
    const campaign = await this.getCampaign(campaignId);
    
    if (!campaign) throw new Error('Campaign not found');
    
    const updates: any = {
      currentAmount: newAmount,
      updatedAt: new Date()
    };
    
    // Check if funding target reached
    if (newAmount >= campaign.targetAmount && campaign.status === 'active') {
      updates.status = 'funded';
      // Trigger service purchase in background
      this.triggerServicePurchase(campaignId).catch(console.error);
    }
    
    await campaignRef.update(updates);
  }
  
  async recordContribution(data: {
    campaignId: string;
    contributorAddress: string;
    amount: number;
    transactionHash: string;
  }): Promise<Contribution> {
    const contributionRef = db.collection(collections.contributions).doc();
    const contribution: Contribution = {
      id: contributionRef.id,
      ...data,
      timestamp: new Date(),
      status: 'pending'
    };
    
    await contributionRef.set(contribution);
    
    // Verify transaction on-chain
    this.verifyContribution(contribution.id, data.transactionHash).catch(console.error);
    
    return contribution;
  }
  
  async getContributions(campaignId: string): Promise<Contribution[]> {
    const snapshot = await db.collection(collections.contributions)
      .where('campaignId', '==', campaignId)
      .orderBy('timestamp', 'desc')
      .get();
    
    return snapshot.docs.map(doc => doc.data() as Contribution);
  }
  
  private async setupCampaignMonitoring(campaignId: string, walletAddress: string) {
    try {
      // Set up Helius webhook monitoring
      await heliusWebhookService.setupWebhookForCampaign(campaignId, walletAddress);
      
      // Start transaction verification monitoring
      await transactionVerificationService.monitorCampaignWallet(campaignId, walletAddress);
      
      console.log(`Monitoring setup complete for campaign ${campaignId}`);
    } catch (error) {
      console.error(`Failed to setup monitoring for campaign ${campaignId}:`, error);
      
      // Fallback to basic polling
      this.startBasicBalanceMonitoring(campaignId, walletAddress);
    }
  }

  private startBasicBalanceMonitoring(campaignId: string, walletAddress: string) {
    let lastBalance = 0;
    
    const unsubscribe = monitorWalletBalance(walletAddress, async (balance) => {
      if (balance !== lastBalance) {
        lastBalance = balance;
        await this.updateCampaignAmount(campaignId, balance);
      }
    });
    
    // Store unsubscribe function for cleanup
    // In production, you'd want to manage these subscriptions properly
  }
  
  private async verifyContribution(contributionId: string, txHash: string) {
    try {
      const contributionDoc = await db.collection(collections.contributions).doc(contributionId).get();
      if (!contributionDoc.exists) {
        throw new Error('Contribution not found');
      }
      
      const contribution = contributionDoc.data() as Contribution;
      
      // Use transaction verification service
      const verification = await transactionVerificationService.verifyTransaction(
        txHash, 
        contribution.campaignId, 
        contribution.amount
      );
      
      if (verification.valid) {
        await db.collection(collections.contributions).doc(contributionId).update({
          status: 'confirmed',
          verifiedAt: new Date()
        });
      } else {
        await db.collection(collections.contributions).doc(contributionId).update({
          status: 'failed',
          verificationError: verification.error
        });
      }
    } catch (error) {
      console.error(`Contribution verification failed for ${contributionId}:`, error);
      // Mark as failed if verification fails
      await db.collection(collections.contributions).doc(contributionId).update({
        status: 'failed',
        verificationError: error.message
      });
    }
  }
  
  private async triggerServicePurchase(campaignId: string) {
    try {
      const campaign = await this.getCampaign(campaignId);
      if (!campaign) {
        throw new Error('Campaign not found');
      }
      
      // Import DexScreener service to trigger purchase
      const { dexScreenerService } = await import('./DexScreenerService.js');
      const result = await dexScreenerService.purchaseService(campaignId, campaign);
      
      if (result.success) {
        console.log(`Service purchase successful for campaign ${campaignId}`);
      } else {
        console.error(`Service purchase failed for campaign ${campaignId}:`, result.error);
      }
    } catch (error) {
      console.error(`Failed to trigger service purchase for campaign ${campaignId}:`, error);
    }
  }
  
  async checkDeadlines(): Promise<void> {
    const now = new Date();
    const expiredCampaigns = await db.collection(collections.campaigns)
      .where('status', '==', 'active')
      .where('deadline', '<=', now)
      .get();
    
    for (const doc of expiredCampaigns.docs) {
      const campaign = doc.data() as Campaign;
      if (campaign.currentAmount < campaign.targetAmount) {
        await doc.ref.update({
          status: 'failed',
          updatedAt: now
        });
        
        // Trigger refunds
        this.processRefunds(campaign.id).catch(console.error);
      }
    }
  }
  
  private async processRefunds(campaignId: string) {
    try {
      await refundService.processRefunds(campaignId);
      
      // Update campaign status
      await db.collection(collections.campaigns).doc(campaignId).update({
        status: 'refunding',
        updatedAt: new Date()
      });
    } catch (error) {
      console.error(`Failed to process refunds for campaign ${campaignId}:`, error);
    }
  }
}

export const campaignService = new CampaignService();