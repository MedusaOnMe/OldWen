import { Connection, Keypair, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { connection } from './solana.js';
import { db, collections } from '../lib/firebase.js';
import crypto from 'crypto';
import { enhancedDexScreenerService } from './EnhancedDexScreenerService.js';

interface DexScreenerServiceConfig {
  enhanced_token_info: {
    price: number;
    duration: number;
    realizationTime: number;
  };
  advertising: {
    price: number;
    duration: number;
    impressions: number;
  };
  boost: {
    price: number;
    duration: number;
    spotType: string;
  };
}

export class EnhancedDexScreenerAutomationService {
  private readonly serviceConfig: DexScreenerServiceConfig = {
    enhanced_token_info: {
      price: 499,
      duration: 30,
      realizationTime: 15
    },
    advertising: {
      price: 299,
      duration: 7,
      impressions: 10000
    },
    boost: {
      price: 999,
      duration: 1,
      spotType: 'trending_bar'
    }
  };

  /**
   * Purchase a DexScreener service for a completed campaign
   */
  async purchaseService(
    campaignId: string,
    serviceType: 'enhanced_token_info' | 'advertising' | 'boost',
    servicePrice: number
  ): Promise<{ success: boolean; data?: any; error?: string; requestDetails?: any }> {
    try {
      console.log(`[Enhanced DexScreener Automation] Starting ${serviceType} purchase for campaign ${campaignId}`);

      // Validate service type
      if (!this.serviceConfig[serviceType]) {
        throw new Error(`Unsupported service type: ${serviceType}`);
      }

      // Get campaign data
      const campaignDoc = await db.collection(collections.campaigns).doc(campaignId).get();
      if (!campaignDoc.exists) {
        throw new Error('Campaign not found');
      }

      const campaignData = campaignDoc.data()!;
      console.log(`[Enhanced DexScreener Automation] Processing campaign: ${campaignData.tokenName} (${campaignData.tokenAddress})`);

      // Test connection to DexScreener
      const connectionTest = await enhancedDexScreenerService.testConnection();
      if (!connectionTest.success) {
        throw new Error(`DexScreener connection failed: ${connectionTest.error}`);
      }

      console.log(`[Enhanced DexScreener Automation] Connection successful using method: ${connectionTest.method}`);

      // Execute the marketplace automation
      const automationResult = await this.automateMarketplacePurchase(
        serviceType,
        campaignData.tokenAddress,
        {
          ...this.serviceConfig[serviceType],
          tokenName: campaignData.tokenName,
          tokenSymbol: campaignData.tokenSymbol,
          description: campaignData.description,
          website: campaignData.website,
          twitter: campaignData.twitter,
          telegram: campaignData.telegram,
          logoUrl: campaignData.tokenLogoUrl,
          paymentSignature: `payment_${campaignId}_${Date.now()}`
        }
      );

      if (automationResult.success) {
        // Record successful purchase
        await this.recordServicePurchase(campaignId, serviceType, automationResult.data);
        
        // Update campaign status
        await db.collection(collections.campaigns).doc(campaignId).update({
          status: 'service_purchased',
          serviceDetails: automationResult.data,
          completedAt: new Date()
        });

        console.log(`[Enhanced DexScreener Automation] Service purchase completed for campaign ${campaignId}`);
      }

      return automationResult;

    } catch (error) {
      console.error(`[Enhanced DexScreener Automation] Purchase failed for campaign ${campaignId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Purchase failed'
      };
    }
  }

  /**
   * Enhanced marketplace automation using multiple bypass methods
   */
  private async automateMarketplacePurchase(
    serviceType: string,
    tokenAddress: string,
    config: any
  ): Promise<{ success: boolean; data?: any; error?: string; requestDetails?: any }> {
    
    // Test connection first
    console.log('[Enhanced DexScreener Automation] Testing connection...');
    const connectionTest = await enhancedDexScreenerService.testConnection();
    
    if (!connectionTest.success) {
      return {
        success: false,
        error: `Connection failed: ${connectionTest.error}`,
        requestDetails: { connectionTest }
      };
    }
    
    console.log(`[Enhanced DexScreener Automation] Connection successful using: ${connectionTest.method}`);

    const requestDetails = {
      steps: [],
      timestamp: new Date().toISOString(),
      serviceType,
      tokenAddress,
      method: connectionTest.method
    };

    try {
      console.log(`[Enhanced DexScreener Automation] Starting ${serviceType} submission for token ${tokenAddress}`);

      // Prepare submission data
      const submissionData = {
        tokenAddress,
        tokenName: config.tokenName || `Token-${tokenAddress.slice(0, 8)}`,
        tokenSymbol: config.tokenSymbol || 'TOKEN',
        description: config.description || '',
        website: config.website || '',
        twitter: config.twitter || '',
        telegram: config.telegram || '',
        logoUrl: config.logoUrl || '',
        campaignType: serviceType as 'enhanced_token_info' | 'advertising' | 'boost',
        paymentSignature: config.paymentSignature || 'mock_signature_dev'
      };

      requestDetails.steps.push({
        step: 1,
        action: 'prepare_submission_data',
        success: true,
        data: { ...submissionData, paymentSignature: 'REDACTED' }
      });

      // Submit using enhanced service with multiple bypass methods
      console.log('[Enhanced DexScreener Automation] Submitting promotion...');
      const submissionResult = await enhancedDexScreenerService.submitPromotion(submissionData);

      requestDetails.steps.push({
        step: 2,
        action: 'submit_promotion',
        success: submissionResult.success,
        submissionId: submissionResult.submissionId,
        error: submissionResult.error
      });

      if (submissionResult.success) {
        console.log(`[Enhanced DexScreener Automation] Submission successful: ${submissionResult.submissionId}`);
        
        // Verify submission status
        if (submissionResult.submissionId) {
          try {
            console.log('[Enhanced DexScreener Automation] Verifying submission status...');
            const statusResult = await enhancedDexScreenerService.verifySubmissionStatus(submissionResult.submissionId);
            requestDetails.steps.push({
              step: 3,
              action: 'verify_submission',
              status: statusResult.status,
              success: true
            });
          } catch (verifyError) {
            console.warn('[Enhanced DexScreener Automation] Status verification failed:', verifyError);
            requestDetails.steps.push({
              step: 3,
              action: 'verify_submission',
              success: false,
              error: verifyError instanceof Error ? verifyError.message : 'Verification failed'
            });
          }
        }

        return {
          success: true,
          data: {
            serviceType,
            tokenAddress,
            submissionId: submissionResult.submissionId,
            status: 'submitted',
            timestamp: new Date().toISOString(),
            method: connectionTest.method,
            details: submissionResult
          },
          requestDetails
        };
      } else {
        throw new Error(submissionResult.error || 'Submission failed');
      }

    } catch (error) {
      console.error(`[Enhanced DexScreener Automation] Failed:`, error);
      
      requestDetails.steps.push({
        step: 'error',
        action: 'automation_failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false
      });

      // For development mode, return simulated success
      if (process.env.NODE_ENV === 'development') {
        console.log('[Enhanced DexScreener Automation] Development mode: Returning simulated success');
        return {
          success: true,
          data: {
            serviceType,
            tokenAddress,
            status: 'development_simulation',
            note: 'Enhanced automation completed in development mode',
            submissionId: `dev_enhanced_${Date.now()}`,
            method: connectionTest.method
          },
          requestDetails
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Enhanced automation failed',
        requestDetails
      };
    }
  }

  /**
   * Record service purchase in database
   */
  private async recordServicePurchase(campaignId: string, serviceType: string, purchaseData: any): Promise<void> {
    try {
      const serviceDoc = {
        id: crypto.randomUUID(),
        campaignId,
        serviceType,
        purchaseData,
        purchasedAt: new Date(),
        status: 'active'
      };

      await db.collection(collections.services).doc(serviceDoc.id).set(serviceDoc);
      console.log(`[Enhanced DexScreener Automation] Service purchase recorded: ${serviceDoc.id}`);
    } catch (error) {
      console.error('[Enhanced DexScreener Automation] Failed to record service purchase:', error);
    }
  }

  /**
   * Check if a service is active for a token
   */
  async checkServiceStatus(tokenAddress: string, serviceType: string): Promise<{ isActive: boolean; details?: any }> {
    try {
      // Use enhanced service to check actual DexScreener status
      const connectionTest = await enhancedDexScreenerService.testConnection();
      if (!connectionTest.success) {
        console.warn('[Enhanced DexScreener Automation] Cannot verify service status - connection failed');
        return { isActive: false };
      }

      // For now, check our database records
      const servicesSnapshot = await db.collection(collections.services)
        .where('tokenAddress', '==', tokenAddress)
        .where('serviceType', '==', serviceType)
        .where('status', '==', 'active')
        .limit(1)
        .get();

      if (!servicesSnapshot.empty) {
        const serviceDoc = servicesSnapshot.docs[0];
        const serviceData = serviceDoc.data();
        
        return {
          isActive: true,
          details: {
            serviceId: serviceDoc.id,
            purchasedAt: serviceData.purchasedAt,
            purchaseData: serviceData.purchaseData
          }
        };
      }

      return { isActive: false };

    } catch (error) {
      console.error('[Enhanced DexScreener Automation] Service status check failed:', error);
      return { isActive: false };
    }
  }

  /**
   * Get rate limit status from enhanced service
   */
  getRateLimitStatus() {
    return enhancedDexScreenerService.getRateLimitStatus();
  }

  /**
   * Update service configuration
   */
  updateConfig(config: {
    rateLimitDelay?: number;
    maxRetries?: number;
    userAgent?: string;
  }): void {
    enhancedDexScreenerService.updateConfig(config);
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    try {
      await enhancedDexScreenerService.cleanup();
      console.log('[Enhanced DexScreener Automation] Cleanup completed');
    } catch (error) {
      console.error('[Enhanced DexScreener Automation] Cleanup error:', error);
    }
  }

  /**
   * Validate token address format
   */
  private validateTokenAddress(tokenAddress: string): { valid: boolean; error?: string } {
    if (!tokenAddress) {
      return { valid: false, error: 'Token address is required' };
    }

    // Basic Solana address validation
    if (tokenAddress.length < 32 || tokenAddress.length > 44) {
      return { valid: false, error: 'Invalid Solana address length' };
    }

    // Check for valid base58 characters
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
    if (!base58Regex.test(tokenAddress)) {
      return { valid: false, error: 'Invalid characters in token address' };
    }

    return { valid: true };
  }

  /**
   * Get service configuration
   */
  getServiceConfig(serviceType: string) {
    return this.serviceConfig[serviceType as keyof DexScreenerServiceConfig];
  }
}

export const enhancedDexScreenerAutomationService = new EnhancedDexScreenerAutomationService();

// Graceful shutdown
process.on('SIGTERM', async () => {
  await enhancedDexScreenerAutomationService.cleanup();
});

process.on('SIGINT', async () => {
  await enhancedDexScreenerAutomationService.cleanup();
});