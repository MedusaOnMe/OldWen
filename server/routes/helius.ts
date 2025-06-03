import { Request, Response } from 'express';
import axios from 'axios';

const HELIUS_API_ENDPOINT = 'https://api.helius.xyz';

console.log('[Server Helius API] Module loaded');

interface TokenValidationResult {
  isValid: boolean;
  metadata?: any;
  error?: string;
  exists?: boolean;
  contractAddress: string;
}

export async function validateToken(req: Request, res: Response) {
  try {
    console.log('[Server Helius API] ========== START TOKEN VALIDATION ==========');
    console.log('[Server Helius API] Route called with body:', JSON.stringify(req.body, null, 2));
    console.log('[Server Helius API] Request headers:', JSON.stringify(req.headers, null, 2));
    const { contractAddress } = req.body;

    if (!contractAddress) {
      console.log('[Server Helius API] ERROR: No contract address provided');
      return res.status(400).json({
        isValid: false,
        error: 'Contract address is required',
        contractAddress: ''
      });
    }

    // Basic address validation
    if (!contractAddress || contractAddress.length < 32 || contractAddress.length > 44) {
      console.log('[Server Helius API] ERROR: Invalid address format');
      console.log('[Server Helius API] Address length:', contractAddress.length);
      console.log('[Server Helius API] Address:', contractAddress);
      return res.status(400).json({
        isValid: false,
        error: 'Invalid Solana address format',
        contractAddress
      });
    }

    // Get API key at runtime
    const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
    
    console.log('[Server Helius API] Environment check:');
    console.log('[Server Helius API] - HELIUS_API_KEY available:', !!HELIUS_API_KEY);
    console.log('[Server Helius API] - HELIUS_API_KEY value:', HELIUS_API_KEY ? `${HELIUS_API_KEY.substring(0, 8)}...` : 'NOT SET');
    console.log(`[Server Helius API] Validating token: ${contractAddress}`);
    
    if (!HELIUS_API_KEY) {
      console.log('[Server Helius API] ERROR: No Helius API key configured');
      return res.status(500).json({
        isValid: false,
        error: 'Helius API key not configured',
        contractAddress
      });
    }
    
    try {
      // Use correct Helius token metadata endpoint
      const apiUrl = `https://api.helius.xyz/v0/token-metadata?api-key=${HELIUS_API_KEY}`;
      const requestPayload = {
        mintAccounts: [contractAddress]
      };

      console.log('[Server Helius API] Making token metadata request');

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

      console.log('[Server Helius API] Token metadata response received');

      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        const tokenData = response.data[0];
        
        // Extract metadata from the response
        const onChainMetadata = tokenData.onChainMetadata;
        const offChainMetadata = tokenData.offChainMetadata;
        const account = tokenData.account;
        
        
        if (!onChainMetadata && !offChainMetadata) {
          console.log('[Server Helius API] ERROR: No metadata found for token');
          return res.status(404).json({
            isValid: false,
            error: 'Token metadata not found',
            contractAddress
          });
        }

        const metadata = {
          name: offChainMetadata?.name || onChainMetadata?.metadata?.data?.name || 'Unknown Token',
          symbol: offChainMetadata?.symbol || onChainMetadata?.metadata?.data?.symbol || 'UNKNOWN',
          description: offChainMetadata?.description || onChainMetadata?.metadata?.data?.uri || '',
          image: offChainMetadata?.image || '',
          supply: tokenData.onChainAccountInfo?.accountInfo?.data?.parsed?.info?.supply ? parseInt(tokenData.onChainAccountInfo.accountInfo.data.parsed.info.supply) : undefined,
          decimals: tokenData.onChainAccountInfo?.accountInfo?.data?.parsed?.info?.decimals || 9,
          verified: onChainMetadata?.metadata?.primarySaleHappened || false,
          mintAuthority: tokenData.onChainAccountInfo?.accountInfo?.data?.parsed?.info?.mintAuthority || null,
          freezeAuthority: tokenData.onChainAccountInfo?.accountInfo?.data?.parsed?.info?.freezeAuthority || null,
          updateAuthority: onChainMetadata?.metadata?.updateAuthority
        };

        // Extract social links from off-chain metadata if available
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

        console.log(`[Server Helius API] Token validated successfully: ${metadata.name} (${metadata.symbol})`);

        return res.json({
          isValid: true,
          metadata,
          exists: true,
          contractAddress
        });
      }

      // No token data found
      console.log('[Server Helius API] No token data in response array');
      return res.status(404).json({
        isValid: false,
        error: 'Token not found in Helius database',
        contractAddress
      });

    } catch (apiError: any) {
      console.error('[Server Helius API] CATCH BLOCK - API Error occurred');
      console.error('[Server Helius API] Error type:', apiError.constructor.name);
      console.error('[Server Helius API] Error message:', apiError.message);
      console.error('[Server Helius API] Error code:', apiError.code);
      
      if (apiError.response) {
        console.error('[Server Helius API] Response error details:');
        console.error('[Server Helius API] - Status:', apiError.response.status);
        console.error('[Server Helius API] - Status text:', apiError.response.statusText);
        console.error('[Server Helius API] - Headers:', JSON.stringify(apiError.response.headers, null, 2));
        console.error('[Server Helius API] - Data:', JSON.stringify(apiError.response.data, null, 2));
      } else if (apiError.request) {
        console.error('[Server Helius API] Request made but no response received');
        console.error('[Server Helius API] Request details:', apiError.request);
      }
      
      // NO FALLBACK - Return the actual error
      const errorMessage = apiError?.response?.data?.error?.message || apiError.message || 'Failed to fetch token data';
      const errorCode = apiError?.response?.data?.error?.code;
      
      console.log('[Server Helius API] ========== END TOKEN VALIDATION FAILURE ==========');
      
      return res.status(500).json({
        isValid: false,
        error: errorMessage,
        contractAddress,
        details: {
          errorCode,
          errorMessage,
          apiKeyPresent: !!HELIUS_API_KEY,
          suggestion: errorCode === -32401 ? 'The Helius API key may be invalid or expired. Please check your Helius dashboard and ensure the key has access to the token metadata endpoint.' : undefined
        }
      });
    }

  } catch (error) {
    console.error('[Server Helius API] OUTER CATCH - General validation error:', error);
    console.error('[Server Helius API] Error stack:', (error as any).stack);
    
    // NO FALLBACK - User wants real data only
    console.log('[Server Helius API] ========== END TOKEN VALIDATION OUTER ERROR ==========');
    
    return res.status(500).json({
      isValid: false,
      error: 'General server error during token validation',
      contractAddress: req.body.contractAddress || '',
      details: {
        errorMessage: (error as any).message,
        errorType: (error as any).constructor.name
      }
    });
  }
}