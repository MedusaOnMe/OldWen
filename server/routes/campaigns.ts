import { Router } from 'express';
import { campaignService } from '../services/campaign.js';
import { z } from 'zod';

const router = Router();

const CreateCampaignSchema = z.object({
  tokenAddress: z.string(),
  tokenName: z.string(),
  tokenSymbol: z.string(),
  tokenLogoUrl: z.string().optional(),
  bannerUrl: z.string().optional(),
  campaignType: z.enum(['enhanced_token_info', 'advertising', 'boost']),
  targetAmount: z.number().min(5),
  deadline: z.string().transform(str => new Date(str)),
  description: z.string(),
  creatorAddress: z.string()
});

router.post('/campaigns', async (req, res) => {
  try {
    const data = CreateCampaignSchema.parse(req.body);
    const campaign = await campaignService.createCampaign(data);
    res.json({ success: true, campaign });
  } catch (error) {
    console.error('Error creating campaign:', error);
    res.status(400).json({ 
      success: false, 
      error: error instanceof z.ZodError ? error.errors : 'Failed to create campaign' 
    });
  }
});

router.get('/campaigns', async (req, res) => {
  try {
    const { status, tokenAddress, campaignType } = req.query;
    const campaigns = await campaignService.listCampaigns({
      status: status as any,
      tokenAddress: tokenAddress as string,
      campaignType: campaignType as any
    });
    res.json({ success: true, campaigns });
  } catch (error) {
    console.error('Error listing campaigns:', error);
    res.status(500).json({ success: false, error: 'Failed to list campaigns' });
  }
});

router.get('/campaigns/:id', async (req, res) => {
  try {
    const campaign = await campaignService.getCampaign(req.params.id);
    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }
    res.json({ success: true, campaign });
  } catch (error) {
    console.error('Error getting campaign:', error);
    res.status(500).json({ success: false, error: 'Failed to get campaign' });
  }
});

router.get('/campaigns/:id/contributions', async (req, res) => {
  try {
    const contributions = await campaignService.getContributions(req.params.id);
    res.json({ success: true, contributions });
  } catch (error) {
    console.error('Error getting contributions:', error);
    res.status(500).json({ success: false, error: 'Failed to get contributions' });
  }
});

const ContributeSchema = z.object({
  contributorAddress: z.string(),
  amount: z.number().min(0.01), // Minimum 0.01 SOL
  transactionHash: z.string()
});

router.post('/campaigns/:id/contribute', async (req, res) => {
  try {
    const data = ContributeSchema.parse(req.body);
    const contribution = await campaignService.recordContribution({
      campaignId: req.params.id,
      ...data
    });
    res.json({ success: true, contribution });
  } catch (error) {
    console.error('Error recording contribution:', error);
    res.status(400).json({ 
      success: false, 
      error: error instanceof z.ZodError ? error.errors : 'Failed to record contribution' 
    });
  }
});

// Platform-wide statistics
router.get('/stats/platform', async (req, res) => {
  try {
    const stats = await campaignService.getPlatformStats();
    res.json({ success: true, stats });
  } catch (error) {
    console.error('Error getting platform stats:', error);
    res.status(500).json({ success: false, error: 'Failed to get platform stats' });
  }
});

export default router;