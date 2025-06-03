import React, { useState, useCallback, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Upload,
  Shield,
  Link2,
  Image as ImageIcon,
  Clock
} from 'lucide-react';

import { useToast } from '../hooks/use-toast';

import { heliusService, TokenMetadata, TokenValidationResult } from '../services/helius';
import { campaignAPI } from '../services/api';
import { databaseService } from '../services/database';
import { imageUploadService } from '../services/imageUpload';

interface SimplifiedCampaignFormData {
  contractAddress: string;
  tokenMetadata: TokenMetadata | null;
  logoImage: File | null;
  bannerImage: File | null;
  duration: number; // Duration in hours
  socialLinks: {
    telegram?: string;
    twitter?: string;
    website?: string;
  };
}

export const SimplifiedCampaignCreationForm: React.FC = () => {
  const [, setLocation] = useLocation();
  const { publicKey, connected } = useWallet();
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState<SimplifiedCampaignFormData>({
    contractAddress: '',
    tokenMetadata: null,
    logoImage: null,
    bannerImage: null,
    duration: 24, // Default to 24 hours
    socialLinks: {}
  });

  // UI state
  const [isValidatingToken, setIsValidatingToken] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [creationProgress, setCreationProgress] = useState(0);
  const [creationError, setCreationError] = useState<string | null>(null);


  // Debounced token validation
  const validateToken = useCallback(
    debounce(async (contractAddress: string) => {
      console.log('[Campaign Form] validateToken called with:', contractAddress);
      
      if (!contractAddress || contractAddress.length < 32) {
        console.log('[Campaign Form] Address too short, clearing metadata');
        setFormData(prev => ({ ...prev, tokenMetadata: null }));
        setTokenError(null);
        return;
      }

      console.log('[Campaign Form] Starting validation process...');
      setIsValidatingToken(true);
      setTokenError(null);

      try {
        console.log('[Campaign Form] Checking if campaign exists...');
        // Check if campaign already exists
        const exists = await databaseService.checkContractAddressExists(contractAddress);
        console.log('[Campaign Form] Campaign exists check result:', exists);
        
        if (exists) {
          console.log('[Campaign Form] Campaign already exists, showing error');
          setTokenError('A campaign already exists for this token');
          setFormData(prev => ({ ...prev, tokenMetadata: null }));
          return;
        }

        console.log('[Campaign Form] Calling heliusService.validateToken...');
        // Validate and fetch metadata
        const result: TokenValidationResult = await heliusService.validateToken(contractAddress);
        console.log('[Campaign Form] Helius validation result:', result);
        
        if (result.isValid && result.metadata) {
          console.log('[Campaign Form] Token is valid, setting metadata:', result.metadata);
          setFormData(prev => ({ ...prev, tokenMetadata: result.metadata }));
          
          // Auto-populate social links if available
          if (result.metadata.extensions) {
            console.log('[Campaign Form] Auto-populating social links:', result.metadata.extensions);
            setFormData(prev => ({
              ...prev,
              socialLinks: {
                twitter: result.metadata.extensions?.twitter || '',
                telegram: result.metadata.extensions?.telegram || '',
                website: result.metadata.extensions?.website || ''
              }
            }));
          }
          
          console.log('[Campaign Form] Validation successful, clearing error');
          setTokenError(null);
        } else {
          console.log('[Campaign Form] Token validation failed:', result.error);
          setTokenError(result.error || 'Invalid token contract');
          setFormData(prev => ({ ...prev, tokenMetadata: null }));
        }

      } catch (error) {
        console.error('[Campaign Form] Token validation error:', error);
        setTokenError('Failed to validate token. Please try again.');
        setFormData(prev => ({ ...prev, tokenMetadata: null }));
      } finally {
        console.log('[Campaign Form] Validation process complete, setting isValidatingToken to false');
        setIsValidatingToken(false);
      }
    }, 500),
    []
  );

  // Handle token address input
  useEffect(() => {
    validateToken(formData.contractAddress);
  }, [formData.contractAddress, validateToken]);

  // Handle social link changes
  const handleSocialLinkChange = (platform: keyof SimplifiedCampaignFormData['socialLinks']) => 
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData(prev => ({
        ...prev,
        socialLinks: {
          ...prev.socialLinks,
          [platform]: e.target.value
        }
      }));
    };

  // Handle image uploads
  const handleImageUpload = (type: 'logo' | 'banner') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size and type
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please choose an image smaller than 5MB",
        variant: "destructive"
      });
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please choose an image file",
        variant: "destructive"
      });
      return;
    }

    // Validate aspect ratio
    const img = new Image();
    img.onload = () => {
      const aspectRatio = img.width / img.height;
      
      if (type === 'logo') {
        // Logo should be square (1:1)
        if (aspectRatio < 0.8 || aspectRatio > 1.2) {
          toast({
            title: "Invalid aspect ratio",
            description: "Logo image should be square (1:1 aspect ratio)",
            variant: "destructive"
          });
          return;
        }
      } else if (type === 'banner') {
        // Banner should be 3:1
        if (aspectRatio < 2.8 || aspectRatio > 3.2) {
          toast({
            title: "Invalid aspect ratio",
            description: "Banner image should have a 3:1 aspect ratio",
            variant: "destructive"
          });
          return;
        }
      }

      setFormData(prev => ({
        ...prev,
        [`${type}Image`]: file
      }));
    };
    
    img.onerror = () => {
      toast({
        title: "Invalid image",
        description: "Failed to load the selected image",
        variant: "destructive"
      });
    };
    
    img.src = URL.createObjectURL(file);
  };

  // Check if form can be submitted
  const canSubmit = formData.tokenMetadata && 
                   formData.logoImage && 
                   formData.bannerImage && 
                   !isValidatingToken && 
                   !isCreating;

  // Create campaign
  const createCampaign = async () => {
    console.log('[Campaign Creation] Starting campaign creation process');
    
    if (!publicKey || !connected || !formData.tokenMetadata) {
      setCreationError('Please connect your wallet first');
      return;
    }

    setIsCreating(true);
    setCreationProgress(0);
    setCreationError(null);

    try {
      // Step 1: Upload images (50%)
      console.log('[Campaign Creation] Step 1: Uploading images');
      setCreationProgress(50);
      
      const logoResult = await imageUploadService.uploadLogo(formData.logoImage!);
      const bannerResult = await imageUploadService.uploadBanner(formData.bannerImage!);
      
      console.log('[Campaign Creation] Images uploaded:', { 
        logoUrl: logoResult.url, 
        bannerUrl: bannerResult.url 
      });

      // Step 2: Create campaign via API (75%) - Wallet generated server-side
      console.log('[Campaign Creation] Step 2: Creating campaign via API');
      setCreationProgress(75);
      
      const campaignData = {
        tokenAddress: formData.contractAddress,
        tokenName: formData.tokenMetadata.name,
        tokenSymbol: formData.tokenMetadata.symbol,
        tokenLogoUrl: logoResult.url,
        bannerUrl: bannerResult.url,
        campaignType: 'enhanced_token_info' as const,
        targetAmount: 299, // Fixed Enhanced Token Info price
        deadline: new Date(Date.now() + formData.duration * 60 * 60 * 1000), // Selected duration in hours
        description: `Community crowdfunding campaign to purchase Enhanced Token Info for ${formData.tokenMetadata.name} (${formData.tokenMetadata.symbol})`,
        creatorAddress: publicKey.toString()
      };

      const result = await campaignAPI.create(campaignData);
      
      if (!result.success) {
        throw new Error('Failed to create campaign');
      }

      // Step 3: Complete (100%)
      setCreationProgress(100);

      // Redirect to campaign page
      setTimeout(() => {
        setLocation(`/campaign/${result.campaign.id}`);
      }, 1000);

    } catch (error) {
      console.error('Campaign creation error:', error);
      setCreationError(error instanceof Error ? error.message : 'Failed to create campaign');
    } finally {
      setIsCreating(false);
    }
  };


  if (!connected) {
    return (
      <div className="min-h-screen bg-dark-gradient flex items-center justify-center p-4">
        <div className="card-dark max-w-md w-full p-8 text-center space-y-8 glow-purple">
          <div className="w-16 h-16 mx-auto bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-white mb-4">Connect Your Wallet</h2>
            <p className="text-gray-400 text-lg">
              Connect your Solana wallet to create a campaign
            </p>
          </div>
          <WalletMultiButton className="!bg-gradient-to-r !from-purple-600 !to-pink-600 !text-white hover:!from-purple-700 hover:!to-pink-700 !font-semibold !py-4 !px-8 !rounded-xl !transition-all !duration-200 w-full !text-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h2 className="heading-dark-2">Create Campaign</h2>
        <p className="text-gray-400 text-lg">
          Fund Enhanced Token Info for your favorite Solana token
        </p>
      </div>
      
      <div className="space-y-8">
        {/* Token Address Input */}
        <div className="space-y-3">
          <label className="text-base font-semibold text-white">Token Contract Address</label>
          <div className="relative">
            <input
              type="text"
              placeholder="Enter Solana token contract address..."
              value={formData.contractAddress}
              onChange={(e) => setFormData(prev => ({ ...prev, contractAddress: e.target.value }))}
              className="input-dark w-full pr-12"
            />
            {isValidatingToken && (
              <Loader2 className="absolute right-4 top-4 h-5 w-5 animate-spin text-purple-400" />
            )}
          </div>
          
          {tokenError && (
            <div className="card-dark p-4 border border-red-500/30 bg-red-500/10">
              <div className="flex items-center space-x-3">
                <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
                <p className="text-red-400 text-sm">{tokenError}</p>
              </div>
            </div>
          )}
          
          {formData.tokenMetadata && (
            <div className="card-dark p-6 border border-purple-500/30 bg-gradient-to-r from-purple-600/10 to-pink-600/10">
              <div className="flex items-center space-x-4">
                {formData.tokenMetadata.image && (
                  <img 
                    src={formData.tokenMetadata.image} 
                    alt={formData.tokenMetadata.name}
                    className="w-16 h-16 rounded-full border-2 border-gray-700"
                  />
                )}
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="text-xl font-bold text-white">{formData.tokenMetadata.name}</span>
                    <div className="badge-dark badge-dark-active">{formData.tokenMetadata.symbol}</div>
                    {formData.tokenMetadata.verified && (
                      <div className="flex items-center space-x-1 px-2 py-1 bg-green-500/20 text-green-400 border border-green-500/50 rounded-lg">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-sm font-medium">Verified</span>
                      </div>
                    )}
                  </div>
                  <p className="text-gray-400">
                    Supply: {formData.tokenMetadata.supply?.toLocaleString() || 'Unknown'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Contract: {formData.contractAddress}
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Social Links */}
        <div className="space-y-6">
          <h3 className="text-xl font-semibold text-white flex items-center">
            <Link2 className="h-6 w-6 mr-3 text-purple-400" />
            Social Links (Optional)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <label className="text-base font-medium text-gray-300">Twitter</label>
              <input
                type="url"
                placeholder="https://twitter.com/..."
                value={formData.socialLinks.twitter || ''}
                onChange={handleSocialLinkChange('twitter')}
                className="input-dark w-full"
              />
            </div>
            <div className="space-y-3">
              <label className="text-base font-medium text-gray-300">Telegram</label>
              <input
                type="url"
                placeholder="https://t.me/..."
                value={formData.socialLinks.telegram || ''}
                onChange={handleSocialLinkChange('telegram')}
                className="input-dark w-full"
              />
            </div>
            <div className="space-y-3">
              <label className="text-base font-medium text-gray-300">Website</label>
              <input
                type="url"
                placeholder="https://example.com"
                value={formData.socialLinks.website || ''}
                onChange={handleSocialLinkChange('website')}
                className="input-dark w-full"
              />
            </div>
          </div>
        </div>

        {/* Image Uploads */}
        <div className="space-y-6">
          <h3 className="text-xl font-semibold text-white flex items-center">
            <ImageIcon className="h-6 w-6 mr-3 text-purple-400" />
            Campaign Images
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Logo Upload */}
            <div className="space-y-3">
              <label className="block">
                <div className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300
                  ${formData.logoImage ? 'border-purple-500 bg-purple-500/10' : 'border-gray-700 hover:border-purple-500/50 hover:bg-purple-500/5'}`}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload('logo')}
                    className="sr-only"
                  />
                  {formData.logoImage ? (
                    <div className="space-y-3">
                      <CheckCircle className="h-10 w-10 mx-auto text-purple-400" />
                      <p className="text-base font-medium text-white">{formData.logoImage.name}</p>
                      <p className="text-sm text-gray-400">Click to change</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Upload className="h-10 w-10 mx-auto text-gray-400" />
                      <p className="text-base font-medium text-white">Logo Image (1:1)</p>
                      <p className="text-sm text-gray-400">Square image, max 5MB</p>
                    </div>
                  )}
                </div>
              </label>
            </div>

            {/* Banner Upload */}
            <div className="space-y-3">
              <label className="block">
                <div className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300
                  ${formData.bannerImage ? 'border-purple-500 bg-purple-500/10' : 'border-gray-700 hover:border-purple-500/50 hover:bg-purple-500/5'}`}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload('banner')}
                    className="sr-only"
                  />
                  {formData.bannerImage ? (
                    <div className="space-y-3">
                      <CheckCircle className="h-10 w-10 mx-auto text-purple-400" />
                      <p className="text-base font-medium text-white">{formData.bannerImage.name}</p>
                      <p className="text-sm text-gray-400">Click to change</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Upload className="h-10 w-10 mx-auto text-gray-400" />
                      <p className="text-base font-medium text-white">Banner Image (3:1)</p>
                      <p className="text-sm text-gray-400">Wide image, max 5MB</p>
                    </div>
                  )}
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Campaign Duration */}
        <div className="space-y-6">
          <h3 className="text-xl font-semibold text-white flex items-center">
            <Clock className="h-6 w-6 mr-3 text-purple-400" />
            Campaign Duration
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[4, 8, 12, 24].map((hours) => (
              <button
                key={hours}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, duration: hours }))}
                className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                  formData.duration === hours
                    ? 'border-purple-500 bg-purple-500/20 text-white'
                    : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-purple-500/50 hover:text-gray-300'
                }`}
              >
                <div className="text-center">
                  <div className="text-2xl font-bold mb-1">{hours}</div>
                  <div className="text-sm">Hour{hours !== 1 ? 's' : ''}</div>
                </div>
              </button>
            ))}
          </div>
          
          <div className="card-dark p-4 border border-yellow-500/30 bg-yellow-500/10">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-yellow-400 flex-shrink-0" />
              <p className="text-yellow-400 text-sm">
                Selected duration: <strong className="text-white">{formData.duration} hours</strong>. 
                Campaign will end at {new Date(Date.now() + formData.duration * 60 * 60 * 1000).toLocaleString()}.
              </p>
            </div>
          </div>
        </div>

        {/* Campaign Info */}
        <div className="card-dark p-6 border border-blue-500/30 bg-blue-500/10">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-6 w-6 text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-blue-400 font-medium mb-2">Campaign Information</p>
              <p className="text-gray-300 leading-relaxed">
                Your campaign will raise <strong className="text-white">$299 USD</strong> to purchase Enhanced Token Info on DexScreener. 
                The campaign will run for <strong className="text-white">{formData.duration} hours</strong> or until fully funded.
              </p>
            </div>
          </div>
        </div>

        {/* Creation Progress */}
        {isCreating && (
          <div className="card-dark p-8 space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold text-white">Creating Campaign...</span>
              <span className="text-base text-purple-400 font-medium">{creationProgress}%</span>
            </div>
            <div className="progress-dark">
              <div className="progress-dark-bar" style={{ width: `${creationProgress}%` }} />
            </div>
            <p className="text-base text-gray-400">
              {creationProgress <= 25 && 'Generating secure campaign wallet...'}
              {creationProgress > 25 && creationProgress <= 50 && 'Uploading images...'}
              {creationProgress > 50 && creationProgress <= 75 && 'Creating campaign...'}
              {creationProgress > 75 && 'Finalizing...'}
            </p>
          </div>
        )}

        {creationError && (
          <div className="card-dark p-6 border border-red-500/30 bg-red-500/10">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-6 w-6 text-red-400 flex-shrink-0" />
              <p className="text-red-400 text-base">{creationError}</p>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick={createCampaign}
          disabled={!canSubmit || isCreating}
          className={`w-full btn-dark-primary text-lg py-4 ${
            !canSubmit || isCreating ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {isCreating ? (
            <>
              <Loader2 className="h-5 w-5 mr-3 animate-spin" />
              Creating Campaign...
            </>
          ) : (
            <>
              Create Campaign
              <CheckCircle className="h-5 w-5 ml-3" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};

// Debounce utility
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export default SimplifiedCampaignCreationForm;