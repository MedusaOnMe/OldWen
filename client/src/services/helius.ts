import axios, { AxiosResponse, AxiosError } from 'axios';

/**
 * Enterprise-grade Helius API service for token validation and metadata retrieval
 * Handles rate limiting, retries, and comprehensive error handling
 */

export interface TokenMetadata {
  name: string;
  symbol: string;
  description?: string;
  image?: string;
  supply?: number;
  decimals?: number;
  verified?: boolean;
  mintAuthority?: string;
  freezeAuthority?: string;
  holderCount?: number;
  marketCap?: number;
  price?: number;
  volume24h?: number;
  creators?: Array<{
    address: string;
    verified: boolean;
    share: number;
  }>;
  attributes?: Array<{
    trait_type: string;
    value: string;
  }>;
  socialLinks?: {
    website?: string;
    twitter?: string;
    telegram?: string;
    discord?: string;
  };
  // Extensions property for SimplifiedCampaignCreationForm compatibility
  extensions?: {
    website?: string;
    twitter?: string;
    telegram?: string;
    discord?: string;
  };
}

export interface HeliusAssetResponse {
  id: string;
  content: {
    $schema: string;
    json_uri: string;
    files: Array<{
      uri: string;
      mime: string;
    }>;
    metadata: {
      name: string;
      symbol: string;
      description?: string;
      image?: string;
      animation_url?: string;
      external_url?: string;
      attributes?: Array<{
        trait_type: string;
        value: string;
      }>;
      properties?: {
        creators?: Array<{
          address: string;
          verified: boolean;
          share: number;
        }>;
      };
    };
  };
  authorities: Array<{
    address: string;
    scopes: string[];
  }>;
  compression: {
    eligible: boolean;
    compressed: boolean;
    data_hash?: string;
    creator_hash?: string;
    asset_hash?: string;
    tree?: string;
    seq?: number;
    leaf_id?: number;
  };
  grouping?: Array<{
    group_key: string;
    group_value: string;
  }>;
  royalty?: {
    royalty_model: string;
    target?: string;
    percent: number;
    basis_points: number;
    primary_sale_happened: boolean;
    locked: boolean;
  };
  creators?: Array<{
    address: string;
    verified: boolean;
    share: number;
  }>;
  ownership: {
    frozen: boolean;
    delegated: boolean;
    delegate?: string;
    ownership_model: string;
    owner: string;
  };
  supply?: {
    print_max_supply?: number;
    print_current_supply?: number;
    edition_nonce?: number;
  };
  mutable: boolean;
  burnt: boolean;
  token_info?: {
    supply: string;
    decimals: number;
    token_program: string;
    associated_token_address: string;
    price_info?: {
      price_per_token: number;
      total_price: number;
      currency: string;
    };
  };
}

export interface TokenValidationResult {
  isValid: boolean;
  metadata?: TokenMetadata;
  error?: string;
  exists?: boolean;
  contractAddress: string;
}

class HeliusService {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly rateLimitDelay: number = 100; // ms between requests
  private lastRequestTime: number = 0;
  private requestQueue: Array<() => Promise<any>> = [];
  private isProcessingQueue: boolean = false;

  constructor() {
    this.apiKey = import.meta.env.VITE_HELIUS_API_KEY || import.meta.env.HELIUS_API_KEY || '8349bc43-3182-420a-bade-44ea90bf1c53';
    this.baseUrl = 'https://api.helius.xyz';
    
    if (!this.apiKey) {
      console.warn('Helius API key not configured. Token validation will use fallback methods.');
    }
    
    console.log('Helius API key configured:', this.apiKey ? 'Yes' : 'No');
  }

  /**
   * Rate limiting mechanism to prevent API abuse
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.rateLimitDelay) {
      await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay - timeSinceLastRequest));
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * Queue system for handling multiple concurrent requests
   */
  private async queueRequest<T>(requestFn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          await this.enforceRateLimit();
          const result = await requestFn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      this.processQueue();
    });
  }

  /**
   * Process queued requests sequentially
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift();
      if (request) {
        try {
          await request();
        } catch (error) {
          console.error('Queued request failed:', error);
        }
      }
    }

    this.isProcessingQueue = false;
  }

  /**
   * Makes HTTP request with retry logic and error handling
   */
  private async makeRequest<T>(
    endpoint: string,
    data: any,
    retries: number = 3
  ): Promise<AxiosResponse<T>> {
    const url = `${this.baseUrl}/?api-key=${this.apiKey}`;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await axios.post<T>(url, data, {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000, // 10 second timeout
        });

        return response;
      } catch (error) {
        const axiosError = error as AxiosError;
        
        // Don't retry on client errors (4xx)
        if (axiosError.response && axiosError.response.status >= 400 && axiosError.response.status < 500) {
          throw error;
        }

        // Retry on network errors or server errors (5xx)
        if (attempt === retries) {
          throw error;
        }

        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw new Error('Max retries exceeded');
  }

  /**
   * Validates a Solana token contract address and retrieves metadata
   */
  async validateToken(contractAddress: string): Promise<TokenValidationResult> {
    console.log(`[Client Helius API] ========== START TOKEN VALIDATION ==========`);
    console.log(`[Client Helius API] Validating token: ${contractAddress}`);
    console.log(`[Client Helius API] API Key configured:`, this.apiKey ? `${this.apiKey.substring(0, 8)}...` : 'NOT SET');
    console.log(`[Client Helius API] Environment variables:`, {
      VITE_HELIUS_API_KEY: import.meta.env.VITE_HELIUS_API_KEY ? 'SET' : 'NOT SET',
      HELIUS_API_KEY: import.meta.env.HELIUS_API_KEY ? 'SET' : 'NOT SET'
    });
    
    try {
      // Basic address validation
      if (!contractAddress || contractAddress.length < 32 || contractAddress.length > 44) {
        console.log(`[Client Helius API] ERROR: Invalid address format`);
        console.log(`[Client Helius API] Address length:`, contractAddress.length);
        return {
          isValid: false,
          error: 'Invalid Solana address format',
          contractAddress
        };
      }

      // NO FALLBACK - Try server endpoint for real data
      console.log(`[Client Helius API] Calling server endpoint for real Helius data`);
      return await this.validateTokenViaServer(contractAddress);

    } catch (error) {
      console.error('[Client Helius API] Token validation error:', error);
      console.error('[Client Helius API] Error stack:', (error as any).stack);
      console.log(`[Client Helius API] ========== END TOKEN VALIDATION ERROR ==========`);
      return {
        isValid: false,
        error: 'Token validation failed',
        contractAddress
      };
    }
  }

  /**
   * Validates token via server endpoint
   */
  private async validateTokenViaServer(contractAddress: string): Promise<TokenValidationResult> {
    try {
      console.log(`[Client Helius API] Making request to server endpoint`);
      console.log(`[Client Helius API] POST /api/helius/validate-token`);
      console.log(`[Client Helius API] Request body:`, { contractAddress });
      
      const response = await axios.post('/api/helius/validate-token', {
        contractAddress
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 15000 // 15 second timeout
      });
      
      console.log(`[Client Helius API] Server response status:`, response.status);
      console.log(`[Client Helius API] Server response data:`, JSON.stringify(response.data, null, 2));
      
      if (response.data && response.data.isValid) {
        console.log(`[Client Helius API] Token validated successfully via server`);
        console.log(`[Client Helius API] ========== END TOKEN VALIDATION SUCCESS ==========`);
        return response.data;
      }
      
      console.log(`[Client Helius API] Server returned invalid token`);
      console.log(`[Client Helius API] ========== END TOKEN VALIDATION INVALID ==========`);
      return response.data;
      
    } catch (error: any) {
      console.error(`[Client Helius API] Server request failed:`, error);
      console.error(`[Client Helius API] Error response:`, error.response?.data);
      console.error(`[Client Helius API] Error status:`, error.response?.status);
      
      // NO FALLBACK - Return error
      console.log(`[Client Helius API] NO FALLBACK - Returning error`);
      console.log(`[Client Helius API] ========== END TOKEN VALIDATION SERVER ERROR ==========`);
      
      return {
        isValid: false,
        error: error.response?.data?.error || 'Server validation failed',
        contractAddress,
        details: error.response?.data?.details
      };
    }
  }

  /**
   * Validates token using correct Helius token metadata API
   */
  private async validateTokenWithHelius(contractAddress: string): Promise<TokenValidationResult> {
    try {
      console.log(`[Client Helius API] Fetching token metadata from Helius API for: ${contractAddress}`);
      
      const apiUrl = `https://api.helius.xyz/v0/token-metadata?api-key=${this.apiKey}`;
      const requestPayload = {
        mintAccounts: [contractAddress]
      };
      
      console.log(`[Client Helius API] Making request to:`, apiUrl.replace(this.apiKey, 'API_KEY_HIDDEN'));
      console.log(`[Client Helius API] Request payload:`, requestPayload);
      
      const response = await axios.post(
        apiUrl,
        requestPayload,
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      console.log(`[Client Helius API] Response status:`, response.status);
      console.log(`[Client Helius API] Response data:`, response.data);

      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        const tokenData = response.data[0];
        console.log(`[Client Helius API] Token data found:`, tokenData);
        
        const onChainMetadata = tokenData.onChainMetadata;
        const offChainMetadata = tokenData.offChainMetadata;
        
        if (!onChainMetadata && !offChainMetadata) {
          return {
            isValid: false,
            error: 'Token metadata not found',
            contractAddress
          };
        }

        const metadata: TokenMetadata = {
          name: offChainMetadata?.name || onChainMetadata?.data?.name || 'Unknown Token',
          symbol: offChainMetadata?.symbol || onChainMetadata?.data?.symbol || 'UNKNOWN',
          description: offChainMetadata?.description || onChainMetadata?.data?.uri || '',
          image: offChainMetadata?.image || '',
          supply: onChainMetadata?.supply ? parseInt(onChainMetadata.supply.toString()) : undefined,
          decimals: onChainMetadata?.decimals || 9,
          verified: onChainMetadata?.primarySaleHappened || false,
          mintAuthority: onChainMetadata?.mintAuthority,
          freezeAuthority: onChainMetadata?.freezeAuthority
        };

        // Extract social links from off-chain metadata
        if (offChainMetadata?.attributes) {
          const socialLinks: any = {};
          offChainMetadata.attributes.forEach((attr: any) => {
            if (attr.trait_type === 'website') socialLinks.website = attr.value;
            if (attr.trait_type === 'twitter') socialLinks.twitter = attr.value;
            if (attr.trait_type === 'telegram') socialLinks.telegram = attr.value;
            if (attr.trait_type === 'discord') socialLinks.discord = attr.value;
          });
          if (Object.keys(socialLinks).length > 0) {
            metadata.socialLinks = socialLinks;
            metadata.extensions = socialLinks;
          }
        }

        console.log(`[Client Helius API] Token validated successfully:`, metadata);

        return {
          isValid: true,
          metadata,
          exists: true,
          contractAddress
        };
      }

      // No token data found
      console.log('[Client Helius API] No token data in response array');
      return {
        isValid: false,
        error: 'Token not found in Helius database',
        contractAddress
      };

    } catch (error: any) {
      console.error('[Client Helius API] Token metadata API error:', error);
      console.error('[Client Helius API] Error response:', error.response?.data);
      
      // Return the actual error
      return {
        isValid: false,
        error: error.response?.data?.error || error.message || 'Failed to fetch token metadata',
        contractAddress
      };
    }
  }

  // REMOVED: validateTokenEnhanced - NO FALLBACKS

  // REMOVED: validateTokenBasic - NO FALLBACKS

  // REMOVED: validateTokenFallback - NO FALLBACKS

  /**
   * Parses Helius asset response into standardized token metadata
   */
  private parseTokenMetadata(asset: HeliusAssetResponse): TokenMetadata {
    const content = asset.content;
    const metadata = content.metadata;
    const tokenInfo = asset.token_info;
    
    // Extract social links from description or external URL
    const socialLinks = this.extractSocialLinks(
      metadata.description || '',
      metadata.external_url
    );

    return {
      name: metadata.name || 'Unknown Token',
      symbol: metadata.symbol || 'UNKNOWN',
      description: metadata.description,
      image: metadata.image || content.files?.[0]?.uri,
      supply: tokenInfo ? parseInt(tokenInfo.supply) : asset.supply?.print_current_supply,
      decimals: tokenInfo?.decimals || 9,
      verified: asset.royalty?.primary_sale_happened || false,
      mintAuthority: asset.authorities.find(auth => auth.scopes.includes('mint'))?.address,
      freezeAuthority: asset.authorities.find(auth => auth.scopes.includes('freeze'))?.address,
      creators: asset.creators || metadata.properties?.creators,
      attributes: metadata.attributes,
      socialLinks,
      extensions: socialLinks // Add extensions property for form compatibility
    };
  }

  /**
   * Extracts social media links from token description
   */
  private extractSocialLinks(description: string, externalUrl?: string): TokenMetadata['socialLinks'] {
    const links: TokenMetadata['socialLinks'] = {};

    if (externalUrl) {
      if (externalUrl.includes('twitter.com') || externalUrl.includes('x.com')) {
        links.twitter = externalUrl;
      } else if (externalUrl.includes('t.me') || externalUrl.includes('telegram')) {
        links.telegram = externalUrl;
      } else if (externalUrl.includes('discord')) {
        links.discord = externalUrl;
      } else {
        links.website = externalUrl;
      }
    }

    // Extract URLs from description
    const urlRegex = /https?:\/\/[^\s]+/g;
    const urls = description.match(urlRegex) || [];

    for (const url of urls) {
      if ((url.includes('twitter.com') || url.includes('x.com')) && !links.twitter) {
        links.twitter = url;
      } else if ((url.includes('t.me') || url.includes('telegram')) && !links.telegram) {
        links.telegram = url;
      } else if (url.includes('discord') && !links.discord) {
        links.discord = url;
      } else if (!links.website && !url.includes('twitter') && !url.includes('telegram') && !url.includes('discord')) {
        links.website = url;
      }
    }

    return links;
  }

  /**
   * Gets token balance for a specific wallet
   */
  async getTokenBalance(walletAddress: string, mintAddress: string): Promise<number> {
    try {
      if (!this.apiKey) {
        console.warn('Token balance lookup requires Helius API key');
        return 0;
      }

      return await this.queueRequest(async () => {
        const response = await this.makeRequest<{ result: { value: Array<{ account: string; amount: string; decimals: number }> } }>('', {
          jsonrpc: '2.0',
          id: 'get-token-balance',
          method: 'getTokenAccountsByOwner',
          params: [
            walletAddress,
            { mint: mintAddress },
            { encoding: 'jsonParsed' }
          ]
        });

        const accounts = response.data.result.value;
        if (accounts.length === 0) return 0;

        const balance = accounts.reduce((total, account) => {
          return total + parseInt(account.amount);
        }, 0);

        // Adjust for decimals (most tokens use 9 decimals)
        return balance / Math.pow(10, accounts[0].decimals || 9);
      });

    } catch (error) {
      console.error('Token balance lookup error:', error);
      return 0;
    }
  }

  /**
   * Gets comprehensive token analytics
   */
  async getTokenAnalytics(contractAddress: string): Promise<{
    holderCount?: number;
    transactionCount?: number;
    volume24h?: number;
    marketCap?: number;
    price?: number;
  }> {
    try {
      if (!this.apiKey) {
        return {};
      }

      return await this.queueRequest(async () => {
        // This would call additional Helius endpoints for analytics
        // For now, return placeholder data
        return {
          holderCount: 0,
          transactionCount: 0,
          volume24h: 0,
          marketCap: 0,
          price: 0
        };
      });

    } catch (error) {
      console.error('Token analytics error:', error);
      return {};
    }
  }

  /**
   * Checks if a token address already has an active campaign
   */
  async checkExistingCampaign(contractAddress: string): Promise<boolean> {
    // This would integrate with the Firestore database
    // For now, return false to allow campaign creation
    return false;
  }

  /**
   * Validates multiple token addresses in batch
   */
  async validateTokenBatch(contractAddresses: string[]): Promise<TokenValidationResult[]> {
    const results = await Promise.allSettled(
      contractAddresses.map(address => this.validateToken(address))
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          isValid: false,
          error: 'Batch validation failed',
          contractAddress: contractAddresses[index]
        };
      }
    });
  }

  /**
   * Health check for Helius service
   */
  async healthCheck(): Promise<{ healthy: boolean; latency?: number; error?: string }> {
    const startTime = Date.now();

    try {
      if (!this.apiKey) {
        return { healthy: false, error: 'API key not configured' };
      }

      await this.makeRequest('', {
        jsonrpc: '2.0',
        id: 'health-check',
        method: 'getVersion'
      });

      const latency = Date.now() - startTime;
      return { healthy: true, latency };

    } catch (error) {
      return { 
        healthy: false, 
        latency: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Export singleton instance
export const heliusService = new HeliusService();

// Export types
export type { TokenMetadata, TokenValidationResult, HeliusAssetResponse };