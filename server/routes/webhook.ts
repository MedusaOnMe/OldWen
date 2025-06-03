import { Router } from 'express';
import { heliusWebhookService } from '../services/HeliusWebhook.js';

const router = Router();

// Helius webhook endpoint
router.post('/helius-webhook', async (req, res) => {
  console.log('🚀 WEBHOOK RECEIVED!');
  console.log('Headers:', req.headers);
  console.log('Body type:', typeof req.body);
  console.log('Body length:', Array.isArray(req.body) ? req.body.length : 'not array');
  if (Array.isArray(req.body) && req.body.length > 0) {
    console.log('First transaction:', req.body[0]);
  }
  
  await heliusWebhookService.processWebhook(req, res);
});

// Webhook health check
router.get('/webhook/health', async (req, res) => {
  try {
    const health = await heliusWebhookService.healthCheck();
    res.json(health);
  } catch (error) {
    res.status(500).json({ error: 'Webhook health check failed' });
  }
});

export default router;