import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { campaignService } from './campaign.js';

export class BalanceMonitorService {
  private connection: Connection;
  
  constructor() {
    // Use Helius RPC endpoint
    const rpcEndpoint = process.env.HELIUS_RPC_ENDPOINT || 'https://api.mainnet-beta.solana.com';
    this.connection = new Connection(rpcEndpoint, 'confirmed');
    console.log('[Balance Monitor] Initialized with RPC:', rpcEndpoint);
  }
  
  /**
   * Update balances for all active campaigns
   */
  async updateAllCampaignBalances(): Promise<void> {
    try {
      console.log('[Balance Monitor] Starting balance update for all active campaigns...');
      
      // Get all active campaigns
      const activeCampaigns = await campaignService.listCampaigns({ status: 'active' });
      
      if (activeCampaigns.length === 0) {
        console.log('[Balance Monitor] No active campaigns found');
        return;
      }
      
      console.log(`[Balance Monitor] Found ${activeCampaigns.length} active campaigns to check`);
      
      // Update balances for all campaigns in parallel
      const updatePromises = activeCampaigns.map(async (campaign) => {
        try {
          await this.updateCampaignBalance(campaign.id, campaign.walletAddress);
        } catch (error) {
          console.error(`[Balance Monitor] Failed to update balance for campaign ${campaign.id}:`, error);
        }
      });
      
      await Promise.all(updatePromises);
      console.log('[Balance Monitor] Balance update completed for all campaigns');
      
    } catch (error) {
      console.error('[Balance Monitor] Error updating campaign balances:', error);
    }
  }
  
  /**
   * Update balance for a specific campaign
   */
  async updateCampaignBalance(campaignId: string, walletAddress: string): Promise<void> {
    try {
      // Get current SOL balance
      const publicKey = new PublicKey(walletAddress);
      const balanceLamports = await this.connection.getBalance(publicKey);
      const balanceSOL = balanceLamports / LAMPORTS_PER_SOL;
      
      // Convert SOL to USD equivalent for storage (approximate)
      // Note: In production, you'd want to use a real-time SOL/USD price feed
      const solPriceUSD = await this.getSOLPriceUSD();
      const balanceUSD = balanceSOL * solPriceUSD;
      
      console.log(`[Balance Monitor] Campaign ${campaignId}: ${balanceSOL.toFixed(4)} SOL (~$${balanceUSD.toFixed(2)})`);
      
      // Update campaign balance in database
      await campaignService.updateCampaignAmount(campaignId, balanceUSD);
      
    } catch (error) {
      console.error(`[Balance Monitor] Error updating balance for ${campaignId}:`, error);
      throw error;
    }
  }
  
  /**
   * Get SOL price in USD using CoinGecko API
   */
  private async getSOLPriceUSD(): Promise<number> {
    try {
      // Use CoinGecko API to get real-time SOL price
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
      const data = await response.json();
      
      if (data.solana && data.solana.usd) {
        const price = data.solana.usd;
        console.log(`[Balance Monitor] Current SOL price: $${price}`);
        return price;
      }
      
      throw new Error('Invalid price data received');
    } catch (error) {
      console.warn('[Balance Monitor] Failed to fetch SOL price from CoinGecko, using fallback:', error.message);
      return 180; // Fallback price
    }
  }
  
  /**
   * Get balance for a specific wallet (utility method)
   */
  async getWalletBalance(walletAddress: string): Promise<{ sol: number; usd: number }> {
    const publicKey = new PublicKey(walletAddress);
    const balanceLamports = await this.connection.getBalance(publicKey);
    const balanceSOL = balanceLamports / LAMPORTS_PER_SOL;
    const solPrice = await this.getSOLPriceUSD();
    const balanceUSD = balanceSOL * solPrice;
    
    return {
      sol: balanceSOL,
      usd: balanceUSD
    };
  }
}

export const balanceMonitorService = new BalanceMonitorService();