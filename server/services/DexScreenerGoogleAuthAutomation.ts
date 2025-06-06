import puppeteer, { Browser, Page } from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import UserAgent from 'user-agents';

// Configure Puppeteer with stealth
puppeteer.use(StealthPlugin());

interface GoogleCredentials {
  email: string;
  password: string;
  // Optional: for 2FA if enabled
  twoFactorBackupCodes?: string[];
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
  detectedElements?: any;
}

export class DexScreenerGoogleAuthAutomation {
  private browser: Browser | null = null;
  private userAgent: string;
  private isLoggedIn = false;

  constructor() {
    this.userAgent = new UserAgent().toString();
  }

  /**
   * Complete flow: Google OAuth + Order submission
   */
  async submitOrderWithGoogleAuth(
    credentials: GoogleCredentials,
    orderData: OrderFormData
  ): Promise<AutomationResult> {
    const screenshots: string[] = [];
    let currentStage = 'initialization';
    let detectedElements: any = {};

    try {
      console.log('🚀 Starting Google OAuth + DexScreener automation...');

      // Step 1: Initialize browser
      currentStage = 'browser_setup';
      await this.initializeBrowser();
      const page = await this.browser!.newPage();
      
      await page.setUserAgent(this.userAgent);
      await page.setViewport({ width: 1366, height: 768 });

      // Step 2: Navigate to order page (will show Google sign-in)
      currentStage = 'navigation_to_order';
      console.log('📄 Navigating to order page...');
      await page.goto('https://marketplace.dexscreener.com/product/token-info/order', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      await page.screenshot({ path: 'google-step1-auth-required.png' });
      screenshots.push('google-step1-auth-required.png');

      // Step 3: Detect and analyze authentication elements
      currentStage = 'element_detection';
      console.log('🔍 Detecting authentication elements...');
      detectedElements = await this.detectAuthElements(page);
      
      console.log('📊 Detected elements:', JSON.stringify(detectedElements, null, 2));

      // Step 4: Handle Google OAuth flow
      currentStage = 'google_oauth';
      const authResult = await this.handleGoogleOAuth(page, credentials);
      
      if (!authResult.success) {
        return {
          success: false,
          stage: currentStage,
          error: authResult.error,
          screenshots: [...screenshots, ...authResult.screenshots],
          detectedElements
        };
      }

      screenshots.push(...authResult.screenshots);

      // Step 5: Return to order form (now authenticated)
      currentStage = 'authenticated_form_access';
      console.log('🔄 Accessing order form as authenticated user...');
      await page.goto('https://marketplace.dexscreener.com/product/token-info/order', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      await page.screenshot({ path: 'google-step3-authenticated-form.png' });
      screenshots.push('google-step3-authenticated-form.png');

      // Step 6: Detect and analyze order form elements
      currentStage = 'form_element_detection';
      console.log('🔍 Detecting order form elements...');
      const formElements = await this.detectFormElements(page);
      detectedElements.orderForm = formElements;

      console.log('📊 Form elements detected:', JSON.stringify(formElements, null, 2));

      // Step 7: Fill and submit order form
      currentStage = 'form_submission';
      const formResult = await this.fillOrderForm(page, orderData, formElements);
      
      if (!formResult.success) {
        return {
          success: false,
          stage: currentStage,
          error: formResult.error,
          screenshots: [...screenshots, ...formResult.screenshots],
          detectedElements
        };
      }

      screenshots.push(...formResult.screenshots);

      return {
        success: true,
        stage: 'completed',
        orderId: formResult.orderId,
        screenshots,
        detectedElements
      };

    } catch (error) {
      console.error(`❌ Automation failed at stage: ${currentStage}`, error);
      
      // Take error screenshot
      try {
        const page = await this.browser?.pages().then(pages => pages[pages.length - 1]);
        if (page) {
          await page.screenshot({ path: `google-error-${currentStage}.png` });
          screenshots.push(`google-error-${currentStage}.png`);
        }
      } catch (screenshotError) {
        // Ignore screenshot errors
      }

      return {
        success: false,
        stage: currentStage,
        error: error instanceof Error ? error.message : 'Unknown error',
        screenshots,
        detectedElements
      };
    }
  }

  /**
   * Detect authentication elements on the page
   */
  private async detectAuthElements(page: Page): Promise<any> {
    return await page.evaluate(() => {
      const elements = {
        signInButtons: [],
        googleButtons: [],
        authLinks: [],
        otherButtons: [],
        pageInfo: {
          title: document.title,
          url: window.location.href,
          hasAuthRequired: document.body.textContent?.includes('Account required') || false
        }
      };

      // Find all clickable elements
      const clickables = document.querySelectorAll('button, a, [role="button"], [onclick]');
      
      clickables.forEach((el, i) => {
        const text = (el.textContent || '').toLowerCase().trim();
        const className = el.className || '';
        const id = el.id || '';
        const href = el.href || '';

        const elementInfo = {
          index: i,
          tagName: el.tagName,
          text: el.textContent?.trim() || '',
          id: id,
          className: className,
          href: href,
          selector: el.id ? `#${el.id}` : el.className ? `.${el.className.split(' ')[0]}` : el.tagName.toLowerCase()
        };

        // Categorize elements
        if (text.includes('sign in') || text.includes('login') || text.includes('log in')) {
          elements.signInButtons.push(elementInfo);
        } else if (text.includes('google') || className.includes('google') || id.includes('google')) {
          elements.googleButtons.push(elementInfo);
        } else if (href.includes('auth') || href.includes('login') || href.includes('oauth')) {
          elements.authLinks.push(elementInfo);
        } else if (text.length > 0 && text.length < 50) {
          elements.otherButtons.push(elementInfo);
        }
      });

      return elements;
    });
  }

  /**
   * Handle Google OAuth flow
   */
  private async handleGoogleOAuth(
    page: Page,
    credentials: GoogleCredentials
  ): Promise<{ success: boolean; error?: string; screenshots: string[] }> {
    const screenshots: string[] = [];

    try {
      console.log('🔐 Starting Google OAuth flow...');

      // Step 1: Click Sign In button
      const signInClicked = await this.clickSignIn(page);
      if (!signInClicked) {
        throw new Error('Could not find or click Sign In button');
      }

      await page.waitForTimeout(3000);
      await page.screenshot({ path: 'google-step2-signin-clicked.png' });
      screenshots.push('google-step2-signin-clicked.png');

      // Step 2: Look for Google sign-in button/redirect
      const googleAuthStarted = await this.startGoogleAuth(page);
      if (!googleAuthStarted) {
        throw new Error('Could not initiate Google authentication');
      }

      await page.waitForTimeout(3000);
      await page.screenshot({ path: 'google-step2-google-auth-started.png' });
      screenshots.push('google-step2-google-auth-started.png');

      // Step 3: Handle Google login page
      const googleLoginSuccess = await this.fillGoogleLogin(page, credentials);
      if (!googleLoginSuccess) {
        throw new Error('Google login failed');
      }

      await page.waitForTimeout(5000);
      await page.screenshot({ path: 'google-step2-google-login-complete.png' });
      screenshots.push('google-step2-google-login-complete.png');

      // Step 4: Wait for redirect back to DexScreener
      await this.waitForAuthCompletion(page);
      
      await page.screenshot({ path: 'google-step2-auth-complete.png' });
      screenshots.push('google-step2-auth-complete.png');

      console.log('✅ Google OAuth completed successfully');
      this.isLoggedIn = true;

      return { success: true, screenshots };

    } catch (error) {
      console.error('❌ Google OAuth failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Google OAuth failed',
        screenshots
      };
    }
  }

  /**
   * Click the Sign In button
   */
  private async clickSignIn(page: Page): Promise<boolean> {
    const signInSelectors = [
      'button:contains("Sign In")',
      'a:contains("Sign In")',
      '[data-testid*="signin"]',
      '[data-testid*="login"]',
      '.signin-btn',
      '.login-btn',
      '#signin',
      '#login'
    ];

    // Try JavaScript click first (more reliable for modern SPAs)
    const jsClickSuccess = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('button, a, [role="button"]'));
      
      for (const el of elements) {
        const text = el.textContent?.toLowerCase() || '';
        if (text.includes('sign in') || text.includes('login')) {
          console.log('Found sign in button:', el.textContent);
          el.click();
          return true;
        }
      }
      return false;
    });

    if (jsClickSuccess) {
      console.log('✅ Clicked Sign In button via JavaScript');
      return true;
    }

    // Fallback to Puppeteer selectors
    for (const selector of signInSelectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          console.log(`✅ Found Sign In button: ${selector}`);
          await element.click();
          return true;
        }
      } catch (error) {
        // Continue to next selector
      }
    }

    return false;
  }

  /**
   * Start Google authentication
   */
  private async startGoogleAuth(page: Page): Promise<boolean> {
    // Look for Google sign-in elements
    const googleSelectors = [
      'button:contains("Google")',
      'a:contains("Google")',
      '[data-provider="google"]',
      '.google-signin',
      '#google-signin',
      '[href*="google"]',
      '[href*="oauth"]'
    ];

    // Try clicking Google auth button
    for (const selector of googleSelectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          console.log(`✅ Found Google auth button: ${selector}`);
          await element.click();
          await page.waitForTimeout(2000);
          return true;
        }
      } catch (error) {
        // Continue to next selector
      }
    }

    // Check if we're already on Google's OAuth page
    const currentUrl = page.url();
    if (currentUrl.includes('accounts.google.com') || currentUrl.includes('oauth')) {
      console.log('✅ Already on Google OAuth page');
      return true;
    }

    return false;
  }

  /**
   * Fill Google login form
   */
  private async fillGoogleLogin(page: Page, credentials: GoogleCredentials): Promise<boolean> {
    try {
      // Wait for Google login page to load
      await page.waitForSelector('input[type="email"], input[id="identifierId"]', { timeout: 10000 });

      // Fill email
      console.log('📧 Filling email...');
      await page.type('input[type="email"], input[id="identifierId"]', credentials.email, { delay: 100 });
      
      // Click Next
      await page.click('button:contains("Next"), #identifierNext, [data-testid="next"]');
      await page.waitForTimeout(3000);

      // Fill password
      console.log('🔒 Filling password...');
      await page.waitForSelector('input[type="password"], input[name="password"]', { timeout: 10000 });
      await page.type('input[type="password"], input[name="password"]', credentials.password, { delay: 100 });
      
      // Click Sign In
      await page.click('button:contains("Next"), #passwordNext, [data-testid="next"]');
      await page.waitForTimeout(5000);

      // Handle potential 2FA or verification
      await this.handle2FAIfRequired(page, credentials);

      return true;

    } catch (error) {
      console.error('Google login error:', error);
      return false;
    }
  }

  /**
   * Handle 2FA if required
   */
  private async handle2FAIfRequired(page: Page, credentials: GoogleCredentials): Promise<void> {
    try {
      // Check if 2FA page is present
      const has2FA = await page.$('input[id="totpPin"], input[name="totpPin"], input[type="tel"]');
      
      if (has2FA && credentials.twoFactorBackupCodes && credentials.twoFactorBackupCodes.length > 0) {
        console.log('🔐 2FA detected, using backup code...');
        
        // Try using a backup code
        await page.type('input[id="totpPin"], input[name="totpPin"]', credentials.twoFactorBackupCodes[0]);
        await page.click('button:contains("Next"), button:contains("Verify")');
        await page.waitForTimeout(3000);
      }
    } catch (error) {
      console.log('⚠️ 2FA handling skipped:', error.message);
    }
  }

  /**
   * Wait for authentication to complete and redirect back
   */
  private async waitForAuthCompletion(page: Page): Promise<void> {
    // Wait for redirect back to DexScreener
    await page.waitForFunction(
      () => window.location.href.includes('dexscreener.com') && 
            !document.body.textContent?.includes('Sign In'),
      { timeout: 30000 }
    );
  }

  /**
   * Detect form elements after authentication
   */
  private async detectFormElements(page: Page): Promise<any> {
    return await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form'));
      const inputs = Array.from(document.querySelectorAll('input, textarea, select'));
      const buttons = Array.from(document.querySelectorAll('button, input[type="submit"]'));

      return {
        forms: forms.map((form, i) => ({
          index: i,
          action: form.action,
          method: form.method,
          id: form.id,
          className: form.className
        })),
        
        inputs: inputs.map((input, i) => ({
          index: i,
          tagName: input.tagName,
          type: input.type || 'text',
          name: input.name,
          id: input.id,
          placeholder: input.placeholder,
          required: input.required,
          className: input.className,
          // Try to find associated label
          label: (() => {
            const label = document.querySelector(`label[for="${input.id}"]`);
            if (label) return label.textContent?.trim();
            
            const parentLabel = input.closest('label');
            if (parentLabel) return parentLabel.textContent?.trim();
            
            return null;
          })()
        })),
        
        buttons: buttons.map((btn, i) => ({
          index: i,
          tagName: btn.tagName,
          type: btn.type,
          text: btn.textContent?.trim() || btn.value,
          id: btn.id,
          className: btn.className
        }))
      };
    });
  }

  /**
   * Fill order form using detected elements
   */
  private async fillOrderForm(
    page: Page,
    data: OrderFormData,
    detectedElements: any
  ): Promise<{ success: boolean; orderId?: string; error?: string; screenshots: string[] }> {
    const screenshots: string[] = [];

    try {
      console.log('📝 Filling order form with detected elements...');
      
      await page.screenshot({ path: 'google-step4-form-before-fill.png' });
      screenshots.push('google-step4-form-before-fill.png');

      // Map data to form fields intelligently
      const fieldMappings = this.createFieldMappings(detectedElements.inputs, data);
      
      console.log('🗺️ Field mappings:', fieldMappings);

      let filledFields = 0;

      // Fill each mapped field
      for (const mapping of fieldMappings) {
        try {
          const selector = mapping.selector;
          const value = mapping.value;

          if (value) {
            console.log(`✏️ Filling ${mapping.fieldName}: ${selector}`);
            
            await page.click(selector);
            await page.keyboard.down('Control');
            await page.keyboard.press('KeyA');
            await page.keyboard.up('Control');
            await page.type(selector, String(value), { delay: 100 });
            
            filledFields++;
          }
        } catch (error) {
          console.log(`⚠️ Could not fill ${mapping.fieldName}:`, error.message);
        }
      }

      console.log(`📊 Filled ${filledFields} out of ${fieldMappings.length} fields`);

      await page.screenshot({ path: 'google-step4-form-after-fill.png' });
      screenshots.push('google-step4-form-after-fill.png');

      // Submit the form
      const submitSuccess = await this.submitForm(page, detectedElements.buttons);

      if (submitSuccess) {
        await page.screenshot({ path: 'google-step4-form-submitted.png' });
        screenshots.push('google-step4-form-submitted.png');

        return {
          success: true,
          orderId: `dex_order_${Date.now()}`,
          screenshots
        };
      } else {
        return {
          success: false,
          error: 'Form submission failed',
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
   * Create intelligent field mappings
   */
  private createFieldMappings(inputs: any[], data: OrderFormData): any[] {
    const mappings: any[] = [];

    for (const input of inputs) {
      const fieldName = this.guessFieldPurpose(input);
      const value = data[fieldName as keyof OrderFormData];
      
      if (fieldName && value) {
        mappings.push({
          fieldName,
          value,
          selector: input.id ? `#${input.id}` : `[name="${input.name}"]`,
          input
        });
      }
    }

    return mappings;
  }

  /**
   * Guess field purpose from input metadata
   */
  private guessFieldPurpose(input: any): string | null {
    const name = (input.name || '').toLowerCase();
    const id = (input.id || '').toLowerCase();
    const placeholder = (input.placeholder || '').toLowerCase();
    const label = (input.label || '').toLowerCase();
    
    const allText = `${name} ${id} ${placeholder} ${label}`;
    
    if (allText.includes('token') && (allText.includes('address') || allText.includes('contract'))) {
      return 'tokenAddress';
    }
    if (allText.includes('token') && allText.includes('name')) return 'tokenName';
    if (allText.includes('name') && !allText.includes('user')) return 'tokenName';
    if (allText.includes('symbol') || allText.includes('ticker')) return 'tokenSymbol';
    if (allText.includes('description') || allText.includes('about')) return 'description';
    if (allText.includes('website') || allText.includes('url')) return 'website';
    if (allText.includes('twitter')) return 'twitter';
    if (allText.includes('telegram')) return 'telegram';
    if (allText.includes('logo') || allText.includes('image')) return 'logoUrl';
    
    return null;
  }

  /**
   * Submit the form
   */
  private async submitForm(page: Page, buttons: any[]): Promise<boolean> {
    const submitButtons = buttons.filter(btn => 
      btn.type === 'submit' ||
      btn.text?.toLowerCase().includes('submit') ||
      btn.text?.toLowerCase().includes('order') ||
      btn.text?.toLowerCase().includes('continue') ||
      btn.text?.toLowerCase().includes('place')
    );

    for (const btn of submitButtons) {
      try {
        const selector = btn.id ? `#${btn.id}` : `button:contains("${btn.text}")`;
        
        console.log(`🚀 Trying to submit with: ${btn.text}`);
        await page.click(selector);
        await page.waitForTimeout(5000);

        // Check for success indicators
        const url = page.url();
        const content = await page.content();
        
        if (url.includes('success') || url.includes('confirmation') ||
            content.includes('submitted') || content.includes('order placed')) {
          console.log('✅ Form submitted successfully');
          return true;
        }
      } catch (error) {
        console.log(`⚠️ Submit button failed: ${btn.text}`);
      }
    }

    return false;
  }

  /**
   * Initialize browser
   */
  private async initializeBrowser(): Promise<void> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: process.env.NODE_ENV === 'production',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-web-security'
        ],
        defaultViewport: { width: 1366, height: 768 }
      });
    }
  }

  /**
   * Cleanup
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

export const dexScreenerGoogleAuthAutomation = new DexScreenerGoogleAuthAutomation();