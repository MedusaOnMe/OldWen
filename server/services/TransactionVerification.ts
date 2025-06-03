import { Connection, PublicKey, ConfirmedSignatureInfo, ParsedTransactionWithMeta } from '@solana/web3.js';
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { connection, fallbackConnection } from './solana.js';
import { db, collections } from '../lib/firebase.js';
import { Contribution, Transaction } from '../../shared/types/campaign.js';
import axios from 'axios';

const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
const HELIUS_API_KEY = process.env.HELIUS_API_KEY;

interface HeliusTransaction {
  signature: string;
  slot: number;
  timestamp: number;
  tokenTransfers: Array<{
    fromTokenAccount: string;
    toTokenAccount: string;
    fromUserAccount: string;
    toUserAccount: string;
    tokenAmount: number;
    mint: string;
  }>;
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
  instructions: Array<{
    accounts: string[];
    data: string;
    programId: string;
    innerInstructions: any[];
  }>;
  events: any;
}

export class TransactionVerificationService {
  private processedTransactions = new Set<string>();
  
  constructor() {
    // Load previously processed transactions on startup
    this.loadProcessedTransactions();
    
    // Debug connection
    console.log('Transaction verification service using connection:', connection.rpcEndpoint);
  }

  /**
   * Verify a single transaction and update campaign balance if valid
   */
  async verifyTransaction(signature: string, campaignId: string, expectedAmount?: number): Promise<{
    valid: boolean;
    amount?: number;
    fromAddress?: string;
    toAddress?: string;
    error?: string;
  }> {
    try {
      // Check if already processed to prevent double-spending
      if (this.processedTransactions.has(signature)) {
        console.log(`Transaction ${signature} already processed`);
        return { valid: false, error: 'Transaction already processed' };
      }

      // Get campaign wallet address
      const walletDoc = await db.collection(collections.wallets).doc(campaignId).get();
      if (!walletDoc.exists) {
        return { valid: false, error: 'Campaign wallet not found' };
      }

      const campaignWalletAddress = walletDoc.data()!.publicKey;
      const campaignPublicKey = new PublicKey(campaignWalletAddress);

      // First try Helius enhanced transaction data
      let transactionData: HeliusTransaction | null = null;
      if (HELIUS_API_KEY) {
        transactionData = await this.getHeliusTransactionData(signature);
      }

      // Fallback to standard Solana RPC
      let transaction: ParsedTransactionWithMeta | null = null;
      if (!transactionData) {
        transaction = await this.getStandardTransactionData(signature);
      }

      if (!transactionData && !transaction) {
        return { valid: false, error: 'Transaction not found' };
      }

      // Verify USDC transfer to campaign wallet
      const verification = transactionData 
        ? this.verifyHeliusTransaction(transactionData, campaignWalletAddress, expectedAmount)
        : this.verifyStandardTransaction(transaction!, campaignWalletAddress, expectedAmount);

      if (verification.valid) {
        // Mark as processed to prevent double-spending
        this.processedTransactions.add(signature);
        await this.saveProcessedTransaction(signature, campaignId, verification);

        // Record in transaction history
        await this.recordVerifiedTransaction(signature, campaignId, verification);
      }

      return verification;

    } catch (error) {
      console.error(`Transaction verification failed for ${signature}:`, error);
      return { valid: false, error: error instanceof Error ? error.message : 'Verification failed' };
    }
  }

  /**
   * Get enhanced transaction data from Helius
   */
  private async getHeliusTransactionData(signature: string): Promise<HeliusTransaction | null> {
    try {
      const response = await axios.post(
        `https://api.helius.xyz/v0/transactions/?api-key=${HELIUS_API_KEY}`,
        {
          transactions: [signature]
        }
      );

      return response.data?.[0] || null;
    } catch (error) {
      console.error('Helius transaction fetch failed:', error);
      return null;
    }
  }

  /**
   * Get transaction data from standard Solana RPC
   */
  private async getStandardTransactionData(signature: string): Promise<ParsedTransactionWithMeta | null> {
    try {
      let transaction = await connection.getParsedTransaction(signature, { maxSupportedTransactionVersion: 0 });
      
      // Try fallback connection if primary fails
      if (!transaction) {
        transaction = await fallbackConnection.getParsedTransaction(signature, { maxSupportedTransactionVersion: 0 });
      }

      return transaction;
    } catch (error) {
      console.error('Standard transaction fetch failed:', error);
      return null;
    }
  }

  /**
   * Verify Helius enhanced transaction data
   */
  private verifyHeliusTransaction(
    transaction: HeliusTransaction, 
    campaignWalletAddress: string, 
    expectedAmount?: number
  ): { valid: boolean; amount?: number; fromAddress?: string; toAddress?: string; error?: string } {
    
    // Find USDC transfers to campaign wallet
    const usdcTransfers = transaction.tokenTransfers.filter(transfer => 
      transfer.mint === USDC_MINT.toBase58() && 
      transfer.toUserAccount === campaignWalletAddress
    );

    if (usdcTransfers.length === 0) {
      return { valid: false, error: 'No USDC transfer to campaign wallet found' };
    }

    if (usdcTransfers.length > 1) {
      return { valid: false, error: 'Multiple USDC transfers in single transaction not supported' };
    }

    const transfer = usdcTransfers[0];
    const amount = transfer.tokenAmount / 1e6; // USDC has 6 decimals

    // Validate expected amount if provided
    if (expectedAmount && Math.abs(amount - expectedAmount) > 0.01) {
      return { 
        valid: false, 
        error: `Amount mismatch: expected ${expectedAmount}, got ${amount}` 
      };
    }

    // Minimum contribution validation
    if (amount < 5) {
      return { valid: false, error: 'Amount below minimum contribution of $5 USDC' };
    }

    return {
      valid: true,
      amount,
      fromAddress: transfer.fromUserAccount,
      toAddress: transfer.toUserAccount
    };
  }

  /**
   * Verify standard Solana transaction data
   */
  private verifyStandardTransaction(
    transaction: ParsedTransactionWithMeta, 
    campaignWalletAddress: string, 
    expectedAmount?: number
  ): { valid: boolean; amount?: number; fromAddress?: string; toAddress?: string; error?: string } {
    
    if (!transaction.meta || transaction.meta.err) {
      return { valid: false, error: 'Transaction failed or has no metadata' };
    }

    // First try to verify SOL transfers (native balance changes)
    const solResult = this.verifySOLTransfer(transaction, campaignWalletAddress, expectedAmount);
    if (solResult.valid) {
      return solResult;
    }

    // Fallback to USDC verification for backward compatibility
    const usdcResult = this.verifyUSDCTransfer(transaction, campaignWalletAddress, expectedAmount);
    if (usdcResult.valid) {
      return usdcResult;
    }

    return { 
      valid: false, 
      error: `No valid SOL or USDC transfer found. SOL error: ${solResult.error}, USDC error: ${usdcResult.error}` 
    };
  }

  private verifySOLTransfer(
    transaction: ParsedTransactionWithMeta, 
    campaignWalletAddress: string, 
    expectedAmount?: number
  ): { valid: boolean; amount?: number; fromAddress?: string; toAddress?: string; error?: string } {
    
    if (!transaction.meta || transaction.meta.err) {
      return { valid: false, error: 'Transaction failed or has no metadata' };
    }

    // Check native balance changes (SOL transfers)
    const preBalances = transaction.meta.preBalances || [];
    const postBalances = transaction.meta.postBalances || [];
    const accountKeys = transaction.transaction.message.accountKeys.map(key => 
      typeof key === 'string' ? key : key.pubkey.toBase58()
    );

    // Find campaign wallet in account keys
    const campaignWalletIndex = accountKeys.findIndex(key => key === campaignWalletAddress);
    
    if (campaignWalletIndex === -1) {
      return { valid: false, error: 'Campaign wallet not found in transaction' };
    }

    const preBalance = preBalances[campaignWalletIndex] || 0;
    const postBalance = postBalances[campaignWalletIndex] || 0;
    const balanceChange = (postBalance - preBalance) / 1e9; // Convert lamports to SOL

    if (balanceChange <= 0) {
      return { valid: false, error: `No positive SOL transfer detected. Balance change: ${balanceChange}` };
    }

    // Validate expected amount if provided (with small tolerance for fees)
    if (expectedAmount && Math.abs(balanceChange - expectedAmount) > 0.001) {
      return { 
        valid: false, 
        error: `SOL amount mismatch: expected ${expectedAmount}, got ${balanceChange}` 
      };
    }

    // Find sender address (first account that had balance decrease)
    let fromAddress = '';
    for (let i = 0; i < accountKeys.length; i++) {
      const pre = preBalances[i] || 0;
      const post = postBalances[i] || 0;
      if (pre > post && i !== campaignWalletIndex) {
        fromAddress = accountKeys[i];
        break;
      }
    }

    return {
      valid: true,
      amount: balanceChange,
      fromAddress,
      toAddress: campaignWalletAddress
    };
  }

  private verifyUSDCTransfer(
    transaction: ParsedTransactionWithMeta, 
    campaignWalletAddress: string, 
    expectedAmount?: number
  ): { valid: boolean; amount?: number; fromAddress?: string; toAddress?: string; error?: string } {

    // Parse token balance changes
    const preTokenBalances = transaction.meta?.preTokenBalances || [];
    const postTokenBalances = transaction.meta?.postTokenBalances || [];

    // Find USDC balance changes for campaign wallet
    const campaignTokenChanges = postTokenBalances.filter(balance => 
      balance.mint === USDC_MINT.toBase58() &&
      balance.owner === campaignWalletAddress
    );

    if (campaignTokenChanges.length === 0) {
      return { valid: false, error: 'No USDC balance change for campaign wallet' };
    }

    const postBalance = campaignTokenChanges[0];
    const preBalance = preTokenBalances.find(balance => 
      balance.mint === USDC_MINT.toBase58() &&
      balance.owner === campaignWalletAddress &&
      balance.accountIndex === postBalance.accountIndex
    );

    const preAmount = preBalance ? preBalance.uiTokenAmount.uiAmount || 0 : 0;
    const postAmount = postBalance.uiTokenAmount.uiAmount || 0;
    const amount = postAmount - preAmount;

    if (amount <= 0) {
      return { valid: false, error: 'No positive USDC transfer detected' };
    }

    // Validate expected amount if provided
    if (expectedAmount && Math.abs(amount - expectedAmount) > 0.01) {
      return { 
        valid: false, 
        error: `USDC amount mismatch: expected ${expectedAmount}, got ${amount}` 
      };
    }

    // Minimum contribution validation
    if (amount < 5) {
      return { valid: false, error: 'Amount below minimum contribution of $5 USDC' };
    }

    // Find sender address from instructions
    let fromAddress = '';
    const instructions = transaction.transaction.message.instructions;
    for (const instruction of instructions) {
      if ('parsed' in instruction && instruction.parsed?.type === 'transfer') {
        fromAddress = instruction.parsed.info?.authority || instruction.parsed.info?.source || '';
        break;
      }
    }

    return {
      valid: true,
      amount,
      fromAddress,
      toAddress: campaignWalletAddress
    };
  }

  /**
   * Monitor campaign wallet for new transactions
   */
  async monitorCampaignWallet(campaignId: string, walletAddress: string): Promise<void> {
    console.log(`Starting transaction monitoring for campaign ${campaignId} wallet ${walletAddress}`);

    try {
      const publicKey = new PublicKey(walletAddress);
      
      if (HELIUS_API_KEY) {
        // Use Helius webhook if available (set up separately)
        await this.setupHeliusWebhook(walletAddress);
      } else {
        // Fallback to polling
        this.startTransactionPolling(campaignId, publicKey);
      }
    } catch (error) {
      console.error(`Failed to start monitoring for campaign ${campaignId}:`, error);
    }
  }

  /**
   * Set up Helius webhook for real-time transaction monitoring
   */
  private async setupHeliusWebhook(walletAddress: string): Promise<void> {
    try {
      const webhookUrl = process.env.HELIUS_WEBHOOK_URL;
      console.log(`[Webhook Setup] Using webhook URL: ${webhookUrl}`);
      console.log(`[Webhook Setup] Setting up for wallet: ${walletAddress}`);
      
      if (!webhookUrl) {
        console.warn('HELIUS_WEBHOOK_URL not configured, falling back to polling');
        return;
      }

      const response = await axios.post(
        `https://api.helius.xyz/v0/webhooks?api-key=${HELIUS_API_KEY}`,
        {
          webhookURL: webhookUrl,
          transactionTypes: ['TRANSFER'],
          accountAddresses: [walletAddress],
          webhookType: 'enhanced'
        }
      );

      console.log(`[Webhook Setup] Success! Webhook ID: ${response.data.webhookID}`);
      console.log(`[Webhook Setup] Response:`, response.data);
    } catch (error) {
      console.error('Failed to set up Helius webhook:', error);
      if (error.response) {
        console.error('[Webhook Setup] Response status:', error.response.status);
        console.error('[Webhook Setup] Response data:', error.response.data);
        console.error('[Webhook Setup] Response headers:', error.response.headers);
      }
      console.error('[Webhook Setup] Request config:', {
        url: `https://api.helius.xyz/v0/webhooks?api-key=${HELIUS_API_KEY}`,
        method: 'POST',
        data: {
          webhookURL: webhookUrl,
          transactionTypes: ['TRANSFER'],
          accountAddresses: [walletAddress],
          webhookType: 'enhanced'
        }
      });
    }
  }

  /**
   * Polling fallback for transaction monitoring
   */
  private startTransactionPolling(campaignId: string, publicKey: PublicKey): void {
    const pollInterval = 30000; // 30 seconds

    const poll = async () => {
      try {
        const signatures = await connection.getSignaturesForAddress(publicKey, { limit: 10 });
        
        for (const sig of signatures) {
          if (!this.processedTransactions.has(sig.signature)) {
            const verification = await this.verifyTransaction(sig.signature, campaignId);
            if (verification.valid) {
              console.log(`New verified transaction for campaign ${campaignId}: ${sig.signature}`);
              // Update campaign balance would be handled by the verification process
            }
          }
        }
      } catch (error) {
        console.error(`Polling error for campaign ${campaignId}:`, error);
      }
    };

    // Initial poll
    poll();
    
    // Set up recurring polling
    setInterval(poll, pollInterval);
  }

  /**
   * Detect suspicious patterns that might indicate fraud
   */
  async detectSuspiciousActivity(
    contributorAddress: string, 
    amount: number, 
    campaignId: string
  ): Promise<{ suspicious: boolean; reasons: string[] }> {
    const reasons: string[] = [];

    try {
      // Check for rapid successive contributions from same address
      const recentContributions = await db.collection(collections.contributions)
        .where('contributorAddress', '==', contributorAddress)
        .where('timestamp', '>', new Date(Date.now() - 60000)) // Last minute
        .get();

      if (recentContributions.size > 3) {
        reasons.push('Multiple contributions from same address within 1 minute');
      }

      // Check for unusually large contributions
      if (amount > 10000) {
        reasons.push('Unusually large contribution amount');
      }

      // Check for round number patterns (possible automated testing)
      if (amount % 100 === 0 && amount > 100) {
        reasons.push('Suspicious round number contribution');
      }

      // Check contributor's total contributions to platform
      const allContributions = await db.collection(collections.contributions)
        .where('contributorAddress', '==', contributorAddress)
        .get();

      const totalContributed = allContributions.docs.reduce((sum, doc) => 
        sum + (doc.data().amount || 0), 0
      );

      if (totalContributed > 50000) {
        reasons.push('Contributor has unusually high total platform activity');
      }

      // Check for contributions to many different campaigns
      const uniqueCampaigns = new Set(allContributions.docs.map(doc => doc.data().campaignId));
      if (uniqueCampaigns.size > 20) {
        reasons.push('Contributor active in unusually many campaigns');
      }

    } catch (error) {
      console.error('Fraud detection error:', error);
      reasons.push('Fraud detection system error');
    }

    return {
      suspicious: reasons.length > 0,
      reasons
    };
  }

  /**
   * Reconcile database balances with blockchain state
   */
  async reconcileCampaignBalance(campaignId: string): Promise<{
    databaseBalance: number;
    blockchainBalance: number;
    discrepancy: number;
    reconciled: boolean;
  }> {
    try {
      // Get database balance
      const campaignDoc = await db.collection(collections.campaigns).doc(campaignId).get();
      if (!campaignDoc.exists) {
        throw new Error('Campaign not found');
      }

      const databaseBalance = campaignDoc.data()!.currentAmount || 0;

      // Get blockchain balance
      const walletDoc = await db.collection(collections.wallets).doc(campaignId).get();
      if (!walletDoc.exists) {
        throw new Error('Campaign wallet not found');
      }

      const walletAddress = walletDoc.data()!.publicKey;
      const publicKey = new PublicKey(walletAddress);
      const tokenAccount = await getAssociatedTokenAddress(USDC_MINT, publicKey);

      let blockchainBalance = 0;
      try {
        const accountInfo = await connection.getTokenAccountBalance(tokenAccount);
        blockchainBalance = accountInfo.value.uiAmount || 0;
      } catch (error) {
        // Token account might not exist yet
        blockchainBalance = 0;
      }

      const discrepancy = Math.abs(databaseBalance - blockchainBalance);
      const reconciled = discrepancy < 0.01; // Allow for minor rounding differences

      if (!reconciled) {
        console.warn(`Balance discrepancy for campaign ${campaignId}: DB=${databaseBalance}, Blockchain=${blockchainBalance}`);
        
        // Auto-correct if blockchain is authoritative source
        if (discrepancy > 1) { // Only correct significant discrepancies
          await db.collection(collections.campaigns).doc(campaignId).update({
            currentAmount: blockchainBalance,
            updatedAt: new Date()
          });
        }
      }

      return {
        databaseBalance,
        blockchainBalance,
        discrepancy,
        reconciled
      };
    } catch (error) {
      console.error(`Balance reconciliation failed for campaign ${campaignId}:`, error);
      throw error;
    }
  }

  /**
   * Load previously processed transactions from database
   */
  private async loadProcessedTransactions(): Promise<void> {
    try {
      const snapshot = await db.collection(collections.transactions)
        .where('status', '==', 'confirmed')
        .get();
      
      snapshot.docs.forEach(doc => {
        const hash = doc.data().hash;
        if (hash) {
          this.processedTransactions.add(hash);
        }
      });

      console.log(`Loaded ${this.processedTransactions.size} processed transactions`);
    } catch (error) {
      console.error('Failed to load processed transactions:', error);
    }
  }

  /**
   * Save processed transaction to prevent double-spending
   */
  private async saveProcessedTransaction(
    signature: string, 
    campaignId: string, 
    verification: any
  ): Promise<void> {
    try {
      const transactionRef = db.collection(collections.transactions).doc();
      const transaction: Transaction = {
        id: transactionRef.id,
        campaignId,
        type: 'contribution',
        amount: verification.amount || 0,
        hash: signature,
        status: 'confirmed',
        timestamp: new Date(),
        fromAddress: verification.fromAddress || '',
        toAddress: verification.toAddress || ''
      };

      await transactionRef.set(transaction);
    } catch (error) {
      console.error('Failed to save processed transaction:', error);
    }
  }

  /**
   * Record verified transaction in audit trail
   */
  private async recordVerifiedTransaction(
    signature: string, 
    campaignId: string, 
    verification: any
  ): Promise<void> {
    try {
      const auditRef = db.collection('audit_trail').doc();
      await auditRef.set({
        id: auditRef.id,
        type: 'transaction_verified',
        campaignId,
        transactionHash: signature,
        amount: verification.amount,
        fromAddress: verification.fromAddress,
        toAddress: verification.toAddress,
        timestamp: new Date(),
        verificationMethod: HELIUS_API_KEY ? 'helius' : 'standard_rpc'
      });
    } catch (error) {
      console.error('Failed to record transaction audit:', error);
    }
  }

  /**
   * Get verification status of a transaction
   */
  async getTransactionStatus(signature: string): Promise<{
    processed: boolean;
    verified: boolean;
    details?: any;
  }> {
    const processed = this.processedTransactions.has(signature);
    
    if (!processed) {
      return { processed: false, verified: false };
    }

    try {
      const transactionDoc = await db.collection(collections.transactions)
        .where('hash', '==', signature)
        .limit(1)
        .get();

      if (transactionDoc.empty) {
        return { processed: true, verified: false };
      }

      const details = transactionDoc.docs[0].data();
      return {
        processed: true,
        verified: details.status === 'confirmed',
        details
      };
    } catch (error) {
      console.error('Failed to get transaction status:', error);
      return { processed: true, verified: false };
    }
  }
}

export const transactionVerificationService = new TransactionVerificationService();