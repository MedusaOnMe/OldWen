import { Router } from 'express';
import { heliusWebhookService } from '../services/HeliusWebhook.js';

const router = Router();

// Helius webhook endpoint
router.post('/helius-webhook', async (req, res) => {
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