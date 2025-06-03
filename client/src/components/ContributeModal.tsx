import React, { useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Copy, Loader2, Wallet, AlertTriangle, AlertCircle } from 'lucide-react';
import { Campaign } from '../types/campaign';
import { campaignAPI } from '../services/api';
import { useToast } from '../hooks/use-toast';

interface ContributeModalProps {
  campaign: Campaign;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

// No longer needed - using SOL instead of USDC

export function ContributeModal({ campaign, isOpen, onClose, onSuccess }: ContributeModalProps) {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const { toast } = useToast();
  const [amount, setAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);

  const handleContribute = async () => {
    if (!publicKey) {
      setError('Please connect your wallet first');
      return;
    }

    if (!disclaimerAccepted) {
      setError('Please accept the terms before contributing');
      return;
    }

    const contributionAmount = parseFloat(amount);
    if (isNaN(contributionAmount) || contributionAmount < 0.01) {
      setError('Minimum contribution is 0.01 SOL');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      console.log('Starting SOL contribution transaction...');
      
      const toPublicKey = new PublicKey(campaign.walletAddress);
      const lamports = contributionAmount * LAMPORTS_PER_SOL; // Convert SOL to lamports

      console.log('Transfer details:', {
        from: publicKey.toString(),
        to: toPublicKey.toString(),
        amount: contributionAmount,
        lamports: lamports
      });

      // Check if sender has sufficient SOL balance
      const balance = await connection.getBalance(publicKey);
      const minRequiredBalance = lamports + 5000; // Add 5000 lamports for transaction fee
      
      if (balance < minRequiredBalance) {
        throw new Error(`Insufficient SOL balance. You need at least ${(minRequiredBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL (including transaction fees).`);
      }

      // Create SOL transfer transaction
      const transaction = new Transaction();
      
      // Get recent blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      // Add SOL transfer instruction
      const transferInstruction = SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: toPublicKey,
        lamports: lamports,
      });
      transaction.add(transferInstruction);

      console.log('Sending SOL transaction...');
      // Send transaction
      const signature = await sendTransaction(transaction, connection);
      console.log('Transaction sent:', signature);
      
      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');
      console.log('Transaction confirmed');

      // Record contribution in database
      await campaignAPI.contribute(campaign.id, {
        contributorAddress: publicKey.toString(),
        amount: contributionAmount,
        transactionHash: signature,
      });

      toast({
        title: 'Contribution Successful!',
        description: `You contributed ${contributionAmount} SOL to ${campaign.tokenName}`,
      });

      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error('Contribution error:', err);
      
      let errorMessage = 'Failed to process contribution';
      
      if (err.message?.includes('User rejected the request')) {
        errorMessage = 'Transaction was cancelled by user';
      } else if (err.message?.includes('Insufficient funds') || err.message?.includes('Insufficient SOL')) {
        errorMessage = err.message;
      } else if (err.message?.includes('SOL')) {
        errorMessage = err.message;
      } else if (err.message?.includes('simulation failed')) {
        errorMessage = 'Transaction simulation failed. Please check your SOL balance and try again.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
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
      <DialogContent className="sm:max-w-[425px] bg-gray-900 border-gray-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white">
            Contribute to {campaign.tokenName}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Support this campaign by contributing SOL. Your contribution will help reach the ${campaign.targetAmount.toFixed(2)} goal.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {error && (
            <Alert variant="destructive" className="bg-red-500/10 border-red-500/30 text-red-400">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!publicKey && (
            <div className="card-dark p-4 border border-purple-500/30 bg-purple-500/10">
              <div className="flex flex-col items-center space-y-3">
                <Wallet className="h-8 w-8 text-purple-400" />
                <p className="text-purple-400 font-medium text-center">Connect your wallet to contribute</p>
                <WalletMultiButton className="!bg-gradient-to-r !from-purple-600 !to-pink-600 !text-white hover:!from-purple-700 hover:!to-pink-700 !font-semibold !py-2 !px-4 !rounded-lg !transition-all !duration-200" />
              </div>
            </div>
          )}

          <div className="space-y-3">
            <Label className="text-gray-300 font-medium">Campaign Progress</Label>
            <div className="card-dark p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-lg font-semibold text-white">
                  ${campaign.currentAmount.toFixed(2)}
                </span>
                <span className="text-gray-400">
                  of ${campaign.targetAmount.toFixed(2)} USD
                </span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2 mb-2">
                <div 
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min((campaign.currentAmount / campaign.targetAmount) * 100, 100)}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-400">
                {((campaign.currentAmount / campaign.targetAmount) * 100).toFixed(1)}% funded
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <Label htmlFor="amount" className="text-gray-300 font-medium">
              Contribution Amount (SOL)
            </Label>
            <Input
              id="amount"
              type="number"
              placeholder="Enter amount in SOL"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0.01"
              step="0.01"
              className="input-dark"
            />
            <div className="space-y-1 text-sm">
              <p className="text-gray-500">Minimum contribution: 0.01 SOL</p>
              {amount && parseFloat(amount) > 0 && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                  <div className="text-blue-400 font-medium mb-1">Fee Breakdown:</div>
                  <div className="text-gray-300 space-y-1">
                    <div className="flex justify-between">
                      <span>Your contribution:</span>
                      <span>{parseFloat(amount).toFixed(4)} SOL</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Platform fee (5%):</span>
                      <span>{(parseFloat(amount) * 0.05).toFixed(4)} SOL</span>
                    </div>
                    <div className="flex justify-between border-t border-blue-500/30 pt-1 font-semibold">
                      <span>Total to campaign:</span>
                      <span>{(parseFloat(amount) * 0.95).toFixed(4)} SOL</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* DISCLAIMER SECTION */}
          <div className="space-y-3">
            <div className="card-dark p-4 border border-amber-500/30 bg-amber-500/10">
              <div className="text-sm text-amber-200 leading-relaxed space-y-2">
                <p className="font-semibold">• No refunds are issued if the campaign does not reach its target goal</p>
                <p className="font-semibold">• No credits are issued if the token fails to graduate from Pump.fun</p>
                <p className="font-semibold">• No guarantees of token performance or campaign success</p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
              <input
                type="checkbox"
                id="disclaimer-accept"
                checked={disclaimerAccepted}
                onChange={(e) => setDisclaimerAccepted(e.target.checked)}
                className="mt-1 h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
              />
              <label htmlFor="disclaimer-accept" className="text-gray-300 text-sm leading-relaxed cursor-pointer">
                I understand and agree to the terms above.
              </label>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-3 pt-6">
          <Button 
            variant="outline" 
            onClick={onClose} 
            disabled={isProcessing}
            className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleContribute} 
            disabled={isProcessing || !publicKey || !amount || !disclaimerAccepted}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : !publicKey ? (
              <>
                <Wallet className="mr-2 h-4 w-4" />
                Connect Wallet First
              </>
            ) : !disclaimerAccepted ? (
              'Accept Terms to Continue'
            ) : (
              `Contribute ${amount || '0'} SOL`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}