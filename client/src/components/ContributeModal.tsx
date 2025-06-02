import React, { useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getAssociatedTokenAddress, createTransferInstruction, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Copy, Loader2, Wallet } from 'lucide-react';
import { Campaign } from '../types/campaign';
import { campaignAPI } from '../services/api';
import { useToast } from '../hooks/use-toast';

interface ContributeModalProps {
  campaign: Campaign;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

export function ContributeModal({ campaign, isOpen, onClose, onSuccess }: ContributeModalProps) {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const { toast } = useToast();
  const [amount, setAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleContribute = async () => {
    if (!publicKey) {
      setError('Please connect your wallet first');
      return;
    }

    const contributionAmount = parseFloat(amount);
    if (isNaN(contributionAmount) || contributionAmount < 5) {
      setError('Minimum contribution is $5 USDC');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Get token accounts
      const fromTokenAccount = await getAssociatedTokenAddress(USDC_MINT, publicKey);
      const toPublicKey = new PublicKey(campaign.walletAddress);
      const toTokenAccount = await getAssociatedTokenAddress(USDC_MINT, toPublicKey);

      // Create transfer instruction
      const transferInstruction = createTransferInstruction(
        fromTokenAccount,
        toTokenAccount,
        publicKey,
        contributionAmount * 1e6, // USDC has 6 decimals
        [],
        TOKEN_PROGRAM_ID
      );

      // Create and send transaction
      const transaction = new Transaction().add(transferInstruction);
      const signature = await sendTransaction(transaction, connection);
      
      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');

      // Record contribution in database
      await campaignAPI.contribute(campaign.id, {
        contributorAddress: publicKey.toString(),
        amount: contributionAmount,
        transactionHash: signature,
      });

      toast({
        title: 'Contribution Successful!',
        description: `You contributed $${contributionAmount} USDC to ${campaign.tokenName}`,
      });

      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error('Contribution error:', err);
      setError(err.message || 'Failed to process contribution');
    } finally {
      setIsProcessing(false);
    }
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(campaign.walletAddress);
    toast({
      title: 'Address Copied',
      description: 'Campaign wallet address copied to clipboard',
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Contribute to {campaign.tokenName}</DialogTitle>
          <DialogDescription>
            Support this campaign by contributing USDC. Your contribution will help reach the ${campaign.targetAmount} goal.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label>Campaign Progress</Label>
            <div className="text-sm text-muted-foreground">
              ${campaign.currentAmount.toFixed(2)} / ${campaign.targetAmount.toFixed(2)} USDC
              ({((campaign.currentAmount / campaign.targetAmount) * 100).toFixed(1)}% funded)
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Contribution Amount (USDC)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="5"
              step="0.01"
            />
            <p className="text-sm text-muted-foreground">Minimum contribution: $5 USDC</p>
          </div>

          <div className="space-y-2">
            <Label>Campaign Wallet Address</Label>
            <div className="flex items-center gap-2">
              <code className="text-xs bg-muted p-2 rounded flex-1 overflow-hidden text-ellipsis">
                {campaign.walletAddress}
              </code>
              <Button size="sm" variant="outline" onClick={copyAddress}>
                <Copy className="h-3 w-3" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              You can also send USDC directly to this address
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button onClick={handleContribute} disabled={isProcessing || !publicKey || !amount}>
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : !publicKey ? (
              <>
                <Wallet className="mr-2 h-4 w-4" />
                Connect Wallet
              </>
            ) : (
              `Contribute $${amount || '0'}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}