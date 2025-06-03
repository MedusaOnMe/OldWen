#!/usr/bin/env tsx
/**
 * SECURE ADMIN WALLET DECRYPTION SCRIPT
 * 
 * Usage: npm run decrypt-wallet CAMPAIGN_ID
 * 
 * This script allows secure access to campaign wallet private keys
 * for manual DexScreener payments without HTTP endpoint exposure.
 * 
 * SECURITY: Only run this script on secure, local machines.
 */

import dotenv from 'dotenv';
import CryptoJS from 'crypto-js';
import { db, collections } from '../server/lib/firebase.js';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

// Load environment variables
dotenv.config();

const ENCRYPTION_KEY = process.env.WALLET_ENCRYPTION_KEY;

if (!ENCRYPTION_KEY || ENCRYPTION_KEY === 'development_encryption_key_32_chars') {
  console.error('❌ SECURITY ERROR: WALLET_ENCRYPTION_KEY not properly configured');
  console.error('   Set a secure 32-character encryption key in .env file');
  process.exit(1);
}

interface WalletInfo {
  publicKey: string;
  encryptedPrivateKey: string;
  campaignId: string;
  createdAt: any;
}

async function decryptPrivateKeyForAdmin(encryptedKey: string): Promise<Uint8Array> {
  try {
    const decryptedHex = CryptoJS.AES.decrypt(encryptedKey, ENCRYPTION_KEY).toString(CryptoJS.enc.Utf8);
    
    if (!decryptedHex) {
      throw new Error('Decryption failed - invalid key or corrupted data');
    }
    
    const privateKeyBytes = Buffer.from(decryptedHex, 'hex');
    return new Uint8Array(privateKeyBytes);
  } catch (error) {
    throw new Error(`Decryption failed: ${error.message}`);
  }
}

async function getCampaignWalletInfo(campaignId: string): Promise<WalletInfo | null> {
  try {
    const walletDoc = await db.collection(collections.wallets).doc(campaignId).get();
    
    if (!walletDoc.exists) {
      return null;
    }
    
    return walletDoc.data() as WalletInfo;
  } catch (error) {
    throw new Error(`Failed to fetch wallet info: ${error.message}`);
  }
}

async function getCampaignInfo(campaignId: string) {
  try {
    const campaignDoc = await db.collection(collections.campaigns).doc(campaignId).get();
    
    if (!campaignDoc.exists) {
      return null;
    }
    
    return campaignDoc.data();
  } catch (error) {
    throw new Error(`Failed to fetch campaign info: ${error.message}`);
  }
}

async function logSecurityAccess(campaignId: string) {
  try {
    await db.collection('admin_actions').add({
      type: 'private_key_decrypt_script',
      campaignId,
      timestamp: new Date(),
      adminAction: true,
      method: 'local_script',
      warning: 'Private key decrypted via secure local script'
    });
  } catch (error) {
    console.warn('⚠️  Failed to log security access:', error.message);
  }
}

async function main() {
  const campaignId = process.argv[2];
  
  if (!campaignId) {
    console.error('❌ Error: Campaign ID required');
    console.error('   Usage: npm run decrypt-wallet CAMPAIGN_ID');
    process.exit(1);
  }
  
  console.log('🔐 SECURE WALLET DECRYPTION SCRIPT');
  console.log('=' .repeat(50));
  console.log(`📋 Campaign ID: ${campaignId}`);
  console.log('');
  
  try {
    // Get campaign information
    console.log('📊 Fetching campaign information...');
    const campaign = await getCampaignInfo(campaignId);
    
    if (!campaign) {
      console.error(`❌ Campaign not found: ${campaignId}`);
      process.exit(1);
    }
    
    console.log(`   Token: ${campaign.tokenName} (${campaign.tokenSymbol})`);
    console.log(`   Status: ${campaign.status}`);
    console.log(`   Target: $${campaign.targetAmount}`);
    console.log(`   Current: $${campaign.currentAmount}`);
    console.log(`   Wallet: ${campaign.walletAddress}`);
    console.log('');
    
    // Get wallet information
    console.log('🔍 Fetching wallet information...');
    const walletInfo = await getCampaignWalletInfo(campaignId);
    
    if (!walletInfo) {
      console.error(`❌ Wallet not found for campaign: ${campaignId}`);
      process.exit(1);
    }
    
    console.log(`   Public Key: ${walletInfo.publicKey}`);
    console.log(`   Created: ${new Date(walletInfo.createdAt.toDate()).toISOString()}`);
    console.log('');
    
    // Decrypt private key
    console.log('🔓 Decrypting private key...');
    const privateKeyBytes = await decryptPrivateKeyForAdmin(walletInfo.encryptedPrivateKey);
    
    // Create keypair for validation
    const keypair = Keypair.fromSecretKey(privateKeyBytes);
    const publicKeyFromPrivate = keypair.publicKey.toBase58();
    
    // Validate keypair matches
    if (publicKeyFromPrivate !== walletInfo.publicKey) {
      console.error('❌ SECURITY ERROR: Public key mismatch!');
      console.error('   Decrypted private key does not match stored public key');
      process.exit(1);
    }
    
    console.log('✅ Private key decrypted successfully');
    console.log('✅ Keypair validation passed');
    console.log('');
    
    // Log security access
    await logSecurityAccess(campaignId);
    
    // Display private key information
    console.log('🔑 PRIVATE KEY INFORMATION');
    console.log('=' .repeat(50));
    console.log(`Uint8Array: [${Array.from(privateKeyBytes).join(', ')}]`);
    console.log(`Base58: ${bs58.encode(privateKeyBytes)}`);
    console.log(`Hex: ${Buffer.from(privateKeyBytes).toString('hex')}`);
    console.log('');
    
    // Security warnings
    console.log('⚠️  SECURITY WARNINGS');
    console.log('=' .repeat(50));
    console.log('• Use this private key immediately for the intended purpose');
    console.log('• Clear your terminal history after use');
    console.log('• Do not copy private key to clipboard or save to files');
    console.log('• Verify transaction details before signing');
    console.log('• This access has been logged for security audit');
    console.log('');
    
    // Manual transaction example
    console.log('💡 MANUAL TRANSACTION EXAMPLE');
    console.log('=' .repeat(50));
    console.log('// Create DexScreener payment transaction');
    console.log('const privateKey = new Uint8Array([/* array above */]);');
    console.log('const keypair = Keypair.fromSecretKey(privateKey);');
    console.log('');
    console.log('// Transfer 299 USDC to DexScreener');
    console.log('const transaction = new Transaction().add(');
    console.log('  createTransferInstruction(');
    console.log('    fromTokenAccount, // Campaign wallet USDC account');
    console.log('    toDexScreenerAccount, // DexScreener USDC account');
    console.log('    keypair.publicKey,');
    console.log('    299 * 1e6, // 299 USDC (6 decimals)');
    console.log('  )');
    console.log(');');
    console.log('');
    console.log('const signature = await connection.sendTransaction(transaction, [keypair]);');
    console.log('');
    
    // Clear private key from memory
    privateKeyBytes.fill(0);
    
    console.log('✅ Private key cleared from memory');
    console.log('🔐 Script completed successfully');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);