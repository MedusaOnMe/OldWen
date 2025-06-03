import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useLocation } from 'wouter';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useQuery } from '@tanstack/react-query';
import { 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  ArrowRight, 
  Eye, 
  EyeOff,
  Clock,
  DollarSign,
  Shield,
  Zap,
  Star,
  Users,
  TrendingUp
} from 'lucide-react';

import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Alert, AlertDescription } from './ui/alert';
import { Progress } from './ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';

import ImageUpload from './ImageUpload';
import SocialLinkInput from './SocialLinkInput';
import PostFundingOption from './PostFundingOption';
import { ErrorBoundary } from './ErrorBoundary';

import { heliusService, TokenMetadata, TokenValidationResult } from '../services/helius';
import { databaseService, Campaign } from '../services/database';
import { campaignAPI } from '../services/api';
import { formatTimestamp } from '../utils/timestamp';

// Form data interface
interface CampaignFormData {
  contractAddress: string;
  description: string;
  logoImage: File | null;
  bannerImage: File | null;
  socialLinks: {
    telegram?: string;
    twitter?: string;
    website?: string;
  };
  postFundingAction: 'none' | 'boosts' | 'advertising';
  customAmount?: number;
}

// Form validation state
interface FormValidation {
  contractAddress: { isValid: boolean; error?: string };
  description: { isValid: boolean; error?: string };
  logoImage: { isValid: boolean; error?: string };
  bannerImage: { isValid: boolean; error?: string };
  postFundingAction: { isValid: boolean; error?: string };
  customAmount: { isValid: boolean; error?: string };
}

// Step progression
const FORM_STEPS = [
  { id: 'token', title: 'Token Validation', description: 'Verify your token contract' },
  { id: 'details', title: 'Campaign Details', description: 'Add description and images' },
  { id: 'social', title: 'Social Links', description: 'Connect your community' },
  { id: 'funding', title: 'Funding Options', description: 'Choose post-funding actions' },
  { id: 'review', title: 'Review & Create', description: 'Confirm and submit' },
] as const;

type FormStep = typeof FORM_STEPS[number]['id'];

export const CampaignCreationForm: React.FC = () => {
  const [, setLocation] = useLocation();
  const { publicKey, connected } = useWallet();

  // Form state
  const [currentStep, setCurrentStep] = useState<FormStep>('token');
  const [formData, setFormData] = useState<CampaignFormData>({
    contractAddress: '',
    description: '',
    logoImage: null,
    bannerImage: null,
    socialLinks: {},
    postFundingAction: 'none',
    customAmount: undefined
  });

  // Validation state
  const [validation, setValidation] = useState<FormValidation>({
    contractAddress: { isValid: false },
    description: { isValid: false },
    logoImage: { isValid: false },
    bannerImage: { isValid: false },
    postFundingAction: { isValid: true },
    customAmount: { isValid: true }
  });

  // Token validation state
  const [tokenMetadata, setTokenMetadata] = useState<TokenMetadata | null>(null);
  const [isValidatingToken, setIsValidatingToken] = useState(false);
  const [tokenValidationError, setTokenValidationError] = useState<string | null>(null);

  // Campaign creation state
  const [isCreating, setIsCreating] = useState(false);
  const [creationProgress, setCreationProgress] = useState(0);
  const [creationError, setCreationError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Debounced token validation
  const debouncedValidateToken = useCallback(
    debounce(async (contractAddress: string) => {
      if (!contractAddress || contractAddress.length < 32) {
        setTokenMetadata(null);
        setTokenValidationError(null);
        return;
      }

      setIsValidatingToken(true);
      setTokenValidationError(null);

      try {
        // Check if campaign already exists
        const exists = await databaseService.checkContractAddressExists(contractAddress);
        if (exists) {
          setTokenValidationError('A campaign already exists for this token contract');
          setTokenMetadata(null);
          setValidation(prev => ({
            ...prev,
            contractAddress: { isValid: false, error: 'Campaign already exists' }
          }));
          return;
        }

        // Validate with Helius
        const result: TokenValidationResult = await heliusService.validateToken(contractAddress);
        
        if (result.isValid && result.metadata) {
          setTokenMetadata(result.metadata);
          setValidation(prev => ({
            ...prev,
            contractAddress: { isValid: true }
          }));
        } else {
          setTokenValidationError(result.error || 'Token validation failed');
          setTokenMetadata(null);
          setValidation(prev => ({
            ...prev,
            contractAddress: { isValid: false, error: result.error }
          }));
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Token validation failed';
        setTokenValidationError(errorMessage);
        setTokenMetadata(null);
        setValidation(prev => ({
          ...prev,
          contractAddress: { isValid: false, error: errorMessage }
        }));
      } finally {
        setIsValidatingToken(false);
      }
    }, 800),
    []
  );

  // Platform statistics query
  const { data: platformStats } = useQuery({
    queryKey: ['platform-stats'],
    queryFn: () => databaseService.getPlatformStats(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 30 * 60 * 1000 // 30 minutes
  });

  // Form validation effects
  useEffect(() => {
    debouncedValidateToken(formData.contractAddress);
  }, [formData.contractAddress, debouncedValidateToken]);

  useEffect(() => {
    // Validate description
    const isDescriptionValid = formData.description.length >= 100 && formData.description.length <= 500;
    setValidation(prev => ({
      ...prev,
      description: {
        isValid: isDescriptionValid,
        error: !isDescriptionValid ? 'Description must be 100-500 characters' : undefined
      }
    }));
  }, [formData.description]);

  useEffect(() => {
    // Validate images
    setValidation(prev => ({
      ...prev,
      logoImage: { isValid: !!formData.logoImage },
      bannerImage: { isValid: !!formData.bannerImage }
    }));
  }, [formData.logoImage, formData.bannerImage]);

  useEffect(() => {
    // Validate post-funding action
    const needsAmount = formData.postFundingAction !== 'none';
    const hasValidAmount = !needsAmount || (formData.customAmount && formData.customAmount >= 100);
    
    setValidation(prev => ({
      ...prev,
      postFundingAction: { isValid: true },
      customAmount: {
        isValid: hasValidAmount,
        error: needsAmount && !hasValidAmount ? 'Amount is required for this option' : undefined
      }
    }));
  }, [formData.postFundingAction, formData.customAmount]);

  // Step validation
  const isStepValid = useMemo(() => {
    switch (currentStep) {
      case 'token':
        return validation.contractAddress.isValid && !!tokenMetadata;
      case 'details':
        return validation.description.isValid && validation.logoImage.isValid && validation.bannerImage.isValid;
      case 'social':
        return true; // Social links are optional
      case 'funding':
        return validation.postFundingAction.isValid && validation.customAmount.isValid;
      case 'review':
        return Object.values(validation).every(v => v.isValid);
      default:
        return false;
    }
  }, [currentStep, validation, tokenMetadata]);

  // Navigation helpers
  const nextStep = useCallback(() => {
    const currentIndex = FORM_STEPS.findIndex(step => step.id === currentStep);
    if (currentIndex < FORM_STEPS.length - 1 && isStepValid) {
      setCurrentStep(FORM_STEPS[currentIndex + 1].id);
    }
  }, [currentStep, isStepValid]);

  const prevStep = useCallback(() => {
    const currentIndex = FORM_STEPS.findIndex(step => step.id === currentStep);
    if (currentIndex > 0) {
      setCurrentStep(FORM_STEPS[currentIndex - 1].id);
    }
  }, [currentStep]);

  const goToStep = useCallback((stepId: FormStep) => {
    setCurrentStep(stepId);
  }, []);

  // Form handlers
  const handleInputChange = useCallback((field: keyof CampaignFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSocialLinkChange = useCallback((platform: keyof CampaignFormData['socialLinks'], value: string) => {
    setFormData(prev => ({
      ...prev,
      socialLinks: { ...prev.socialLinks, [platform]: value }
    }));
  }, []);

  // Campaign creation
  const createCampaign = useCallback(async () => {
    if (!publicKey || !connected || !tokenMetadata) {
      setCreationError('Please connect your wallet first');
      return;
    }

    setIsCreating(true);
    setCreationProgress(0);
    setCreationError(null);

    try {
      // Step 1: Upload images (30%)
      setCreationProgress(30);
      const logoUrl = await uploadImageToStorage(formData.logoImage!, 'logos');
      const bannerUrl = await uploadImageToStorage(formData.bannerImage!, 'banners');

      // Step 2: Prepare campaign data (60%)
      setCreationProgress(60);
      const targetAmount = 299; // Base Enhanced Token Info price
      const totalTargetAmount = formData.postFundingAction === 'none' 
        ? targetAmount 
        : targetAmount + (formData.customAmount || 0);

      // Step 3: Create campaign via API (80%) - Wallet generated server-side
      setCreationProgress(80);
      const campaignData = {
        tokenAddress: formData.contractAddress,
        tokenName: tokenMetadata.name,
        tokenSymbol: tokenMetadata.symbol,
        tokenLogoUrl: logoUrl,
        campaignType: 'enhanced_token_info' as const,
        targetAmount: totalTargetAmount,
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        description: formData.description,
        creatorAddress: publicKey.toString()
      };

      const result = await campaignAPI.create(campaignData);
      
      if (!result.success) {
        throw new Error('Failed to create campaign');
      }

      // Step 4: Complete (100%)
      setCreationProgress(100);

      // Navigate to campaign page
      setTimeout(() => {
        setLocation(`/campaign/${result.campaign.id}`);
      }, 1000);

    } catch (error) {
      console.error('Campaign creation error:', error);
      setCreationError(error instanceof Error ? error.message : 'Failed to create campaign');
    } finally {
      setIsCreating(false);
    }
  }, [publicKey, connected, tokenMetadata, formData, setLocation]);

  // Mock image upload function (replace with actual storage implementation)
  const uploadImageToStorage = async (file: File, folder: string): Promise<string> => {
    // This would upload to Firebase Storage or similar
    // For now, create a blob URL
    return URL.createObjectURL(file);
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 'token':
        return (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">Token Validation</h2>
              <p className="text-gray-300">
                Enter your Solana token contract address to verify eligibility and fetch metadata
              </p>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Enter Solana token contract address..."
                  value={formData.contractAddress}
                  onChange={(e) => handleInputChange('contractAddress', e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                {isValidatingToken && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <Loader2 className="h-5 w-5 text-white animate-spin" />
                  </div>
                )}
              </div>

              {tokenValidationError && (
                <Alert variant="destructive" className="bg-red-500/20 border-red-500/50">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-red-200">
                    {tokenValidationError}
                  </AlertDescription>
                </Alert>
              )}

              {tokenMetadata && (
                <Card className="bg-green-500/20 border-green-500/50">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4">
                      {tokenMetadata.image && (
                        <img 
                          src={tokenMetadata.image} 
                          alt={tokenMetadata.name}
                          className="w-16 h-16 rounded-full border-2 border-green-400"
                        />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="text-white font-semibold text-lg">
                            {tokenMetadata.name}
                          </h3>
                          <Badge variant="secondary" className="bg-green-500/30 text-green-200">
                            {tokenMetadata.symbol}
                          </Badge>
                          {tokenMetadata.verified && (
                            <Badge className="bg-blue-500/30 text-blue-200">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Verified
                            </Badge>
                          )}
                        </div>
                        <p className="text-gray-300 text-sm mt-1">
                          Supply: {tokenMetadata.supply?.toLocaleString() || 'Unknown'}
                        </p>
                        {tokenMetadata.description && (
                          <p className="text-gray-400 text-sm mt-2 line-clamp-2">
                            {tokenMetadata.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Platform Statistics */}
            {platformStats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                <div className="bg-white/5 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-400">{platformStats.totalCampaigns}</div>
                  <div className="text-gray-400 text-sm">Total Campaigns</div>
                </div>
                <div className="bg-white/5 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-400">{platformStats.activeCampaigns}</div>
                  <div className="text-gray-400 text-sm">Active Now</div>
                </div>
                <div className="bg-white/5 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-purple-400">${platformStats.totalFunded.toFixed(0)}</div>
                  <div className="text-gray-400 text-sm">Total Funded</div>
                </div>
                <div className="bg-white/5 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-400">{platformStats.totalContributions}</div>
                  <div className="text-gray-400 text-sm">Contributions</div>
                </div>
              </div>
            )}
          </div>
        );

      case 'details':
        return (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center">
                <Star className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">Campaign Details</h2>
              <p className="text-gray-300">
                Add a compelling description and upload high-quality images for your campaign
              </p>
            </div>

            <div className="space-y-6">
              {/* Description */}
              <div className="space-y-2">
                <label className="block text-white text-lg font-semibold">
                  Campaign Description *
                </label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Describe your campaign and why the community should fund Enhanced Token Info for your token. Highlight unique features, community benefits, and project roadmap..."
                  className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-lg text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 h-32 resize-none"
                  maxLength={500}
                />
                <div className="flex justify-between text-sm">
                  <span className={`${
                    formData.description.length < 100 ? 'text-red-400' : 
                    formData.description.length > 450 ? 'text-yellow-400' : 
                    'text-green-400'
                  }`}>
                    {formData.description.length < 100 ? 
                      `${100 - formData.description.length} more characters needed` :
                      'Description length looks good'
                    }
                  </span>
                  <span className="text-gray-400">
                    {formData.description.length}/500
                  </span>
                </div>
              </div>

              {/* Image Uploads */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ImageUpload
                  label="Logo Image (1:1 ratio)"
                  aspectRatio="1:1"
                  maxSize={2 * 1024 * 1024} // 2MB
                  onImageSelect={(file) => handleInputChange('logoImage', file)}
                  required
                />
                <ImageUpload
                  label="Banner Image (3:1 ratio)"
                  aspectRatio="3:1"
                  maxSize={5 * 1024 * 1024} // 5MB
                  onImageSelect={(file) => handleInputChange('bannerImage', file)}
                  required
                />
              </div>

              {/* Preview Card */}
              {formData.logoImage && formData.bannerImage && formData.description.length >= 100 && (
                <Card className="bg-white/5 border-white/20">
                  <CardHeader>
                    <CardTitle className="text-white">Campaign Preview</CardTitle>
                    <CardDescription className="text-gray-300">
                      This is how your campaign will appear to contributors
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="relative">
                      <img 
                        src={URL.createObjectURL(formData.bannerImage)}
                        alt="Campaign banner"
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <img 
                        src={URL.createObjectURL(formData.logoImage)}
                        alt="Campaign logo"
                        className="absolute -bottom-6 left-4 w-12 h-12 rounded-full border-2 border-white"
                      />
                    </div>
                    <div className="pt-6">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-white font-semibold">
                          {tokenMetadata?.name || 'Token Name'}
                        </h3>
                        <Badge variant="secondary">
                          {tokenMetadata?.symbol || 'SYMBOL'}
                        </Badge>
                      </div>
                      <p className="text-gray-300 text-sm line-clamp-3">
                        {formData.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        );

      case 'social':
        return (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center">
                <Users className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">Connect Your Community</h2>
              <p className="text-gray-300">
                Add social media links to help contributors find and engage with your community (optional)
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <SocialLinkInput
                icon="telegram"
                placeholder="Telegram Channel"
                value={formData.socialLinks.telegram || ''}
                onChange={(value) => handleSocialLinkChange('telegram', value)}
              />
              <SocialLinkInput
                icon="twitter"
                placeholder="Twitter/X Profile"
                value={formData.socialLinks.twitter || ''}
                onChange={(value) => handleSocialLinkChange('twitter', value)}
              />
              <SocialLinkInput
                icon="website"
                placeholder="Project Website"
                value={formData.socialLinks.website || ''}
                onChange={(value) => handleSocialLinkChange('website', value)}
              />
            </div>

            <Alert className="bg-blue-500/20 border-blue-500/50">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-blue-200">
                <strong>Pro Tip:</strong> Adding social links increases trust and helps contributors connect with your community. 
                Campaigns with social links receive 40% more contributions on average.
              </AlertDescription>
            </Alert>
          </div>
        );

      case 'funding':
        return (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-gradient-to-r from-yellow-500 to-orange-600 rounded-full flex items-center justify-center">
                <TrendingUp className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">Choose Your Funding Strategy</h2>
              <p className="text-gray-300">
                Decide what happens after your Enhanced Token Info ($299) is successfully funded
              </p>
            </div>

            <div className="space-y-4">
              <PostFundingOption
                type="none"
                title="Enhanced Token Info Only"
                description="Campaign completes after Enhanced Token Info is funded"
                selected={formData.postFundingAction === 'none'}
                onSelect={() => handleInputChange('postFundingAction', 'none')}
              />
              
              <PostFundingOption
                type="boosts"
                title="Continue for DexScreener Boosts"
                description="Additional crowdfunding for trending placement and visibility"
                selected={formData.postFundingAction === 'boosts'}
                onSelect={() => handleInputChange('postFundingAction', 'boosts')}
                showAmountInput={formData.postFundingAction === 'boosts'}
                amount={formData.customAmount}
                onAmountChange={(amount) => handleInputChange('customAmount', amount)}
              />
              
              <PostFundingOption
                type="advertising"
                title="Continue for DexScreener Advertising"
                description="Premium placement and featured listings for maximum exposure"
                selected={formData.postFundingAction === 'advertising'}
                onSelect={() => handleInputChange('postFundingAction', 'advertising')}
                showAmountInput={formData.postFundingAction === 'advertising'}
                amount={formData.customAmount}
                onAmountChange={(amount) => handleInputChange('customAmount', amount)}
              />
            </div>
          </div>
        );

      case 'review':
        return (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full flex items-center justify-center">
                <Eye className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">Review Your Campaign</h2>
              <p className="text-gray-300">
                Double-check all details before creating your campaign
              </p>
            </div>

            <div className="space-y-6">
              {/* Token Information */}
              <Card className="bg-white/5 border-white/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center space-x-2">
                    <Shield className="h-5 w-5" />
                    <span>Token Information</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-4">
                    {tokenMetadata?.image && (
                      <img 
                        src={tokenMetadata.image} 
                        alt={tokenMetadata.name}
                        className="w-12 h-12 rounded-full"
                      />
                    )}
                    <div>
                      <h3 className="text-white font-semibold">
                        {tokenMetadata?.name} ({tokenMetadata?.symbol})
                      </h3>
                      <p className="text-gray-400 text-sm">
                        Contract: {formData.contractAddress}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Campaign Details */}
              <Card className="bg-white/5 border-white/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center space-x-2">
                    <Star className="h-5 w-5" />
                    <span>Campaign Details</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="text-white font-medium">Description</h4>
                    <p className="text-gray-300 text-sm mt-1">{formData.description}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-white font-medium">Logo</h4>
                      {formData.logoImage && (
                        <img 
                          src={URL.createObjectURL(formData.logoImage)}
                          alt="Logo preview"
                          className="w-16 h-16 rounded-lg mt-1"
                        />
                      )}
                    </div>
                    <div>
                      <h4 className="text-white font-medium">Banner</h4>
                      {formData.bannerImage && (
                        <img 
                          src={URL.createObjectURL(formData.bannerImage)}
                          alt="Banner preview"
                          className="w-24 h-8 rounded object-cover mt-1"
                        />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Funding Configuration */}
              <Card className="bg-white/5 border-white/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center space-x-2">
                    <DollarSign className="h-5 w-5" />
                    <span>Funding Configuration</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Enhanced Token Info</span>
                    <span className="text-white font-semibold">$299</span>
                  </div>
                  {formData.postFundingAction !== 'none' && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">
                        Additional {formData.postFundingAction === 'boosts' ? 'Boosts' : 'Advertising'}
                      </span>
                      <span className="text-white font-semibold">${formData.customAmount}</span>
                    </div>
                  )}
                  <div className="border-t border-white/20 pt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-white font-semibold">Total Target Amount</span>
                      <span className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400">
                        ${299 + (formData.postFundingAction === 'none' ? 0 : formData.customAmount || 0)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Social Links */}
              {Object.values(formData.socialLinks).some(link => link) && (
                <Card className="bg-white/5 border-white/20">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center space-x-2">
                      <Users className="h-5 w-5" />
                      <span>Social Links</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {formData.socialLinks.telegram && (
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-400">Telegram:</span>
                        <span className="text-blue-400">{formData.socialLinks.telegram}</span>
                      </div>
                    )}
                    {formData.socialLinks.twitter && (
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-400">Twitter:</span>
                        <span className="text-blue-400">{formData.socialLinks.twitter}</span>
                      </div>
                    )}
                    {formData.socialLinks.website && (
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-400">Website:</span>
                        <span className="text-blue-400">{formData.socialLinks.website}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Creation Progress */}
              {isCreating && (
                <Card className="bg-purple-500/20 border-purple-500/50">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-white font-medium">Creating Campaign...</span>
                        <span className="text-purple-300">{creationProgress}%</span>
                      </div>
                      <Progress value={creationProgress} className="h-2" />
                      <div className="text-purple-200 text-sm">
                        {creationProgress <= 20 && 'Generating secure campaign wallet...'}
                        {creationProgress > 20 && creationProgress <= 40 && 'Uploading images...'}
                        {creationProgress > 40 && creationProgress <= 60 && 'Preparing campaign data...'}
                        {creationProgress > 60 && creationProgress <= 80 && 'Creating campaign in database...'}
                        {creationProgress > 80 && 'Finalizing campaign...'}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {creationError && (
                <Alert variant="destructive" className="bg-red-500/20 border-red-500/50">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-red-200">
                    {creationError}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Don't render if wallet not connected
  if (!connected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
        <Card className="bg-white/10 backdrop-blur-lg border-white/20 max-w-md w-full">
          <CardContent className="p-8 text-center space-y-6">
            <div className="w-16 h-16 mx-auto bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full flex items-center justify-center">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Connect Your Wallet</h2>
              <p className="text-gray-300">
                Connect your Solana wallet to create and manage campaigns
              </p>
            </div>
            <WalletMultiButton className="w-full !bg-gradient-to-r !from-purple-600 !to-indigo-600 !text-white !font-semibold !py-3 !px-6 !rounded-lg !transition-all !duration-200 hover:!from-purple-700 hover:!to-indigo-700" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            {/* Progress Indicator */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                {FORM_STEPS.map((step, index) => {
                  const isCurrentStep = step.id === currentStep;
                  const isCompletedStep = FORM_STEPS.findIndex(s => s.id === currentStep) > index;
                  
                  return (
                    <div
                      key={step.id}
                      className="flex items-center cursor-pointer"
                      onClick={() => goToStep(step.id)}
                    >
                      <div className={`
                        w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-200
                        ${isCurrentStep 
                          ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white scale-110' 
                          : isCompletedStep 
                            ? 'bg-green-500 text-white' 
                            : 'bg-white/20 text-gray-300'
                        }
                      `}>
                        {isCompletedStep ? (
                          <CheckCircle className="h-5 w-5" />
                        ) : (
                          index + 1
                        )}
                      </div>
                      <div className="ml-3 hidden md:block">
                        <div className={`font-medium ${isCurrentStep ? 'text-white' : 'text-gray-300'}`}>
                          {step.title}
                        </div>
                        <div className="text-gray-400 text-sm">{step.description}</div>
                      </div>
                      {index < FORM_STEPS.length - 1 && (
                        <div className="hidden md:block w-16 mx-4 h-0.5 bg-white/20" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Form Content */}
            <Card className="bg-white/10 backdrop-blur-lg border-white/20 shadow-2xl">
              <CardContent className="p-8">
                {renderStepContent()}

                {/* Navigation Buttons */}
                <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/20">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={prevStep}
                    disabled={currentStep === 'token'}
                    className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                  >
                    Previous
                  </Button>

                  <div className="flex space-x-3">
                    {currentStep !== 'review' ? (
                      <Button
                        type="button"
                        onClick={nextStep}
                        disabled={!isStepValid}
                        className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold px-8"
                      >
                        Next
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        onClick={createCampaign}
                        disabled={!isStepValid || isCreating}
                        className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold px-8"
                      >
                        {isCreating ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          <>
                            Create Campaign
                            <CheckCircle className="h-4 w-4 ml-2" />
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

// Debounce utility function
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

export default CampaignCreationForm;