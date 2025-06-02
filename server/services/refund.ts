import { Connection, PublicKey, Transaction, SystemProgram, sendAndConfirmTransaction } from '@solana/web3.js';
import { getAssociatedTokenAddress, createTransferInstruction, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { db, collections } from '../lib/firebase.js';
import { decryptPrivateKey } from './solana.js';
import { Refund, Contribution } from '../../shared/types/campaign.js';

const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
const connection = new Connection(process.env.SOLANA_RPC_ENDPOINT || 'https://api.mainnet-beta.solana.com', 'confirmed');

export class RefundService {
  async processRefunds(campaignId: string): Promise<void> {
    console.log(`Processing refunds for campaign ${campaignId}`);
    
    // Get campaign wallet
    const walletDoc = await db.collection(collections.wallets).doc(campaignId).get();
    if (!walletDoc.exists) {
      throw new Error('Campaign wallet not found');
    }
    
    const walletData = walletDoc.data();
    const campaignKeypair = await decryptPrivateKey(walletData!.encryptedPrivateKey);
    
    // Get all contributions for this campaign
    const contributionsSnapshot = await db.collection(collections.contributions)
      .where('campaignId', '==', campaignId)
      .where('status', '==', 'confirmed')
      .where('refunded', '!=', true)
      .get();
    
    const contributions = contributionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Contribution));
    
    // Process each refund
    for (const contribution of contributions) {
      try {
        await this.processIndividualRefund(campaignId, contribution, campaignKeypair);
      } catch (error) {
        console.error(`Failed to refund contribution ${contribution.id}:`, error);
      }
    }
  }
  
  private async processIndividualRefund(
    campaignId: string, 
    contribution: Contribution, 
    campaignKeypair: any
  ): Promise<void> {
    // Create refund record
    const refundRef = db.collection(collections.refunds).doc();
    const refund: Refund = {
      id: refundRef.id,
      contributionId: contribution.id,
      campaignId,
      amount: contribution.amount,
      status: 'processing',
      reason: 'Campaign deadline expired without reaching target',
      recipientAddress: contribution.contributorAddress
    };
    
    await refundRef.set(refund);
    
    try {
      // Get token accounts
      const fromTokenAccount = await getAssociatedTokenAddress(
        USDC_MINT, 
        campaignKeypair.publicKey
      );
      
      const toPublicKey = new PublicKey(contribution.contributorAddress);
      const toTokenAccount = await getAssociatedTokenAddress(USDC_MINT, toPublicKey);
      
      // Create transfer instruction
      const transferInstruction = createTransferInstruction(
        fromTokenAccount,
        toTokenAccount,
        campaignKeypair.publicKey,
        contribution.amount * 1e6, // USDC has 6 decimals
        [],
        TOKEN_PROGRAM_ID
      );
      
      // Create and send transaction
      const transaction = new Transaction().add(transferInstruction);
      const signature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [campaignKeypair],
        { commitment: 'confirmed' }
      );
      
      // Update refund record
      await refundRef.update({
        status: 'completed',
        transactionHash: signature,
        processedAt: new Date()
      });
      
      // Mark contribution as refunded
      await db.collection(collections.contributions).doc(contribution.id).update({
        refunded: true,
        refundTxHash: signature
      });
      
      console.log(`Refund processed for contribution ${contribution.id}: ${signature}`);
      
    } catch (error) {
      console.error(`Refund failed for contribution ${contribution.id}:`, error);
      
      // Update refund record with failure
      await refundRef.update({
        status: 'failed',
        processedAt: new Date()
      });
    }
  }
  
  async getRefundStatus(contributionId: string): Promise<Refund | null> {
    const snapshot = await db.collection(collections.refunds)
      .where('contributionId', '==', contributionId)
      .limit(1)
      .get();
    
    if (snapshot.empty) return null;
    
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Refund;
  }
  
  async getAllRefunds(campaignId: string): Promise<Refund[]> {
    const snapshot = await db.collection(collections.refunds)
      .where('campaignId', '==', campaignId)
      .orderBy('processedAt', 'desc')
      .get();
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Refund));
  }
}

export const refundService = new RefundService();