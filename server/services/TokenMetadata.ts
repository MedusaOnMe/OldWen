import axios from 'axios';
import { PublicKey } from '@solana/web3.js';
import { connection } from './solana.js';

const HELIUS_API_KEY = process.env.HELIUS_API_KEY;

interface TokenMetadata {
  address: string;
  name: string;
  symbol: string;
  description?: string;
  image?: string;
  website?: string;
  twitter?: string;
  telegram?: string;
  discord?: string;
  coingeckoId?: string;
  coinmarketcapId?: string;
  verified: boolean;
  tags: string[];
  marketData?: {
    price?: number;
    marketCap?: number;
    volume24h?: number;
    priceChange24h?: number;
  };
  holders?: number;
  supply?: {
    total: number;
    circulating: number;
  };
}

export class TokenMetadataService {
  /**
   * Get comprehensive token metadata from multiple sources
   */
  async getTokenMetadata(tokenAddress: string): Promise<TokenMetadata> {
    try {
      console.log(`Fetching metadata for token: ${tokenAddress}`);

      // Validate token address
      new PublicKey(tokenAddress); // Will throw if invalid

      const metadata: TokenMetadata = {
        address: tokenAddress,
        name: '',
        symbol: '',
        verified: false,
        tags: []
      };

      // Try Helius DAS API first (most comprehensive)
      if (HELIUS_API_KEY) {
        const heliusData = await this.fetchHeliusMetadata(tokenAddress);
        if (heliusData) {
          Object.assign(metadata, heliusData);
        }
      }

      // Fallback to Jupiter API
      if (!metadata.name || !metadata.symbol) {
        const jupiterData = await this.fetchJupiterMetadata(tokenAddress);
        if (jupiterData) {
          Object.assign(metadata, jupiterData);
        }
      }

      // Try Solana token registry
      if (!metadata.name || !metadata.symbol) {
        const registryData = await this.fetchTokenRegistryData(tokenAddress);
        if (registryData) {
          Object.assign(metadata, registryData);
        }
      }

      // Get on-chain token info
      const onChainData = await this.fetchOnChainData(tokenAddress);
      if (onChainData) {
        metadata.supply = onChainData.supply;
        metadata.holders = onChainData.holders;
      }

      // Get market data from DexScreener
      const marketData = await this.fetchDexScreenerData(tokenAddress);
      if (marketData) {
        metadata.marketData = marketData;
        if (marketData.verified) {
          metadata.verified = true;
        }
      }

      // Get additional data from CoinGecko if available
      if (metadata.coingeckoId) {
        const coingeckoData = await this.fetchCoinGeckoData(metadata.coingeckoId);
        if (coingeckoData) {
          Object.assign(metadata, coingeckoData);
        }
      }

      // Validate and clean up metadata
      return this.validateAndCleanMetadata(metadata);

    } catch (error) {
      console.error(`Error fetching token metadata for ${tokenAddress}:`, error);
      throw new Error(`Failed to fetch token metadata: ${error.message}`);
    }
  }

  /**
   * Fetch metadata from Helius DAS API
   */
  private async fetchHeliusMetadata(tokenAddress: string): Promise<Partial<TokenMetadata> | null> {
    try {
      const response = await axios.post(
        `https://api.helius.xyz/v0/token-metadata?api-key=${HELIUS_API_KEY}`,
        {
          mintAccounts: [tokenAddress],
          includeOffChain: true,
          disableCache: false
        }
      );

      const data = response.data?.[0];
      if (!data) return null;

      const offChain = data.offChainMetadata || {};
      const onChain = data.onChainMetadata || {};

      return {
        name: offChain.name || onChain.name || '',
        symbol: offChain.symbol || onChain.symbol || '',
        description: offChain.description || '',
        image: offChain.image || '',
        website: this.extractWebsite(offChain),
        twitter: this.extractTwitter(offChain),
        telegram: this.extractTelegram(offChain),
        discord: this.extractDiscord(offChain),
        verified: data.verified || false,
        tags: this.extractTags(offChain)
      };

    } catch (error) {
      console.error('Helius metadata fetch error:', error);
      return null;
    }
  }

  /**
   * Fetch metadata from Jupiter API
   */
  private async fetchJupiterMetadata(tokenAddress: string): Promise<Partial<TokenMetadata> | null> {
    try {
      const response = await axios.get(`https://cache.jup.ag/tokens/${tokenAddress}`);
      const data = response.data;

      if (!data) return null;

      return {
        name: data.name || '',
        symbol: data.symbol || '',
        image: data.logoURI || '',
        website: data.extensions?.website,
        twitter: data.extensions?.twitter,
        telegram: data.extensions?.telegram,
        coingeckoId: data.extensions?.coingeckoId,
        verified: data.verified || false,
        tags: data.tags || []
      };

    } catch (error) {
      console.error('Jupiter metadata fetch error:', error);
      return null;
    }
  }

  /**
   * Fetch data from Solana token registry
   */
  private async fetchTokenRegistryData(tokenAddress: string): Promise<Partial<TokenMetadata> | null> {
    try {
      const response = await axios.get(
        `https://raw.githubusercontent.com/solana-labs/token-list/main/src/tokens/solana.tokenlist.json`
      );

      const tokenList = response.data;
      const token = tokenList.tokens?.find((t: any) => t.address === tokenAddress);

      if (!token) return null;

      return {
        name: token.name || '',
        symbol: token.symbol || '',
        image: token.logoURI || '',
        verified: true, // Tokens in official registry are considered verified
        tags: token.tags || []
      };

    } catch (error) {
      console.error('Token registry fetch error:', error);
      return null;
    }
  }

  /**
   * Fetch on-chain token data
   */
  private async fetchOnChainData(tokenAddress: string): Promise<{
    supply?: { total: number; circulating: number };
    holders?: number;
  } | null> {
    try {
      const mintPublicKey = new PublicKey(tokenAddress);
      
      // Get mint info
      const mintInfo = await connection.getParsedAccountInfo(mintPublicKey);
      if (!mintInfo.value?.data || !('parsed' in mintInfo.value.data)) {
        return null;
      }

      const parsed = mintInfo.value.data.parsed;
      const supply = parsed.info?.supply ? parseInt(parsed.info.supply) : 0;
      const decimals = parsed.info?.decimals || 0;

      const adjustedSupply = supply / Math.pow(10, decimals);

      // Note: Getting holder count requires scanning all token accounts, which is expensive
      // For production, you'd want to use a service like Helius or cache this data
      
      return {
        supply: {
          total: adjustedSupply,
          circulating: adjustedSupply // Assume total = circulating for simplicity
        }
      };

    } catch (error) {
      console.error('On-chain data fetch error:', error);
      return null;
    }
  }

  /**
   * Fetch market data from DexScreener
   */
  private async fetchDexScreenerData(tokenAddress: string): Promise<Partial<TokenMetadata['marketData'] & { verified?: boolean }> | null> {
    try {
      const response = await axios.get(
        `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`
      );

      const data = response.data;
      if (!data?.pairs || data.pairs.length === 0) return null;

      // Get the pair with highest liquidity
      const bestPair = data.pairs.reduce((best: any, current: any) => {
        const currentLiquidity = parseFloat(current.liquidity?.usd || '0');
        const bestLiquidity = parseFloat(best.liquidity?.usd || '0');
        return currentLiquidity > bestLiquidity ? current : best;
      });

      const price = parseFloat(bestPair.priceUsd || '0');
      const marketCap = parseFloat(bestPair.marketCap || '0');
      const volume24h = parseFloat(bestPair.volume?.h24 || '0');
      const priceChange24h = parseFloat(bestPair.priceChange?.h24 || '0');

      return {
        price,
        marketCap,
        volume24h,
        priceChange24h,
        verified: bestPair.info?.websites?.length > 0 || bestPair.info?.socials?.length > 0
      };

    } catch (error) {
      console.error('DexScreener data fetch error:', error);
      return null;
    }
  }

  /**
   * Fetch additional data from CoinGecko
   */
  private async fetchCoinGeckoData(coingeckoId: string): Promise<Partial<TokenMetadata> | null> {
    try {
      const response = await axios.get(
        `https://api.coingecko.com/api/v3/coins/${coingeckoId}`,
        {
          params: {
            localization: false,
            tickers: false,
            market_data: true,
            community_data: false,
            developer_data: false,
            sparkline: false
          }
        }
      );

      const data = response.data;
      if (!data) return null;

      return {
        description: data.description?.en || '',
        website: data.links?.homepage?.[0],
        twitter: data.links?.twitter_screen_name ? `https://twitter.com/${data.links.twitter_screen_name}` : undefined,
        telegram: data.links?.telegram_channel_identifier ? `https://t.me/${data.links.telegram_channel_identifier}` : undefined,
        discord: data.links?.discord,
        marketData: {
          price: data.market_data?.current_price?.usd,
          marketCap: data.market_data?.market_cap?.usd,
          volume24h: data.market_data?.total_volume?.usd,
          priceChange24h: data.market_data?.price_change_percentage_24h
        }
      };

    } catch (error) {
      console.error('CoinGecko data fetch error:', error);
      return null;
    }
  }

  /**
   * Extract website from metadata
   */
  private extractWebsite(metadata: any): string | undefined {
    if (!metadata) return undefined;
    
    return metadata.external_url || 
           metadata.website || 
           metadata.links?.find((l: any) => l.type === 'website')?.url ||
           metadata.attributes?.find((a: any) => a.trait_type === 'website')?.value;
  }

  /**
   * Extract Twitter from metadata
   */
  private extractTwitter(metadata: any): string | undefined {
    if (!metadata) return undefined;
    
    const twitter = metadata.twitter || 
                   metadata.social?.twitter || 
                   metadata.links?.find((l: any) => l.type === 'twitter')?.url ||
                   metadata.attributes?.find((a: any) => a.trait_type === 'twitter')?.value;
    
    if (twitter && !twitter.startsWith('http')) {
      return `https://twitter.com/${twitter.replace('@', '')}`;
    }
    
    return twitter;
  }

  /**
   * Extract Telegram from metadata
   */
  private extractTelegram(metadata: any): string | undefined {
    if (!metadata) return undefined;
    
    const telegram = metadata.telegram || 
                    metadata.social?.telegram || 
                    metadata.links?.find((l: any) => l.type === 'telegram')?.url ||
                    metadata.attributes?.find((a: any) => a.trait_type === 'telegram')?.value;
    
    if (telegram && !telegram.startsWith('http')) {
      return `https://t.me/${telegram.replace('@', '')}`;
    }
    
    return telegram;
  }

  /**
   * Extract Discord from metadata
   */
  private extractDiscord(metadata: any): string | undefined {
    if (!metadata) return undefined;
    
    return metadata.discord || 
           metadata.social?.discord || 
           metadata.links?.find((l: any) => l.type === 'discord')?.url ||
           metadata.attributes?.find((a: any) => a.trait_type === 'discord')?.value;
  }

  /**
   * Extract tags from metadata
   */
  private extractTags(metadata: any): string[] {
    if (!metadata) return [];
    
    const tags = metadata.tags || [];
    const categories = metadata.categories || [];
    const keywords = metadata.keywords || [];
    
    return [...new Set([...tags, ...categories, ...keywords])].filter(Boolean);
  }

  /**
   * Validate and clean metadata
   */
  private validateAndCleanMetadata(metadata: TokenMetadata): TokenMetadata {
    // Ensure required fields have values
    if (!metadata.name && metadata.symbol) {
      metadata.name = metadata.symbol;
    }
    if (!metadata.symbol && metadata.name) {
      metadata.symbol = metadata.name.toUpperCase();
    }

    // Clean and validate URLs
    if (metadata.website && !this.isValidUrl(metadata.website)) {
      delete metadata.website;
    }
    if (metadata.twitter && !this.isValidUrl(metadata.twitter)) {
      delete metadata.twitter;
    }
    if (metadata.telegram && !this.isValidUrl(metadata.telegram)) {
      delete metadata.telegram;
    }
    if (metadata.discord && !this.isValidUrl(metadata.discord)) {
      delete metadata.discord;
    }
    if (metadata.image && !this.isValidUrl(metadata.image)) {
      delete metadata.image;
    }

    // Ensure tags is an array
    if (!Array.isArray(metadata.tags)) {
      metadata.tags = [];
    }

    // Limit description length
    if (metadata.description && metadata.description.length > 500) {
      metadata.description = metadata.description.substring(0, 497) + '...';
    }

    return metadata;
  }

  /**
   * Validate URL format
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get metadata for multiple tokens
   */
  async getMultipleTokenMetadata(tokenAddresses: string[]): Promise<Map<string, TokenMetadata>> {
    const results = new Map<string, TokenMetadata>();
    
    // Process tokens in batches to avoid rate limits
    const batchSize = 5;
    for (let i = 0; i < tokenAddresses.length; i += batchSize) {
      const batch = tokenAddresses.slice(i, i + batchSize);
      
      await Promise.allSettled(
        batch.map(async (address) => {
          try {
            const metadata = await this.getTokenMetadata(address);
            results.set(address, metadata);
          } catch (error) {
            console.error(`Failed to fetch metadata for ${address}:`, error);
            // Set minimal metadata for failed tokens
            results.set(address, {
              address,
              name: '',
              symbol: '',
              verified: false,
              tags: []
            });
          }
        })
      );
      
      // Small delay between batches
      if (i + batchSize < tokenAddresses.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return results;
  }

  /**
   * Search tokens by name or symbol
   */
  async searchTokens(query: string, limit = 20): Promise<TokenMetadata[]> {
    try {
      // This would typically search through a database of cached token metadata
      // For now, we'll use Jupiter's search functionality
      const response = await axios.get('https://cache.jup.ag/tokens/all');
      const allTokens = response.data;
      
      const searchTerm = query.toLowerCase();
      const matchingTokens = allTokens
        .filter((token: any) => 
          token.name?.toLowerCase().includes(searchTerm) ||
          token.symbol?.toLowerCase().includes(searchTerm)
        )
        .slice(0, limit);
      
      // Convert to our metadata format
      return matchingTokens.map((token: any) => ({
        address: token.address,
        name: token.name || '',
        symbol: token.symbol || '',
        description: '',
        image: token.logoURI,
        verified: token.verified || false,
        tags: token.tags || []
      }));

    } catch (error) {
      console.error('Token search error:', error);
      return [];
    }
  }
}

export const tokenMetadataService = new TokenMetadataService();