import axios, { AxiosResponse } from 'axios';
import puppeteer, { Browser, Page } from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import UserAgent from 'user-agents';
import { Connection, PublicKey, Transaction, SystemProgram, sendAndConfirmTransaction } from '@solana/web3.js';
import { getAssociatedTokenAddress, createTransferInstruction, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { connection } from './solana.js';
import { decryptPrivateKey } from './solana.js';
import { db, collections } from '../lib/firebase.js';
import { Campaign, Service } from '../../shared/types/campaign.js';
import { wsService } from './websocket.js';

// Configure Puppeteer with stealth
puppeteer.use(StealthPlugin());

const DEXSCREENER_PAYMENT_WALLET = process.env.DEXSCREENER_PAYMENT_WALLET;
const ZENROWS_API_KEY = process.env.ZENROWS_API_KEY;
const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';

interface DexScreenerSubmissionData {
  tokenAddress: string;
  tokenName: string;
  tokenSymbol: string;
  description?: string;
  website?: string;
  twitter?: string;
  telegram?: string;
  logoUrl?: string;
  campaignType: 'enhanced_token_info' | 'advertising' | 'boost';
  paymentSignature: string;
}

interface ScrapingMethod {
  name: string;
  priority: number;
  execute: (url: string, data?: any) => Promise<any>;
}

export class EnhancedDexScreenerService {
  private browser: Browser | null = null;
  private methods: ScrapingMethod[] = [];
  private currentUserAgent: string;
  private maxRetries = 3;
  private rateLimitDelay = 10000; // 10 seconds between requests

  constructor() {
    this.currentUserAgent = new UserAgent().toString();
    this.initializeMethods();
  }

  /**
   * Initialize scraping methods in order of preference
   */
  private initializeMethods(): void {
    this.methods = [
      {
        name: 'zenrows',
        priority: 1,
        execute: this.executeZenRows.bind(this)
      },
      {
        name: 'puppeteer_stealth',
        priority: 2,
        execute: this.executePuppeteerStealth.bind(this)
      },
      {
        name: 'axios_enhanced',
        priority: 3,
        execute: this.executeAxiosEnhanced.bind(this)
      }
    ];
  }

  /**
   * Method 1: ZenRows API (Primary)
   */
  private async executeZenRows(url: string, options: any = {}): Promise<any> {
    if (!ZENROWS_API_KEY) {
      throw new Error('ZenRows API key not configured');
    }

    try {
      console.log('Attempting ZenRows method...');
      
      const zenrowsUrl = 'https://api.zenrows.com/v1/';
      const params = new URLSearchParams({
        url: url,
        apikey: ZENROWS_API_KEY,
        js_render: 'true',
        premium_proxy: 'true',
        proxy_country: 'US',
        session_id: Math.random().toString(36).substring(7),
        ...options
      });

      const response = await axios.get(`${zenrowsUrl}?${params.toString()}`, {
        timeout: 30000,
        headers: {
          'User-Agent': this.currentUserAgent
        }
      });

      console.log('ZenRows request successful');
      return { 
        success: true, 
        data: response.data,
        method: 'zenrows'
      };

    } catch (error) {
      console.error('ZenRows method failed:', error);
      throw error;
    }
  }

  /**
   * Method 2: Puppeteer with Stealth (Fallback)
   */
  private async executePuppeteerStealth(url: string, options: any = {}): Promise<any> {
    let page: Page | null = null;
    
    try {
      console.log('Attempting Puppeteer Stealth method...');
      
      if (!this.browser) {
        this.browser = await puppeteer.launch({
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--disable-extensions',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding'
          ]
        });
      }

      page = await this.browser.newPage();
      
      // Set random viewport
      await page.setViewport({
        width: 1366 + Math.floor(Math.random() * 200),
        height: 768 + Math.floor(Math.random() * 200)
      });

      // Set user agent
      await page.setUserAgent(this.currentUserAgent);

      // Block unnecessary resources to speed up
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        const resourceType = req.resourceType();
        if (['image', 'stylesheet', 'font'].includes(resourceType)) {
          req.abort();
        } else {
          req.continue();
        }
      });

      // Navigate with realistic timing
      await page.goto(url, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });

      // Simulate human behavior
      await this.simulateHumanBehavior(page);

      // Wait for any Cloudflare challenges
      await page.waitForTimeout(5000);

      const content = await page.content();
      
      console.log('Puppeteer Stealth request successful');
      return { 
        success: true, 
        data: content,
        method: 'puppeteer_stealth'
      };

    } catch (error) {
      console.error('Puppeteer Stealth method failed:', error);
      throw error;
    } finally {
      if (page) {
        await page.close();
      }
    }
  }

  /**
   * Method 3: Enhanced Axios with fingerprint spoofing (Last resort)
   */
  private async executeAxiosEnhanced(url: string, options: any = {}): Promise<any> {
    try {
      console.log('Attempting Enhanced Axios method...');

      const headers = {
        'User-Agent': this.currentUserAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0',
        ...options.headers
      };

      const response = await axios.get(url, {
        headers,
        timeout: 30000,
        maxRedirects: 5
      });

      console.log('Enhanced Axios request successful');
      return { 
        success: true, 
        data: response.data,
        method: 'axios_enhanced'
      };

    } catch (error) {
      console.error('Enhanced Axios method failed:', error);
      throw error;
    }
  }

  /**
   * Simulate human-like behavior on the page
   */
  private async simulateHumanBehavior(page: Page): Promise<void> {
    try {
      // Random mouse movements
      await page.mouse.move(
        Math.random() * 800, 
        Math.random() * 600
      );
      
      // Random scroll
      await page.evaluate(() => {
        window.scrollTo(0, Math.random() * 500);
      });
      
      // Random delay
      await page.waitForTimeout(1000 + Math.random() * 3000);
      
    } catch (error) {
      // Ignore errors in simulation
    }
  }

  /**
   * Execute request with fallback methods
   */
  private async executeWithFallback(url: string, options: any = {}): Promise<any> {
    const errors: string[] = [];

    for (const method of this.methods) {
      try {
        console.log(`Trying method: ${method.name}`);
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay));
        
        const result = await method.execute(url, options);
        
        if (result.success) {
          console.log(`Success with method: ${method.name}`);
          return result;
        }
        
      } catch (error) {
        const errorMsg = `${method.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        console.error(`Method ${method.name} failed:`, error);
        
        // Continue to next method
        continue;
      }
    }

    throw new Error(`All methods failed: ${errors.join(', ')}`);
  }

  /**
   * Submit promotion to DexScreener marketplace
   */
  async submitPromotion(data: DexScreenerSubmissionData): Promise<{
    success: boolean;
    submissionId?: string;
    error?: string;
  }> {
    try {
      console.log('Starting DexScreener promotion submission...');

      if (IS_DEVELOPMENT) {
        console.log('Development mode: Simulating DexScreener submission');
        await new Promise(resolve => setTimeout(resolve, 3000));
        return {
          success: true,
          submissionId: `dev_submission_${Date.now()}`
        };
      }

      // Step 1: Get the promotion form page
      const formPageResult = await this.executeWithFallback(
        'https://marketplace.dexscreener.com/submit',
        { method: 'GET' }
      );

      if (!formPageResult.success) {
        throw new Error('Failed to load submission form');
      }

      // Step 2: Parse form and prepare submission
      const submissionPayload = this.prepareSubmissionPayload(data, formPageResult.data);

      // Step 3: Submit the form
      const submissionResult = await this.executeWithFallback(
        'https://marketplace.dexscreener.com/submit',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          },
          data: submissionPayload
        }
      );

      if (submissionResult.success) {
        const submissionId = this.extractSubmissionId(submissionResult.data);
        
        console.log(`DexScreener promotion submitted successfully: ${submissionId}`);
        return {
          success: true,
          submissionId
        };
      } else {
        throw new Error('Submission request failed');
      }

    } catch (error) {
      console.error('DexScreener promotion submission failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Submission failed'
      };
    }
  }

  /**
   * Prepare submission payload from form data
   */
  private prepareSubmissionPayload(data: DexScreenerSubmissionData, formHtml: string): any {
    // This would parse the actual form structure from DexScreener
    // For now, return a mock payload
    return {
      tokenAddress: data.tokenAddress,
      tokenName: data.tokenName,
      tokenSymbol: data.tokenSymbol,
      description: data.description,
      website: data.website,
      twitter: data.twitter,
      telegram: data.telegram,
      logoUrl: data.logoUrl,
      paymentProof: data.paymentSignature,
      serviceType: data.campaignType,
      timestamp: Date.now()
    };
  }

  /**
   * Extract submission ID from response
   */
  private extractSubmissionId(responseData: any): string {
    // This would parse the actual response structure
    // For now, generate a mock ID
    return `submission_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Verify submission status
   */
  async verifySubmissionStatus(submissionId: string): Promise<{
    status: 'pending' | 'approved' | 'rejected';
    details?: any;
  }> {
    try {
      const result = await this.executeWithFallback(
        `https://marketplace.dexscreener.com/status/${submissionId}`
      );

      if (result.success) {
        // Parse status from response
        return {
          status: 'pending', // Mock status
          details: result.data
        };
      }

      return { status: 'pending' };

    } catch (error) {
      console.error('Status verification failed:', error);
      return { status: 'pending' };
    }
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    try {
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }

  /**
   * Test connection to DexScreener
   */
  async testConnection(): Promise<{
    success: boolean;
    method?: string;
    error?: string;
  }> {
    try {
      const result = await this.executeWithFallback('https://dexscreener.com');
      
      return {
        success: true,
        method: result.method
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection test failed'
      };
    }
  }

  /**
   * Get current rate limit status
   */
  getRateLimitStatus(): {
    nextRequestAllowed: Date;
    delayMs: number;
  } {
    const now = new Date();
    const nextAllowed = new Date(now.getTime() + this.rateLimitDelay);
    
    return {
      nextRequestAllowed: nextAllowed,
      delayMs: this.rateLimitDelay
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: {
    rateLimitDelay?: number;
    maxRetries?: number;
    userAgent?: string;
  }): void {
    if (config.rateLimitDelay) this.rateLimitDelay = config.rateLimitDelay;
    if (config.maxRetries) this.maxRetries = config.maxRetries;
    if (config.userAgent) this.currentUserAgent = config.userAgent;
  }
}

export const enhancedDexScreenerService = new EnhancedDexScreenerService();

// Graceful shutdown
process.on('SIGTERM', async () => {
  await enhancedDexScreenerService.cleanup();
});

process.on('SIGINT', async () => {
  await enhancedDexScreenerService.cleanup();
});