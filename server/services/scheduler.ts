import { campaignService } from './campaign.js';
import { refundService } from './refund.js';
import { balanceMonitorService } from './balanceMonitor.js';

export class SchedulerService {
  private deadlineCheckInterval: NodeJS.Timeout | null = null;
  private balanceMonitorInterval: NodeJS.Timeout | null = null;
  
  start() {
    // Check deadlines every 5 minutes
    this.deadlineCheckInterval = setInterval(async () => {
      try {
        await this.checkCampaignDeadlines();
      } catch (error) {
        console.error('Scheduled deadline check failed:', error);
      }
    }, 5 * 60 * 1000); // 5 minutes
    
    // Update campaign balances every 30 seconds
    this.balanceMonitorInterval = setInterval(async () => {
      try {
        await this.updateCampaignBalances();
      } catch (error) {
        console.error('Scheduled balance update failed:', error);
      }
    }, 30 * 1000); // 30 seconds
    
    console.log('Scheduler service started (deadlines: 5min, balances: 30sec)');
  }
  
  stop() {
    if (this.deadlineCheckInterval) {
      clearInterval(this.deadlineCheckInterval);
      this.deadlineCheckInterval = null;
    }
    if (this.balanceMonitorInterval) {
      clearInterval(this.balanceMonitorInterval);
      this.balanceMonitorInterval = null;
    }
    console.log('Scheduler service stopped');
  }
  
  private async checkCampaignDeadlines() {
    console.log('Checking campaign deadlines...');
    
    // Check for expired campaigns
    await campaignService.checkDeadlines();
    
    console.log('Campaign deadline check completed');
  }
  
  private async updateCampaignBalances() {
    // Update all active campaign balances using Helius API
    await balanceMonitorService.updateAllCampaignBalances();
  }
}

export const schedulerService = new SchedulerService();