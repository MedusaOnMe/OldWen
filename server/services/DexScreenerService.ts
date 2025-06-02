import axios from 'axios';
import { Connection, PublicKey, Transaction, SystemProgram, sendAndConfirmTransaction } from '@solana/web3.js';
import { getAssociatedTokenAddress, createTransferInstruction, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { connection } from './solana.js';
import { decryptPrivateKey } from './solana.js';
import { db, collections } from '../lib/firebase.js';
import { Campaign, Service } from '../../shared/types/campaign.js';
import { wsService } from './websocket.js';

const DEXSCREENER_API_ENDPOINT = process.env.DEXSCREENER_API_ENDPOINT || 'https://api.dexscreener.com/latest';
const DEXSCREENER_PAYMENT_WALLET = process.env.DEXSCREENER_PAYMENT_WALLET;
const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';

interface DexScreenerTokenInfo {
  address: string;
  name: string;
  symbol: string;
  logoURI?: string;
  description?: string;
  website?: string;
  twitter?: string;
  telegram?: string;
  discord?: string;
  coingeckoId?: string;
  coinmarketcapId?: string;
}

interface EnhancedTokenInfoRequest {
  tokenAddress: string;
  tokenInfo: DexScreenerTokenInfo;
  paymentSignature: string;
  submittedBy: string;
  campaignId: string;
}

interface ServicePurchaseResult {
  success: boolean;
  serviceId?: string;
  confirmationData?: any;
  error?: string;
  retryable?: boolean;
}

export class DexScreenerService {
  private purchaseQueue: Map<string, Date> = new Map();
  private maxRetries = 3;
  private retryDelay = 30000; // 30 seconds

  /**
   * Purchase DexScreener service when campaign reaches target
   */
  async purchaseService(campaignId: string, campaignData: Campaign): Promise<ServicePurchaseResult> {
    console.log(`Initiating DexScreener service purchase for campaign ${campaignId}`);

    // In development mode, simulate successful purchase
    if (IS_DEVELOPMENT) {
      console.log('Development mode: Simulating DexScreener purchase');
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate processing time
      
      return {
        success: true,
        serviceId: `dev_service_${Date.now()}`,
        confirmationData: {
          paymentSignature: `dev_payment_${Date.now()}`,
          submissionId: `dev_submission_${Date.now()}`,
          activationConfirmed: true,
          activationUrl: `https://dexscreener.com/solana/${campaignData.tokenAddress}`
        }
      };
    }

    try {
      // Prevent duplicate purchase attempts
      if (this.purchaseQueue.has(campaignId)) {
        console.log(`Purchase already in progress for campaign ${campaignId}`);
        return { success: false, error: 'Purchase already in progress', retryable: false };
      }

      this.purchaseQueue.set(campaignId, new Date());

      // Validate campaign is ready for purchase
      const validation = await this.validateCampaignForPurchase(campaignId, campaignData);
      if (!validation.valid) {
        this.purchaseQueue.delete(campaignId);
        return { success: false, error: validation.error, retryable: validation.retryable };
      }

      // Execute purchase based on campaign type
      let result: ServicePurchaseResult;
      switch (campaignData.campaignType) {
        case 'enhanced_token_info':
          result = await this.purchaseEnhancedTokenInfo(campaignId, campaignData);
          break;
        case 'advertising':
          result = await this.purchaseAdvertising(campaignId, campaignData);
          break;
        case 'boost':
          result = await this.purchaseBoost(campaignId, campaignData);
          break;
        default:
          result = { success: false, error: 'Unsupported campaign type', retryable: false };
      }

      // Record purchase attempt
      await this.recordPurchaseAttempt(campaignId, result);

      if (result.success) {
        await this.completeCampaign(campaignId, result);
        this.broadcastSuccess(campaignId, result);
      } else if (result.retryable) {
        this.scheduleRetry(campaignId, campaignData);
      }

      this.purchaseQueue.delete(campaignId);
      return result;

    } catch (error) {
      console.error(`Service purchase failed for campaign ${campaignId}:`, error);
      this.purchaseQueue.delete(campaignId);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown purchase error',
        retryable: true
      };
    }
  }

  /**
   * Purchase Enhanced Token Info service ($299)
   */
  private async purchaseEnhancedTokenInfo(campaignId: string, campaignData: Campaign): Promise<ServicePurchaseResult> {
    console.log(`Purchasing Enhanced Token Info for campaign ${campaignId}`);

    try {
      // Step 1: Make payment to DexScreener
      const paymentResult = await this.makePaymentToDexScreener(campaignId, 299);
      if (!paymentResult.success) {
        return paymentResult;
      }

      // Step 2: Fetch token metadata
      const tokenMetadata = await this.fetchTokenMetadata(campaignData.tokenAddress);

      // Step 3: Submit Enhanced Token Info request
      const submissionResult = await this.submitEnhancedTokenInfo({
        tokenAddress: campaignData.tokenAddress,
        tokenInfo: {
          address: campaignData.tokenAddress,
          name: campaignData.tokenName,
          symbol: campaignData.tokenSymbol,
          logoURI: campaignData.tokenLogoUrl,
          description: campaignData.description,
          ...tokenMetadata
        },
        paymentSignature: paymentResult.signature!,
        submittedBy: campaignData.creatorAddress,
        campaignId
      });

      if (!submissionResult.success) {
        // Payment was made but submission failed - this needs manual review
        await this.recordFailedSubmission(campaignId, paymentResult.signature!, submissionResult.error);
        return {
          success: false,
          error: `Payment successful but submission failed: ${submissionResult.error}`,
          retryable: true
        };
      }

      // Step 4: Verify service activation
      const activationResult = await this.verifyServiceActivation(campaignData.tokenAddress, 'enhanced_info');

      return {
        success: true,
        serviceId: submissionResult.serviceId,
        confirmationData: {
          paymentSignature: paymentResult.signature,
          submissionId: submissionResult.serviceId,
          activationConfirmed: activationResult.confirmed,
          activationUrl: activationResult.url
        }
      };

    } catch (error) {
      console.error('Enhanced Token Info purchase error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Purchase failed',
        retryable: true
      };
    }
  }

  /**
   * Purchase Advertising service (custom budget)
   */
  private async purchaseAdvertising(campaignId: string, campaignData: Campaign): Promise<ServicePurchaseResult> {
    console.log(`Purchasing Advertising for campaign ${campaignId}`);

    try {
      const amount = campaignData.targetAmount;

      // Make payment
      const paymentResult = await this.makePaymentToDexScreener(campaignId, amount);
      if (!paymentResult.success) {
        return paymentResult;
      }

      // Submit advertising request
      const adRequest = {
        tokenAddress: campaignData.tokenAddress,
        campaignBudget: amount,
        paymentSignature: paymentResult.signature!,
        adType: 'banner', // Could be configurable
        duration: Math.floor(amount / 50), // Example: $50 per day
        submittedBy: campaignData.creatorAddress,
        campaignId
      };

      const submissionResult = await this.submitAdvertisingRequest(adRequest);

      return {
        success: submissionResult.success,
        serviceId: submissionResult.serviceId,
        confirmationData: submissionResult.success ? {
          paymentSignature: paymentResult.signature,
          adCampaignId: submissionResult.serviceId,
          budget: amount,
          estimatedDuration: adRequest.duration
        } : undefined,
        error: submissionResult.error
      };

    } catch (error) {
      console.error('Advertising purchase error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Advertising purchase failed',
        retryable: true
      };
    }
  }

  /**
   * Purchase Boost service (variable pricing)
   */
  private async purchaseBoost(campaignId: string, campaignData: Campaign): Promise<ServicePurchaseResult> {
    console.log(`Purchasing Boost for campaign ${campaignId}`);

    try {
      const amount = campaignData.targetAmount;

      // Make payment
      const paymentResult = await this.makePaymentToDexScreener(campaignId, amount);
      if (!paymentResult.success) {
        return paymentResult;
      }

      // Submit boost request
      const boostRequest = {
        tokenAddress: campaignData.tokenAddress,
        boostAmount: amount,
        paymentSignature: paymentResult.signature!,
        boostType: this.determineBoostType(amount),
        submittedBy: campaignData.creatorAddress,
        campaignId
      };

      const submissionResult = await this.submitBoostRequest(boostRequest);

      return {
        success: submissionResult.success,
        serviceId: submissionResult.serviceId,
        confirmationData: submissionResult.success ? {
          paymentSignature: paymentResult.signature,
          boostId: submissionResult.serviceId,
          boostType: boostRequest.boostType,
          amount: amount
        } : undefined,
        error: submissionResult.error
      };

    } catch (error) {
      console.error('Boost purchase error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Boost purchase failed',
        retryable: true
      };
    }
  }

  /**
   * Make USDC payment to DexScreener wallet
   */
  private async makePaymentToDexScreener(campaignId: string, amount: number): Promise<{
    success: boolean;
    signature?: string;
    error?: string;
  }> {
    try {
      if (!DEXSCREENER_PAYMENT_WALLET) {
        throw new Error('DexScreener payment wallet not configured');
      }

      // Get campaign wallet
      const walletDoc = await db.collection(collections.wallets).doc(campaignId).get();
      if (!walletDoc.exists) {
        throw new Error('Campaign wallet not found');
      }

      const walletData = walletDoc.data()!;
      const campaignKeypair = await decryptPrivateKey(walletData.encryptedPrivateKey);

      // Get token accounts
      const fromTokenAccount = await getAssociatedTokenAddress(USDC_MINT, campaignKeypair.publicKey);
      const toPublicKey = new PublicKey(DEXSCREENER_PAYMENT_WALLET);
      const toTokenAccount = await getAssociatedTokenAddress(USDC_MINT, toPublicKey);

      // Create transfer instruction
      const transferInstruction = createTransferInstruction(
        fromTokenAccount,
        toTokenAccount,
        campaignKeypair.publicKey,
        amount * 1e6, // USDC has 6 decimals
        [],
        TOKEN_PROGRAM_ID
      );

      // Create and send transaction
      const transaction = new Transaction().add(transferInstruction);
      const signature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [campaignKeypair],
        { commitment: 'confirmed' }
      );

      console.log(`Payment sent to DexScreener: ${amount} USDC, signature: ${signature}`);

      // Record payment
      await this.recordPayment(campaignId, amount, signature, DEXSCREENER_PAYMENT_WALLET);

      return { success: true, signature };

    } catch (error) {
      console.error('Payment to DexScreener failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment failed'
      };
    }
  }

  /**
   * Submit Enhanced Token Info to DexScreener
   */
  private async submitEnhancedTokenInfo(request: EnhancedTokenInfoRequest): Promise<{
    success: boolean;
    serviceId?: string;
    error?: string;
  }> {
    try {
      // Note: This is a mock implementation as DexScreener API details are not public
      // In production, this would integrate with their actual submission system
      
      console.log('Submitting Enhanced Token Info request:', request);

      // Simulate API call to DexScreener
      const response = await this.mockDexScreenerSubmission('enhanced_token_info', request);

      if (response.success) {
        console.log(`Enhanced Token Info submitted successfully: ${response.serviceId}`);
        return {
          success: true,
          serviceId: response.serviceId
        };
      } else {
        return {
          success: false,
          error: response.error || 'Submission failed'
        };
      }

    } catch (error) {
      console.error('Enhanced Token Info submission error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Submission error'
      };
    }
  }

  /**
   * Submit advertising request to DexScreener
   */
  private async submitAdvertisingRequest(request: any): Promise<{
    success: boolean;
    serviceId?: string;
    error?: string;
  }> {
    try {
      console.log('Submitting advertising request:', request);

      // Mock implementation
      const response = await this.mockDexScreenerSubmission('advertising', request);

      return {
        success: response.success,
        serviceId: response.serviceId,
        error: response.error
      };

    } catch (error) {
      console.error('Advertising submission error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Advertising submission error'
      };
    }
  }

  /**
   * Submit boost request to DexScreener
   */
  private async submitBoostRequest(request: any): Promise<{
    success: boolean;
    serviceId?: string;
    error?: string;
  }> {
    try {
      console.log('Submitting boost request:', request);

      // Mock implementation
      const response = await this.mockDexScreenerSubmission('boost', request);

      return {
        success: response.success,
        serviceId: response.serviceId,
        error: response.error
      };

    } catch (error) {
      console.error('Boost submission error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Boost submission error'
      };
    }
  }

  /**
   * Mock DexScreener API submission (replace with real API calls)
   */
  private async mockDexScreenerSubmission(serviceType: string, request: any): Promise<{
    success: boolean;
    serviceId?: string;
    error?: string;
  }> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Simulate 95% success rate
    const success = Math.random() > 0.05;

    if (success) {
      return {
        success: true,
        serviceId: `${serviceType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
    } else {
      return {
        success: false,
        error: 'DexScreener API temporarily unavailable'
      };
    }
  }

  /**
   * Fetch token metadata from various sources
   */
  private async fetchTokenMetadata(tokenAddress: string): Promise<Partial<DexScreenerTokenInfo>> {
    try {
      // Try Helius DAS API first
      if (process.env.HELIUS_API_KEY) {
        const heliusMetadata = await this.fetchHeliusMetadata(tokenAddress);
        if (heliusMetadata) {
          return heliusMetadata;
        }
      }

      // Fallback to other metadata sources
      const metadata = await this.fetchFallbackMetadata(tokenAddress);
      return metadata;

    } catch (error) {
      console.error('Token metadata fetch error:', error);
      return {};
    }
  }

  /**
   * Fetch metadata from Helius DAS API
   */
  private async fetchHeliusMetadata(tokenAddress: string): Promise<Partial<DexScreenerTokenInfo> | null> {
    try {
      const response = await axios.post(
        `https://api.helius.xyz/v0/token-metadata?api-key=${process.env.HELIUS_API_KEY}`,
        {
          mintAccounts: [tokenAddress]
        }
      );

      const metadata = response.data?.[0];
      if (!metadata) return null;

      return {
        logoURI: metadata.offChainMetadata?.image,
        description: metadata.offChainMetadata?.description,
        website: metadata.offChainMetadata?.external_url,
        twitter: this.extractTwitter(metadata.offChainMetadata),
        telegram: this.extractTelegram(metadata.offChainMetadata)
      };

    } catch (error) {
      console.error('Helius metadata fetch error:', error);
      return null;
    }
  }

  /**
   * Fallback metadata fetching
   */
  private async fetchFallbackMetadata(tokenAddress: string): Promise<Partial<DexScreenerTokenInfo>> {
    try {
      // Try Jupiter API or other sources
      const response = await axios.get(`https://cache.jup.ag/tokens/${tokenAddress}`);
      const data = response.data;

      return {
        logoURI: data.logoURI,
        description: data.description || '',
        website: data.extensions?.website,
        twitter: data.extensions?.twitter,
        telegram: data.extensions?.telegram
      };

    } catch (error) {
      console.error('Fallback metadata fetch error:', error);
      return {};
    }
  }

  /**
   * Verify service activation on DexScreener
   */
  private async verifyServiceActivation(tokenAddress: string, serviceType: string): Promise<{
    confirmed: boolean;
    url?: string;
    error?: string;
  }> {
    try {
      // Check if token appears in DexScreener with enhanced info
      const response = await axios.get(`${DEXSCREENER_API_ENDPOINT}/dex/tokens/${tokenAddress}`);
      
      if (response.data && response.data.pairs && response.data.pairs.length > 0) {
        const pair = response.data.pairs[0];
        const hasEnhancedInfo = pair.info?.websites?.length > 0 || pair.info?.socials?.length > 0;
        
        return {
          confirmed: hasEnhancedInfo,
          url: `https://dexscreener.com/solana/${tokenAddress}`
        };
      }

      return { confirmed: false, error: 'Token not found on DexScreener' };

    } catch (error) {
      console.error('Service activation verification error:', error);
      return {
        confirmed: false,
        error: error instanceof Error ? error.message : 'Verification failed'
      };
    }
  }

  /**
   * Validate campaign is ready for purchase
   */
  private async validateCampaignForPurchase(campaignId: string, campaignData: Campaign): Promise<{
    valid: boolean;
    error?: string;
    retryable?: boolean;
  }> {
    try {
      // Check campaign status
      if (campaignData.status !== 'funded') {
        return { valid: false, error: 'Campaign is not in funded status', retryable: false };
      }

      // Check balance is sufficient
      if (campaignData.currentAmount < campaignData.targetAmount) {
        return { valid: false, error: 'Insufficient funds for purchase', retryable: true };
      }

      // Check deadline hasn't passed
      if (new Date() > new Date(campaignData.deadline)) {
        return { valid: false, error: 'Campaign deadline has passed', retryable: false };
      }

      // Check if already purchased
      const existingService = await db.collection(collections.services)
        .where('campaignId', '==', campaignId)
        .where('status', '==', 'active')
        .limit(1)
        .get();

      if (!existingService.empty) {
        return { valid: false, error: 'Service already purchased for this campaign', retryable: false };
      }

      return { valid: true };

    } catch (error) {
      console.error('Campaign validation error:', error);
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Validation failed',
        retryable: true
      };
    }
  }

  /**
   * Record purchase attempt in database
   */
  private async recordPurchaseAttempt(campaignId: string, result: ServicePurchaseResult): Promise<void> {
    try {
      const attemptRef = db.collection('purchase_attempts').doc();
      await attemptRef.set({
        id: attemptRef.id,
        campaignId,
        timestamp: new Date(),
        success: result.success,
        error: result.error,
        retryable: result.retryable,
        serviceId: result.serviceId,
        confirmationData: result.confirmationData
      });
    } catch (error) {
      console.error('Error recording purchase attempt:', error);
    }
  }

  /**
   * Complete campaign after successful purchase
   */
  private async completeCampaign(campaignId: string, result: ServicePurchaseResult): Promise<void> {
    try {
      // Update campaign status
      await db.collection(collections.campaigns).doc(campaignId).update({
        status: 'completed',
        completedAt: new Date(),
        serviceDetails: result.confirmationData
      });

      // Create service record
      const serviceRef = db.collection(collections.services).doc();
      const service: Service = {
        id: serviceRef.id,
        campaignId,
        serviceType: (await db.collection(collections.campaigns).doc(campaignId).get()).data()!.campaignType,
        purchaseDetails: result.confirmationData || {},
        confirmationData: result.confirmationData || {},
        purchasedAt: new Date(),
        status: 'active'
      };

      await serviceRef.set(service);

      console.log(`Campaign ${campaignId} completed successfully`);

    } catch (error) {
      console.error('Error completing campaign:', error);
    }
  }

  /**
   * Schedule retry for failed purchase
   */
  private scheduleRetry(campaignId: string, campaignData: Campaign): void {
    setTimeout(async () => {
      console.log(`Retrying purchase for campaign ${campaignId}`);
      await this.purchaseService(campaignId, campaignData);
    }, this.retryDelay);
  }

  /**
   * Broadcast success notification
   */
  private broadcastSuccess(campaignId: string, result: ServicePurchaseResult): void {
    try {
      if (wsService) {
        wsService.broadcast({
          type: 'service_purchased',
          campaignId,
          serviceDetails: result.confirmationData
        });
      }
    } catch (error) {
      console.error('Error broadcasting success:', error);
    }
  }

  /**
   * Utility functions
   */
  private determineBoostType(amount: number): string {
    if (amount >= 1000) return 'premium';
    if (amount >= 500) return 'standard';
    return 'basic';
  }

  private extractTwitter(metadata: any): string | undefined {
    if (!metadata) return undefined;
    return metadata.twitter || metadata.social?.twitter || 
           metadata.links?.find((l: any) => l.type === 'twitter')?.url;
  }

  private extractTelegram(metadata: any): string | undefined {
    if (!metadata) return undefined;
    return metadata.telegram || metadata.social?.telegram || 
           metadata.links?.find((l: any) => l.type === 'telegram')?.url;
  }

  private async recordPayment(campaignId: string, amount: number, signature: string, recipient: string): Promise<void> {
    try {
      const paymentRef = db.collection('payments').doc();
      await paymentRef.set({
        id: paymentRef.id,
        campaignId,
        amount,
        signature,
        recipient,
        timestamp: new Date(),
        type: 'dexscreener_service_payment'
      });
    } catch (error) {
      console.error('Error recording payment:', error);
    }
  }

  private async recordFailedSubmission(campaignId: string, paymentSignature: string, error?: string): Promise<void> {
    try {
      const failureRef = db.collection('failed_submissions').doc();
      await failureRef.set({
        id: failureRef.id,
        campaignId,
        paymentSignature,
        error,
        timestamp: new Date(),
        needsManualReview: true
      });
    } catch (error) {
      console.error('Error recording failed submission:', error);
    }
  }

  /**
   * Get purchase status for a campaign
   */
  async getPurchaseStatus(campaignId: string): Promise<{
    purchased: boolean;
    status?: string;
    details?: any;
    attempts?: number;
  }> {
    try {
      // Check if service exists
      const serviceDoc = await db.collection(collections.services)
        .where('campaignId', '==', campaignId)
        .limit(1)
        .get();

      if (!serviceDoc.empty) {
        const service = serviceDoc.docs[0].data();
        return {
          purchased: true,
          status: service.status,
          details: service.confirmationData
        };
      }

      // Check purchase attempts
      const attemptsSnapshot = await db.collection('purchase_attempts')
        .where('campaignId', '==', campaignId)
        .get();

      return {
        purchased: false,
        attempts: attemptsSnapshot.size,
        status: attemptsSnapshot.empty ? 'not_attempted' : 'failed'
      };

    } catch (error) {
      console.error('Error getting purchase status:', error);
      return { purchased: false };
    }
  }

  /**
   * Manual purchase trigger for admin
   */
  async manualPurchaseTrigger(campaignId: string): Promise<ServicePurchaseResult> {
    try {
      const campaignDoc = await db.collection(collections.campaigns).doc(campaignId).get();
      if (!campaignDoc.exists) {
        return { success: false, error: 'Campaign not found', retryable: false };
      }

      const campaignData = campaignDoc.data() as Campaign;
      return await this.purchaseService(campaignId, campaignData);

    } catch (error) {
      console.error('Manual purchase trigger error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Manual trigger failed',
        retryable: true
      };
    }
  }
}

export const dexScreenerService = new DexScreenerService();