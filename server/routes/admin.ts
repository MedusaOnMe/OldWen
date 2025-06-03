import { Router } from 'express';
import { db, collections } from '../lib/firebase.js';
import { campaignService } from '../services/campaign.js';
import { refundService } from '../services/refund.js';
import { dexScreenerService } from '../services/DexScreenerService.js';
import { transactionVerificationService } from '../services/TransactionVerification.js';
import { heliusWebhookService } from '../services/HeliusWebhook.js';
import { getPrivateKeyForAdmin } from '../services/solana.js';
import { z } from 'zod';

const router = Router();
const ADMIN_SECRET = process.env.ADMIN_SECRET_KEY;

// Admin authentication middleware
const authenticateAdmin = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token || token !== ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
};

// Apply admin auth to all routes
router.use(authenticateAdmin);

// Platform Statistics
router.get('/stats', async (req, res) => {
  try {
    const now = new Date();
    const dateRange = req.query.range || '7d';
    let startDate = new Date();
    
    switch (dateRange) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Get all campaigns
    const campaignsSnapshot = await db.collection(collections.campaigns).get();
    const campaigns = campaignsSnapshot.docs.map(doc => doc.data());

    // Get recent campaigns
    const recentCampaignsSnapshot = await db.collection(collections.campaigns)
      .where('createdAt', '>=', startDate)
      .get();

    // Get all contributions
    const contributionsSnapshot = await db.collection(collections.contributions)
      .where('status', '==', 'confirmed')
      .get();
    const contributions = contributionsSnapshot.docs.map(doc => doc.data());

    // Calculate statistics
    const totalCampaigns = campaigns.length;
    const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
    const completedCampaigns = campaigns.filter(c => c.status === 'completed').length;
    const totalFunded = campaigns.reduce((sum, c) => sum + (c.currentAmount || 0), 0);
    const uniqueContributors = new Set(contributions.map(c => c.contributorAddress)).size;
    const platformFees = totalFunded * 0.02; // 2% fee
    const successRate = totalCampaigns > 0 ? (completedCampaigns / totalCampaigns) * 100 : 0;
    const avgCampaignSize = totalCampaigns > 0 ? totalFunded / totalCampaigns : 0;

    res.json({
      totalCampaigns,
      activeCampaigns,
      completedCampaigns,
      totalFunded,
      totalContributors: uniqueContributors,
      platformFees,
      successRate,
      avgCampaignSize,
      recentCampaigns: recentCampaignsSnapshot.size
    });

  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Campaign Management
router.get('/campaigns', async (req, res) => {
  try {
    const { status, campaignType, limit = '50' } = req.query;
    
    let query = db.collection(collections.campaigns).orderBy('createdAt', 'desc');
    
    if (status) {
      query = query.where('status', '==', status);
    }
    
    if (campaignType) {
      query = query.where('campaignType', '==', campaignType);
    }
    
    const snapshot = await query.limit(parseInt(limit as string)).get();
    
    const campaigns = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const campaignData = doc.data();
        
        // Get contributor count
        const contributionsSnapshot = await db.collection(collections.contributions)
          .where('campaignId', '==', doc.id)
          .where('status', '==', 'confirmed')
          .get();
        
        const uniqueContributors = new Set(
          contributionsSnapshot.docs.map(contrib => contrib.data().contributorAddress)
        ).size;
        
        return {
          id: doc.id,
          ...campaignData,
          contributorCount: uniqueContributors
        };
      })
    );

    res.json(campaigns);

  } catch (error) {
    console.error('Admin campaigns error:', error);
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

// User Management
router.get('/users', async (req, res) => {
  try {
    const { status, limit = '100' } = req.query;
    
    // Get all contributions to build user profiles
    const contributionsSnapshot = await db.collection(collections.contributions)
      .where('status', '==', 'confirmed')
      .get();
    
    const contributions = contributionsSnapshot.docs.map(doc => doc.data());
    
    // Group by contributor address
    const userMap = new Map();
    
    contributions.forEach(contrib => {
      const address = contrib.contributorAddress;
      if (!userMap.has(address)) {
        userMap.set(address, {
          address,
          totalContributed: 0,
          campaignsSupported: new Set(),
          firstContribution: contrib.timestamp,
          lastActivity: contrib.timestamp,
          contributions: []
        });
      }
      
      const user = userMap.get(address);
      user.totalContributed += contrib.amount;
      user.campaignsSupported.add(contrib.campaignId);
      user.contributions.push(contrib);
      
      if (contrib.timestamp < user.firstContribution) {
        user.firstContribution = contrib.timestamp;
      }
      if (contrib.timestamp > user.lastActivity) {
        user.lastActivity = contrib.timestamp;
      }
    });
    
    // Calculate risk scores and format data
    const users = Array.from(userMap.values()).map(user => {
      // Simple risk scoring algorithm
      let riskScore = 0;
      
      // High contribution amounts
      if (user.totalContributed > 10000) riskScore += 20;
      if (user.totalContributed > 50000) riskScore += 30;
      
      // Many campaigns supported
      if (user.campaignsSupported.size > 10) riskScore += 15;
      if (user.campaignsSupported.size > 25) riskScore += 25;
      
      // Recent activity pattern
      const daysSinceFirst = (Date.now() - user.firstContribution.toDate().getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceFirst < 1 && user.totalContributed > 1000) riskScore += 40;
      
      // Round number contributions (potential automation)
      const roundContributions = user.contributions.filter(c => c.amount % 100 === 0).length;
      if (roundContributions / user.contributions.length > 0.8) riskScore += 25;
      
      return {
        address: user.address,
        totalContributed: user.totalContributed,
        campaignsSupported: user.campaignsSupported.size,
        firstContribution: user.firstContribution,
        lastActivity: user.lastActivity,
        riskScore: Math.min(100, riskScore),
        status: riskScore > 75 ? 'flagged' : 'active'
      };
    });
    
    // Sort by total contributed
    users.sort((a, b) => b.totalContributed - a.totalContributed);
    
    // Filter by status if specified
    const filteredUsers = status ? users.filter(u => u.status === status) : users;
    
    res.json(filteredUsers.slice(0, parseInt(limit as string)));

  } catch (error) {
    console.error('Admin users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Transaction Management
router.get('/transactions', async (req, res) => {
  try {
    const { type, status, limit = '100' } = req.query;
    
    let query = db.collection(collections.transactions).orderBy('timestamp', 'desc');
    
    if (type) {
      query = query.where('type', '==', type);
    }
    
    if (status) {
      query = query.where('status', '==', status);
    }
    
    const snapshot = await query.limit(parseInt(limit as string)).get();
    
    const transactions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      verificationMethod: doc.data().verificationMethod || 'standard'
    }));

    res.json(transactions);

  } catch (error) {
    console.error('Admin transactions error:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// System Health
router.get('/health', async (req, res) => {
  try {
    const health = await heliusWebhookService.healthCheck();
    
    // Test database connectivity
    let dbStatus = 'healthy';
    try {
      await db.collection('_health_check').add({ timestamp: new Date() });
    } catch (error) {
      dbStatus = 'down';
    }
    
    // Test blockchain connectivity
    let blockchainStatus = 'healthy';
    try {
      const { connection } = await import('../services/solana.js');
      await connection.getLatestBlockhash();
    } catch (error) {
      blockchainStatus = 'down';
    }
    
    res.json({
      apiStatus: 'healthy',
      dbStatus,
      blockchainStatus,
      webhookStatus: health.status,
      lastUpdate: new Date(),
      errorRate: 0.5, // Mock data - implement real error tracking
      responseTime: 150 // Mock data - implement real response time tracking
    });

  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      apiStatus: 'down',
      dbStatus: 'unknown',
      blockchainStatus: 'unknown',
      webhookStatus: 'unknown',
      lastUpdate: new Date(),
      errorRate: 100,
      responseTime: 0
    });
  }
});

// Campaign Status Update
router.put('/campaigns/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const validStatuses = ['active', 'funded', 'completed', 'failed', 'cancelled', 'refunding'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    await db.collection(collections.campaigns).doc(id).update({
      status,
      updatedAt: new Date()
    });
    
    // Log admin action
    await db.collection('admin_actions').add({
      type: 'campaign_status_update',
      campaignId: id,
      oldStatus: req.body.oldStatus,
      newStatus: status,
      timestamp: new Date(),
      adminAction: true
    });
    
    res.json({ success: true });

  } catch (error) {
    console.error('Campaign status update error:', error);
    res.status(500).json({ error: 'Failed to update campaign status' });
  }
});

// Trigger Refund
router.post('/campaigns/:id/refund', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Trigger refund process
    await refundService.processRefunds(id);
    
    // Update campaign status
    await db.collection(collections.campaigns).doc(id).update({
      status: 'refunding',
      updatedAt: new Date()
    });
    
    // Log admin action
    await db.collection('admin_actions').add({
      type: 'manual_refund_trigger',
      campaignId: id,
      timestamp: new Date(),
      adminAction: true
    });
    
    res.json({ success: true });

  } catch (error) {
    console.error('Refund trigger error:', error);
    res.status(500).json({ error: 'Failed to trigger refund' });
  }
});

// Trigger Service Purchase
router.post('/campaigns/:id/purchase', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get campaign data
    const campaignDoc = await db.collection(collections.campaigns).doc(id).get();
    if (!campaignDoc.exists) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    
    const campaignData = campaignDoc.data();
    
    // Trigger purchase
    const result = await dexScreenerService.manualPurchaseTrigger(id);
    
    // Log admin action
    await db.collection('admin_actions').add({
      type: 'manual_purchase_trigger',
      campaignId: id,
      result: result.success,
      error: result.error,
      timestamp: new Date(),
      adminAction: true
    });
    
    res.json(result);

  } catch (error) {
    console.error('Purchase trigger error:', error);
    res.status(500).json({ error: 'Failed to trigger purchase' });
  }
});

// Ban/Unban User
router.post('/users/:address/ban', async (req, res) => {
  try {
    const { address } = req.params;
    
    // Add to banned users collection
    await db.collection('banned_users').doc(address).set({
      address,
      bannedAt: new Date(),
      reason: req.body.reason || 'Administrative action',
      adminAction: true
    });
    
    // Log admin action
    await db.collection('admin_actions').add({
      type: 'user_banned',
      userAddress: address,
      reason: req.body.reason,
      timestamp: new Date(),
      adminAction: true
    });
    
    res.json({ success: true });

  } catch (error) {
    console.error('Ban user error:', error);
    res.status(500).json({ error: 'Failed to ban user' });
  }
});

router.post('/users/:address/unban', async (req, res) => {
  try {
    const { address } = req.params;
    
    // Remove from banned users collection
    await db.collection('banned_users').doc(address).delete();
    
    // Log admin action
    await db.collection('admin_actions').add({
      type: 'user_unbanned',
      userAddress: address,
      timestamp: new Date(),
      adminAction: true
    });
    
    res.json({ success: true });

  } catch (error) {
    console.error('Unban user error:', error);
    res.status(500).json({ error: 'Failed to unban user' });
  }
});

// Balance Reconciliation
router.post('/reconcile', async (req, res) => {
  try {
    const result = await heliusWebhookService.reconcileAllCampaigns();
    
    // Log admin action
    await db.collection('admin_actions').add({
      type: 'balance_reconciliation',
      result,
      timestamp: new Date(),
      adminAction: true
    });
    
    res.json(result);

  } catch (error) {
    console.error('Reconciliation error:', error);
    res.status(500).json({ error: 'Failed to reconcile balances' });
  }
});

// Platform Control
router.post('/platform/pause', async (req, res) => {
  try {
    // Set platform status to paused
    await db.collection('platform_settings').doc('status').set({
      paused: true,
      pausedAt: new Date(),
      reason: req.body.reason || 'Administrative maintenance'
    });
    
    // Log admin action
    await db.collection('admin_actions').add({
      type: 'platform_paused',
      reason: req.body.reason,
      timestamp: new Date(),
      adminAction: true
    });
    
    res.json({ success: true });

  } catch (error) {
    console.error('Platform pause error:', error);
    res.status(500).json({ error: 'Failed to pause platform' });
  }
});

router.post('/platform/resume', async (req, res) => {
  try {
    // Set platform status to active
    await db.collection('platform_settings').doc('status').set({
      paused: false,
      resumedAt: new Date()
    });
    
    // Log admin action
    await db.collection('admin_actions').add({
      type: 'platform_resumed',
      timestamp: new Date(),
      adminAction: true
    });
    
    res.json({ success: true });

  } catch (error) {
    console.error('Platform resume error:', error);
    res.status(500).json({ error: 'Failed to resume platform' });
  }
});

// Setup webhooks for all active campaigns
router.post('/setup-webhooks', async (req, res) => {
  try {
    // Get all active campaigns
    const campaignsSnapshot = await db.collection(collections.campaigns)
      .where('status', '==', 'active')
      .get();

    const results = [];
    for (const campaignDoc of campaignsSnapshot.docs) {
      const campaignData = campaignDoc.data();
      if (campaignData.walletAddress) {
        try {
          await transactionVerificationService.monitorCampaignWallet(
            campaignDoc.id, 
            campaignData.walletAddress
          );
          results.push({
            campaignId: campaignDoc.id,
            walletAddress: campaignData.walletAddress,
            status: 'success'
          });
        } catch (error) {
          results.push({
            campaignId: campaignDoc.id,
            walletAddress: campaignData.walletAddress,
            status: 'error',
            error: error.message
          });
        }
      }
    }

    // Log admin action
    await db.collection('admin_actions').add({
      type: 'webhooks_setup',
      campaignsProcessed: results.length,
      timestamp: new Date(),
      adminAction: true
    });

    res.json({
      success: true,
      campaignsProcessed: results.length,
      results
    });

  } catch (error) {
    console.error('Setup webhooks error:', error);
    res.status(500).json({ error: 'Failed to setup webhooks' });
  }
});

// Data Export
router.get('/export/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const { dateRange } = req.query;
    
    let data: any[] = [];
    let filename = '';
    
    switch (type) {
      case 'campaigns':
        const campaignsSnapshot = await db.collection(collections.campaigns).get();
        data = campaignsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        filename = 'campaigns.csv';
        break;
        
      case 'contributions':
        const contributionsSnapshot = await db.collection(collections.contributions).get();
        data = contributionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        filename = 'contributions.csv';
        break;
        
      case 'transactions':
        const transactionsSnapshot = await db.collection(collections.transactions).get();
        data = transactionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        filename = 'transactions.csv';
        break;
        
      default:
        return res.status(400).json({ error: 'Invalid export type' });
    }
    
    // Convert to CSV
    if (data.length === 0) {
      return res.status(404).json({ error: 'No data to export' });
    }
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => {
        const value = row[header];
        if (value instanceof Date) {
          return value.toISOString();
        }
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value}"`;
        }
        return value || '';
      }).join(','))
    ].join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);

  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

// SECURITY: Private key access removed from HTTP endpoints
// Use Firestore console + manual decrypt script for private key access

// Admin Action Log
router.get('/actions', async (req, res) => {
  try {
    const { limit = '50' } = req.query;
    
    const snapshot = await db.collection('admin_actions')
      .orderBy('timestamp', 'desc')
      .limit(parseInt(limit as string))
      .get();
    
    const actions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json(actions);

  } catch (error) {
    console.error('Admin actions error:', error);
    res.status(500).json({ error: 'Failed to fetch admin actions' });
  }
});

export default router;