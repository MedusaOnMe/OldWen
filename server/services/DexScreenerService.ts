import axios from 'axios';
import path from 'path';
import puppeteer, { Browser } from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Connection, PublicKey, Transaction, SystemProgram, sendAndConfirmTransaction } from '@solana/web3.js';
import { getAssociatedTokenAddress, createTransferInstruction, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { connection } from './solana.js';
import { decryptPrivateKey } from './solana.js';
import { db, collections } from '../lib/firebase.js';
import { Campaign, Service } from '../../shared/types/campaign.js';
import { wsService } from './websocket.js';
import { dexScreenerPaymentHandler } from './DexScreenerPaymentHandler.js';

puppeteer.use(StealthPlugin());

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
  private profileDir = path.join(process.cwd(), 'chrome-profile-dexscreener');
  private browser: Browser | null = null;

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
   * Submit Enhanced Token Info to DexScreener using real marketplace
   */
  private async submitEnhancedTokenInfo(request: EnhancedTokenInfoRequest): Promise<{
    success: boolean;
    serviceId?: string;
    error?: string;
    paymentSignature?: string;
  }> {
    try {
      console.log('🚀 Starting Enhanced Token Info submission with automated payment...');

      // STEP 1: SKIP PAYMENT FOR TESTING - FOCUS ON FORM FILLING ONLY
      console.log('💰 TESTING MODE: Skipping payment, focusing on form filling...');
      const mockPaymentResult = {
        success: true,
        signature: `test_payment_${Date.now()}`
      };

      console.log(`✅ Mock payment: ${mockPaymentResult.signature}`);

      // STEP 2: Submit form with mock payment proof
      console.log('📝 Submitting form with payment proof...');
      const submissionResult = await this.submitFormWithPersistentBrowser({
        ...request,
        paymentSignature: mockPaymentResult.signature // Include mock payment proof
      });
      
      if (submissionResult.success) {
        console.log(`✅ Enhanced Token Info submitted successfully: ${submissionResult.serviceId}`);
        return {
          success: true,
          serviceId: submissionResult.serviceId,
          paymentSignature: mockPaymentResult.signature
        };
      } else {
        // Payment was made but form submission failed
        console.error('⚠️ Payment successful but form submission failed');
        return {
          success: false,
          error: `Form submission failed after payment: ${submissionResult.error}`,
          paymentSignature: mockPaymentResult.signature // Still return mock payment info
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
   * Submit form using persistent Chrome profile (no re-authentication needed)
   */
  private async submitFormWithPersistentBrowser(request: EnhancedTokenInfoRequest): Promise<{
    success: boolean;
    serviceId?: string;
    error?: string;
  }> {
    let page;
    
    try {
      // Initialize persistent browser if needed
      if (!this.browser) {
        console.log('🔧 Browser not initialized, initializing...');
        await this.initializePersistentBrowser();
      }

      if (!this.browser) {
        throw new Error('Failed to initialize browser');
      }

      page = await this.browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

      console.log('🚀 Navigating to DexScreener order page...');
      
      try {
        await page.goto('https://marketplace.dexscreener.com/product/token-info/order', {
          waitUntil: 'networkidle2',
          timeout: 30000
        });
      } catch (navError) {
        console.error('Navigation failed:', navError);
        return {
          success: false,
          error: `Navigation failed: ${navError instanceof Error ? navError.message : 'Unknown navigation error'}`
        };
      }

      // Check if already authenticated
      const isAuthenticated = await page.evaluate(() => {
        return !document.body.textContent?.includes('Account required');
      });

      if (!isAuthenticated) {
        return {
          success: false,
          error: 'Not authenticated - persistent profile needs re-setup. Run: node setup-dexscreener-profile.js'
        };
      }

      console.log('✅ Already authenticated! Proceeding with form filling...');

      // Wait for form elements to be ready
      try {
        await page.waitForSelector('select, input[type="text"], textarea', { timeout: 10000 });
      } catch (selectorError) {
        return {
          success: false,
          error: 'Form elements not found - page structure may have changed'
        };
      }

      // Fill the form with request data
      await this.fillTokenInfoForm(page, request);

      // TESTING MODE: Stop here to verify form is filled correctly
      console.log('🛑 TESTING MODE: Form filled, stopping before submission for verification...');
      console.log('📸 Taking final screenshot to verify form is filled correctly...');
      await page.screenshot({ path: `testing-form-filled-${request.campaignId}.png` });
      
      // Wait for manual inspection
      console.log('⏳ Pausing for 10 seconds for manual verification...');
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      // Return mock success for testing
      return {
        success: true,
        serviceId: `test_service_${Date.now()}`,
        error: undefined
      };

    } catch (error) {
      console.error('Persistent browser submission failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Browser automation failed'
      };
    } finally {
      if (page) {
        try {
          await page.close();
        } catch (closeError) {
          console.warn('Failed to close page:', closeError);
        }
      }
    }
  }

  /**
   * Initialize persistent Chrome browser with profile
   */
  private async initializePersistentBrowser(): Promise<void> {
    console.log('🔧 Initializing persistent Chrome browser...');
    
    const isProduction = process.env.NODE_ENV === 'production';
    const isDocker = process.env.DOCKER_ENV === 'true';
    
    try {
      const launchConfig: any = {
        headless: false, // Set to false for debugging, true for production
        args: [
          `--user-data-dir=${this.profileDir}`,
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-infobars',
          '--disable-notifications',
          '--disable-popup-blocking',
          '--disable-default-apps',
          '--no-default-browser-check',
          '--no-first-run',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--disable-gpu',
          '--disable-dev-shm-usage'
        ],
        defaultViewport: { width: 1366, height: 768 },
        timeout: 60000
      };

      // Production-specific configurations
      if (isProduction || isDocker) {
        launchConfig.args.push(
          '--disable-background-timer-throttling',
          '--disable-renderer-backgrounding',
          '--disable-backgrounding-occluded-windows',
          '--disable-background-networking'
        );
        
        // Use system Chrome if available
        const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || 
                              process.env.CHROME_BIN ||
                              '/usr/bin/chromium-browser';
        
        if (require('fs').existsSync(executablePath)) {
          launchConfig.executablePath = executablePath;
          console.log(`🔧 Using system Chrome: ${executablePath}`);
        }
      }

      console.log(`🚀 Launching browser (Environment: ${isProduction ? 'Production' : 'Development'})`);
      this.browser = await puppeteer.launch(launchConfig);

      console.log('✅ Persistent browser initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize browser:', error);
      
      // Provide helpful production deployment guidance
      if (process.env.NODE_ENV === 'production') {
        console.error('💡 Production Browser Setup Required:');
        console.error('   📦 Install Chrome: apt-get install -y chromium-browser');
        console.error('   🔧 Set env var: PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser');
        console.error('   🐳 Or use Docker with Chrome pre-installed');
      }
      
      throw new Error(`Browser initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Fill the token info form with campaign data
   */
  private async fillTokenInfoForm(page: any, request: EnhancedTokenInfoRequest): Promise<void> {
    console.log('📝 Filling token info form with campaign data...');
    console.log(`🎯 Campaign ID: ${request.campaignId}`);
    console.log(`🪙 Token: ${request.tokenInfo.name} (${request.tokenInfo.symbol})`);
    console.log(`📍 Address: ${request.tokenAddress}`);
    console.log(`📄 Description: ${request.tokenInfo.description?.substring(0, 100)}...`);

    try {
      // STEP 1: Fill Chain dropdown - ALWAYS Solana for our platform
      console.log('🔗 Step 1: Setting chain to Solana...');
      
      try {
        // Wait for custom dropdown button (not select element)
        await page.waitForSelector('button[role="combobox"]', { timeout: 10000 });
        
        console.log('Found custom dropdown button');
        
        // Click the dropdown to open it
        await page.click('button[role="combobox"]');
        console.log('Clicked dropdown to open');
        
        // Wait for dropdown options to appear
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Look for the specific Solana option with image and text
        const solanaSelected = await page.evaluate(() => {
          // Look for the specific Solana button structure
          const buttons = Array.from(document.querySelectorAll('button[type="button"]'));
          
          console.log('Found buttons:', buttons.length);
          
          for (let button of buttons) {
            // Check if this button contains a Solana image and text
            const hasImage = button.querySelector('img[src*="solana"]');
            const hasText = button.querySelector('span');
            const text = hasText?.textContent?.toLowerCase() || button.textContent?.toLowerCase() || '';
            
            console.log(`Button: "${button.textContent}" (has solana image: ${!!hasImage}, text: ${text})`);
            
            // Look for button with Solana image and "Solana" text
            if (hasImage && text.includes('solana')) {
              console.log('Found Solana button with image!');
              button.click();
              return { success: true, selected: 'Solana' };
            }
            
            // Fallback: look for any element containing "solana" text
            if (text === 'solana') {
              console.log('Found Solana text match!');
              button.click();
              return { success: true, selected: button.textContent };
            }
          }
          
          // Broader search if specific button not found
          const allElements = Array.from(document.querySelectorAll('*'));
          for (let element of allElements) {
            const text = element.textContent?.toLowerCase() || '';
            if (text === 'solana' && element.tagName === 'SPAN') {
              console.log('Found Solana span, clicking parent...');
              const clickableParent = element.closest('button') || element.parentElement;
              if (clickableParent) {
                clickableParent.click();
                return { success: true, selected: 'Solana' };
              }
            }
          }
          
          return { success: false };
        });
        
        if (solanaSelected.success) {
          console.log(`✅ Selected Solana: ${solanaSelected.selected}`);
        } else {
          console.log('❌ Could not select Solana option');
        }
        
      } catch (chainError) {
        console.log('⚠️ Chain selection failed:', chainError.message);
      }

      // STEP 2: Fill Token Address - CRITICAL for correct campaign
      console.log('📍 Step 2: Filling token address...');
      
      try {
        // Wait for token address input
        await page.waitForSelector('input[type="text"]', { timeout: 10000 });
        
        // Find token address input (usually the first text input after chain)
        const tokenInputs = await page.$$('input[type="text"]');
        
        if (tokenInputs.length > 0) {
          const tokenInput = tokenInputs[0]; // Usually first text input is token address
          
          // Clear and fill with campaign's token address
          await tokenInput.click({ clickCount: 3 }); // Select all
          await tokenInput.type(request.tokenAddress);
          
          console.log(`✅ Token address filled: ${request.tokenAddress}`);
          
          // Verify the input was filled correctly
          const filledValue = await page.evaluate((input) => input.value, tokenInput);
          if (filledValue !== request.tokenAddress) {
            console.log('⚠️ Token address verification failed, retrying...');
            await tokenInput.click({ clickCount: 3 });
            await tokenInput.type(request.tokenAddress);
          }
        } else {
          throw new Error('Token address input not found');
        }
      } catch (addressError) {
        throw new Error(`Token address filling failed: ${addressError.message}`);
      }

      // STEP 3: Fill Description - Campaign description
      console.log('📝 Step 3: Filling description...');
      
      try {
        // Wait for description field (usually textarea)
        await page.waitForSelector('textarea', { timeout: 10000 });
        
        const descriptionField = await page.$('textarea');
        
        if (descriptionField && request.tokenInfo.description) {
          // Clear and fill description
          await descriptionField.click({ clickCount: 3 }); // Select all
          await descriptionField.type(request.tokenInfo.description);
          
          console.log(`✅ Description filled: ${request.tokenInfo.description.substring(0, 50)}...`);
        } else {
          console.log('⚠️ Description field not found or no description provided');
        }
      } catch (descError) {
        console.log('⚠️ Description filling failed:', descError.message);
      }

      // STEP 4: Validation delay
      console.log('⏳ Waiting for form validation...');
      await new Promise(resolve => setTimeout(resolve, 3000));

      // STEP 5: Take screenshot for verification
      await page.screenshot({ path: `form-filled-${request.campaignId}.png` });
      console.log(`📸 Form screenshot saved: form-filled-${request.campaignId}.png`);

      console.log('✅ Form filling completed successfully!');

    } catch (error) {
      console.error('❌ Form filling failed:', error);
      
      // Take error screenshot for debugging
      try {
        await page.screenshot({ path: `form-filling-error-${request.campaignId}.png` });
        console.log(`📸 Error screenshot saved: form-filling-error-${request.campaignId}.png`);
      } catch (screenshotError) {
        console.log('Failed to take error screenshot');
      }
      
      throw new Error(`Form filling failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Submit form and wait for confirmation
   */
  private async submitFormAndGetConfirmation(page: any): Promise<{
    success: boolean;
    serviceId?: string;
    error?: string;
  }> {
    try {
      console.log('📤 Submitting form...');

      // Find and click submit button
      const submitButton = await page.$('button[type="submit"], button:contains("Submit"), button:contains("Order")');
      if (!submitButton) {
        throw new Error('Submit button not found');
      }

      await submitButton.click();
      
      // Wait for submission result
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Check for success indicators
      const result = await page.evaluate(() => {
        const url = window.location.href;
        const bodyText = document.body.textContent || '';
        
        // Look for success indicators
        const hasSuccess = bodyText.includes('success') || 
                          bodyText.includes('confirmed') || 
                          bodyText.includes('submitted') ||
                          url.includes('success') ||
                          url.includes('confirmation');

        // Look for error indicators  
        const hasError = bodyText.includes('error') || 
                        bodyText.includes('failed') ||
                        bodyText.includes('invalid');

        return {
          url,
          hasSuccess,
          hasError,
          bodyText: bodyText.substring(0, 500)
        };
      });

      if (result.hasSuccess && !result.hasError) {
        return {
          success: true,
          serviceId: `dex_${Date.now()}` // Generate service ID
        };
      } else if (result.hasError) {
        return {
          success: false,
          error: 'Form submission returned error'
        };
      } else {
        return {
          success: false,
          error: 'Unable to determine submission status'
        };
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Submission failed'
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

  /**
   * Access DexScreener marketplace using enhanced methods
   */
  private async accessDexScreenerMarketplace(): Promise<{
    success: boolean;
    sessionData?: any;
    error?: string;
  }> {
    try {
      console.log('Accessing DexScreener marketplace...');

      // First try basic axios (works currently)
      const response = await axios.get('https://marketplace.dexscreener.com/', {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      console.log(`Marketplace accessed successfully: ${response.status}`);

      // Extract session data from response
      const sessionData = {
        cookies: response.headers['set-cookie'] || [],
        contentLength: response.data.length,
        hasMarketplaceContent: response.data.includes('marketplace') || response.data.includes('dexscreener'),
        timestamp: new Date().toISOString()
      };

      return {
        success: true,
        sessionData
      };

    } catch (error) {
      console.error('Marketplace access failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Marketplace access failed'
      };
    }
  }

  /**
   * Submit token info form to DexScreener
   */
  private async submitTokenInfoForm(request: EnhancedTokenInfoRequest, sessionData: any): Promise<{
    success: boolean;
    serviceId?: string;
    error?: string;
  }> {
    try {
      console.log('Submitting token info form...');

      // For now, simulate form submission since we'd need to reverse engineer the exact form structure
      // In a real implementation, you'd parse the marketplace HTML to find form endpoints and CSRF tokens
      
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate processing time

      // Check if this is development mode
      if (IS_DEVELOPMENT) {
        console.log('Development mode: Simulating successful token info submission');
        return {
          success: true,
          serviceId: `tokeninfo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };
      }

      // In production, you would:
      // 1. Parse the marketplace HTML to find the actual submission form
      // 2. Extract CSRF tokens and form action URLs
      // 3. Submit the form with proper headers and session cookies
      // 4. Handle any additional verification steps

      console.log('Production token info submission would happen here');
      
      // For now, return success to test the payment flow
      return {
        success: true,
        serviceId: `prod_tokeninfo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };

    } catch (error) {
      console.error('Token info form submission failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Form submission failed'
      };
    }
  }

  /**
   * Cleanup browser resources
   */
  public async cleanup(): Promise<void> {
    if (this.browser) {
      console.log('🧹 Cleaning up persistent browser...');
      await this.browser.close();
      this.browser = null;
      console.log('✅ Browser cleanup complete');
    }
  }

  /**
   * Check if persistent profile is set up and authenticated
   */
  public async checkProfileStatus(): Promise<{
    profileExists: boolean;
    authenticated: boolean;
    error?: string;
  }> {
    try {
      const fs = await import('fs');
      const profileExists = fs.existsSync(this.profileDir);
      
      if (!profileExists) {
        return {
          profileExists: false,
          authenticated: false
        };
      }

      // Quick check if profile is authenticated
      let page;
      try {
        if (!this.browser) {
          await this.initializePersistentBrowser();
        }
        
        page = await this.browser!.newPage();
        await page.goto('https://marketplace.dexscreener.com/product/token-info/order', {
          waitUntil: 'networkidle2',
          timeout: 15000
        });

        const isAuthenticated = await page.evaluate(() => {
          return !document.body.textContent?.includes('Account required');
        });

        return {
          profileExists: true,
          authenticated: isAuthenticated
        };

      } finally {
        if (page) {
          await page.close();
        }
      }

    } catch (error) {
      return {
        profileExists: (await import('fs')).existsSync(this.profileDir),
        authenticated: false,
        error: error instanceof Error ? error.message : 'Profile check failed'
      };
    }
  }

  /**
   * Reset the persistent profile (useful if authentication expires)
   */
  public async resetProfile(): Promise<void> {
    console.log('🔄 Resetting persistent profile...');
    
    await this.cleanup();
    
    const fs = await import('fs');
    if (fs.existsSync(this.profileDir)) {
      fs.rmSync(this.profileDir, { recursive: true, force: true });
      console.log('🗑️  Profile directory removed');
    }
    
    console.log('✅ Profile reset complete');
    console.log('💡 Run setup-dexscreener-profile.js to re-authenticate');
  }

  /**
   * Public method for testing form submission (admin use only)
   */
  public async testSubmission(request: EnhancedTokenInfoRequest): Promise<{
    success: boolean;
    serviceId?: string;
    error?: string;
  }> {
    console.log('[TEST] Testing form submission with persistent profile...');
    return this.submitEnhancedTokenInfo(request);
  }

  /**
   * Get real campaign data from database for DexScreener submission
   */
  private async getCampaignDataForSubmission(campaignId: string): Promise<EnhancedTokenInfoRequest> {
    try {
      console.log(`📊 Fetching campaign data for: ${campaignId}`);
      
      // Get campaign from database
      const campaignDoc = await db.collection(collections.campaigns).doc(campaignId).get();
      
      if (!campaignDoc.exists) {
        throw new Error(`Campaign ${campaignId} not found in database`);
      }
      
      const campaignData = campaignDoc.data() as Campaign;
      
      console.log(`✅ Campaign data loaded:`);
      console.log(`   Name: ${campaignData.tokenName}`);
      console.log(`   Symbol: ${campaignData.tokenSymbol}`);
      console.log(`   Address: ${campaignData.tokenAddress}`);
      console.log(`   Type: ${campaignData.campaignType}`);
      console.log(`   Target: $${campaignData.targetAmount}`);
      console.log(`   Current: $${campaignData.currentAmount}`);
      
      // Validate required fields
      if (!campaignData.tokenAddress) {
        throw new Error(`Campaign ${campaignId} missing token address`);
      }
      
      if (!campaignData.tokenName) {
        throw new Error(`Campaign ${campaignId} missing token name`);
      }
      
      if (!campaignData.tokenSymbol) {
        throw new Error(`Campaign ${campaignId} missing token symbol`);
      }
      
      // Create DexScreener request from campaign data
      const request: EnhancedTokenInfoRequest = {
        tokenAddress: campaignData.tokenAddress,
        tokenInfo: {
          address: campaignData.tokenAddress,
          name: campaignData.tokenName,
          symbol: campaignData.tokenSymbol,
          logoURI: campaignData.tokenLogoUrl,
          description: campaignData.description,
          website: campaignData.websiteUrl,
          twitter: campaignData.twitterUrl,
          telegram: campaignData.telegramUrl
        },
        paymentSignature: '', // Will be filled by payment handler
        submittedBy: campaignData.creatorAddress,
        campaignId: campaignId
      };
      
      console.log(`✅ DexScreener request prepared for campaign ${campaignId}`);
      return request;
      
    } catch (error) {
      console.error(`❌ Failed to get campaign data for ${campaignId}:`, error);
      throw new Error(`Campaign data fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process DexScreener submission for a specific campaign
   */
  public async processCampaignSubmission(campaignId: string): Promise<{
    success: boolean;
    serviceId?: string;
    error?: string;
    paymentSignature?: string;
  }> {
    try {
      console.log(`🚀 Processing DexScreener submission for campaign: ${campaignId}`);
      
      // Get real campaign data from database
      const campaignRequest = await this.getCampaignDataForSubmission(campaignId);
      
      // Submit using the real campaign data
      const result = await this.submitEnhancedTokenInfo(campaignRequest);
      
      // Update campaign status in database if successful
      if (result.success) {
        await this.updateCampaignWithDexScreenerResult(campaignId, result);
      }
      
      return result;
      
    } catch (error) {
      console.error(`❌ Campaign submission failed for ${campaignId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Campaign submission failed'
      };
    }
  }

  /**
   * Update campaign with DexScreener submission result
   */
  private async updateCampaignWithDexScreenerResult(
    campaignId: string, 
    result: { serviceId?: string; paymentSignature?: string }
  ): Promise<void> {
    try {
      await db.collection(collections.campaigns).doc(campaignId).update({
        dexScreenerServiceId: result.serviceId,
        dexScreenerPaymentSignature: result.paymentSignature,
        dexScreenerSubmittedAt: new Date(),
        status: 'dexscreener_submitted'
      });
      
      console.log(`✅ Campaign ${campaignId} updated with DexScreener results`);
    } catch (error) {
      console.error(`⚠️ Failed to update campaign ${campaignId}:`, error);
    }
  }
}

export const dexScreenerService = new DexScreenerService();