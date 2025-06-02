import { Router } from 'express';
import { getUSDCBalance, getTransactionHistory } from '../services/solana.js';

const router = Router();

router.get('/balances/:wallet', async (req, res) => {
  try {
    const balance = await getUSDCBalance(req.params.wallet);
    res.json({ success: true, balance, wallet: req.params.wallet });
  } catch (error) {
    console.error('Error getting balance:', error);
    res.status(500).json({ success: false, error: 'Failed to get balance' });
  }
});

router.get('/transactions/:wallet', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const transactions = await getTransactionHistory(req.params.wallet, limit);
    res.json({ success: true, transactions, wallet: req.params.wallet });
  } catch (error) {
    console.error('Error getting transactions:', error);
    res.status(500).json({ success: false, error: 'Failed to get transactions' });
  }
});

export default router;