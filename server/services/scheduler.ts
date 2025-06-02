import { campaignService } from './campaign.js';
import { refundService } from './refund.js';

export class SchedulerService {
  private intervalId: NodeJS.Timeout | null = null;
  
  start() {
    // Check deadlines every 5 minutes
    this.intervalId = setInterval(async () => {
      try {
        await this.checkCampaignDeadlines();
      } catch (error) {
        console.error('Scheduled deadline check failed:', error);
      }
    }, 5 * 60 * 1000); // 5 minutes
    
    console.log('Scheduler service started');
  }
  
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('Scheduler service stopped');
    }
  }
  
  private async checkCampaignDeadlines() {
    console.log('Checking campaign deadlines...');
    
    // Check for expired campaigns
    await campaignService.checkDeadlines();
    
    console.log('Campaign deadline check completed');
  }
}

export const schedulerService = new SchedulerService();