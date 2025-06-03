import { Request, Response } from 'express';
import crypto from 'crypto';
import { db, collections } from '../lib/firebase.js';
import { transactionVerificationService } from './TransactionVerification.js';
import { campaignService } from './campaign.js';
import { wsService } from './websocket.js';

const WEBHOOK_SECRET = process.env.HELIUS_WEBHOOK_SECRET;
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

interface HeliusWebhookPayload {
  signature: string;
  slot: number;
  timestamp: number;
  type: string;
  accountData: Array<{
    account: string;
    nativeBalanceChange: number;
    tokenBalanceChanges: Array<{
      mint: string;
      rawTokenAmount: {
        tokenAmount: string;
        decimals: number;
      };
      tokenAccount: string;
      userAccount: string;
    }>;
  }>;
  tokenTransfers: Array<{
    fromTokenAccount: string;
    toTokenAccount: string;
    fromUserAccount: string;
    toUserAccount: string;
    tokenAmount: number;
    mint: string;
  }>;
  nativeTransfers?: Array<{
    fromUserAccount: string;
    toUserAccount: string;
    amount: number;
  }>;
  instructions: Array<{
    accounts: string[];
    data: string;
    programId: string;
    innerInstructions: any[];
  }>;
  events: any;
}

export class HeliusWebhookService {
  /**
   * Process incoming Helius webhook
   */
  async processWebhook(req: Request, res: Response): Promise<void> {
    try {
      // Verify webhook signature
      if (!this.verifyWebhookSignature(req)) {
        console.warn('Invalid webhook signature');
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const payload: HeliusWebhookPayload[] = req.body;
      
      if (!Array.isArray(payload)) {
        res.status(400).json({ error: 'Invalid payload format' });
        return;
      }

      console.log(`Processing ${payload.length} webhook events`);

      // Process each transaction
      for (const transaction of payload) {
        await this.processTransaction(transaction);
      }

      res.status(200).json({ 
        success: true, 
        processed: payload.length,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Webhook processing error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Verify webhook signature for security
   */
  private verifyWebhookSignature(req: Request): boolean {
    if (!WEBHOOK_SECRET) {
      console.warn('HELIUS_WEBHOOK_SECRET not configured - skipping signature verification');
      return true; // Allow in development
    }

    const signature = req.headers['x-helius-signature'] as string;
    if (!signature) {
      return false;
    }

    const body = JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(body)
      .digest('hex');

    return signature === expectedSignature;
  }

  /**
   * Process individual transaction from webhook
   */
  private async processTransaction(transaction: HeliusWebhookPayload): Promise<void> {
    try {
      console.log(`Processing transaction: ${transaction.signature}`);

      // Check for SOL transfers first (native balance changes)
      const solTransfers = this.extractSOLTransfers(transaction);
      
      if (solTransfers.length > 0) {
        // Process SOL transfers
        for (const transfer of solTransfers) {
          await this.processSOLTransfer(transaction, transfer);
        }
        return;
      }

      // Fallback to USDC transfers for backward compatibility
      const usdcTransfers = transaction.tokenTransfers?.filter(transfer => 
        transfer.mint === USDC_MINT
      ) || [];

      if (usdcTransfers.length > 0) {
        console.log(`Processing USDC transfers in transaction ${transaction.signature}`);
        for (const transfer of usdcTransfers) {
          await this.processUSDCTransfer(transaction, transfer);
        }
        return;
      }

      console.log(`No SOL or USDC transfers in transaction ${transaction.signature}`);

    } catch (error) {
      console.error(`Error processing transaction ${transaction.signature}:`, error);
    }
  }

  /**
   * Extract SOL transfers from account data
   */
  private extractSOLTransfers(transaction: HeliusWebhookPayload): Array<{
    fromUserAccount: string;
    toUserAccount: string;
    amount: number;
  }> {
    const transfers = [];
    
    // Check nativeTransfers if available
    if (transaction.nativeTransfers && transaction.nativeTransfers.length > 0) {
      return transaction.nativeTransfers;
    }

    // Extract from accountData balance changes
    const accounts = transaction.accountData || [];
    const positiveChanges = accounts.filter(acc => acc.nativeBalanceChange > 0);
    const negativeChanges = accounts.filter(acc => acc.nativeBalanceChange < 0);

    for (const positive of positiveChanges) {
      for (const negative of negativeChanges) {
        if (Math.abs(positive.nativeBalanceChange) === Math.abs(negative.nativeBalanceChange)) {
          transfers.push({
            fromUserAccount: negative.account,
            toUserAccount: positive.account,
            amount: positive.nativeBalanceChange
          });
        }
      }
    }

    return transfers;
  }

  /**
   * Process SOL transfer and update campaign if relevant
   */
  private async processSOLTransfer(
    transaction: HeliusWebhookPayload,
    transfer: {
      fromUserAccount: string;
      toUserAccount: string;
      amount: number;
    }
  ): Promise<void> {
    try {
      // Check if destination is a campaign wallet
      const campaignWallet = await this.findCampaignByWallet(transfer.toUserAccount);
      
      if (!campaignWallet) {
        console.log(`SOL transfer to ${transfer.toUserAccount} - not a campaign wallet`);
        return;
      }

      const campaignId = campaignWallet.campaignId;
      const amount = transfer.amount / 1e9; // Convert lamports to SOL

      console.log(`SOL transfer detected: ${amount} SOL to campaign ${campaignId}`);

      // Verify the transaction properly
      const verification = await transactionVerificationService.verifyTransaction(
        transaction.signature,
        campaignId,
        amount
      );

      if (!verification.valid) {
        console.warn(`SOL transaction verification failed for ${transaction.signature}:`, verification.error);
        return;
      }

      // Check for suspicious activity
      const suspiciousActivity = await transactionVerificationService.detectSuspiciousActivity(
        transfer.fromUserAccount,
        amount,
        campaignId
      );

      if (suspiciousActivity.suspicious) {
        console.warn(`Suspicious SOL activity detected for transaction ${transaction.signature}:`, suspiciousActivity.reasons);
        await this.recordSuspiciousActivity(transaction.signature, campaignId, suspiciousActivity);
      }

      // Record the contribution
      await this.recordSOLContribution(transaction, transfer, campaignId, verification);

      // Update campaign balance (convert SOL to USD equivalent)
      const solToUsdRate = 156; // Approximate rate
      const usdAmount = amount * solToUsdRate;
      await this.updateCampaignBalance(campaignId, usdAmount);

      // Send real-time updates
      this.broadcastUpdate(campaignId, {
        type: 'new_contribution',
        signature: transaction.signature,
        amount,
        contributor: transfer.fromUserAccount,
        timestamp: new Date(transaction.timestamp * 1000),
        currency: 'SOL'
      });

      console.log(`Successfully processed SOL contribution: ${amount} SOL to campaign ${campaignId}`);

    } catch (error) {
      console.error('Error processing SOL transfer:', error);
    }
  }

  /**
   * Process USDC transfer and update campaign if relevant
   */
  private async processUSDCTransfer(
    transaction: HeliusWebhookPayload, 
    transfer: HeliusWebhookPayload['tokenTransfers'][0]
  ): Promise<void> {
    try {
      // Check if destination is a campaign wallet
      const campaignWallet = await this.findCampaignByWallet(transfer.toUserAccount);
      
      if (!campaignWallet) {
        console.log(`Transfer to ${transfer.toUserAccount} - not a campaign wallet`);
        return;
      }

      const campaignId = campaignWallet.campaignId;
      const amount = transfer.tokenAmount / 1e6; // USDC has 6 decimals

      console.log(`USDC transfer detected: ${amount} USDC to campaign ${campaignId}`);

      // Verify the transaction properly
      const verification = await transactionVerificationService.verifyTransaction(
        transaction.signature,
        campaignId,
        amount
      );

      if (!verification.valid) {
        console.warn(`Transaction verification failed for ${transaction.signature}:`, verification.error);
        return;
      }

      // Check for suspicious activity
      const suspiciousActivity = await transactionVerificationService.detectSuspiciousActivity(
        transfer.fromUserAccount,
        amount,
        campaignId
      );

      if (suspiciousActivity.suspicious) {
        console.warn(`Suspicious activity detected for transaction ${transaction.signature}:`, suspiciousActivity.reasons);
        await this.recordSuspiciousActivity(transaction.signature, campaignId, suspiciousActivity);
      }

      // Record the contribution
      await this.recordContribution(transaction, transfer, campaignId, verification);

      // Update campaign balance
      await this.updateCampaignBalance(campaignId, amount);

      // Send real-time updates
      this.broadcastUpdate(campaignId, {
        type: 'new_contribution',
        signature: transaction.signature,
        amount,
        contributor: transfer.fromUserAccount,
        timestamp: new Date(transaction.timestamp * 1000)
      });

      console.log(`Successfully processed contribution: ${amount} USDC to campaign ${campaignId}`);

    } catch (error) {
      console.error('Error processing USDC transfer:', error);
    }
  }

  /**
   * Find campaign by wallet address
   */
  private async findCampaignByWallet(walletAddress: string): Promise<{ campaignId: string } | null> {
    try {
      const walletSnapshot = await db.collection(collections.wallets)
        .where('publicKey', '==', walletAddress)
        .limit(1)
        .get();

      if (walletSnapshot.empty) {
        return null;
      }

      const walletData = walletSnapshot.docs[0].data();
      return { campaignId: walletData.campaignId };

    } catch (error) {
      console.error('Error finding campaign by wallet:', error);
      return null;
    }
  }

  /**
   * Record SOL contribution in database
   */
  private async recordSOLContribution(
    transaction: HeliusWebhookPayload,
    transfer: {
      fromUserAccount: string;
      toUserAccount: string;
      amount: number;
    },
    campaignId: string,
    verification: any
  ): Promise<void> {
    try {
      const contributionRef = db.collection(collections.contributions).doc();
      const contribution = {
        id: contributionRef.id,
        campaignId,
        contributorAddress: transfer.fromUserAccount,
        amount: verification.amount,
        transactionHash: transaction.signature,
        timestamp: new Date(transaction.timestamp * 1000),
        status: 'confirmed',
        blockHeight: transaction.slot,
        verificationMethod: 'helius_webhook',
        currency: 'SOL'
      };

      await contributionRef.set(contribution);
      console.log(`SOL Contribution recorded: ${contribution.id}`);

    } catch (error) {
      console.error('Error recording SOL contribution:', error);
    }
  }

  /**
   * Record USDC contribution in database
   */
  private async recordContribution(
    transaction: HeliusWebhookPayload,
    transfer: HeliusWebhookPayload['tokenTransfers'][0],
    campaignId: string,
    verification: any
  ): Promise<void> {
    try {
      const contributionRef = db.collection(collections.contributions).doc();
      const contribution = {
        id: contributionRef.id,
        campaignId,
        contributorAddress: transfer.fromUserAccount,
        amount: verification.amount,
        transactionHash: transaction.signature,
        timestamp: new Date(transaction.timestamp * 1000),
        status: 'confirmed',
        blockHeight: transaction.slot,
        verificationMethod: 'helius_webhook'
      };

      await contributionRef.set(contribution);
      console.log(`Contribution recorded: ${contribution.id}`);

    } catch (error) {
      console.error('Error recording contribution:', error);
    }
  }

  /**
   * Update campaign balance and check for completion
   */
  private async updateCampaignBalance(campaignId: string, contributionAmount: number): Promise<void> {
    try {
      const campaignRef = db.collection(collections.campaigns).doc(campaignId);
      const campaignDoc = await campaignRef.get();
      
      if (!campaignDoc.exists) {
        console.error(`Campaign ${campaignId} not found`);
        return;
      }

      const campaignData = campaignDoc.data()!;
      const newBalance = (campaignData.currentAmount || 0) + contributionAmount;

      // Update campaign balance
      await campaignRef.update({
        currentAmount: newBalance,
        updatedAt: new Date()
      });

      console.log(`Campaign ${campaignId} balance updated: +$${contributionAmount.toFixed(2)} = $${newBalance.toFixed(2)} total`);

      // Check if target reached and trigger purchase if needed
      if (newBalance >= campaignData.targetAmount && campaignData.status === 'active') {
        console.log(`Campaign ${campaignId} reached target! Triggering service purchase...`);
        
        await campaignRef.update({
          status: 'funded',
          fundedAt: new Date()
        });

        // Trigger DexScreener purchase (implemented in DexScreenerService)
        this.triggerServicePurchase(campaignId, campaignData);
      }

      console.log(`Campaign ${campaignId} balance updated: ${newBalance} USDC`);

    } catch (error) {
      console.error('Error updating campaign balance:', error);
    }
  }

  /**
   * Trigger service purchase when campaign is funded
   */
  private async triggerServicePurchase(campaignId: string, campaignData: any): Promise<void> {
    try {
      // Import DexScreener service dynamically to avoid circular dependency
      const { dexScreenerService } = await import('./DexScreenerService.js');
      await dexScreenerService.purchaseService(campaignId, campaignData);
    } catch (error) {
      console.error(`Failed to trigger service purchase for campaign ${campaignId}:`, error);
    }
  }

  /**
   * Record suspicious activity for investigation
   */
  private async recordSuspiciousActivity(
    signature: string,
    campaignId: string,
    activity: { suspicious: boolean; reasons: string[] }
  ): Promise<void> {
    try {
      const suspiciousRef = db.collection('suspicious_activity').doc();
      await suspiciousRef.set({
        id: suspiciousRef.id,
        transactionHash: signature,
        campaignId,
        reasons: activity.reasons,
        timestamp: new Date(),
        investigated: false,
        resolved: false
      });

      // Notify admins (could integrate with email/Slack here)
      console.warn(`Suspicious activity recorded: ${suspiciousRef.id}`);

    } catch (error) {
      console.error('Error recording suspicious activity:', error);
    }
  }

  /**
   * Broadcast real-time updates via WebSocket
   */
  private broadcastUpdate(campaignId: string, update: any): void {
    try {
      if (wsService) {
        // Broadcast to campaign subscribers
        wsService.broadcast({
          type: 'helius_update',
          campaignId,
          data: update
        });
      }
    } catch (error) {
      console.error('Error broadcasting update:', error);
    }
  }

  /**
   * Set up webhook for a campaign wallet
   */
  async setupWebhookForCampaign(campaignId: string, walletAddress: string): Promise<void> {
    try {
      console.log(`Setting up Helius webhook for campaign ${campaignId} wallet ${walletAddress}`);
      
      // Record webhook setup
      const webhookRef = db.collection('webhook_subscriptions').doc(campaignId);
      await webhookRef.set({
        campaignId,
        walletAddress,
        createdAt: new Date(),
        status: 'active'
      });

      console.log(`Webhook subscription recorded for campaign ${campaignId}`);

    } catch (error) {
      console.error(`Error setting up webhook for campaign ${campaignId}:`, error);
    }
  }

  /**
   * Health check for webhook service
   */
  async healthCheck(): Promise<{ status: string; webhooks: number; lastProcessed?: Date }> {
    try {
      const webhookCount = await db.collection('webhook_subscriptions')
        .where('status', '==', 'active')
        .get();

      const lastProcessedDoc = await db.collection('audit_trail')
        .where('type', '==', 'helius_webhook_processed')
        .orderBy('timestamp', 'desc')
        .limit(1)
        .get();

      return {
        status: 'healthy',
        webhooks: webhookCount.size,
        lastProcessed: lastProcessedDoc.empty ? undefined : lastProcessedDoc.docs[0].data().timestamp.toDate()
      };

    } catch (error) {
      console.error('Webhook health check error:', error);
      return {
        status: 'unhealthy',
        webhooks: 0
      };
    }
  }

  /**
   * Reconcile all campaigns using webhook data
   */
  async reconcileAllCampaigns(): Promise<{ reconciled: number; errors: number }> {
    let reconciled = 0;
    let errors = 0;

    try {
      const campaignsSnapshot = await db.collection(collections.campaigns)
        .where('status', 'in', ['active', 'funded'])
        .get();

      for (const campaignDoc of campaignsSnapshot.docs) {
        try {
          const result = await transactionVerificationService.reconcileCampaignBalance(campaignDoc.id);
          if (result.reconciled) {
            reconciled++;
          } else {
            console.warn(`Campaign ${campaignDoc.id} has balance discrepancy: ${result.discrepancy}`);
          }
        } catch (error) {
          console.error(`Reconciliation failed for campaign ${campaignDoc.id}:`, error);
          errors++;
        }
      }

      console.log(`Reconciliation complete: ${reconciled} campaigns reconciled, ${errors} errors`);

    } catch (error) {
      console.error('Campaign reconciliation error:', error);
      errors++;
    }

    return { reconciled, errors };
  }
}

export const heliusWebhookService = new HeliusWebhookService();