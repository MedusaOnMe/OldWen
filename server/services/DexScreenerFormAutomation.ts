import puppeteer, { Browser, Page } from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import UserAgent from 'user-agents';

// Configure Puppeteer with stealth
puppeteer.use(StealthPlugin());

interface FormSubmissionData {
  tokenAddress: string;
  tokenName: string;
  tokenSymbol: string;
  description?: string;
  website?: string;
  twitter?: string;
  telegram?: string;
  logoUrl?: string;
  serviceType: 'enhanced_token_info' | 'advertising' | 'boost';
  paymentProof?: string;
}

export class DexScreenerFormAutomation {
  private browser: Browser | null = null;
  private currentUserAgent: string;

  constructor() {
    this.currentUserAgent = new UserAgent().toString();
  }

  /**
   * Main form submission method
   */
  async submitForm(data: FormSubmissionData): Promise<{
    success: boolean;
    submissionId?: string;
    error?: string;
    screenshots?: string[];
  }> {
    let page: Page | null = null;
    const screenshots: string[] = [];

    try {
      console.log('🤖 Starting DexScreener form automation...');

      // Launch browser
      if (!this.browser) {
        this.browser = await puppeteer.launch({
          headless: false, // Set to true for production
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

      page = await this.browser.newPage();
      
      // Set user agent and realistic headers
      await page.setUserAgent(this.currentUserAgent);
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br'
      });

      // Step 1: Navigate to marketplace
      console.log('📄 Navigating to DexScreener marketplace...');
      await page.goto('https://marketplace.dexscreener.com/', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // Take initial screenshot
      await page.screenshot({ path: 'dex-step1-homepage.png' });
      screenshots.push('dex-step1-homepage.png');

      // Step 2: Look for form or submission button
      console.log('🔍 Looking for submission forms or buttons...');
      
      // Wait for page to fully load
      await page.waitForTimeout(3000);

      // Look for common form elements or submission buttons
      const formSelectors = [
        'form[action*="submit"]',
        'form[action*="token"]',
        'button[type="submit"]',
        'input[type="submit"]',
        '[data-testid*="submit"]',
        '[class*="submit"]',
        'a[href*="submit"]',
        'a[href*="apply"]',
        'button:contains("Submit")',
        'button:contains("Apply")',
        'button:contains("List Token")',
        '.btn-submit',
        '.submit-button'
      ];

      let formFound = false;
      let formElement = null;

      for (const selector of formSelectors) {
        try {
          const element = await page.$(selector);
          if (element) {
            console.log(`✅ Found form element: ${selector}`);
            formElement = element;
            formFound = true;
            break;
          }
        } catch (error) {
          // Continue searching
        }
      }

      // Step 3: If no direct form, look for navigation to submission page
      if (!formFound) {
        console.log('🔄 No direct form found, looking for navigation links...');
        
        const navigationSelectors = [
          'a[href*="submit"]',
          'a[href*="apply"]',
          'a[href*="list"]',
          'a[href*="token"]',
          'nav a',
          '.nav-link',
          '.menu-item'
        ];

        for (const selector of navigationSelectors) {
          try {
            const links = await page.$$(selector);
            for (const link of links) {
              const text = await page.evaluate(el => el.textContent?.toLowerCase(), link);
              const href = await page.evaluate(el => el.href, link);
              
              if (text && (
                text.includes('submit') || 
                text.includes('apply') || 
                text.includes('list') || 
                text.includes('token')
              )) {
                console.log(`🔗 Found navigation link: "${text}" -> ${href}`);
                await link.click();
                await page.waitForNavigation({ waitUntil: 'networkidle2' });
                
                // Take screenshot of new page
                await page.screenshot({ path: 'dex-step2-navigation.png' });
                screenshots.push('dex-step2-navigation.png');
                
                formFound = true;
                break;
              }
            }
            if (formFound) break;
          } catch (error) {
            // Continue searching
          }
        }
      }

      // Step 4: Fill out the form
      if (formFound || await this.hasFormFields(page)) {
        console.log('📝 Attempting to fill out form fields...');
        
        const fillResult = await this.fillFormFields(page, data);
        
        // Take screenshot after filling
        await page.screenshot({ path: 'dex-step3-filled-form.png' });
        screenshots.push('dex-step3-filled-form.png');

        if (fillResult.success) {
          // Step 5: Submit the form
          console.log('🚀 Submitting form...');
          const submitResult = await this.submitFormFields(page);
          
          // Take final screenshot
          await page.screenshot({ path: 'dex-step4-submission-result.png' });
          screenshots.push('dex-step4-submission-result.png');

          return {
            success: submitResult.success,
            submissionId: submitResult.submissionId,
            screenshots
          };
        } else {
          return {
            success: false,
            error: fillResult.error,
            screenshots
          };
        }
      } else {
        // Step 5: Manual form detection and analysis
        console.log('🔬 Analyzing page structure for hidden forms...');
        const analysis = await this.analyzePageStructure(page);
        
        await page.screenshot({ path: 'dex-analysis.png' });
        screenshots.push('dex-analysis.png');

        return {
          success: false,
          error: `No submission form found. Page analysis: ${JSON.stringify(analysis)}`,
          screenshots
        };
      }

    } catch (error) {
      console.error('🚨 Form automation failed:', error);
      
      if (page) {
        try {
          await page.screenshot({ path: 'dex-error.png' });
          screenshots.push('dex-error.png');
        } catch (screenshotError) {
          console.error('Could not take error screenshot:', screenshotError);
        }
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Form automation failed',
        screenshots
      };
    } finally {
      if (page) {
        await page.close();
      }
    }
  }

  /**
   * Check if page has form fields
   */
  private async hasFormFields(page: Page): Promise<boolean> {
    try {
      const formFields = await page.$$('input, textarea, select');
      return formFields.length > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Fill form fields with provided data
   */
  private async fillFormFields(page: Page, data: FormSubmissionData): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      console.log('🖊️ Filling form fields...');

      // Define field mappings (common field names/IDs that might be used)
      const fieldMappings = {
        tokenAddress: ['tokenAddress', 'token_address', 'address', 'contractAddress', 'contract'],
        tokenName: ['tokenName', 'token_name', 'name', 'title'],
        tokenSymbol: ['tokenSymbol', 'token_symbol', 'symbol', 'ticker'],
        description: ['description', 'desc', 'about', 'details'],
        website: ['website', 'site', 'url', 'homepage'],
        twitter: ['twitter', 'x', 'social_twitter'],
        telegram: ['telegram', 'tg', 'social_telegram'],
        logoUrl: ['logo', 'logoUrl', 'logo_url', 'image', 'icon']
      };

      let fieldsFound = 0;

      // Try to fill each field
      for (const [dataKey, selectors] of Object.entries(fieldMappings)) {
        const value = data[dataKey as keyof FormSubmissionData];
        if (!value) continue;

        for (const selector of selectors) {
          try {
            // Try various selector combinations
            const selectorVariations = [
              `input[name="${selector}"]`,
              `input[id="${selector}"]`,
              `textarea[name="${selector}"]`,
              `textarea[id="${selector}"]`,
              `input[placeholder*="${selector}"]`,
              `input[aria-label*="${selector}"]`,
              `[data-testid="${selector}"]`
            ];

            for (const selectorVar of selectorVariations) {
              const field = await page.$(selectorVar);
              if (field) {
                console.log(`✅ Found field: ${selectorVar} for ${dataKey}`);
                
                // Clear and fill the field
                await field.click({ clickCount: 3 }); // Select all
                await field.type(String(value), { delay: 100 });
                
                fieldsFound++;
                break;
              }
            }
          } catch (error) {
            // Continue to next selector
          }
        }
      }

      console.log(`📊 Filled ${fieldsFound} form fields`);

      return {
        success: fieldsFound > 0,
        error: fieldsFound === 0 ? 'No matching form fields found' : undefined
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Field filling failed'
      };
    }
  }

  /**
   * Submit the form
   */
  private async submitFormFields(page: Page): Promise<{
    success: boolean;
    submissionId?: string;
  }> {
    try {
      console.log('🚀 Looking for submit button...');

      const submitSelectors = [
        'button[type="submit"]',
        'input[type="submit"]',
        'button:contains("Submit")',
        'button:contains("Apply")',
        'button:contains("Send")',
        '.btn-submit',
        '.submit-button',
        '[data-testid*="submit"]'
      ];

      for (const selector of submitSelectors) {
        try {
          const button = await page.$(selector);
          if (button) {
            console.log(`✅ Found submit button: ${selector}`);
            
            // Click submit
            await button.click();
            
            // Wait for response/navigation
            await page.waitForTimeout(5000);
            
            // Check for success indicators
            const url = page.url();
            const content = await page.content();
            
            if (url.includes('success') || 
                content.includes('submitted') || 
                content.includes('received') ||
                content.includes('thank you')) {
              
              return {
                success: true,
                submissionId: `form_submission_${Date.now()}`
              };
            }
            
            break;
          }
        } catch (error) {
          // Continue searching
        }
      }

      return {
        success: false
      };

    } catch (error) {
      return {
        success: false
      };
    }
  }

  /**
   * Analyze page structure for debugging
   */
  private async analyzePageStructure(page: Page): Promise<any> {
    try {
      return await page.evaluate(() => {
        const forms = document.querySelectorAll('form');
        const inputs = document.querySelectorAll('input');
        const buttons = document.querySelectorAll('button');
        const links = document.querySelectorAll('a');
        
        return {
          forms: forms.length,
          inputs: Array.from(inputs).map(input => ({
            type: input.type,
            name: input.name,
            id: input.id,
            placeholder: input.placeholder
          })).slice(0, 10),
          buttons: Array.from(buttons).map(btn => ({
            text: btn.textContent?.trim(),
            type: btn.type,
            id: btn.id
          })).slice(0, 10),
          links: Array.from(links).map(link => ({
            text: link.textContent?.trim(),
            href: link.href
          })).filter(link => 
            link.text?.toLowerCase().includes('submit') ||
            link.text?.toLowerCase().includes('apply') ||
            link.href?.includes('submit')
          ).slice(0, 5)
        };
      });
    } catch (error) {
      return { error: 'Analysis failed' };
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
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }
}

export const dexScreenerFormAutomation = new DexScreenerFormAutomation();