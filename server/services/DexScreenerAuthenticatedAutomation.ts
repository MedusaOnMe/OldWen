import puppeteer, { Browser, Page } from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import UserAgent from 'user-agents';

// Configure Puppeteer with stealth
puppeteer.use(StealthPlugin());

interface DexScreenerCredentials {
  email: string;
  password: string;
}

interface OrderFormData {
  tokenAddress: string;
  tokenName: string;
  tokenSymbol: string;
  description?: string;
  website?: string;
  twitter?: string;
  telegram?: string;
  logoUrl?: string;
}

interface AutomationResult {
  success: boolean;
  stage: string;
  orderId?: string;
  error?: string;
  screenshots: string[];
}

export class DexScreenerAuthenticatedAutomation {
  private browser: Browser | null = null;
  private userAgent: string;
  private isLoggedIn = false;

  constructor() {
    this.userAgent = new UserAgent().toString();
  }

  /**
   * Complete automated flow: Login + Submit Order Form
   */
  async submitOrderWithAuth(
    credentials: DexScreenerCredentials, 
    orderData: OrderFormData
  ): Promise<AutomationResult> {
    const screenshots: string[] = [];
    let currentStage = 'initialization';

    try {
      console.log('🚀 Starting authenticated DexScreener automation...');

      // Step 1: Initialize browser
      currentStage = 'browser_setup';
      await this.initializeBrowser();
      const page = await this.browser!.newPage();
      
      await page.setUserAgent(this.userAgent);
      await page.setViewport({ width: 1366, height: 768 });

      // Step 2: Navigate to order page (will redirect to login)
      currentStage = 'navigation_to_order';
      console.log('📄 Navigating to order page...');
      await page.goto('https://marketplace.dexscreener.com/product/token-info/order', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      await page.screenshot({ path: 'dex-step1-order-redirect.png' });
      screenshots.push('dex-step1-order-redirect.png');

      // Step 3: Handle authentication requirement
      currentStage = 'authentication';
      const authResult = await this.handleAuthentication(page, credentials);
      
      if (!authResult.success) {
        return {
          success: false,
          stage: currentStage,
          error: authResult.error,
          screenshots
        };
      }

      screenshots.push(...authResult.screenshots);

      // Step 4: Navigate back to order form (now authenticated)
      currentStage = 'authenticated_navigation';
      console.log('🔄 Returning to order form as authenticated user...');
      await page.goto('https://marketplace.dexscreener.com/product/token-info/order', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      await page.screenshot({ path: 'dex-step3-authenticated-form.png' });
      screenshots.push('dex-step3-authenticated-form.png');

      // Step 5: Fill and submit the order form
      currentStage = 'form_submission';
      const formResult = await this.fillOrderForm(page, orderData);
      
      if (!formResult.success) {
        return {
          success: false,
          stage: currentStage,
          error: formResult.error,
          screenshots: [...screenshots, ...formResult.screenshots]
        };
      }

      screenshots.push(...formResult.screenshots);

      return {
        success: true,
        stage: 'completed',
        orderId: formResult.orderId,
        screenshots
      };

    } catch (error) {
      console.error(`❌ Automation failed at stage: ${currentStage}`, error);
      
      // Take error screenshot if possible
      try {
        const page = await this.browser?.pages().then(pages => pages[pages.length - 1]);
        if (page) {
          await page.screenshot({ path: `dex-error-${currentStage}.png` });
          screenshots.push(`dex-error-${currentStage}.png`);
        }
      } catch (screenshotError) {
        console.error('Could not take error screenshot:', screenshotError);
      }

      return {
        success: false,
        stage: currentStage,
        error: error instanceof Error ? error.message : 'Unknown error',
        screenshots
      };
    } finally {
      // Cleanup in production, keep open for debugging
      if (process.env.NODE_ENV === 'production') {
        await this.cleanup();
      }
    }
  }

  /**
   * Initialize browser with stealth settings
   */
  private async initializeBrowser(): Promise<void> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: process.env.NODE_ENV === 'production', // Visible in development
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor'
        ],
        defaultViewport: { width: 1366, height: 768 }
      });
    }
  }

  /**
   * Handle the authentication flow
   */
  private async handleAuthentication(
    page: Page, 
    credentials: DexScreenerCredentials
  ): Promise<{ success: boolean; error?: string; screenshots: string[] }> {
    const screenshots: string[] = [];

    try {
      console.log('🔐 Handling authentication...');

      // Look for "Sign In" button on the current page
      const signInButton = await page.$('button:contains("Sign In"), a:contains("Sign In"), [data-testid*="sign"], [data-testid*="login"]');
      
      if (signInButton) {
        console.log('✅ Found Sign In button, clicking...');
        await signInButton.click();
        await page.waitForTimeout(3000);
        
        await page.screenshot({ path: 'dex-step2-signin-clicked.png' });
        screenshots.push('dex-step2-signin-clicked.png');
      } else {
        // Try navigating to common login URLs
        const loginUrls = [
          'https://marketplace.dexscreener.com/login',
          'https://marketplace.dexscreener.com/signin',
          'https://marketplace.dexscreener.com/auth/login',
          'https://dexscreener.com/login'
        ];

        for (const loginUrl of loginUrls) {
          try {
            console.log(`🔗 Trying login URL: ${loginUrl}`);
            const response = await page.goto(loginUrl, { 
              waitUntil: 'networkidle2', 
              timeout: 15000 
            });
            
            if (response?.status() === 200) {
              await page.screenshot({ path: 'dex-step2-login-page.png' });
              screenshots.push('dex-step2-login-page.png');
              break;
            }
          } catch (error) {
            console.log(`❌ Login URL failed: ${loginUrl}`);
            continue;
          }
        }
      }

      // Look for login form fields
      await page.waitForTimeout(2000);

      const emailField = await this.findLoginField(page, 'email');
      const passwordField = await this.findLoginField(page, 'password');
      const submitButton = await this.findSubmitButton(page);

      if (emailField && passwordField && submitButton) {
        console.log('📝 Filling login form...');
        
        // Fill email
        await emailField.click();
        await emailField.type(credentials.email, { delay: 100 });
        
        // Fill password
        await passwordField.click();
        await passwordField.type(credentials.password, { delay: 100 });
        
        await page.screenshot({ path: 'dex-step2-login-filled.png' });
        screenshots.push('dex-step2-login-filled.png');

        // Submit login
        console.log('🚀 Submitting login...');
        await submitButton.click();
        
        // Wait for login to process
        await page.waitForTimeout(5000);
        
        // Check if login was successful
        const currentUrl = page.url();
        const pageContent = await page.content();
        
        if (currentUrl.includes('dashboard') || 
            currentUrl.includes('profile') || 
            !pageContent.includes('Sign In') ||
            pageContent.includes('logout') ||
            pageContent.includes('account')) {
          
          console.log('✅ Login successful!');
          this.isLoggedIn = true;
          
          await page.screenshot({ path: 'dex-step2-login-success.png' });
          screenshots.push('dex-step2-login-success.png');
          
          return { success: true, screenshots };
        } else {
          throw new Error('Login failed - still on login page');
        }
      } else {
        throw new Error('Could not find login form fields');
      }

    } catch (error) {
      console.error('❌ Authentication failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed',
        screenshots
      };
    }
  }

  /**
   * Find login form fields
   */
  private async findLoginField(page: Page, type: 'email' | 'password') {
    const selectors = type === 'email' ? [
      'input[type="email"]',
      'input[name="email"]',
      'input[id="email"]',
      'input[placeholder*="email"]',
      'input[name="username"]',
      'input[id="username"]'
    ] : [
      'input[type="password"]',
      'input[name="password"]',
      'input[id="password"]'
    ];

    for (const selector of selectors) {
      const field = await page.$(selector);
      if (field) {
        console.log(`✅ Found ${type} field: ${selector}`);
        return field;
      }
    }

    return null;
  }

  /**
   * Find submit button for login
   */
  private async findSubmitButton(page: Page) {
    const selectors = [
      'button[type="submit"]',
      'input[type="submit"]',
      'button:contains("Sign In")',
      'button:contains("Login")',
      'button:contains("Log In")',
      '[data-testid*="submit"]',
      '[data-testid*="login"]'
    ];

    for (const selector of selectors) {
      const button = await page.$(selector);
      if (button) {
        console.log(`✅ Found submit button: ${selector}`);
        return button;
      }
    }

    return null;
  }

  /**
   * Fill and submit the order form (after authentication)
   */
  private async fillOrderForm(
    page: Page, 
    data: OrderFormData
  ): Promise<{ success: boolean; orderId?: string; error?: string; screenshots: string[] }> {
    const screenshots: string[] = [];

    try {
      console.log('📝 Filling order form...');

      // Wait for form to load
      await page.waitForTimeout(3000);

      // Take screenshot of the form
      await page.screenshot({ path: 'dex-step4-order-form.png' });
      screenshots.push('dex-step4-order-form.png');

      // Define field mappings for DexScreener order form
      const fieldMappings = {
        tokenAddress: ['tokenAddress', 'token_address', 'contract_address', 'address'],
        tokenName: ['tokenName', 'token_name', 'name', 'title'],
        tokenSymbol: ['tokenSymbol', 'token_symbol', 'symbol', 'ticker'],
        description: ['description', 'desc', 'about', 'details'],
        website: ['website', 'site', 'url', 'homepage'],
        twitter: ['twitter', 'x', 'social_twitter'],
        telegram: ['telegram', 'tg', 'social_telegram'],
        logoUrl: ['logoUrl', 'logo_url', 'logo', 'image', 'icon']
      };

      let filledFields = 0;

      // Fill each field
      for (const [dataKey, selectors] of Object.entries(fieldMappings)) {
        const value = data[dataKey as keyof OrderFormData];
        if (!value) continue;

        for (const selector of selectors) {
          const selectorVariations = [
            `input[name="${selector}"]`,
            `input[id="${selector}"]`,
            `textarea[name="${selector}"]`,
            `textarea[id="${selector}"]`,
            `input[placeholder*="${selector}"]`,
            `[data-testid="${selector}"]`
          ];

          for (const selectorVar of selectorVariations) {
            try {
              const field = await page.$(selectorVar);
              if (field) {
                console.log(`✅ Filling ${dataKey}: ${selectorVar}`);
                await field.click({ clickCount: 3 }); // Select all
                await field.type(String(value), { delay: 100 });
                filledFields++;
                break;
              }
            } catch (error) {
              // Continue to next selector
            }
          }
        }
      }

      console.log(`📊 Filled ${filledFields} fields`);

      // Take screenshot after filling
      await page.screenshot({ path: 'dex-step4-form-filled.png' });
      screenshots.push('dex-step4-form-filled.png');

      // Submit the form
      const submitSelectors = [
        'button[type="submit"]',
        'input[type="submit"]',
        'button:contains("Submit")',
        'button:contains("Place Order")',
        'button:contains("Continue")',
        'button:contains("Order Now")',
        '[data-testid*="submit"]'
      ];

      let submitSuccess = false;
      for (const selector of submitSelectors) {
        try {
          const submitBtn = await page.$(selector);
          if (submitBtn) {
            console.log(`🚀 Submitting form with: ${selector}`);
            await submitBtn.click();
            
            // Wait for submission response
            await page.waitForTimeout(5000);
            
            // Check for success indicators
            const currentUrl = page.url();
            const content = await page.content();
            
            if (currentUrl.includes('success') || 
                currentUrl.includes('confirmation') ||
                content.includes('submitted') ||
                content.includes('received') ||
                content.includes('order placed')) {
              
              submitSuccess = true;
              
              await page.screenshot({ path: 'dex-step4-submission-success.png' });
              screenshots.push('dex-step4-submission-success.png');
              
              break;
            }
          }
        } catch (error) {
          console.log(`⚠️ Submit button failed: ${selector}`);
        }
      }

      if (submitSuccess) {
        return {
          success: true,
          orderId: `dex_order_${Date.now()}`,
          screenshots
        };
      } else {
        return {
          success: false,
          error: 'Form submission failed - no success confirmation',
          screenshots
        };
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Form filling failed',
        screenshots
      };
    }
  }

  /**
   * Check if already logged in
   */
  async checkAuthStatus(page: Page): Promise<boolean> {
    try {
      const content = await page.content();
      return !content.includes('Sign In') && 
             (content.includes('logout') || 
              content.includes('profile') || 
              content.includes('dashboard'));
    } catch (error) {
      return false;
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    try {
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
        this.isLoggedIn = false;
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }
}

export const dexScreenerAuthenticatedAutomation = new DexScreenerAuthenticatedAutomation();